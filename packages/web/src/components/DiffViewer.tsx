import { useState, useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useStore } from '../store';
import { X, Columns, AlignLeft, FileText } from 'lucide-react';
import clsx from 'clsx';

interface DiffViewerProps {
  onClose: () => void;
  mode: 'saved' | 'files' | 'version';
  originalContent?: string;
  originalTitle?: string;
  modifiedContent?: string;
  modifiedTitle?: string;
}

export function DiffViewer({
  onClose,
  mode,
  originalContent: propOriginal,
  originalTitle: propOriginalTitle,
  modifiedContent: propModified,
  modifiedTitle: propModifiedTitle,
}: DiffViewerProps) {
  const { tabs, activeTabId, settings, theme } = useStore();
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('side-by-side');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Determine content based on mode
  const { originalContent, modifiedContent, originalTitle, modifiedTitle } = useMemo(() => {
    if (propOriginal !== undefined && propModified !== undefined) {
      return {
        originalContent: propOriginal,
        modifiedContent: propModified,
        originalTitle: propOriginalTitle || 'Original',
        modifiedTitle: propModifiedTitle || 'Modified',
      };
    }

    if (mode === 'saved' && activeTab) {
      return {
        originalContent: activeTab.savedContent,
        modifiedContent: activeTab.content,
        originalTitle: `${activeTab.title} (saved)`,
        modifiedTitle: `${activeTab.title} (current)`,
      };
    }

    if (mode === 'files' && activeTab && selectedFileId) {
      const compareTab = tabs.find((t) => t.id === selectedFileId);
      if (compareTab) {
        return {
          originalContent: activeTab.content,
          modifiedContent: compareTab.content,
          originalTitle: activeTab.title,
          modifiedTitle: compareTab.title,
        };
      }
    }

    return {
      originalContent: '',
      modifiedContent: activeTab?.content || '',
      originalTitle: 'No comparison',
      modifiedTitle: activeTab?.title || 'Current',
    };
  }, [mode, activeTab, selectedFileId, tabs, propOriginal, propModified, propOriginalTitle, propModifiedTitle]);

  // Get Monaco theme based on app theme
  const monacoTheme = useMemo(() => {
    switch (theme) {
      case 'light':
        return 'vs';
      default:
        return 'vs-dark';
    }
  }, [theme]);

  // Calculate diff stats
  const diffStats = useMemo(() => {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    
    let additions = 0;
    let deletions = 0;
    
    // Simple line-by-line comparison
    const maxLen = Math.max(originalLines.length, modifiedLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (originalLines[i] !== modifiedLines[i]) {
        if (i >= originalLines.length) {
          additions++;
        } else if (i >= modifiedLines.length) {
          deletions++;
        } else {
          additions++;
          deletions++;
        }
      }
    }
    
    return { additions, deletions };
  }, [originalContent, modifiedContent]);

  return (
    <div className="modal-overlay">
      <div 
        className="bg-sidebar-bg border border-tab-border rounded-lg shadow-2xl w-full max-w-6xl mx-4 h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tab-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
              Compare Changes
            </h2>
            
            {/* Diff stats */}
            <div className="flex gap-3 text-sm">
              <span className="text-green-400">+{diffStats.additions}</span>
              <span className="text-red-400">-{diffStats.deletions}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex border border-tab-border rounded overflow-hidden">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={clsx(
                  'px-3 py-1.5 text-sm flex items-center gap-1',
                  viewMode === 'side-by-side' 
                    ? 'bg-sidebar-active' 
                    : 'hover:bg-sidebar-hover'
                )}
                title="Side by side"
              >
                <Columns size={14} />
              </button>
              <button
                onClick={() => setViewMode('inline')}
                className={clsx(
                  'px-3 py-1.5 text-sm flex items-center gap-1',
                  viewMode === 'inline' 
                    ? 'bg-sidebar-active' 
                    : 'hover:bg-sidebar-hover'
                )}
                title="Inline"
              >
                <AlignLeft size={14} />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-sidebar-hover"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* File selector for file comparison mode */}
        {mode === 'files' && (
          <div className="px-4 py-2 border-b border-tab-border flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-70" style={{ color: 'var(--editor-fg)' }}>
                Compare {activeTab?.title} with:
              </span>
              <select
                value={selectedFileId || ''}
                onChange={(e) => setSelectedFileId(e.target.value || null)}
                className="input max-w-xs"
              >
                <option value="">Select a file...</option>
                {tabs
                  .filter((t) => t.id !== activeTabId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* File labels */}
        <div className="flex border-b border-tab-border flex-shrink-0">
          <div className="flex-1 px-4 py-2 text-sm font-medium flex items-center gap-2 border-r border-tab-border">
            <FileText size={14} className="opacity-60" />
            {originalTitle}
          </div>
          <div className="flex-1 px-4 py-2 text-sm font-medium flex items-center gap-2">
            <FileText size={14} className="opacity-60" />
            {modifiedTitle}
          </div>
        </div>

        {/* Diff editor */}
        <div className="flex-1 overflow-hidden">
          <DiffEditor
            original={originalContent}
            modified={modifiedContent}
            language={activeTab?.language || 'markdown'}
            theme={monacoTheme}
            options={{
              fontSize: settings.fontSize,
              fontFamily: settings.fontFamily,
              readOnly: true,
              renderSideBySide: viewMode === 'side-by-side',
              originalEditable: false,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              minimap: { enabled: false },
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              diffWordWrap: settings.wordWrap ? 'on' : 'off',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Hook to use diff viewer from anywhere
export function useDiffViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Omit<DiffViewerProps, 'onClose'>>({
    mode: 'saved',
  });

  const openDiffViewer = (options: Omit<DiffViewerProps, 'onClose'>) => {
    setConfig(options);
    setIsOpen(true);
  };

  const closeDiffViewer = () => {
    setIsOpen(false);
  };

  const DiffViewerComponent = isOpen ? (
    <DiffViewer {...config} onClose={closeDiffViewer} />
  ) : null;

  return {
    openDiffViewer,
    closeDiffViewer,
    DiffViewerComponent,
  };
}

