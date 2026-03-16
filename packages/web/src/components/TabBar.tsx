import { useStore } from '../store';
import { X, FileText, Cloud } from 'lucide-react';
import clsx from 'clsx';
import { getSyncStatusIcon } from '@md-crafter/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs, renameTab } = useStore();
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (editingTabId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingTabId]);

  const tabIndexById = useMemo(() => {
    return tabs.reduce<Record<string, number>>((acc, tab, index) => {
      acc[tab.id] = index;
      return acc;
    }, {});
  }, [tabs]);

  const isUnsavedTab = useCallback((tab: typeof tabs[number]) => {
    return !tab.documentId && !tab.path;
  }, []);

  const getDisplayTitle = useCallback((tab: typeof tabs[number]) => {
    if (isUnsavedTab(tab)) {
      return tab.customTitle || tab.title || 'Untitled';
    }
    return tab.title;
  }, [isUnsavedTab]);

  const beginInlineRename = useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || !isUnsavedTab(tab)) return;
    setEditingTabId(tabId);
    setEditingValue(getDisplayTitle(tab));
  }, [tabs, isUnsavedTab, getDisplayTitle]);

  const commitInlineRename = useCallback((tabId: string) => {
    renameTab(tabId, editingValue);
    setEditingTabId(null);
    setEditingValue('');
  }, [editingValue, renameTab]);

  const cancelInlineRename = useCallback(() => {
    setEditingTabId(null);
    setEditingValue('');
  }, []);

  // Keyboard navigation for tabs
  const handleKeyDown = useCallback((e: React.KeyboardEvent, tabId: string, index: number) => {
    const target = e.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || editingTabId === tabId) {
      return;
    }

    if (e.altKey && e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        reorderTabs(index, index - 1);
        setActiveTab(tabId);
      }
      return;
    }
    if (e.altKey && e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < tabs.length - 1) {
        reorderTabs(index, index + 1);
        setActiveTab(tabId);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          setActiveTab(tabs[index - 1].id);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index < tabs.length - 1) {
          setActiveTab(tabs[index + 1].id);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        closeTab(tabId);
        break;
      case 'Home':
        e.preventDefault();
        if (tabs.length > 0) {
          setActiveTab(tabs[0].id);
        }
        break;
      case 'End':
        e.preventDefault();
        if (tabs.length > 0) {
          setActiveTab(tabs[tabs.length - 1].id);
        }
        break;
      case 'F2':
        e.preventDefault();
        beginInlineRename(tabId);
        break;
    }
  }, [tabs, setActiveTab, closeTab, reorderTabs, beginInlineRename, editingTabId]);

  if (tabs.length === 0) {
    return (
      <div 
        className="h-9 bg-tab-bg border-b border-tab-border flex items-center px-4"
        role="tablist"
        aria-label="Open documents"
      >
        <span className="text-sm" style={{ color: 'var(--editor-fg)', opacity: 0.6 }}>No open documents</span>
      </div>
    );
  }

  return (
    <div 
      className="flex bg-tab-bg border-b border-tab-border overflow-x-auto"
      role="tablist"
      aria-label="Open documents"
    >
      {tabs.map((tab, index) => (
        (() => {
          const displayTitle = getDisplayTitle(tab);
          const isEditing = editingTabId === tab.id;
          return (
            <div
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              role="tab"
              tabIndex={tab.id === activeTabId ? 0 : -1}
              aria-selected={tab.id === activeTabId}
              aria-controls={`tabpanel-${tab.id}`}
              aria-label={`${displayTitle}${tab.isDirty ? ' (unsaved changes)' : ''}${tab.isCloudSynced ? ' (cloud synced)' : ''}`}
              className={clsx(
                'tab group',
                tab.id === activeTabId && 'active',
                draggingTabId === tab.id && 'opacity-70'
              )}
              draggable={tabs.length > 1}
              onDragStart={(e) => {
                setDraggingTabId(tab.id);
                e.dataTransfer.setData('text/tab-id', tab.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromTabId = e.dataTransfer.getData('text/tab-id') || draggingTabId;
                if (!fromTabId || fromTabId === tab.id) return;
                const fromIndex = tabIndexById[fromTabId];
                const toIndex = tabIndexById[tab.id];
                if (fromIndex === undefined || toIndex === undefined) return;
                reorderTabs(fromIndex, toIndex);
                setActiveTab(fromTabId);
              }}
              onDragEnd={() => setDraggingTabId(null)}
              onClick={() => {
                if (!isEditing) {
                  setActiveTab(tab.id);
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                beginInlineRename(tab.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
            >
              {tab.isCloudSynced ? (
                <Cloud size={14} className="flex-shrink-0 opacity-60" aria-hidden="true" />
              ) : (
                <FileText size={14} className="flex-shrink-0 opacity-60" aria-hidden="true" />
              )}

              {isEditing ? (
                <input
                  ref={editingInputRef}
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => commitInlineRename(tab.id)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitInlineRename(tab.id);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelInlineRename();
                    }
                  }}
                  className="truncate max-w-[120px] bg-transparent border border-tab-border rounded px-1 text-sm"
                  aria-label={`Rename ${displayTitle}`}
                />
              ) : (
                <span className="truncate max-w-[120px]">
                  {displayTitle}
                </span>
              )}

              {tab.isDirty && (
                <span
                  className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"
                  aria-label="Unsaved changes"
                  role="status"
                />
              )}

              {tab.isCloudSynced && tab.syncStatus !== 'synced' && (
                <span
                  className={clsx(
                    'text-xs flex-shrink-0',
                    tab.syncStatus === 'syncing' && 'text-blue-400',
                    tab.syncStatus === 'pending' && 'text-yellow-400',
                    tab.syncStatus === 'conflict' && 'text-red-400',
                    tab.syncStatus === 'offline' && 'text-gray-400'
                  )}
                  title={tab.syncStatus}
                  role="status"
                  aria-label={`Sync status: ${tab.syncStatus}`}
                >
                  {getSyncStatusIcon(tab.syncStatus)}
                </span>
              )}

              <button
                className="close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label={`Close ${displayTitle}`}
                title="Close"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })()
      ))}
    </div>
  );
}
