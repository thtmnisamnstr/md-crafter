/**
 * Defines custom Monaco Editor themes for md-crafter
 * 
 * @param monaco - Monaco Editor instance
 * @returns Object with theme names for reference
 */
export function defineMonacoThemes(monaco: typeof import('monaco-editor')): {
  dark: string;
  light: string;
  githubDark: string;
  nord: string;
  monokai: string;
} {
  // Dark theme
  monaco.editor.defineTheme('md-crafter-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2d2d2d',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
    },
  });

  // Light theme
  monaco.editor.defineTheme('md-crafter-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#333333',
      'editor.lineHighlightBackground': '#f3f3f3',
      'editor.selectionBackground': '#add6ff',
    },
  });

  // GitHub Dark theme
  monaco.editor.defineTheme('md-crafter-github-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#388bfd33',
      'editorCursor.foreground': '#c9d1d9',
      'editorLineNumber.foreground': '#8b949e',
      'editorLineNumber.activeForeground': '#c9d1d9',
    },
  });

  // Nord theme
  monaco.editor.defineTheme('md-crafter-nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b4252',
      'editor.selectionBackground': '#434c5e',
      'editorCursor.foreground': '#d8dee9',
      'editorLineNumber.foreground': '#616e88',
      'editorLineNumber.activeForeground': '#d8dee9',
    },
  });

  // Monokai theme
  monaco.editor.defineTheme('md-crafter-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#75715e',
      'editorLineNumber.activeForeground': '#f8f8f2',
    },
  });

  return {
    dark: 'md-crafter-dark',
    light: 'md-crafter-light',
    githubDark: 'md-crafter-github-dark',
    nord: 'md-crafter-nord',
    monokai: 'md-crafter-monokai',
  };
}

