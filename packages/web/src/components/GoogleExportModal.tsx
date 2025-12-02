import { useState } from 'react';
import { useStore } from '../store';
import { X, Cloud, Upload, LogIn, AlertCircle, ExternalLink } from 'lucide-react';
import {
  isGoogleConfigured,
  isGoogleSignedIn,
  signInWithGoogle,
  createGoogleDocFromMarkdown,
} from '../services/google';

interface GoogleExportModalProps {
  onClose: () => void;
}

export function GoogleExportModal({ onClose }: GoogleExportModalProps) {
  const { tabs, activeTabId, addToast } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(isGoogleSignedIn());
  const [createdDoc, setCreatedDoc] = useState<{ id: string; webViewLink: string } | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    onClose();
    return null;
  }

  if (!isGoogleConfigured()) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
              Export to Google Drive
            </h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body text-center py-8">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
              Google API Not Configured
            </h3>
            <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
              To use Google Drive integration, you need to configure the Google API credentials.
            </p>
            <div
              className="text-left text-sm p-4 rounded"
              style={{ background: 'var(--sidebar-hover)', color: 'var(--editor-fg)' }}
            >
              <p className="font-medium mb-2">Setup instructions:</p>
              <ol className="list-decimal list-inside space-y-1 opacity-70">
                <li>Create a project in Google Cloud Console</li>
                <li>Enable the Google Drive API</li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Add VITE_GOOGLE_CLIENT_ID to your .env file</li>
                <li>Add VITE_GOOGLE_API_KEY to your .env file</li>
              </ol>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      setIsSignedIn(true);
      addToast({ type: 'success', message: 'Connected to Google Drive' });
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to sign in with Google' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await createGoogleDocFromMarkdown(activeTab.title, activeTab.content);
      setCreatedDoc(result);
      addToast({ type: 'success', message: 'Exported to Google Drive!' });
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to export to Google Drive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Export to Google Drive
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {createdDoc ? (
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--editor-accent)' }}
              >
                <Cloud size={32} className="text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
                Document Created!
              </h3>
              <p className="text-sm opacity-70 mb-6" style={{ color: 'var(--editor-fg)' }}>
                Your document has been exported to Google Drive.
              </p>
              <a
                href={createdDoc.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Open in Google Docs
              </a>
            </div>
          ) : !isSignedIn ? (
            <div className="text-center py-8">
              <Cloud size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
                Connect to Google Drive
              </h3>
              <p className="text-sm opacity-70 mb-6" style={{ color: 'var(--editor-fg)' }}>
                Sign in with Google to export documents to Google Drive.
              </p>
              <button
                onClick={handleSignIn}
                className="btn btn-primary flex items-center gap-2 mx-auto"
                disabled={isLoading}
              >
                <LogIn size={16} />
                {isLoading ? 'Connecting...' : 'Sign in with Google'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
                Export "{activeTab.title}" as a Google Doc to your Google Drive.
              </p>

              <div className="flex items-center gap-4 p-4 rounded border border-tab-border">
                <Cloud size={32} className="opacity-60" />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--editor-fg)' }}>
                    {activeTab.title.replace(/\.(md|mdx|markdown)$/i, '')}
                  </p>
                  <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
                    Will be created as a Google Doc
                  </p>
                </div>
              </div>

              <div
                className="mt-4 text-sm p-3 rounded"
                style={{ background: 'var(--sidebar-hover)', color: 'var(--editor-fg)' }}
              >
                <p className="opacity-70">
                  Your markdown will be converted to formatted text in Google Docs. Headings, lists,
                  bold, italic, links, and code blocks will be preserved.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            {createdDoc ? 'Close' : 'Cancel'}
          </button>
          {isSignedIn && !createdDoc && (
            <button
              onClick={handleExport}
              className="btn btn-primary flex items-center gap-2"
              disabled={isLoading}
            >
              <Upload size={16} />
              {isLoading ? 'Exporting...' : 'Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

