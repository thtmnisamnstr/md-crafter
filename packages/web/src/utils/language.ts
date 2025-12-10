/**
 * Maps file extensions to Monaco Editor language identifiers
 * 
 * @param ext - File extension (without dot)
 * @param defaultLang - Default language to return if extension not found
 * @returns Monaco Editor language identifier
 */
export function getLanguageFromExtension(ext: string | undefined, defaultLang: string = 'plaintext'): string {
  if (!ext) return defaultLang;
  
  const normalizedExt = ext.toLowerCase();
  const langMap: Record<string, string> = {
    md: 'markdown',
    mdx: 'mdx',
    markdown: 'markdown',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'cpp',
    cs: 'csharp',
    php: 'php',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
  };
  
  return langMap[normalizedExt] || defaultLang;
}

