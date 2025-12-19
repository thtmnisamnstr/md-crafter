import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSettingsSlice, SettingsSlice } from '../../store/settings';
import { AppState, Settings } from '../../store/types';

// Create mock state
const createMockState = (overrides: Partial<AppState> = {}): AppState => ({
  settings: {
    fontSize: 14,
    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    minimap: true,
    autoSync: true,
    syncInterval: 2000,
    spellCheck: true,
  },
  ...overrides,
} as unknown as AppState);

describe('Settings Slice', () => {
  let slice: SettingsSlice;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockState: AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createMockState();
    mockSet = vi.fn();
    mockGet = vi.fn(() => mockState);
    slice = createSettingsSlice(mockSet, mockGet, {} as any);
  });

  describe('Initial State', () => {
    it('should have default settings', () => {
      expect(slice.settings).toEqual({
        fontSize: 14,
        fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
        tabSize: 2,
        wordWrap: true,
        lineNumbers: true,
        minimap: true,
        autoSync: true,
        syncInterval: 2000,
        spellCheck: true,
      });
    });

    it('should have default fontSize of 14', () => {
      expect(slice.settings.fontSize).toBe(14);
    });

    it('should have wordWrap enabled by default', () => {
      expect(slice.settings.wordWrap).toBe(true);
    });

    it('should have lineNumbers enabled by default', () => {
      expect(slice.settings.lineNumbers).toBe(true);
    });

    it('should have minimap enabled by default', () => {
      expect(slice.settings.minimap).toBe(true);
    });

    it('should have autoSync enabled by default', () => {
      expect(slice.settings.autoSync).toBe(true);
    });

    it('should have spellCheck enabled by default', () => {
      expect(slice.settings.spellCheck).toBe(true);
    });

    it('should have default syncInterval of 2000ms', () => {
      expect(slice.settings.syncInterval).toBe(2000);
    });

    it('should have default tabSize of 2', () => {
      expect(slice.settings.tabSize).toBe(2);
    });
  });

  describe('updateSettings', () => {
    it('should update a single setting', () => {
      slice.updateSettings({ fontSize: 16 });

      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.fontSize).toBe(16);
    });

    it('should preserve other settings when updating one', () => {
      slice.updateSettings({ fontSize: 16 });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.wordWrap).toBe(true);
      expect(result.settings.lineNumbers).toBe(true);
      expect(result.settings.autoSync).toBe(true);
    });

    it('should update multiple settings at once', () => {
      slice.updateSettings({
        fontSize: 18,
        wordWrap: false,
        lineNumbers: false,
      });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.fontSize).toBe(18);
      expect(result.settings.wordWrap).toBe(false);
      expect(result.settings.lineNumbers).toBe(false);
    });

    it('should update fontFamily', () => {
      slice.updateSettings({
        fontFamily: 'Monaco, monospace',
      });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.fontFamily).toBe('Monaco, monospace');
    });

    it('should update tabSize', () => {
      slice.updateSettings({ tabSize: 4 });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.tabSize).toBe(4);
    });

    it('should update syncInterval', () => {
      slice.updateSettings({ syncInterval: 5000 });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.syncInterval).toBe(5000);
    });

    it('should toggle minimap', () => {
      slice.updateSettings({ minimap: false });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.minimap).toBe(false);
    });

    it('should toggle autoSync', () => {
      slice.updateSettings({ autoSync: false });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.autoSync).toBe(false);
    });

    it('should toggle spellCheck', () => {
      slice.updateSettings({ spellCheck: false });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      expect(result.settings.spellCheck).toBe(false);
    });

    it('should handle empty update object', () => {
      slice.updateSettings({});

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: mockState.settings });

      // Settings should remain unchanged
      expect(result.settings).toEqual(mockState.settings);
    });
  });

  describe('Settings Persistence', () => {
    it('should merge with existing settings correctly', () => {
      // Simulate existing settings with some custom values
      const existingSettings: Settings = {
        fontSize: 18,
        fontFamily: 'Consolas, monospace',
        tabSize: 4,
        wordWrap: false,
        lineNumbers: true,
        minimap: false,
        autoSync: true,
        syncInterval: 3000,
        spellCheck: false,
      };

      slice.updateSettings({ fontSize: 20 });

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ settings: existingSettings });

      expect(result.settings.fontSize).toBe(20);
      expect(result.settings.fontFamily).toBe('Consolas, monospace');
      expect(result.settings.tabSize).toBe(4);
      expect(result.settings.wordWrap).toBe(false);
      expect(result.settings.spellCheck).toBe(false);
    });
  });
});

