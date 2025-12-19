import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ExportModal } from '../ExportModal';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: Object.assign(vi.fn(), {
    getState: vi.fn(),
  }),
}));

// Mock marked
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((content: string) => `<p>${content}</p>`),
  },
}));

describe('ExportModal', () => {
  const mockOnClose = vi.fn();
  const mockAddToast = vi.fn();

  const mockStore = {
    tabs: [
      {
        id: 'tab-1',
        title: 'test.md',
        content: '# Test\n\nContent here',
        language: 'markdown',
        isDirty: false,
        syncStatus: 'local' as const,
        isCloudSynced: false,
        savedContent: '# Test\n\nContent here',
      },
    ],
    activeTabId: 'tab-1',
    addToast: mockAddToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    (useStore.getState as any) = vi.fn(() => mockStore);
    
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement and appendChild/removeChild for anchor elements only
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockAnchor as any;
      }
      return originalCreateElement(tagName);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
      if (node === mockAnchor) {
        return mockAnchor as any;
      }
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: any) => {
      if (node === mockAnchor) {
        return mockAnchor as any;
      }
      return node;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      // Component should not call onClose if activeTab exists
      expect(mockOnClose).not.toHaveBeenCalled();
      // Check that component rendered (not null)
      expect(container.innerHTML).not.toBe('');
      expect(container.textContent).toContain('Export Document');
    });

    it('should display current document title', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      expect(container.textContent).toMatch(/Export "test.md"/);
    });

    it('should render format options', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      expect(container.textContent).toContain('HTML');
      expect(container.textContent).toContain('Markdown');
    });

    it('should render format descriptions', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      expect(container.textContent).toContain('Standalone HTML file with styling');
      expect(container.textContent).toContain('Raw markdown source file');
    });

    it('should default to HTML format', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const htmlOption = Array.from(container.querySelectorAll('label')).find(
        (label) => label.textContent?.includes('HTML')
      );
      expect(htmlOption?.className).toContain('border-editor-accent');
    });

    it('should render close button', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should render export button', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      expect(container.textContent).toContain('Export');
    });
  });

  describe('Interactions', () => {
    it('should close modal when overlay is clicked', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Cancel button is clicked', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const cancelButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Cancel'
      );
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should switch to Markdown format when clicked', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const markdownOption = Array.from(container.querySelectorAll('label')).find(
        (label) => label.textContent?.includes('Markdown')
      );
      if (markdownOption) {
        fireEvent.click(markdownOption);
      }
      expect(markdownOption?.className).toContain('border-editor-accent');
    });

    it('should switch to HTML format when clicked', () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      // First switch to Markdown
      const markdownOption = Array.from(container.querySelectorAll('label')).find(
        (label) => label.textContent?.includes('Markdown')
      );
      if (markdownOption) {
        fireEvent.click(markdownOption);
      }
      // Then switch back to HTML
      const htmlOption = Array.from(container.querySelectorAll('label')).find(
        (label) => label.textContent?.includes('HTML')
      );
      if (htmlOption) {
        fireEvent.click(htmlOption);
      }
      expect(htmlOption?.className).toContain('border-editor-accent');
    });
  });

  describe('Export Actions', () => {
    it('should export as HTML when HTML format is selected', async () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const exportButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Export'
      );
      
      if (exportButton) {
        fireEvent.click(exportButton);
      }
      
      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Exported as test.html',
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should export as Markdown when Markdown format is selected', async () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      const markdownOption = Array.from(container.querySelectorAll('label')).find(
        (label) => label.textContent?.includes('Markdown')
      );
      if (markdownOption) {
        fireEvent.click(markdownOption);
      }
      
      const exportButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Export'
      );
      if (exportButton) {
        fireEvent.click(exportButton);
      }
      
      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Exported as test.md',
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle export errors gracefully', async () => {
      const { container } = render(<ExportModal onClose={mockOnClose} />);
      // Mock an error in createElement
      vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
        throw new Error('Export failed');
      });
      
      const exportButton = Array.from(container.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'Export'
      );
      if (exportButton) {
        fireEvent.click(exportButton);
      }
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to export file',
        });
      });
    });

    it('should close modal if no active tab', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [],
        activeTabId: null,
      });
      
      render(<ExportModal onClose={mockOnClose} />);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

