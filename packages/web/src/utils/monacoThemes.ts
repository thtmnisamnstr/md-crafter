/**
 * Defines custom Monaco Editor themes for md-crafter
 * 
 * @param monaco - Monaco Editor instance
 * @returns Object with theme names for reference
 */
export function defineMonacoThemes(monaco: typeof import('monaco-editor')): {
  dark: string;
  light: string;
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

  return {
    dark: 'md-crafter-dark',
    light: 'md-crafter-light',
  };
}

