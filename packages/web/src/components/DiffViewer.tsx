import { useState, useMemo, useRef, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useStore } from '../store';
import { X, Columns, AlignLeft, FileText } from 'lucide-react';
import clsx from 'clsx';
import { debounce } from '@md-crafter/shared';
import { EDITOR_DEBOUNCE_DELAY_MS } from '../constants';
import { useEditorContext } from '../contexts/EditorContext';
import { applyDiffEditorWrap, attachDiffModelListeners } from '../utils/diffEditorHelpers';

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
  const { tabs, activeTabId, settings, theme, updateTabContent, setTabDiffPaneRatio, diffMode, setDiffMode } = useStore();
  const [viewMode, setViewMode] = useState<'side-by-side' | 'over-under'>('side-by-side');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);
  const modelListenersCleanupRef = useRef<(() => void) | null>(null);
  const { registerDiffEditor, unregisterDiffEditor } = useEditorContext();
  
  // Debounced content update function - resets cursor since edits in diff view
  // may invalidate stored cursor position when the document is viewed normally
  const debouncedUpdate = useMemo(
    () => debounce((tabId: string, content: string) => {
      updateTabContent(tabId, content, { resetCursor: true });
    }, EDITOR_DEBOUNCE_DELAY_MS),
    [updateTabContent]
  );

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const canCompareSaved = !!(activeTab && activeTab.hasSavedVersion && activeTab.isDirty);
  
  // Sync viewMode with stored diff state per tab
  useEffect(() => {
    if (activeTab?.diffMode?.viewMode) {
      setViewMode(activeTab.diffMode.viewMode);
    } else {
      setViewMode('side-by-side');
    }
  }, [activeTab?.diffMode?.viewMode, activeTabId]);

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
      if (!canCompareSaved) {
        return {
          originalContent: '',
          modifiedContent: activeTab.content,
          originalTitle: 'No saved version available',
          modifiedTitle: `${activeTab.title} (current)`,
        };
      }
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

  // Determine editability:
  // - Saved diffs: modified (unsaved) is editable, original (saved) is read-only
  // - File-to-file: both editable
  const editable = mode === 'saved' || mode === 'files';
  const originalEditable = mode === 'files'; // Only editable for file-to-file comparisons
  const handleViewModeChange = (nextMode: 'side-by-side' | 'over-under') => {
    setViewMode(nextMode);
    if (activeTabId) {
      const nextCompareWithSaved = diffMode.compareWithSaved && canCompareSaved;
      setDiffMode(true, diffMode.leftTabId, diffMode.rightTabId, nextCompareWithSaved, nextMode);
    }
  };


  // Get Monaco theme based on app theme
  const monacoTheme = useMemo(() => {
    switch (theme) {
      case 'light':
        return 'vs';
      default:
        return 'vs-dark';
    }
  }, [theme]);

  // Memoize editor options - PRIMARY mechanism for setting options
  const editorOptions = useMemo(() => {
    const wordWrap: 'on' | 'off' = settings.wordWrap ? 'on' : 'off';
    return {
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      readOnly: !editable, // Modified editor: editable if editable=true
      originalEditable: originalEditable, // Original editor: editable if originalEditable=true
      renderSideBySide: viewMode === 'side-by-side', // false = inline/over-under mode
      automaticLayout: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      lineNumbers: (settings.lineNumbers ? 'on' : 'off') as 'on' | 'off',
      renderWhitespace: 'selection' as const,
      diffWordWrap: wordWrap, // Let Monaco handle via options
      diffAlgorithm: 'legacy' as const, // Use faster legacy algorithm
      maxComputationTime: 5000, // Limit diff computation to 5 seconds
      ignoreTrimWhitespace: true, // Ignore whitespace-only changes for faster computation
      renderOverviewRuler: true,
    };
  }, [settings.fontSize, settings.fontFamily, settings.lineNumbers, settings.wordWrap, editable, originalEditable, viewMode]);

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

  // Helper function to set up content change listeners when models are ready
  const setupContentListeners = (diffEditor: monaco.editor.IDiffEditor, retryCount = 0) => {
    const MAX_RETRIES = 10;
    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();
    const originalModel = originalEditor?.getModel();
    const modifiedModel = modifiedEditor?.getModel();
    
    if (originalModel && modifiedModel) {
      // Models are ready - set up listeners
      
      // Set up modified editor listener if editable
      if (editable && activeTabId) {
        // Clean up existing listener if any
        const ref = editorRef.current as unknown as {
          _modifiedDisposable?: monaco.IDisposable;
          _originalDisposable?: monaco.IDisposable;
        };
        if (ref._modifiedDisposable) {
          ref._modifiedDisposable.dispose();
        }
        
        // For saved mode, update active tab; for files mode, update selected file
        const tabIdToUpdate = mode === 'saved' ? activeTabId : selectedFileId;
        
        if (tabIdToUpdate) {
          const modifiedDisposable = modifiedModel.onDidChangeContent(() => {
            const content = modifiedModel.getValue();
            debouncedUpdate(tabIdToUpdate, content);
          });
          
          // Store disposable for cleanup
          ref._modifiedDisposable = modifiedDisposable;
        }
      }
      
      // Set up original editor listener if editable
      if (originalEditable && activeTabId && mode === 'files') {
        // Clean up existing listener if any
        const ref = editorRef.current as unknown as {
          _modifiedDisposable?: monaco.IDisposable;
          _originalDisposable?: monaco.IDisposable;
        };
        if (ref._originalDisposable) {
          ref._originalDisposable.dispose();
        }
        
        const originalDisposable = originalModel.onDidChangeContent(() => {
          const content = originalModel.getValue();
          debouncedUpdate(activeTabId, content);
        });
        
        // Store disposable for cleanup
        ref._originalDisposable = originalDisposable;
      }
    } else if (retryCount < MAX_RETRIES) {
      // Models not ready - retry on next frame
      requestAnimationFrame(() => {
        setupContentListeners(diffEditor, retryCount + 1);
      });
    }
  };

  const handleDiffEditorMount = (editor: monaco.editor.IStandaloneDiffEditor) => {
    const diffEditor = editor as unknown as monaco.editor.IDiffEditor;
    registerDiffEditor(diffEditor, monaco);
    editorRef.current = diffEditor;
    
    // Ensure listeners use the latest wrap/viewMode settings
    modelListenersCleanupRef.current?.();
    const baseCleanup = attachDiffModelListeners(diffEditor, {
      wordWrap: settings.wordWrap,
      viewMode,
    });

    if (editable || originalEditable) {
      setupContentListeners(diffEditor);
    }
    
    // Apply stored pane ratio if available, otherwise reset to default
    const ratioToApply =
      activeTab?.diffPaneRatio && activeTab.diffPaneRatio > 0 && activeTab.diffPaneRatio < 1
        ? activeTab.diffPaneRatio
        : 0.5;
    const applyRatioWithRetry = (value: number) => {
      const apply = () => {
        diffEditor.updateOptions({ splitViewDefaultRatio: value });
        diffEditor.layout();
      };
      apply();
      // Single RAF is sufficient for Monaco to process layout after initial render
      requestAnimationFrame(apply);
    };
    applyRatioWithRetry(ratioToApply);
    if (activeTabId && !activeTab?.diffPaneRatio) {
      setTabDiffPaneRatio(activeTabId, ratioToApply);
    }

    // Listen for layout changes to capture current pane ratio
    const orig = diffEditor.getOriginalEditor();
    const mod = diffEditor.getModifiedEditor();
    const captureRatio = () => {
      const oLayout = orig?.getLayoutInfo();
      const mLayout = mod?.getLayoutInfo();
      if (!oLayout || !mLayout) return;
      const oSize = viewMode === 'side-by-side' ? oLayout.width : oLayout.height;
      const mSize = viewMode === 'side-by-side' ? mLayout.width : mLayout.height;
      const total = oSize + mSize;
      if (total > 0) {
        const ratio = oSize / total;
        if (activeTabId) {
          setTabDiffPaneRatio(activeTabId, ratio);
        }
      }
    };
    const disposables: monaco.IDisposable[] = [];
    if (orig?.onDidLayoutChange) {
      const d = orig.onDidLayoutChange(captureRatio);
      if (d) disposables.push(d);
    }
    if (mod?.onDidLayoutChange) {
      const d = mod.onDidLayoutChange(captureRatio);
      if (d) disposables.push(d);
    }

    modelListenersCleanupRef.current = () => {
      baseCleanup();
      disposables.forEach((d) => d?.dispose());
    };

    applyDiffEditorWrap(diffEditor, { wordWrap: settings.wordWrap, viewMode });
  };
  
  // Re-setup content listeners when mode, selectedFileId, or activeTabId changes
  useEffect(() => {
    if (!editorRef.current || (!editable && !originalEditable)) return;
    
    const diffEditor = editorRef.current;
    setupContentListeners(diffEditor);
  }, [mode, selectedFileId, activeTabId, editable, originalEditable]);

  // Reapply word wrap when setting or view mode changes
  useEffect(() => {
    if (!editorRef.current) return;
    applyDiffEditorWrap(editorRef.current, { wordWrap: settings.wordWrap, viewMode });
  }, [settings.wordWrap, viewMode]);

  // Reapply stored pane ratio when it changes
  useEffect(() => {
    if (!editorRef.current) return;
    const ratio =
      activeTab?.diffPaneRatio && activeTab.diffPaneRatio > 0 && activeTab.diffPaneRatio < 1
        ? activeTab.diffPaneRatio
        : 0.5;
    const applyRatio = () => {
      editorRef.current?.updateOptions({ splitViewDefaultRatio: ratio });
      editorRef.current?.layout();
    };
    applyRatio();
    // Single RAF is sufficient for Monaco to process layout
    requestAnimationFrame(applyRatio);
    if (activeTabId && !activeTab?.diffPaneRatio) {
      setTabDiffPaneRatio(activeTabId, ratio);
    }
  }, [activeTab?.diffPaneRatio, activeTabId]);

  // Capture pane ratio on mouseup (after user drags split)
  useEffect(() => {
    const capture = () => {
      if (!editorRef.current) return;
      const run = () => {
        const orig = editorRef.current?.getOriginalEditor();
        const mod = editorRef.current?.getModifiedEditor();
        const oLayout = orig?.getLayoutInfo();
        const mLayout = mod?.getLayoutInfo();
        if (!oLayout || !mLayout) return;
        const oSize = viewMode === 'side-by-side' ? oLayout.width : oLayout.height;
        const mSize = viewMode === 'side-by-side' ? mLayout.width : mLayout.height;
        const total = oSize + mSize;
        if (total > 0 && activeTabId) {
          setTabDiffPaneRatio(activeTabId, oSize / total);
        }
      };
      // Single RAF is sufficient to capture layout after mouse event
      requestAnimationFrame(run);
    };
    window.addEventListener('mouseup', capture);
    return () => {
      window.removeEventListener('mouseup', capture);
      capture(); // store the latest ratio on unmount
    };
  }, [activeTabId, viewMode, setTabDiffPaneRatio]);

  // Cleanup on unmount - persist position before unregistering
  useEffect(() => {
    return () => {
      // Persist cursor/selection from modified (right) editor before closing
      // The modified editor shows the current document being edited
      if (editorRef.current && activeTabId) {
        const modifiedEditor = editorRef.current.getModifiedEditor();
        if (modifiedEditor) {
          const pos = modifiedEditor.getPosition();
          const selection = modifiedEditor.getSelection();
          if (pos) {
            const { setTabCursor, setTabSelection } = useStore.getState();
            setTabCursor(activeTabId, { line: pos.lineNumber, column: pos.column });
            if (selection && !(selection.startLineNumber === selection.endLineNumber && selection.startColumn === selection.endColumn)) {
              setTabSelection(activeTabId, {
                startLine: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLine: selection.endLineNumber,
                endColumn: selection.endColumn,
              });
            }
          }
        }
      }
      modelListenersCleanupRef.current?.();
      unregisterDiffEditor();
    };
  }, [unregisterDiffEditor, activeTabId]);

  return (
    <div className="modal-overlay">
      <div 
        className="bg-sidebar-bg border border-tab-border rounded-lg shadow-2xl w-full max-w-6xl mx-4 h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tab-border flex-shrink-0">
          <div className="flex items-center gap-3">
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
                onClick={() => handleViewModeChange('side-by-side')}
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
                onClick={() => handleViewModeChange('over-under')}
                className={clsx(
                  'px-3 py-1.5 text-sm flex items-center gap-1',
                  viewMode === 'over-under' 
                    ? 'bg-sidebar-active' 
                    : 'hover:bg-sidebar-hover'
                )}
                title="Over under"
              >
                <AlignLeft size={14} />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-sidebar-hover"
              title="Close diff view"
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
            onMount={handleDiffEditorMount}
            options={editorOptions} // PRIMARY mechanism - options set here
            keepCurrentOriginalModel={true}
            keepCurrentModifiedModel={true}
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
