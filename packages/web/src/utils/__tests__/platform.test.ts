import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isElectron, isMacOS, isWindows, isLinux, getModifierKey } from '../platform';

function setNavigator(value: Partial<Navigator> | undefined): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: value as Navigator,
  });
}

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value,
  });
}

describe('platform', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setNavigator(originalNavigator);
    setWindow(originalWindow);
  });

  describe('isElectron', () => {
    it('should return true when Electron UA and preload API are present', () => {
      setNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh) Electron/1.0.0',
      });
      setWindow({
        api: {
          onMenuNewFile: vi.fn(),
        },
      });

      expect(isElectron()).toBe(true);
    });

    it('should return false when only Electron UA is present', () => {
      setNavigator({
        userAgent: 'Mozilla/5.0 Chrome/1.0.0 Electron/1.0.0',
      });
      setWindow({});

      expect(isElectron()).toBe(false);
    });

    it('should return false when only preload API is present', () => {
      setNavigator({
        userAgent: 'Mozilla/5.0 Chrome/1.0.0',
      });
      setWindow({
        api: {
          onMenuNewFile: vi.fn(),
        },
      });

      expect(isElectron()).toBe(false);
    });

    it('should return false when neither is present', () => {
      setNavigator({
        userAgent: 'Mozilla/5.0 Chrome/1.0.0',
      });
      setWindow({});

      expect(isElectron()).toBe(false);
    });

    it('should check for readFile function as alternative API check', () => {
      setNavigator({
        userAgent: 'Mozilla/5.0 Electron/1.0.0',
      });
      setWindow({
        api: {
          readFile: vi.fn(),
        },
      });

      expect(isElectron()).toBe(true);
    });

    it('should handle undefined navigator', () => {
      setNavigator(undefined);
      setWindow({});

      expect(isElectron()).toBe(false);
    });

    it('should handle undefined window', () => {
      setNavigator({
        userAgent: 'Mozilla/5.0 Electron/1.0.0',
      });
      setWindow(undefined);

      expect(isElectron()).toBe(false);
    });
  });

  describe('isMacOS', () => {
    it('should return true for Mac platform', () => {
      setNavigator({ platform: 'MacIntel' });
      expect(isMacOS()).toBe(true);
    });

    it('should return true for Mac platform (case insensitive)', () => {
      setNavigator({ platform: 'macintel' });
      expect(isMacOS()).toBe(true);
    });

    it('should return false for non-Mac platform', () => {
      setNavigator({ platform: 'Win32' });
      expect(isMacOS()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      setNavigator(undefined);
      expect(isMacOS()).toBe(false);
    });
  });

  describe('isWindows', () => {
    it('should return true for Windows platform', () => {
      setNavigator({ platform: 'Win32' });
      expect(isWindows()).toBe(true);
    });

    it('should return true for Windows platform (case insensitive)', () => {
      setNavigator({ platform: 'win32' });
      expect(isWindows()).toBe(true);
    });

    it('should return false for non-Windows platform', () => {
      setNavigator({ platform: 'MacIntel' });
      expect(isWindows()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      setNavigator(undefined);
      expect(isWindows()).toBe(false);
    });
  });

  describe('isLinux', () => {
    it('should return true for Linux platform', () => {
      setNavigator({ platform: 'Linux x86_64' });
      expect(isLinux()).toBe(true);
    });

    it('should return true for Linux platform (case insensitive)', () => {
      setNavigator({ platform: 'linux x86_64' });
      expect(isLinux()).toBe(true);
    });

    it('should return false for non-Linux platform', () => {
      setNavigator({ platform: 'MacIntel' });
      expect(isLinux()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      setNavigator(undefined);
      expect(isLinux()).toBe(false);
    });
  });

  describe('getModifierKey', () => {
    it('should return ⌘ for Mac', () => {
      setNavigator({ platform: 'MacIntel' });
      expect(getModifierKey()).toBe('⌘');
    });

    it('should return Ctrl for Windows', () => {
      setNavigator({ platform: 'Win32' });
      expect(getModifierKey()).toBe('Ctrl');
    });

    it('should return Ctrl for Linux', () => {
      setNavigator({ platform: 'Linux x86_64' });
      expect(getModifierKey()).toBe('Ctrl');
    });

    it('should return Ctrl when navigator is undefined', () => {
      setNavigator(undefined);
      expect(getModifierKey()).toBe('Ctrl');
    });
  });
});
