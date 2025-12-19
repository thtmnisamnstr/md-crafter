import { FileText, Cloud } from 'lucide-react';
import clsx from 'clsx';

interface FileItem {
  type: 'tab' | 'cloud';
  id: string;
  title: string;
}

interface FileListProps {
  files: FileItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSelectIndexChange: (index: number) => void;
}

/**
 * List component for displaying files in the command palette
 * 
 * Shows open tabs and cloud documents with appropriate icons
 */
export function FileList({
  files,
  selectedIndex,
  onSelect,
  onSelectIndexChange,
}: FileListProps) {
  return (
    <>
      {files.map((item, index) => (
        <div
          key={`${item.type}-${item.id}`}
          className={clsx(
            'command-palette-item',
            index === selectedIndex && 'selected'
          )}
          onClick={() => onSelect(index)}
          onMouseEnter={() => onSelectIndexChange(index)}
        >
          {item.type === 'cloud' ? <Cloud size={16} /> : <FileText size={16} />}
          <span>{item.title}</span>
          <span className="ml-auto text-xs opacity-50">
            {item.type === 'cloud' ? 'Cloud' : 'Open'}
          </span>
        </div>
      ))}
      {files.length === 0 && (
        <div className="px-4 py-3 text-sm opacity-50">
          No files found
        </div>
      )}
    </>
  );
}

