import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  imageSourceToDataUrl,
  isLikelyImageUrl,
  materializeClipboardMarkdownImages,
  normalizeDocumentImageReferences,
  removeAssetImageReferencesFromContent,
  updateMarkdownImageToken,
} from '../imageAssets';

describe('imageAssets normalization', () => {
  it('keeps image usage in place and moves definition block to the bottom', () => {
    const input = [
      '* **Multi-namespace support**',
      '',
      '![][image1]',
      '',
      '[image1]: mdc://asset/img-mmv5j453-w1hj49si',
      '',
      '## When retrieval becomes revenue-critical, wobble gets expensive',
      '',
    ].join('\n');

    const output = normalizeDocumentImageReferences(input);

    const usageIndex = output.indexOf('![][image1]');
    const headingIndex = output.indexOf('## When retrieval becomes revenue-critical, wobble gets expensive');
    const definitionIndex = output.indexOf('[image1]: mdc://asset/img-mmv5j453-w1hj49si');

    expect(usageIndex).toBeGreaterThan(-1);
    expect(headingIndex).toBeGreaterThan(-1);
    expect(definitionIndex).toBeGreaterThan(-1);
    expect(usageIndex).toBeLessThan(headingIndex);
    expect(definitionIndex).toBeGreaterThan(headingIndex);
    expect(output.match(/\[image1\]:/g)?.length).toBe(1);
  });

  it('converts inline URL images to reference labels with bottom definitions', () => {
    const input =
      '![BYOC architecture diagram](https://www.pinecone.io/example.png)\n\nAfter image paragraph.';

    const output = normalizeDocumentImageReferences(input);

    expect(output).toContain('![BYOC architecture diagram][image1]');
    expect(output).toContain('[image1]: https://www.pinecone.io/example.png');
    expect(output).not.toContain('![BYOC architecture diagram](https://www.pinecone.io/example.png)');
  });

  it('normalizes parenthesized reference definitions', () => {
    const input = [
      'before',
      '',
      '![alt][image1]',
      '',
      '[image1]: (https://example.com/image.png)',
      '',
      'after',
    ].join('\n');

    const output = normalizeDocumentImageReferences(input);

    expect(output).toContain('![alt][image1]');
    expect(output).toContain('[image1]: https://example.com/image.png');
    expect(output).not.toContain('[image1]: (https://example.com/image.png)');
  });

  it('updates caption without creating duplicate definitions', () => {
    const input = [
      'Top paragraph',
      '',
      '![old alt][image1]',
      '',
      '[image1]: mdc://asset/img-1',
      '',
      'Bottom paragraph',
    ].join('\n');

    const output = updateMarkdownImageToken(input, 0, { title: 'New caption' });

    expect(output).toContain('![old alt][image1]');
    expect(output).toContain('[image1]: mdc://asset/img-1 "New caption"');
    expect(output.match(/\[image1\]:/g)?.length).toBe(1);
    expect(output.indexOf('![old alt][image1]')).toBeLessThan(output.indexOf('Bottom paragraph'));
    expect(output.indexOf('[image1]: mdc://asset/img-1 "New caption"')).toBeGreaterThan(
      output.indexOf('Bottom paragraph')
    );
  });

  it('updates caption without duplicating next-image proxy definitions', () => {
    const input = [
      'Top paragraph',
      '',
      '![proxy image][image1]',
      '',
      '[image1]: https://www.pinecone.io/_next/image/?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fvr8gru94%2Fproduction%2F4d106048ca853c0e87dfef9ccd100e4234af1cb3-1916x1038.png&w=3840&q=75',
      '',
      'Bottom paragraph',
    ].join('\n');

    const output = updateMarkdownImageToken(input, 0, { title: 'Proxy caption' });

    expect(output).toContain('![proxy image][image1]');
    expect(output).toContain('"Proxy caption"');
    expect(output.match(/\[image1\]:/g)?.length).toBe(1);
  });
});

describe('image URL detection', () => {
  it('recognizes next-image proxy URLs as images', () => {
    const src =
      'https://www.pinecone.io/_next/image/?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fvr8gru94%2Fproduction%2F4d106048ca853c0e87dfef9ccd100e4234af1cb3-1916x1038.png&w=3840&q=75';
    expect(isLikelyImageUrl(src)).toBe(true);
  });
});

describe('clipboard image materialization', () => {
  it('inlines local asset image references using full-document context', () => {
    const selected = '![diagram][image1]';
    const fullContext = [
      '# Heading',
      '',
      '![diagram][image1]',
      '',
      '[image1]: mdc://asset/img-1',
    ].join('\n');

    const output = materializeClipboardMarkdownImages(selected, {
      resolveAssetDataUrl: (assetId) => (
        assetId === 'img-1' ? 'data:image/png;base64,AAA' : null
      ),
      referenceContext: fullContext,
    });

    expect(output).toContain('![diagram](data:image/png;base64,AAA)');
    expect(output).not.toContain('![diagram][image1]');
  });
});

describe('asset reference removal', () => {
  it('removes only the selected asset image tokens and definitions', () => {
    const input = [
      'Before',
      '',
      '![one][image1]',
      '',
      'Middle',
      '',
      '![two][image2]',
      '',
      '[image1]: mdc://asset/img-1',
      '',
      '[image2]: mdc://asset/img-2',
    ].join('\n');

    const output = removeAssetImageReferencesFromContent(input, 'img-1');

    expect(output).not.toContain('![one]');
    expect(output).not.toContain('mdc://asset/img-1');
    expect(output).toContain('![two][image1]');
    expect(output).toContain('[image1]: mdc://asset/img-2');
  });
});

describe('imageAssets desktop URL fallback', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers desktop bridge fetch for remote image sources', async () => {
    (window as unknown as { api: Record<string, unknown> }).api = {
      ...((window as unknown as { api?: Record<string, unknown> }).api || {}),
      fetchImageDataUrl: vi.fn().mockResolvedValue({
        success: true,
        dataUrl: 'data:image/png;base64,desktop123',
        mimeType: 'image/png',
      }),
    };

    const result = await imageSourceToDataUrl('https://example.com/image.png');

    const fetchImageDataUrl = (window as unknown as { api: { fetchImageDataUrl: ReturnType<typeof vi.fn> } }).api
      .fetchImageDataUrl;
    expect(fetchImageDataUrl).toHaveBeenCalledWith('https://example.com/image.png');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBe('data:image/png;base64,desktop123');
  });
});
