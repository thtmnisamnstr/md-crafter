import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpellcheckService } from '../spellcheck';
import { logger } from '@md-crafter/shared';

// Mock supplementary dictionaries
vi.mock('../../data/supplementary-dictionaries', () => ({
  getSupplementaryDictionaries: () => [],
  getAllSupplementaryWords: () => [],
  isInSupplementaryDictionary: () => false,
  ensureDictionariesLoaded: () => Promise.resolve(),
  getDictionarySourcesMeta: () => [],
  getDictionaryById: () => undefined,
  clearDictionaryCache: () => {},
  getTotalWordCount: () => 0,
}));

// Use vi.hoisted for mock values to ensure proper hoisting
const { mockNspell, mockNspellFn } = vi.hoisted(() => {
  const mockNspell = {
    correct: vi.fn((word: string) => {
      // Simulate dictionary - common words are correct
      const validWords = ['hello', 'world', 'test', 'word', 'the', 'a', 'is'];
      return validWords.includes(word.toLowerCase());
    }),
    suggest: vi.fn((word: string) => [`${word}s`, `${word}ed`, 'suggestion']),
    add: vi.fn(),
  };
  
  const mockNspellFn = vi.fn(() => mockNspell);
  
  return { mockNspell, mockNspellFn };
});

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock nspell
vi.mock('nspell', () => ({
  default: mockNspellFn,
}));

// Mock fetch
global.fetch = vi.fn();

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

// Mock Monaco Editor with required properties
const mockMonaco = {
  MarkerSeverity: {
    Hint: 1,
    Info: 2,
    Warning: 4,
    Error: 8,
  },
  KeyCode: {
    Unknown: 0,
  },
  Range: class {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number
    ) {}
  },
  editor: {
    setModelMarkers: vi.fn(),
    getModelMarkers: vi.fn(() => []),
  },
  languages: {
    registerCodeActionProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
  },
} as any;

const mockModel = {
  id: 'model-1',
  uri: { toString: () => 'model-1' },
  getValue: vi.fn(() => 'Hello wrold test'),
  getPositionAt: vi.fn((offset: number) => ({
    lineNumber: 1,
    column: offset + 1,
  })),
};

const mockEditor = {
  getModel: vi.fn(() => mockModel),
  onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
  addCommand: vi.fn(),
};

