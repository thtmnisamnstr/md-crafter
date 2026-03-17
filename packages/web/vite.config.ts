import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const disableSyncWs = process.env.VITE_DISABLE_SYNC_WS === '1';

export default defineConfig({
  plugins: [react()],
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
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      ...(disableSyncWs
        ? {}
        : {
            '/socket.io': {
              target: 'http://localhost:3001',
              ws: true,
            },
          }),
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
          // React core
          'react-vendor': ['react', 'react-dom'],
          // State management
          'zustand': ['zustand'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    exclude: [],
  },
});
