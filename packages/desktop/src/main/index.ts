import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import Store from 'electron-store';
import { promises as fs } from 'fs';
import { watch, FSWatcher } from 'fs';
import { logger } from '@md-crafter/shared';

// Initialize electron store for settings and sync mappings
const store = new Store({
  name: 'md-crafter-config',
  defaults: {
    windowState: { width: 1200, height: 800 },
    apiToken: null,
    syncMappings: {},
    recentFiles: [],
  },
});

let mainWindow: BrowserWindow | null = null;
const fileWatchers: Map<string, FSWatcher> = new Map();

function createWindow(): void {
  const windowState = store.get('windowState') as { width: number; height: number; x?: number; y?: number };

  // Platform-specific window options
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    // macOS: hiddenInset shows traffic lights inset
    // Windows/Linux: hidden removes title bar entirely (we use custom controls)
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 12, y: 8 } : undefined,
    // Enable native window frame features on Windows
    frame: isMac ? true : false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window state on close
  mainWindow.on('close', () => {
    const bounds = mainWindow?.getBounds();
    if (bounds) {
      store.set('windowState', bounds);
    }
  });

  // Notify renderer of maximize/unmaximize state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:state-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:state-changed', false);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Create application menu that mirrors the web app's menu
function createMenu(): void {
  const recentFiles = store.get('recentFiles') as string[];

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-file'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenFile(),
        },
        {
          label: 'Open Recent',
          submenu: recentFiles.length > 0
            ? [
              ...recentFiles.map((filePath) => ({
                label: filePath.split('/').pop() || filePath,
                click: async () => {
                  try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    mainWindow?.webContents.send('file:opened', {
                      path: filePath,
                      content,
                      name: filePath.split('/').pop() || 'Untitled',
                    });
                  } catch (error) {
                    logger.error('Failed to open recent file', error);
                  }
                },
              })),
              { type: 'separator' as const },
              {
                label: 'Clear Recent',
                click: () => store.set('recentFiles', []),
              },
            ]
            : [{ label: 'No Recent Files', enabled: false }],
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        {
          label: 'Save to Cloud',
          click: () => mainWindow?.webContents.send('menu:save-to-cloud'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => handleSaveAs(),
        },
        {
          label: 'Revert to Last Saved',
          click: () => mainWindow?.webContents.send('menu:revert'),
        },
        { type: 'separator' },
        {
          label: 'Import from Word (.docx)',
          click: () => mainWindow?.webContents.send('menu:import-word'),
        },
        { type: 'separator' },
        {
          label: 'Export as PDF',
          click: () => mainWindow?.webContents.send('menu:export-pdf'),
        },
        {
          label: 'Export as Word (.docx)',
          click: () => mainWindow?.webContents.send('menu:export-word'),
        },
        {
          label: 'Export as HTML',
          click: () => mainWindow?.webContents.send('menu:export-html'),
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow?.webContents.send('menu:close-tab'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        {
          label: 'Copy to Word/Docs',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu:copy-for-word'),
        },
        {
          label: 'Copy to HTML',
          accelerator: 'Alt+CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu:copy-for-html'),
        },
        { role: 'paste' },
        {
          label: 'Paste from Word/Docs',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => mainWindow?.webContents.send('menu:paste-from-word'),
        },
        {
          label: 'Paste from HTML',
          accelerator: 'Alt+CmdOrCtrl+Shift+V',
          click: () => mainWindow?.webContents.send('menu:paste-from-html'),
        },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu:find'),
        },
        {
          label: 'Find in All Files',
          click: () => mainWindow?.webContents.send('menu:search'),
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow?.webContents.send('menu:replace'),
        },
        { type: 'separator' },
        {
          label: 'Format Document',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow?.webContents.send('menu:format'),
        },
        {
          label: 'Check Grammar',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow?.webContents.send('menu:grammar'),
        },
        {
          label: 'Manage Dictionary...',
          click: () => mainWindow?.webContents.send('menu:dictionary'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu:toggle-sidebar'),
        },
        {
          label: 'Toggle Preview',
          click: () => mainWindow?.webContents.send('menu:toggle-preview'),
        },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu:command-palette'),
        },
        { type: 'separator' },
        {
          label: 'Split Editor',
          submenu: [
            {
              label: 'No Split',
              click: () => mainWindow?.webContents.send('menu:no-split'),
            },
            {
              label: 'Split Horizontal',
              click: () => mainWindow?.webContents.send('menu:split-horizontal'),
            },
            {
              label: 'Split Vertical',
              accelerator: 'CmdOrCtrl+\\',
              click: () => mainWindow?.webContents.send('menu:split-vertical'),
            },
          ],
        },
        {
          label: 'Compare Files',
          submenu: [
            {
              label: 'Compare with Saved Version',
              click: () => mainWindow?.webContents.send('menu:diff-with-saved'),
            },
            {
              label: 'Compare Active File with...',
              click: () => mainWindow?.webContents.send('menu:diff-with-file'),
            },
            {
              label: 'Exit Diff View',
              click: () => mainWindow?.webContents.send('menu:diff-exit'),
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Zen Mode',
          accelerator: 'CmdOrCtrl+K Z',
          click: () => mainWindow?.webContents.send('menu:zen-mode'),
        },
        { type: 'separator' },
        {
          label: 'Change Theme',
          submenu: [
            {
              label: 'Dark+ (Default)',
              click: () => mainWindow?.webContents.send('menu:set-theme', 'dark'),
            },
            {
              label: 'Light+',
              click: () => mainWindow?.webContents.send('menu:set-theme', 'light'),
            },
            {
              label: 'Monokai',
              click: () => mainWindow?.webContents.send('menu:set-theme', 'monokai'),
            },
            {
              label: 'Dracula',
              click: () => mainWindow?.webContents.send('menu:set-theme', 'dracula'),
            },
            {
              label: 'GitHub Dark',
              click: () => mainWindow?.webContents.send('menu:set-theme', 'github-dark'),
            },
            {
              label: 'Nord',
              click: () => mainWindow?.webContents.send('menu:set-theme', 'nord'),
            },
          ],
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => mainWindow?.webContents.send('menu:shortcuts'),
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/thtmnisamnstr/md-crafter'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/thtmnisamnstr/md-crafter/issues'),
        },
        { type: 'separator' },
        {
          label: 'About md-crafter',
          click: () => mainWindow?.webContents.send('menu:about'),
        },
      ],
    },
  ];

  // macOS specific menu - app menu with Settings
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu:settings'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  } else {
    // Windows/Linux - add Settings to File menu
    const fileMenu = template.find(item => item.label === 'File');
    if (fileMenu && fileMenu.submenu && Array.isArray(fileMenu.submenu)) {
      // Insert Settings before Quit
      const quitIndex = fileMenu.submenu.findIndex(item => item.role === 'quit');
      if (quitIndex !== -1) {
        fileMenu.submenu.splice(quitIndex, 0,
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => mainWindow?.webContents.send('menu:settings'),
          }
        );
      }
    }
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function handleOpenFile(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Supported', extensions: ['md', 'mdx', 'markdown', 'txt', 'js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'docx'] },
      { name: 'Markdown', extensions: ['md', 'mdx', 'markdown'] },
      { name: 'JavaScript/TypeScript', extensions: ['js', 'ts', 'jsx', 'tsx'] },
      { name: 'Word Documents', extensions: ['docx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    for (const filePath of result.filePaths) {
      const content = await fs.readFile(filePath, 'utf-8');
      mainWindow?.webContents.send('file:opened', {
        path: filePath,
        content,
        name: filePath.split('/').pop() || 'Untitled',
      });
      addToRecentFiles(filePath);
    }
  }
}