describe('SpellcheckService', () => {
  let spellcheckService: SpellcheckService;
  let storage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the nspell mock
    mockNspellFn.mockImplementation(() => mockNspell);
    
    spellcheckService = new SpellcheckService();
    
    // Track localStorage state
    storage = {};
    localStorageMock.getItem.mockImplementation((key: string) => storage[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      storage[key] = value;
    });
    
    // Mock fetch for both dictionary files
    (global.fetch as any).mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        text: async () => 'dictionary content',
      });
    });
  });

  afterEach(() => {
    spellcheckService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize spellchecker service with nspell', async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      
      expect(mockNspellFn).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Spellchecker initialized with nspell');
    });

    it('should not initialize twice with same editor', async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      
      // Should only call nspell once
      expect(mockNspellFn).toHaveBeenCalledTimes(1);
    });

    it('should load dictionary files from public directory', async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      
      expect(global.fetch).toHaveBeenCalledWith('/dictionaries/en_US/en_US.aff');
      expect(global.fetch).toHaveBeenCalledWith('/dictionaries/en_US/en_US.dic');
    });

    it('should add custom dictionary words to nspell on initialization', async () => {
      storage['md-crafter-spellcheck-custom'] = JSON.stringify(['customword', 'anotherword']);
      
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      
      expect(mockNspell.add).toHaveBeenCalledWith('customword');
      expect(mockNspell.add).toHaveBeenCalledWith('anotherword');
    });

    it('should handle initialization errors', async () => {
      mockNspellFn.mockImplementationOnce(() => {
        throw new Error('nspell init failed');
      });
      
      await expect(
        spellcheckService.initialize(mockMonaco, mockEditor as any)
      ).rejects.toThrow('Spellcheck initialization failed');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize spellchecker',
        expect.any(Error)
      );
    });

    it('should handle dictionary load errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });
      
      await expect(
        spellcheckService.initialize(mockMonaco, mockEditor as any)
      ).rejects.toThrow('Spellcheck initialization failed');
    });

    it('should register code action provider for markdown', async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      
      expect(mockMonaco.languages.registerCodeActionProvider).toHaveBeenCalledWith(
        'markdown',
        expect.any(Object)
      );
    });
  });

  describe('Enable/Disable', () => {
    beforeEach(async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
    });

    it('should enable spellchecking and set up content listener', () => {
      spellcheckService.enable();
      
      expect(mockEditor.onDidChangeModelContent).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Spellchecking enabled');
    });

    it('should not enable if already enabled', () => {
      spellcheckService.enable();
      const callCount = mockEditor.onDidChangeModelContent.mock.calls.length;
      
      spellcheckService.enable();
      
      // Should not add another listener
      expect(mockEditor.onDidChangeModelContent.mock.calls.length).toBe(callCount);
    });

    it('should disable spellchecking and clear markers', () => {
      spellcheckService.enable();
      spellcheckService.disable();
      
      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'spellcheck',
        []
      );
      expect(logger.info).toHaveBeenCalledWith('Spellchecking disabled');
    });

    it('should not disable if not enabled', () => {
      const initialCallCount = mockMonaco.editor.setModelMarkers.mock.calls.length;
      spellcheckService.disable();
      
      // setModelMarkers should not be called
      expect(mockMonaco.editor.setModelMarkers.mock.calls.length).toBe(initialCallCount);
    });

    it('should warn if not initialized when enabling', () => {
      const newService = new SpellcheckService();
      newService.enable();
      
      expect(logger.warn).toHaveBeenCalledWith('Spellchecker not initialized');
    });
  });

  describe('Word Checking', () => {
    beforeEach(async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
    });

    it('should check word spelling via nspell', () => {
      expect(spellcheckService.checkWord('hello')).toBe(true);
      expect(spellcheckService.checkWord('wrold')).toBe(false);
    });

    it('should skip words in ignore list', () => {
      spellcheckService.addToIgnore('customterm');
      
      expect(spellcheckService.checkWord('customterm')).toBe(true);
    });

    it('should skip words in custom dictionary', () => {
      spellcheckService.addToDictionary('brandname');
      
      expect(spellcheckService.checkWord('brandname')).toBe(true);
    });

    it('should skip single character words', () => {
      expect(spellcheckService.checkWord('a')).toBe(true);
      expect(spellcheckService.checkWord('x')).toBe(true);
    });

    it('should skip numbers', () => {
      expect(spellcheckService.checkWord('123')).toBe(true);
      expect(spellcheckService.checkWord('42')).toBe(true);
    });

    it('should skip words with numbers (likely code)', () => {
      expect(spellcheckService.checkWord('var1')).toBe(true);
      expect(spellcheckService.checkWord('test123')).toBe(true);
    });

    it('should skip camelCase words (likely code)', () => {
      expect(spellcheckService.checkWord('camelCase')).toBe(true);
      expect(spellcheckService.checkWord('myVariable')).toBe(true);
    });

    it('should skip ALL_CAPS words (likely constants)', () => {
      expect(spellcheckService.checkWord('MY_CONSTANT')).toBe(true);
      expect(spellcheckService.checkWord('API_KEY')).toBe(true);
    });

    it('should skip words with underscores', () => {
      expect(spellcheckService.checkWord('snake_case')).toBe(true);
    });

    it('should get suggestions for misspelled words', () => {
      const suggestions = spellcheckService.getSuggestions('wrold');
      
      expect(suggestions).toContain('suggestion');
      expect(mockNspell.suggest).toHaveBeenCalledWith('wrold');
    });
  });

  describe('Custom Dictionary', () => {
    beforeEach(async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
    });

    it('should add word to custom dictionary via DictionaryService', () => {
      spellcheckService.addToDictionary('customword');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'md-crafter-spellcheck-custom',
        expect.stringContaining('customword')
      );
    });

    it('should add word to nspell instance immediately', () => {
      spellcheckService.addToDictionary('newword');
      
      expect(mockNspell.add).toHaveBeenCalledWith('newword');
    });

    it('should not add duplicate words', () => {
      spellcheckService.addToDictionary('customword');
      const callCount = mockNspell.add.mock.calls.length;
      
      spellcheckService.addToDictionary('customword');
      
      // Should not call add again
      expect(mockNspell.add.mock.calls.length).toBe(callCount);
    });

    it('should return custom dictionary words', () => {
      spellcheckService.addToDictionary('word1');
      spellcheckService.addToDictionary('word2');
      
      const dictionary = spellcheckService.getCustomDictionary();
      
      expect(dictionary).toContain('word1');
      expect(dictionary).toContain('word2');
    });
  });

  describe('Ignored Words', () => {
    beforeEach(async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
    });

    it('should add word to ignore list via DictionaryService', () => {
      spellcheckService.addToIgnore('ignoreword');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'md-crafter-spellcheck-ignored',
        expect.stringContaining('ignoreword')
      );
    });

    it('should not add duplicate ignored words', () => {
      spellcheckService.addToIgnore('ignoreword');
      const callCount = localStorageMock.setItem.mock.calls.filter(
        (call) => call[0] === 'md-crafter-spellcheck-ignored'
      ).length;
      
      spellcheckService.addToIgnore('ignoreword');
      
      const newCallCount = localStorageMock.setItem.mock.calls.filter(
        (call) => call[0] === 'md-crafter-spellcheck-ignored'
      ).length;
      
      expect(newCallCount).toBe(callCount);
    });

    it('should return ignored words', () => {
      spellcheckService.addToIgnore('word1');
      spellcheckService.addToIgnore('word2');
      
      const ignored = spellcheckService.getIgnoredWords();
      
      expect(ignored).toContain('word1');
      expect(ignored).toContain('word2');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      spellcheckService.enable();
      
      spellcheckService.cleanup();
      
      // Should clear markers
      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'spellcheck',
        []
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      await spellcheckService.initialize(mockMonaco, mockEditor as any);
      spellcheckService.enable();
      
      // Simulate error in cleanup
      mockMonaco.editor.setModelMarkers.mockImplementationOnce(() => {
        throw new Error('Cleanup failed');
      });
      
      // Should not throw
      expect(() => spellcheckService.cleanup()).not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Error during spellchecker cleanup',
        expect.any(Error)
      );
    });
  });
});
