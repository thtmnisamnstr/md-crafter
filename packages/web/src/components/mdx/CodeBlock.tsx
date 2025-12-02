import { ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
  language?: string;
  filename?: string;
  children: ReactNode;
}

export function CodeBlock({ language = 'text', filename, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const code = typeof children === 'string' ? children : String(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-tab-border">
      {filename && (
        <div
          className="px-4 py-2 text-sm flex items-center justify-between border-b border-tab-border"
          style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        >
          <span className="opacity-70">{filename}</span>
          <span className="text-xs opacity-50">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre
          className="p-4 overflow-x-auto text-sm"
          style={{
            background: 'var(--editor-bg)',
            color: 'var(--editor-fg)',
            fontFamily: "'Fira Code', Consolas, monospace",
          }}
        >
          <code>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 rounded hover:bg-sidebar-hover transition-colors"
          title="Copy code"
        >
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} style={{ color: 'var(--editor-fg)', opacity: 0.5 }} />
          )}
        </button>
      </div>
    </div>
  );
}

