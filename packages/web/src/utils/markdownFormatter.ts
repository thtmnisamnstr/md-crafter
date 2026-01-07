/**
 * Re-indents content inside HTML/JSX tags after Prettier formatting.
 * Prettier removes indentation from content inside HTML tags, which breaks MDX.
 * This function restores proper indentation: content inside tags is indented
 * one level (2 spaces) from the tag's indentation.
 */
function reindentHtmlTagContent(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  
  // Stack to track nested tags: each entry is { tagName, indent }
  const tagStack: { tagName: string; indent: string }[] = [];
  
  // Regex patterns
  const openTagPattern = /^(\s*)<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>(?!.*<\/\2>)/;
  const closeTagPattern = /^(\s*)<\/([A-Za-z][A-Za-z0-9-]*)>/;
  const selfClosingPattern = /^(\s*)<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?\/>/;
  const sameLineOpenClosePattern = /^(\s*)<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>.*<\/\2>/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for same-line open/close (e.g., <div>content</div>) - no reindent needed
    if (sameLineOpenClosePattern.test(line)) {
      result.push(line);
      continue;
    }
    
    // Check for self-closing tag - no reindent needed
    if (selfClosingPattern.test(line)) {
      result.push(line);
      continue;
    }
    
    // Check for closing tag
    const closeMatch = closeTagPattern.exec(line);
    if (closeMatch) {
      const closingTagName = closeMatch[2];
      // Pop from stack if it matches
      if (tagStack.length > 0 && tagStack[tagStack.length - 1].tagName === closingTagName) {
        tagStack.pop();
      }
      result.push(line);
      continue;
    }
    
    // Check for opening tag
    const openMatch = openTagPattern.exec(line);
    if (openMatch) {
      const tagIndent = openMatch[1];
      const tagName = openMatch[2];
      result.push(line);
      tagStack.push({ tagName, indent: tagIndent });
      continue;
    }
    
    // Regular content line - apply indentation if inside a tag
    if (tagStack.length > 0) {
      const currentTag = tagStack[tagStack.length - 1];
      const requiredIndent = currentTag.indent + '  '; // One level deeper
      
      // Get current line's content (strip existing leading whitespace)
      const trimmedLine = line.trimStart();
      
      // Skip empty lines - keep them as-is
      if (trimmedLine === '') {
        result.push(line);
        continue;
      }
      
      // Check if line already has correct or more indentation
      const currentIndent = line.substring(0, line.length - trimmedLine.length);
      if (currentIndent.length >= requiredIndent.length) {
        // Already properly indented or more
        result.push(line);
      } else {
        // Add required indentation
        result.push(requiredIndent + trimmedLine);
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * Formats markdown content using Prettier standalone.
 * 
 * Uses Prettier's standalone build for browser compatibility. The markdown parser
 * is included in Prettier's standalone bundle.
 * 
 * @param content - The markdown content to format
 * @returns A promise that resolves to the formatted markdown content
 * @throws Error if formatting fails
 */
export async function formatMarkdown(content: string): Promise<string> {
  try {
    // Use Prettier standalone for browser compatibility
    const prettier = await import('prettier/standalone');
    // Use bundled markdown plugin (covers md and mdx)
    const markdownPluginModule = await import('prettier/plugins/markdown.js');
    const markdownPlugin = markdownPluginModule.default ?? markdownPluginModule;
    
    const formatted = await prettier.format(content, {
      parser: 'markdown',
      plugins: [markdownPlugin],
      printWidth: 80,
      proseWrap: 'preserve',
    });
    
    // Post-process to clean up excessive newlines
    const cleaned = cleanupExcessiveNewlines(formatted);
    
    return cleaned;
  } catch (error) {
    throw new Error(`Failed to format markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Formats MDX content using Prettier standalone.
 * 
 * Note: Prettier standalone doesn't include MDX plugin support. This function
 * attempts to use the markdown parser, which may not handle JSX perfectly,
 * but should work for most MDX content. For files with complex JSX, formatting
 * may need to be skipped.
 * 
 * After Prettier formats the content, we post-process to restore proper indentation
 * for content inside HTML/JSX tags (which Prettier strips).
 * 
 * @param content - The MDX content to format
 * @returns A promise that resolves to the formatted MDX content
 * @throws Error if formatting fails
 */
export async function formatMdx(content: string): Promise<string> {
  try {
    // Use Prettier standalone for browser compatibility
    const prettier = await import('prettier/standalone');
    // Use bundled markdown plugin with mdx parser
    const markdownPluginModule = await import('prettier/plugins/markdown.js');
    const markdownPlugin = markdownPluginModule.default ?? markdownPluginModule;
    
    const formatted = await prettier.format(content, {
      parser: 'mdx',
      plugins: [markdownPlugin],
      printWidth: 80,
      proseWrap: 'preserve',
      singleQuote: true,
      embeddedLanguageFormatting: 'off',
    });
    
    // Post-process to restore indentation inside HTML/JSX tags
    const reindented = reindentHtmlTagContent(formatted);
    
    // Clean up excessive newlines
    const cleaned = cleanupExcessiveNewlines(reindented);
    
    return cleaned;
  } catch (error) {
    // If formatting fails (e.g., due to JSX syntax), return original content
    // This prevents breaking MDX files that the markdown parser can't handle
    if (error instanceof Error) {
      if (error.message.includes('parser') && error.message.toLowerCase().includes('mdx')) {
        throw new Error('MDX formatting unavailable in bundled Prettier build (mdx parser missing). Formatting skipped to avoid breaking the file.');
      }
      if (error.message.includes('Unexpected')) {
        throw new Error(`MDX formatting failed: File contains JSX syntax that cannot be formatted with markdown parser. Consider formatting manually.`);
      }
      throw new Error(`Failed to format MDX: ${error.message}`);
    }
    throw new Error('Failed to format MDX: Unknown error');
  }
}

/**
 * Clean up excessive newlines in formatted content.
 * Reduces 3+ consecutive newlines to 2 (one blank line between paragraphs).
 * Also removes empty formatting markers that may have been left behind.
 */
function cleanupExcessiveNewlines(content: string): string {
  let result = content;
  
  // Collapse 3+ consecutive newlines to 2 (preserves one blank line)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Remove lines that contain only whitespace (but keep truly blank lines)
  result = result.split('\n').map(line => {
    // If line is only whitespace, make it empty
    return line.trim() === '' ? '' : line;
  }).join('\n');
  
  // After trimming, collapse excessive newlines again
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Remove empty bold/italic markers that may appear after formatting
  // These are rare but can happen with certain input
  result = result.replace(/\*\*\s*\*\*/g, '');
  result = result.replace(/__\s*__/g, '');
  result = result.replace(/(?<!\*)\*\s*\*(?!\*)/g, '');
  result = result.replace(/(?<!_)_\s*_(?!_)/g, '');
  
  // Ensure file ends with single newline
  result = result.trimEnd() + '\n';
  
  return result;
}

/**
 * Detects whether content is likely MDX (even if extension is .md)
 */
export function isLikelyMdx(content: string): boolean {
  // Simple heuristics: JSX/MDX tags, import/export, embedded expressions
  const jsxPattern = /<([A-Z][A-Za-z0-9]*)[\s>]/;
  const exportImportPattern = /^\s*(import|export)\s+/m;
  const expressionPattern = /\{[^}]+\}/;
  const mdxTagPattern = /<([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/;

  if (jsxPattern.test(content) || exportImportPattern.test(content) || expressionPattern.test(content)) {
    return true;
  }

  const tagMatch = mdxTagPattern.exec(content);
  if (tagMatch) {
    const tagName = tagMatch[1].toLowerCase();
    const htmlTags = new Set([
      'div','span','p','a','ul','ol','li','strong','em','h1','h2','h3','h4','h5','h6','table','thead','tbody','tr','th','td','code','pre','img','blockquote','hr','br','section','article'
    ]);
    if (!htmlTags.has(tagName)) {
      return true;
    }
  }

  return false;
}
