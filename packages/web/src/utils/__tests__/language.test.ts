import { describe, it, expect } from 'vitest';
import { getLanguageFromExtension } from '../language';

describe('language', () => {
  describe('getLanguageFromExtension', () => {
    it('should return markdown for .md extension', () => {
      expect(getLanguageFromExtension('md')).toBe('markdown');
    });

    it('should return mdx for .mdx extension', () => {
      expect(getLanguageFromExtension('mdx')).toBe('mdx');
    });

    it('should return markdown for .markdown extension', () => {
      expect(getLanguageFromExtension('markdown')).toBe('markdown');
    });

    it('should return javascript for .js extension', () => {
      expect(getLanguageFromExtension('js')).toBe('javascript');
    });

    it('should return javascript for .jsx extension', () => {
      expect(getLanguageFromExtension('jsx')).toBe('javascript');
    });

    it('should return typescript for .ts extension', () => {
      expect(getLanguageFromExtension('ts')).toBe('typescript');
    });

    it('should return typescript for .tsx extension', () => {
      expect(getLanguageFromExtension('tsx')).toBe('typescript');
    });

    it('should return json for .json extension', () => {
      expect(getLanguageFromExtension('json')).toBe('json');
    });

    it('should return html for .html extension', () => {
      expect(getLanguageFromExtension('html')).toBe('html');
    });

    it('should return css for .css extension', () => {
      expect(getLanguageFromExtension('css')).toBe('css');
    });

    it('should return scss for .scss extension', () => {
      expect(getLanguageFromExtension('scss')).toBe('scss');
    });

    it('should return python for .py extension', () => {
      expect(getLanguageFromExtension('py')).toBe('python');
    });

    it('should return ruby for .rb extension', () => {
      expect(getLanguageFromExtension('rb')).toBe('ruby');
    });

    it('should return go for .go extension', () => {
      expect(getLanguageFromExtension('go')).toBe('go');
    });

    it('should return rust for .rs extension', () => {
      expect(getLanguageFromExtension('rs')).toBe('rust');
    });

    it('should return java for .java extension', () => {
      expect(getLanguageFromExtension('java')).toBe('java');
    });

    it('should return cpp for .cpp extension', () => {
      expect(getLanguageFromExtension('cpp')).toBe('cpp');
    });

    it('should return cpp for .h extension', () => {
      expect(getLanguageFromExtension('h')).toBe('cpp');
    });

    it('should return csharp for .cs extension', () => {
      expect(getLanguageFromExtension('cs')).toBe('csharp');
    });

    it('should return php for .php extension', () => {
      expect(getLanguageFromExtension('php')).toBe('php');
    });

    it('should return sql for .sql extension', () => {
      expect(getLanguageFromExtension('sql')).toBe('sql');
    });

    it('should return yaml for .yaml extension', () => {
      expect(getLanguageFromExtension('yaml')).toBe('yaml');
    });

    it('should return yaml for .yml extension', () => {
      expect(getLanguageFromExtension('yml')).toBe('yaml');
    });

    it('should return xml for .xml extension', () => {
      expect(getLanguageFromExtension('xml')).toBe('xml');
    });

    it('should return shell for .sh extension', () => {
      expect(getLanguageFromExtension('sh')).toBe('shell');
    });

    it('should return shell for .bash extension', () => {
      expect(getLanguageFromExtension('bash')).toBe('shell');
    });

    it('should return shell for .zsh extension', () => {
      expect(getLanguageFromExtension('zsh')).toBe('shell');
    });

    it('should be case-insensitive', () => {
      expect(getLanguageFromExtension('MD')).toBe('markdown');
      expect(getLanguageFromExtension('JS')).toBe('javascript');
      expect(getLanguageFromExtension('TS')).toBe('typescript');
    });

    it('should return default language for unknown extension', () => {
      expect(getLanguageFromExtension('unknown')).toBe('plaintext');
    });

    it('should return default language for undefined extension', () => {
      expect(getLanguageFromExtension(undefined)).toBe('plaintext');
    });

    it('should return custom default language', () => {
      expect(getLanguageFromExtension('unknown', 'markdown')).toBe('markdown');
    });

    it('should handle empty string extension', () => {
      expect(getLanguageFromExtension('')).toBe('plaintext');
    });
  });
});

