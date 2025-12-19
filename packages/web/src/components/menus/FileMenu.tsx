import { useStore } from '../../store';
import { FileWithWebkitPath } from '../../types/file';
import { isElectron } from '../../utils/platform';
import {
  FileText,
  FolderOpen,
  Save,
  Cloud,
  Download,
  Upload,
  FilePlus,
  X,
  Clock,
  FileType,
  Printer,
  RotateCcw,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
  customElement?: React.ReactNode;
}

/**
 * Generates menu items for the File menu
 * 
 * @returns Array of File menu items
 */
export function getFileMenuItems(): MenuItem[] {
  const {
    createNewDocument,
    saveCurrentDocument,
    activeTabId,
    saveDocumentToCloud,
    tabs,
    closeTab,
    setActiveTab,
    recentFiles,
    openCloudDocument,
    removeRecentFile,
    isAuthenticated,
  } = useStore.getState();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const menuItems: MenuItem[] = [
    {
      id: 'new',
      label: 'New Document',
      shortcut: '⌘N',
      icon: <FilePlus size={14} />,
      action: createNewDocument,
    },
    {
      id: 'open',
      label: 'Open...',
      shortcut: '⌘O',
      icon: <FolderOpen size={14} />,
      action: () => {
        // Trigger file input for local file(s)
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.mdx,.txt,.markdown,.docx';
        input.multiple = true; // Allow multiple file selection
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (!files || files.length === 0) return;
          
          // Process all selected files
          for (const file of Array.from(files)) {
            if (file.name.endsWith('.docx')) {
              useStore.getState().importDocxFile(file);
            } else {
              const content = await file.text();
              useStore.getState().openTab({
                title: file.name,
                content,
                language: file.name.endsWith('.mdx') ? 'mdx' : 'markdown',
                path: (file as FileWithWebkitPath).webkitRelativePath || file.name,
              });
            }
          }
        };
        input.click();
      },
    },
  ];

  // Conditionally add "Open Recent" menu item only in Electron
  if (isElectron()) {
    menuItems.push({
      id: 'recent',
      label: 'Open Recent',
      icon: <Clock size={14} />,
      submenu: recentFiles.slice(0, 5).map((file, index) => ({
        id: `recent-${index}`,
        label: file.title,
        icon: file.isCloud ? <Cloud size={14} /> : <FileText size={14} />,
        action: async () => {
          if (file.documentId) {
            openCloudDocument(file.documentId);
          } else if (file.path) {
            if (window.api?.readFile) {
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
                  if (window.api?.watchFile) {
                    window.api.watchFile(file.path);
                  }
                } else {
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
              const tab = tabs.find(t => t.id === file.id || t.path === file.path);
              if (tab) {
                setActiveTab(tab.id);
              } else {
                useStore.getState().addToast({
                  type: 'info',
                  message: `"${file.title}" is not currently open. Please open it from File > Open.`,
                });
              }
            }
          } else {
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
        },
        customElement: (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeRecentFile(file.id);
            }}
            className="ml-auto opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 rounded hover:bg-sidebar-hover"
            title="Remove from recent files"
            aria-label="Remove from recent files"
          >
            <X size={12} />
          </button>
        ),
      })),
    });
    
    // Add separator only if "Open Recent" was added
    menuItems.push({ id: 'sep1', label: '', separator: true });
  }

  // Continue with rest of menu items
  menuItems.push(
    {
      id: 'save',
      label: 'Save',
      shortcut: '⌘S',
      icon: <Save size={14} />,
      action: saveCurrentDocument,
      disabled: !activeTab,
    },
    {
      id: 'save-cloud',
      label: 'Save to Cloud',
      icon: <Cloud size={14} />,
      action: () => activeTabId && saveDocumentToCloud(activeTabId),
      disabled: !activeTab || !isAuthenticated,
    },
    {
      id: 'save-as',
      label: 'Save As...',
      shortcut: '⌘⇧S',
      icon: <Download size={14} />,
      action: () => {
        if (activeTab) {
          const blob = new Blob([activeTab.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = activeTab.title;
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      disabled: !activeTab,
    },
    {
      id: 'revert',
      label: 'Revert to Last Saved',
      icon: <RotateCcw size={14} />,
      action: () => {
        if (activeTabId) {
          useStore.getState().revertToSaved(activeTabId);
        }
      },
      disabled: !activeTab || !activeTab.hasSavedVersion || !activeTab.isDirty,
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'import-docx',
      label: 'Import from Word (.docx)',
      icon: <Upload size={14} />,
      action: () => useStore.getState().setShowImportDocx(true),
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'export-pdf',
      label: 'Export as PDF',
      icon: <Printer size={14} />,
      action: () => useStore.getState().setShowExportPdf(true),
      disabled: !activeTab,
    },
    {
      id: 'export-docx',
      label: 'Export as Word (.docx)',
      icon: <FileType size={14} />,
      action: () => useStore.getState().setShowExportDocx(true),
      disabled: !activeTab,
    },
    {
      id: 'export-html',
      label: 'Export as HTML',
      icon: <FileText size={14} />,
      action: () => useStore.getState().setShowExport(true),
      disabled: !activeTab,
    },
    { id: 'sep4', label: '', separator: true },
    {
      id: 'close',
      label: 'Close Tab',
      shortcut: '⌘W',
      icon: <X size={14} />,
      action: () => activeTabId && closeTab(activeTabId),
      disabled: !activeTab,
    },
  );

  return menuItems;
}

