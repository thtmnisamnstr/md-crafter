import { useRef, useCallback, useMemo, useEffect } from 'react';
import MonacoEditor, { OnMount, OnChange } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useStore } from '../store';
import { debounce } from '@md-crafter/shared';
import { defineMonacoThemes } from '../utils/monacoThemes';
import { getLanguageFromExtension } from '../utils/language';
import { ErrorBoundary } from './ErrorBoundary';

export function Editor() {
  const { 
    tabs, 
    activeTabId, 
    updateTabContent, 
    settings, 
    theme,
  } = useStore();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Debounced content update
  const debouncedUpdate = useMemo(
    () => debounce((tabId: string, content: string) => {
      updateTabContent(tabId, content);
    }, 300),
    [updateTabContent]
  );

  // Get Monaco theme name based on app theme
  const monacoTheme = useMemo(() => {
    switch (theme) {
      case 'light':
        return 'md-crafter-light';
      case 'monokai':
        return 'monokai';
      case 'dracula':
        return 'vs-dark'; // Monaco's built-in dracula theme
      default:
        return 'md-crafter-dark';
    }
  }, [theme]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    window.monacoEditor = editor;
    
    // Define Monaco themes (idempotent - safe to call multiple times)
    defineMonacoThemes(monaco);

    // Apply theme
    monaco.editor.setTheme(monacoTheme);

    // Focus editor
    editor.focus();
  };

  // Update theme when it changes (after initial mount)
  useEffect(() => {
    if (monacoRef.current) {
      // Ensure themes are defined
      defineMonacoThemes(monacoRef.current);
      // Apply theme
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  // Cleanup window.monacoEditor on unmount
  useEffect(() => {
    return () => {
      window.monacoEditor = undefined;
    };
  }, []);

  const handleChange: OnChange = useCallback((value) => {
    if (activeTabId && value !== undefined) {
      debouncedUpdate(activeTabId, value);
    }
  }, [activeTabId, debouncedUpdate]);

  if (!activeTab) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
      >
        <div className="text-center opacity-50">
          <p className="text-lg mb-2">No document open</p>
          <p className="text-sm">
            Press <kbd className="px-2 py-1 bg-sidebar-bg rounded">Ctrl+N</kbd> to create a new document
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
            Editor failed to load. Please refresh the page.
          </p>
        </div>
      </div>
    }>
      <MonacoEditor
      height="100%"
      language={getLanguageFromExtension(activeTab.title.split('.').pop(), activeTab.language)}
      value={activeTab.content}
      theme={monacoTheme}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        lineNumbers: settings.lineNumbers ? 'on' : 'off',
        minimap: { enabled: settings.minimap },
        scrollBeyondLastLine: true,
        smoothScrolling: true,
        cursorBlinking: 'blink',
        cursorStyle: 'line',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'languageDefined',
        autoClosingQuotes: 'languageDefined',
        formatOnPaste: false,
        formatOnType: false,
        automaticLayout: true,
        padding: { top: 10, bottom: 10 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
      />
    </ErrorBoundary>
  );
}

