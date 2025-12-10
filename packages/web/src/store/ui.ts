import { StateCreator } from 'zustand';
import { ConfirmationState, AppState } from './types';
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
  showGoogleImport: boolean;
  showGoogleExport: boolean;
  showAbout: boolean;
  showShortcuts: boolean;
  showSearch: boolean;
  zenMode: boolean;
  sidebarWidth: number;
  splitMode: 'none' | 'horizontal' | 'vertical';
  confirmation: ConfirmationState | null;
  
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
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
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
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  splitMode: 'none',
  confirmation: null,
  
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
  setConfirmation: (confirmation) => set({ confirmation }),
  clearConfirmation: () => set({ confirmation: null }),
  toggleZenMode: () => set((state) => ({ 
    zenMode: !state.zenMode,
    showSidebar: state.zenMode ? true : false, // Show sidebar when exiting zen
  })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSplitMode: (mode) => set({ splitMode: mode }),
});

