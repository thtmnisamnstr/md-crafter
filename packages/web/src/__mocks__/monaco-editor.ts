// Mock for monaco-editor package
// This mock is automatically picked up by Vitest for any import of 'monaco-editor'

import { vi } from 'vitest';

export const editor = {
  createModel: vi.fn(),
  setModelMarkers: vi.fn(),
  defineTheme: vi.fn(),
  setTheme: vi.fn(),
};

export const Uri = {
  parse: vi.fn((uri: string) => ({ toString: () => uri })),
  file: vi.fn((path: string) => ({ toString: () => `file://${path}` })),
};

export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

export const KeyCode = {
  Enter: 13,
  Escape: 27,
  Space: 32,
};

export const languages = {
  register: vi.fn(),
  setMonarchTokensProvider: vi.fn(),
  setLanguageConfiguration: vi.fn(),
  registerCompletionItemProvider: vi.fn(),
};

export default {
  editor,
  Uri,
  MarkerSeverity,
  KeyCode,
  languages,
};

