import { StateCreator } from 'zustand';
import { Document } from '@md-crafter/shared';
import { logger } from '@md-crafter/shared';
import { Tab, RecentFile, AppState } from './types';
import { generateId } from './utils';
import { api } from '../services/api';
import { syncService } from '../services/sync';
import { MAX_RECENT_FILES } from '../constants';
import { isElectron } from '../utils/platform';

export interface DocumentsSlice {
  cloudDocuments: Document[];
  recentFiles: RecentFile[];

  // Document actions
  createNewDocument: () => void;
  saveCurrentDocument: () => Promise<void>;
  saveDocumentToCloud: (tabId: string) => Promise<void>;
  loadCloudDocuments: () => Promise<void>;
  openCloudDocument: (documentId: string) => Promise<void>;
  deleteCloudDocument: (documentId: string) => Promise<void>;
  addRecentFile: (file: Omit<RecentFile, 'lastOpened'>) => void;
  removeRecentFile: (fileId: string) => void;
}

/**
 * Creates the documents slice for managing cloud documents and recent files
 * 
 * Handles CRUD operations for cloud-synced documents, including creating new documents,
 * saving to cloud, loading document lists, opening documents, and deleting documents.
 * Also manages recent files tracking for quick access.
 * 
 * @param set - Zustand state setter function
 * @param get - Zustand state getter function
 * @returns DocumentsSlice with document state and actions
 */
export const createDocumentsSlice: StateCreator<AppState, [], [], DocumentsSlice> = (set, get) => {
  return {
    cloudDocuments: [],
    recentFiles: [],

    createNewDocument: () => {
      const tabId = generateId();
      const newTab: Tab = {
        id: tabId,
        documentId: null,
        title: 'Untitled.md',
        content: '',
        language: 'markdown',
        isDirty: false,
        syncStatus: 'local',
        isCloudSynced: false,
        savedContent: '',
        hasSavedVersion: false,
        showPreview: false,
        splitMode: 'none',
        diffMode: { enabled: false, compareWithSaved: false, viewMode: 'side-by-side' },
        splitSecondaryTabId: null,
        splitPaneRatio: undefined,
        previewPaneRatio: undefined,
        diffPaneRatio: undefined,
        undoStack: [],
        redoStack: [],
        cursor: null,
        selection: null,
      };

      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: tabId,
        // Reset UI to clean state for new tab
        splitMode: 'none',
        diffMode: { enabled: false, compareWithSaved: false, viewMode: 'side-by-side' },
        showPreview: false,
      }));
    },

    saveCurrentDocument: async () => {
      const { activeTabId, tabs, isAuthenticated } = get();
      if (!activeTabId) return;

      const tab = tabs.find((t) => t.id === activeTabId);
      if (!tab) return;

      // In Electron, if tab has a path, save to that path
      if (isElectron() && typeof window !== 'undefined' && window.api?.writeFile && tab.path) {
        const result = await window.api.writeFile(tab.path, tab.content);
        if (result.success) {
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === activeTabId
                ? { ...t, isDirty: false, savedContent: t.content }
                : t
            ),
          }));
          get().addToast({ type: 'success', message: 'File saved successfully' });
          return;
        } else {
          get().addToast({ type: 'error', message: `Failed to save: ${result.error}` });
          return;
        }
      }

      // Cloud save or local mark-as-saved (existing logic)
      if (tab.isCloudSynced && isAuthenticated) {
        await get().saveDocumentToCloud(activeTabId);
      } else {
        // Just mark as saved locally
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === activeTabId
              ? { ...t, isDirty: false, savedContent: t.content, hasSavedVersion: true }
              : t
          ),
        }));
        get().addToast({ type: 'success', message: 'Document saved locally' });
      }
    },

    /**
     * Saves a document tab to the cloud storage
     * 
     * Creates a new cloud document if the tab doesn't have a documentId, or updates
     * an existing document if it's already synced. Updates the tab's sync status
     * throughout the operation and refreshes the cloud documents list on success.
     * 
     * @param tabId - The ID of the tab to save
     * @returns Promise that resolves when save operation completes
     */
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
                hasSavedVersion: true,
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
        logger.error('Failed to load cloud documents', error);
        get().addToast({ type: 'error', message: 'Failed to load cloud documents' });
      }
    },

    /**
     * Opens a cloud document in a new tab
     * 
     * Checks if the document is already open and switches to it if so. Otherwise,
     * fetches the document from the API, opens it in a new tab, and subscribes to
     * real-time updates via the sync service.
     * 
     * @param documentId - The ID of the cloud document to open
     * @returns Promise that resolves when document is opened
     */
    openCloudDocument: async (documentId) => {
      // Check if already open
      const existingTab = get().tabs.find((t) => t.documentId === documentId);
      if (existingTab) {
        set({ activeTabId: existingTab.id });
        // Add to recent files
        get().addRecentFile({
          id: documentId,
          title: existingTab.title,
          documentId: documentId,
          isCloud: true,
        });
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
        logger.error('Failed to open cloud document', error);
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

        // Clean up sync debouncer for deleted document
        get().cleanupSyncDebouncer(documentId);

        get().addToast({ type: 'success', message: 'Document deleted' });
      } catch (error) {
        logger.error('Failed to delete cloud document', error);
        get().addToast({ type: 'error', message: 'Failed to delete document' });
      }
    },

    /**
     * Adds a file to the recent files list
     * 
     * Removes any existing entry for the same file (by id, documentId, or path),
     * adds the new entry with current timestamp, sorts by lastOpened (newest first),
     * and limits to MAX_RECENT_FILES.
     * 
     * @param file - The file to add (without lastOpened timestamp)
     */
    addRecentFile: (file) => {
      const { recentFiles } = get();
      const now = Date.now();

      // Remove existing entry if present (by id, documentId, or path)
      const filtered = recentFiles.filter(
        f => f.id !== file.id &&
          (file.documentId ? f.documentId !== file.documentId : true) &&
          (file.path ? f.path !== file.path : true)
      );

      // Add new entry with current timestamp
      const newRecentFile: RecentFile = {
        ...file,
        lastOpened: now,
      };

      // Sort by lastOpened (newest first) and limit to MAX_RECENT_FILES
      const updated = [newRecentFile, ...filtered]
        .sort((a, b) => b.lastOpened - a.lastOpened)
        .slice(0, MAX_RECENT_FILES);

      set({ recentFiles: updated });
    },

    /**
     * Removes a file from the recent files list
     * 
     * @param fileId - The ID of the file to remove
     */
    removeRecentFile: (fileId) => {
      const { recentFiles } = get();
      const filtered = recentFiles.filter(f => f.id !== fileId);
      set({ recentFiles: filtered });
    },
  };
};
