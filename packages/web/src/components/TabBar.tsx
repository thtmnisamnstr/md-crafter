import { useStore } from '../store';
import { X, FileText, Cloud } from 'lucide-react';
import clsx from 'clsx';
import { getSyncStatusIcon } from '@md-crafter/shared';
import { useCallback } from 'react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useStore();

  // Keyboard navigation for tabs
  const handleKeyDown = useCallback((e: React.KeyboardEvent, tabId: string, index: number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          setActiveTab(tabs[index - 1].id);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index < tabs.length - 1) {
          setActiveTab(tabs[index + 1].id);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        closeTab(tabId);
        break;
      case 'Home':
        e.preventDefault();
        if (tabs.length > 0) {
          setActiveTab(tabs[0].id);
        }
        break;
      case 'End':
        e.preventDefault();
        if (tabs.length > 0) {
          setActiveTab(tabs[tabs.length - 1].id);
        }
        break;
    }
  }, [tabs, setActiveTab, closeTab]);

  if (tabs.length === 0) {
    return (
      <div 
        className="h-9 bg-tab-bg border-b border-tab-border flex items-center px-4"
        role="tablist"
        aria-label="Open documents"
      >
        <span className="text-sm opacity-50">No open documents</span>
      </div>
    );
  }

  return (
    <div 
      className="flex bg-tab-bg border-b border-tab-border overflow-x-auto"
      role="tablist"
      aria-label="Open documents"
    >
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tab"
          tabIndex={tab.id === activeTabId ? 0 : -1}
          aria-selected={tab.id === activeTabId}
          aria-controls={`tabpanel-${tab.id}`}
          aria-label={`${tab.title}${tab.isDirty ? ' (unsaved changes)' : ''}${tab.isCloudSynced ? ' (cloud synced)' : ''}`}
          className={clsx(
            'tab group',
            tab.id === activeTabId && 'active'
          )}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
        >
          {/* Icon */}
          {tab.isCloudSynced ? (
            <Cloud size={14} className="flex-shrink-0 opacity-60" aria-hidden="true" />
          ) : (
            <FileText size={14} className="flex-shrink-0 opacity-60" aria-hidden="true" />
          )}

          {/* Title */}
          <span className="truncate max-w-[120px]">
            {tab.title}
          </span>

          {/* Dirty indicator */}
          {tab.isDirty && (
            <span 
              className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" 
              aria-label="Unsaved changes"
              role="status"
            />
          )}

          {/* Sync status */}
          {tab.isCloudSynced && tab.syncStatus !== 'synced' && (
            <span 
              className={clsx(
                'text-xs flex-shrink-0',
                tab.syncStatus === 'syncing' && 'text-blue-400',
                tab.syncStatus === 'pending' && 'text-yellow-400',
                tab.syncStatus === 'conflict' && 'text-red-400',
                tab.syncStatus === 'offline' && 'text-gray-400'
              )}
              title={tab.syncStatus}
              role="status"
              aria-label={`Sync status: ${tab.syncStatus}`}
            >
              {getSyncStatusIcon(tab.syncStatus)}
            </span>
          )}

          {/* Close button */}
          <button
            className="close-btn"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            aria-label={`Close ${tab.title}`}
            title="Close"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
