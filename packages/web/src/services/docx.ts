import mammoth from 'mammoth';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { marked, type Token, type Tokens } from 'marked';

// Type aliases for marked types
type MarkedToken = Token;

/**
 * Import a .docx file and convert to markdown
 */
export async function importDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Use convertToHtml and then convert to markdown manually
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Code'] => pre:fresh",
      "r[style-name='Code'] => code:fresh",
    ],
  });
  
  if (result.messages.length > 0) {
    console.warn('Docx import warnings:', result.messages);
  }
  
  // Convert HTML to Markdown
  return htmlToMarkdown(result.value);
}

/**
 * Convert HTML to Markdown (simple converter)
 */
function htmlToMarkdown(html: string): string {
  let md = html;
  
  // Convert headings
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Convert paragraphs
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  
  // Convert strong/bold
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  
  // Convert em/italic
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  
  // Convert links
  md = md.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)');
  
  // Convert code
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre>(.*?)<\/pre>/gis, '```\n$1\n```\n\n');
  
  // Convert lists
  md = md.replace(/<ul>(.*?)<\/ul>/gis, (_, content) => {
    return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
  });
  md = md.replace(/<ol>(.*?)<\/ol>/gis, (_, content) => {
    let counter = 1;
    return content.replace(/<li>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
  });
  
  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Clean up multiple newlines
  md = md.replace(/\n{3,}/g, '\n\n');
  
  return md.trim();
}

/**
 * Export markdown content to .docx
 */
export async function exportDocx(markdown: string, filename: string): Promise<void> {
  // Parse markdown to tokens
  const tokens = marked.lexer(markdown);
  
  // Convert tokens to docx elements
  const children = tokensToDocx(tokens);
  
  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
  
  // Generate blob and download
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename.replace(/\.(md|mdx|markdown)$/i, '') + '.docx');
}

/**
 * Convert marked tokens to docx elements
 */
function tokensToDocx(tokens: MarkedToken[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  
  for (const token of tokens) {
    const converted = tokenToDocx(token);
    if (Array.isArray(converted)) {
      elements.push(...converted);
    } else if (converted) {
      elements.push(converted);
    }
  }
  
  return elements;
}

/**
 * Convert a single token to docx element(s)
 */
function tokenToDocx(token: MarkedToken): Paragraph | Table | (Paragraph | Table)[] | null {
  switch (token.type) {
    case 'heading':
      return new Paragraph({
        heading: getHeadingLevel((token as Tokens.Heading).depth),
        children: inlineTokensToRuns((token as Tokens.Heading).tokens || []),
      });
    
    case 'paragraph':
      return new Paragraph({
        children: inlineTokensToRuns((token as Tokens.Paragraph).tokens || []),
        spacing: { after: 200 },
      });
    
    case 'code':
      return new Paragraph({
        children: [
          new TextRun({
            text: (token as Tokens.Code).text,
            font: 'Consolas',
            size: 20,
          }),
        ],
        shading: { fill: 'F5F5F5' },
        spacing: { before: 200, after: 200 },
      });
    
    case 'blockquote':
      const quoteTokens = (token as Tokens.Blockquote).tokens || [];
      return quoteTokens.map((t: MarkedToken) => {
        if (t.type === 'paragraph') {
          return new Paragraph({
            children: inlineTokensToRuns((t as Tokens.Paragraph).tokens || []),
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 24, color: 'CCCCCC' },
            },
            spacing: { before: 100, after: 100 },
          });
        }
        return tokenToDocx(t);
      }).filter(Boolean) as Paragraph[];
    
    case 'list':
      return ((token as Tokens.List).items || []).map((item: Tokens.ListItem, index: number) => {
        const bullet = (token as Tokens.List).ordered ? `${index + 1}.` : '•';
        return new Paragraph({
          children: [
            new TextRun({ text: `${bullet} ` }),
            ...inlineTokensToRuns(item.tokens || []),
          ],
          indent: { left: 360 },
          spacing: { before: 50, after: 50 },
        });
      });
    
    case 'table':
      return createTable(token as Tokens.Table);
    
    case 'hr':
      return new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
        },
        spacing: { before: 200, after: 200 },
      });
    
    case 'space':
      return new Paragraph({ children: [] });
    
    default:
      return null;
  }
}

/**
 * Convert inline tokens to TextRun elements
 */
function inlineTokensToRuns(tokens: MarkedToken[]): TextRun[] {
  const runs: TextRun[] = [];
  
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        runs.push(new TextRun({ text: token.text }));
        break;
      
      case 'strong':
        runs.push(
          new TextRun({
            text: getTokenText(token),
            bold: true,
          })
        );
        break;
      
      case 'em':
        runs.push(
          new TextRun({
            text: getTokenText(token),
            italics: true,
          })
        );
        break;
      
      case 'codespan':
        runs.push(
          new TextRun({
            text: token.text,
            font: 'Consolas',
            shading: { fill: 'F0F0F0' },
          })
        );
        break;
      
      case 'link':
        runs.push(
          new TextRun({
            text: getTokenText(token),
            style: 'Hyperlink',
          })
        );
        break;
      
      case 'del':
        runs.push(
          new TextRun({
            text: getTokenText(token),
            strike: true,
          })
        );
        break;
      
      default:
        if ('text' in token) {
          runs.push(new TextRun({ text: (token as any).text }));
        }
    }
  }
  
  return runs;
}

/**
 * Get text content from a token
 */
function getTokenText(token: MarkedToken): string {
  if ('text' in token) {
    return (token as Tokens.Text).text;
  }
  if ('tokens' in token && Array.isArray((token as { tokens?: MarkedToken[] }).tokens)) {
    return ((token as { tokens?: MarkedToken[] }).tokens || []).map((t: MarkedToken) => getTokenText(t)).join('');
  }
  return '';
}

/**
 * Get docx heading level from markdown heading depth
 */
function getHeadingLevel(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (depth) {
    case 1: return HeadingLevel.HEADING_1;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    case 5: return HeadingLevel.HEADING_5;
    case 6: return HeadingLevel.HEADING_6;
    default: return HeadingLevel.HEADING_1;
  }
}

/**
 * Create a docx table from markdown table token
 */
function createTable(token: Tokens.Table): Table {
  const rows: TableRow[] = [];
  
  // Header row
  if (token.header && token.header.length > 0) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: token.header.map((cell: Tokens.TableCell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: inlineTokensToRuns(cell.tokens || []),
                alignment: getAlignment(token.align?.[0]),
              }),
            ],
            shading: { fill: 'F5F5F5' },
          })
        ),
      })
    );
  }
  
  // Body rows
  for (const row of token.rows || []) {
    rows.push(
      new TableRow({
        children: row.map((cell: Tokens.TableCell, i: number) =>
          new TableCell({
            children: [
              new Paragraph({
                children: inlineTokensToRuns(cell.tokens || []),
                alignment: getAlignment(token.align?.[i]),
              }),
            ],
          })
        ),
      })
    );
  }
  
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Get docx alignment from markdown alignment
 */
function getAlignment(align?: string | null): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    default: return AlignmentType.LEFT;
  }
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

