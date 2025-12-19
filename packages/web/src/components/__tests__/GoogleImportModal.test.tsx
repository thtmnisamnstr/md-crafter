import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { GoogleImportModal } from '../GoogleImportModal';
import { useStore } from '../../store';
import * as googleService from '../../services/google';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock Google service
vi.mock('../../services/google', () => ({
  isGoogleConfigured: vi.fn(),
  isGoogleSignedIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  openGooglePicker: vi.fn(),
  exportGoogleDocAsMarkdown: vi.fn(),
}));

describe('GoogleImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOpenTab = vi.fn();
  const mockAddToast = vi.fn();

  const mockStore = {
    openTab: mockOpenTab,
    addToast: mockAddToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    (googleService.isGoogleConfigured as any).mockReturnValue(true);
    (googleService.isGoogleSignedIn as any).mockReturnValue(false);
    (googleService.signInWithGoogle as any).mockResolvedValue(undefined);
    (googleService.openGooglePicker as any).mockResolvedValue({
      id: 'doc-123',
      name: 'Test Document',
    });
    (googleService.exportGoogleDocAsMarkdown as any).mockResolvedValue('# Test\n\nContent');
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering - Not Configured', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(false);
    });

    it('should show not configured message when Google API is not configured', () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      expect(getByText('Google API Not Configured')).toBeTruthy();
      expect(getByText(/This feature requires Google API credentials/)).toBeTruthy();
    });

    it('should show setup instructions', () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      expect(getByText('Setup Instructions:')).toBeTruthy();
    });

    it('should copy environment template to clipboard', async () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const copyButton = getByText('Copy template to clipboard');
      
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Environment template copied to clipboard',
        });
      });
    });
  });

  describe('Rendering - Not Signed In', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(true);
      (googleService.isGoogleSignedIn as any).mockReturnValue(false);
    });

    it('should show sign in prompt when not signed in', () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      expect(getByText('Connect to Google Drive')).toBeTruthy();
      expect(getByText(/Sign in with Google to import documents/)).toBeTruthy();
      expect(getByText('Sign in with Google')).toBeTruthy();
    });

    it('should sign in when Sign in button is clicked', async () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const signInButton = getByText('Sign in with Google');
      
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(googleService.signInWithGoogle).toHaveBeenCalled();
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Connected to Google Drive',
        });
      });
    });

    it('should handle sign in errors', async () => {
      (googleService.signInWithGoogle as any).mockRejectedValueOnce(new Error('Sign in failed'));
      
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const signInButton = getByText('Sign in with Google');
      
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to sign in with Google',
        });
      });
    });
  });

  describe('Rendering - Signed In', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(true);
      (googleService.isGoogleSignedIn as any).mockReturnValue(true);
    });

    it('should show file picker when signed in', () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      expect(getByText(/Select a Google Doc to import/)).toBeTruthy();
      expect(getByText('Click to select a document')).toBeTruthy();
    });

    it('should display selected file', async () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const selectButton = getByText('Click to select a document');
      
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(getByText('Test Document')).toBeTruthy();
        expect(getByText('Google Doc')).toBeTruthy();
      });
    });

    it('should allow changing selected file', async () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const selectButton = getByText('Click to select a document');
      
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(getByText('Test Document')).toBeTruthy();
      });
      
      const changeButton = getByText('Change');
      fireEvent.click(changeButton);
      
      expect(getByText('Click to select a document')).toBeTruthy();
    });
  });

  describe('Import Actions', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(true);
      (googleService.isGoogleSignedIn as any).mockReturnValue(true);
    });

    it('should import document when Import button is clicked', async () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const selectButton = getByText('Click to select a document');
      
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(getByText('Test Document')).toBeTruthy();
      });
      
      const importButton = getByText('Import');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(googleService.exportGoogleDocAsMarkdown).toHaveBeenCalledWith('doc-123');
        expect(mockOpenTab).toHaveBeenCalledWith({
          title: 'Test Document.md',
          content: '# Test\n\nContent',
          language: 'markdown',
        });
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Imported "Test Document"',
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle file picker errors', async () => {
      (googleService.openGooglePicker as any).mockRejectedValueOnce(new Error('Picker failed'));
      
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const selectButton = getByText('Click to select a document');
      
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to open file picker',
        });
      });
    });

    it('should handle import errors gracefully', async () => {
      (googleService.exportGoogleDocAsMarkdown as any).mockRejectedValueOnce(
        new Error('Import failed')
      );
      
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const selectButton = getByText('Click to select a document');
      
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(getByText('Test Document')).toBeTruthy();
      });
      
      const importButton = getByText('Import');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to import document',
        });
      });
    });

    it('should show loading state while importing', async () => {
      (googleService.exportGoogleDocAsMarkdown as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const selectButton = getByText('Click to select a document');
      
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(getByText('Test Document')).toBeTruthy();
      });
      
      const importButton = getByText('Import');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(getByText('Importing...')).toBeTruthy();
      });
    });

    it('should not show import button if no file is selected', () => {
      const { queryByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      expect(queryByText('Import')).toBeFalsy();
    });
  });

  describe('Interactions', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(true);
      (googleService.isGoogleSignedIn as any).mockReturnValue(true);
    });

    it('should close modal when overlay is clicked', () => {
      const { container } = render(<GoogleImportModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<GoogleImportModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Cancel button is clicked', () => {
      const { getByText } = render(<GoogleImportModal onClose={mockOnClose} />);
      const cancelButton = getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});

