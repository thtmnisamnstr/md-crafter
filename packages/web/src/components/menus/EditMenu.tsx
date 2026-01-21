import { useStore } from '../../store';
import type * as monaco from 'monaco-editor';
import {
  Undo,
  Redo,
  Scissors,
  Copy,
  Clipboard,
  ClipboardPaste,
  Search,
  Replace,
  CheckSquare,
  BookOpen,
} from 'lucide-react';
import type { MenuItem } from './FileMenu';
import type { GrammarService } from '../../services/grammar';

interface EditorContext {
  getActiveEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  primaryMonaco: typeof monaco | null;
  grammarService: GrammarService | null;
}

/**
 * Generates menu items for the Edit menu
 * 
 * @param editorContext - Editor context with getActiveEditor, primaryMonaco, and grammarService
 * @returns Array of Edit menu items
 */
export function getEditMenuItems(editorContext: EditorContext): MenuItem[] {
  const {
    activeTabId,
    tabs,
    copyForWordDocs,
    pasteFromWordDocs,
    formatDocument,
    checkGrammar,
    setShowDictionaryModal,
  } = useStore.getState();
  const { getActiveEditor, primaryMonaco, grammarService } = editorContext;

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: '⌘Z',
      icon: <Undo size={14} />,
      action: () => {
        const editor = getActiveEditor();
        editor?.trigger('keyboard', 'undo', null);
      },
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: '⌘⇧Z',
      icon: <Redo size={14} />,
      action: () => {
        const editor = getActiveEditor();
        editor?.trigger('keyboard', 'redo', null);
      },
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'cut',
      label: 'Cut',
      shortcut: '⌘X',
      icon: <Scissors size={14} />,
      action: () => document.execCommand('cut'),
    },
    {
      id: 'copy',
      label: 'Copy',
      shortcut: '⌘C',
      icon: <Copy size={14} />,
      action: () => document.execCommand('copy'),
    },
    {
      id: 'copy-word',
      label: 'Copy to Word/Docs',
      shortcut: '⌘⇧C',
      icon: <Clipboard size={14} />,
      action: copyForWordDocs,
      disabled: !activeTab,
    },
    {
      id: 'copy-html',
      label: 'Copy to HTML',
      shortcut: '⌥⌘⇧C',
      icon: <Clipboard size={14} />,
      action: async () => {
        const editor = getActiveEditor();
        const model = editor?.getModel();
        // If selection, copy selection, else copy entire document
        const selection = editor?.getSelection();
        const text = selection && !selection.isEmpty()
          ? model?.getValueInRange(selection)
          : model?.getValue();

        if (text) {
          // Dynamic import to avoid circular dependency if any, or just import at top if needed.
          // Since we are in the same package, we can import directly.
          // But wait, the hook uses useStore, we might need to expose this via store or import service directly.
          // EditMenu imports from '../../store' which doesn't expose clipboard service directly.
          // Let's import the service function directly at top of file.
          const { copyAsHtml } = await import('../../services/clipboard');
          await copyAsHtml(text);
        }
      },
      disabled: !activeTab,
    },
    {
      id: 'paste',
      label: 'Paste',
      shortcut: '⌘V',
      icon: <ClipboardPaste size={14} />,
      action: () => document.execCommand('paste'),
    },
    {
      id: 'paste-word',
      label: 'Paste from Word/Docs',
      shortcut: '⌘⇧V',
      icon: <ClipboardPaste size={14} />,
      action: () => {
        const editor = getActiveEditor();
        pasteFromWordDocs(editor || undefined);
      },
    },
    {
      id: 'paste-html',
      label: 'Paste from HTML',
      shortcut: '⌥⌘⇧V',
      icon: <ClipboardPaste size={14} />,
      action: async () => {
        const editor = getActiveEditor();
        const { pasteFromHtml } = await import('../../services/clipboard');
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
      },
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'find',
      label: 'Find',
      shortcut: '⌘F',
      icon: <Search size={14} />,
      action: () => {
        const editor = getActiveEditor();
        if (editor) {
          editor.getAction('actions.find')?.run();
        }
      },
    },
    {
      id: 'replace',
      label: 'Replace',
      shortcut: '⌘H',
      icon: <Replace size={14} />,
      action: () => {
        const editor = getActiveEditor();
        if (editor) {
          editor.getAction('editor.action.startFindReplaceAction')?.run();
        }
      },
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'format',
      label: 'Format Document',
      shortcut: '⌘⇧F',
      icon: <CheckSquare size={14} />,
      action: formatDocument,
      disabled: !activeTab || (
        activeTab.language !== 'markdown' &&
        activeTab.language !== 'mdx' &&
        !activeTab.title.endsWith('.md') &&
        !activeTab.title.endsWith('.mdx')
      ),
    },
    {
      id: 'grammar',
      label: 'Check Grammar',
      shortcut: '⌘⇧G',
      icon: <CheckSquare size={14} />,
      action: () => {
        const editor = getActiveEditor();
        if (editor && primaryMonaco) {
          checkGrammar({ editor, monaco: primaryMonaco, grammarService: grammarService || undefined });
        }
      },
      disabled: !activeTab || (
        activeTab.language !== 'markdown' &&
        activeTab.language !== 'mdx' &&
        !activeTab.title.endsWith('.md') &&
        !activeTab.title.endsWith('.mdx')
      ),
    },
    {
      id: 'dictionary',
      label: 'Manage Dictionary...',
      icon: <BookOpen size={14} />,
      action: () => setShowDictionaryModal(true),
    },
    { id: 'sep4', label: '', separator: true },
    {
      id: 'select-all',
      label: 'Select All',
      shortcut: '⌘A',
      icon: <CheckSquare size={14} />,
      action: () => document.execCommand('selectAll'),
    },
  ];
}
