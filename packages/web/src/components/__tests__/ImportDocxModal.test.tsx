import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ImportDocxModal } from '../ImportDocxModal';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('ImportDocxModal', () => {
  const mockOnClose = vi.fn();
  const mockImportDocxFile = vi.fn();
  const mockAddToast = vi.fn();

  const mockStore = {
    importDocxFile: mockImportDocxFile,
    addToast: mockAddToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    mockImportDocxFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      const { getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      expect(getByText('Import from Word')).toBeTruthy();
    });

    it('should render description', () => {
      const { getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      expect(getByText(/Import a Microsoft Word document/)).toBeTruthy();
    });

    it('should render drag and drop area', () => {
      const { getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      expect(getByText('Drag and drop a .docx file here')).toBeTruthy();
      expect(getByText('Browse Files')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(<ImportDocxModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should render import button (disabled initially)', () => {
      const { getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const importButton = getByText('Import');
      expect(importButton).toBeTruthy();
      expect(importButton).toBeDisabled();
    });
  });

  describe('File Selection', () => {
    it('should select file via file input', () => {
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const browseButton = getByText('Browse Files');
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      fireEvent.click(browseButton);
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(getByText('test.docx')).toBeTruthy();
    });

    it('should select file via drag and drop', () => {
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const dropZone = container.querySelector('.border-dashed');
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const dataTransfer = {
        files: [file],
      };
      
      if (dropZone) {
        fireEvent.dragOver(dropZone, { dataTransfer } as any);
        fireEvent.drop(dropZone, { dataTransfer } as any);
      }
      
      expect(getByText('test.docx')).toBeTruthy();
    });

    it('should show file size when file is selected', () => {
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['x'.repeat(1024)], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(getByText(/1.0 KB/)).toBeTruthy();
    });

    it('should show error for non-docx files', () => {
      const { container } = render(<ImportDocxModal onClose={mockOnClose} />);
      const dropZone = container.querySelector('.border-dashed');
      
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = {
        files: [file],
      };
      
      if (dropZone) {
        fireEvent.drop(dropZone, { dataTransfer } as any);
      }
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Please select a .docx file',
      });
    });

    it('should allow changing selected file', () => {
      const { container, getByText, queryByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(getByText('test.docx')).toBeTruthy();
      
      const changeButton = getByText('Choose a different file');
      fireEvent.click(changeButton);
      
      expect(queryByText('test.docx')).toBeFalsy();
      expect(getByText('Drag and drop a .docx file here')).toBeTruthy();
    });

    it('should enable import button when file is selected', () => {
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const importButton = getByText('Import');
      expect(importButton).not.toBeDisabled();
    });

    it('should show dragging state when dragging over', () => {
      const { container } = render(<ImportDocxModal onClose={mockOnClose} />);
      const dropZone = container.querySelector('.border-dashed');
      
      if (dropZone) {
        fireEvent.dragOver(dropZone);
        expect(dropZone.className).toContain('border-editor-accent');
      }
    });
  });

  describe('Interactions', () => {
    it('should close modal when overlay is clicked', () => {
      const { container } = render(<ImportDocxModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<ImportDocxModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Cancel button is clicked', () => {
      const { getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const cancelButton = getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Import Actions', () => {
    it('should import file when Import button is clicked', async () => {
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const importButton = getByText('Import');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(mockImportDocxFile).toHaveBeenCalledWith(file);
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Imported test.docx',
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show loading state while importing', async () => {
      mockImportDocxFile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const importButton = getByText('Import');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(getByText('Importing...')).toBeTruthy();
      });
    });

    it('should handle import errors gracefully', async () => {
      mockImportDocxFile.mockRejectedValueOnce(new Error('Import failed'));
      
      const { container, getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const importButton = getByText('Import');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to import document',
        });
      });
    });

    it('should not import if no file is selected', () => {
      const { getByText } = render(<ImportDocxModal onClose={mockOnClose} />);
      const importButton = getByText('Import');
      expect(importButton).toBeDisabled();
    });
  });
});

