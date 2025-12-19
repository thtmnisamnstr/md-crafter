import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { GoogleExportModal } from '../GoogleExportModal';
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
  createGoogleDocFromMarkdown: vi.fn(),
}));

describe('GoogleExportModal', () => {
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
    (googleService.isGoogleConfigured as any).mockReturnValue(true);
    (googleService.isGoogleSignedIn as any).mockReturnValue(false);
    (googleService.signInWithGoogle as any).mockResolvedValue(undefined);
    (googleService.createGoogleDocFromMarkdown as any).mockResolvedValue({
      id: 'doc-123',
      webViewLink: 'https://docs.google.com/document/d/doc-123',
    });
    
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
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText('Google API Not Configured')).toBeTruthy();
      expect(getByText(/This feature requires Google API credentials/)).toBeTruthy();
    });

    it('should show setup instructions', () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText('Setup Instructions:')).toBeTruthy();
      expect(getByText(/Create a Google Cloud Project/)).toBeTruthy();
      expect(getByText(/Enable Google Drive API/)).toBeTruthy();
    });

    it('should show environment variables template', () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText('Required Environment Variables:')).toBeTruthy();
      expect(getByText(/VITE_GOOGLE_CLIENT_ID/)).toBeTruthy();
      expect(getByText(/VITE_GOOGLE_API_KEY/)).toBeTruthy();
    });

    it('should copy environment template to clipboard', async () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      const copyButton = getByText('Copy template to clipboard');
      
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('VITE_GOOGLE_CLIENT_ID')
        );
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
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText('Connect to Google Drive')).toBeTruthy();
      expect(getByText(/Sign in with Google to export documents/)).toBeTruthy();
      expect(getByText('Sign in with Google')).toBeTruthy();
    });

    it('should sign in when Sign in button is clicked', async () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
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
      
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
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

    it('should show export interface when signed in', () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText(/Export "test.md"/)).toBeTruthy();
      expect(getByText(/Will be created as a Google Doc/)).toBeTruthy();
      expect(getByText('Export')).toBeTruthy();
    });

    it('should display document name', () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText('test')).toBeTruthy(); // Without extension
    });

    it('should show conversion information', () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      expect(getByText(/Your markdown will be converted to formatted text/)).toBeTruthy();
    });
  });

  describe('Export Actions', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(true);
      (googleService.isGoogleSignedIn as any).mockReturnValue(true);
    });

    it('should export document when Export button is clicked', async () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(googleService.createGoogleDocFromMarkdown).toHaveBeenCalledWith(
          'test.md',
          '# Test\n\nContent here'
        );
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Exported to Google Drive!',
        });
      });
    });

    it('should show success state with link after export', async () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(getByText('Document Created!')).toBeTruthy();
        expect(getByText(/Your document has been exported/)).toBeTruthy();
        const openLink = getByText('Open in Google Docs');
        expect(openLink.closest('a')).toHaveAttribute('href', 'https://docs.google.com/document/d/doc-123');
        expect(openLink.closest('a')).toHaveAttribute('target', '_blank');
      });
    });

    it('should handle export errors gracefully', async () => {
      (googleService.createGoogleDocFromMarkdown as any).mockRejectedValueOnce(
        new Error('Export failed')
      );
      
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to export to Google Drive',
        });
      });
    });

    it('should show loading state while exporting', async () => {
      (googleService.createGoogleDocFromMarkdown as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      const exportButton = getByText('Export');
      
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(getByText('Exporting...')).toBeTruthy();
      });
    });

    it('should close modal if no active tab', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [],
        activeTabId: null,
      });
      
      render(<GoogleExportModal onClose={mockOnClose} />);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    beforeEach(() => {
      (googleService.isGoogleConfigured as any).mockReturnValue(true);
      (googleService.isGoogleSignedIn as any).mockReturnValue(true);
    });

    it('should close modal when overlay is clicked', () => {
      const { container } = render(<GoogleExportModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<GoogleExportModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Cancel button is clicked', () => {
      const { getByText } = render(<GoogleExportModal onClose={mockOnClose} />);
      const cancelButton = getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});

