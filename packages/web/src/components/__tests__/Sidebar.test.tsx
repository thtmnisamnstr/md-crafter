import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('Sidebar', () => {
  const mockCreateNewDocument = vi.fn();
  const mockOpenCloudDocument = vi.fn();
  const mockDeleteCloudDocument = vi.fn();
  const mockLoadCloudDocuments = vi.fn();
  const mockSetShowAuth = vi.fn();
  const mockSetShowSettings = vi.fn();
  const mockLogout = vi.fn();
  const mockSetActiveTab = vi.fn();
  const mockSetConfirmation = vi.fn();
  const mockClearConfirmation = vi.fn();

  const mockStore = {
    isAuthenticated: false,
    cloudDocuments: [],
    tabs: [
      {
        id: 'tab-1',
        title: 'file1.md',
        content: '# Hello',
        language: 'markdown',
        isDirty: false,
        syncStatus: 'local' as const,
        isCloudSynced: false,
        savedContent: '# Hello',
      },
      {
        id: 'tab-2',
        title: 'file2.md',
        content: 'console.log("test");',
        language: 'javascript',
        isDirty: true,
        syncStatus: 'local' as const,
        isCloudSynced: false,
        savedContent: '',
      },
    ],
    activeTabId: 'tab-1',
    createNewDocument: mockCreateNewDocument,
    openCloudDocument: mockOpenCloudDocument,
    deleteCloudDocument: mockDeleteCloudDocument,
    loadCloudDocuments: mockLoadCloudDocuments,
    setShowAuth: mockSetShowAuth,
    setShowSettings: mockSetShowSettings,
    logout: mockLogout,
    setActiveTab: mockSetActiveTab,
    setConfirmation: mockSetConfirmation,
    clearConfirmation: mockClearConfirmation,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render sidebar', () => {
      const { getByRole } = render(<Sidebar />);
      expect(getByRole('navigation', { name: 'File explorer' })).toBeTruthy();
    });

    it('should show header with title', () => {
      const { getByText } = render(<Sidebar />);
      expect(getByText('md-crafter')).toBeTruthy();
    });

    it('should show New Document button', () => {
      const { getByLabelText } = render(<Sidebar />);
      expect(getByLabelText('Create new document')).toBeTruthy();
    });

    it('should show Settings button', () => {
      const { getByTitle } = render(<Sidebar />);
      expect(getByTitle('Settings')).toBeTruthy();
    });
  });

  describe('Open Tabs Section', () => {
    it('should render open tabs section', () => {
      const { getByText } = render(<Sidebar />);
      expect(getByText('OPEN EDITORS')).toBeTruthy();
    });

    it('should show tab count', () => {
      const { getByText } = render(<Sidebar />);
      expect(getByText('2')).toBeTruthy(); // 2 tabs
    });

    it('should render open tabs', () => {
      const { getByText } = render(<Sidebar />);
      expect(getByText('file1.md')).toBeTruthy();
      expect(getByText('file2.md')).toBeTruthy();
    });

    it('should show dirty indicator for unsaved tabs', () => {
      const { getByText } = render(<Sidebar />);
      const tab2 = getByText('file2.md').closest('.sidebar-item');
      expect(tab2?.textContent).toContain('●');
    });

    it('should mark active tab', () => {
      const { getByText } = render(<Sidebar />);
      const tab1 = getByText('file1.md').closest('.sidebar-item');
      expect(tab1?.className).toContain('active');
    });

    it('should show "No open editors" when no tabs', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [],
      });

      const { getByText } = render(<Sidebar />);
      expect(getByText('No open editors')).toBeTruthy();
    });

    it('should toggle open tabs section', () => {
      const { getByText, queryByText } = render(<Sidebar />);
      
      // Initially visible
      expect(getByText('file1.md')).toBeTruthy();
      
      // Click header to collapse
      const header = getByText('OPEN EDITORS').closest('button');
      if (header) {
        fireEvent.click(header);
      }
      
      // Should be hidden
      expect(queryByText('file1.md')).toBeFalsy();
    });

    it('should switch to tab when clicked', () => {
      const { getByText } = render(<Sidebar />);
      
      const tab2 = getByText('file2.md').closest('.sidebar-item');
      if (tab2) {
        fireEvent.click(tab2);
      }
      
      expect(mockSetActiveTab).toHaveBeenCalledWith('tab-2');
    });
  });

  describe('Cloud Documents Section', () => {
    it('should render cloud documents section', () => {
      const { getByText } = render(<Sidebar />);
      expect(getByText('CLOUD DOCUMENTS')).toBeTruthy();
    });

    it('should show sign in prompt when not authenticated', () => {
      const { getByText } = render(<Sidebar />);
      expect(getByText('Sign in to sync your documents')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should show cloud documents when authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
          { id: 'doc2', title: 'cloud2.md', content: '', updatedAt: new Date() },
        ],
      });

      const { getByText } = render(<Sidebar />);
      expect(getByText('cloud1.md')).toBeTruthy();
      expect(getByText('cloud2.md')).toBeTruthy();
    });

    it('should show "No cloud documents" when authenticated but no documents', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [],
      });

      const { getByText } = render(<Sidebar />);
      expect(getByText('No cloud documents')).toBeTruthy();
    });

    it('should toggle cloud documents section', () => {
      const { getByText, queryByText } = render(<Sidebar />);
      
      // Initially visible (shows sign in prompt)
      expect(getByText('Sign in to sync your documents')).toBeTruthy();
      
      // Click header to collapse
      const header = getByText('CLOUD DOCUMENTS').closest('button');
      if (header) {
        fireEvent.click(header);
      }
      
      // Should be hidden
      expect(queryByText('Sign in to sync your documents')).toBeFalsy();
    });

    it('should show refresh button when authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
        ],
      });

      const { getByTitle } = render(<Sidebar />);
      expect(getByTitle('Refresh')).toBeTruthy();
    });

    it('should refresh cloud documents when refresh button is clicked', async () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
        ],
      });

      const { getByTitle } = render(<Sidebar />);
      const refreshButton = getByTitle('Refresh');
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockLoadCloudDocuments).toHaveBeenCalled();
      });
    });

    it('should open cloud document when clicked', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
        ],
      });

      const { getByText } = render(<Sidebar />);
      const doc = getByText('cloud1.md').closest('.sidebar-item');
      
      if (doc) {
        fireEvent.click(doc);
      }
      
      expect(mockOpenCloudDocument).toHaveBeenCalledWith('doc1');
    });

    it('should show delete button on hover for cloud documents', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
        ],
      });

      const { getByText, container } = render(<Sidebar />);
      const doc = getByText('cloud1.md').closest('.sidebar-item');
      
      if (doc) {
        // Hover to show delete button
        fireEvent.mouseEnter(doc);
        
        const deleteButton = container.querySelector('button[title="Delete"]');
        expect(deleteButton).toBeTruthy();
      }
    });

    it('should show confirmation when delete button is clicked', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
        ],
      });

      const { getByText, container } = render(<Sidebar />);
      const doc = getByText('cloud1.md').closest('.sidebar-item');
      
      if (doc) {
        fireEvent.mouseEnter(doc);
        const deleteButton = container.querySelector('button[title="Delete"]');
        
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      }
      
      expect(mockSetConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Document',
          message: 'Delete this document permanently? This action cannot be undone.',
          variant: 'danger',
        })
      );
    });

    it('should open auth modal when sign in button is clicked', () => {
      const { getByText } = render(<Sidebar />);
      const signInButton = getByText('Sign In');
      
      fireEvent.click(signInButton);
      
      expect(mockSetShowAuth).toHaveBeenCalledWith(true);
    });
  });

  describe('Footer', () => {
    it('should show sign out button when authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
      });

      const { getByLabelText } = render(<Sidebar />);
      expect(getByLabelText('Sign out')).toBeTruthy();
    });

    it('should not show sign out button when not authenticated', () => {
      const { queryByLabelText } = render(<Sidebar />);
      expect(queryByLabelText('Sign out')).toBeFalsy();
    });

    it('should logout when sign out button is clicked', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
      });

      const { getByLabelText } = render(<Sidebar />);
      const signOutButton = getByLabelText('Sign out');
      
      fireEvent.click(signOutButton);
      
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should create new document when New Document button is clicked', () => {
      const { getByLabelText } = render(<Sidebar />);
      const newDocButton = getByLabelText('Create new document');
      
      fireEvent.click(newDocButton);
      
      expect(mockCreateNewDocument).toHaveBeenCalled();
    });

    it('should open settings when Settings button is clicked', () => {
      const { getByTitle } = render(<Sidebar />);
      const settingsButton = getByTitle('Settings');
      
      fireEvent.click(settingsButton);
      
      expect(mockSetShowSettings).toHaveBeenCalledWith(true);
    });
  });
});

