import { useState } from 'react';
import { useStore } from '../store';
import { X, FileText, Globe, Download } from 'lucide-react';
import { marked } from 'marked';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { tabs, activeTabId, addToast } = useStore();
  const [format, setFormat] = useState<'html' | 'md'>('html');
  
  const activeTab = tabs.find((t) => t.id === activeTabId);
  
  if (!activeTab) {
    onClose();
    return null;
  }

  const handleExport = () => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'html') {
        const htmlContent = marked.parse(activeTab.content) as string;
        content = generateHtmlDocument(activeTab.title, htmlContent);
        filename = activeTab.title.replace(/\.(md|markdown)$/i, '') + '.html';
        mimeType = 'text/html';
      } else {
        content = activeTab.content;
        filename = activeTab.title.endsWith('.md') ? activeTab.title : activeTab.title + '.md';
        mimeType = 'text/markdown';
      }
      
      // Create and download the file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast({ type: 'success', message: `Exported as ${filename}` });
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to export file' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Export Document
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
            Export "{activeTab.title}" to a file.
          </p>

          <div className="space-y-3">
            <label
              className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                format === 'html'
                  ? 'border-editor-accent bg-sidebar-active'
                  : 'border-tab-border hover:bg-sidebar-hover'
              }`}
              style={{ color: 'var(--editor-fg)' }}
            >
              <input
                type="radio"
                name="format"
                value="html"
                checked={format === 'html'}
                onChange={() => setFormat('html')}
                className="hidden"
              />
              <Globe size={20} />
              <div>
                <div className="font-medium">HTML</div>
                <div className="text-sm opacity-60">
                  Standalone HTML file with styling
                </div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                format === 'md'
                  ? 'border-editor-accent bg-sidebar-active'
                  : 'border-tab-border hover:bg-sidebar-hover'
              }`}
              style={{ color: 'var(--editor-fg)' }}
            >
              <input
                type="radio"
                name="format"
                value="md"
                checked={format === 'md'}
                onChange={() => setFormat('md')}
                className="hidden"
              />
              <FileText size={20} />
              <div>
                <div className="font-medium">Markdown</div>
                <div className="text-sm opacity-60">
                  Raw markdown source file
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handleExport} className="btn btn-primary flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

function generateHtmlDocument(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #1e1e1e;
      --fg: #d4d4d4;
      --accent: #007acc;
      --code-bg: #2d2d30;
      --border: #3c3c3c;
    }
    
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --fg: #333333;
        --accent: #0066b8;
        --code-bg: #f5f5f5;
        --border: #e0e0e0;
      }
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: var(--fg);
      background: var(--bg);
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    
    h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    
    p { margin-bottom: 1em; }
    
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    li { margin-bottom: 0.25em; }
    
    code {
      font-family: 'Fira Code', 'Consolas', monospace;
      background: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }
    
    pre {
      background: var(--code-bg);
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 1em;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 1em;
      margin: 1em 0;
      color: var(--fg);
      opacity: 0.8;
      font-style: italic;
    }
    
    a {
      color: var(--accent);
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1em;
    }
    
    th, td {
      border: 1px solid var(--border);
      padding: 0.5em 1em;
      text-align: left;
    }
    
    th {
      background: var(--code-bg);
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2em 0;
    }
  </style>
</head>
<body>
  ${content}
  <footer style="margin-top: 3em; padding-top: 1em; border-top: 1px solid var(--border); font-size: 0.8em; opacity: 0.6;">
    Generated by md-crafter
  </footer>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

