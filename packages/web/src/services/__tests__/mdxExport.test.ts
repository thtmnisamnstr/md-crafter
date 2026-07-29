import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  batchExport,
  exportMdxToStaticHtml,
  stripMdxToMarkdown,
} from '../mdxExport';

describe('mdxExport', () => {
  it('strips basic mdx components into markdown equivalents', async () => {
    const input = `import X from 'pkg'

<Image src="https://example.com/image.png" alt="diagram" title="caption" />

<Mermaid chart="graph TD;A-->B;" />

<Callout>Important text</Callout>`;

    const output = await stripMdxToMarkdown(input, { normalizeWhitespace: true });

    expect(output).toContain('![diagram](https://example.com/image.png "caption")');
    expect(output).toContain('```mermaid');
    expect(output).toContain('> **Callout:** Important text');
    expect(output).not.toContain("import X from 'pkg'");
  });

  it('exports plain markdown as static html document', async () => {
    const html = await exportMdxToStaticHtml('# Hello');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<article class="mdx-static">');
    expect(html).toContain('<h1 id="hello">Hello</h1>');
  });

  it('creates zip batch exports in markdown format', async () => {
    const blob = await batchExport(
      [
        { id: '1', title: 'doc-one.md', content: '# One' },
        { id: '2', title: 'doc-two.md', content: '# Two' },
      ],
      'markdown'
    );

    const zip = await JSZip.loadAsync(blob);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(['doc-one.md', 'doc-two.md']);
    expect(await zip.file('doc-one.md')?.async('string')).toBe('# One');
  });
});

