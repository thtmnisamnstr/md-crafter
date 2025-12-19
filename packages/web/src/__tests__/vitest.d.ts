// Global type declarations for Vitest test environment
// This ensures document and window are available as bare identifiers in ES modules

declare global {
  // eslint-disable-next-line no-var
  var document: Document;
  // eslint-disable-next-line no-var
  var window: Window & typeof globalThis;
}

export {};

