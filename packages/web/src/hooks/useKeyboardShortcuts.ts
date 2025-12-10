import { useEffect, useRef } from 'react';
import { useStore } from '../store';

/**
 * Custom hook for handling global keyboard shortcuts
 * 
 * Handles all keyboard shortcuts for the application including:
 * - Command palette (Ctrl/Cmd + Shift + P)
 * - Save operations (Ctrl/Cmd + S, Ctrl/Cmd + Shift + S)
 * - Document operations (New, Close, etc.)
 * - UI toggles (Sidebar, Preview, Settings, etc.)
 * - Editor splits and zen mode
 * 
 * @returns void - Sets up event listeners and returns cleanup function
 */
export function useKeyboardShortcuts(): void {
  const zenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl/Cmd + Shift + P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowCommandPalette(true);
        return;
      }
      
      // Print/PDF Export: Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowExportPdf(true);
        return;
      }
      
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        useStore.getState().saveCurrentDocument();
        return;
      }
      
      // Save As: Ctrl/Cmd + Shift + S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        // Save As downloads the file
        const { tabs, activeTabId } = useStore.getState();
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
          const blob = new Blob([tab.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = tab.title;
          a.click();
          URL.revokeObjectURL(url);
        }
        return;
      }
      
      // New document: Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        useStore.getState().createNewDocument();
        return;
      }
      
      // Close tab: Ctrl/Cmd + W
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const activeTab = useStore.getState().activeTabId;
        if (activeTab) {
          useStore.getState().closeTab(activeTab);
        }
        return;
      }
      
      // Toggle sidebar: Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        useStore.getState().toggleSidebar();
        return;
      }
      
      // Settings: Ctrl/Cmd + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useStore.getState().setShowSettings(true);
        return;
      }
      
      // Export HTML: Ctrl/Cmd + E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        useStore.getState().setShowExport(true);
        return;
      }
      
      // Copy for Word/Docs: Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        useStore.getState().copyForWordDocs();
        return;
      }
      
      // Paste from Word/Docs: Ctrl/Cmd + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        useStore.getState().pasteFromWordDocs();
        return;
      }
      
      // Global search: Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        useStore.getState().setShowSearch(true);
        return;
      }
      
      // Split editor vertical: Ctrl/Cmd + \
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '\\') {
        e.preventDefault();
        const { splitMode, setSplitMode } = useStore.getState();
        setSplitMode(splitMode === 'vertical' ? 'none' : 'vertical');
        return;
      }
      
      // Split editor horizontal: Ctrl/Cmd + Shift + \
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '|') {
        e.preventDefault();
        const { splitMode, setSplitMode } = useStore.getState();
        setSplitMode(splitMode === 'horizontal' ? 'none' : 'horizontal');
        return;
      }
      
      // Zen mode: Ctrl/Cmd + K, Z (VS Code style)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // Wait for next key
        const handleZenKey = (e2: KeyboardEvent) => {
          if (e2.key === 'z') {
            e2.preventDefault();
            useStore.getState().toggleZenMode();
          }
          window.removeEventListener('keydown', handleZenKey);
          if (zenTimeoutRef.current) {
            clearTimeout(zenTimeoutRef.current);
            zenTimeoutRef.current = null;
          }
        };
        window.addEventListener('keydown', handleZenKey);
        zenTimeoutRef.current = setTimeout(() => {
          window.removeEventListener('keydown', handleZenKey);
          zenTimeoutRef.current = null;
        }, 500);
        return;
      }
      
      // Escape to exit Zen mode
      if (e.key === 'Escape' && useStore.getState().zenMode) {
        useStore.getState().toggleZenMode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (zenTimeoutRef.current) {
        clearTimeout(zenTimeoutRef.current);
        zenTimeoutRef.current = null;
      }
    };
  }, []);
}

