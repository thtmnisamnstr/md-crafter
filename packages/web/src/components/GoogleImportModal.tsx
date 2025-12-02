import { useState } from 'react';
import { useStore } from '../store';
import { X, Cloud, FileText, LogIn, AlertCircle } from 'lucide-react';
import {
  isGoogleConfigured,
  isGoogleSignedIn,
  signInWithGoogle,
  openGooglePicker,
  exportGoogleDocAsMarkdown,
  getGoogleFileMetadata,
} from '../services/google';

interface GoogleImportModalProps {
  onClose: () => void;
}

export function GoogleImportModal({ onClose }: GoogleImportModalProps) {
  const { openTab, addToast } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(isGoogleSignedIn());
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);

  if (!isGoogleConfigured()) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
              Import from Google Docs
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

  const handleSelectFile = async () => {
    setIsLoading(true);
    try {
      const doc = await openGooglePicker();
      if (doc) {
        setSelectedFile({ id: doc.id, name: doc.name });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to open file picker' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const markdown = await exportGoogleDocAsMarkdown(selectedFile.id);
      openTab({
        title: selectedFile.name + '.md',
        content: markdown,
        language: 'markdown',
      });
      addToast({ type: 'success', message: `Imported "${selectedFile.name}"` });
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to import document' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Import from Google Docs
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!isSignedIn ? (
            <div className="text-center py-8">
              <Cloud size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
                Connect to Google Drive
              </h3>
              <p className="text-sm opacity-70 mb-6" style={{ color: 'var(--editor-fg)' }}>
                Sign in with Google to import documents from Google Docs.
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
                Select a Google Doc to import as Markdown.
              </p>

              {selectedFile ? (
                <div className="flex items-center gap-4 p-4 rounded border border-tab-border mb-4">
                  <FileText size={32} className="opacity-60" />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: 'var(--editor-fg)' }}>
                      {selectedFile.name}
                    </p>
                    <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
                      Google Doc
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm opacity-60 hover:opacity-100"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSelectFile}
                  className="w-full p-8 border-2 border-dashed border-tab-border rounded-lg hover:border-editor-accent transition-colors"
                  disabled={isLoading}
                >
                  <Cloud size={32} className="mx-auto mb-2 opacity-50" />
                  <p style={{ color: 'var(--editor-fg)' }}>
                    {isLoading ? 'Loading...' : 'Click to select a document'}
                  </p>
                </button>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          {isSignedIn && selectedFile && (
            <button
              onClick={handleImport}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

