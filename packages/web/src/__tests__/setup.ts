// Vitest setup file - runs before all tests
// Uses standard @testing-library/jest-dom/vitest import which handles everything automatically

import { vi } from 'vitest';

// Mock supplementary dictionaries - the actual module uses dynamic imports
// that may fail in test environment, so we provide a simple mock
vi.mock('../data/supplementary-dictionaries', () => ({
  getSupplementaryDictionaries: () => [
    {
      id: 'software-terms',
      name: 'Software Terms',
      description: 'General software and programming terms',
      words: ['api', 'sdk', 'json', 'html', 'css', 'javascript', 'typescript', 'nodejs', 'react', 'serverless'],
      wordCount: 10,
    },
  ],
  getAllSupplementaryWords: () => ['api', 'sdk', 'json', 'html', 'css', 'javascript', 'typescript', 'nodejs', 'react', 'serverless'],
  isInSupplementaryDictionary: (word: string) => {
    const words = new Set(['api', 'sdk', 'json', 'html', 'css', 'javascript', 'typescript', 'nodejs', 'react', 'serverless']);
    return words.has(word.toLowerCase());
  },
  ensureDictionariesLoaded: () => Promise.resolve(),
  getDictionarySourcesMeta: () => [{ id: 'software-terms', name: 'Software Terms', description: 'General software terms' }],
  getDictionaryById: () => undefined,
  clearDictionaryCache: () => {},
  getTotalWordCount: () => 10,
}));

// CRITICAL: Manually initialize happy-dom if document is not available
// This ensures document exists before any other code runs
if (typeof document === 'undefined') {
  // Try to import and initialize happy-dom manually
  try {
    const { Window } = require('happy-dom');
    const window = new Window();
    (globalThis as any).window = window;
    (globalThis as any).document = window.document;
  } catch (e) {
    // If manual initialization fails, vitest should have set it up
    // But we'll throw a clearer error
    throw new Error(
      'document is not available and happy-dom initialization failed. ' +
      'Check vitest.config.ts has environment: "happy-dom" configured and happy-dom is installed.'
    );
  }
}

// CRITICAL: Import jest-dom/vitest AFTER ensuring document exists
// This ensures document/window are available
import '@testing-library/jest-dom/vitest';

// Ensure document.body exists - this is critical for React Testing Library's render function
// React Testing Library accesses document.body when render() is called, so it must exist
if (!document.body && document.documentElement) {
  const body = document.createElement('body');
  document.documentElement.appendChild(body);
}

// Suppress unhandled errors from Monaco loader trying to load scripts in happy-dom
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.target && (event.target as any).tagName === 'SCRIPT') {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

// Note: cleanup() is now imported in each test file to ensure document is available
// when React Testing Library's code is evaluated
// Mock implementation of @testing-library/react is in __mocks__/@testing-library/react.tsx

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => {
    storage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  },
  get length() {
    return Object.keys(storage).length;
  },
  key: (index: number) => Object.keys(storage)[index] || null,
};

// Set localStorage on window, global, and globalThis
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });
}

// Mock matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock clipboard API
if (typeof window !== 'undefined' && window.navigator) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
      write: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue([]),
    },
    writable: true,
    configurable: true,
  });
}

// Mock URL.createObjectURL and revokeObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock'),
    writable: true,
    configurable: true,
  });
}

if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
}

// Note: window.monacoEditor, window.monaco, and window.grammarService are no longer used
// Editor instances are now managed via React Context (EditorContextProvider)
// Tests should use MockEditorContextProvider instead
