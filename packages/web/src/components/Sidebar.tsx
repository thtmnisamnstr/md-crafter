import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import {
  Cloud,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { logger } from '@md-crafter/shared';
import {
  ASSET_ID_DRAG_MIME_TYPE,
  ASSET_URL_PREFIX,
  downloadImageDataUrlAsFormat,
  fileBaseName,
  listAssetIdsInContent,
  removeAssetImageReferencesFromContent,
  type ImageExportFormat,
} from '../services/imageAssets';

interface AssetContextMenuState {
  x: number;
  y: number;
  tabId: string;
  assetId: string;
}

export function Sidebar() {
  const {
    isAuthenticated,
    cloudDocuments,
    tabs,
    imageAssets,
    activeTabId,
    createNewDocument,
    openCloudDocument,
    deleteCloudDocument,
    loadCloudDocuments,
    setShowAuth,
    setShowSettings,
    logout,
    setActiveTab,
    renameImageAsset,
    removeImageAsset,
    updateTabContent,
    setConfirmation,
    clearConfirmation,
    addToast,
  } = useStore();

  const [showCloudDocs, setShowCloudDocs] = useState(true);
  const [showOpenTabs, setShowOpenTabs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expandedTabAssets, setExpandedTabAssets] = useState<Record<string, boolean>>({});
  const [assetContextMenu, setAssetContextMenu] = useState<AssetContextMenuState | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetValue, setEditingAssetValue] = useState('');
  const editingAssetInputRef = useRef<HTMLInputElement | null>(null);

  const tabAssets = useMemo(() => {
    const map: Record<string, Array<(typeof imageAssets)[string]>> = {};
    tabs.forEach((tab) => {
      const assetIds = listAssetIdsInContent(tab.content);
      const attachments = assetIds
        .map((id) => imageAssets[id])
        .filter((asset): asset is (typeof imageAssets)[string] => Boolean(asset));
      map[tab.id] = attachments;
    });
    return map;
  }, [tabs, imageAssets]);

  useEffect(() => {
    setExpandedTabAssets((previous) => {
      const next: Record<string, boolean> = {};
      tabs.forEach((tab) => {
        if ((tabAssets[tab.id]?.length || 0) > 0 && previous[tab.id]) {
          next[tab.id] = true;
        }
      });
      return next;
    });
  }, [tabs, tabAssets]);

  useEffect(() => {
    if (!assetContextMenu) return;

    const close = () => setAssetContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [assetContextMenu]);

  useEffect(() => {
    if (editingAssetId && editingAssetInputRef.current) {
      editingAssetInputRef.current.focus();
      editingAssetInputRef.current.select();
    }
  }, [editingAssetId]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadCloudDocuments();
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setConfirmation({
      title: 'Delete Document',
      message: 'Delete this document permanently? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        await deleteCloudDocument(docId);
        clearConfirmation();
      },
    });
  };

  const toggleTabAttachments = (tabId: string) => {
    setExpandedTabAssets((previous) => ({
      ...previous,
      [tabId]: !previous[tabId],
    }));
  };

  const beginInlineAssetRename = useCallback((assetId: string, currentName: string) => {
    setEditingAssetId(assetId);
    setEditingAssetValue(currentName.trim() || `${assetId}.png`);
    setAssetContextMenu(null);
  }, []);

  const commitInlineAssetRename = useCallback((assetId: string) => {
    const normalized = editingAssetValue.trim();
    if (!normalized) {
      addToast({ type: 'warning', message: 'Asset name cannot be empty' });
      setEditingAssetId(null);
      setEditingAssetValue('');
      return;
    }

    renameImageAsset(assetId, normalized);
    setEditingAssetId(null);
    setEditingAssetValue('');
  }, [addToast, editingAssetValue, renameImageAsset]);

  const cancelInlineAssetRename = useCallback(() => {
    setEditingAssetId(null);
    setEditingAssetValue('');
  }, []);

  const openAssetContextMenu = (event: React.MouseEvent, tabId: string, assetId: string) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveTab(tabId);

    const menuWidth = 176;
    const menuHeight = 156;
    const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
    const maxY = Math.max(8, window.innerHeight - menuHeight - 8);

    setAssetContextMenu({
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
      tabId,
      assetId,
    });
  };

  const saveAssetAsFormat = async (format: ImageExportFormat) => {
    if (!assetContextMenu) return;

    const asset = imageAssets[assetContextMenu.assetId];
    setAssetContextMenu(null);

    if (!asset) {
      addToast({ type: 'error', message: 'Image asset no longer exists' });
      return;
    }

    try {
      await downloadImageDataUrlAsFormat(asset.dataUrl, format, fileBaseName(asset.fileName));
      addToast({ type: 'success', message: `Saved image as .${format}` });
    } catch (error) {
      logger.warn('Failed to save image asset from sidebar', {
        assetId: asset.id,
        format,
        error: error instanceof Error ? error.message : String(error),
      });
      addToast({ type: 'error', message: `Failed to save image as .${format}` });
    }
  };

  const renameAsset = () => {
    if (!assetContextMenu) return;

    const asset = imageAssets[assetContextMenu.assetId];

    if (!asset) {
      addToast({ type: 'error', message: 'Image asset no longer exists' });
      setAssetContextMenu(null);
      return;
    }
    beginInlineAssetRename(asset.id, asset.fileName || `${asset.id}.png`);
  };

  const deleteAsset = () => {
    if (!assetContextMenu) return;

    const { tabId, assetId } = assetContextMenu;
    setAssetContextMenu(null);

    const tab = tabs.find((candidate) => candidate.id === tabId);
    if (!tab) {
      addToast({ type: 'error', message: 'Document tab no longer exists' });
      return;
    }

    const nextContent = removeAssetImageReferencesFromContent(tab.content, assetId);
    updateTabContent(tabId, nextContent, { source: 'preview-edit' });

    const isStillReferenced = tabs.some((candidate) => {
      const content = candidate.id === tabId ? nextContent : candidate.content;
      return listAssetIdsInContent(content).includes(assetId);
    });
    if (!isStillReferenced) {
      removeImageAsset(assetId);
    }

    addToast({ type: 'success', message: 'Image asset removed from document' });
  };

  return (
    <nav className="sidebar h-full flex flex-col" role="navigation" aria-label="File explorer">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tab-border">
        <span className="font-semibold text-sm">md-crafter</span>
        <div className="flex items-center gap-1" role="toolbar" aria-label="File actions">
          <button
            onClick={createNewDocument}
            className="p-1.5 rounded hover:bg-sidebar-hover"
            title="New Document"
            aria-label="Create new document"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded hover:bg-sidebar-hover"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Open Tabs Section */}
        <div className="sidebar-section">
          <button
            className="sidebar-header w-full text-left flex items-center gap-1"
            onClick={() => setShowOpenTabs(!showOpenTabs)}
          >
            {showOpenTabs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>OPEN EDITORS</span>
            <span className="ml-auto opacity-50">{tabs.length}</span>
          </button>

          {showOpenTabs && (
            <div>
              {tabs.map((tab) => {
                const attachments = tabAssets[tab.id] || [];
                const hasAttachments = attachments.length > 0;
                return (
                  <div key={tab.id}>
                    <div
                      className={clsx('sidebar-item', tab.id === activeTabId && 'active')}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {hasAttachments ? (
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-sidebar-hover"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleTabAttachments(tab.id);
                          }}
                          aria-label={expandedTabAssets[tab.id] ? 'Collapse image attachments' : 'Expand image attachments'}
                          title={expandedTabAssets[tab.id] ? 'Collapse image attachments' : 'Expand image attachments'}
                        >
                          {expandedTabAssets[tab.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      ) : (
                        <span className="w-[16px] flex-shrink-0" />
                      )}

                      <File size={14} className="flex-shrink-0 opacity-60" />
                      <span className="truncate flex-1">{tab.title}</span>
                      {tab.isDirty && <span className="text-yellow-500">●</span>}
                    </div>

                    {hasAttachments && expandedTabAssets[tab.id] && (
                      <div className="ml-6 border-l border-tab-border/70">
                        {attachments.map((asset) => (
                          <div
                            key={asset.id}
                            className="sidebar-asset-item"
                            draggable
                            onClick={() => {
                              if (editingAssetId === asset.id) return;
                              setActiveTab(tab.id);
                            }}
                            onContextMenu={(event) => openAssetContextMenu(event, tab.id, asset.id)}
                            onDragStart={(event) => {
                              const alt = fileBaseName(asset.fileName || `${asset.id}.png`, 'image')
                                .replace(/[_-]+/g, ' ')
                                .trim() || 'image';
                              const markdownSnippet = `![${alt}](${ASSET_URL_PREFIX}${asset.id})`;
                              event.dataTransfer.setData(ASSET_ID_DRAG_MIME_TYPE, asset.id);
                              event.dataTransfer.setData('text/plain', markdownSnippet);
                              event.dataTransfer.effectAllowed = 'copy';
                            }}
                            title="Right-click for actions or drag into the editor"
                          >
                            <ImageIcon size={13} className="flex-shrink-0 opacity-70" />
                            {editingAssetId === asset.id ? (
                              <input
                                ref={editingAssetInputRef}
                                value={editingAssetValue}
                                onChange={(event) => setEditingAssetValue(event.target.value)}
                                onBlur={() => commitInlineAssetRename(asset.id)}
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    commitInlineAssetRename(asset.id);
                                  } else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelInlineAssetRename();
                                  }
                                }}
                                className="truncate flex-1 bg-transparent border border-tab-border rounded px-1 text-xs"
                                aria-label={`Rename ${asset.fileName || `${asset.id}.png`}`}
                              />
                            ) : (
                              <span
                                className="truncate flex-1"
                                onDoubleClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  beginInlineAssetRename(asset.id, asset.fileName || `${asset.id}.png`);
                                }}
                              >
                                {asset.fileName || `${asset.id}.png`}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {tabs.length === 0 && (
                <div className="px-3 py-2 text-sm opacity-50 italic">
                  No open editors
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cloud Documents Section */}
        <div className="sidebar-section mt-2">
          <div className="sidebar-header flex items-center">
            <button
              className="flex items-center gap-1 flex-1 text-left"
              onClick={() => setShowCloudDocs(!showCloudDocs)}
            >
              {showCloudDocs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Cloud size={12} />
              <span>CLOUD DOCUMENTS</span>
            </button>
            {isAuthenticated && (
              <button
                onClick={handleRefresh}
                className={clsx('p-1 rounded hover:bg-sidebar-hover', loading && 'animate-spin')}
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          {showCloudDocs && (
            <div>
              {!isAuthenticated ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm opacity-70 mb-3">
                    Sign in to sync your documents
                  </p>
                  <button
                    onClick={() => setShowAuth(true)}
                    className="btn btn-primary flex items-center gap-2 mx-auto"
                  >
                    <LogIn size={14} />
                    Sign In
                  </button>
                </div>
              ) : (
                <>
                  {cloudDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="sidebar-item group"
                      onClick={() => openCloudDocument(doc.id)}
                    >
                      <FileText size={14} className="flex-shrink-0 opacity-60" />
                      <span className="truncate flex-1">{doc.title}</span>
                      <button
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {cloudDocuments.length === 0 && (
                    <div className="px-3 py-2 text-sm opacity-50 italic">
                      No cloud documents
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {assetContextMenu && (
        <div
          className="fixed z-50 rounded border border-tab-border py-1 shadow-xl"
          style={{
            left: assetContextMenu.x,
            top: assetContextMenu.y,
            background: 'var(--sidebar-bg)',
            color: 'var(--sidebar-fg)',
            minWidth: 176,
          }}
          role="menu"
          aria-label="Image asset actions"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-sidebar-hover"
            onClick={() => void saveAssetAsFormat('png')}
            role="menuitem"
          >
            Save As .png
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-sidebar-hover"
            onClick={() => void saveAssetAsFormat('jpg')}
            role="menuitem"
          >
            Save As .jpg
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-sidebar-hover"
            onClick={renameAsset}
            role="menuitem"
          >
            Rename Asset...
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/20"
            onClick={deleteAsset}
            role="menuitem"
          >
            Delete Asset
          </button>
        </div>
      )}

      {/* Footer */}
      {isAuthenticated && (
        <div className="border-t border-tab-border p-2">
          <button
            onClick={logout}
            className="sidebar-item w-full justify-center text-sm opacity-70 hover:opacity-100"
            aria-label="Sign out"
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
}
