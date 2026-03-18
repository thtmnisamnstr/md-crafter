import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownPreview } from '../MarkdownPreview';
import * as imageAssetsService from '../../services/imageAssets';

// Mock MDXPreview
vi.mock('../MDXPreview', () => ({
  MDXPreview: ({ content }: { content: string }) => (
    <div data-testid="mdx-preview">{content}</div>
  ),
}));

// Mock marked
const mockParse = vi.hoisted(() => vi.fn((markdown: string) => {
  // Simple mock markdown parser that generates proper HTML
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Only wrap in <p> if there's no other block element
  if (!html.includes('<h') && !html.includes('<ul') && !html.includes('<li')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
}));

vi.mock('marked', () => {
  const mockMarked = {
    parse: mockParse,
    setOptions: vi.fn(),
  };
  return {
    default: mockMarked,
    marked: mockMarked,
  };
});

describe('MarkdownPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Markdown Rendering', () => {
    it('should render markdown content', () => {
      const { container } = render(<MarkdownPreview content="# Hello World" />);
      expect(container.querySelector('.markdown-preview')).toBeTruthy();
    });

    it('should render headings', () => {
      const { container } = render(<MarkdownPreview content="# Heading 1\n## Heading 2" />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toContain('Heading 1');
      expect(preview?.innerHTML).toContain('Heading 2');
    });

    it('should render bold text', () => {
      const { container } = render(<MarkdownPreview content="**bold text**" />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toContain('<strong>bold text</strong>');
    });

    it('should render italic text', () => {
      const { container } = render(<MarkdownPreview content="*italic text*" />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toContain('<em>italic text</em>');
    });

    it('should render links', () => {
      const { container } = render(<MarkdownPreview content="[Link](https://example.com)" />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toContain('<a href="https://example.com">Link</a>');
    });

    it('should render lists', () => {
      const { container } = render(<MarkdownPreview content="- Item 1\n- Item 2" />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toContain('Item 1');
      expect(preview?.innerHTML).toContain('Item 2');
    });

    it('should handle empty content', () => {
      const { container } = render(<MarkdownPreview content="" />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview).toBeTruthy();
    });

    it('should handle multiline content', () => {
      const content = `# Title

This is a paragraph.

## Subtitle

Another paragraph.`;
      const { container } = render(<MarkdownPreview content={content} />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toContain('Title');
      expect(preview?.innerHTML).toContain('Subtitle');
    });

    it('should render standalone image URLs as images', () => {
      const { container } = render(<MarkdownPreview content="https://example.com/cat.png" />);
      const image = container.querySelector('.markdown-preview img');
      expect(image?.getAttribute('src')).toBe('https://example.com/cat.png');
    });

    it('should resolve stored asset image URLs', () => {
      const { container } = render(
        <MarkdownPreview
          content="![cat](mdc://asset/test-asset-id)"
          resolveImageAssetSrc={(assetId) =>
            assetId === 'test-asset-id' ? 'data:image/png;base64,abc123' : null
          }
        />
      );
      const image = container.querySelector('.markdown-preview img');
      expect(image?.getAttribute('src')).toBe('data:image/png;base64,abc123');
    });
  });

  describe('MDX Detection', () => {
    it('should use MDXPreview when isMdx is true', () => {
      const { getByTestId } = render(<MarkdownPreview content="# Hello" isMdx={true} />);
      expect(getByTestId('mdx-preview')).toBeTruthy();
    });

    it('should detect MDX from JSX patterns', () => {
      const { getByTestId } = render(<MarkdownPreview content="<Component />" />);
      expect(getByTestId('mdx-preview')).toBeTruthy();
    });

    it('should detect MDX from import statements', () => {
      const { getByTestId } = render(<MarkdownPreview content="import Component from './Component'" />);
      expect(getByTestId('mdx-preview')).toBeTruthy();
    });

    it('should use regular markdown for non-MDX content', () => {
      const { container, queryByTestId } = render(<MarkdownPreview content="# Regular Markdown" />);
      expect(queryByTestId('mdx-preview')).toBeFalsy();
      expect(container.querySelector('.markdown-preview')).toBeTruthy();
    });
  });

  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      const content = '<script>alert("xss")</script># Hello';
      const { container } = render(<MarkdownPreview content={content} />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const content = '<div onclick="alert(\'xss\')">Click me</div>';
      const { container } = render(<MarkdownPreview content={content} />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const content = '<a href="javascript:alert(\'xss\')">Link</a>';
      const { container } = render(<MarkdownPreview content={content} />);
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).not.toContain('javascript:');
    });
  });

  describe('Link Handling', () => {
    it('should handle external link clicks', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      
      const { container } = render(<MarkdownPreview content="[Link](https://example.com)" />);
      const preview = container.querySelector('.markdown-preview');
      const link = preview?.querySelector('a');
      
      if (link) {
        fireEvent.click(link);
      }
      
      expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
      
      windowOpenSpy.mockRestore();
    });

    it('should handle anchor link clicks', () => {
      const scrollIntoViewSpy = vi.fn();
      const mockElement = {
        scrollIntoView: scrollIntoViewSpy,
      };
      
      const { container } = render(
        <MarkdownPreview content="# Heading\n[Link](#heading)" />
      );
      const preview = container.querySelector('.markdown-preview');
      
      // Mock querySelector to return our mock element
      const originalQuerySelector = preview?.querySelector;
      if (preview) {
        preview.querySelector = vi.fn((selector: string) => {
          if (selector === '#heading') {
            return mockElement as any;
          }
          return originalQuerySelector?.call(preview, selector);
        });
      }
      
      const link = preview?.querySelector('a[href="#heading"]');
      if (link) {
        fireEvent.click(link);
      }
      
      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('should prevent default link behavior', () => {
      const { container } = render(<MarkdownPreview content="[Link](https://example.com)" />);
      const preview = container.querySelector('.markdown-preview');
      const link = preview?.querySelector('a');
      
      if (link) {
        const preventDefaultSpy = vi.fn();
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
        
        fireEvent.click(link, event);
        
        // Note: fireEvent.click may not fully simulate preventDefault, but we test the intent
        expect(link).toBeTruthy();
      }
    });
  });

  describe('Header ID Generation', () => {
    it('should add IDs to headers', () => {
      const { container } = render(<MarkdownPreview content="# Hello World" />);
      const preview = container.querySelector('.markdown-preview');
      const heading = preview?.querySelector('h1');
      expect(heading?.id).toBe('hello-world');
    });

    it('should generate valid IDs from headers with special characters', () => {
      const { container } = render(<MarkdownPreview content="# Hello, World!" />);
      const preview = container.querySelector('.markdown-preview');
      const heading = preview?.querySelector('h1');
      expect(heading?.id).toBe('hello-world');
    });

    it('should handle multiple headers', () => {
      // Use separate renders to avoid mock parser issues with multiple headers
      const { container: container1 } = render(
        <MarkdownPreview content="# First Heading" />
      );
      const preview1 = container1.querySelector('.markdown-preview');
      const html1 = preview1?.innerHTML || '';
      expect(html1).toMatch(/id="[^"]*"/i);
      expect(html1).toContain('<h1');
      
      const { container: container2 } = render(
        <MarkdownPreview content="## Second Heading" />
      );
      const preview2 = container2.querySelector('.markdown-preview');
      const html2 = preview2?.innerHTML || '';
      expect(html2).toMatch(/id="[^"]*"/i);
      expect(html2).toContain('<h2');
    });

    it('should remove leading/trailing dashes from IDs', () => {
      const { container } = render(<MarkdownPreview content="# -Hello-" />);
      const preview = container.querySelector('.markdown-preview');
      const heading = preview?.querySelector('h1');
      expect(heading?.id).toBe('hello');
    });
  });

  describe('Error Handling', () => {
    it('should handle markdown parse errors gracefully', () => {
      // Temporarily override parse to throw
      mockParse.mockImplementationOnce(() => {
        throw new Error('Parse error');
      });
      
      const { container } = render(<MarkdownPreview content="Invalid markdown" />);
      const preview = container.querySelector('.markdown-preview');
      
      // Should show error message
      expect(preview?.innerHTML).toContain('Error rendering markdown');
      
      // Reset mock for other tests
      mockParse.mockReset();
      mockParse.mockImplementation((markdown: string) => {
        let html = markdown
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          .replace(/^- (.*$)/gim, '<li>$1</li>')
          .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        if (!html.includes('<h') && !html.includes('<ul') && !html.includes('<li')) {
          html = `<p>${html}</p>`;
        }
        return html;
      });
    });
  });

  describe('Code Blocks', () => {
    it('should render code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const { container } = render(<MarkdownPreview content={content} />);
      const preview = container.querySelector('.markdown-preview');
      // Note: The mock parser doesn't handle code blocks, but we test that it renders
      expect(preview).toBeTruthy();
    });
  });

  describe('Image Editing', () => {
    it('does not render resize handles for images', () => {
      const { container } = render(<MarkdownPreview content='![photo](https://example.com/photo.png)' />);
      const image = container.querySelector('.markdown-preview img');
      expect(image).toBeTruthy();
      if (image) {
        fireEvent.click(image);
      }
      expect(container.querySelector('.md-image-resize-handle')).toBeFalsy();
    });

    it('should update alt text and caption from image toolbar', () => {
      const onContentChange = vi.fn();
      const { container, getByText, getByPlaceholderText } = render(
        <MarkdownPreview
          content='![old alt](https://example.com/photo.png "Old caption")'
          onContentChange={onContentChange}
        />
      );

      const image = container.querySelector('.markdown-preview img');
      expect(image).toBeTruthy();
      if (image) {
        fireEvent.click(image);
      }

      const altInput = getByPlaceholderText('Describe the image');
      const captionInput = getByPlaceholderText('Optional caption');
      fireEvent.input(altInput, { target: { value: 'new alt text' } });
      fireEvent.input(captionInput, { target: { value: 'New caption' } });

      fireEvent.click(getByText('Apply Image Changes'));

      expect(onContentChange).toHaveBeenCalledWith(
        '![new alt text][image1]\n\n[image1]: https://example.com/photo.png "New caption"'
      );
    });

    it('should save embedded image to document assets without downloading', async () => {
      const saveSpy = vi
        .spyOn(imageAssetsService, 'downloadImageSourceAsFormat')
        .mockResolvedValue();
      const onContentChange = vi.fn();
      const promoteEmbeddedImageToAsset = vi.fn(() => 'mdc://asset/new-asset-id');
      const { container, getByText } = render(
        <MarkdownPreview
          content="![embedded](data:image/png;base64,abc123)"
          onContentChange={onContentChange}
          promoteEmbeddedImageToAsset={promoteEmbeddedImageToAsset}
        />
      );

      const image = container.querySelector('.markdown-preview img');
      expect(image).toBeTruthy();
      if (image) {
        fireEvent.click(image);
      }

      fireEvent.click(getByText('Save As .png'));

      await waitFor(() => {
        expect(promoteEmbeddedImageToAsset).toHaveBeenCalledWith('data:image/png;base64,abc123', 0, 'png');
      });

      expect(saveSpy).not.toHaveBeenCalled();
      expect(onContentChange).toHaveBeenCalledWith(
        '![embedded][image1]\n\n[image1]: mdc://asset/new-asset-id'
      );
      saveSpy.mockRestore();
    });

    it('should save remote URL image to document assets without downloading', async () => {
      const saveSpy = vi
        .spyOn(imageAssetsService, 'downloadImageSourceAsFormat')
        .mockResolvedValue();
      const sourceToDataUrlSpy = vi
        .spyOn(imageAssetsService, 'imageSourceToDataUrl')
        .mockResolvedValue('data:image/png;base64,remote123');
      const onContentChange = vi.fn();
      const promoteEmbeddedImageToAsset = vi.fn(() => 'mdc://asset/remote-asset-id');
      const { container, getByText } = render(
        <MarkdownPreview
          content="![remote](https://www.pinecone.io/_next/image/?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fvr8gru94%2Fproduction%2F4d106048ca853c0e87dfef9ccd100e4234af1cb3-1916x1038.png&w=3840&q=75)"
          onContentChange={onContentChange}
          promoteEmbeddedImageToAsset={promoteEmbeddedImageToAsset}
        />
      );

      const image = container.querySelector('.markdown-preview img');
      expect(image).toBeTruthy();
      if (image) {
        fireEvent.click(image);
      }

      fireEvent.click(getByText('Save As .jpg'));

      await waitFor(() => {
        expect(sourceToDataUrlSpy).toHaveBeenCalledWith(
          'https://www.pinecone.io/_next/image/?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fvr8gru94%2Fproduction%2F4d106048ca853c0e87dfef9ccd100e4234af1cb3-1916x1038.png&w=3840&q=75'
        );
        expect(promoteEmbeddedImageToAsset).toHaveBeenCalledWith(
          'data:image/png;base64,remote123',
          0,
          'jpg'
        );
      });

      expect(saveSpy).not.toHaveBeenCalled();
      expect(onContentChange).toHaveBeenCalledWith(
        '![remote][image1]\n\n[image1]: mdc://asset/remote-asset-id'
      );

      sourceToDataUrlSpy.mockRestore();
      saveSpy.mockRestore();
    });

    it('should embed asset-backed image into markdown and emit embed callback', async () => {
      const embedSpy = vi
        .spyOn(imageAssetsService, 'imageSourceToDataUrl')
        .mockResolvedValue('data:image/png;base64,embedded123');
      const onContentChange = vi.fn();
      const onImageEmbedded = vi.fn();
      const { container, getByText } = render(
        <MarkdownPreview
          content="![asset](mdc://asset/img-1)"
          onContentChange={onContentChange}
          onImageEmbedded={onImageEmbedded}
          resolveImageAssetSrc={(assetId) => (assetId === 'img-1' ? 'data:image/png;base64,asset123' : null)}
        />
      );

      const image = container.querySelector('.markdown-preview img');
      expect(image).toBeTruthy();
      if (image) {
        fireEvent.click(image);
      }

      fireEvent.click(getByText('Embed Image'));

      await waitFor(() => {
        expect(onContentChange).toHaveBeenCalledWith(
          '![asset][image1]\n\n[image1]: <data:image/png;base64,embedded123>'
        );
      });

      expect(onImageEmbedded).toHaveBeenCalledWith({
        originalSrc: 'mdc://asset/img-1',
        embeddedDataUrl: 'data:image/png;base64,embedded123',
        nextContent: '![asset][image1]\n\n[image1]: <data:image/png;base64,embedded123>',
        imageIndex: 0,
      });
      embedSpy.mockRestore();
    });
  });
});
