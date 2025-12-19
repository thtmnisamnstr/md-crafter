import { useStore } from '../../store';
import { THEMES } from '../../utils/themes';
import {
  Command,
  PanelLeft,
  Eye,
  EyeOff,
  Maximize,
  SplitSquareHorizontal,
  Palette,
  FileText,
} from 'lucide-react';
import type { MenuItem } from './FileMenu';

/**
 * Generates menu items for the View menu
 * 
 * @returns Array of View menu items
 */
export function getViewMenuItems(): MenuItem[] {
  const {
    setShowCommandPalette,
    toggleSidebar,
    togglePreview,
    toggleZenMode,
    showSidebar,
    showPreview,
    zenMode,
    setTheme,
    theme,
    setShowSettings,
    activeTabId,
    tabs,
    setSplitMode,
    splitMode,
    setDiffMode,
    exitDiffMode,
  } = useStore.getState();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const tabShowPreview = activeTab?.showPreview ?? showPreview;

  return [
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
      label: tabShowPreview ? 'Hide Preview' : 'Show Preview',
      shortcut: '⌘\\',
      icon: tabShowPreview ? <EyeOff size={14} /> : <Eye size={14} />,
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
    {
      id: 'diff-view',
      label: 'Compare Files',
      icon: <FileText size={14} />,
      submenu: [
        {
          id: 'diff-with-saved',
          label: 'Compare with Saved Version',
          disabled: !activeTab || !activeTab.hasSavedVersion || !activeTab.isDirty,
          action: () => {
            if (activeTabId) {
              setDiffMode(true, activeTabId, undefined, true);
            }
          },
        },
        {
          id: 'diff-with-file',
          label: 'Compare Active File with...',
          disabled: !activeTab || tabs.length < 2,
          action: () => {
            const otherTab = tabs.find(t => t.id !== activeTabId);
            if (activeTabId && otherTab) {
              setDiffMode(true, activeTabId, otherTab.id, false);
            }
          },
        },
        {
          id: 'diff-exit',
          label: 'Exit Diff View',
          disabled: splitMode !== 'diff',
          action: exitDiffMode,
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
}
