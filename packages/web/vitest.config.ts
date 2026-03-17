import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * This config is used when running tests directly in the web package.
 * Note: Tests are typically run from the monorepo root using the root vitest.config.ts.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: false,
          disableCSSFileLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    deps: {
      inline: ['@testing-library/react'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.*'],
    },
  },
  resolve: {
    alias: {
      'monaco-editor': resolve(__dirname, './src/__mocks__/monaco-editor.ts'),
      '@': resolve(__dirname, './src'),
      '@cspell/dict-software-terms': resolve(__dirname, '../../node_modules/@cspell/dict-software-terms'),
      '@cspell/dict-fullstack': resolve(__dirname, '../../node_modules/@cspell/dict-fullstack'),
      '@cspell/dict-aws': resolve(__dirname, '../../node_modules/@cspell/dict-aws'),
      '@cspell/dict-google': resolve(__dirname, '../../node_modules/@cspell/dict-google'),
      '@cspell/dict-k8s': resolve(__dirname, '../../node_modules/@cspell/dict-k8s'),
      '@cspell/dict-companies': resolve(__dirname, '../../node_modules/@cspell/dict-companies'),
      '@cspell/dict-gaming-terms': resolve(__dirname, '../../node_modules/@cspell/dict-gaming-terms'),
      '@cspell/dict-filetypes': resolve(__dirname, '../../node_modules/@cspell/dict-filetypes'),
      '@cspell/dict-markdown': resolve(__dirname, '../../node_modules/@cspell/dict-markdown'),
    },
  },
});
