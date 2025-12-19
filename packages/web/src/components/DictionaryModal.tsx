import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { X, Plus, Trash2, Download, Upload, Search, BookOpen, Eye } from 'lucide-react';
import { SpellcheckService } from '../services/spellcheck';
import { getSupplementaryDictionaries } from '../data/supplementary-dictionaries';
import { logger } from '@md-crafter/shared';

type TabType = 'custom' | 'ignored' | 'builtin';

export function DictionaryModal() {
  const { showDictionaryModal, setShowDictionaryModal } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [newWord, setNewWord] = useState('');
  const [selectedBuiltinDict, setSelectedBuiltinDict] = useState<string | null>(null);
  
  // Force re-render when dictionary changes
  const [, setForceUpdate] = useState(0);
  const forceUpdate = () => setForceUpdate((n) => n + 1);
  
  const spellcheckService = SpellcheckService.getInstance();
  const supplementaryDictionaries = useMemo(() => getSupplementaryDictionaries(), []);
  
  const customWords = spellcheckService.getCustomDictionary();
  const ignoredWords = spellcheckService.getIgnoredWords();
  
  // Filter words based on search
  const filteredCustomWords = useMemo(() => {
    if (!searchQuery) return customWords;
    return customWords.filter((word) =>
      word.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customWords, searchQuery]);
  
  const filteredIgnoredWords = useMemo(() => {
    if (!searchQuery) return ignoredWords;
    return ignoredWords.filter((word) =>
      word.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ignoredWords, searchQuery]);
  
  // Get selected builtin dictionary words
  const selectedBuiltinDictionary = useMemo(() => {
    if (!selectedBuiltinDict) return null;
    return supplementaryDictionaries.find((d) => d.id === selectedBuiltinDict);
  }, [selectedBuiltinDict, supplementaryDictionaries]);
  
  const filteredBuiltinWords = useMemo(() => {
    if (!selectedBuiltinDictionary) return [];
    const words = selectedBuiltinDictionary.words;
    if (!searchQuery) return words.slice(0, 500); // Limit for performance
    return words.filter((word) =>
      word.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 500);
  }, [selectedBuiltinDictionary, searchQuery]);
  
  if (!showDictionaryModal) return null;
  
  const handleAddWord = () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    
    if (activeTab === 'custom') {
      spellcheckService.addToDictionary(word);
    } else if (activeTab === 'ignored') {
      spellcheckService.addToIgnore(word);
    }
    
    setNewWord('');
    forceUpdate();
  };
  
  const handleRemoveWord = (word: string) => {
    if (activeTab === 'custom') {
      spellcheckService.removeFromDictionary(word);
    } else if (activeTab === 'ignored') {
      spellcheckService.removeFromIgnore(word);
    }
    
    forceUpdate();
  };
  
  const handleExport = () => {
    const data = activeTab === 'custom' ? customWords : ignoredWords;
    const content = data.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-dictionary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const words = text
          .split('\n')
          .map((line) => line.trim().toLowerCase())
          .filter((line) => line && !line.startsWith('#'));
        
        if (activeTab === 'custom') {
          words.forEach((word) => spellcheckService.addToDictionary(word));
        } else if (activeTab === 'ignored') {
          words.forEach((word) => spellcheckService.addToIgnore(word));
        }
        
        forceUpdate();
        logger.info(`Imported ${words.length} words`);
      } catch (error) {
        logger.error('Failed to import dictionary', error);
      }
    };
    input.click();
  };
  
  const handleClose = () => {
    // Refresh spellcheck when modal closes to apply all dictionary changes
    spellcheckService.refreshSpellcheck();
    setShowDictionaryModal(false);
  };
  
  const totalSupplementaryWords = supplementaryDictionaries.reduce(
    (sum, d) => sum + d.wordCount,
    0
  );
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex-shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Dictionary Management
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-48 border-r border-tab-border flex-shrink-0 flex flex-col">
            <div className="p-2 space-y-1">
              <TabButton
                active={activeTab === 'custom'}
                onClick={() => {
                  setActiveTab('custom');
                  setSelectedBuiltinDict(null);
                }}
                icon={<BookOpen size={16} />}
                label="Custom Dictionary"
                count={customWords.length}
              />
              <TabButton
                active={activeTab === 'ignored'}
                onClick={() => {
                  setActiveTab('ignored');
                  setSelectedBuiltinDict(null);
                }}
                icon={<Eye size={16} />}
                label="Ignored Words"
                count={ignoredWords.length}
              />
            </div>
            
            <div className="border-t border-tab-border mt-2 pt-2 px-2">
              <div
                className="text-xs font-medium opacity-60 mb-2 px-2"
                style={{ color: 'var(--editor-fg)' }}
              >
                Built-in Dictionaries
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {supplementaryDictionaries.map((dict) => (
                  <TabButton
                    key={dict.id}
                    active={activeTab === 'builtin' && selectedBuiltinDict === dict.id}
                    onClick={() => {
                      setActiveTab('builtin');
                      setSelectedBuiltinDict(dict.id);
                    }}
                    label={dict.name}
                    count={dict.wordCount}
                    small
                  />
                ))}
              </div>
            </div>
            
            <div className="mt-auto p-2 border-t border-tab-border">
              <div
                className="text-xs opacity-60 text-center"
                style={{ color: 'var(--editor-fg)' }}
              >
                {totalSupplementaryWords.toLocaleString()} words loaded
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search and actions */}
            <div className="p-3 border-b border-tab-border flex items-center gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search words..."
                  className="input w-full pl-9"
                  style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    color: 'var(--editor-fg)',
                    borderColor: 'var(--tab-border)',
                  }}
                />
              </div>
              
              {activeTab !== 'builtin' && (
                <>
                  <button
                    onClick={handleExport}
                    className="btn btn-ghost flex items-center gap-1"
                    title="Export"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={handleImport}
                    className="btn btn-ghost flex items-center gap-1"
                    title="Import"
                  >
                    <Upload size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Add word input (only for custom and ignored) */}
            {activeTab !== 'builtin' && (
              <div className="p-3 border-b border-tab-border flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddWord();
                  }}
                  placeholder={`Add word to ${activeTab === 'custom' ? 'dictionary' : 'ignore list'}...`}
                  className="input flex-1"
                  style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    color: 'var(--editor-fg)',
                    borderColor: 'var(--tab-border)',
                  }}
                />
                <button
                  onClick={handleAddWord}
                  disabled={!newWord.trim()}
                  className="btn btn-primary flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            )}

            {/* Built-in dictionary description */}
            {activeTab === 'builtin' && selectedBuiltinDictionary && (
              <div className="p-3 border-b border-tab-border flex-shrink-0">
                <div className="text-sm font-medium" style={{ color: 'var(--editor-fg)' }}>
                  {selectedBuiltinDictionary.name}
                </div>
                <div
                  className="text-xs opacity-60 mt-1"
                  style={{ color: 'var(--editor-fg)' }}
                >
                  {selectedBuiltinDictionary.description} •{' '}
                  {selectedBuiltinDictionary.wordCount.toLocaleString()} words
                </div>
              </div>
            )}

            {/* Word list */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === 'custom' && (
                <WordList
                  words={filteredCustomWords}
                  onRemove={handleRemoveWord}
                  emptyMessage="No custom words added yet"
                />
              )}
              
              {activeTab === 'ignored' && (
                <WordList
                  words={filteredIgnoredWords}
                  onRemove={handleRemoveWord}
                  emptyMessage="No ignored words yet"
                />
              )}
              
              {activeTab === 'builtin' && selectedBuiltinDictionary && (
                <WordList
                  words={filteredBuiltinWords}
                  readonly
                  emptyMessage="Select a dictionary to view its words"
                />
              )}
              
              {activeTab === 'builtin' && !selectedBuiltinDictionary && (
                <div
                  className="text-sm opacity-60 text-center py-8"
                  style={{ color: 'var(--editor-fg)' }}
                >
                  Select a built-in dictionary from the sidebar to view its words
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer flex-shrink-0">
          <button
            onClick={handleClose}
            className="btn btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  count?: number;
  small?: boolean;
}

function TabButton({ active, onClick, icon, label, count, small }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded transition-colors flex items-center gap-2 ${
        small ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
      } ${active ? 'bg-sidebar-active' : 'hover:bg-sidebar-hover'}`}
      style={{ color: 'var(--editor-fg)' }}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="opacity-50 text-xs">{count}</span>
      )}
    </button>
  );
}

interface WordListProps {
  words: string[];
  onRemove?: (word: string) => void;
  readonly?: boolean;
  emptyMessage: string;
}

function WordList({ words, onRemove, readonly, emptyMessage }: WordListProps) {
  if (words.length === 0) {
    return (
      <div
        className="text-sm opacity-60 text-center py-8"
        style={{ color: 'var(--editor-fg)' }}
      >
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-1">
      {words.map((word) => (
        <div
          key={word}
          className={`flex items-center justify-between px-3 py-1.5 rounded text-sm ${
            readonly ? 'bg-sidebar-bg' : 'bg-sidebar-hover'
          }`}
          style={{ color: 'var(--editor-fg)' }}
        >
          <span>{word}</span>
          {!readonly && onRemove && (
            <button
              onClick={() => onRemove(word)}
              className="ml-2 p-1 rounded hover:bg-tab-bg opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

