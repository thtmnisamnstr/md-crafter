import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { logger } from '@md-crafter/shared';
import { getDOMParser } from '../utils/dom';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Enable GFM support (tables, strikethrough, task lists)
turndownService.use(gfm);

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
      logger.error('Failed to copy as rich text', error);
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
      logger.error('Failed to read clipboard', error);
    // Fallback to reading plain text
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }
}

/**
 * Extract tables from HTML and convert them to Markdown
 */
function extractTablesFromHtml(html: string): { html: string, tables: Array<{id: string, markdown: string}> } {
  const parser = new (getDOMParser())();
  const doc = parser.parseFromString(html, 'text/html');
  const tables: Array<{id: string, markdown: string}> = [];

  // Find all tables
  const tableElements = doc.querySelectorAll('table');
  tableElements.forEach((tableElement, index) => {
    if (tableElement instanceof HTMLElement) {
      const tableId = `table_${index}_${Date.now()}`;
      const markdown = convertTableToMarkdown(tableElement);

      // Replace table with a text marker that Turndown will preserve
      const marker = doc.createTextNode(`UNIQUE_TABLE_MARKER_${tableId}_END`);
      tableElement.replaceWith(marker);

      tables.push({ id: tableId, markdown });
    }
  });

  return {
    html: doc.body.innerHTML,
    tables
  };
}

/**
 * Convert a single HTML table element to Markdown
 */
function convertTableToMarkdown(tableElement: HTMLElement): string {
  const rows = Array.from(tableElement.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  // Detect header row
  const headerRow = detectHeaderRow(rows);
  const dataRows = rows.filter(row => row !== headerRow);

  if (!headerRow && dataRows.length === 0) return '';

  // Extract headers
  const headers = headerRow ? extractCellTexts(headerRow) : [];

  // Extract data rows
  const data = dataRows.map(row => extractCellTexts(row));

  // Generate Markdown table
  let markdown = '';

  // Header row
  if (headers.length > 0) {
    markdown += `| ${headers.join(' | ')} |\n`;
    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
  }

  // Data rows
  data.forEach(row => {
    markdown += `| ${row.join(' | ')} |\n`;
  });

  return markdown.trim();
}

/**
 * Detect which row should be treated as the header
 */
function detectHeaderRow(rows: HTMLTableRowElement[]): HTMLTableRowElement | null {
  if (rows.length === 0) return null;

  // Check if first row has <th> elements
  const firstRow = rows[0];
  const hasThElements = Array.from(firstRow.children).some(cell => cell.tagName === 'TH');
  if (hasThElements) return firstRow;

  // Check if first row has bold text (common in Google Docs)
  const hasBoldText = Array.from(firstRow.children).some(cell =>
    cell.querySelector('strong, b') !== null
  );
  if (hasBoldText) return firstRow;

  // If no clear header, treat first row as header anyway
  return firstRow;
}

/**
 * Extract clean text content from table cells
 */
function extractCellTexts(row: HTMLTableRowElement): string[] {
  return Array.from(row.children).map(cell => {
    if (cell instanceof HTMLElement) {
      return cleanCellContent(cell);
    }
    return '';
  });
}

/**
 * Clean cell content for Markdown table
 */
function cleanCellContent(cell: HTMLElement): string {
  // Clone the cell to avoid modifying the original
  const cellClone = cell.cloneNode(true) as HTMLElement;

  // Remove nested <p> tags but keep their content
  const paragraphs = cellClone.querySelectorAll('p');
  paragraphs.forEach(p => {
    if (p instanceof HTMLElement) {
      // If <p> is the only child, unwrap it
      if (cellClone.children.length === 1 && cellClone.children[0] === p) {
        while (p.firstChild) {
          cellClone.insertBefore(p.firstChild, p);
        }
        p.remove();
      }
    }
  });

  // Convert <br> tags to spaces
  const brTags = cellClone.querySelectorAll('br');
  brTags.forEach(br => {
    const spaceNode = document.createTextNode(' ');
    br.replaceWith(spaceNode);
  });

  // Clean up lists - convert to bullet-separated text for table cells
  const lists = cellClone.querySelectorAll('ul, ol');
  lists.forEach(list => {
    if (list instanceof HTMLElement) {
      const listItems = list.querySelectorAll('li');
      const itemTexts: string[] = [];

      listItems.forEach(li => {
        if (li instanceof HTMLElement) {
          // Get text content from nested elements, prioritizing <p> elements
          let textContent = '';

          const nestedParagraphs = li.querySelectorAll('p');
          if (nestedParagraphs.length > 0) {
            textContent = Array.from(nestedParagraphs)
              .map(p => p.textContent?.trim())
              .filter(text => text)
              .join(' ');
          } else {
            textContent = li.textContent?.trim() || '';
          }

          if (textContent) {
            itemTexts.push(textContent);
          }
        }
      });

      if (itemTexts.length > 0) {
        // Join list items with bullet separators
        const listText = itemTexts.join(' • ') + ' ';
        const textNode = document.createTextNode(listText);
        list.replaceWith(textNode);
      } else {
        list.remove();
      }
    }
  });

  // Clean up nested divs/spans
  const nestedElements = cellClone.querySelectorAll('div, span');
  nestedElements.forEach(el => {
    if (el instanceof HTMLElement) {
      // Only unwrap if element has no significant attributes
      const hasAttributes = el.attributes.length > 1; // More than just style/class
      if (!hasAttributes) {
        while (el.firstChild) {
          el.parentNode?.insertBefore(el.firstChild, el);
        }
        el.remove();
      }
    }
  });

  // Get clean text content
  let text = cellClone.textContent?.trim() || '';

  // Replace line breaks with spaces
  text = text.replace(/\n/g, ' ').replace(/\r/g, ' ');

  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ');

  return text;
}

/**
 * Convert HTML to Markdown
 */
export function convertHtmlToMarkdown(html: string): string {
  // Phase 1: Extract and convert tables to Markdown
  const { html: htmlWithoutTables, tables } = extractTablesFromHtml(html);

  // Phase 2: Clean remaining HTML (without table-specific logic)
  const cleaned = cleanHtmlWithoutTables(htmlWithoutTables);

  // Phase 3: Convert non-table content with Turndown
  let markdown = turndownService.turndown(cleaned);

  // Phase 4: Replace table markers with Markdown tables
  // Turndown escapes underscores, so we need to match the fully escaped version
  tables.forEach(({id, markdown: tableMarkdown}) => {
    // Create the fully escaped marker: UNIQUE_TABLE_MARKER_table_0_1767817593292_END
    // becomes UNIQUE\_TABLE\_MARKER\_table\_0\_1767817593292\_END
    const fullyEscapedMarker = `UNIQUE\\_TABLE\\_MARKER\\_${id.replace(/_/g, '\\_')}\\_END`;
    markdown = markdown.replace(fullyEscapedMarker, tableMarkdown);
  });

  // Phase 5: Post-process to clean up any remaining empty formatting markers
  markdown = cleanupMarkdown(markdown);

  return markdown;
}

/**
 * Clean HTML without table-specific processing
 */
function cleanHtmlWithoutTables(html: string): string {
  // If HTML contains only table markers/whitespace, return as-is
  const trimmed = html.trim();
  if (trimmed.startsWith('UNIQUE_TABLE_MARKER_') && trimmed.endsWith('_END')) {
    return html;
  }

  // Parse HTML
  const parser = new (getDOMParser())();
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

  // Remove empty inline formatting elements (bold, italic, etc.)
  // These often appear from Word/Google Docs copy/paste and create empty ** or * markers
  const formattingTags = ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'code'];
  formattingTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => {
      // Check if element is empty or contains only whitespace
      const textContent = el.textContent || '';
      if (textContent.trim() === '') {
        // Replace with its text content (preserves whitespace) or remove entirely
        if (textContent === '') {
          el.remove();
        } else {
          // Has whitespace - replace element with just a text node
          el.replaceWith(doc.createTextNode(textContent));
        }
      }
    });
  });

  // If body is empty but document has content, return the full document
  if (!doc.body.innerHTML.trim() && doc.documentElement.innerHTML.trim()) {
    return doc.documentElement.innerHTML;
  }

  return doc.body.innerHTML;
}

