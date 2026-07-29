import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compileMdx, runMdx, isMdxContent, getMdxLanguage } from '../mdx';
import { run } from '@mdx-js/mdx';
import { compileMdxDocument } from '../mdxEngine';
import { logger } from '@md-crafter/shared';

vi.mock('../mdxEngine', () => ({
  compileMdxDocument: vi.fn(),
}));

vi.mock('@mdx-js/mdx', () => ({
  run: vi.fn(),
}));

vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('mdx service compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compileMdx', () => {
    it('returns compiled code from mdx engine', async () => {
      (compileMdxDocument as any).mockResolvedValue({
        code: 'compiled-output',
        errors: [],
      });

      const result = await compileMdx('# Hello');
      expect(result).toEqual({ code: 'compiled-output', error: null });
      expect(compileMdxDocument).toHaveBeenCalledWith('# Hello');
    });

    it('returns first compile error when engine returns errors', async () => {
      (compileMdxDocument as any).mockResolvedValue({
        code: '',
        errors: ['Bad syntax'],
      });

      const result = await compileMdx('broken');
      expect(result).toEqual({ code: '', error: 'Bad syntax' });
    });

    it('returns unknown error for thrown non-error values', async () => {
      (compileMdxDocument as any).mockRejectedValue('boom');
      const result = await compileMdx('broken');
      expect(result).toEqual({ code: '', error: 'Unknown error' });
    });
  });

  describe('runMdx', () => {
    it('runs compiled mdx function body', async () => {
      const fakeResult = { default: vi.fn() };
      (run as any).mockResolvedValue(fakeResult);

      const result = await runMdx('compiled code');
      expect(result).toBe(fakeResult);
      expect(run).toHaveBeenCalledWith('compiled code', expect.objectContaining({
        baseUrl: expect.any(String),
      }));
    });

    it('logs and returns null on runtime errors', async () => {
      const error = new Error('runtime failed');
      (run as any).mockRejectedValue(error);
      const result = await runMdx('compiled code');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error running MDX', error);
    });
  });

  describe('isMdxContent', () => {
    it('detects jsx/import/export patterns', () => {
      expect(isMdxContent('<Callout>Hello</Callout>')).toBe(true);
      expect(isMdxContent('import X from "pkg"')).toBe(true);
      expect(isMdxContent('export const A = 1')).toBe(true);
    });

    it('detects mermaid and math patterns', () => {
      expect(isMdxContent('```mermaid\ngraph TD\n```')).toBe(true);
      expect(isMdxContent('$$x^2$$')).toBe(true);
      expect(isMdxContent('\\(a+b\\)')).toBe(true);
    });

    it('returns false for plain markdown', () => {
      expect(isMdxContent('# Heading\n\nParagraph')).toBe(false);
    });
  });

  describe('getMdxLanguage', () => {
    it('returns mdx for .mdx files', () => {
      expect(getMdxLanguage('file.mdx')).toBe('mdx');
    });

    it('returns markdown for markdown files', () => {
      expect(getMdxLanguage('file.md')).toBe('markdown');
      expect(getMdxLanguage('file.markdown')).toBe('markdown');
    });

    it('returns plaintext for unknown file extensions', () => {
      expect(getMdxLanguage('file.txt')).toBe('plaintext');
      expect(getMdxLanguage('README')).toBe('plaintext');
    });
  });
});

