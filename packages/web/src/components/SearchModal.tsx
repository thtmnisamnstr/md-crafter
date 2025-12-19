import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { Search, FileText, Cloud, X, History, Filter } from 'lucide-react';
import { debounce } from '@md-crafter/shared';
import clsx from 'clsx';

interface SearchResult {
  type: 'tab' | 'cloud';
  id: string;
  title: string;
  matches: Array<{
    line: number;
    content: string;
    contextBefore: string;
    contextAfter: string;
    matchStart: number;
    matchEnd: number;
  }>;
}

type SearchFilter = 'all' | 'open' | 'cloud';

interface SearchModalProps {
  onClose: () => void;
}

// Search history from localStorage
const SEARCH_HISTORY_KEY = 'md-crafter-search-history';
const MAX_HISTORY = 10;

function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string) {
  if (!query.trim()) return;
  const history = getSearchHistory();
  const filtered = history.filter((h) => h !== query);
  filtered.unshift(query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
}

export function SearchModal({ onClose }: SearchModalProps) {
  const { tabs, cloudDocuments, setActiveTab, openCloudDocument, isAuthenticated } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory] = useState(getSearchHistory);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const performSearch = useMemo(
    () =>
      debounce((searchQuery: string) => {
        if (!searchQuery.trim()) {
          setResults([]);
          setShowHistory(true);
          return;
        }

        setShowHistory(false);
        const searchResults: SearchResult[] = [];
        const lowerQuery = searchQuery.toLowerCase();

        // Search in open tabs (if filter allows)
        if (filter === 'all' || filter === 'open') {
          tabs.forEach((tab) => {
            const matches = findMatches(tab.content, lowerQuery);
            if (matches.length > 0 || tab.title.toLowerCase().includes(lowerQuery)) {
              searchResults.push({
                type: 'tab',
                id: tab.id,
                title: tab.title,
                matches: matches.slice(0, 3), // Limit matches per file
              });
            }
          });
        }

        // Search in cloud documents (if filter allows)
        if ((filter === 'all' || filter === 'cloud') && isAuthenticated) {
          cloudDocuments.forEach((doc) => {
            // Check if already in tabs
            const inTabs = tabs.some((t) => t.documentId === doc.id);
            
            // Search in title and content
            const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
            const contentMatches = findMatches(doc.content, lowerQuery);
            
            if ((titleMatch || contentMatches.length > 0) && !inTabs) {
              searchResults.push({
                type: 'cloud',
                id: doc.id,
                title: doc.title,
                matches: contentMatches.slice(0, 3),
              });
            }
          });
        }

        setResults(searchResults);
        setSelectedIndex(0);
      }, 300),
    [tabs, cloudDocuments, filter, isAuthenticated]
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Trigger search when query changes
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Find matches in content with context
  function findMatches(content: string, query: string) {
    const lines = content.split('\n');
    const matches: SearchResult['matches'] = [];

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      let pos = 0;
      
      while ((pos = lowerLine.indexOf(query, pos)) !== -1) {
        // Get context lines (one before and one after)
        const contextBefore = index > 0 ? lines[index - 1].trim().substring(0, 50) : '';
        const contextAfter = index < lines.length - 1 ? lines[index + 1].trim().substring(0, 50) : '';
        
        matches.push({
          line: index + 1,
          content: line,
          contextBefore,
          contextAfter,
          matchStart: pos,
          matchEnd: pos + query.length,
        });
        pos += query.length;
      }
    });

    return matches;
  }

  // Handle selecting a result
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'tab') {
      setActiveTab(result.id);
    } else {
      openCloudDocument(result.id);
    }
    addToSearchHistory(query);
    onClose();
  }, [query, setActiveTab, openCloudDocument, onClose]);

  // Handle selecting from history
  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (showHistory) {
            setSelectedIndex((i) => Math.min(i + 1, searchHistory.length - 1));
          } else {
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (showHistory && searchHistory[selectedIndex]) {
            handleHistorySelect(searchHistory[selectedIndex]);
          } else if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Tab':
          e.preventDefault();
          // Cycle through filters
          setFilter((f) => {
            if (f === 'all') return 'open';
            if (f === 'open') return 'cloud';
            return 'all';
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onClose, showHistory, searchHistory, handleSelect]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '650px', maxHeight: '550px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
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
            onFocus={() => !query && setShowHistory(true)}
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-tab-border">
          <Filter size={14} className="opacity-50" />
          <button
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              filter === 'all' ? 'bg-editor-accent text-white' : 'hover:bg-sidebar-hover'
            )}
            style={{ color: filter === 'all' ? 'white' : 'var(--editor-fg)' }}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              filter === 'open' ? 'bg-editor-accent text-white' : 'hover:bg-sidebar-hover'
            )}
            style={{ color: filter === 'open' ? 'white' : 'var(--editor-fg)' }}
            onClick={() => setFilter('open')}
          >
            Open Files
          </button>
          <button
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              filter === 'cloud' ? 'bg-editor-accent text-white' : 'hover:bg-sidebar-hover',
              !isAuthenticated && 'opacity-50 cursor-not-allowed'
            )}
            style={{ color: filter === 'cloud' ? 'white' : 'var(--editor-fg)' }}
            onClick={() => isAuthenticated && setFilter('cloud')}
            disabled={!isAuthenticated}
          >
            Cloud
          </button>
          <span className="text-xs opacity-40 ml-auto" style={{ color: 'var(--editor-fg)' }}>
            Tab to switch filters
          </span>
        </div>

        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: '380px' }}
        >
          {/* Search history */}
          {showHistory && searchHistory.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs opacity-50 flex items-center gap-2" style={{ color: 'var(--editor-fg)' }}>
                <History size={12} />
                Recent Searches
              </div>
              {searchHistory.map((historyItem, index) => (
                <div
                  key={`history-${index}`}
                  className={clsx(
                    'px-4 py-2 cursor-pointer flex items-center gap-2',
                    index === selectedIndex ? 'bg-sidebar-active' : 'hover:bg-sidebar-hover'
                  )}
                  onClick={() => handleHistorySelect(historyItem)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <History size={14} className="opacity-40" />
                  <span style={{ color: 'var(--editor-fg)' }}>{historyItem}</span>
                </div>
              ))}
            </>
          )}

          {results.length === 0 && query && (
            <div
              className="p-8 text-center opacity-50"
              style={{ color: 'var(--editor-fg)' }}
            >
              No results found for "{query}"
            </div>
          )}

          {results.length === 0 && !query && !showHistory && (
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

