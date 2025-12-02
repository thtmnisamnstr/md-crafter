import { marked } from 'marked';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Configure turndown for better conversion
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => `~~${content}~~`,
});

/**
 * Copy markdown content as rich HTML for pasting into Word/Google Docs
 */
export async function copyAsRichText(markdown: string): Promise<void> {
  // Convert markdown to HTML
  const html = await marked.parse(markdown);
  
  // Wrap with inline styles for better compatibility
  const styledHtml = wrapWithInlineStyles(html);
  
  // Create clipboard items with both HTML and plain text
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([styledHtml], { type: 'text/html' }),
        'text/plain': new Blob([markdown], { type: 'text/plain' }),
      }),
    ]);
  } catch (error) {
    // Fallback for browsers that don't support ClipboardItem
    console.error('Failed to copy as rich text:', error);
    await navigator.clipboard.writeText(markdown);
  }
}

/**
 * Read rich text from clipboard and convert to markdown
 */
export async function pasteAsMarkdown(): Promise<string | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    
    for (const item of clipboardItems) {
      // Try to get HTML content first
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        const html = await blob.text();
        return convertHtmlToMarkdown(html);
      }
      
      // Fall back to plain text
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        return await blob.text();
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    // Fallback to reading plain text
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }
}

/**
 * Convert HTML to Markdown
 */
export function convertHtmlToMarkdown(html: string): string {
  // Clean up the HTML first
  const cleaned = cleanHtml(html);
  
  // Use turndown to convert
  return turndownService.turndown(cleaned);
}

/**
 * Clean HTML before conversion
 */
function cleanHtml(html: string): string {
  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove unnecessary elements
  const elementsToRemove = doc.querySelectorAll('script, style, meta, link, head');
  elementsToRemove.forEach((el) => el.remove());
  
  // Clean up Word-specific elements
  const wordElements = doc.querySelectorAll('[class^="Mso"], [style*="mso-"]');
  wordElements.forEach((el) => {
    // Keep the content but remove Word-specific styling
    if (el instanceof HTMLElement) {
      el.removeAttribute('class');
      el.removeAttribute('style');
    }
  });
  
  // Handle Google Docs spans
  const googleSpans = doc.querySelectorAll('span[style]');
  googleSpans.forEach((span) => {
    if (span instanceof HTMLElement) {
      const style = span.getAttribute('style') || '';
      
      // Check for bold
      if (style.includes('font-weight: 700') || style.includes('font-weight:700') || style.includes('font-weight: bold')) {
        const b = doc.createElement('strong');
        b.innerHTML = span.innerHTML;
        span.replaceWith(b);
        return;
      }
      
      // Check for italic
      if (style.includes('font-style: italic') || style.includes('font-style:italic')) {
        const i = doc.createElement('em');
        i.innerHTML = span.innerHTML;
        span.replaceWith(i);
        return;
      }
      
      // Otherwise, just keep the text content
      span.removeAttribute('style');
    }
  });
  
  return doc.body.innerHTML;
}

/**
 * Wrap HTML with inline styles for Word/Google Docs compatibility
 */
function wrapWithInlineStyles(html: string): string {
  // Parse and enhance with inline styles
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild as HTMLElement;
  
  // Style headings
  container.querySelectorAll('h1').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'font-size: 24pt; font-weight: bold; margin: 16pt 0 8pt 0; font-family: Arial, sans-serif;';
    }
  });
  
  container.querySelectorAll('h2').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'font-size: 18pt; font-weight: bold; margin: 14pt 0 6pt 0; font-family: Arial, sans-serif;';
    }
  });
  
  container.querySelectorAll('h3').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'font-size: 14pt; font-weight: bold; margin: 12pt 0 4pt 0; font-family: Arial, sans-serif;';
    }
  });
  
  container.querySelectorAll('h4, h5, h6').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'font-size: 12pt; font-weight: bold; margin: 10pt 0 4pt 0; font-family: Arial, sans-serif;';
    }
  });
  
  // Style paragraphs
  container.querySelectorAll('p').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'margin: 0 0 10pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;';
    }
  });
  
  // Style code blocks
  container.querySelectorAll('pre').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'background-color: #f5f5f5; padding: 10pt; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 10pt; margin: 10pt 0; white-space: pre-wrap;';
    }
  });
  
  // Style inline code
  container.querySelectorAll('code').forEach((el) => {
    if (el instanceof HTMLElement && el.parentElement?.tagName !== 'PRE') {
      el.style.cssText = 'background-color: #f0f0f0; padding: 2pt 4pt; border-radius: 2px; font-family: Consolas, Monaco, monospace; font-size: 10pt;';
    }
  });
  
  // Style lists
  container.querySelectorAll('ul, ol').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'margin: 10pt 0; padding-left: 20pt; font-family: Arial, sans-serif; font-size: 11pt;';
    }
  });
  
  container.querySelectorAll('li').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'margin: 4pt 0;';
    }
  });
  
  // Style blockquotes
  container.querySelectorAll('blockquote').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'border-left: 3pt solid #ccc; padding-left: 10pt; margin: 10pt 0; color: #666; font-style: italic;';
    }
  });
  
  // Style links
  container.querySelectorAll('a').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'color: #0066cc; text-decoration: underline;';
    }
  });
  
  // Style tables
  container.querySelectorAll('table').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'border-collapse: collapse; margin: 10pt 0; width: 100%;';
    }
  });
  
  container.querySelectorAll('th, td').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.cssText = 'border: 1pt solid #ddd; padding: 6pt 10pt; font-family: Arial, sans-serif; font-size: 11pt;';
    }
  });
  
  container.querySelectorAll('th').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.fontWeight = 'bold';
      el.style.backgroundColor = '#f5f5f5';
    }
  });
  
  return container.innerHTML;
}

/**
 * Check if clipboard likely contains rich text from Word/Docs
 */
export async function hasRichTextInClipboard(): Promise<boolean> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      if (item.types.includes('text/html')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

