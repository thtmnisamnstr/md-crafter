import { describe, it, expect } from 'vitest';
import { getDOMParser } from '../dom';

describe('dom', () => {
  describe('getDOMParser', () => {
    it('should return DOMParser when available in globalThis', () => {
      const parser = getDOMParser();
      expect(parser).toBe(DOMParser);
      expect(typeof parser).toBe('function');
    });

    it('should return DOMParser constructor', () => {
      const parser = getDOMParser();
      expect(parser).toBeDefined();
      expect(parser).toBe(DOMParser);
    });

    it('should work in test environment', () => {
      const parser = getDOMParser();
      const instance = new parser();
      expect(instance).toBeInstanceOf(DOMParser);
    });

    it('should be able to parse HTML', () => {
      const parser = getDOMParser();
      const instance = new parser();
      const doc = instance.parseFromString('<div>test</div>', 'text/html');
      expect(doc.querySelector('div')?.textContent).toBe('test');
    });
  });
});

