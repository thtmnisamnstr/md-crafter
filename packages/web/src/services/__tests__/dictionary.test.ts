import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DictionaryService, getDictionaryService } from '../dictionary';

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('DictionaryService', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset singleton for testing
    (DictionaryService as any).instance = null;
    
    // Track localStorage state
    storage = {};
    localStorageMock.getItem.mockImplementation((key: string) => storage[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      storage[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete storage[key];
    });
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = DictionaryService.getInstance();
      const instance2 = DictionaryService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should be accessible via getDictionaryService', () => {
      const instance = getDictionaryService();
      
      expect(instance).toBe(DictionaryService.getInstance());
    });
  });

  describe('Ignored Words', () => {
    it('should add word to ignore list', () => {
      const service = DictionaryService.getInstance();
      
      const result = service.addToIgnore('testword');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'md-crafter-spellcheck-ignored',
        JSON.stringify(['testword'])
      );
    });

    it('should convert words to lowercase', () => {
      const service = DictionaryService.getInstance();
      
      service.addToIgnore('TestWord');
      
      expect(storage['md-crafter-spellcheck-ignored']).toBe(JSON.stringify(['testword']));
    });

    it('should not add duplicate words', () => {
      const service = DictionaryService.getInstance();
      
      service.addToIgnore('word');
      const result = service.addToIgnore('word');
      
      expect(result).toBe(false);
      expect(JSON.parse(storage['md-crafter-spellcheck-ignored'])).toHaveLength(1);
    });

    it('should return ignored words', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['word1', 'word2']);
      
      const words = service.getIgnoredWords();
      
      expect(words).toEqual(['word1', 'word2']);
    });

    it('should return empty array if no ignored words', () => {
      const service = DictionaryService.getInstance();
      
      const words = service.getIgnoredWords();
      
      expect(words).toEqual([]);
    });

    it('should remove word from ignore list', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['word1', 'word2']);
      
      const result = service.removeFromIgnore('word1');
      
      expect(result).toBe(true);
      expect(JSON.parse(storage['md-crafter-spellcheck-ignored'])).toEqual(['word2']);
    });

    it('should return false when removing non-existent word', () => {
      const service = DictionaryService.getInstance();
      
      const result = service.removeFromIgnore('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should clear all ignored words', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['word1', 'word2']);
      
      service.clearIgnoredWords();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('md-crafter-spellcheck-ignored');
    });
  });

  describe('Custom Dictionary', () => {
    it('should add word to custom dictionary', () => {
      const service = DictionaryService.getInstance();
      
      const result = service.addToDictionary('customword');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'md-crafter-spellcheck-custom',
        JSON.stringify(['customword'])
      );
    });

    it('should convert words to lowercase', () => {
      const service = DictionaryService.getInstance();
      
      service.addToDictionary('CustomWord');
      
      expect(storage['md-crafter-spellcheck-custom']).toBe(JSON.stringify(['customword']));
    });

    it('should not add duplicate words', () => {
      const service = DictionaryService.getInstance();
      
      service.addToDictionary('word');
      const result = service.addToDictionary('word');
      
      expect(result).toBe(false);
      expect(JSON.parse(storage['md-crafter-spellcheck-custom'])).toHaveLength(1);
    });

    it('should return custom dictionary', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['word1', 'word2']);
      
      const words = service.getCustomDictionary();
      
      expect(words).toEqual(['word1', 'word2']);
    });

    it('should return empty array if no custom words', () => {
      const service = DictionaryService.getInstance();
      
      const words = service.getCustomDictionary();
      
      expect(words).toEqual([]);
    });

    it('should remove word from custom dictionary', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['word1', 'word2']);
      
      const result = service.removeFromDictionary('word1');
      
      expect(result).toBe(true);
      expect(JSON.parse(storage['md-crafter-spellcheck-custom'])).toEqual(['word2']);
    });

    it('should return false when removing non-existent word', () => {
      const service = DictionaryService.getInstance();
      
      const result = service.removeFromDictionary('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should clear custom dictionary', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['word1', 'word2']);
      
      service.clearCustomDictionary();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('md-crafter-spellcheck-custom');
    });
  });

  describe('shouldIgnore', () => {
    it('should return true for ignored words', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['ignoredword']);
      
      expect(service.shouldIgnore('ignoredword')).toBe(true);
    });

    it('should return true for custom dictionary words', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['customword']);
      
      expect(service.shouldIgnore('customword')).toBe(true);
    });

    it('should return false for unknown words', () => {
      const service = DictionaryService.getInstance();
      
      expect(service.shouldIgnore('unknownword')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['testword']);
      
      expect(service.shouldIgnore('TestWord')).toBe(true);
      expect(service.shouldIgnore('TESTWORD')).toBe(true);
    });
  });

  describe('Export/Import', () => {
    it('should export dictionary data', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['ignored1', 'ignored2']);
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['custom1', 'custom2']);
      
      const data = service.exportData();
      
      expect(data).toEqual({
        ignoredWords: ['ignored1', 'ignored2'],
        customDictionary: ['custom1', 'custom2'],
      });
    });

    it('should import dictionary data with merge', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['existing']);
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['existingcustom']);
      
      service.importData({
        ignoredWords: ['new1', 'new2'],
        customDictionary: ['newcustom'],
      }, true);
      
      const ignored = JSON.parse(storage['md-crafter-spellcheck-ignored']);
      const custom = JSON.parse(storage['md-crafter-spellcheck-custom']);
      
      expect(ignored).toContain('existing');
      expect(ignored).toContain('new1');
      expect(ignored).toContain('new2');
      expect(custom).toContain('existingcustom');
      expect(custom).toContain('newcustom');
    });

    it('should import dictionary data without merge (replace)', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['existing']);
      
      service.importData({
        ignoredWords: ['new1', 'new2'],
      }, false);
      
      const ignored = JSON.parse(storage['md-crafter-spellcheck-ignored']);
      
      expect(ignored).not.toContain('existing');
      expect(ignored).toEqual(['new1', 'new2']);
    });

    it('should handle partial import data', () => {
      const service = DictionaryService.getInstance();
      
      // Only import ignored words
      service.importData({
        ignoredWords: ['word1'],
      });
      
      expect(storage['md-crafter-spellcheck-ignored']).toBe(JSON.stringify(['word1']));
      expect(storage['md-crafter-spellcheck-custom']).toBeUndefined();
    });

    it('should deduplicate on import', () => {
      const service = DictionaryService.getInstance();
      storage['md-crafter-spellcheck-ignored'] = JSON.stringify(['word1']);
      
      service.importData({
        ignoredWords: ['word1', 'word2', 'word1'],
      }, true);
      
      const ignored = JSON.parse(storage['md-crafter-spellcheck-ignored']);
      
      // Should have word1 only once
      expect(ignored.filter((w: string) => w === 'word1')).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage parse errors gracefully', () => {
      const service = DictionaryService.getInstance();
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const words = service.getIgnoredWords();
      
      expect(words).toEqual([]);
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const service = DictionaryService.getInstance();
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const result = service.addToIgnore('word');
      
      expect(result).toBe(false);
    });
  });
});

