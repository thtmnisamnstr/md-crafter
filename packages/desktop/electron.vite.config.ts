import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const webPackagePath = resolve(__dirname, '../web');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
        external: ['electron', 'electron-store'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: webPackagePath,
    // Allow importing .txt and .txt.gz files as assets (for CSpell dictionaries)
    assetsInclude: ['**/*.txt', '**/*.txt.gz'],
    plugins: [
      react(),
    ],
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(webPackagePath, 'index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(webPackagePath, 'src'),
        // CSpell dictionary aliases - resolve to node_modules for proper bundling
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
      dedupe: ['react', 'react-dom'],
    },
    css: {
      postcss: webPackagePath,
    },
    server: {
      port: 5174,
      strictPort: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: [],
      esbuildOptions: {
        define: {
          global: 'globalThis',
          __dirname: '"/"',
        },
      },
    },
    worker: {
      format: 'es',
      plugins: () => [
        react(),
      ],
    },
  },
});
