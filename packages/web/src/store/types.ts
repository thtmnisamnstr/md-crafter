import { Document, SyncStatusType, ConflictInfo } from '@md-crafter/shared';

export interface Tab {
  id: string;
  documentId: string | null; // null for new unsaved documents
  title: string;
  content: string;
  showPreview?: boolean;
  language: string;
  isDirty: boolean;
  syncStatus: SyncStatusType;
  isCloudSynced: boolean;
  savedContent: string; // Last saved content for diff
  path?: string; // File path for local files (desktop)
  hasSavedVersion?: boolean; // True once the tab has been saved at least once
  undoStack?: string[]; // Persistent undo history
  redoStack?: string[]; // Persistent redo history
  splitMode?: 'none' | 'horizontal' | 'vertical' | 'diff';
  diffMode?: {
    enabled: boolean;
    leftTabId?: string;
    rightTabId?: string;
    compareWithSaved?: boolean;
    viewMode?: 'side-by-side' | 'over-under';
  };
  // Per-tab view/pane state
  splitSecondaryTabId?: string | null;
  splitPaneRatio?: number; // 0..1
  previewPaneRatio?: number; // 0..1
  diffPaneRatio?: number; // 0..1 for side-by-side; also reused for over-under height
  cursor?: { line: number; column: number } | null;
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null;
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
  spellCheck: boolean;
}

export interface AppState {
  // Hydration tracking
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;

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
  showAbout: boolean;
  showShortcuts: boolean;
  showSearch: boolean;
  zenMode: boolean;
  sidebarWidth: number;
  splitMode: 'none' | 'horizontal' | 'vertical' | 'diff';
  diffMode: {
    enabled: boolean;
    leftTabId?: string;
    rightTabId?: string;
    compareWithSaved?: boolean; // If true, compare activeTabId with its saved version
    viewMode?: 'side-by-side' | 'over-under';
  };

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
  setShowAbout: (show: boolean) => void;
  setShowShortcuts: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
  setConfirmation: (confirmation: ConfirmationState | null) => void;
  clearConfirmation: () => void;
  toggleZenMode: () => void;
  setSidebarWidth: (width: number) => void;
  setSplitMode: (mode: 'none' | 'horizontal' | 'vertical' | 'diff') => void;
  setDiffMode: (enabled: boolean, leftTabId?: string, rightTabId?: string, compareWithSaved?: boolean, viewMode?: 'side-by-side' | 'over-under') => void;
  exitDiffMode: () => void;
  setTabPreviewRatio: (tabId: string, ratio: number) => void;
  setTabSplitState: (tabId: string, options: { secondaryTabId?: string | null; ratio?: number }) => void;
  setTabCursor: (tabId: string, cursor: { line: number; column: number } | null) => void;
  setTabDiffPaneRatio: (tabId: string, ratio: number) => void;
  setTabSelection: (tabId: string, selection: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;
  setTabHistory: (tabId: string, undoStack: string[], redoStack: string[]) => void;
  grammarIssues: import('../types/textlint').TextlintMessage[];
  grammarIssueIndex: number;
  grammarIssueCount: number;
  grammarError: string | null;
  setGrammarIssues: (issues: import('../types/textlint').TextlintMessage[]) => void;
  setGrammarIssueIndex: (index: number) => void;
  setGrammarIssuesCount: (count: number) => void;
  setShowGrammarReview: (show: boolean) => void;
  setGrammarError: (error: string | null) => void;
  closeGrammarReview: () => void;
  showGrammarReview: boolean;
  showDictionaryModal: boolean;
  setShowDictionaryModal: (show: boolean) => void;

  // Clipboard actions
  copyForWordDocs: () => Promise<void>;
  pasteFromWordDocs: (editor?: import('monaco-editor').editor.IStandaloneCodeEditor) => Promise<void>;

  // Import actions
  importDocxFile: (file: File) => Promise<void>;

  // Tab actions
  openTab: (doc: Partial<Document> & { id?: string; title: string; content: string; path?: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string, options?: { skipHistory?: boolean; resetCursor?: boolean }) => void;
  updateTabLanguage: (tabId: string, language: string) => void;
  updateTabPath: (tabId: string, path: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  revertToSaved: (tabId: string) => void;

  // Document actions
  createNewDocument: () => void;
  saveCurrentDocument: () => Promise<void>;
  saveDocumentToCloud: (tabId: string) => Promise<void>;
  loadCloudDocuments: () => Promise<void>;
  openCloudDocument: (documentId: string) => Promise<void>;
  deleteCloudDocument: (documentId: string) => Promise<void>;
  addRecentFile: (file: Omit<RecentFile, 'lastOpened'>) => void;
  removeRecentFile: (fileId: string) => void;

  // Auth actions
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  generateToken: (email?: string) => Promise<string | null>;

  // Sync actions
  setOnline: (online: boolean) => void;
  setConflict: (conflict: ConflictInfo | null) => void;
  resolveConflict: (resolution: 'keep_local' | 'keep_remote' | 'merge', mergedContent?: string) => Promise<void>;
  syncDocument: (tabId: string) => Promise<void>;
  cleanupSyncDebouncer: (documentId: string) => void;

  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Format actions
  formatDocument: () => Promise<void>;

  // Grammar check actions
  checkGrammar: (options?: {
    editor?: import('monaco-editor').editor.IStandaloneCodeEditor;
    monaco?: typeof import('monaco-editor');
    grammarService?: import('../services/grammar').GrammarService;
  }) => Promise<void>;
}
