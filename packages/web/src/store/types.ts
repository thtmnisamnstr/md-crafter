import { Document, SyncStatusType, ConflictInfo } from '@md-crafter/shared';

export interface Tab {
  id: string;
  documentId: string | null; // null for new unsaved documents
  title: string;
  content: string;
  language: string;
  isDirty: boolean;
  syncStatus: SyncStatusType;
  isCloudSynced: boolean;
  savedContent: string; // Last saved content for diff
  isWelcome?: boolean; // Flag for welcome tab
}

export interface RecentFile {
  id: string;
  title: string;
  path?: string; // For local files (desktop)
  documentId?: string; // For cloud files
  isCloud: boolean;
  lastOpened: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ConfirmationState {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface Settings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSync: boolean;
  syncInterval: number;
}

export interface AppState {
  // Auth
  apiToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  
  // UI State
  theme: string;
  showSidebar: boolean;
  showCommandPalette: boolean;
  showSettings: boolean;
  showAuth: boolean;
  showPreview: boolean;
  showExport: boolean;
  showImportDocx: boolean;
  showExportDocx: boolean;
  showExportPdf: boolean;
  showGoogleImport: boolean;
  showGoogleExport: boolean;
  showAbout: boolean;
  showShortcuts: boolean;
  showSearch: boolean;
  zenMode: boolean;
  sidebarWidth: number;
  splitMode: 'none' | 'horizontal' | 'vertical';
  
  // Documents
  tabs: Tab[];
  activeTabId: string | null;
  cloudDocuments: Document[];
  recentFiles: RecentFile[];
  
  // Sync
  isOnline: boolean;
  conflict: ConflictInfo | null;
  
  // Confirmation
  confirmation: ConfirmationState | null;
  
  // Notifications
  toasts: Toast[];
  
  // Settings
  settings: Settings;
  
  // Actions
  initializeApp: () => Promise<void>;
  setTheme: (theme: string) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  setShowCommandPalette: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowAuth: (show: boolean) => void;
  setShowExport: (show: boolean) => void;
  setShowImportDocx: (show: boolean) => void;
  setShowExportDocx: (show: boolean) => void;
  setShowExportPdf: (show: boolean) => void;
  setShowGoogleImport: (show: boolean) => void;
  setShowGoogleExport: (show: boolean) => void;
  setShowAbout: (show: boolean) => void;
  setShowShortcuts: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
  setConfirmation: (confirmation: ConfirmationState | null) => void;
  clearConfirmation: () => void;
  toggleZenMode: () => void;
  setSidebarWidth: (width: number) => void;
  setSplitMode: (mode: 'none' | 'horizontal' | 'vertical') => void;
  
  // Clipboard actions
  copyForWordDocs: () => Promise<void>;
  pasteFromWordDocs: () => Promise<void>;
  
  // Import actions
  importDocxFile: (file: File) => Promise<void>;
  
  // Tab actions
  openTab: (doc: Partial<Document> & { id?: string; title: string; content: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  updateTabLanguage: (tabId: string, language: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  
  // Document actions
  createNewDocument: () => void;
  saveCurrentDocument: () => Promise<void>;
  saveDocumentToCloud: (tabId: string) => Promise<void>;
  loadCloudDocuments: () => Promise<void>;
  openCloudDocument: (documentId: string) => Promise<void>;
  deleteCloudDocument: (documentId: string) => Promise<void>;
  
  // Auth actions
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  generateToken: (email?: string) => Promise<string | null>;
  
  // Sync actions
  setOnline: (online: boolean) => void;
  setConflict: (conflict: ConflictInfo | null) => void;
  resolveConflict: (resolution: 'keep_local' | 'keep_remote' | 'merge', mergedContent?: string) => Promise<void>;
  syncDocument: (tabId: string) => Promise<void>;
  
  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

