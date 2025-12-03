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
  
  // Menu events - Import/Export
  onMenuImportWord: (callback: () => void) => {
    ipcRenderer.on('menu:import-word', callback);
    return () => ipcRenderer.removeAllListeners('menu:import-word');
  },
  onMenuImportGoogleDoc: (callback: () => void) => {
    ipcRenderer.on('menu:import-google-doc', callback);
    return () => ipcRenderer.removeAllListeners('menu:import-google-doc');
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
  onMenuExportGoogleDrive: (callback: () => void) => {
    ipcRenderer.on('menu:export-google-drive', callback);
    return () => ipcRenderer.removeAllListeners('menu:export-google-drive');
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
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