async function handleSaveAs(): Promise<void> {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'MDX', extensions: ['mdx'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    mainWindow?.webContents.send('file:save-as-path', result.filePath);
  }
}

function addToRecentFiles(filePath: string): void {
  const recentFiles = store.get('recentFiles') as string[];
  const filtered = recentFiles.filter((f) => f !== filePath);
  filtered.unshift(filePath);
  store.set('recentFiles', filtered.slice(0, 10));
  // Rebuild menu to update recent files
  createMenu();
}

function watchFile(filePath: string): void {
  if (fileWatchers.has(filePath)) return;

  const watcher = watch(filePath, async (eventType) => {
    if (eventType === 'change') {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        mainWindow?.webContents.send('file:external-change', {
          path: filePath,
          content,
        });
      } catch (error) {
        logger.error('Error reading changed file', error);
      }
    }
  });

  fileWatchers.set(filePath, watcher);
}

function unwatchFile(filePath: string): void {
  const watcher = fileWatchers.get(filePath);
  if (watcher) {
    watcher.close();
    fileWatchers.delete(filePath);
  }
}

// IPC Handlers
ipcMain.handle('dialog:open-file', handleOpenFile);
ipcMain.handle('dialog:save-as', handleSaveAs);

ipcMain.handle('file:read', async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('file:exists', async (_event, filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('file:watch', (_event, filePath: string) => {
  watchFile(filePath);
});

ipcMain.handle('file:unwatch', (_event, filePath: string) => {
  unwatchFile(filePath);
});

ipcMain.handle('store:get', (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
  store.set(key, value);
});

ipcMain.handle('sync:get-mapping', (_event, cloudId: string) => {
  const mappings = store.get('syncMappings') as Record<string, string>;
  return mappings[cloudId];
});

ipcMain.handle('sync:set-mapping', (_event, cloudId: string, localPath: string) => {
  const mappings = store.get('syncMappings') as Record<string, string>;
  mappings[cloudId] = localPath;
  store.set('syncMappings', mappings);
});

ipcMain.handle('sync:remove-mapping', (_event, cloudId: string) => {
  const mappings = store.get('syncMappings') as Record<string, string>;
  delete mappings[cloudId];
  store.set('syncMappings', mappings);
});

ipcMain.handle('dialog:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Window control handlers (for custom title bar on Windows/Linux)
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// App lifecycle
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mdcrafter.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close all file watchers
  fileWatchers.forEach((watcher) => watcher.close());
  fileWatchers.clear();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
