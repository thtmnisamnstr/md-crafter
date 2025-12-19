import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compileMdx, runMdx, isMdxContent, getMdxLanguage } from '../mdx';
import { compile, run } from '@mdx-js/mdx';
import { logger } from '@md-crafter/shared';

// Mock @mdx-js/mdx
vi.mock('@mdx-js/mdx', () => ({
  compile: vi.fn(),
  run: vi.fn(),
}));

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('mdx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compileMdx', () => {
    it('should compile MDX successfully', async () => {
      const mockCode = 'export default function() { return <div>Hello</div>; }';
      (compile as any).mockResolvedValue(mockCode);

      const result = await compileMdx('# Hello');

      expect(result.code).toBe(mockCode);
      expect(result.error).toBeNull();
      expect(compile).toHaveBeenCalledWith('# Hello', {
        outputFormat: 'function-body',
        development: false,
      });
    });

    it('should handle compilation errors', async () => {
      const error = new Error('Compilation failed');
      (compile as any).mockRejectedValue(error);

      const result = await compileMdx('invalid mdx');

      expect(result.code).toBe('');
      expect(result.error).toBe('Compilation failed');
    });

    it('should handle non-Error exceptions', async () => {
      (compile as any).mockRejectedValue('String error');

      const result = await compileMdx('invalid mdx');

      expect(result.code).toBe('');
      expect(result.error).toBe('Unknown error');
    });

    it('should convert compiled result to string', async () => {
      const mockCode = { toString: () => 'compiled code' };
      (compile as any).mockResolvedValue(mockCode);

      const result = await compileMdx('# Hello');

      expect(result.code).toBe('compiled code');
    });
  });

  describe('runMdx', () => {
    it('should run compiled MDX code successfully', async () => {
      const mockComponent = { default: vi.fn() };
      (run as any).mockResolvedValue(mockComponent);

      const result = await runMdx('compiled code');

      expect(result).toBe(mockComponent);
      expect(run).toHaveBeenCalledWith('compiled code', expect.objectContaining({
        baseUrl: expect.any(String),
      }));
    });

    it('should handle errors when running MDX', async () => {
      const error = new Error('Runtime error');
      (run as any).mockRejectedValue(error);

      const result = await runMdx('invalid code');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error running MDX', error);
    });

    it('should accept optional components parameter', async () => {
      const mockComponent = { default: vi.fn() };
      (run as any).mockResolvedValue(mockComponent);
      const components = { CustomComponent: vi.fn() };

      await runMdx('compiled code', components);

      expect(run).toHaveBeenCalled();
    });
  });

  describe('isMdxContent', () => {
    it('should detect React component tags', () => {
      expect(isMdxContent('<MyComponent />')).toBe(true);
      expect(isMdxContent('<div>test</div>')).toBe(false); // lowercase tag
      expect(isMdxContent('# Markdown')).toBe(false);
    });

    it('should detect import statements', () => {
      expect(isMdxContent('import React from "react"')).toBe(true);
      expect(isMdxContent('import { useState } from "react"')).toBe(true);
      expect(isMdxContent('const x = 5')).toBe(false);
    });

    it('should detect export statements', () => {
      expect(isMdxContent('export default function() {}')).toBe(true);
      expect(isMdxContent('export const Component = () => {}')).toBe(true);
      expect(isMdxContent('export function Component() {}')).toBe(true);
      expect(isMdxContent('const x = 5')).toBe(false);
    });

    it('should detect JSX expressions', () => {
      expect(isMdxContent('{someVariable}')).toBe(true);
      expect(isMdxContent('{props.name}')).toBe(true);
      expect(isMdxContent('plain text')).toBe(false);
    });

    it('should return false for plain markdown', () => {
      expect(isMdxContent('# Heading')).toBe(false);
      expect(isMdxContent('**bold** text')).toBe(false);
      expect(isMdxContent('```code```')).toBe(false);
    });

    it('should return true if any pattern matches', () => {
      expect(isMdxContent('# Heading\n\n<Component />')).toBe(true);
      expect(isMdxContent('import React from "react"\n\n# Heading')).toBe(true);
    });
  });

  describe('getMdxLanguage', () => {
    it('should return mdx for .mdx files', () => {
      expect(getMdxLanguage('file.mdx')).toBe('mdx');
      expect(getMdxLanguage('test.mdx')).toBe('mdx');
      expect(getMdxLanguage('path/to/file.mdx')).toBe('mdx');
    });

    it('should return markdown for .md files', () => {
      expect(getMdxLanguage('file.md')).toBe('markdown');
      expect(getMdxLanguage('test.md')).toBe('markdown');
      expect(getMdxLanguage('path/to/file.md')).toBe('markdown');
    });

    it('should return markdown for .markdown files', () => {
      expect(getMdxLanguage('file.markdown')).toBe('markdown');
      expect(getMdxLanguage('test.markdown')).toBe('markdown');
    });

    it('should return plaintext for other files', () => {
      expect(getMdxLanguage('file.txt')).toBe('plaintext');
      expect(getMdxLanguage('file.js')).toBe('plaintext');
      expect(getMdxLanguage('file')).toBe('plaintext');
      expect(getMdxLanguage('')).toBe('plaintext');
    });

    it('should handle files without extensions', () => {
      expect(getMdxLanguage('README')).toBe('plaintext');
      expect(getMdxLanguage('file')).toBe('plaintext');
    });
  });
});

