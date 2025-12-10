import { StateCreator } from 'zustand';
import { Document } from '@md-crafter/shared';
import { logger } from '@md-crafter/shared';
import { Tab, RecentFile, AppState } from './types';
import { generateId } from './utils';
import { api } from '../services/api';
import { syncService } from '../services/sync';

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
  };
};

