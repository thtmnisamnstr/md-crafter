import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { THEMES } from '../utils/themes';
import { CommandPaletteInput } from './command-palette/CommandPaletteInput';
import { CommandList } from './command-palette/CommandList';
import { ThemeList } from './command-palette/ThemeList';
import { FileList } from './command-palette/FileList';
import { useCommands, type Command } from './command-palette/useCommands';

export function CommandPalette() {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'commands' | 'themes' | 'files'>('commands');
  const listRef = useRef<HTMLDivElement>(null);

  const {
    setShowCommandPalette,
    theme,
    setTheme,
    tabs,
    cloudDocuments,
    openCloudDocument,
    recentFiles,
    removeRecentFile,
  } = useStore();

  // Build commands list using hook
  const allCommands = useCommands(setShowCommandPalette);
  
  // Update "change-theme" command action to switch to themes mode
  const commands = useMemo(() => {
    return allCommands.map(cmd => {
      if (cmd.id === 'change-theme') {
        return {
          ...cmd,
          action: () => {
            setMode('themes');
            setSearch('');
            setSelectedIndex(0);
          },
        };
      }
      return cmd;
    });
  }, [allCommands]);

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


  return (
    <div
      className="command-palette-overlay"
      onClick={() => setShowCommandPalette(false)}
    >
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <CommandPaletteInput
          search={search}
          mode={mode}
          onSearchChange={setSearch}
          onModeChange={setMode}
        />

        <div ref={listRef} className="command-palette-list">
          {mode === 'themes' && (
            <ThemeList
              themes={filteredItems as typeof THEMES}
              selectedIndex={selectedIndex}
              currentTheme={theme}
              onSelect={handleSelect}
              onSelectIndexChange={setSelectedIndex}
            />
          )}

          {mode === 'files' && (
            <FileList
              files={filteredItems as Array<{ type: 'tab' | 'cloud'; id: string; title: string }>}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              onSelectIndexChange={setSelectedIndex}
            />
          )}

          {mode === 'commands' && (
            <CommandList
              commands={filteredItems as Command[]}
              selectedIndex={selectedIndex}
              recentFiles={recentFiles}
              onSelect={handleSelect}
              onSelectIndexChange={setSelectedIndex}
              onRemoveRecentFile={removeRecentFile}
            />
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
