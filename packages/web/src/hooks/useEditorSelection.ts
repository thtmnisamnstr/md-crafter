import { useState, useEffect, useRef } from 'react';
import type * as monaco from 'monaco-editor';
import { useStore } from '../store';
import { useEditorContext } from '../contexts/EditorContext';
import { countWords, countCharacters } from '@md-crafter/shared';

export interface SelectionStats {
  text: string;
  wordCount: number;
  charCount: number;
  position: { line: number; column: number } | null;
}

type EditorLike = monaco.editor.ICodeEditor;

/**
 * Hook to track Monaco Editor selection and calculate statistics
 * 
 * @returns Object with selection text and stats, or null if no selection
 */
export function useEditorSelection(): SelectionStats | null {
  const [selectionStats, setSelectionStats] = useState<SelectionStats | null>(null);
  const { activeTabId } = useStore();
  const { primaryEditor, diffEditor } = useEditorContext();
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const mouseUpHandlerRef = useRef<(() => void) | null>(null);
  const editorRef = useRef<EditorLike | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear selection stats immediately when tab changes
    setSelectionStats(null);
    
    // Cleanup previous listeners
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];
    if (mouseUpHandlerRef.current) {
      mouseUpHandlerRef.current();
      mouseUpHandlerRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    // Don't clear editorRef here - let it be updated naturally

    // Function to get current editor for status bar display
    // IMPORTANT: Do NOT use getActiveEditor() - it returns the focused editor which could be secondary
    // The status bar should ALWAYS show stats from:
    // - primaryEditor in normal/split mode (represents the active tab)
    // - modifiedEditor (right pane) in diff mode (represents the current document being edited)
    const getCurrentEditor = (): EditorLike | null => {
      if (diffEditor) {
        // Diff mode: prefer modified (right) editor, fallback to original if modified unavailable
        const modifiedEditor = diffEditor.getModifiedEditor() as EditorLike | null;
        if (modifiedEditor) return modifiedEditor;
        return diffEditor.getOriginalEditor() as EditorLike | null;
      }
      // Normal mode or split mode: always use primaryEditor
      // Do NOT fall back to getActiveEditor() - it might return secondary editor
      return primaryEditor as EditorLike | null;
    };

    // Debounced selection updater to smooth out rapid events
    const selectionTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    const updateSelection = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = setTimeout(() => {
        const currentEditor = editorRef.current || getCurrentEditor();
        if (!currentEditor) {
          return;
        }

        // Update ref if we got a new editor
        if (!editorRef.current) {
          editorRef.current = currentEditor;
        }

        try {
          const selection = currentEditor.getSelection();
          if (!selection) {
            setSelectionStats(null);
            return;
          }

          // Check if selection is empty (just cursor position)
          const isEmpty = 
            selection.startLineNumber === selection.endLineNumber &&
            selection.startColumn === selection.endColumn;

        // Get selected text
        const model = currentEditor.getModel();
        if (!model) {
          setSelectionStats(null);
          return;
        }

        const selectedText = model.getValueInRange({
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn,
        });

        const position = selection ? { line: selection.positionLineNumber, column: selection.positionColumn } : null;

        if (isEmpty) {
          setSelectionStats({
            text: '',
            wordCount: 0,
            charCount: 0,
            position,
          });
          return;
        }

        // Calculate and set stats
        setSelectionStats({
          text: selectedText,
          wordCount: countWords(selectedText),
          charCount: countCharacters(selectedText),
          position,
        });
        } catch (error) {
          // Silently handle errors (editor might be disposed)
          setSelectionStats(null);
        }
      }, 50);
    };

    // Function to setup listeners on an editor
    const setupListeners = (editor: EditorLike) => {
      // Clear any existing listeners first
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
      if (mouseUpHandlerRef.current) {
        mouseUpHandlerRef.current();
        mouseUpHandlerRef.current = null;
      }

      // Set up event listeners
      const selectionDisposable = editor.onDidChangeCursorSelection(() => {
        updateSelection();
      });
      disposablesRef.current.push(selectionDisposable);

      const focusDisposable = editor.onDidFocusEditorText(() => {
        updateSelection();
      });
      disposablesRef.current.push(focusDisposable);

      // Mouse up handler for mouse-based selections
      const editorDomNode = editor.getDomNode();
      if (editorDomNode) {
        const handleMouseUp = () => {
          setTimeout(updateSelection, 20);
        };
        editorDomNode.addEventListener('mouseup', handleMouseUp);
        mouseUpHandlerRef.current = () => {
          editorDomNode.removeEventListener('mouseup', handleMouseUp);
        };
      }

      // If in diff mode, also listen to original editor
      if (diffEditor) {
        const originalEditor = diffEditor.getOriginalEditor();
        if (originalEditor && originalEditor !== editor) {
          const originalSelectionDisposable = originalEditor.onDidChangeCursorSelection(() => {
            updateSelection();
          });
          disposablesRef.current.push(originalSelectionDisposable);
        }
      }

      // Initial check
      updateSelection();
    };

    // Try to get editor immediately
    const editor = getCurrentEditor();
    
    // Always check if editor changed (even if we had one before)
    if (editor && editor !== editorRef.current) {
      editorRef.current = editor;
      setupListeners(editor);
    } else if (!editor && !editorRef.current) {
      // No editor at all, poll for it
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const pollForEditor = () => {
        attempts++;
        const currentEditor = getCurrentEditor();
        
        if (currentEditor) {
          // Found an editor
          editorRef.current = currentEditor;
          setupListeners(currentEditor);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (attempts >= maxAttempts) {
          // Stop polling after max attempts
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      };
      
      pollingIntervalRef.current = window.setInterval(pollForEditor, 100);
    } else if (editor && editor === editorRef.current) {
      // Same editor, just re-setup listeners to be safe
      setupListeners(editor);
    }

    // Also poll for selection updates (fallback) and editor changes
    const selectionPollInterval = setInterval(() => {
      // Use stored editor ref first, fallback to getting current editor
      let currentEditor = editorRef.current;
      if (!currentEditor) {
        currentEditor = getCurrentEditor();
        if (currentEditor) {
          editorRef.current = currentEditor;
          setupListeners(currentEditor);
        }
      } else {
        // Check if editor changed
        const latestEditor = getCurrentEditor();
        if (latestEditor && latestEditor !== currentEditor) {
          editorRef.current = latestEditor;
          setupListeners(latestEditor);
        } else {
          // Same editor, just update selection
          updateSelection();
        }
      }
    }, 200);

    // Cleanup function
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
      if (mouseUpHandlerRef.current) {
        mouseUpHandlerRef.current();
        mouseUpHandlerRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      clearInterval(selectionPollInterval);
      // Don't clear editorRef here - it might still be valid
    };
  }, [activeTabId, primaryEditor, diffEditor]); // Removed getActiveEditor from deps

  return selectionStats;
}
