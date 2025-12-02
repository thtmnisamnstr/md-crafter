import { useState } from 'react';
import { useStore } from '../store';
import { X, Key, Copy, Check } from 'lucide-react';

export function AuthModal() {
  const { setShowAuth, login, generateToken } = useStore();
  const [mode, setMode] = useState<'login' | 'generate'>('login');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!token.trim()) {
      setError('Please enter your API token');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const success = await login(token.trim());
    
    setLoading(false);
    
    if (!success) {
      setError('Invalid API token');
    }
  };

  const handleGenerate = async () => {
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
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={() => setShowAuth(false)}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Mode tabs */}
          <div className="flex border-b border-tab-border mb-4">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                mode === 'login'
                  ? 'border-editor-accent text-editor-accent'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('generate');
                setError('');
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                mode === 'generate'
                  ? 'border-editor-accent text-editor-accent'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Create Account
            </button>
          </div>

          {mode === 'login' ? (
            <div>
              <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
                Enter your API token to sign in and sync your documents.
              </p>
              
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
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="input pl-10"
                    placeholder="Enter your API token"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          ) : (
            <div>
              {!generatedToken ? (
                <>
                  <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
                    Generate a new API token to start syncing your documents.
                    Optionally provide an email for account recovery.
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
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm mb-4">{error}</p>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Generating...' : 'Generate Token'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-4 mb-4">
                    <p className="text-green-400 text-sm font-medium mb-2">
                      Token generated successfully!
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

                  <button
                    onClick={handleUseToken}
                    className="btn btn-primary w-full"
                  >
                    Use This Token & Sign In
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

