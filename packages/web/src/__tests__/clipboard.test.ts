import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPlainTextFromClipboard } from '../services/clipboard';

describe('getPlainTextFromClipboard', () => {
  beforeEach(() => {
    // Mock navigator.clipboard using Object.defineProperty to avoid read-only error
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        read: vi.fn(),
        readText: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return plain text when clipboard contains text/plain', async () => {
    const mockPlainText = 'Hello world';
    const mockClipboardItem = {
      types: ['text/plain'],
      getType: vi.fn().mockResolvedValue(
        new Blob([mockPlainText], { type: 'text/plain' })
      ),
    };

    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockClipboardItem,
    ]);

    const result = await getPlainTextFromClipboard();
    expect(result).toBe(mockPlainText);
  });

  it('should convert HTML to plaintext when clipboard contains text/html', async () => {
    const mockHtml = '<p>Hello <strong>world</strong></p>';
    // Create a Blob-like object with text() method that works in test environment
    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockHtml),
      type: 'text/html',
    } as unknown as Blob;
    
    const mockClipboardItem = {
      types: ['text/html'],
      getType: vi.fn().mockResolvedValue(mockBlob),
    };

    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockClipboardItem,
    ]);

    const result = await getPlainTextFromClipboard();
    expect(result).toBe('Hello world');
  });

  it('should prefer plain text over HTML when both are available', async () => {
    const mockPlainText = 'Plain text version';
    const mockHtml = '<p>HTML version</p>';
    
    const mockClipboardItems = [
      {
        types: ['text/html', 'text/plain'],
        getType: vi.fn((type: string) => {
          if (type === 'text/plain') {
            return Promise.resolve(new Blob([mockPlainText], { type: 'text/plain' }));
          }
          return Promise.resolve(new Blob([mockHtml], { type: 'text/html' }));
        }),
      },
    ];

    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClipboardItems
    );

    const result = await getPlainTextFromClipboard();
    expect(result).toBe(mockPlainText);
  });

  it('should return null when clipboard is empty', async () => {
    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getPlainTextFromClipboard();
    expect(result).toBeNull();
  });

  it('should fallback to readText when clipboard.read fails', async () => {
    const mockPlainText = 'Fallback text';
    
    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Clipboard read failed')
    );
    (navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPlainText
    );

    const result = await getPlainTextFromClipboard();
    expect(result).toBe(mockPlainText);
  });

  it('should return null when all methods fail', async () => {
    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Clipboard read failed')
    );
    (navigator.clipboard.readText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Read text failed')
    );

    const result = await getPlainTextFromClipboard();
    expect(result).toBeNull();
  });

  it('should handle HTML with nested elements correctly', async () => {
    const mockHtml = '<div><p>Paragraph 1</p><p>Paragraph 2</p></div>';
    // Create a Blob-like object with text() method that works in test environment
    const mockBlob = {
      text: vi.fn().mockResolvedValue(mockHtml),
      type: 'text/html',
    } as unknown as Blob;
    
    const mockClipboardItem = {
      types: ['text/html'],
      getType: vi.fn().mockResolvedValue(mockBlob),
    };

    (navigator.clipboard.read as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockClipboardItem,
    ]);

    const result = await getPlainTextFromClipboard();
    expect(result).toBe('Paragraph 1Paragraph 2');
  });
});

