import { useRef, useCallback, useMemo } from 'react';
import MonacoEditor, { OnMount, OnChange } from '@monaco-editor/react';
import { useStore } from '../store';
import { debounce } from '@md-edit/shared';

export function Editor() {
  const { 
    tabs, 
    activeTabId, 
    updateTabContent, 
    settings, 
    theme,
  } = useStore();

  const editorRef = useRef<any>(null);
  
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Debounced content update
  const debouncedUpdate = useMemo(
    () => debounce((tabId: string, content: string) => {
      updateTabContent(tabId, content);
    }, 300),
    [updateTabContent]
  );

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure Monaco themes
    monaco.editor.defineTheme('md-edit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d2d2d',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
      },
    });

    monaco.editor.defineTheme('md-edit-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editor.lineHighlightBackground': '#f3f3f3',
        'editor.selectionBackground': '#add6ff',
      },
    });

    // Apply theme
    const monacoTheme = theme === 'light' ? 'md-edit-light' : 'md-edit-dark';
    monaco.editor.setTheme(monacoTheme);

    // Focus editor
    editor.focus();
  };

  const handleChange: OnChange = useCallback((value) => {
    if (activeTabId && value !== undefined) {
      debouncedUpdate(activeTabId, value);
    }
  }, [activeTabId, debouncedUpdate]);

  // Get Monaco theme based on app theme
  const monacoTheme = useMemo(() => {
    switch (theme) {
      case 'light':
        return 'vs';
      case 'monokai':
        return 'monokai';
      case 'dracula':
        return 'vs-dark'; // Will be customized
      default:
        return 'vs-dark';
    }
  }, [theme]);

  // Map file extensions to Monaco languages
  const getLanguage = (filename: string, defaultLang: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      md: 'markdown',
      markdown: 'markdown',
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'cpp',
      cs: 'csharp',
      php: 'php',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
    };
    return langMap[ext || ''] || defaultLang || 'plaintext';
  };

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
    <MonacoEditor
      height="100%"
      language={getLanguage(activeTab.title, activeTab.language)}
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
  );
}

