export interface EditorSettings {
  theme: string;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  wordWrapColumn: number;
  lineNumbers: 'on' | 'off' | 'relative';
  minimap: boolean;
  minimapScale: number;
  scrollBeyondLastLine: boolean;
  smoothScrolling: boolean;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  bracketPairColorization: boolean;
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  formatOnSave: boolean;
  formatOnPaste: boolean;
}

export interface AppSettings {
  editor: EditorSettings;
  sync: SyncSettings;
  appearance: AppearanceSettings;
  keybindings: KeybindingPreset;
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  defaultCloudSave: boolean;
  showSyncNotifications: boolean;
  offlineMode: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  sidebarPosition: 'left' | 'right';
  showStatusBar: boolean;
  showActivityBar: boolean;
  compactMode: boolean;
}

export type KeybindingPreset = 'default' | 'vim' | 'emacs' | 'sublime';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'on',
  wordWrapColumn: 80,
  lineNumbers: 'on',
  minimap: true,
  minimapScale: 1,
  scrollBeyondLastLine: true,
  smoothScrolling: true,
  cursorBlinking: 'blink',
  cursorStyle: 'line',
  renderWhitespace: 'selection',
  bracketPairColorization: true,
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  formatOnSave: false,
  formatOnPaste: false,
};

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSync: true,
  syncInterval: 2000,
  defaultCloudSave: false,
  showSyncNotifications: true,
  offlineMode: false,
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'dark',
  accentColor: '#007acc',
  sidebarPosition: 'left',
  showStatusBar: true,
  showActivityBar: true,
  compactMode: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  editor: DEFAULT_EDITOR_SETTINGS,
  sync: DEFAULT_SYNC_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS,
  keybindings: 'default',
};

