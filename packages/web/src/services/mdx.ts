import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

/**
 * Compile MDX content to a React component
 */
export async function compileMdx(source: string): Promise<{
  code: string;
  error: string | null;
}> {
  try {
    const compiled = await compile(source, {
      outputFormat: 'function-body',
      development: false,
    });
    
    return {
      code: String(compiled),
      error: null,
    };
  } catch (error) {
    return {
      code: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run compiled MDX code and return the component
 */
export async function runMdx(code: string, components: Record<string, React.ComponentType<any>>): Promise<{
  default: React.ComponentType<{ components?: Record<string, React.ComponentType<any>> }>;
} | null> {
  try {
    const result = await run(code, {
      ...runtime,
      baseUrl: import.meta.url,
    });
    
    return result as any;
  } catch (error) {
    console.error('Error running MDX:', error);
    return null;
  }
}

/**
 * Check if content is MDX (contains JSX)
 */
export function isMdxContent(content: string): boolean {
  // Check for common MDX patterns
  const jsxPatterns = [
    /<[A-Z][a-zA-Z]*/, // React component tags
    /import\s+.*\s+from/, // Import statements
    /export\s+(default|const|function)/, // Export statements
    /\{.*\}/, // JSX expressions (simple check)
  ];
  
  return jsxPatterns.some((pattern) => pattern.test(content));
}

/**
 * Get language for Monaco based on file extension
 */
export function getMdxLanguage(filename: string): string {
  if (filename.endsWith('.mdx')) {
    return 'mdx';
  }
  if (filename.endsWith('.md') || filename.endsWith('.markdown')) {
    return 'markdown';
  }
  return 'plaintext';
}

