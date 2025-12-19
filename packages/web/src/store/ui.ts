import { StateCreator } from 'zustand';
import { ConfirmationState, AppState } from './types';
import type { TextlintMessage } from '../types/textlint';
import { DEFAULT_SIDEBAR_WIDTH } from '../constants';

export interface UISlice {
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
    compareWithSaved?: boolean;
    viewMode?: 'side-by-side' | 'over-under';
  };
  confirmation: ConfirmationState | null;
  grammarIssues: TextlintMessage[];
  grammarIssueIndex: number;
  showGrammarReview: boolean;
  grammarIssueCount: number;
  showDictionaryModal: boolean;
  
  // UI Actions
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
  setGrammarIssues: (issues: TextlintMessage[]) => void;
  setGrammarIssueIndex: (index: number) => void;
  closeGrammarReview: () => void;
  setGrammarIssuesCount: (count: number) => void;
  setShowGrammarReview: (show: boolean) => void;
  grammarError: string | null;
  setGrammarError: (error: string | null) => void;
  setShowDictionaryModal: (show: boolean) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  theme: 'dark',
  showSidebar: true,
  showCommandPalette: false,
  showSettings: false,
  showAuth: false,
  showPreview: false, // default for new tabs
  showExport: false,
  showImportDocx: false,
  showExportDocx: false,
  showExportPdf: false,
  showAbout: false,
  showShortcuts: false,
  showSearch: false,
  zenMode: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  splitMode: 'none',
  diffMode: {
    enabled: false,
    leftTabId: undefined,
    rightTabId: undefined,
    compareWithSaved: false,
    viewMode: 'side-by-side',
  },
  confirmation: null,
  grammarIssues: [],
  grammarIssueIndex: 0,
  showGrammarReview: false,
  grammarIssueCount: 0,
  grammarError: null,
  showDictionaryModal: false,
  
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  togglePreview: () => {
    set((state) => {
      const { activeTabId, tabs } = state;
      if (!activeTabId) {
        return { showPreview: !state.showPreview };
      }
      return {
        tabs: tabs.map((t) =>
          t.id === activeTabId ? { ...t, showPreview: !t.showPreview } : t
        ),
        showPreview: !state.showPreview,
      };
    });
  },
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAuth: (show) => set({ showAuth: show }),
  setShowExport: (show) => set({ showExport: show }),
  setShowImportDocx: (show) => set({ showImportDocx: show }),
  setShowExportDocx: (show) => set({ showExportDocx: show }),
  setShowExportPdf: (show) => set({ showExportPdf: show }),
  setShowAbout: (show) => set({ showAbout: show }),
  setShowShortcuts: (show) => set({ showShortcuts: show }),
  setShowSearch: (show) => set({ showSearch: show }),
  setConfirmation: (confirmation) => set({ confirmation }),
  clearConfirmation: () => set({ confirmation: null }),
  toggleZenMode: () => set((state) => ({ 
    zenMode: !state.zenMode,
    showSidebar: state.zenMode ? true : false, // Show sidebar when exiting zen
  })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSplitMode: (mode) => {
    // When exiting diff mode, also disable diffMode
    if (mode !== 'diff') {
      set((state) => {
        const updatedTabs = state.tabs?.map(tab =>
          tab.id === state.activeTabId ? { ...tab, splitMode: mode } : tab
        ) || state.tabs;
        return { 
          splitMode: mode,
          diffMode: {
            enabled: false,
            leftTabId: undefined,
            rightTabId: undefined,
            compareWithSaved: false,
          },
          tabs: updatedTabs,
        };
      });
    } else {
      set((state) => {
        const updatedTabs = state.tabs?.map(tab =>
          tab.id === state.activeTabId ? { ...tab, splitMode: mode } : tab
        ) || state.tabs;
        return { splitMode: mode, tabs: updatedTabs };
      });
    }
  },
  setDiffMode: (enabled, leftTabId, rightTabId, compareWithSaved, viewMode) => {
    set((state) => {
      const activeTab = state.tabs.find(t => t.id === state.activeTabId);
      const allowCompareWithSaved = !!(activeTab && activeTab.hasSavedVersion && activeTab.isDirty);
      const effectiveCompareWithSaved = compareWithSaved && allowCompareWithSaved;
      if (compareWithSaved && !allowCompareWithSaved) {
        state.addToast?.({ type: 'warning', message: 'No saved changes to compare' });
        return state;
      }
      const ensuredViewMode = viewMode ?? state.diffMode.viewMode ?? 'side-by-side';
      if (enabled) {
        const diffMode = {
          enabled: true,
          leftTabId,
          rightTabId,
          compareWithSaved: effectiveCompareWithSaved || false,
          viewMode: ensuredViewMode,
        };
        const updatedTabs = state.tabs?.map(tab =>
          tab.id === state.activeTabId ? { ...tab, diffMode, splitMode: 'diff' as const, diffPaneRatio: tab.diffPaneRatio ?? 0.5 } : tab
        ) || state.tabs;
        return {
          splitMode: 'diff' as const,
          diffMode,
          tabs: updatedTabs,
        };
      } else {
        const resetDiff = {
          enabled: false,
          leftTabId: undefined,
          rightTabId: undefined,
          compareWithSaved: false,
          viewMode: state.diffMode.viewMode ?? 'side-by-side',
        };
        const updatedTabs = state.tabs?.map(tab =>
          tab.id === state.activeTabId ? { ...tab, diffMode: resetDiff, splitMode: 'none' as const } : tab
        ) || state.tabs;
        return {
          splitMode: 'none' as const,
          diffMode: resetDiff,
          tabs: updatedTabs,
        };
      }
    });
  },
  exitDiffMode: () => {
    set((state) => {
      const resetDiff = {
        enabled: false,
        leftTabId: undefined,
        rightTabId: undefined,
        compareWithSaved: false,
        viewMode: state.diffMode.viewMode ?? 'side-by-side',
      };
      const updatedTabs = state.tabs?.map(tab =>
        tab.id === state.activeTabId ? { ...tab, diffMode: resetDiff, splitMode: 'none' as const } : tab
      ) || state.tabs;
      return {
        splitMode: 'none' as const,
        diffMode: resetDiff,
        tabs: updatedTabs,
      };
    });
  },
  setGrammarIssues: (issues) => set({ grammarIssues: issues, grammarIssueIndex: 0, showGrammarReview: true }),
  setGrammarIssueIndex: (index) => set((state) => ({
    grammarIssueIndex: Math.min(Math.max(index, 0), state.grammarIssues.length - 1),
  })),
  closeGrammarReview: () => set({ showGrammarReview: false, grammarIssues: [], grammarIssueIndex: 0, grammarIssueCount: 0, grammarError: null }),
  setGrammarIssuesCount: (count) => set({ grammarIssueCount: count }),
  setShowGrammarReview: (show) => set({ showGrammarReview: show }),
  setGrammarError: (error) => set({ grammarError: error }),
  setShowDictionaryModal: (show) => set({ showDictionaryModal: show }),
});
