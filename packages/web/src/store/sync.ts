import { StateCreator } from 'zustand';
import { ConflictInfo, debounce } from '@md-crafter/shared';
import { AppState } from './types';
import { SyncError } from '../types/sync';
import { api } from '../services/api';

// Debounced sync functions per document ID (module-level, outside slice)
const syncDebouncers = new Map<string, ReturnType<typeof debounce>>();

export interface SyncSlice {
  isOnline: boolean;
  conflict: ConflictInfo | null;
  
  // Sync actions
  setOnline: (online: boolean) => void;
  setConflict: (conflict: ConflictInfo | null) => void;
  resolveConflict: (resolution: 'keep_local' | 'keep_remote' | 'merge', mergedContent?: string) => Promise<void>;
  syncDocument: (tabId: string) => Promise<void>;
  cleanupSyncDebouncer: (documentId: string) => void;
}

/**
 * Creates the sync slice for managing document synchronization state and operations
 * 
 * Handles online/offline status, conflict resolution, and debounced document syncing.
 * Uses a module-level Map to store debounced sync functions per document ID to prevent
 * excessive API calls during rapid content changes.
 * 
 * @param set - Zustand state setter function
 * @param get - Zustand state getter function
 * @returns SyncSlice with sync state and actions
 */
export const createSyncSlice: StateCreator<AppState, [], [], SyncSlice> = (set, get) => {
  return {
  isOnline: true,
  conflict: null,
  
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
  
  /**
   * Resolves a document conflict by applying the chosen resolution strategy
   * 
   * Updates the tab content based on the resolution:
   * - 'keep_local': Uses local content
   * - 'keep_remote': Uses remote content
   * - 'merge': Uses provided merged content or falls back to local
   * 
   * After resolving, automatically saves the resolved content to the cloud.
   * 
   * @param resolution - The conflict resolution strategy
   * @param mergedContent - Optional merged content for 'merge' resolution
   * @returns Promise that resolves when conflict is resolved and saved
   */
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
    
    // Reset cursor/selection since conflict resolution may change content structure
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tab.id ? { 
          ...t, 
          content, 
          isDirty: true,
          cursor: { line: 1, column: 1 },
          selection: null,
        } : t
      ),
      conflict: null,
    }));
    
    await get().saveDocumentToCloud(tab.id);
  },
  
  /**
   * Syncs a document to the cloud with debouncing to prevent excessive API calls
   * 
   * Creates or reuses a debounced sync function for each document ID. The debounce
   * delay is controlled by the user's syncInterval setting. This ensures that rapid
   * content changes (e.g., typing) don't trigger multiple sync operations.
   * 
   * Handles sync conflicts by setting conflict state when the server detects concurrent
   * edits. On successful sync, updates the tab's sync status and saved content.
   * 
   * @param tabId - The ID of the tab to sync
   * @returns Promise that resolves when sync is initiated (debounced)
   */
  syncDocument: async (tabId) => {
    const { tabs, isOnline, isAuthenticated } = get();
    const tab = tabs.find((t) => t.id === tabId);
    
    if (!tab || !tab.documentId || !isOnline || !isAuthenticated) return;
    
    // Get or create debounced sync function for this document
    if (!syncDebouncers.has(tab.documentId)) {
      syncDebouncers.set(
        tab.documentId,
        debounce(async (documentId: string, content: string, currentTabId: string) => {
          try {
            await api.syncDocument(documentId, content);
            set((state) => ({
              tabs: state.tabs.map((t) =>
                t.id === currentTabId
                  ? { ...t, syncStatus: 'synced', savedContent: t.content, hasSavedVersion: true }
                  : t
              ),
            }));
          } catch (error: unknown) {
            const syncError = error as SyncError;
            if (syncError.conflict) {
              const currentTab = get().tabs.find((t) => t.id === currentTabId);
              if (currentTab) {
                set({
                  conflict: {
                    documentId: currentTab.documentId!,
                    localContent: currentTab.content,
                    remoteContent: syncError.conflict.serverContent,
                    localTimestamp: Date.now(),
                    remoteTimestamp: syncError.conflict.serverTimestamp,
                  },
                });
              }
            } else {
              set((state) => ({
                tabs: state.tabs.map((t) =>
                  t.id === currentTabId ? { ...t, syncStatus: 'pending' } : t
                ),
              }));
            }
          }
        }, get().settings.syncInterval)
      );
    }
    
    const debouncedSync = syncDebouncers.get(tab.documentId)!;
    debouncedSync(tab.documentId, tab.content, tabId);
  },
  
  /**
   * Cleans up the debouncer for a document when it's deleted
   * 
   * Removes the debounced sync function from memory to prevent memory leaks.
   * Should be called when a document is deleted or no longer needs syncing.
   * 
   * @param documentId - The ID of the document whose debouncer should be cleaned up
   */
  cleanupSyncDebouncer: (documentId) => {
    syncDebouncers.delete(documentId);
  },
  };
};

