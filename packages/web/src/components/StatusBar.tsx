import { useMemo } from 'react';
import { useStore } from '../store';
import { 
  Cloud, 
  Wifi, 
  WifiOff, 
  Eye, 
  EyeOff,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import clsx from 'clsx';
import { getSyncStatusLabel, countWords, countCharacters } from '@md-crafter/shared';
import { useEditorSelection } from '../hooks/useEditorSelection';

export function StatusBar() {
  const { 
    tabs, 
    activeTabId, 
    isOnline, 
    isAuthenticated,
    showSidebar,
    showPreview,
    toggleSidebar,
    togglePreview,
  } = useStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isMarkdown = activeTab?.language === 'markdown' || activeTab?.title.endsWith('.md');
  const tabShowPreview = activeTab?.showPreview ?? showPreview;

  // Track editor selection
  const selectionStats = useEditorSelection();

  // Calculate document statistics (memoized for performance)
  const documentStats = useMemo(() => {
    const content = activeTab?.content || '';
    return {
      lineCount: content.split('\n').length,
      wordCount: countWords(content),
      charCount: countCharacters(content),
    };
  }, [activeTab?.content]);

  return (
    <div 
      className="h-6 flex items-center justify-between px-2 text-xs border-t"
      style={{ 
        background: 'var(--status-bg)', 
        color: 'var(--status-fg)',
        borderColor: 'var(--tab-border)',
      }}
      role="status"
      aria-label="Status bar"
    >
      {/* Left side */}
      <div className="flex items-center gap-3" role="group" aria-label="Controls">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="hover:opacity-80 transition-opacity"
          title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          aria-label={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          aria-pressed={showSidebar}
        >
          {showSidebar ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-1" title={isOnline ? 'Online' : 'Offline'}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Auth status */}
        {isAuthenticated && (
          <div className="flex items-center gap-1" title="Signed in">
            <Cloud size={12} />
            <span>Syncing enabled</span>
          </div>
        )}
      </div>

      {/* Center - file info */}
      {activeTab && (
        <div className="flex items-center gap-3">
          {/* Language */}
          <span className="opacity-80">{activeTab.language}</span>
          {selectionStats?.position && (
            <>
              <span className="opacity-60">|</span>
              <span className="opacity-80">
                Ln {selectionStats.position.line}, Col {selectionStats.position.column}
              </span>
            </>
          )}
          
          {/* Document and selection word and character count */}
          <span>{documentStats.lineCount} lines</span>
          <span>{documentStats.wordCount} words</span>
          <span>{documentStats.charCount} chars</span>
          {selectionStats && (
            <>
              <span className="opacity-60">|</span>
              <span className="opacity-80">
                {selectionStats.wordCount} words selected
              </span>
              <span className="opacity-80">
                {selectionStats.charCount} chars selected
              </span>
            </>
          )}
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Sync status */}
        {activeTab && activeTab.isCloudSynced && (
          <div 
            className={clsx(
              'flex items-center gap-1',
              activeTab.syncStatus === 'synced' && 'text-green-200',
              activeTab.syncStatus === 'syncing' && 'text-blue-200',
              activeTab.syncStatus === 'pending' && 'text-yellow-200',
              activeTab.syncStatus === 'conflict' && 'text-red-200'
            )}
          >
            <Cloud size={12} />
            <span>{getSyncStatusLabel(activeTab.syncStatus)}</span>
          </div>
        )}

        {/* Preview toggle for markdown */}
        {isMarkdown && (
          <button
            onClick={togglePreview}
            className="hover:opacity-80 transition-opacity flex items-center gap-1"
            title={tabShowPreview ? 'Hide Preview' : 'Show Preview'}
            aria-label={tabShowPreview ? 'Hide Preview' : 'Show Preview'}
            aria-pressed={tabShowPreview}
          >
            {tabShowPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>Preview</span>
          </button>
        )}

        {/* Dirty indicator */}
        {activeTab?.isDirty && (
          <span className="text-yellow-200">● Unsaved</span>
        )}
      </div>
    </div>
  );
}
