import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ExportDocxModal } from '../ExportDocxModal';
import { useStore } from '../../store';
import { exportDocx } from '../../services/docx';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock docx service
vi.mock('../../services/docx', () => ({
  exportDocx: vi.fn(),
}));

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ExportDocxModal', () => {
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
    (exportDocx as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      expect(getByText('Export as Word Document')).toBeTruthy();
    });

    it('should display document name', () => {
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      expect(getByText('test.docx')).toBeTruthy();
    });

    it('should display conversion information', () => {
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      expect(getByText(/The following will be converted/)).toBeTruthy();
      expect(getByText('Headings → Word heading styles')).toBeTruthy();
      expect(getByText('Bold, italic, strikethrough → Formatted text')).toBeTruthy();
      expect(getByText('Lists → Bulleted/numbered lists')).toBeTruthy();
      expect(getByText('Code blocks → Monospace formatted text')).toBeTruthy();
      expect(getByText('Tables → Word tables')).toBeTruthy();
      expect(getByText('Links → Hyperlinks')).toBeTruthy();
      expect(getByText('Blockquotes → Indented text with border')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(<ExportDocxModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should render export button', () => {
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      expect(getByText('Export')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should close modal when overlay is clicked', () => {
      const { container } = render(<ExportDocxModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<ExportDocxModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Cancel button is clicked', () => {
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      const cancelButton = getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export Actions', () => {
    it('should export document when Export button is clicked', async () => {
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(exportDocx).toHaveBeenCalledWith('# Test\n\nContent here', 'test.md');
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Exported to Word document',
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show loading state while exporting', async () => {
      (exportDocx as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      // Should show "Exporting..." text
      await waitFor(() => {
        expect(getByText('Exporting...')).toBeTruthy();
      });
    });

    it('should handle export errors gracefully', async () => {
      (exportDocx as any).mockRejectedValueOnce(new Error('Export failed'));
      
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to export document',
        });
      });
    });

    it('should close modal if no active tab', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [],
        activeTabId: null,
      });
      
      render(<ExportDocxModal onClose={mockOnClose} />);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should remove file extension from document name', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [
          {
            ...mockStore.tabs[0],
            title: 'document.mdx',
          },
        ],
      });
      
      const { getByText } = render(<ExportDocxModal onClose={mockOnClose} />);
      expect(getByText('document.docx')).toBeTruthy();
    });
  });
});

