/**
 * Platform detection utilities
 * 
 * Note: ElectronAPI type is defined in src/types/global.d.ts
 * This file should not redefine it to avoid type conflicts
 */

/**
 * Check if the app is running inside Electron
 * We require BOTH the Electron user agent AND our preload API to be present.
 * This prevents false positives from Electron-based browsers (like Cursor's browser).
 */
export const isElectron = (): boolean => {
  // Check for Electron user agent
  const hasElectronUA = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
  
  // Check for our preload script API
  const hasPreloadApi = typeof window !== 'undefined' && 
    window.api &&
    (typeof window.api.onMenuNewFile === 'function' || 
     typeof window.api.readFile === 'function');
  
  // Require BOTH to be present to avoid false positives from Electron-based browsers
  return hasElectronUA && (hasPreloadApi === true);
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

