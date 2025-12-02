import { useState } from 'react';
import { useStore } from '../store';
import { 
  Cloud, 
  FileText, 
  Plus, 
  RefreshCw, 
  Trash2, 
  LogIn, 
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  File
} from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const { 
    isAuthenticated, 
    cloudDocuments, 
    tabs,
    activeTabId,
    createNewDocument, 
    openCloudDocument,
    deleteCloudDocument,
    loadCloudDocuments,
    setShowAuth,
    setShowSettings,
    logout,
    setActiveTab,
  } = useStore();

  const [showCloudDocs, setShowCloudDocs] = useState(true);
  const [showOpenTabs, setShowOpenTabs] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await loadCloudDocuments();
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this document permanently?')) {
      await deleteCloudDocument(docId);
    }
  };

  return (
    <nav className="sidebar h-full flex flex-col" role="navigation" aria-label="File explorer">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tab-border">
        <span className="font-semibold text-sm">md-edit</span>
        <div className="flex items-center gap-1" role="toolbar" aria-label="File actions">
          <button
            onClick={createNewDocument}
            className="p-1.5 rounded hover:bg-sidebar-hover"
            title="New Document"
            aria-label="Create new document"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded hover:bg-sidebar-hover"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Open Tabs Section */}
        <div className="sidebar-section">
          <button
            className="sidebar-header w-full text-left flex items-center gap-1"
            onClick={() => setShowOpenTabs(!showOpenTabs)}
          >
            {showOpenTabs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>OPEN EDITORS</span>
            <span className="ml-auto opacity-50">{tabs.length}</span>
          </button>
          
          {showOpenTabs && (
            <div>
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={clsx('sidebar-item', tab.id === activeTabId && 'active')}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <File size={14} className="flex-shrink-0 opacity-60" />
                  <span className="truncate flex-1">{tab.title}</span>
                  {tab.isDirty && <span className="text-yellow-500">●</span>}
                </div>
              ))}
              {tabs.length === 0 && (
                <div className="px-3 py-2 text-sm opacity-50 italic">
                  No open editors
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cloud Documents Section */}
        <div className="sidebar-section mt-2">
          <div className="sidebar-header flex items-center">
            <button
              className="flex items-center gap-1 flex-1 text-left"
              onClick={() => setShowCloudDocs(!showCloudDocs)}
            >
              {showCloudDocs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Cloud size={12} />
              <span>CLOUD DOCUMENTS</span>
            </button>
            {isAuthenticated && (
              <button
                onClick={handleRefresh}
                className={clsx('p-1 rounded hover:bg-sidebar-hover', loading && 'animate-spin')}
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          {showCloudDocs && (
            <div>
              {!isAuthenticated ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm opacity-70 mb-3">
                    Sign in to sync your documents
                  </p>
                  <button
                    onClick={() => setShowAuth(true)}
                    className="btn btn-primary flex items-center gap-2 mx-auto"
                  >
                    <LogIn size={14} />
                    Sign In
                  </button>
                </div>
              ) : (
                <>
                  {cloudDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="sidebar-item group"
                      onClick={() => openCloudDocument(doc.id)}
                    >
                      <FileText size={14} className="flex-shrink-0 opacity-60" />
                      <span className="truncate flex-1">{doc.title}</span>
                      <button
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {cloudDocuments.length === 0 && (
                    <div className="px-3 py-2 text-sm opacity-50 italic">
                      No cloud documents
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {isAuthenticated && (
        <div className="border-t border-tab-border p-2">
          <button
            onClick={logout}
            className="sidebar-item w-full justify-center text-sm opacity-70 hover:opacity-100"
            aria-label="Sign out"
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
}

