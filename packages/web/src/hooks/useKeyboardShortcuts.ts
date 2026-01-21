import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useEditorContext } from '../contexts/EditorContext';
import { isElectron } from '../utils/platform';
import type * as Monaco from 'monaco-editor';

/**
 * Helper to wrap selected text with markdown syntax
 */
function wrapSelectionWith(
  editor: Monaco.editor.IStandaloneCodeEditor,
  prefix: string,
  suffix: string
): void {
  const selection = editor.getSelection();
  if (!selection) return;

  const model = editor.getModel();
  if (!model) return;

  const selectedText = model.getValueInRange(selection);
  const newText = `${prefix}${selectedText}${suffix}`;

  editor.executeEdits('markdown-format', [{
    range: selection,
    text: newText,
    forceMoveMarkers: true,
  }]);

  // If no text was selected, position cursor between the markers
  if (selectedText === '') {
    const newPosition = {
      lineNumber: selection.startLineNumber,
      column: selection.startColumn + prefix.length,
    };
    editor.setPosition(newPosition);
  }
}

/**
 * Helper to insert a markdown link
 */
function insertLink(editor: Monaco.editor.IStandaloneCodeEditor): void {
  const selection = editor.getSelection();
  if (!selection) return;

  const model = editor.getModel();
  if (!model) return;

  const selectedText = model.getValueInRange(selection);
  const linkText = selectedText || 'link text';
  const newText = `[${linkText}](url)`;

  editor.executeEdits('markdown-link', [{
    range: selection,
    text: newText,
    forceMoveMarkers: true,
  }]);

  // Select "url" so user can type the URL directly
  const startCol = selection.startColumn + linkText.length + 3; // [linkText](
  const endCol = startCol + 3; // url
  editor.setSelection({
    startLineNumber: selection.startLineNumber,
    startColumn: startCol,
    endLineNumber: selection.startLineNumber,
    endColumn: endCol,
  });
}

/**
 * Custom hook for handling global keyboard shortcuts
 * 
 * Handles all keyboard shortcuts for the application including:
 * - Command palette (Ctrl/Cmd + Shift + P)
 * - Save operations (Ctrl/Cmd + S, Ctrl/Cmd + Shift + S)
 * - Document operations (New, Close, etc.)
 * - UI toggles (Sidebar, Preview, Settings, etc.)
 * - Editor splits and zen mode
 * 
 * @returns void - Sets up event listeners and returns cleanup function
 */
