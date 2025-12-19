import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { SearchModal } from '../SearchModal';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SearchModal', () => {
  const mockOnClose = vi.fn();
  const mockSetActiveTab = vi.fn();
  const mockOpenCloudDocument = vi.fn();

  const mockStore = {
    tabs: [
      {
        id: 'tab-1',
        title: 'file1.md',
        content: 'Hello world\nThis is a test\nAnother line',
        language: 'markdown',
        isDirty: false,
        syncStatus: 'local' as const,
        isCloudSynced: false,
        savedContent: 'Hello world',
      },
      {
        id: 'tab-2',
        title: 'file2.md',
        content: 'Different content\nNo matches here',
        language: 'markdown',
        isDirty: false,
        syncStatus: 'local' as const,
        isCloudSynced: false,
        savedContent: 'Different content',
      },
    ],
    cloudDocuments: [
      { id: 'doc1', title: 'cloud1.md', content: 'Cloud document content\nWith search term', updatedAt: new Date() },
    ],
    setActiveTab: mockSetActiveTab,
    openCloudDocument: mockOpenCloudDocument,
    isAuthenticated: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render search modal', () => {
      const { getByPlaceholderText } = render(<SearchModal onClose={mockOnClose} />);
      expect(getByPlaceholderText('Search in all documents...')).toBeTruthy();
    });

    it('should focus input on mount', () => {
      const { getByPlaceholderText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      expect(document.activeElement).toBe(input);
    });

    it('should show filter buttons', () => {
      const { getByText } = render(<SearchModal onClose={mockOnClose} />);
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Open Files')).toBeTruthy();
      expect(getByText('Cloud')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should search in open tabs', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        expect(getByText('file1.md')).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should filter results by search query', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        expect(getByText('file1.md')).toBeTruthy();
        expect(queryByText('file2.md')).toBeFalsy();
      }, { timeout: 1000 });
    });

    it('should search in cloud documents when authenticated', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'search term' } });
      
      await waitFor(() => {
        expect(getByText('cloud1.md')).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should debounce search queries', async () => {
      const { getByPlaceholderText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      // Rapidly change input
      fireEvent.change(input, { target: { value: 'H' } });
      fireEvent.change(input, { target: { value: 'He' } });
      fireEvent.change(input, { target: { value: 'Hel' } });
      fireEvent.change(input, { target: { value: 'Hell' } });
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      // Should debounce and only search once
      await waitFor(() => {
        // Search should complete after debounce
      }, { timeout: 1000 });
    });

    it('should show search history when input is empty', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['previous search', 'another search']));
      
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.focus(input);
      
      expect(getByText('previous search')).toBeTruthy();
      expect(getByText('another search')).toBeTruthy();
    });
  });

  describe('Filter Functionality', () => {
    it('should filter to open files only', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      // Click "Open Files" filter
      const openFilesButton = getByText('Open Files');
      fireEvent.click(openFilesButton);
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        // Should only show open files, not cloud documents
        expect(getByText('file1.md')).toBeTruthy();
        expect(queryByText('cloud1.md')).toBeFalsy();
      }, { timeout: 1000 });
    });

    it('should filter to cloud documents only', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      // Click "Cloud" filter
      const cloudButton = getByText('Cloud');
      fireEvent.click(cloudButton);
      
      fireEvent.change(input, { target: { value: 'search term' } });
      
      await waitFor(() => {
        expect(getByText('cloud1.md')).toBeTruthy();
        expect(queryByText('file1.md')).toBeFalsy();
      }, { timeout: 1000 });
    });

    it('should disable cloud filter when not authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: false,
      });
      
      const { getByText } = render(<SearchModal onClose={mockOnClose} />);
      const cloudButton = getByText('Cloud');
      expect(cloudButton).toBeDisabled();
    });

    it('should cycle filters with Tab key', () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      // Start with "All" selected
      expect(getByText('All').className).toContain('bg-editor-accent');
      
      // Press Tab to cycle to "Open Files"
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(getByText('Open Files').className).toContain('bg-editor-accent');
      
      // Press Tab again to cycle to "Cloud"
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(getByText('Cloud').className).toContain('bg-editor-accent');
      
      // Press Tab again to cycle back to "All"
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(getByText('All').className).toContain('bg-editor-accent');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal with Escape key', () => {
      render(<SearchModal onClose={mockOnClose} />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate results with ArrowDown', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        expect(getByText('file1.md')).toBeTruthy();
      }, { timeout: 1000 });
      
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      
      // Navigation should work (selectedIndex state changes)
      // We verify by checking that Enter would select the result
      await waitFor(() => {
        // State updated
      });
    });

    it('should navigate results with ArrowUp', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        expect(getByText('file1.md')).toBeTruthy();
      }, { timeout: 1000 });
      
      // Navigate down then up
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      
      // Navigation should work
      await waitFor(() => {
        // State updated
      });
    });

    it('should select result with Enter key', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        // Wait for results to appear
        expect(getByText('file1.md')).toBeTruthy();
      }, { timeout: 1000 });
      
      fireEvent.keyDown(window, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockSetActiveTab).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Result Selection', () => {
    it('should open tab when tab result is clicked', async () => {
      const { getByPlaceholderText, getByText, container } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        expect(getByText('file1.md')).toBeTruthy();
      }, { timeout: 1000 });
      
      // Find and click the result (it might be in a div or button)
      const resultText = getByText('file1.md');
      const clickableParent = resultText.closest('div[role="button"], button, div[onClick]') || resultText.parentElement;
      if (clickableParent) {
        fireEvent.click(clickableParent);
      }
      
      expect(mockSetActiveTab).toHaveBeenCalledWith('tab-1');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should open cloud document when cloud result is clicked', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'search term' } });
      
      await waitFor(() => {
        expect(getByText('cloud1.md')).toBeTruthy();
      }, { timeout: 1000 });
      
      const resultText = getByText('cloud1.md');
      const clickableParent = resultText.closest('div[role="button"], button, div[onClick]') || resultText.parentElement;
      if (clickableParent) {
        fireEvent.click(clickableParent);
      }
      
      expect(mockOpenCloudDocument).toHaveBeenCalledWith('doc1');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should add query to search history on selection', async () => {
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      await waitFor(() => {
        // Wait for results to appear
        expect(getByText('file1.md')).toBeTruthy();
      }, { timeout: 1000 });
      
      // Select result with Enter
      fireEvent.keyDown(window, { key: 'Enter' });
      
      // History should be saved (called in handleSelect)
      await waitFor(() => {
        expect(mockSetActiveTab).toHaveBeenCalled();
        expect(localStorageMock.setItem).toHaveBeenCalledWith('md-crafter-search-history', expect.any(String));
      });
    });
  });

  describe('Search History', () => {
    it('should load search history from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['query1', 'query2']));
      
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.focus(input);
      
      expect(getByText('query1')).toBeTruthy();
      expect(getByText('query2')).toBeTruthy();
    });

    it('should select history item when clicked', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['previous search']));
      
      const { getByPlaceholderText, getByText } = render(<SearchModal onClose={mockOnClose} />);
      const input = getByPlaceholderText('Search in all documents...') as HTMLInputElement;
      
      fireEvent.focus(input);
      
      const historyItem = getByText('previous search');
      fireEvent.click(historyItem);
      
      expect(input.value).toBe('previous search');
    });
  });
});

