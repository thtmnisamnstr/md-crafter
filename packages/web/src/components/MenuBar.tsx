import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import {
  ChevronDown,
  FileText,
  FolderOpen,
  Save,
  Cloud,
  Download,
  Upload,
  FilePlus,
  X,
  Undo,
  Redo,
  Scissors,
  Copy,
  Clipboard,
  ClipboardPaste,
  Search,
  Replace,
  CheckSquare,
  PanelLeft,
  Eye,
  Maximize,
  Command,
  SplitSquareHorizontal,
  Palette,
  HelpCircle,
  Keyboard,
  Info,
  Clock,
  FileType,
  Printer,
} from 'lucide-react';
import clsx from 'clsx';

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
}

interface MenuProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function Menu({ label, items, isOpen, onOpen, onClose }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmenuOpen(null);
    }
  }, [isOpen]);

  const handleItemClick = (item: MenuItem) => {
    if (item.submenu) {
      setSubmenuOpen(submenuOpen === item.id ? null : item.id);
    } else if (item.action && !item.disabled) {
      item.action();
      onClose();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={clsx(
          'px-3 py-1 text-sm rounded hover:bg-sidebar-hover transition-colors',
          isOpen && 'bg-sidebar-hover'
        )}
        style={{ color: 'var(--editor-fg)' }}
        onClick={() => (isOpen ? onClose() : onOpen())}
        onMouseEnter={() => isOpen && onOpen()}
      >
        {label}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[220px] rounded-md shadow-lg border border-tab-border z-50"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          {items.map((item, index) =>
            item.separator ? (
              <div
                key={`sep-${index}`}
                className="h-px my-1 mx-2"
                style={{ background: 'var(--tab-border)' }}
              />
            ) : (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => item.submenu && setSubmenuOpen(item.id)}
                onMouseLeave={() => item.submenu && setSubmenuOpen(null)}
              >
                <button
                  className={clsx(
                    'w-full px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-sidebar-hover transition-colors',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{ color: 'var(--editor-fg)' }}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs opacity-60 ml-4">{item.shortcut}</span>
                  )}
                  {item.submenu && <ChevronDown size={14} className="-rotate-90" />}
                </button>

                {/* Submenu */}
                {item.submenu && submenuOpen === item.id && (
                  <div
                    className="absolute left-full top-0 min-w-[180px] rounded-md shadow-lg border border-tab-border ml-1"
                    style={{ background: 'var(--sidebar-bg)' }}
                  >
                    {item.submenu.map((subitem) => (
                      <button
                        key={subitem.id}
                        className={clsx(
                          'w-full px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-sidebar-hover transition-colors',
                          subitem.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        style={{ color: 'var(--editor-fg)' }}
                        onClick={() => {
                          if (subitem.action && !subitem.disabled) {
                            subitem.action();
                            onClose();
                          }
                        }}
                        disabled={subitem.disabled}
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          {subitem.icon}
                        </span>
                        <span className="flex-1 text-left">{subitem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

const THEMES = [
  { id: 'dark', name: 'Dark+' },
  { id: 'light', name: 'Light+' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'nord', name: 'Nord' },
];

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const {
    createNewDocument,
    saveCurrentDocument,
    activeTabId,
    saveDocumentToCloud,
    tabs,
    closeTab,
    toggleSidebar,
    togglePreview,
    toggleZenMode,
    showSidebar,
    showPreview,
    zenMode,
    setShowCommandPalette,
    setShowSettings,
    setTheme,
    theme,
    recentFiles,
    openCloudDocument,
    isAuthenticated,
    setShowAuth,
    setShowImportDocx,
    setShowExportDocx,
    setShowExportPdf,
    setShowGoogleImport,
    setShowGoogleExport,
    setShowExport,
    copyForWordDocs,
    pasteFromWordDocs,
    setShowAbout,
    setShowShortcuts,
    setSplitMode,
    splitMode,
  } = useStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const fileMenuItems: MenuItem[] = [
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
        // Trigger file input for local file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.mdx,.txt,.markdown,.docx';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            if (file.name.endsWith('.docx')) {
              useStore.getState().importDocxFile(file);
            } else {
              const content = await file.text();
              useStore.getState().openTab({
                title: file.name,
                content,
                language: file.name.endsWith('.mdx') ? 'mdx' : 'markdown',
              });
            }
          }
        };
        input.click();
      },
    },
    {
      id: 'recent',
      label: 'Open Recent',
      icon: <Clock size={14} />,
      submenu: recentFiles.slice(0, 5).map((file, index) => ({
        id: `recent-${index}`,
        label: file.title,
        icon: file.isCloud ? <Cloud size={14} /> : <FileText size={14} />,
        action: () => {
          if (file.documentId) {
            openCloudDocument(file.documentId);
          }
        },
      })),
    },
    { id: 'sep1', label: '', separator: true },
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
    { id: 'sep2', label: '', separator: true },
    {
      id: 'import-docx',
      label: 'Import from Word (.docx)',
      icon: <Upload size={14} />,
      action: () => setShowImportDocx(true),
    },
    {
      id: 'import-google',
      label: 'Import from Google Doc',
      icon: <Upload size={14} />,
      action: () => {
        if (!isAuthenticated) {
          setShowAuth(true);
        } else {
          setShowGoogleImport(true);
        }
      },
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'export-pdf',
      label: 'Export as PDF',
      icon: <Printer size={14} />,
      action: () => setShowExportPdf(true),
      disabled: !activeTab,
    },
    {
      id: 'export-docx',
      label: 'Export as Word (.docx)',
      icon: <FileType size={14} />,
      action: () => setShowExportDocx(true),
      disabled: !activeTab,
    },
    {
      id: 'export-html',
      label: 'Export as HTML',
      icon: <FileText size={14} />,
      action: () => setShowExport(true),
      disabled: !activeTab,
    },
    {
      id: 'export-google',
      label: 'Export to Google Drive',
      icon: <Cloud size={14} />,
      action: () => {
        if (!isAuthenticated) {
          setShowAuth(true);
        } else {
          setShowGoogleExport(true);
        }
      },
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
  ];

  const editMenuItems: MenuItem[] = [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: '⌘Z',
      icon: <Undo size={14} />,
      action: () => document.execCommand('undo'),
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: '⌘⇧Z',
      icon: <Redo size={14} />,
      action: () => document.execCommand('redo'),
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'cut',
      label: 'Cut',
      shortcut: '⌘X',
      icon: <Scissors size={14} />,
      action: () => document.execCommand('cut'),
    },
    {
      id: 'copy',
      label: 'Copy',
      shortcut: '⌘C',
      icon: <Copy size={14} />,
      action: () => document.execCommand('copy'),
    },
    {
      id: 'copy-word',
      label: 'Copy for Word/Docs',
      shortcut: '⌘⇧C',
      icon: <Clipboard size={14} />,
      action: copyForWordDocs,
      disabled: !activeTab,
    },
    {
      id: 'paste',
      label: 'Paste',
      shortcut: '⌘V',
      icon: <ClipboardPaste size={14} />,
      action: () => document.execCommand('paste'),
    },
    {
      id: 'paste-word',
      label: 'Paste from Word/Docs',
      shortcut: '⌘⇧V',
      icon: <ClipboardPaste size={14} />,
      action: pasteFromWordDocs,
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'find',
      label: 'Find',
      shortcut: '⌘F',
      icon: <Search size={14} />,
      action: () => {
        // Trigger Monaco find widget
        const editor = window.monacoEditor;
        if (editor) {
          editor.getAction('actions.find')?.run();
        }
      },
    },
    {
      id: 'replace',
      label: 'Replace',
      shortcut: '⌘H',
      icon: <Replace size={14} />,
      action: () => {
        const editor = window.monacoEditor;
        if (editor) {
          editor.getAction('editor.action.startFindReplaceAction')?.run();
        }
      },
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'select-all',
      label: 'Select All',
      shortcut: '⌘A',
      icon: <CheckSquare size={14} />,
      action: () => document.execCommand('selectAll'),
    },
  ];

  const viewMenuItems: MenuItem[] = [
    {
      id: 'command-palette',
      label: 'Command Palette',
      shortcut: '⌘⇧P',
      icon: <Command size={14} />,
      action: () => setShowCommandPalette(true),
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'toggle-sidebar',
      label: showSidebar ? 'Hide Sidebar' : 'Show Sidebar',
      shortcut: '⌘B',
      icon: <PanelLeft size={14} />,
      action: toggleSidebar,
    },
    {
      id: 'toggle-preview',
      label: showPreview ? 'Hide Preview' : 'Show Preview',
      shortcut: '⌘\\',
      icon: <Eye size={14} />,
      action: togglePreview,
    },
    {
      id: 'toggle-zen',
      label: zenMode ? 'Exit Zen Mode' : 'Enter Zen Mode',
      shortcut: '⌘K Z',
      icon: <Maximize size={14} />,
      action: toggleZenMode,
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'split-editor',
      label: 'Split Editor',
      icon: <SplitSquareHorizontal size={14} />,
      submenu: [
        {
          id: 'split-none',
          label: 'No Split' + (splitMode === 'none' ? ' ✓' : ''),
          action: () => setSplitMode('none'),
        },
        {
          id: 'split-vertical',
          label: 'Split Right' + (splitMode === 'vertical' ? ' ✓' : ''),
          shortcut: '⌘\\',
          action: () => setSplitMode(splitMode === 'vertical' ? 'none' : 'vertical'),
        },
        {
          id: 'split-horizontal',
          label: 'Split Down' + (splitMode === 'horizontal' ? ' ✓' : ''),
          shortcut: '⌘⇧\\',
          action: () => setSplitMode(splitMode === 'horizontal' ? 'none' : 'horizontal'),
        },
      ],
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'theme',
      label: 'Change Theme',
      icon: <Palette size={14} />,
      submenu: THEMES.map((t) => ({
        id: t.id,
        label: t.name + (theme === t.id ? ' ✓' : ''),
        action: () => setTheme(t.id),
      })),
    },
    { id: 'sep4', label: '', separator: true },
    {
      id: 'settings',
      label: 'Settings',
      shortcut: '⌘,',
      icon: <PanelLeft size={14} />,
      action: () => setShowSettings(true),
    },
  ];

  const helpMenuItems: MenuItem[] = [
    {
      id: 'docs',
      label: 'Documentation',
      icon: <HelpCircle size={14} />,
      action: () => window.open('https://github.com/yourusername/md-edit#readme', '_blank'),
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      shortcut: '⌘K ⌘S',
      icon: <Keyboard size={14} />,
      action: () => setShowShortcuts(true),
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'about',
      label: 'About md-edit',
      icon: <Info size={14} />,
      action: () => setShowAbout(true),
    },
  ];

  return (
    <div
      ref={menuBarRef}
      className="flex items-center h-8 px-2 border-b border-tab-border"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      <Menu
        label="File"
        items={fileMenuItems}
        isOpen={openMenu === 'file'}
        onOpen={() => setOpenMenu('file')}
        onClose={() => setOpenMenu(null)}
      />
      <Menu
        label="Edit"
        items={editMenuItems}
        isOpen={openMenu === 'edit'}
        onOpen={() => setOpenMenu('edit')}
        onClose={() => setOpenMenu(null)}
      />
      <Menu
        label="View"
        items={viewMenuItems}
        isOpen={openMenu === 'view'}
        onOpen={() => setOpenMenu('view')}
        onClose={() => setOpenMenu(null)}
      />
      <Menu
        label="Help"
        items={helpMenuItems}
        isOpen={openMenu === 'help'}
        onOpen={() => setOpenMenu('help')}
        onClose={() => setOpenMenu(null)}
      />
    </div>
  );
}