/**
 * Clean up markdown after conversion
 * Removes empty formatting markers and excessive whitespace
 */
function cleanupMarkdown(markdown: string): string {
  let result = markdown;
  
  // Remove empty bold markers (** or __) that may be on their own lines or inline
  // Matches: **\n, \n**, ** (surrounded by whitespace), etc.
  result = result.replace(/\*\*\s*\*\*/g, ''); // Empty bold: ****
  result = result.replace(/__\s*__/g, '');     // Empty bold: ____
  result = result.replace(/^\s*\*\*\s*$/gm, ''); // Line with only **
  result = result.replace(/^\s*__\s*$/gm, '');   // Line with only __
  
  // Remove empty italic markers (* or _)
  result = result.replace(/(?<!\*)\*\s*\*(?!\*)/g, ''); // Empty italic: * * (but not **)
  result = result.replace(/(?<!_)_\s*_(?!_)/g, '');     // Empty italic: _ _ (but not __)
  result = result.replace(/^\s*\*\s*$/gm, ''); // Line with only *
  result = result.replace(/^\s*_\s*$/gm, '');  // Line with only _
  
  // Remove empty strikethrough markers
  result = result.replace(/~~\s*~~/g, ''); // Empty strikethrough: ~~~~
  result = result.replace(/^\s*~~\s*$/gm, ''); // Line with only ~~
  
  // Remove empty inline code markers
  result = result.replace(/`\s*`/g, ''); // Empty code: ``
  result = result.replace(/^\s*`\s*$/gm, ''); // Line with only `
  
  // Collapse excessive newlines (more than 2) to just 2
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace from each line but preserve blank lines
  result = result.split('\n').map(line => line.trimEnd()).join('\n');
  
  // Trim leading/trailing whitespace from the entire content
  result = result.trim();
  
  return result;
}


/**
 * Wrap HTML with inline styles for Word/Google Docs compatibility
 */
function wrapWithInlineStyles(html: string): string {
  // Parse and enhance with inline styles
  const parser = new (getDOMParser())();
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

/**
 * Get plain text from clipboard, converting HTML if necessary
 */
export async function getPlainTextFromClipboard(): Promise<string | null> {
  try {
    // Try modern clipboard API first
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      // Prefer plain text
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        return await blob.text();
      }
      // Convert HTML to plaintext if no plain text available
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        const html = await blob.text();
        try {
          const parser = new (getDOMParser())();
          const doc = parser.parseFromString(html, 'text/html');
          return doc.body.textContent || doc.body.innerText || '';
        } catch {
          // If DOMParser is not available, fall back to simple text extraction
          return html.replace(/<[^>]*>/g, '').trim();
        }
      }
    }
    return null;
  } catch (error) {
    // Log the initial clipboard.read() failure
    logger.warn('Failed to read clipboard with modern API, falling back to readText', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Fallback to reading plain text
    try {
      return await navigator.clipboard.readText();
    } catch (fallbackError) {
      // Log the fallback failure as well
      logger.warn('Failed to read clipboard with fallback readText method', {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return null;
    }
  }
}

