import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
          // React core
          'react-vendor': ['react', 'react-dom'],
          // State management
          'zustand': ['zustand'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
