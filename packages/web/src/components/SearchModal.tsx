import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { Search, FileText, Cloud, X } from 'lucide-react';
import clsx from 'clsx';

interface SearchResult {
  type: 'tab' | 'cloud';
  id: string;
  title: string;
  matches: Array<{
    line: number;
    content: string;
    matchStart: number;
    matchEnd: number;
  }>;
}

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const { tabs, cloudDocuments, setActiveTab, openCloudDocument } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search across documents
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    // Search in open tabs
    tabs.forEach((tab) => {
      const matches = findMatches(tab.content, searchQuery);
      if (matches.length > 0 || tab.title.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          type: 'tab',
          id: tab.id,
          title: tab.title,
          matches: matches.slice(0, 3), // Limit matches per file
        });
      }
    });

    // Search in cloud documents (by title only for now)
    cloudDocuments.forEach((doc) => {
      if (doc.title.toLowerCase().includes(searchQuery)) {
        // Check if already in tabs
        const inTabs = tabs.some((t) => t.documentId === doc.id);
        if (!inTabs) {
          searchResults.push({
            type: 'cloud',
            id: doc.id,
            title: doc.title,
            matches: [],
          });
        }
      }
    });

    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, tabs, cloudDocuments]);

  // Find matches in content
  function findMatches(content: string, query: string) {
    const lines = content.split('\n');
    const matches: SearchResult['matches'] = [];

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      let pos = 0;
      
      while ((pos = lowerLine.indexOf(query, pos)) !== -1) {
        matches.push({
          line: index + 1,
          content: line,
          matchStart: pos,
          matchEnd: pos + query.length,
        });
        pos += query.length;
      }
    });

    return matches;
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(results[selectedIndex]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'tab') {
      setActiveTab(result.id);
    } else {
      openCloudDocument(result.id);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '600px', maxHeight: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-tab-border px-4 py-2">
          <Search size={18} className="opacity-50 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--editor-fg)' }}
            placeholder="Search in all documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover ml-2"
          >
            <X size={16} />
          </button>
        </div>

        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: '400px' }}
        >
          {results.length === 0 && query && (
            <div
              className="p-8 text-center opacity-50"
              style={{ color: 'var(--editor-fg)' }}
            >
              No results found
            </div>
          )}

          {results.length === 0 && !query && (
            <div
              className="p-8 text-center opacity-50"
              style={{ color: 'var(--editor-fg)' }}
            >
              Start typing to search across all documents
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}`}
              className={clsx(
                'px-4 py-3 cursor-pointer border-b border-tab-border last:border-b-0',
                index === selectedIndex ? 'bg-sidebar-active' : 'hover:bg-sidebar-hover'
              )}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center gap-2 mb-1">
                {result.type === 'cloud' ? (
                  <Cloud size={14} className="opacity-60" />
                ) : (
                  <FileText size={14} className="opacity-60" />
                )}
                <span
                  className="font-medium"
                  style={{ color: 'var(--editor-fg)' }}
                >
                  {result.title}
                </span>
                <span className="text-xs opacity-40">
                  {result.type === 'cloud' ? 'Cloud' : 'Open'}
                </span>
              </div>

              {result.matches.length > 0 && (
                <div className="ml-6 space-y-1">
                  {result.matches.map((match, i) => (
                    <div
                      key={i}
                      className="text-sm flex items-center gap-2"
                      style={{ color: 'var(--editor-fg)' }}
                    >
                      <span className="opacity-40 w-8 text-right text-xs">
                        {match.line}
                      </span>
                      <span className="opacity-70 truncate">
                        {match.content.substring(0, match.matchStart)}
                        <mark
                          className="bg-yellow-500/30 text-inherit"
                          style={{ color: 'var(--editor-accent)' }}
                        >
                          {match.content.substring(match.matchStart, match.matchEnd)}
                        </mark>
                        {match.content.substring(match.matchEnd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="px-4 py-2 border-t border-tab-border text-xs opacity-50 flex gap-4"
          style={{ color: 'var(--editor-fg)' }}
        >
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}

