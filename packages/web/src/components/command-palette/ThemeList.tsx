import { Palette } from 'lucide-react';
import clsx from 'clsx';
import { THEMES } from '../../utils/themes';

interface ThemeListProps {
  themes: typeof THEMES;
  selectedIndex: number;
  currentTheme: string;
  onSelect: (index: number) => void;
  onSelectIndexChange: (index: number) => void;
}

/**
 * List component for displaying themes in the command palette
 * 
 * Shows all available themes with a checkmark for the current theme
 */
export function ThemeList({
  themes,
  selectedIndex,
  currentTheme,
  onSelect,
  onSelectIndexChange,
}: ThemeListProps) {
  return (
    <>
      {themes.map((t, index) => (
        <div
          key={t.id}
          className={clsx(
            'command-palette-item',
            index === selectedIndex && 'selected'
          )}
          onClick={() => onSelect(index)}
          onMouseEnter={() => onSelectIndexChange(index)}
        >
          <Palette size={16} />
          <span>{t.name}</span>
          {currentTheme === t.id && (
            <span className="ml-auto text-xs opacity-60">Current</span>
          )}
        </div>
      ))}
    </>
  );
}

