import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      openFile: () => Promise<void>;
      saveAs: () => Promise<void>;
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      fileExists: (path: string) => Promise<boolean>;
      watchFile: (path: string) => Promise<void>;
      unwatchFile: (path: string) => Promise<void>;
      selectFolder: () => Promise<string | null>;
      
      getStore: (key: string) => Promise<unknown>;
      setStore: (key: string, value: unknown) => Promise<void>;
      
      getSyncMapping: (cloudId: string) => Promise<string | undefined>;
      setSyncMapping: (cloudId: string, localPath: string) => Promise<void>;
      removeSyncMapping: (cloudId: string) => Promise<void>;
      
      onFileOpened: (callback: (data: { path: string; content: string; name: string }) => void) => () => void;
      onFileSaveAsPath: (callback: (path: string) => void) => () => void;
      onExternalChange: (callback: (data: { path: string; content: string }) => void) => () => void;
      
      onMenuNewFile: (callback: () => void) => () => void;
      onMenuSave: (callback: () => void) => () => void;
      onMenuSaveToCloud: (callback: () => void) => () => void;
      onMenuCloseTab: (callback: () => void) => () => void;
      onMenuToggleSidebar: (callback: () => void) => () => void;
      onMenuTogglePreview: (callback: () => void) => () => void;
      onMenuCommandPalette: (callback: () => void) => () => void;
      onMenuSettings: (callback: () => void) => () => void;
      onMenuFind: (callback: () => void) => () => void;
      onMenuReplace: (callback: () => void) => () => void;
    };
  }
}

