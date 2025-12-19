import type { Plugin } from 'vite';

/**
 * Vite plugin to handle textlint's Node.js module imports
 * Creates mocks for problematic modules that don't work in browser
 */
export function vitePluginTextlint(): Plugin {
  return {
    name: 'vite-plugin-textlint',
    enforce: 'pre', // Run before other plugins
    resolveId(id: string, importer?: string) {
      // Mock fs/promises and related Node.js modules for browser compatibility
      if (id === 'fs/promises' || id === 'node:fs/promises') {
        return '\0fs-promises-mock';
      }
      if (id === 'fs' && importer?.includes('textlint')) {
        return '\0fs-mock';
      }
      // Handle url module imports
      if ((id === 'url' || id === 'node:url') && importer?.includes('textlint')) {
        return '\0url-mock';
      }
      return null;
    },
    load(id: string) {
      // Return empty mock for fs/promises
      if (id === '\0fs-promises-mock') {
        return `export default {}; 
export const readFile = () => Promise.reject(new Error('fs/promises not available in browser'));
export const writeFile = () => Promise.reject(new Error('fs/promises not available in browser'));
export const readdir = () => Promise.reject(new Error('fs/promises not available in browser'));
export const stat = () => Promise.reject(new Error('fs/promises not available in browser'));`;
      }
      // Return empty mock for fs
      if (id === '\0fs-mock') {
        return `export default {}; 
export const readFileSync = () => '';
export const existsSync = () => false;
export const statSync = () => ({ isFile: () => false, isDirectory: () => false });`;
      }
      // Return mock for url module
      if (id === '\0url-mock') {
        return `export const pathToFileURL = (path) => new URL('file://' + path);
export const fileURLToPath = (url) => url.toString().replace('file://', '');
export default { pathToFileURL, fileURLToPath };`;
      }
      return null;
    },
  };
}

