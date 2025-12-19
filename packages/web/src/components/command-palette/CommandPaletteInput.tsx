import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface CommandPaletteInputProps {
  search: string;
  mode: 'commands' | 'themes' | 'files';
  onSearchChange: (value: string) => void;
  onModeChange: (mode: 'commands' | 'themes' | 'files') => void;
}

/**
 * Input component for the command palette
 * 
 * Handles search input, mode switching, and special input patterns (@ for files, > for commands)
 */
export function CommandPaletteInput({
  search,
  mode,
  onSearchChange,
  onModeChange,
}: CommandPaletteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleInputChange = (value: string) => {
    if (value === '>') {
      onModeChange('commands');
      onSearchChange('');
      return;
    }
    if (value.startsWith('@')) {
      onModeChange('files');
      onSearchChange(value.slice(1));
      return;
    }
    onSearchChange(value);
  };

  return (
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
            onModeChange('commands');
            onSearchChange('');
          }}
          className="mr-3 p-1 rounded hover:bg-sidebar-hover"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

