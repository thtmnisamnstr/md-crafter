import React from 'react';
import { marked } from 'marked';
import { renderToStaticMarkup } from 'react-dom/server';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import type { MdxComponentDefinition, WorkspaceRoot } from '../store/types';
import { renderMdxDocument } from './mdxEngine';

export interface ExportMdxToStaticHtmlOptions {
  title?: string;
  documentPath?: string;
  workspaceRoots?: WorkspaceRoot[];
  activeWorkspaceRootId?: string | null;
  componentDefinitions?: MdxComponentDefinition[];
}

export interface StripMdxToMarkdownOptions {
  normalizeWhitespace?: boolean;
}

export interface BatchExportDocument {
  id: string;
  title: string;
  content: string;
  documentPath?: string;
}

export type BatchExportFormat = 'html' | 'markdown' | 'markdown-strip';

export interface BatchExportOptions {
  workspaceRoots?: WorkspaceRoot[];
  activeWorkspaceRootId?: string | null;
  componentDefinitions?: MdxComponentDefinition[];
}

function normalizeFilename(name: string): string {
  return (name || 'document')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

function getAttributeValue(node: any, name: string): string | undefined {
  const attribute = (node.attributes || []).find((attr: any) => attr?.type === 'mdxJsxAttribute' && attr.name === name);
  if (!attribute) return undefined;
  if (typeof attribute.value === 'string') return attribute.value;
  if (!attribute.value) return undefined;
  if (typeof attribute.value.value === 'string') return attribute.value.value;
  return undefined;
}

function flattenText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (node.type === 'inlineCode') return node.value || '';
  if (Array.isArray(node.children)) return node.children.map(flattenText).join('');
  return '';
}

function asParagraph(text: string) {
  return {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        value: text,
      },
    ],
  };
}

function asCalloutBlockquote(label: string, text: string) {
  const children: any[] = [
    {
      type: 'strong',
      children: [{ type: 'text', value: `${label}:` }],
    },
  ];

  if (text.trim()) {
    children.push({
      type: 'text',
      value: ` ${text.trim()}`,
    });
  }

  return {
    type: 'blockquote',
    children: [
      {
        type: 'paragraph',
        children,
      },
    ],
  };
}

function convertTableDataToMdastTable(dataText?: string): any | null {
  if (!dataText) return null;
  const trimmed = dataText.trim();
  if (!trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0] !== 'object') {
      return null;
    }
    const columns = Object.keys(parsed[0] as Record<string, unknown>);
    const rows = parsed as Array<Record<string, unknown>>;
    return {
      type: 'table',
      align: columns.map(() => null),
      children: [
        {
          type: 'tableRow',
          children: columns.map((column) => ({
            type: 'tableCell',
            children: [{ type: 'text', value: column }],
          })),
        },
        ...rows.map((row) => ({
          type: 'tableRow',
          children: columns.map((column) => ({
            type: 'tableCell',
            children: [{
              type: 'text',
              value: row[column] === undefined || row[column] === null ? '' : String(row[column]),
            }],
          })),
        })),
      ],
    };
  } catch {
    return null;
  }
}

function transformMdxNode(node: any): any[] {
  if (!node) return [];
  if (node.type === 'mdxjsEsm') return [];
  if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
    return node.value ? [asParagraph(String(node.value))] : [];
  }

  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    const name = node.name || '';
    const src = getAttributeValue(node, 'src');
    const alt = getAttributeValue(node, 'alt') || '';
    const title = getAttributeValue(node, 'title') || getAttributeValue(node, 'caption');
    const chart = getAttributeValue(node, 'chart');
    const value = getAttributeValue(node, 'value') || flattenText(node);
    const inline = getAttributeValue(node, 'inline') === 'true';

    if (name === 'Image' && src) {
      return [{
        type: 'paragraph',
        children: [{
          type: 'image',
          url: src,
          alt: alt || null,
          title: title || null,
        }],
      }];
    }

    if (name === 'Mermaid') {
      return [{
        type: 'code',
        lang: 'mermaid',
        value: chart || value || '',
      }];
    }

    if (name === 'Math') {
      const expression = value || '';
      if (!expression) return [];
      if (inline) {
        return [asParagraph(`$${expression}$`)];
      }
      return [{
        type: 'code',
        lang: 'math',
        value: expression,
      }];
    }

    if (name === 'Video') {
      const href = src || value;
      if (href) {
        return [asParagraph(`[Video: ${href}](${href})`)];
      }
      return [asParagraph('Video')];
    }

    if (name === 'Table') {
      const dataAttr = getAttributeValue(node, 'data');
      const table = convertTableDataToMdastTable(dataAttr);
      if (table) return [table];
    }

    if (name === 'Chart') {
      const jsonText = getAttributeValue(node, 'data') || value;
      if (jsonText) {
        return [{
          type: 'code',
          lang: 'json',
          value: jsonText,
        }];
      }
      return [asParagraph('Chart')];
    }

    if (name === 'Callout' || name === 'Note' || name === 'Tip' || name === 'Warning') {
      const text = flattenText(node).trim();
      const prefix = name === 'Callout' ? 'Callout' : name;
      return [asCalloutBlockquote(prefix, text)];
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      return transformChildren(node.children);
    }
    return [];
  }

  if (Array.isArray(node.children)) {
    return [{ ...node, children: transformChildren(node.children) }];
  }

  return [node];
}

