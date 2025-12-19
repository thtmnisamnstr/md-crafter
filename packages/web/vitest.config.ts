import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * This config is used when running tests directly in the web package.
 * Note: Tests are typically run from the monorepo root using the root vitest.config.ts.
 * 
 * The supplementary-dictionaries module uses @cspell/dict-* packages which have
 * exports fields that don't expose their dictionary files. This causes Vite's
 * import-analysis to fail before vi.mock can intercept. Tests that depend on
 * this module (spellcheck.test.ts, Editor.test.tsx) are excluded in the root config.
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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude until @cspell package imports can be resolved in test environment
      '**/spellcheck.test.ts',
      '**/Editor.test.tsx',
    ],
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
      '@': resolve(__dirname, './src'),
    },
  },
});
