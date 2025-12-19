import { X } from 'lucide-react';
import clsx from 'clsx';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'file' | 'view' | 'sync' | 'settings' | 'recent';
}

interface CommandListProps {
  commands: Command[];
  selectedIndex: number;
  recentFiles: Array<{ id: string; title: string }>;
  onSelect: (index: number) => void;
  onSelectIndexChange: (index: number) => void;
  onRemoveRecentFile: (id: string) => void;
}

/**
 * List component for displaying commands in the command palette
 * 
 * Shows all available commands with icons, labels, shortcuts, and handles recent file removal
 */
export function CommandList({
  commands,
  selectedIndex,
  recentFiles,
  onSelect,
  onSelectIndexChange,
  onRemoveRecentFile,
}: CommandListProps) {
  return (
    <>
      {commands.map((cmd, index) => {
        const isRecentFile = cmd.category === 'recent';
        const fileIndex = isRecentFile ? parseInt(cmd.id.replace('recent-', '')) : -1;
        const recentFile = isRecentFile && fileIndex >= 0 ? recentFiles[fileIndex] : null;
        
        return (
          <div
            key={cmd.id}
            className={clsx(
              'command-palette-item group',
              index === selectedIndex && 'selected'
            )}
            onClick={() => onSelect(index)}
            onMouseEnter={() => onSelectIndexChange(index)}
          >
            {cmd.icon}
            <span className="flex-1">{cmd.label}</span>
            {cmd.shortcut && (
              <span className="shortcut">{cmd.shortcut}</span>
            )}
            {isRecentFile && recentFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveRecentFile(recentFile.id);
                }}
                className="ml-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 rounded hover:bg-sidebar-hover"
                title="Remove from recent files"
                aria-label="Remove from recent files"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      {commands.length === 0 && (
        <div className="px-4 py-3 text-sm opacity-50">
          No commands found
        </div>
      )}
    </>
  );
}

