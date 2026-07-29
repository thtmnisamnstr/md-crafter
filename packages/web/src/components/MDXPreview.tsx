import { useState, useEffect, useCallback } from 'react';
import type { ComponentType } from 'react';
import { logger } from '@md-crafter/shared';
import { AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { renderMdxDocument } from '../services/mdxEngine';
import { ErrorBoundary } from './ErrorBoundary';

interface MDXPreviewProps {
  content: string;
  documentPath?: string;
}

export function MDXPreview({ content, documentPath }: MDXPreviewProps) {
  const {
    mdxComponentDefinitions,
    workspaceRoots,
    activeWorkspaceRootId,
  } = useStore();
  const [Component, setComponent] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [componentMap, setComponentMap] = useState<Record<string, unknown>>({});
  const [compileError, setCompileError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const compileMdx = useCallback(async (source: string) => {
    try {
      const rendered = await renderMdxDocument(source, {
        documentPath,
        componentDefinitions: mdxComponentDefinitions,
        workspaceRoots,
        activeWorkspaceRootId,
      });

      if (!rendered.component) {
        const message = rendered.errors[0] || 'Unknown MDX render error';
        setCompileError(message);
        setWarnings([]);
        setComponent(null);
        setComponentMap({});
        return;
      }

      setComponent(() => rendered.component);
      setComponentMap(rendered.componentMap);
      setCompileError(null);
      setWarnings(rendered.errors);
    } catch (err) {
      logger.error('MDX compilation error', err);
      setCompileError(err instanceof Error ? err.message : 'Unknown error');
      setWarnings([]);
      setComponent(null);
      setComponentMap({});
    }
  }, [activeWorkspaceRootId, documentPath, mdxComponentDefinitions, workspaceRoots]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      compileMdx(content);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [content, compileMdx]);

  if (compileError) {
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
              {compileError}
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
      <div className="mdx-content p-6 max-w-none" style={{ color: 'var(--editor-fg)' }}>
        {warnings.length > 0 && (
          <div
            className="p-3 rounded-lg flex items-start gap-3 mb-4"
            style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid rgb(245, 158, 11)' }}
          >
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} style={{ color: 'rgb(245, 158, 11)' }} />
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'rgb(245, 158, 11)' }}>
                MDX Preview Warning
              </h3>
              <pre
                className="text-xs whitespace-pre-wrap font-mono"
                style={{ color: 'var(--editor-fg)', opacity: 0.85 }}
              >
                {warnings.join('\n')}
              </pre>
            </div>
          </div>
        )}
        <ErrorBoundary
          fallback={(
            <div
              className="p-4 rounded-lg flex items-start gap-3"
              style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid rgb(239, 68, 68)' }}
            >
              <AlertCircle className="flex-shrink-0 mt-0.5" size={20} style={{ color: 'rgb(239, 68, 68)' }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: 'rgb(239, 68, 68)' }}>
                  MDX Runtime Error
                </h3>
                <p className="text-sm opacity-90">A component failed during preview render.</p>
              </div>
            </div>
          )}
        >
          <Component components={componentMap} />
        </ErrorBoundary>
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
          color: var(--editor-fg);
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
          color: var(--editor-comment);
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
