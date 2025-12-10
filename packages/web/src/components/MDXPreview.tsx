import { useState, useEffect, useCallback } from 'react';
import { compile } from '@mdx-js/mdx';
import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { logger } from '@md-crafter/shared';
import { mdxComponents } from './mdx';
import { AlertCircle } from 'lucide-react';

interface MDXPreviewProps {
  content: string;
}

export function MDXPreview({ content }: MDXPreviewProps) {
  const [Component, setComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compileMdx = useCallback(async (source: string) => {
    try {
      const compiled = await compile(source, {
        outputFormat: 'function-body',
        development: false,
      });

      const result = await run(String(compiled), {
        ...runtime,
        baseUrl: import.meta.url,
      });

      setComponent(() => result.default);
      setError(null);
    } catch (err) {
      logger.error('MDX compilation error', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setComponent(null);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      compileMdx(content);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [content, compileMdx]);

  if (error) {
    return (
      <div
        className="h-full overflow-auto p-6"
        style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
      >
        <div
          className="p-4 rounded-lg flex items-start gap-3"
          style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid rgb(239, 68, 68)' }}
        >
          <AlertCircle className="flex-shrink-0 mt-0.5" size={20} style={{ color: 'rgb(239, 68, 68)' }} />
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'rgb(239, 68, 68)' }}>
              MDX Compilation Error
            </h3>
            <pre
              className="text-sm whitespace-pre-wrap font-mono"
              style={{ color: 'var(--editor-fg)', opacity: 0.8 }}
            >
              {error}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
      >
        <div className="text-center opacity-50">
          <div className="animate-pulse">Compiling MDX...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto"
      style={{ background: 'var(--editor-bg)' }}
    >
      <div className="mdx-content p-6 max-w-none">
        <Component components={mdxComponents} />
      </div>
      <style>{`
        .mdx-content {
          color: var(--editor-fg);
        }
        .mdx-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 1em 0 0.5em;
          border-bottom: 1px solid var(--tab-border);
          padding-bottom: 0.3em;
        }
        .mdx-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1em 0 0.5em;
          border-bottom: 1px solid var(--tab-border);
          padding-bottom: 0.3em;
        }
        .mdx-content h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        .mdx-content h4, .mdx-content h5, .mdx-content h6 {
          font-size: 1em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        .mdx-content p {
          margin: 1em 0;
          line-height: 1.7;
        }
        .mdx-content ul, .mdx-content ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        .mdx-content li {
          margin: 0.25em 0;
        }
        .mdx-content code {
          font-family: 'Fira Code', Consolas, monospace;
          background: var(--sidebar-hover);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .mdx-content pre {
          background: var(--sidebar-bg);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .mdx-content pre code {
          background: none;
          padding: 0;
        }
        .mdx-content blockquote {
          border-left: 4px solid var(--editor-accent);
          padding-left: 1em;
          margin: 1em 0;
          opacity: 0.8;
          font-style: italic;
        }
        .mdx-content a {
          color: var(--editor-accent);
          text-decoration: none;
        }
        .mdx-content a:hover {
          text-decoration: underline;
        }
        .mdx-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .mdx-content th, .mdx-content td {
          border: 1px solid var(--tab-border);
          padding: 0.5em 1em;
          text-align: left;
        }
        .mdx-content th {
          background: var(--sidebar-bg);
          font-weight: bold;
        }
        .mdx-content hr {
          border: none;
          border-top: 1px solid var(--tab-border);
          margin: 2em 0;
        }
        .mdx-content img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}

