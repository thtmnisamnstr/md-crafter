import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isElectron, isMacOS, isWindows, isLinux, getModifierKey } from '../platform';

describe('platform', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.window = originalWindow as any;
  });

  describe('isElectron', () => {
    it('should return true when Electron UA and preload API are present', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Electron/1.0.0',
      } as any;
      
      global.window = {
        api: {
          onMenuNewFile: vi.fn(),
        },
      } as any;
      
      expect(isElectron()).toBe(true);
    });

    it('should return false when only Electron UA is present', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 ... Electron/1.0.0',
      } as any;
      
      global.window = {} as any;
      
      expect(isElectron()).toBe(false);
    });

    it('should return false when only preload API is present', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 ... Chrome/1.0.0',
      } as any;
      
      global.window = {
        api: {
          onMenuNewFile: vi.fn(),
        },
      } as any;
      
      expect(isElectron()).toBe(false);
    });

    it('should return false when neither is present', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 ... Chrome/1.0.0',
      } as any;
      
      global.window = {} as any;
      
      expect(isElectron()).toBe(false);
    });

    it('should check for readFile function as alternative API check', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 ... Electron/1.0.0',
      } as any;
      
      global.window = {
        api: {
          readFile: vi.fn(),
        },
      } as any;
      
      expect(isElectron()).toBe(true);
    });

    it('should handle undefined navigator', () => {
      global.navigator = undefined as any;
      global.window = {} as any;
      
      expect(isElectron()).toBe(false);
    });

    it('should handle undefined window', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 ... Electron/1.0.0',
      } as any;
      
      global.window = undefined as any;
      
      expect(isElectron()).toBe(false);
    });
  });

  describe('isMacOS', () => {
    it('should return true for Mac platform', () => {
      global.navigator = {
        platform: 'MacIntel',
      } as any;
      
      expect(isMacOS()).toBe(true);
    });

    it('should return true for Mac platform (case insensitive)', () => {
      global.navigator = {
        platform: 'macintel',
      } as any;
      
      expect(isMacOS()).toBe(true);
    });

    it('should return false for non-Mac platform', () => {
      global.navigator = {
        platform: 'Win32',
      } as any;
      
      expect(isMacOS()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      global.navigator = undefined as any;
      
      expect(isMacOS()).toBe(false);
    });
  });

  describe('isWindows', () => {
    it('should return true for Windows platform', () => {
      global.navigator = {
        platform: 'Win32',
      } as any;
      
      expect(isWindows()).toBe(true);
    });

    it('should return true for Windows platform (case insensitive)', () => {
      global.navigator = {
        platform: 'win32',
      } as any;
      
      expect(isWindows()).toBe(true);
    });

    it('should return false for non-Windows platform', () => {
      global.navigator = {
        platform: 'MacIntel',
      } as any;
      
      expect(isWindows()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      global.navigator = undefined as any;
      
      expect(isWindows()).toBe(false);
    });
  });

  describe('isLinux', () => {
    it('should return true for Linux platform', () => {
      global.navigator = {
        platform: 'Linux x86_64',
      } as any;
      
      expect(isLinux()).toBe(true);
    });

    it('should return true for Linux platform (case insensitive)', () => {
      global.navigator = {
        platform: 'linux x86_64',
      } as any;
      
      expect(isLinux()).toBe(true);
    });

    it('should return false for non-Linux platform', () => {
      global.navigator = {
        platform: 'MacIntel',
      } as any;
      
      expect(isLinux()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      global.navigator = undefined as any;
      
      expect(isLinux()).toBe(false);
    });
  });

  describe('getModifierKey', () => {
    it('should return ⌘ for Mac', () => {
      global.navigator = {
        platform: 'MacIntel',
      } as any;
      
      expect(getModifierKey()).toBe('⌘');
    });

    it('should return Ctrl for Windows', () => {
      global.navigator = {
        platform: 'Win32',
      } as any;
      
      expect(getModifierKey()).toBe('Ctrl');
    });

    it('should return Ctrl for Linux', () => {
      global.navigator = {
        platform: 'Linux x86_64',
      } as any;
      
      expect(getModifierKey()).toBe('Ctrl');
    });

    it('should return Ctrl when navigator is undefined', () => {
      global.navigator = undefined as any;
      
      expect(getModifierKey()).toBe('Ctrl');
    });
  });
});

