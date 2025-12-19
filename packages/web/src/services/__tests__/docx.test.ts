import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importDocx, exportDocx } from '../docx';
import mammoth from 'mammoth';
import { Packer } from 'docx';
import { marked } from 'marked';
import { logger } from '@md-crafter/shared';

// Mock dependencies
vi.mock('mammoth');
vi.mock('docx', () => ({
  Document: vi.fn(),
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  HeadingLevel: {
    HEADING_1: 'Heading1',
    HEADING_2: 'Heading2',
    HEADING_3: 'Heading3',
    HEADING_4: 'Heading4',
    HEADING_5: 'Heading5',
    HEADING_6: 'Heading6',
  },
  Packer: {
    toBlob: vi.fn(),
  },
  Table: vi.fn(),
  TableRow: vi.fn(),
  TableCell: vi.fn(),
  WidthType: {
    PERCENTAGE: 'percentage',
  },
  BorderStyle: {
    SINGLE: 'single',
  },
  AlignmentType: {
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right',
  },
}));

vi.mock('marked', () => ({
  marked: {
    lexer: vi.fn(),
  },
}));

vi.mock('@md-crafter/shared', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('docx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('importDocx', () => {
    it('should import DOCX file and convert to markdown', async () => {
      const mockHtml = '<h1>Title</h1><p>Content</p>';
      (mammoth.convertToHtml as any).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const file = new File([''], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const result = await importDocx(file);

      expect(result).toContain('# Title');
      expect(result).toContain('Content');
      expect(mammoth.convertToHtml).toHaveBeenCalled();
    });

    it('should handle headings correctly', async () => {
      const mockHtml = '<h1>H1</h1><h2>H2</h2><h3>H3</h3>';
      (mammoth.convertToHtml as any).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const file = new File([''], 'test.docx');
      const result = await importDocx(file);

      expect(result).toContain('# H1');
      expect(result).toContain('## H2');
      expect(result).toContain('### H3');
    });

    it('should handle lists correctly', async () => {
      const mockHtml = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      (mammoth.convertToHtml as any).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const file = new File([''], 'test.docx');
      const result = await importDocx(file);

      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('should handle code blocks correctly', async () => {
      const mockHtml = '<pre>code here</pre>';
      (mammoth.convertToHtml as any).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const file = new File([''], 'test.docx');
      const result = await importDocx(file);

      expect(result).toContain('```');
      expect(result).toContain('code here');
    });

    it('should log warnings when mammoth reports messages', async () => {
      const mockHtml = '<p>Content</p>';
      (mammoth.convertToHtml as any).mockResolvedValue({
        value: mockHtml,
        messages: [{ type: 'warning', message: 'Test warning' }],
      });

      const file = new File([''], 'test.docx');
      await importDocx(file);

      expect(logger.warn).toHaveBeenCalledWith('Docx import warnings', {
        messages: [{ type: 'warning', message: 'Test warning' }],
      });
    });
  });

  describe('exportDocx', () => {
    it('should export markdown to DOCX', async () => {
      const mockBlob = new Blob([''], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      (Packer.toBlob as any).mockResolvedValue(mockBlob);
      (marked.lexer as any).mockReturnValue([
        { type: 'heading', depth: 1, tokens: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', tokens: [{ type: 'text', text: 'Content' }] },
      ]);

      // Ensure document.body exists
      if (!document.body) {
        document.body = document.createElement('body');
      }

      // Mock document.createElement and URL.createObjectURL
      const mockAnchor = {
        click: vi.fn(),
        href: '',
        download: '',
        parentNode: document.body,
      };
      const originalCreateElement = document.createElement;
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const originalRemoveChild = document.body.removeChild.bind(document.body);
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as any;
        }
        return originalCreateElement(tagName);
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await exportDocx('# Title\n\nContent', 'test.docx');

      expect(marked.lexer).toHaveBeenCalledWith('# Title\n\nContent');
      expect(Packer.toBlob).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
    });

    it('should handle filename without extension', async () => {
      const mockBlob = new Blob(['']);
      (Packer.toBlob as any).mockResolvedValue(mockBlob);
      (marked.lexer as any).mockReturnValue([]);

      // Ensure document.body exists
      if (!document.body) {
        document.body = document.createElement('body');
      }

      const mockAnchor = {
        click: vi.fn(),
        href: '',
        download: '',
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await exportDocx('# Title', 'test');

      expect(mockAnchor.download).toBe('test.docx');
    });

    it('should replace markdown extension with docx', async () => {
      const mockBlob = new Blob(['']);
      (Packer.toBlob as any).mockResolvedValue(mockBlob);
      (marked.lexer as any).mockReturnValue([]);

      // Ensure document.body exists
      if (!document.body) {
        document.body = document.createElement('body');
      }

      const mockAnchor = {
        click: vi.fn(),
        href: '',
        download: '',
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      await exportDocx('# Title', 'test.md');

      expect(mockAnchor.download).toBe('test.docx');
    });
  });
});