export function useKeyboardShortcuts(): void {
  const zenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getActiveEditor, primaryMonaco, grammarService } = useEditorContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl/Cmd + Shift + P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowCommandPalette(true);
        return;
      }

      // Print/PDF Export: Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowExportPdf(true);
        return;
      }

      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        useStore.getState().saveCurrentDocument();
        return;
      }

      // Save As: Ctrl/Cmd + Shift + S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();

        if (isElectron() && window.api?.saveAs) {
          // Use Electron's native Save As dialog
          window.api.saveAs();
        } else {
          // Browser fallback - download file
          const { tabs, activeTabId } = useStore.getState();
          const tab = tabs.find((t) => t.id === activeTabId);
          if (tab) {
            const blob = new Blob([tab.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = tab.title;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
        return;
      }

      // New document: Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        useStore.getState().createNewDocument();
        return;
      }

      // Open file(s): Ctrl/Cmd + O
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.mdx,.txt,.markdown,.docx';
        input.multiple = true;
        input.onchange = async (ev) => {
          const files = (ev.target as HTMLInputElement).files;
          if (!files || files.length === 0) return;

          for (const file of Array.from(files)) {
            if (file.name.endsWith('.docx')) {
              useStore.getState().importDocxFile(file);
            } else {
              const content = await file.text();
              useStore.getState().openTab({
                title: file.name,
                content,
                language: file.name.endsWith('.mdx') ? 'mdx' : 'markdown',
                path: file.name,
              });
            }
          }
        };
        input.click();
        return;
      }

      // Close tab: Ctrl/Cmd + W
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const activeTab = useStore.getState().activeTabId;
        if (activeTab) {
          useStore.getState().closeTab(activeTab);
        }
        return;
      }

      // Bold (when editor focused) or Toggle sidebar: Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        const editor = getActiveEditor();
        if (editor && editor.hasTextFocus()) {
          // Editor is focused - insert Bold markdown
          e.preventDefault();
          wrapSelectionWith(editor, '**', '**');
        } else {
          // Editor not focused - toggle sidebar
          e.preventDefault();
          useStore.getState().toggleSidebar();
        }
        return;
      }

      // Italic: Ctrl/Cmd + I (only when editor focused)
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        const editor = getActiveEditor();
        if (editor && editor.hasTextFocus()) {
          e.preventDefault();
          wrapSelectionWith(editor, '*', '*');
        }
        return;
      }

      // Settings: Ctrl/Cmd + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useStore.getState().setShowSettings(true);
        return;
      }

      // Export HTML: Ctrl/Cmd + E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        useStore.getState().setShowExport(true);
        return;
      }

      // Copy to Word/Docs: Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        useStore.getState().copyForWordDocs();
        return;
      }

      // Paste from Word/Docs: Ctrl/Cmd + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        const editor = getActiveEditor();
        useStore.getState().pasteFromWordDocs(editor || undefined);
        return;
      }

      // Copy to HTML: Ctrl/Cmd + Shift + Alt + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        const editor = getActiveEditor();
        const model = editor?.getModel();
        const selection = editor?.getSelection();
        const text = selection && !selection.isEmpty()
          ? model?.getValueInRange(selection)
          : model?.getValue();

        if (text) {
          import('../services/clipboard').then(({ copyAsHtml }) => {
            copyAsHtml(text);
          });
        }
        return;
      }

      // Paste from HTML: Ctrl/Cmd + Shift + Alt + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        const editor = getActiveEditor();
        import('../services/clipboard').then(async ({ pasteFromHtml }) => {
          const markdown = await pasteFromHtml();
          if (markdown && editor) {
            const selection = editor.getSelection();
            if (selection) {
              editor.executeEdits('paste-html', [{
                range: selection,
                text: markdown,
                forceMoveMarkers: true
              }]);
            }
          }
        });
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const editor = getActiveEditor();
        editor?.trigger('keyboard', 'undo', null);
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const editor = getActiveEditor();
        editor?.trigger('keyboard', 'redo', null);
        return;
      }

      // Find in active document: Ctrl/Cmd + F
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'f') {
        e.preventDefault();
        const editor = getActiveEditor();
        if (editor) {
          editor.getAction('actions.find')?.run();
        }
        return;
      }

      // Replace in active document: Ctrl/Cmd + H
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'h') {
        e.preventDefault();
        const editor = getActiveEditor();
        if (editor) {
          editor.getAction('editor.action.startFindReplaceAction')?.run();
        }
        return;
      }

      // Format document: Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key === 'f') {
        e.preventDefault();
        useStore.getState().formatDocument();
        return;
      }

      // Global search: Ctrl/Cmd + Shift + Alt + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key === 'f') {
        e.preventDefault();
        useStore.getState().setShowSearch(true);
        return;
      }

      // Check grammar: Ctrl/Cmd + Shift + G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g') {
        e.preventDefault();
        const editor = getActiveEditor();
        if (editor && primaryMonaco) {
          useStore.getState().checkGrammar({ editor, monaco: primaryMonaco, grammarService: grammarService || undefined });
        }
        return;
      }

      // Split editor vertical: Ctrl/Cmd + \
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '\\') {
        e.preventDefault();
        const { splitMode, setSplitMode } = useStore.getState();
        setSplitMode(splitMode === 'vertical' ? 'none' : 'vertical');
        return;
      }

      // Split editor horizontal: Ctrl/Cmd + Shift + \
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '|') {
        e.preventDefault();
        const { splitMode, setSplitMode } = useStore.getState();
        setSplitMode(splitMode === 'horizontal' ? 'none' : 'horizontal');
        return;
      }

      // Link (when editor focused) or Zen mode chord: Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const editor = getActiveEditor();
        if (editor && editor.hasTextFocus()) {
          // Editor is focused - insert Link markdown
          e.preventDefault();
          insertLink(editor);
          return;
        }

        // Editor not focused - Zen mode chord (Ctrl/Cmd + K, Z)
        // Wait for next key
        const handleZenKey = (e2: KeyboardEvent) => {
          if (e2.key === 'z') {
            e2.preventDefault();
            useStore.getState().toggleZenMode();
          }
          window.removeEventListener('keydown', handleZenKey);
          if (zenTimeoutRef.current) {
            clearTimeout(zenTimeoutRef.current);
            zenTimeoutRef.current = null;
          }
        };
        window.addEventListener('keydown', handleZenKey);
        zenTimeoutRef.current = setTimeout(() => {
          window.removeEventListener('keydown', handleZenKey);
          zenTimeoutRef.current = null;
        }, 500);
        return;
      }

      // Escape to exit Zen mode
      if (e.key === 'Escape' && useStore.getState().zenMode) {
        useStore.getState().toggleZenMode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (zenTimeoutRef.current) {
        clearTimeout(zenTimeoutRef.current);
        zenTimeoutRef.current = null;
      }
    };
  }, [getActiveEditor, primaryMonaco, grammarService]);
}
