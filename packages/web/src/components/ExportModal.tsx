import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { X, FileText, Globe, Download, Layers } from 'lucide-react';
import {
  batchExport,
  exportMdxToStaticHtml,
  stripMdxToMarkdown,
  type BatchExportDocument,
  type BatchExportFormat,
} from '../services/mdxExport';

interface ExportModalProps {
  onClose: () => void;
}

type ExportScope = 'current' | 'batch';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeBaseName(name: string): string {
  return (name || 'document')
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .trim() || 'document';
}

export function ExportModal({ onClose }: ExportModalProps) {
  const {
    tabs,
    activeTabId,
    cloudDocuments,
    addToast,
    workspaceRoots,
    activeWorkspaceRootId,
    mdxComponentDefinitions,
  } = useStore();

  const [format, setFormat] = useState<BatchExportFormat>('html');
  const [scope, setScope] = useState<ExportScope>('current');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>(() => tabs.map((tab) => tab.id));
  const [selectedCloudIds, setSelectedCloudIds] = useState<string[]>([]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;

  const availableCloudDocs = useMemo(() => {
    const openCloudIds = new Set(tabs.map((tab) => tab.documentId).filter(Boolean) as string[]);
    return cloudDocuments.filter((doc) => !openCloudIds.has(doc.id));
  }, [cloudDocuments, tabs]);

  const currentFileLabel = activeTab ? `"${activeTab.title}"` : 'current document';

  if (!activeTab && scope === 'current') {
    onClose();
    return null;
  }

  const handleCurrentExport = async () => {
    if (!activeTab) return;
    const base = normalizeBaseName(activeTab.title);

    if (format === 'markdown') {
      const filename = activeTab.title.match(/\.(md|mdx|markdown)$/i) ? activeTab.title : `${base}.md`;
      triggerDownload(new Blob([activeTab.content], { type: 'text/markdown' }), filename);
      return;
    }

    if (format === 'markdown-strip') {
      const stripped = await stripMdxToMarkdown(activeTab.content, { normalizeWhitespace: true });
      triggerDownload(new Blob([stripped], { type: 'text/markdown' }), `${base}.md`);
      return;
    }

    const html = await exportMdxToStaticHtml(activeTab.content, {
      title: base,
      documentPath: activeTab.path,
      workspaceRoots,
      activeWorkspaceRootId,
      componentDefinitions: mdxComponentDefinitions,
    });
    triggerDownload(new Blob([html], { type: 'text/html' }), `${base}.html`);
  };

  const handleBatchExport = async () => {
    const selectedTabs = tabs.filter((tab) => selectedTabIds.includes(tab.id));
    const selectedCloud = availableCloudDocs.filter((doc) => selectedCloudIds.includes(doc.id));
    const documents: BatchExportDocument[] = [
      ...selectedTabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        content: tab.content,
        documentPath: tab.path,
      })),
      ...selectedCloud.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
      })),
    ];

    if (!documents.length) {
      addToast({ type: 'warning', message: 'Select at least one document for batch export' });
      return;
    }

    const zipBlob = await batchExport(documents, format, {
      workspaceRoots,
      activeWorkspaceRootId,
      componentDefinitions: mdxComponentDefinitions,
    });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    triggerDownload(zipBlob, `md-crafter-batch-export-${timestamp}.zip`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (scope === 'batch') {
        await handleBatchExport();
      } else {
        await handleCurrentExport();
      }
      addToast({ type: 'success', message: scope === 'batch' ? 'Batch export complete' : 'Export complete' });
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to export file',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-[860px] w-[92vw]" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Export
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover" aria-label="Close export modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div>
            <p className="text-sm opacity-70 mb-3" style={{ color: 'var(--editor-fg)' }}>
              Choose export scope and format.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`p-3 rounded border text-left ${
                  scope === 'current'
                    ? 'border-editor-accent bg-sidebar-active'
                    : 'border-tab-border hover:bg-sidebar-hover'
                }`}
                onClick={() => setScope('current')}
              >
                <div className="font-medium flex items-center gap-2">
                  <FileText size={16} /> Current Document
                </div>
                <div className="text-xs opacity-70 mt-1">{currentFileLabel}</div>
              </button>

              <button
                className={`p-3 rounded border text-left ${
                  scope === 'batch'
                    ? 'border-editor-accent bg-sidebar-active'
                    : 'border-tab-border hover:bg-sidebar-hover'
                }`}
                onClick={() => setScope('batch')}
              >
                <div className="font-medium flex items-center gap-2">
                  <Layers size={16} /> Batch Export
                </div>
                <div className="text-xs opacity-70 mt-1">Open tabs and selected cloud docs (ZIP)</div>
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Format</div>
            <div className="grid grid-cols-3 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                  format === 'html'
                    ? 'border-editor-accent bg-sidebar-active'
                    : 'border-tab-border hover:bg-sidebar-hover'
                }`}
                style={{ color: 'var(--editor-fg)' }}
              >
                <input
                  type="radio"
                  name="format"
                  value="html"
                  checked={format === 'html'}
                  onChange={() => setFormat('html')}
                  className="hidden"
                />
                <Globe size={18} />
                <div>
                  <div className="font-medium">Static HTML</div>
                  <div className="text-xs opacity-70">MDX-aware HTML export</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                  format === 'markdown'
                    ? 'border-editor-accent bg-sidebar-active'
                    : 'border-tab-border hover:bg-sidebar-hover'
                }`}
                style={{ color: 'var(--editor-fg)' }}
              >
                <input
                  type="radio"
                  name="format"
                  value="markdown"
                  checked={format === 'markdown'}
                  onChange={() => setFormat('markdown')}
                  className="hidden"
                />
                <FileText size={18} />
                <div>
                  <div className="font-medium">Markdown</div>
                  <div className="text-xs opacity-70">Raw source</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                  format === 'markdown-strip'
                    ? 'border-editor-accent bg-sidebar-active'
                    : 'border-tab-border hover:bg-sidebar-hover'
                }`}
                style={{ color: 'var(--editor-fg)' }}
              >
                <input
                  type="radio"
                  name="format"
                  value="markdown-strip"
                  checked={format === 'markdown-strip'}
                  onChange={() => setFormat('markdown-strip')}
                  className="hidden"
                />
                <FileText size={18} />
                <div>
                  <div className="font-medium">Markdown (strip MDX)</div>
                  <div className="text-xs opacity-70">Remove MDX component syntax</div>
                </div>
              </label>
            </div>
          </div>

          {scope === 'batch' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded border border-tab-border p-3">
                <div className="text-sm font-medium mb-2">Open Tabs</div>
                <div className="space-y-1 max-h-[180px] overflow-auto">
                  {tabs.map((tab) => (
                    <label key={tab.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTabIds.includes(tab.id)}
                        onChange={(event) => {
                          setSelectedTabIds((current) => (
                            event.target.checked
                              ? [...current, tab.id]
                              : current.filter((id) => id !== tab.id)
                          ));
                        }}
                      />
                      <span className="truncate">{tab.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded border border-tab-border p-3">
                <div className="text-sm font-medium mb-2">Cloud Documents</div>
                <div className="space-y-1 max-h-[180px] overflow-auto">
                  {availableCloudDocs.length === 0 && (
                    <p className="text-xs opacity-60">No additional cloud docs loaded.</p>
                  )}
                  {availableCloudDocs.map((doc) => (
                    <label key={doc.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCloudIds.includes(doc.id)}
                        onChange={(event) => {
                          setSelectedCloudIds((current) => (
                            event.target.checked
                              ? [...current, doc.id]
                              : current.filter((id) => id !== doc.id)
                          ));
                        }}
                      />
                      <span className="truncate">{doc.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost" disabled={isExporting}>
            Cancel
          </button>
          <button onClick={() => void handleExport()} className="btn btn-primary flex items-center gap-2" disabled={isExporting}>
            <Download size={16} />
            {isExporting ? 'Exporting...' : scope === 'batch' ? 'Export Batch' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

