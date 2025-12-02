import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Document, SyncStatusType, ConflictInfo } from '@md-edit/shared';
import { api } from '../services/api';
import { syncService } from '../services/sync';
import { copyAsRichText, pasteAsMarkdown } from '../services/clipboard';
import { importDocx } from '../services/docx';

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

interface AppState {
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
  previewWidth: number;
  splitMode: 'none' | 'horizontal' | 'vertical';
  
  // Documents
  tabs: Tab[];
  activeTabId: string | null;
  cloudDocuments: Document[];
  recentFiles: RecentFile[];
  
  // Sync
  isOnline: boolean;
  conflict: ConflictInfo | null;
  
  // Notifications
  toasts: Toast[];
  
  // Settings
  settings: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
    autoSync: boolean;
    syncInterval: number;
  };
  
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
  toggleZenMode: () => void;
  setSidebarWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
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
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const DEFAULT_SETTINGS = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  autoSync: true,
  syncInterval: 2000,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiToken: null,
      userId: null,
      isAuthenticated: false,
      
      theme: 'dark',
      showSidebar: true,
      showCommandPalette: false,
      showSettings: false,
      showAuth: false,
      showPreview: false,
      showExport: false,
      showImportDocx: false,
      showExportDocx: false,
      showExportPdf: false,
      showGoogleImport: false,
      showGoogleExport: false,
      showAbout: false,
      showShortcuts: false,
      showSearch: false,
      zenMode: false,
      sidebarWidth: 260,
      previewWidth: 400,
      splitMode: 'none',
      
      tabs: [],
      activeTabId: null,
      cloudDocuments: [],
      recentFiles: [],
      
      isOnline: true,
      conflict: null,
      
      toasts: [],
      
      settings: DEFAULT_SETTINGS,

      // Initialize app
      initializeApp: async () => {
        const { apiToken } = get();
        
        // Check online status
        set({ isOnline: navigator.onLine });
        window.addEventListener('online', () => get().setOnline(true));
        window.addEventListener('offline', () => get().setOnline(false));
        
        if (apiToken) {
          const valid = await api.validateToken(apiToken);
          if (valid) {
            set({ isAuthenticated: true });
            api.setToken(apiToken);
            syncService.connect(apiToken);
            await get().loadCloudDocuments();
          } else {
            set({ apiToken: null, isAuthenticated: false });
          }
        }
        
        // Create a welcome tab if no tabs
        if (get().tabs.length === 0) {
          get().createNewDocument();
        }
      },

      // UI Actions
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
      setShowCommandPalette: (show) => set({ showCommandPalette: show }),
      setShowSettings: (show) => set({ showSettings: show }),
      setShowAuth: (show) => set({ showAuth: show }),
      setShowExport: (show) => set({ showExport: show }),
      setShowImportDocx: (show) => set({ showImportDocx: show }),
      setShowExportDocx: (show) => set({ showExportDocx: show }),
      setShowExportPdf: (show) => set({ showExportPdf: show }),
      setShowGoogleImport: (show) => set({ showGoogleImport: show }),
      setShowGoogleExport: (show) => set({ showGoogleExport: show }),
      setShowAbout: (show) => set({ showAbout: show }),
      setShowShortcuts: (show) => set({ showShortcuts: show }),
      setShowSearch: (show) => set({ showSearch: show }),
      toggleZenMode: () => set((state) => ({ 
        zenMode: !state.zenMode,
        showSidebar: state.zenMode ? true : false, // Show sidebar when exiting zen
      })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setPreviewWidth: (width) => set({ previewWidth: width }),
      setSplitMode: (mode) => set({ splitMode: mode }),
      
      // Clipboard actions
      copyForWordDocs: async () => {
        const { tabs, activeTabId, addToast } = get();
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (!activeTab) return;
        
        try {
          await copyAsRichText(activeTab.content);
          addToast({ type: 'success', message: 'Copied for Word/Docs' });
        } catch (error) {
          addToast({ type: 'error', message: 'Failed to copy' });
        }
      },
      
      pasteFromWordDocs: async () => {
        const { tabs, activeTabId, addToast, updateTabContent } = get();
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (!activeTab || !activeTabId) return;
        
        try {
          const markdown = await pasteAsMarkdown();
          if (markdown) {
            // Insert at cursor position or append
            const editor = (window as any).monacoEditor;
            if (editor) {
              const selection = editor.getSelection();
              const range = selection ? {
                startLineNumber: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLineNumber: selection.endLineNumber,
                endColumn: selection.endColumn,
              } : null;
              
              if (range) {
                editor.executeEdits('paste', [{
                  range,
                  text: markdown,
                }]);
              } else {
                // Append to content
                updateTabContent(activeTabId, activeTab.content + '\n' + markdown);
              }
            } else {
              updateTabContent(activeTabId, activeTab.content + '\n' + markdown);
            }
            addToast({ type: 'success', message: 'Pasted from Word/Docs' });
          }
        } catch (error) {
          addToast({ type: 'error', message: 'Failed to paste' });
        }
      },
      
      // Import actions
      importDocxFile: async (file: File) => {
        const { openTab, addToast } = get();
        try {
          const markdown = await importDocx(file);
          const title = file.name.replace(/\.docx$/i, '.md');
          openTab({
            title,
            content: markdown,
            language: 'markdown',
          });
        } catch (error) {
          addToast({ type: 'error', message: 'Failed to import document' });
          throw error;
        }
      },

      // Tab Actions
      openTab: (doc) => {
        const existingTab = get().tabs.find(
          (t) => t.documentId === doc.id || (doc.id && t.id === doc.id)
        );
        
        if (existingTab) {
          set({ activeTabId: existingTab.id });
          return;
        }
        
        const tabId = generateId();
        const newTab: Tab = {
          id: tabId,
          documentId: doc.id || null,
          title: doc.title || 'Untitled',
          content: doc.content || '',
          language: doc.language || 'markdown',
          isDirty: false,
          syncStatus: doc.id ? 'synced' : 'local',
          isCloudSynced: !!doc.id,
          savedContent: doc.content || '',
        };
        
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: tabId,
        }));
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex((t) => t.id === tabId);
        const tab = tabs[tabIndex];
        
        if (tab?.isDirty) {
          // TODO: Show save confirmation dialog
          const confirmed = window.confirm('You have unsaved changes. Close anyway?');
          if (!confirmed) return;
        }
        
        const newTabs = tabs.filter((t) => t.id !== tabId);
        let newActiveTabId = activeTabId;
        
        if (activeTabId === tabId) {
          if (newTabs.length > 0) {
            // Select the tab to the left, or the first tab
            const newIndex = Math.max(0, tabIndex - 1);
            newActiveTabId = newTabs[newIndex]?.id || null;
          } else {
            newActiveTabId = null;
          }
        }
        
        set({ tabs: newTabs, activeTabId: newActiveTabId });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      updateTabContent: (tabId, content) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, content, isDirty: content !== tab.savedContent }
              : tab
          ),
        }));
        
        // Trigger auto-sync if enabled
        const { settings, isAuthenticated } = get();
        const tab = get().tabs.find((t) => t.id === tabId);
        if (settings.autoSync && isAuthenticated && tab?.isCloudSynced && tab.documentId) {
          get().syncDocument(tabId);
        }
      },

      updateTabLanguage: (tabId, language) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, language } : tab
          ),
        }));
      },

      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const newTabs = [...state.tabs];
          const [removed] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, removed);
          return { tabs: newTabs };
        });
      },

      // Document Actions
      createNewDocument: () => {
        const tabId = generateId();
        const newTab: Tab = {
          id: tabId,
          documentId: null,
          title: 'Untitled.md',
          content: '# New Document\n\nStart writing here...\n',
          language: 'markdown',
          isDirty: true,
          syncStatus: 'local',
          isCloudSynced: false,
          savedContent: '',
        };
        
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: tabId,
        }));
      },

      saveCurrentDocument: async () => {
        const { activeTabId, tabs, isAuthenticated } = get();
        if (!activeTabId) return;
        
        const tab = tabs.find((t) => t.id === activeTabId);
        if (!tab) return;
        
        if (tab.isCloudSynced && isAuthenticated) {
          await get().saveDocumentToCloud(activeTabId);
        } else {
          // Just mark as saved locally
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === activeTabId
                ? { ...t, isDirty: false, savedContent: t.content }
                : t
            ),
          }));
          get().addToast({ type: 'success', message: 'Document saved locally' });
        }
      },

      saveDocumentToCloud: async (tabId) => {
        const { tabs, isAuthenticated } = get();
        const tab = tabs.find((t) => t.id === tabId);
        
        if (!tab || !isAuthenticated) return;
        
        try {
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === tabId ? { ...t, syncStatus: 'syncing' } : t
            ),
          }));
          
          let doc: Document;
          if (tab.documentId) {
            // Update existing document
            doc = await api.updateDocument(tab.documentId, {
              title: tab.title,
              content: tab.content,
              language: tab.language,
            });
          } else {
            // Create new document
            doc = await api.createDocument({
              title: tab.title,
              content: tab.content,
              language: tab.language,
            });
          }
          
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    documentId: doc.id,
                    isDirty: false,
                    syncStatus: 'synced',
                    isCloudSynced: true,
                    savedContent: tab.content,
                  }
                : t
            ),
          }));
          
          await get().loadCloudDocuments();
          get().addToast({ type: 'success', message: 'Saved to cloud' });
        } catch (error) {
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === tabId ? { ...t, syncStatus: 'pending' } : t
            ),
          }));
          get().addToast({ type: 'error', message: 'Failed to save to cloud' });
        }
      },

      loadCloudDocuments: async () => {
        try {
          const docs = await api.getDocuments();
          set({ cloudDocuments: docs });
        } catch (error) {
          console.error('Failed to load cloud documents:', error);
        }
      },

      openCloudDocument: async (documentId) => {
        // Check if already open
        const existingTab = get().tabs.find((t) => t.documentId === documentId);
        if (existingTab) {
          set({ activeTabId: existingTab.id });
          return;
        }
        
        try {
          const doc = await api.getDocument(documentId);
          get().openTab({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            language: doc.language,
          });
          
          // Subscribe to updates
          syncService.subscribeToDocument(documentId);
        } catch (error) {
          get().addToast({ type: 'error', message: 'Failed to open document' });
        }
      },

      deleteCloudDocument: async (documentId) => {
        try {
          await api.deleteDocument(documentId);
          
          // Close any open tabs for this document
          const tab = get().tabs.find((t) => t.documentId === documentId);
          if (tab) {
            get().closeTab(tab.id);
          }
          
          await get().loadCloudDocuments();
          get().addToast({ type: 'success', message: 'Document deleted' });
        } catch (error) {
          get().addToast({ type: 'error', message: 'Failed to delete document' });
        }
      },

      // Auth Actions
      login: async (token) => {
        const valid = await api.validateToken(token);
        if (valid) {
          api.setToken(token);
          set({ apiToken: token, isAuthenticated: true, showAuth: false });
          syncService.connect(token);
          await get().loadCloudDocuments();
          get().addToast({ type: 'success', message: 'Logged in successfully' });
          return true;
        }
        get().addToast({ type: 'error', message: 'Invalid API token' });
        return false;
      },

      logout: () => {
        api.setToken(null);
        syncService.disconnect();
        set({
          apiToken: null,
          userId: null,
          isAuthenticated: false,
          cloudDocuments: [],
        });
        get().addToast({ type: 'info', message: 'Logged out' });
      },

      generateToken: async (email) => {
        try {
          const result = await api.generateToken(email);
          get().addToast({
            type: 'success',
            message: 'Token generated! Save it securely.',
          });
          return result.apiToken;
        } catch (error) {
          get().addToast({ type: 'error', message: 'Failed to generate token' });
          return null;
        }
      },

      // Sync Actions
      setOnline: (online) => {
        set({ isOnline: online });
        if (online) {
          get().addToast({ type: 'info', message: 'Back online' });
          // Sync pending changes
          get().tabs.forEach((tab) => {
            if (tab.isDirty && tab.isCloudSynced) {
              get().syncDocument(tab.id);
            }
          });
        } else {
          get().addToast({ type: 'warning', message: 'You are offline' });
        }
      },

      setConflict: (conflict) => set({ conflict }),

      resolveConflict: async (resolution, mergedContent) => {
        const { conflict, tabs } = get();
        if (!conflict) return;
        
        const tab = tabs.find((t) => t.documentId === conflict.documentId);
        if (!tab) return;
        
        let content: string;
        switch (resolution) {
          case 'keep_local':
            content = conflict.localContent;
            break;
          case 'keep_remote':
            content = conflict.remoteContent;
            break;
          case 'merge':
            content = mergedContent || conflict.localContent;
            break;
        }
        
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tab.id ? { ...t, content, isDirty: true } : t
          ),
          conflict: null,
        }));
        
        await get().saveDocumentToCloud(tab.id);
      },

      syncDocument: async (tabId) => {
        const { tabs, isOnline, isAuthenticated } = get();
        const tab = tabs.find((t) => t.id === tabId);
        
        if (!tab || !tab.documentId || !isOnline || !isAuthenticated) return;
        
        // Debounce sync
        // This is a simplified version - real implementation would use proper debouncing
        try {
          await api.syncDocument(tab.documentId, tab.content);
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === tabId
                ? { ...t, syncStatus: 'synced', savedContent: t.content }
                : t
            ),
          }));
        } catch (error: any) {
          if (error.conflict) {
            set({
              conflict: {
                documentId: tab.documentId,
                localContent: tab.content,
                remoteContent: error.conflict.serverContent,
                localTimestamp: Date.now(),
                remoteTimestamp: error.conflict.serverTimestamp,
              },
            });
          } else {
            set((state) => ({
              tabs: state.tabs.map((t) =>
                t.id === tabId ? { ...t, syncStatus: 'pending' } : t
              ),
            }));
          }
        }
      },

      // Settings Actions
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Toast Actions
      addToast: (toast) => {
        const id = generateId();
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
          get().removeToast(id);
        }, 4000);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: 'md-edit-storage',
      partialize: (state) => ({
        apiToken: state.apiToken,
        theme: state.theme,
        settings: state.settings,
        sidebarWidth: state.sidebarWidth,
        previewWidth: state.previewWidth,
        recentFiles: state.recentFiles.slice(0, 10), // Keep only last 10
      }),
    }
  )
);

