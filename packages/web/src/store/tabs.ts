import { StateCreator } from 'zustand';
import { Document } from '@md-crafter/shared';
import { Tab, AppState } from './types';
import { generateId } from './utils';
import { isElectron } from '../utils/platform';

export interface TabsSlice {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Tab actions
  openTab: (doc: Partial<Document> & { id?: string; title: string; content: string; path?: string }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string, options?: { skipHistory?: boolean; resetCursor?: boolean }) => void;
  updateTabLanguage: (tabId: string, language: string) => void;
  updateTabPath: (tabId: string, path: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  undoTab: (tabId: string, editor?: import('monaco-editor').editor.IStandaloneCodeEditor | null) => void;
  redoTab: (tabId: string, editor?: import('monaco-editor').editor.IStandaloneCodeEditor | null) => void;
  setTabPreviewRatio: (tabId: string, ratio: number) => void;
  setTabSplitState: (tabId: string, options: { secondaryTabId?: string | null; ratio?: number }) => void;
  setTabCursor: (tabId: string, cursor: { line: number; column: number } | null) => void;
  setTabDiffPaneRatio: (tabId: string, ratio: number) => void;
  setTabSelection: (tabId: string, selection: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;
  setTabHistory: (tabId: string, undoStack: string[], redoStack: string[]) => void;
  markTabSaved: (tabId: string) => void;
  revertToSaved: (tabId: string) => void;
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
    // Check if file is already open by documentId, id, or path
    const existingTab = get().tabs.find(
      (t) => t.documentId === doc.id || (doc.id && t.id === doc.id) || (doc.path && t.path === doc.path)
    );
    
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      // Still add to recent files even if tab already exists
      if (doc.id) {
        // Cloud document
        get().addRecentFile({
          id: doc.id,
          title: doc.title || 'Untitled',
          documentId: doc.id,
          isCloud: true,
        });
      } else {
        // Local file
        get().addRecentFile({
          id: existingTab.id,
          title: doc.title || 'Untitled',
          path: doc.path,
          isCloud: false,
        });
      }
      return;
    }
    
    const tabId = generateId();
    const newTab: Tab = {
      id: tabId,
      documentId: doc.id || null,
      title: doc.title || 'Untitled',
      content: doc.content || '',
      showPreview: false,
      language: doc.language || 'markdown',
      isDirty: false,
      syncStatus: doc.id ? 'synced' : 'local',
      isCloudSynced: !!doc.id,
      savedContent: doc.content || '',
      hasSavedVersion: !!doc.id || !!doc.path,
      path: doc.path,
      undoStack: [],
      redoStack: [],
      splitMode: 'none',
      diffMode: { enabled: false, compareWithSaved: false },
      splitSecondaryTabId: null,
      splitPaneRatio: undefined,
      previewPaneRatio: undefined,
      diffPaneRatio: undefined,
      cursor: null,
    };
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: tabId,
      // Reset view state to the new tab's defaults (prevents inheriting previous tab UI)
      splitMode: newTab.splitMode,
      diffMode: newTab.diffMode,
      showPreview: false,
    }));
    
    // Add to recent files
    if (doc.id) {
      // Cloud document
      get().addRecentFile({
        id: doc.id,
        title: doc.title || 'Untitled',
        documentId: doc.id,
        isCloud: true,
      });
    } else {
      // Local file
      get().addRecentFile({
        id: tabId,
        title: doc.title || 'Untitled',
        path: doc.path,
        isCloud: false,
      });
    }
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
    const { tabs, activeTabId, setConfirmation, diffMode, exitDiffMode } = get();
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const tab = tabs[tabIndex];
    
    // Check if this tab is involved in diff mode
    const isInDiffMode = diffMode.enabled && (
      diffMode.leftTabId === tabId ||
      diffMode.rightTabId === tabId ||
      (diffMode.compareWithSaved && activeTabId === tabId)
    );
    
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
          
          // Exit diff mode if this tab was involved
          if (isInDiffMode) {
            exitDiffMode();
          }
          
          // Stop watching file in Electron to prevent leaks
          if (isElectron() && tab.path && window.api?.unwatchFile) {
            window.api.unwatchFile(tab.path);
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
    
    // Exit diff mode if this tab was involved
    if (isInDiffMode) {
      exitDiffMode();
    }
    
    // Stop watching file in Electron to prevent leaks
    if (isElectron() && tab?.path && window.api?.unwatchFile) {
      window.api.unwatchFile(tab.path);
    }
    
    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },
  
  setActiveTab: (tabId) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      return {
        activeTabId: tabId,
        splitMode: tab?.splitMode ?? 'none',
        diffMode: tab?.diffMode ?? { enabled: false, compareWithSaved: false },
        showPreview: tab?.showPreview ?? false,
      };
    });
  },
  
  updateTabContent: (tabId, content, options) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { 
              ...tab, 
              content, 
              isDirty: content !== tab.savedContent,
              undoStack: options?.skipHistory
                ? tab.undoStack || []
                : content === tab.content
                  ? tab.undoStack || []
                  : [...(tab.undoStack || []), tab.content].slice(-50),
              redoStack: options?.skipHistory || content === tab.content ? tab.redoStack || [] : [],
              // Reset cursor/selection when content changes externally (diff view, revert, etc.)
              ...(options?.resetCursor ? { 
                cursor: { line: 1, column: 1 }, 
                selection: null 
              } : {}),
            }
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
  
  updateTabPath: (tabId, path) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, path } : tab
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
  
  setTabPreviewRatio: (tabId, ratio) => {
    set((state) => ({
      tabs: state.tabs.map((t) => t.id === tabId ? { ...t, previewPaneRatio: ratio } : t),
      showPreview: state.activeTabId === tabId ? state.showPreview : state.showPreview,
    }));
  },

  setTabSplitState: (tabId, options) => {
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          splitSecondaryTabId: options.secondaryTabId !== undefined ? options.secondaryTabId : t.splitSecondaryTabId,
          splitPaneRatio: options.ratio !== undefined ? options.ratio : t.splitPaneRatio,
        };
      }),
    }));
  },

  setTabCursor: (tabId, cursor) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return state;
      const prev = tab.cursor ?? null;
      const next = cursor ?? null;
      const unchanged =
        (!!prev || !!next) &&
        prev?.line === next?.line &&
        prev?.column === next?.column;
      if (!prev && !next) return state;
      if (unchanged) return state;
      return {
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, cursor: next } : t)),
      };
    });
  },

  setTabDiffPaneRatio: (tabId, ratio) => {
    set((state) => ({
      tabs: state.tabs.map((t) => t.id === tabId ? { ...t, diffPaneRatio: ratio } : t),
    }));
  },

  setTabSelection: (tabId, selection) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return state;
      const prev = tab.selection ?? null;
      const next = selection ?? null;
      const unchanged =
        (!!prev || !!next) &&
        prev?.startLine === next?.startLine &&
        prev?.startColumn === next?.startColumn &&
        prev?.endLine === next?.endLine &&
        prev?.endColumn === next?.endColumn;
      if (!prev && !next) return state;
      if (unchanged) return state;
      return {
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, selection: next } : t)),
      };
    });
  },

  setTabHistory: (tabId, undoStack, redoStack) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return state;
      const sameUndo =
        tab.undoStack?.length === undoStack.length &&
        tab.undoStack?.every((val, idx) => val === undoStack[idx]);
      const sameRedo =
        tab.redoStack?.length === redoStack.length &&
        tab.redoStack?.every((val, idx) => val === redoStack[idx]);
      if (sameUndo && sameRedo) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, undoStack: [...undoStack], redoStack: [...redoStack] } : t
        ),
      };
    });
  },

  markTabSaved: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => t.id === tabId ? { ...t, hasSavedVersion: true } : t),
    }));
  },

  revertToSaved: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab || !tab.hasSavedVersion || !tab.isDirty) return;
    
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              content: t.savedContent,
              isDirty: false,
              undoStack: [],
              redoStack: [],
              cursor: { line: 1, column: 1 },
              selection: null,
            }
          : t
      ),
    }));
    
    get().addToast({ type: 'info', message: 'Reverted to last saved version' });
  },

  // undoTab/redoTab are no longer used for in-session undo; kept for compatibility
  undoTab: () => {},
  redoTab: () => {},
});
