import { useMemo } from 'react';
import { useStore } from '../../store';
import { MAX_RECENT_FILES } from '../../constants';
import {
  Plus,
  Save,
  Settings,
  Cloud,
  Eye,
  EyeOff,
  PanelLeft,
  LogIn,
  LogOut,
  RefreshCw,
  Palette,
  Download,
  Maximize,
  FileText,
} from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'file' | 'view' | 'sync' | 'settings' | 'recent';
}

/**
 * Hook to generate commands for the command palette
 * 
 * @param setShowCommandPalette - Function to close the command palette
 * @returns Array of Command objects
 */
export function useCommands(setShowCommandPalette: (show: boolean) => void): Command[] {
  const {
    createNewDocument,
    saveCurrentDocument,
    setShowSettings,
    setShowAuth,
    toggleSidebar,
    togglePreview,
    isAuthenticated,
    logout,
    loadCloudDocuments,
    activeTabId,
    saveDocumentToCloud,
    showPreview,
    showSidebar,
    recentFiles,
    openCloudDocument,
    setShowExport,
    toggleZenMode,
    zenMode,
    tabs,
    setActiveTab,
    removeRecentFile,
  } = useStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const tabShowPreview = activeTab?.showPreview ?? showPreview;

  return useMemo(() => {
    const cmds: Command[] = [
      // File commands
      {
        id: 'new-file',
        label: 'New File',
        shortcut: '⌘N',
        icon: <Plus size={16} />,
        action: () => {
          createNewDocument();
          setShowCommandPalette(false);
        },
        category: 'file',
      },
      {
        id: 'save',
        label: 'Save',
        shortcut: '⌘S',
        icon: <Save size={16} />,
        action: () => {
          saveCurrentDocument();
          setShowCommandPalette(false);
        },
        category: 'file',
      },
      {
        id: 'save-to-cloud',
        label: 'Save to Cloud',
        icon: <Cloud size={16} />,
        action: () => {
          if (activeTabId) {
            saveDocumentToCloud(activeTabId);
          }
          setShowCommandPalette(false);
        },
        category: 'file',
      },
      {
        id: 'export',
        label: 'Export Document',
        shortcut: '⌘E',
        icon: <Download size={16} />,
        action: () => {
          setShowExport(true);
          setShowCommandPalette(false);
        },
        category: 'file',
      },
      // View commands
      {
        id: 'toggle-sidebar',
        label: showSidebar ? 'Hide Sidebar' : 'Show Sidebar',
        shortcut: '⌘B',
        icon: <PanelLeft size={16} />,
        action: () => {
          toggleSidebar();
          setShowCommandPalette(false);
        },
        category: 'view',
      },
      {
        id: 'toggle-preview',
        label: tabShowPreview ? 'Hide Preview' : 'Show Preview',
        icon: tabShowPreview ? <EyeOff size={16} /> : <Eye size={16} />,
        action: () => {
          togglePreview();
          setShowCommandPalette(false);
        },
        category: 'view',
      },
      {
        id: 'change-theme',
        label: 'Change Color Theme',
        icon: <Palette size={16} />,
        action: () => {
          // This will be handled by the parent component
        },
        category: 'view',
      },
      {
        id: 'zen-mode',
        label: zenMode ? 'Exit Zen Mode' : 'Enter Zen Mode',
        shortcut: '⌘K Z',
        icon: <Maximize size={16} />,
        action: () => {
          toggleZenMode();
          setShowCommandPalette(false);
        },
        category: 'view',
      },
      // Settings
      {
        id: 'settings',
        label: 'Open Settings',
        shortcut: '⌘,',
        icon: <Settings size={16} />,
        action: () => {
          setShowSettings(true);
          setShowCommandPalette(false);
        },
        category: 'settings',
      },
    ];

    // Auth commands
    if (isAuthenticated) {
      cmds.push(
        {
          id: 'refresh-cloud',
          label: 'Refresh Cloud Documents',
          icon: <RefreshCw size={16} />,
          action: () => {
            loadCloudDocuments();
            setShowCommandPalette(false);
          },
          category: 'sync',
        },
        {
          id: 'logout',
          label: 'Sign Out',
          icon: <LogOut size={16} />,
          action: () => {
            logout();
            setShowCommandPalette(false);
          },
          category: 'sync',
        }
      );
    } else {
      cmds.push({
        id: 'login',
        label: 'Sign In',
        icon: <LogIn size={16} />,
        action: () => {
          setShowAuth(true);
          setShowCommandPalette(false);
        },
        category: 'sync',
      });
    }

    // Filter recent files: strictly persistent files that are NOT currently open
    const filteredRecentFiles = recentFiles.filter(file => {
      const isPersistent = !!file.path || !!file.documentId;
      const isOpen = tabs.some(t =>
        t.id === file.id ||
        (file.documentId && t.documentId === file.documentId) ||
        (file.path && t.path === file.path)
      );
      return isPersistent && !isOpen;
    });

    // Add recent files
    filteredRecentFiles.slice(0, MAX_RECENT_FILES).forEach((file, index) => {
      cmds.push({
        id: `recent-${index}`,
        label: file.title,
        icon: file.isCloud ? <Cloud size={16} /> : <FileText size={16} />,
        action: async () => {
          if (file.documentId) {
            // Cloud document - reopen via API
            openCloudDocument(file.documentId);
          } else if (file.path) {
            // Local file with path
            const { isElectron } = await import('../../utils/platform');
            if (isElectron() && window.api?.readFile) {
              // Desktop: Read file from disk
              try {
                const result = await window.api.readFile(file.path);
                if (result.success && result.content !== undefined) {
                  const ext = file.title.split('.').pop();
                  const { getLanguageFromExtension } = await import('../../utils/language');
                  useStore.getState().openTab({
                    title: file.title,
                    content: result.content,
                    language: getLanguageFromExtension(ext),
                    path: file.path,
                  });
                  // Watch file for external changes
                  if (window.api?.watchFile) {
                    window.api.watchFile(file.path);
                  }
                } else {
                  // File not found - remove from recent files
                  removeRecentFile(file.id);
                  useStore.getState().addToast({
                    type: 'warning',
                    message: `File "${file.title}" not found. Removed from recent files.`,
                  });
                }
              } catch (error) {
                useStore.getState().addToast({
                  type: 'error',
                  message: `Failed to open "${file.title}"`,
                });
              }
            } else {
              // Web: Check if tab is already open
              const tab = tabs.find(t => t.id === file.id || t.path === file.path);
              if (tab) {
                setActiveTab(tab.id);
              } else {
                // Can't reopen local files in browser
                useStore.getState().addToast({
                  type: 'info',
                  message: `"${file.title}" is not currently open. Please open it from File > Open.`,
                });
              }
            }
          } else {
            // Local file without path - try to find tab
            const tab = tabs.find(t => t.id === file.id);
            if (tab) {
              setActiveTab(tab.id);
            } else {
              const tabByTitle = tabs.find(t => t.title === file.title);
              if (tabByTitle) {
                setActiveTab(tabByTitle.id);
              } else {
                useStore.getState().addToast({
                  type: 'info',
                  message: `"${file.title}" is not currently open. Please open it from File > Open.`,
                });
              }
            }
          }
          setShowCommandPalette(false);
        },
        category: 'recent',
      });
    });

    return cmds;
  }, [
    createNewDocument,
    saveCurrentDocument,
    setShowCommandPalette,
    setShowSettings,
    setShowAuth,
    toggleSidebar,
    togglePreview,
    isAuthenticated,
    logout,
    loadCloudDocuments,
    activeTabId,
    saveDocumentToCloud,
    showPreview,
    showSidebar,
    recentFiles,
    openCloudDocument,
    setShowExport,
    toggleZenMode,
    zenMode,
    tabs,
    setActiveTab,
    removeRecentFile,
    tabShowPreview,
  ]);
}
