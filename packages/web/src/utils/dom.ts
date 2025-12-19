/**
 * DOM utility functions for cross-environment compatibility
 * 
 * Provides utilities for accessing DOM APIs that work in both browser
 * and test environments (jsdom/Vitest).
 */

/**
 * Gets the DOMParser constructor, compatible with browser and test environments
 * 
 * In ES modules, bare identifiers don't resolve to globals, so we need to
 * access DOMParser via globalThis or window. This function provides a
 * consistent way to access DOMParser across different environments.
 * 
 * @returns DOMParser constructor
 * @throws Error if DOMParser is not available
 */
export function getDOMParser(): typeof DOMParser {
  const DOMParserImpl = globalThis.DOMParser || (typeof window !== 'undefined' ? window.DOMParser : undefined);
  if (!DOMParserImpl) {
    throw new Error('DOMParser is not available');
  }
  return DOMParserImpl;
}

