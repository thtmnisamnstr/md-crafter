import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  saveAs: () => ipcRenderer.invoke('dialog:save-as'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  fileExists: (path: string) => ipcRenderer.invoke('file:exists', path),
  watchFile: (path: string) => ipcRenderer.invoke('file:watch', path),
  unwatchFile: (path: string) => ipcRenderer.invoke('file:unwatch', path),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),

  // Store operations
  getStore: (key: string) => ipcRenderer.invoke('store:get', key),
  setStore: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),

  // Sync mappings
  getSyncMapping: (cloudId: string) => ipcRenderer.invoke('sync:get-mapping', cloudId),
  setSyncMapping: (cloudId: string, localPath: string) => ipcRenderer.invoke('sync:set-mapping', cloudId, localPath),
  removeSyncMapping: (cloudId: string) => ipcRenderer.invoke('sync:remove-mapping', cloudId),

  // Window controls (for custom title bar on Windows/Linux)
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window:state-changed', (_event, isMaximized) => callback(isMaximized));
    return () => ipcRenderer.removeAllListeners('window:state-changed');
  },

  // Event listeners for file operations
  onFileOpened: (callback: (data: { path: string; content: string; name: string }) => void) => {
    ipcRenderer.on('file:opened', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('file:opened');
  },
  onFileSaveAsPath: (callback: (path: string) => void) => {
    ipcRenderer.on('file:save-as-path', (_event, path) => callback(path));
    return () => ipcRenderer.removeAllListeners('file:save-as-path');
  },
  onExternalChange: (callback: (data: { path: string; content: string }) => void) => {
    ipcRenderer.on('file:external-change', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('file:external-change');
  },

  // Menu events - File menu
  onMenuNewFile: (callback: () => void) => {
    ipcRenderer.on('menu:new-file', callback);
    return () => ipcRenderer.removeAllListeners('menu:new-file');
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu:save', callback);
    return () => ipcRenderer.removeAllListeners('menu:save');
  },
  onMenuSaveToCloud: (callback: () => void) => {
    ipcRenderer.on('menu:save-to-cloud', callback);
    return () => ipcRenderer.removeAllListeners('menu:save-to-cloud');
  },
  onMenuCloseTab: (callback: () => void) => {
    ipcRenderer.on('menu:close-tab', callback);
    return () => ipcRenderer.removeAllListeners('menu:close-tab');
  },
  onMenuRevert: (callback: () => void) => {
    ipcRenderer.on('menu:revert', callback);
    return () => ipcRenderer.removeAllListeners('menu:revert');
  },
  
  // Menu events - Import/Export
  onMenuImportWord: (callback: () => void) => {
    ipcRenderer.on('menu:import-word', callback);
    return () => ipcRenderer.removeAllListeners('menu:import-word');
  },
  onMenuExportPdf: (callback: () => void) => {
    ipcRenderer.on('menu:export-pdf', callback);
    return () => ipcRenderer.removeAllListeners('menu:export-pdf');
  },
  onMenuExportWord: (callback: () => void) => {
    ipcRenderer.on('menu:export-word', callback);
    return () => ipcRenderer.removeAllListeners('menu:export-word');
  },
  onMenuExportHtml: (callback: () => void) => {
    ipcRenderer.on('menu:export-html', callback);
    return () => ipcRenderer.removeAllListeners('menu:export-html');
  },

  // Menu events - Edit menu
  onMenuFind: (callback: () => void) => {
    ipcRenderer.on('menu:find', callback);
    return () => ipcRenderer.removeAllListeners('menu:find');
  },
  onMenuReplace: (callback: () => void) => {
    ipcRenderer.on('menu:replace', callback);
    return () => ipcRenderer.removeAllListeners('menu:replace');
  },
  onMenuSearch: (callback: () => void) => {
    ipcRenderer.on('menu:search', callback);
    return () => ipcRenderer.removeAllListeners('menu:search');
  },
  onMenuCopyForWord: (callback: () => void) => {
    ipcRenderer.on('menu:copy-for-word', callback);
    return () => ipcRenderer.removeAllListeners('menu:copy-for-word');
  },
  onMenuPasteFromWord: (callback: () => void) => {
    ipcRenderer.on('menu:paste-from-word', callback);
    return () => ipcRenderer.removeAllListeners('menu:paste-from-word');
  },
  onMenuFormat: (callback: () => void) => {
    ipcRenderer.on('menu:format', callback);
    return () => ipcRenderer.removeAllListeners('menu:format');
  },
  onMenuGrammar: (callback: () => void) => {
    ipcRenderer.on('menu:grammar', callback);
    return () => ipcRenderer.removeAllListeners('menu:grammar');
  },
  onMenuDictionary: (callback: () => void) => {
    ipcRenderer.on('menu:dictionary', callback);
    return () => ipcRenderer.removeAllListeners('menu:dictionary');
  },

  // Menu events - View menu
  onMenuToggleSidebar: (callback: () => void) => {
    ipcRenderer.on('menu:toggle-sidebar', callback);
    return () => ipcRenderer.removeAllListeners('menu:toggle-sidebar');
  },
  onMenuTogglePreview: (callback: () => void) => {
    ipcRenderer.on('menu:toggle-preview', callback);
    return () => ipcRenderer.removeAllListeners('menu:toggle-preview');
  },
  onMenuCommandPalette: (callback: () => void) => {
    ipcRenderer.on('menu:command-palette', callback);
    return () => ipcRenderer.removeAllListeners('menu:command-palette');
  },
  onMenuSettings: (callback: () => void) => {
    ipcRenderer.on('menu:settings', callback);
    return () => ipcRenderer.removeAllListeners('menu:settings');
  },
  onMenuZenMode: (callback: () => void) => {
    ipcRenderer.on('menu:zen-mode', callback);
    return () => ipcRenderer.removeAllListeners('menu:zen-mode');
  },
  onMenuSetTheme: (callback: (themeId: string) => void) => {
    ipcRenderer.on('menu:set-theme', (_event, themeId) => callback(themeId));
    return () => ipcRenderer.removeAllListeners('menu:set-theme');
  },
  onMenuSplitVertical: (callback: () => void) => {
    ipcRenderer.on('menu:split-vertical', callback);
    return () => ipcRenderer.removeAllListeners('menu:split-vertical');
  },
  onMenuSplitHorizontal: (callback: () => void) => {
    ipcRenderer.on('menu:split-horizontal', callback);
    return () => ipcRenderer.removeAllListeners('menu:split-horizontal');
  },
  onMenuNoSplit: (callback: () => void) => {
    ipcRenderer.on('menu:no-split', callback);
    return () => ipcRenderer.removeAllListeners('menu:no-split');
  },
  onMenuDiffWithSaved: (callback: () => void) => {
    ipcRenderer.on('menu:diff-with-saved', callback);
    return () => ipcRenderer.removeAllListeners('menu:diff-with-saved');
  },
  onMenuDiffWithFile: (callback: () => void) => {
    ipcRenderer.on('menu:diff-with-file', callback);
    return () => ipcRenderer.removeAllListeners('menu:diff-with-file');
  },
  onMenuDiffExit: (callback: () => void) => {
    ipcRenderer.on('menu:diff-exit', callback);
    return () => ipcRenderer.removeAllListeners('menu:diff-exit');
  },

  // Menu events - Help menu
  onMenuAbout: (callback: () => void) => {
    ipcRenderer.on('menu:about', callback);
    return () => ipcRenderer.removeAllListeners('menu:about');
  },
  onMenuShortcuts: (callback: () => void) => {
    ipcRenderer.on('menu:shortcuts', callback);
    return () => ipcRenderer.removeAllListeners('menu:shortcuts');
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error('Preload error', error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
