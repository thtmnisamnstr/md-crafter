import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ConflictModal } from '../ConflictModal';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock diffLines
vi.mock('@md-crafter/shared', () => ({
  diffLines: vi.fn((local: string, remote: string) => {
    // Simple mock diff
    const localLines = local.split('\n').length;
    const remoteLines = remote.split('\n').length;
    return {
      insertions: Math.max(0, remoteLines - localLines),
      deletions: Math.max(0, localLines - remoteLines),
    };
  }),
}));

describe('ConflictModal', () => {
  const mockResolveConflict = vi.fn();
  const mockSetConflict = vi.fn();

  const mockConflict = {
    documentId: 'doc1',
    localContent: 'Local version\nLine 2',
    remoteContent: 'Remote version\nLine 2\nLine 3',
  };

  const mockStore = {
    conflict: mockConflict,
    resolveConflict: mockResolveConflict,
    setConflict: mockSetConflict,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render conflict modal when conflict exists', () => {
      const { getByText } = render(<ConflictModal />);
      expect(getByText('Sync Conflict Detected')).toBeTruthy();
    });

    it('should not render when no conflict', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        conflict: null,
      });

      const { container } = render(<ConflictModal />);
      expect(container.firstChild).toBeNull();
    });

    it('should show conflict description', () => {
      const { getByText } = render(<ConflictModal />);
      expect(getByText(/document has been modified/i)).toBeTruthy();
    });

    it('should show close button', () => {
      const { container } = render(<ConflictModal />);
      const closeButton = container.querySelector('button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<ConflictModal />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockSetConflict).toHaveBeenCalledWith(null);
    });
  });

  describe('Diff Display', () => {
    it('should show local and remote content side by side', () => {
      const { getByText } = render(<ConflictModal />);
      expect(getByText('Local Changes')).toBeTruthy();
      expect(getByText('Cloud Version')).toBeTruthy();
    });

    it('should display local content', () => {
      const { container } = render(<ConflictModal />);
      const preElements = container.querySelectorAll('pre');
      const localPre = Array.from(preElements).find(pre => 
        pre.textContent?.includes('Local version')
      );
      expect(localPre).toBeTruthy();
      expect(localPre?.textContent).toContain('Line 2');
    });

    it('should display remote content', () => {
      const { container } = render(<ConflictModal />);
      const preElements = container.querySelectorAll('pre');
      const remotePre = Array.from(preElements).find(pre => 
        pre.textContent?.includes('Remote version')
      );
      expect(remotePre).toBeTruthy();
      expect(remotePre?.textContent).toContain('Line 3');
    });

    it('should show diff statistics', () => {
      const { getByText } = render(<ConflictModal />);
      // Should show additions and deletions
      expect(getByText(/additions/i)).toBeTruthy();
      expect(getByText(/deletions/i)).toBeTruthy();
    });
  });

  describe('Resolution Options', () => {
    it('should show Keep Local button', () => {
      const { getByText } = render(<ConflictModal />);
      expect(getByText('Keep Local')).toBeTruthy();
    });

    it('should show Keep Remote button', () => {
      const { getByText } = render(<ConflictModal />);
      // Button text is "Keep Cloud" not "Keep Remote"
      expect(getByText('Keep Cloud')).toBeTruthy();
    });

    it('should show Merge button', () => {
      const { getByText } = render(<ConflictModal />);
      expect(getByText(/merge/i)).toBeTruthy();
    });

    it('should resolve conflict with keep_local', () => {
      const { getByText } = render(<ConflictModal />);
      const keepLocalButton = getByText('Keep Local');
      
      fireEvent.click(keepLocalButton);
      
      expect(mockResolveConflict).toHaveBeenCalledWith('keep_local');
    });

    it('should resolve conflict with keep_remote', () => {
      const { getByText } = render(<ConflictModal />);
      const keepRemoteButton = getByText('Keep Cloud');
      
      fireEvent.click(keepRemoteButton);
      
      expect(mockResolveConflict).toHaveBeenCalledWith('keep_remote');
    });
  });

  describe('Merge Functionality', () => {
    it('should show merge editor when Merge button is clicked', () => {
      const { getByText, container } = render(<ConflictModal />);
      const mergeButton = getByText(/manual merge/i);
      
      fireEvent.click(mergeButton);
      
      // Should show merge editor
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should initialize merge content with local content', () => {
      const { getByText, container } = render(<ConflictModal />);
      const mergeButton = getByText(/manual merge/i);
      
      fireEvent.click(mergeButton);
      
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Local version\nLine 2');
    });

    it('should allow editing merged content', () => {
      const { getByText, container } = render(<ConflictModal />);
      const mergeButton = getByText(/manual merge/i);
      
      fireEvent.click(mergeButton);
      
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Merged content' } });
      
      expect(textarea.value).toBe('Merged content');
    });

    it('should show Back to Compare button in merge mode', () => {
      const { getByText } = render(<ConflictModal />);
      const mergeButton = getByText(/merge/i);
      
      fireEvent.click(mergeButton);
      
      expect(getByText('Back to Compare')).toBeTruthy();
    });

    it('should return to diff view when Back to Compare is clicked', () => {
      const { getByText, queryByText } = render(<ConflictModal />);
      const mergeButton = getByText(/merge/i);
      
      fireEvent.click(mergeButton);
      expect(getByText('Merged Result')).toBeTruthy();
      
      const backButton = getByText('Back to Compare');
      fireEvent.click(backButton);
      
      // Should be back to diff view
      expect(queryByText('Merged Result')).toBeFalsy();
      expect(getByText('Local Changes')).toBeTruthy();
    });

    it('should resolve conflict with merge when Merge button is clicked in merge mode', () => {
      const { getByText, container } = render(<ConflictModal />);
      const mergeButton = getByText(/manual merge/i);
      
      // Enter merge mode
      fireEvent.click(mergeButton);
      
      // Edit merged content
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Merged content' } });
      
      // Click Save Merge button
      const saveMergeButton = getByText('Save Merge');
      fireEvent.click(saveMergeButton);
      
      expect(mockResolveConflict).toHaveBeenCalledWith('merge', 'Merged content');
    });
  });

  describe('Content Display', () => {
    it('should handle empty local content', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        conflict: {
          ...mockConflict,
          localContent: '',
        },
      });

      const { getByText } = render(<ConflictModal />);
      expect(getByText('Local Changes')).toBeTruthy();
    });

    it('should handle empty remote content', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        conflict: {
          ...mockConflict,
          remoteContent: '',
        },
      });

      const { getByText } = render(<ConflictModal />);
      expect(getByText('Cloud Version')).toBeTruthy();
    });

    it('should handle large content', () => {
      const largeContent = 'Line\n'.repeat(1000);
      (useStore as any).mockReturnValue({
        ...mockStore,
        conflict: {
          ...mockConflict,
          localContent: largeContent,
          remoteContent: largeContent + 'Extra',
        },
      });

      const { getByText } = render(<ConflictModal />);
      expect(getByText('Local Changes')).toBeTruthy();
      expect(getByText('Cloud Version')).toBeTruthy();
    });
  });
});

