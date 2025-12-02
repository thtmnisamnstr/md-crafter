import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { 
  FileText, 
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
  X,
  Search,
  Clock,
  Palette,
  Download,
  Maximize,
} from 'lucide-react';
import clsx from 'clsx';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'file' | 'view' | 'sync' | 'settings' | 'recent';
}

const THEMES = [
  { id: 'dark', name: 'Dark+' },
  { id: 'light', name: 'Light+' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'nord', name: 'Nord' },
];

export function CommandPalette() {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'commands' | 'themes' | 'files'>('commands');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    setShowCommandPalette,
    createNewDocument,
    saveCurrentDocument,
    setShowSettings,
    setShowAuth,
    toggleSidebar,
    togglePreview,
    theme,
    setTheme,
    isAuthenticated,
    logout,
    loadCloudDocuments,
    tabs,
    activeTabId,
    saveDocumentToCloud,
    showPreview,
    showSidebar,
    cloudDocuments,
    openCloudDocument,
    recentFiles,
    setShowExport,
    toggleZenMode,
    zenMode,
  } = useStore();

  // Build commands list
  const commands: Command[] = useMemo(() => {
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
        label: showPreview ? 'Hide Preview' : 'Show Preview',
        icon: showPreview ? <EyeOff size={16} /> : <Eye size={16} />,
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
          setMode('themes');
          setSearch('');
          setSelectedIndex(0);
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

    // Add recent files
    recentFiles.slice(0, 5).forEach((file, index) => {
      cmds.push({
        id: `recent-${index}`,
        label: file.title,
        icon: <Clock size={16} />,
        action: () => {
          if (file.documentId) {
            openCloudDocument(file.documentId);
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
  ]);

  // Filter based on mode
  const filteredItems = useMemo(() => {
    if (mode === 'themes') {
      const searchLower = search.toLowerCase();
      return THEMES.filter((t) => 
        t.name.toLowerCase().includes(searchLower)
      );
    }

    if (mode === 'files') {
      const searchLower = search.toLowerCase();
      // Combine open tabs and cloud documents
      const items = [
        ...tabs.map((t) => ({ type: 'tab' as const, id: t.id, title: t.title })),
        ...cloudDocuments.map((d) => ({ type: 'cloud' as const, id: d.id, title: d.title })),
      ];
      return items.filter((item) => 
        item.title.toLowerCase().includes(searchLower)
      );
    }

    // Commands mode
    if (!search) return commands;
    const searchLower = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(searchLower) ||
        cmd.category.toLowerCase().includes(searchLower)
    );
  }, [mode, search, commands, tabs, cloudDocuments]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, mode]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (mode !== 'commands') {
            setMode('commands');
            setSearch('');
          } else {
            setShowCommandPalette(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(selectedIndex);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, mode, setShowCommandPalette]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (index: number) => {
    if (mode === 'themes') {
      const selectedTheme = filteredItems[index] as { id: string; name: string };
      if (selectedTheme) {
        setTheme(selectedTheme.id);
        setShowCommandPalette(false);
      }
    } else if (mode === 'files') {
      const item = filteredItems[index] as { type: 'tab' | 'cloud'; id: string; title: string };
      if (item) {
        if (item.type === 'tab') {
          useStore.getState().setActiveTab(item.id);
        } else {
          openCloudDocument(item.id);
        }
        setShowCommandPalette(false);
      }
    } else {
      const cmd = filteredItems[index] as Command;
      if (cmd) {
        cmd.action();
      }
    }
  };

  // Handle special input patterns
  const handleInputChange = (value: string) => {
    if (value === '>') {
      setMode('commands');
      setSearch('');
      return;
    }
    if (value.startsWith('@')) {
      setMode('files');
      setSearch(value.slice(1));
      return;
    }
    setSearch(value);
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'themes':
        return 'Select a theme...';
      case 'files':
        return 'Search files...';
      default:
        return 'Type a command or @ to search files...';
    }
  };

  return (
    <div
      className="command-palette-overlay"
      onClick={() => setShowCommandPalette(false)}
    >
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b border-tab-border">
          <Search size={16} className="ml-4 opacity-50" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input border-0"
            placeholder={getPlaceholder()}
            value={mode === 'files' ? `@${search}` : search}
            onChange={(e) => handleInputChange(e.target.value)}
          />
          {mode !== 'commands' && (
            <button
              onClick={() => {
                setMode('commands');
                setSearch('');
              }}
              className="mr-3 p-1 rounded hover:bg-sidebar-hover"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div ref={listRef} className="command-palette-list">
          {mode === 'themes' && (
            <>
              {(filteredItems as typeof THEMES).map((t, index) => (
                <div
                  key={t.id}
                  className={clsx(
                    'command-palette-item',
                    index === selectedIndex && 'selected'
                  )}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Palette size={16} />
                  <span>{t.name}</span>
                  {theme === t.id && (
                    <span className="ml-auto text-xs opacity-60">Current</span>
                  )}
                </div>
              ))}
            </>
          )}

          {mode === 'files' && (
            <>
              {(filteredItems as Array<{ type: string; id: string; title: string }>).map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={clsx(
                    'command-palette-item',
                    index === selectedIndex && 'selected'
                  )}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.type === 'cloud' ? <Cloud size={16} /> : <FileText size={16} />}
                  <span>{item.title}</span>
                  <span className="ml-auto text-xs opacity-50">
                    {item.type === 'cloud' ? 'Cloud' : 'Open'}
                  </span>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="px-4 py-3 text-sm opacity-50">
                  No files found
                </div>
              )}
            </>
          )}

          {mode === 'commands' && (
            <>
              {(filteredItems as Command[]).map((cmd, index) => (
                <div
                  key={cmd.id}
                  className={clsx(
                    'command-palette-item',
                    index === selectedIndex && 'selected'
                  )}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {cmd.icon}
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="shortcut">{cmd.shortcut}</span>
                  )}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="px-4 py-3 text-sm opacity-50">
                  No commands found
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-tab-border text-xs opacity-50 flex gap-4">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
