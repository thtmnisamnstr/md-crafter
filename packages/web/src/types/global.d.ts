import type * as monaco from 'monaco-editor';

declare global {
  interface Window {
    // E2E testing properties (only set in development mode)
    monacoEditor?: monaco.editor.IStandaloneCodeEditor;
    monaco?: typeof monaco;
    diffEditor?: monaco.editor.IDiffEditor;
    secondaryEditor?: monaco.editor.IStandaloneCodeEditor;
    
    api?: {
      // File operations
      openFile?: () => Promise<string | null>;
      saveAs?: () => Promise<void>;
      readFile?: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile?: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      fileExists?: (path: string) => Promise<boolean>;
      watchFile?: (path: string) => Promise<void>;
      unwatchFile?: (path: string) => Promise<void>;
      selectFolder?: () => Promise<string | null>;

      // Store operations
      getStore: (key: string) => Promise<unknown>;
      setStore: (key: string, value: unknown) => Promise<void>;

      // Sync mappings
      getSyncMapping: (cloudId: string) => Promise<string | null>;
      setSyncMapping: (cloudId: string, localPath: string) => Promise<void>;
      removeSyncMapping: (cloudId: string) => Promise<void>;

      // Window controls (for custom title bar on Windows/Linux)
      minimizeWindow?: () => Promise<void>;
      maximizeWindow?: () => Promise<void>;
      closeWindow?: () => Promise<void>;
      isMaximized?: () => Promise<boolean>;
      onWindowStateChange?: (callback: (isMaximized: boolean) => void) => () => void;

      // Event listeners for file operations
      onFileOpened: (callback: (data: { path: string; content: string; name: string }) => void) => () => void;
      onFileSaveAsPath: (callback: (path: string | null) => void) => () => void;
      onExternalChange: (callback: (data: { path: string; content: string }) => void) => () => void;

      // Menu events - File menu
      onMenuNewFile: (callback: () => void) => () => void;
      onMenuSave: (callback: () => void) => () => void;
      onMenuSaveToCloud: (callback: () => void) => () => void;
      onMenuCloseTab: (callback: () => void) => () => void;
      onMenuRevert: (callback: () => void) => () => void;

      // Menu events - Import/Export
      onMenuImportWord: (callback: () => void) => () => void;
      onMenuExportPdf: (callback: () => void) => () => void;
      onMenuExportWord: (callback: () => void) => () => void;
      onMenuExportHtml: (callback: () => void) => () => void;

      // Menu events - Edit menu
      onMenuFind: (callback: () => void) => () => void;
      onMenuReplace: (callback: () => void) => () => void;
      onMenuSearch: (callback: () => void) => () => void;
      onMenuCopyForWord: (callback: () => void) => () => void;
      onMenuPasteFromWord: (callback: () => void) => () => void;
      onMenuFormat: (callback: () => void) => () => void;
      onMenuGrammar: (callback: () => void) => () => void;
      onMenuDictionary: (callback: () => void) => () => void;

      // Menu events - View menu
      onMenuToggleSidebar: (callback: () => void) => () => void;
      onMenuTogglePreview: (callback: () => void) => () => void;
      onMenuCommandPalette: (callback: () => void) => () => void;
      onMenuSettings: (callback: () => void) => () => void;
      onMenuZenMode: (callback: () => void) => () => void;
      onMenuSetTheme: (callback: (themeId: string) => void) => () => void;
      onMenuSplitVertical: (callback: () => void) => () => void;
      onMenuSplitHorizontal: (callback: () => void) => () => void;
      onMenuNoSplit: (callback: () => void) => () => void;
      onMenuDiffWithSaved: (callback: () => void) => () => void;
      onMenuDiffWithFile: (callback: () => void) => () => void;
      onMenuDiffExit: (callback: () => void) => () => void;

      // Menu events - Help menu
      onMenuAbout: (callback: () => void) => () => void;
      onMenuShortcuts: (callback: () => void) => () => void;
    };
  }
}

export {};

