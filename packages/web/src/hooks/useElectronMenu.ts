import { useEffect } from 'react';
import { useStore } from '../store';
import { useEditorContext } from '../contexts/EditorContext';
import { isElectron } from '../utils/platform';
import { getLanguageFromExtension } from '../utils/language';

// Type alias for Electron API to ensure correct type resolution
type ElectronAPI = NonNullable<typeof window.api>;

/**
 * Hook to set up Electron native menu event listeners
 * 
 * Registers handlers for all Electron menu actions including:
 * - File menu (New, Save, Save to Cloud, Close Tab, etc.)
 * - View menu (Toggle Sidebar, Preview, Command Palette, etc.)
 * - Edit menu (Copy/Paste for Word)
 * - Export actions (PDF, Word, HTML)
 * - Search and Help menus
 * 
 * Only runs when running in Electron environment. Automatically cleans up
 * all event listeners on unmount.
 */
export function useElectronMenu() {
  const { getActiveEditor } = useEditorContext();
  
  useEffect(() => {
    if (!isElectron()) return;
    
    // Get the api from the window object (exposed by preload)
    // Use explicit type annotation to ensure correct type resolution
    const api: ElectronAPI = window.api!;
    
    if (!api) return;
    
    const cleanups: (() => void)[] = [];
    
    // File menu actions
    if (api.onMenuNewFile) {
      cleanups.push(api.onMenuNewFile(() => useStore.getState().createNewDocument()));
    }
    if (api.onMenuSave) {
      cleanups.push(api.onMenuSave(() => useStore.getState().saveCurrentDocument()));
    }
    if (api.onMenuSaveToCloud) {
      cleanups.push(api.onMenuSaveToCloud(() => {
        const { activeTabId } = useStore.getState();
        if (activeTabId) useStore.getState().saveDocumentToCloud(activeTabId);
      }));
    }
    if (api.onMenuCloseTab) {
      cleanups.push(api.onMenuCloseTab(() => {
        const { activeTabId, closeTab } = useStore.getState();
        if (activeTabId) closeTab(activeTabId);
      }));
    }
    
    // File opening handler for Electron
    if (api.onFileOpened) {
      cleanups.push(api.onFileOpened((data: { path: string; content: string; name: string }) => {
        const { path, content, name } = data;
        const ext = name.split('.').pop();
        const { openTab, tabs } = useStore.getState();
        
        // Check if file is already open by path
        const existingTab = tabs.find(t => t.path === path);
        if (existingTab) {
          useStore.getState().setActiveTab(existingTab.id);
          return;
        }
        
        openTab({
          title: name,
          content,
          language: getLanguageFromExtension(ext),
          path: path,
        });
        
        // Watch file for external changes
        if (api.watchFile) {
          api.watchFile(path);
        }
      }));
    }
    
    // Save As handler for Electron
    if (api.onFileSaveAsPath) {
      cleanups.push(api.onFileSaveAsPath((filePath: string | null) => {
        const { activeTabId, tabs, updateTabPath } = useStore.getState();
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab || !filePath) return;
        
        // Store filePath in a const to preserve type narrowing for async callbacks
        // After the null check above, filePath is guaranteed to be string
        const savePath = filePath as string;
        
        // Save file using Electron API
        if (api.writeFile) {
          api.writeFile(savePath, tab.content).then((result: { success: boolean; error?: string }) => {
            if (result.success && activeTabId) {
              // Update tab with new path and mark as saved
              useStore.getState().updateTabContent(activeTabId, tab.content);
              updateTabPath(activeTabId, savePath);
              
              // Mark as saved
              const updatedTabs = tabs.map(t => 
                t.id === activeTabId 
                  ? { ...t, path: savePath, isDirty: false, savedContent: t.content }
                  : t
              );
              useStore.setState({ tabs: updatedTabs });
              
              // Watch the new file
              if (api.watchFile) {
                api.watchFile(savePath);
              }
              
              useStore.getState().addToast({ 
                type: 'success', 
                message: 'File saved successfully' 
              });
            } else {
              useStore.getState().addToast({ 
                type: 'error', 
                message: `Failed to save: ${result.error}` 
              });
            }
          });
        }
      }));
    }
    
    // External file change handler
    if (api.onExternalChange) {
      cleanups.push(api.onExternalChange((data: { path: string; content: string }) => {
        const { path, content } = data;
        const { tabs, activeTabId } = useStore.getState();
        const tab = tabs.find(t => t.path === path);
        
        if (!tab) return;
        
        // Check if file was modified externally while user was editing
        const isCurrentlyEditing = activeTabId === tab.id && tab.isDirty;
        
        if (isCurrentlyEditing) {
          // Show conflict dialog
          useStore.getState().setConfirmation({
            title: 'File Changed Externally',
            message: 'This file has been modified by another application. Reload and lose your changes, or keep your current version?',
            variant: 'warning',
            confirmLabel: 'Reload',
            cancelLabel: 'Keep Mine',
            onConfirm: () => {
              // Reset cursor since external content may have different structure
              useStore.getState().updateTabContent(tab.id, content, { resetCursor: true });
              useStore.getState().clearConfirmation();
            },
          });
        } else {
          // Just update the content - reset cursor since external content may have different structure
          useStore.getState().updateTabContent(tab.id, content, { resetCursor: true });
        }
      }));
    }
    
    // View menu actions
    if (api.onMenuToggleSidebar) {
      cleanups.push(api.onMenuToggleSidebar(() => useStore.getState().toggleSidebar()));
    }
    if (api.onMenuTogglePreview) {
      cleanups.push(api.onMenuTogglePreview(() => useStore.getState().togglePreview()));
    }
    if (api.onMenuCommandPalette) {
      cleanups.push(api.onMenuCommandPalette(() => useStore.getState().setShowCommandPalette(true)));
    }
    if (api.onMenuSettings) {
      cleanups.push(api.onMenuSettings(() => useStore.getState().setShowSettings(true)));
    }
    if (api.onMenuZenMode) {
      cleanups.push(api.onMenuZenMode(() => useStore.getState().toggleZenMode()));
    }
    if (api.onMenuSplitVertical) {
      cleanups.push(api.onMenuSplitVertical(() => useStore.getState().setSplitMode('vertical')));
    }
    if (api.onMenuSplitHorizontal) {
      cleanups.push(api.onMenuSplitHorizontal(() => useStore.getState().setSplitMode('horizontal')));
    }
    if (api.onMenuNoSplit) {
      cleanups.push(api.onMenuNoSplit(() => useStore.getState().setSplitMode('none')));
    }
    if (api.onMenuDiffWithSaved) {
      cleanups.push(api.onMenuDiffWithSaved(() => {
        const { activeTabId, tabs, setDiffMode, addToast } = useStore.getState();
        if (!activeTabId) return;
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab?.hasSavedVersion || !activeTab.isDirty) {
          addToast?.({ type: 'warning', message: 'No saved changes to compare' });
          return;
        }
        setDiffMode(true, activeTabId, undefined, true);
      }));
    }
    if (api.onMenuDiffWithFile) {
      cleanups.push(api.onMenuDiffWithFile(() => {
        const { activeTabId, tabs, setDiffMode } = useStore.getState();
        if (activeTabId) {
          const otherTab = tabs.find(t => t.id !== activeTabId);
          if (otherTab) {
            setDiffMode(true, activeTabId, otherTab.id, false);
          }
        }
      }));
    }
    if (api.onMenuDiffExit) {
      cleanups.push(api.onMenuDiffExit(() => useStore.getState().exitDiffMode()));
    }
    
    // Edit menu - Copy/Paste for Word
    if (api.onMenuCopyForWord) {
      cleanups.push(api.onMenuCopyForWord(() => useStore.getState().copyForWordDocs()));
    }
    if (api.onMenuPasteFromWord) {
      cleanups.push(api.onMenuPasteFromWord(() => {
        const editor = getActiveEditor();
        useStore.getState().pasteFromWordDocs(editor || undefined);
      }));
    }
    
    // Export actions
    if (api.onMenuExportPdf) {
      cleanups.push(api.onMenuExportPdf(() => useStore.getState().setShowExportPdf(true)));
    }
    if (api.onMenuExportWord) {
      cleanups.push(api.onMenuExportWord(() => useStore.getState().setShowExportDocx(true)));
    }
    if (api.onMenuExportHtml) {
      cleanups.push(api.onMenuExportHtml(() => useStore.getState().setShowExport(true)));
    }
    if (api.onMenuImportWord) {
      cleanups.push(api.onMenuImportWord(() => useStore.getState().setShowImportDocx(true)));
    }
    
    // Search
    if (api.onMenuSearch) {
      cleanups.push(api.onMenuSearch(() => useStore.getState().setShowSearch(true)));
    }
    
    // Help menu actions
    if (api.onMenuAbout) {
      cleanups.push(api.onMenuAbout(() => useStore.getState().setShowAbout(true)));
    }
    if (api.onMenuShortcuts) {
      cleanups.push(api.onMenuShortcuts(() => useStore.getState().setShowShortcuts(true)));
    }
    
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [getActiveEditor]);
}
