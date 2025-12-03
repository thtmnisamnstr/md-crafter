/// <reference types="vite/client" />

import type * as monaco from 'monaco-editor';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global Monaco editor instance
declare global {
  interface Window {
    monacoEditor?: monaco.editor.IStandaloneCodeEditor;
  }
}

