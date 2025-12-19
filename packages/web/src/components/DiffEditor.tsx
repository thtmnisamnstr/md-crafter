import { useMemo, useEffect, useRef } from 'react';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useStore } from '../store';
import { useEditorContext } from '../contexts/EditorContext';
import { debounce } from '@md-crafter/shared';
import { EDITOR_DEBOUNCE_DELAY_MS } from '../constants';
import { applyDiffEditorWrap, attachDiffModelListeners } from '../utils/diffEditorHelpers';

interface DiffEditorProps {
  originalContent: string;
  modifiedContent: string;
  originalTitle: string;
  modifiedTitle: string;
  language?: string;
  editable?: boolean; // Controls if modified editor is editable
  originalEditable?: boolean; // Controls if original editor is editable (default: false)
  viewMode?: 'side-by-side' | 'over-under'; // Controls layout
}

/**
 * Simple diff editor component for use in split editor view
 * Displays two versions of content side-by-side or over-under with diff highlighting
 */
export function SimpleDiffEditor({
  originalContent,
  modifiedContent,
  originalTitle: _originalTitle,
  modifiedTitle: _modifiedTitle,
  language = 'markdown',
  editable = false, // Default to read-only
  originalEditable = false, // Default to read-only (for saved diffs)
  viewMode = 'side-by-side', // Default to side-by-side
}: DiffEditorProps) {
  const { settings, theme, diffMode: storeDiffMode, activeTabId, updateTabContent } = useStore();
  const diffMode = storeDiffMode || { enabled: false, leftTabId: undefined, rightTabId: undefined, compareWithSaved: false };
  const { registerDiffEditor, unregisterDiffEditor } = useEditorContext();
  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);
  const modelListenersCleanupRef = useRef<(() => void) | null>(null);
  
  // Debounced content update function - resets cursor since edits in diff view
  // may invalidate stored cursor position when the document is viewed normally
  const debouncedUpdate = useMemo(
    () => debounce((tabId: string, content: string) => {
      updateTabContent(tabId, content, { resetCursor: true });
    }, EDITOR_DEBOUNCE_DELAY_MS),
    [updateTabContent]
  );


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
  // This ensures options are set correctly when component renders
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
      if (editable) {
        // Clean up existing listener if any
        const ref = editorRef.current as unknown as {
          _modifiedDisposable?: monaco.IDisposable;
          _originalDisposable?: monaco.IDisposable;
        };
        if (ref._modifiedDisposable) {
          ref._modifiedDisposable.dispose();
        }
        
        // Determine which tab to update based on diff mode
        const tabIdToUpdate = diffMode.compareWithSaved 
          ? activeTabId // Update active tab when comparing with saved
          : diffMode.rightTabId; // Update right tab when comparing files
        
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
      if (originalEditable && diffMode.leftTabId) {
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
          debouncedUpdate(diffMode.leftTabId!, content);
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

  const handleDiffEditorMount: DiffOnMount = (editor, monaco) => {
    const diffEditor = editor as unknown as monaco.editor.IDiffEditor;
    registerDiffEditor(diffEditor, monaco);
    editorRef.current = diffEditor;
    
    // Sync wrap/layout and listen for model changes
    modelListenersCleanupRef.current?.();
    modelListenersCleanupRef.current = attachDiffModelListeners(diffEditor, {
      wordWrap: settings.wordWrap,
      viewMode,
    });
    
    if (editable || originalEditable) {
      setupContentListeners(diffEditor);
    }
  };

  // Re-setup content listeners when diff mode or active tab changes
  useEffect(() => {
    if (!editorRef.current || (!editable && !originalEditable)) return;
    
    const diffEditor = editorRef.current;
    setupContentListeners(diffEditor);
  }, [diffMode.compareWithSaved, diffMode.leftTabId, diffMode.rightTabId, activeTabId, editable, originalEditable]);

  // Reapply word wrap when setting or view mode changes
  useEffect(() => {
    if (!editorRef.current) return;
    applyDiffEditorWrap(editorRef.current, { wordWrap: settings.wordWrap, viewMode });
  }, [settings.wordWrap, viewMode]);

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
      // Don't dispose listeners - Monaco handles cleanup when models are disposed
      // Just unregister from context
      unregisterDiffEditor();
    };
  }, [unregisterDiffEditor, activeTabId]);

  return (
    <div className="h-full w-full">
      <DiffEditor
        original={originalContent}
        modified={modifiedContent}
        language={language}
        theme={monacoTheme}
        onMount={handleDiffEditorMount}
        options={editorOptions} // PRIMARY mechanism - options set here
        keepCurrentOriginalModel={true}
        keepCurrentModifiedModel={true}
      />
    </div>
  );
}
