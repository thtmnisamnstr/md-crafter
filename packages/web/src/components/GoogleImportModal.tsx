import { useState } from 'react';
import { useStore } from '../store';
import { X, Cloud, FileText, LogIn, AlertCircle, ExternalLink } from 'lucide-react';
import {
  isGoogleConfigured,
  isGoogleSignedIn,
  signInWithGoogle,
  openGooglePicker,
  exportGoogleDocAsMarkdown,
} from '../services/google';

interface GoogleImportModalProps {
  onClose: () => void;
}

export function GoogleImportModal({ onClose }: GoogleImportModalProps) {
  const { openTab, addToast } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(isGoogleSignedIn());
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);

  const copyEnvTemplate = () => {
    const template = `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key`;
    navigator.clipboard.writeText(template);
    addToast({ type: 'success', message: 'Environment template copied to clipboard' });
  };

  if (!isGoogleConfigured()) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
              Import from Google Docs
            </h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body py-6">
            <div className="text-center mb-6">
              <AlertCircle size={48} className="mx-auto mb-4" style={{ color: '#f59e0b' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
                Google API Not Configured
              </h3>
              <p className="text-sm opacity-70" style={{ color: 'var(--editor-fg)' }}>
                This feature requires Google API credentials to be configured by the administrator or deployer.
              </p>
            </div>

            <div
              className="text-left text-sm p-4 rounded mb-4"
              style={{ background: 'var(--sidebar-hover)', color: 'var(--editor-fg)' }}
            >
              <p className="font-medium mb-3">Setup Instructions:</p>
              <ol className="space-y-3 opacity-90">
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">1.</span>
                  <div>
                    <a
                      href="https://console.cloud.google.com/projectcreate"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--editor-accent)' }}
                    >
                      Create a Google Cloud Project <ExternalLink size={12} />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">2.</span>
                  <div>
                    <a
                      href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--editor-accent)' }}
                    >
                      Enable Google Drive API <ExternalLink size={12} />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">3.</span>
                  <div>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--editor-accent)' }}
                    >
                      Create OAuth 2.0 Credentials <ExternalLink size={12} />
                    </a>
                    <p className="text-xs opacity-60 mt-1">Create an OAuth 2.0 Client ID (Web application type)</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">4.</span>
                  <div>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--editor-accent)' }}
                    >
                      Create an API Key <ExternalLink size={12} />
                    </a>
                    <p className="text-xs opacity-60 mt-1">Restrict it to Google Drive API for security</p>
                  </div>
                </li>
              </ol>
            </div>

            <div
              className="text-sm p-4 rounded mb-4 border"
              style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--tab-border)', color: 'var(--editor-fg)' }}
            >
              <p className="font-medium mb-2">Required Environment Variables:</p>
              <code className="block text-xs p-2 rounded" style={{ background: 'var(--sidebar-hover)' }}>
                VITE_GOOGLE_CLIENT_ID=your-client-id<br />
                VITE_GOOGLE_API_KEY=your-api-key
              </code>
              <button
                onClick={copyEnvTemplate}
                className="mt-2 text-xs flex items-center gap-1 hover:underline"
                style={{ color: 'var(--editor-accent)' }}
              >
                Copy template to clipboard
              </button>
            </div>

            <p className="text-xs opacity-60 text-center" style={{ color: 'var(--editor-fg)' }}>
              For Docker deployments, see the{' '}
              <a
                href="https://github.com/md-edit/md-edit/blob/main/DOCKER.md#google-drive-integration"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--editor-accent)' }}
              >
                DOCKER.md documentation
              </a>
            </p>
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

