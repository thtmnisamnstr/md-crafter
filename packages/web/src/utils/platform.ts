/**
 * Platform detection utilities
 */

// Type definition for the Electron API exposed by preload script
interface ElectronAPI {
  onMenuNewFile?: (cb: () => void) => () => void;
  onMenuSave?: (cb: () => void) => () => void;
  readFile?: (path: string) => Promise<{ success: boolean; content?: string }>;
}

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

/**
 * Check if the app is running inside Electron
 * Uses multiple detection methods for reliability
 */
export const isElectron = (): boolean => {
  // Primary check: Electron adds itself to the user agent
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) {
    return true;
  }
  
  // Secondary check: our preload script exposes specific API methods
  if (typeof window !== 'undefined' && window.api) {
    // Verify it's our Electron preload API by checking for specific methods
    if (typeof window.api.onMenuNewFile === 'function' || 
        typeof window.api.readFile === 'function') {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if running on macOS
 */
export const isMacOS = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }
  return false;
};

/**
 * Check if running on Windows
 */
export const isWindows = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().indexOf('WIN') >= 0;
  }
  return false;
};

/**
 * Check if running on Linux
 */
export const isLinux = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
  }
  return false;
};

/**
 * Get the modifier key name for the current platform
 * Returns '⌘' for Mac, 'Ctrl' for others
 */
export const getModifierKey = (): string => {
  return isMacOS() ? '⌘' : 'Ctrl';
};

