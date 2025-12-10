import { StateCreator } from 'zustand';
import { Document } from '@md-crafter/shared';
import { Tab, AppState } from './types';
import { generateId } from './utils';

export interface TabsSlice {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Tab actions
  openTab: (doc: Partial<Document> & { id?: string; title: string; content: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  updateTabLanguage: (tabId: string, language: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

/**
 * Creates the tabs slice for managing document tabs and their state
 * 
 * Handles opening, closing, and managing multiple document tabs. Includes logic
 * for preventing accidental loss of unsaved changes through confirmation modals.
 * 
 * @param set - Zustand state setter function
 * @param get - Zustand state getter function
 * @returns TabsSlice with tab state and actions
 */
export const createTabsSlice: StateCreator<AppState, [], [], TabsSlice> = (set, get) => ({
  tabs: [],
  activeTabId: null,
  
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
  
  /**
   * Closes a tab, with confirmation if there are unsaved changes
   * 
   * If the tab has unsaved changes (isDirty), shows a confirmation modal asking
   * the user to confirm before closing. If confirmed or no changes, closes the tab
   * and automatically selects the tab to the left (or first tab if closing the leftmost).
   * 
   * @param tabId - The ID of the tab to close
   */
  closeTab: (tabId) => {
    const { tabs, activeTabId, setConfirmation } = get();
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const tab = tabs[tabIndex];
    
    if (tab?.isDirty && setConfirmation) {
      // Show confirmation modal
      setConfirmation({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Close anyway?',
        variant: 'warning',
        onConfirm: () => {
          const { tabs: currentTabs, activeTabId: currentActiveTabId } = get();
          const currentTabIndex = currentTabs.findIndex((t) => t.id === tabId);
          const newTabs = currentTabs.filter((t) => t.id !== tabId);
          let newActiveTabId = currentActiveTabId;
          
          if (currentActiveTabId === tabId) {
            if (newTabs.length > 0) {
              // Select the tab to the left, or the first tab
              const newIndex = Math.max(0, currentTabIndex - 1);
              newActiveTabId = newTabs[newIndex]?.id || null;
            } else {
              newActiveTabId = null;
            }
          }
          
          set({ tabs: newTabs, activeTabId: newActiveTabId });
          get().clearConfirmation();
        },
      });
      return;
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
    const { settings, isAuthenticated, syncDocument } = get();
    const tab = get().tabs.find((t) => t.id === tabId);
    if (settings.autoSync && isAuthenticated && tab?.isCloudSynced && tab.documentId && syncDocument) {
      syncDocument(tabId);
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
});

