import { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart?: string;
  children?: React.ReactNode;
  className?: string;
}

let mermaidInitialized = false;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default',
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
}

function toSource(chart?: string, children?: React.ReactNode): string {
  if (typeof chart === 'string' && chart.trim()) return chart.trim();
  if (typeof children === 'string' && children.trim()) return children.trim();
  if (Array.isArray(children)) {
    const merged = children.map((child) => (typeof child === 'string' ? child : '')).join('');
    if (merged.trim()) return merged.trim();
  }
  return '';
}

function hashSource(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16);
}

export function Mermaid({ chart, children, className }: MermaidProps) {
  const source = useMemo(() => toSource(chart, children), [chart, children]);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function renderDiagram() {
      if (!source) {
        setSvg('');
        setError('No Mermaid diagram source provided.');
        return;
      }

      try {
        ensureMermaidInitialized();
        const id = `mdc-mermaid-${hashSource(source)}`;
        const result = await mermaid.render(id, source);
        if (!active) return;
        setSvg(result.svg);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
        setSvg('');
      }
    }

    void renderDiagram();

    return () => {
      active = false;
    };
  }, [source]);

  if (error) {
    return (
      <div className={`my-4 rounded border border-tab-border p-3 ${className || ''}`.trim()}>
        <div className="text-sm font-semibold mb-2" style={{ color: 'rgb(239, 68, 68)' }}>
          Mermaid Render Error
        </div>
        <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--editor-fg)', opacity: 0.8 }}>
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div className={`my-4 overflow-auto rounded border border-tab-border p-3 ${className || ''}`.trim()}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
