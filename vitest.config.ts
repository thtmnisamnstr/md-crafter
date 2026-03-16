import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/shared/src/**/*.test.ts',
      'packages/server/src/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 65,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      'monaco-editor': path.resolve(__dirname, 'packages/web/src/__mocks__/monaco-editor.ts'),
      '@': path.resolve(__dirname, 'packages/web/src'),
      '@cspell/dict-software-terms': path.resolve(__dirname, 'node_modules/@cspell/dict-software-terms'),
      '@cspell/dict-fullstack': path.resolve(__dirname, 'node_modules/@cspell/dict-fullstack'),
      '@cspell/dict-aws': path.resolve(__dirname, 'node_modules/@cspell/dict-aws'),
      '@cspell/dict-google': path.resolve(__dirname, 'node_modules/@cspell/dict-google'),
      '@cspell/dict-k8s': path.resolve(__dirname, 'node_modules/@cspell/dict-k8s'),
      '@cspell/dict-companies': path.resolve(__dirname, 'node_modules/@cspell/dict-companies'),
      '@cspell/dict-gaming-terms': path.resolve(__dirname, 'node_modules/@cspell/dict-gaming-terms'),
      '@cspell/dict-filetypes': path.resolve(__dirname, 'node_modules/@cspell/dict-filetypes'),
      '@cspell/dict-markdown': path.resolve(__dirname, 'node_modules/@cspell/dict-markdown'),
    },
  },
});
