import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Key, Copy, Check, Server, Link2 } from 'lucide-react';
import { isElectron } from '../utils/platform';
import { api } from '../services/api';

export function AuthModal() {
  const { setShowAuth, login, generateToken } = useStore();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  
  // Determine platform mode
  const inDesktop = isElectron();
  
  // Load saved server URL on desktop
  useEffect(() => {
    if (inDesktop) {
      const savedUrl = localStorage.getItem('md-edit-server-url');
      if (savedUrl) {
        setServerUrl(savedUrl);
      }
    }
  }, [inDesktop]);

  // Desktop: Sign in with API token and server URL
  const handleDesktopLogin = async () => {
    if (!token.trim()) {
      setError('Please enter your API token');
      return;
    }
    if (!serverUrl.trim()) {
      setError('Please enter the server URL');
      return;
    }
    
    // Validate URL format
    try {
      new URL(serverUrl);
    } catch {
      setError('Please enter a valid server URL (e.g., https://your-server.com)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Save the server URL
    localStorage.setItem('md-edit-server-url', serverUrl.trim());
    
    // Update the API base URL
    api.setBaseUrl(serverUrl.trim());
    
    const success = await login(token.trim());
    
    setLoading(false);
    
    if (!success) {
      setError('Invalid API token or unable to connect to server');
    }
  };

  // Web: Generate a new API token
  const handleWebGenerate = async () => {
    setLoading(true);
    setError('');
    
    const newToken = await generateToken(email.trim() || undefined);
    
    setLoading(false);
    
    if (newToken) {
      setGeneratedToken(newToken);
    } else {
      setError('Failed to generate token');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseToken = async () => {
    if (generatedToken) {
      await login(generatedToken);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowAuth(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            {inDesktop ? 'Connect to Cloud' : 'Cloud Sync Setup'}
          </h2>
          <button
            onClick={() => setShowAuth(false)}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {inDesktop ? (
            // DESKTOP MODE: Sign in with API token and server URL
            <div>
              <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
                Connect to your md-edit cloud instance to sync documents across devices.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--editor-fg)' }}>
                  Server URL
                </label>
                <div className="relative">
                  <Server size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="url"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="input pl-10"
                    placeholder="https://your-md-edit-server.com"
                  />
                </div>
                <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--editor-fg)' }}>
                  The URL of your md-edit cloud server
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--editor-fg)' }}>
                  API Token
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDesktopLogin()}
                    className="input pl-10"
                    placeholder="Enter your API token"
                  />
                </div>
                <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--editor-fg)' }}>
                  Get this from your cloud instance's web interface
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handleDesktopLogin}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
              
              <div className="mt-4 pt-4 border-t border-tab-border">
                <p className="text-xs opacity-50 text-center" style={{ color: 'var(--editor-fg)' }}>
                  Don't have an account? Generate an API token from your cloud server's web interface.
                </p>
              </div>
            </div>
          ) : (
            // WEB MODE: Generate API token only
            <div>
              {!generatedToken ? (
                <>
                  <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
                    Generate an API token to enable cloud sync. Use this token in the desktop app 
                    or other devices to access your documents.
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--editor-fg)' }}>
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="your@email.com"
                    />
                    <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--editor-fg)' }}>
                      Optional: for account recovery
                    </p>
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm mb-4">{error}</p>
                  )}

                  <button
                    onClick={handleWebGenerate}
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Generating...' : 'Generate API Token'}
                  </button>
                  
                  <div className="mt-4 pt-4 border-t border-tab-border">
                    <div className="flex items-start gap-2 text-xs opacity-70" style={{ color: 'var(--editor-fg)' }}>
                      <Link2 size={14} className="mt-0.5 flex-shrink-0" />
                      <span>
                        After generating a token, use it in the desktop app to sync your documents.
                        The server URL will be: <code className="bg-sidebar-hover px-1 rounded">{window.location.origin}</code>
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-4 mb-4">
                    <p className="text-green-400 text-sm font-medium mb-2">
                      API Token generated successfully!
                    </p>
                    <p className="text-xs opacity-70 mb-3" style={{ color: 'var(--editor-fg)' }}>
                      Save this token securely. It cannot be recovered.
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <code 
                        className="flex-1 bg-sidebar-bg px-3 py-2 rounded text-sm font-mono break-all"
                        style={{ color: 'var(--editor-fg)' }}
                      >
                        {generatedToken}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="btn btn-ghost flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-sidebar-hover rounded p-3 mb-4">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--editor-fg)' }}>
                      To connect from the desktop app:
                    </p>
                    <ol className="text-xs opacity-70 list-decimal list-inside space-y-1" style={{ color: 'var(--editor-fg)' }}>
                      <li>Open the desktop app</li>
                      <li>Go to Cloud Sync settings</li>
                      <li>Enter this server URL: <code className="bg-sidebar-bg px-1 rounded">{window.location.origin}</code></li>
                      <li>Paste your API token</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleUseToken}
                    className="btn btn-primary w-full"
                  >
                    Start Using Cloud Sync
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