function transformChildren(children: any[]): any[] {
  const out: any[] = [];
  for (const child of children) {
    out.push(...transformMdxNode(child));
  }
  return out;
}

export async function stripMdxToMarkdown(
  content: string,
  options: StripMdxToMarkdownOptions = {}
): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm);

  const tree = processor.parse(content) as any;
  tree.children = transformChildren(tree.children || []);

  const markdown = unified()
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      listItemIndent: 'one',
    })
    .use(remarkGfm)
    .stringify(tree) as string;

  if (!options.normalizeWhitespace) {
    return markdown;
  }
  return markdown
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function generateStaticHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      padding: 2rem;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 920px;
      margin-inline: auto;
    }
    .mdx-static h1,.mdx-static h2,.mdx-static h3,.mdx-static h4 { line-height: 1.25; margin-top: 1.2em; }
    .mdx-static pre { padding: 1rem; border-radius: 8px; overflow-x: auto; background: rgba(127,127,127,.12); }
    .mdx-static code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }
    .mdx-static table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .mdx-static th,.mdx-static td { border: 1px solid rgba(127,127,127,.25); padding: .5rem .75rem; }
    .mdx-static blockquote { border-left: 4px solid rgba(127,127,127,.45); margin: 1rem 0; padding-left: 1rem; opacity: .9; }
    .mdx-static img { max-width: 100%; height: auto; border-radius: 8px; }
    .mdx-static .katex { font: normal 1.21em KaTeX_Main, Times New Roman, serif; }
    .mdx-static .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
  </style>
</head>
<body>
  <article class="mdx-static">${bodyHtml}</article>
</body>
</html>`;
}

export async function exportMdxToStaticHtml(
  content: string,
  options: ExportMdxToStaticHtmlOptions = {}
): Promise<string> {
  const title = options.title || 'Document';
  const renderResult = await renderMdxDocument(content, {
    documentPath: options.documentPath,
    workspaceRoots: options.workspaceRoots,
    activeWorkspaceRootId: options.activeWorkspaceRootId,
    componentDefinitions: options.componentDefinitions,
  });

  if (!renderResult.component) {
    const fallback = marked.parse(await stripMdxToMarkdown(content, { normalizeWhitespace: true })) as string;
    return generateStaticHtml(title, fallback);
  }

  const Component = renderResult.component;
  const html = renderToStaticMarkup(
    React.createElement(Component, { components: renderResult.componentMap })
  );
  return generateStaticHtml(title, html);
}

export async function batchExport(
  documents: BatchExportDocument[],
  format: BatchExportFormat,
  options: BatchExportOptions = {}
): Promise<Blob> {
  const zip = new JSZip();

  for (const document of documents) {
    const baseName = stripExtension(normalizeFilename(document.title || 'document')) || 'document';

    if (format === 'html') {
      const html = await exportMdxToStaticHtml(document.content, {
        title: baseName,
        documentPath: document.documentPath,
        workspaceRoots: options.workspaceRoots,
        activeWorkspaceRootId: options.activeWorkspaceRootId,
        componentDefinitions: options.componentDefinitions,
      });
      zip.file(`${baseName}.html`, html);
      continue;
    }

    if (format === 'markdown-strip') {
      const stripped = await stripMdxToMarkdown(document.content, { normalizeWhitespace: true });
      zip.file(`${baseName}.md`, stripped);
      continue;
    }

    zip.file(`${baseName}.md`, document.content);
  }

  return zip.generateAsync({ type: 'blob' });
}
