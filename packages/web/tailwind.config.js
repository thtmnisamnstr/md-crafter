import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(__dirname, './index.html'),
    resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        editor: {
          bg: 'var(--editor-bg)',
          fg: 'var(--editor-fg)',
          line: 'var(--editor-line)',
          selection: 'var(--editor-selection)',
          comment: 'var(--editor-comment)',
          accent: 'var(--editor-accent)',
        },
        sidebar: {
          bg: 'var(--sidebar-bg)',
          fg: 'var(--sidebar-fg)',
          hover: 'var(--sidebar-hover)',
          active: 'var(--sidebar-active)',
        },
        tab: {
          bg: 'var(--tab-bg)',
          active: 'var(--tab-active)',
          border: 'var(--tab-border)',
        },
        status: {
          bg: 'var(--status-bg)',
          fg: 'var(--status-fg)',
        },
      },
      fontFamily: {
        mono: ['Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-subtle': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
