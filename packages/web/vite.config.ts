import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { vitePluginTextlint } from './vite-plugin-textlint';

export default defineConfig({
  plugins: [
    react(),
    vitePluginTextlint(),
    nodePolyfills({
      // Polyfills needed for textlint in browser
      include: ['path', 'util', 'buffer', 'process', 'url'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  // Allow importing .txt and .txt.gz files as assets (for CSpell dictionaries)
  assetsInclude: ['**/*.txt', '**/*.txt.gz'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // CSpell dictionary aliases - resolve to node_modules for proper bundling
      '@cspell/dict-software-terms': path.resolve(__dirname, '../../node_modules/@cspell/dict-software-terms'),
      '@cspell/dict-fullstack': path.resolve(__dirname, '../../node_modules/@cspell/dict-fullstack'),
      '@cspell/dict-aws': path.resolve(__dirname, '../../node_modules/@cspell/dict-aws'),
      '@cspell/dict-google': path.resolve(__dirname, '../../node_modules/@cspell/dict-google'),
      '@cspell/dict-k8s': path.resolve(__dirname, '../../node_modules/@cspell/dict-k8s'),
      '@cspell/dict-companies': path.resolve(__dirname, '../../node_modules/@cspell/dict-companies'),
      '@cspell/dict-gaming-terms': path.resolve(__dirname, '../../node_modules/@cspell/dict-gaming-terms'),
      '@cspell/dict-filetypes': path.resolve(__dirname, '../../node_modules/@cspell/dict-filetypes'),
      '@cspell/dict-markdown': path.resolve(__dirname, '../../node_modules/@cspell/dict-markdown'),
    },
    // Prevent Vite from trying to resolve Node.js built-ins for textlint
    conditions: ['import', 'module', 'browser', 'default'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Monaco editor - largest dependency
          'monaco': ['monaco-editor', '@monaco-editor/react'],
          // MDX processing
          'mdx': ['@mdx-js/mdx', '@mdx-js/react'],
          // Document conversion
          'docx': ['mammoth', 'docx'],
          // PDF generation
          'pdf': ['html2pdf.js'],
          // Grammar checking - large dependency, lazy loaded
          'textlint': ['textlint', 'textlint-rule-write-good', 'textlint-rule-common-misspellings'],
          // React core
          'react-vendor': ['react', 'react-dom'],
          // State management
          'zustand': ['zustand'],
        },
      },
      // Mark textlint as external - it will be loaded dynamically
      external: (id) => {
        // Don't externalize textlint in workers - we need it bundled
        if (id.includes('textlint') && !id.includes('worker')) {
          return false;
        }
        return false;
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      react(),
      vitePluginTextlint(),
      nodePolyfills({
        // Polyfills for web workers (textlint needs these)
        include: ['path', 'util', 'buffer', 'process', 'url'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    // Include textlint in optimization with polyfills
    exclude: [],
    esbuildOptions: {
      define: {
        global: 'globalThis',
        __dirname: '"/"',
      },
    },
  },
  define: {
    // Define __dirname for textlint and its dependencies which might expect it
    __dirname: JSON.stringify('/'),
  },
});
