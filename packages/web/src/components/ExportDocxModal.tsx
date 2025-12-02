import { useState } from 'react';
import { useStore } from '../store';
import { X, FileType, Download } from 'lucide-react';
import { exportDocx } from '../services/docx';

interface ExportDocxModalProps {
  onClose: () => void;
}

export function ExportDocxModal({ onClose }: ExportDocxModalProps) {
  const { tabs, activeTabId, addToast } = useStore();
  const [isExporting, setIsExporting] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    onClose();
    return null;
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDocx(activeTab.content, activeTab.title);
      addToast({ type: 'success', message: 'Exported to Word document' });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      addToast({ type: 'error', message: 'Failed to export document' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Export as Word Document
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="flex items-center gap-4 p-4 rounded border border-tab-border">
            <FileType size={48} className="opacity-60" />
            <div>
              <p className="font-medium" style={{ color: 'var(--editor-fg)' }}>
                {activeTab.title.replace(/\.(md|mdx|markdown)$/i, '')}.docx
              </p>
              <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
                Microsoft Word Document
              </p>
            </div>
          </div>

          <div className="mt-4 text-sm opacity-70" style={{ color: 'var(--editor-fg)' }}>
            <p className="mb-2">The following will be converted:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Headings → Word heading styles</li>
              <li>Bold, italic, strikethrough → Formatted text</li>
              <li>Lists → Bulleted/numbered lists</li>
              <li>Code blocks → Monospace formatted text</li>
              <li>Tables → Word tables</li>
              <li>Links → Hyperlinks</li>
              <li>Blockquotes → Indented text with border</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary flex items-center gap-2"
            disabled={isExporting}
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

