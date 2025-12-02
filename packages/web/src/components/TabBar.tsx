import { useStore } from '../store';
import { X, FileText, Cloud, CloudOff } from 'lucide-react';
import clsx from 'clsx';
import { getSyncStatusIcon } from '@md-edit/shared';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useStore();

  if (tabs.length === 0) {
    return (
      <div className="h-9 bg-tab-bg border-b border-tab-border flex items-center px-4">
        <span className="text-sm opacity-50">No open documents</span>
      </div>
    );
  }

  return (
    <div className="flex bg-tab-bg border-b border-tab-border overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={clsx(
            'tab group',
            tab.id === activeTabId && 'active'
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          {/* Icon */}
          {tab.isCloudSynced ? (
            <Cloud size={14} className="flex-shrink-0 opacity-60" />
          ) : (
            <FileText size={14} className="flex-shrink-0 opacity-60" />
          )}

          {/* Title */}
          <span className="truncate max-w-[120px]">
            {tab.title}
          </span>

          {/* Dirty indicator */}
          {tab.isDirty && (
            <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
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
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

