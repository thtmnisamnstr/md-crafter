import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { useStore } from '../../store';
import { THEMES } from '../../utils/themes';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('CommandPalette', () => {
  const mockSetShowCommandPalette = vi.fn();
  const mockCreateNewDocument = vi.fn();
  const mockSaveCurrentDocument = vi.fn();
  const mockSetShowSettings = vi.fn();
  const mockSetShowAuth = vi.fn();
  const mockToggleSidebar = vi.fn();
  const mockTogglePreview = vi.fn();
  const mockSetTheme = vi.fn();
  const mockLogout = vi.fn();
  const mockLoadCloudDocuments = vi.fn();
  const mockSaveDocumentToCloud = vi.fn();
  const mockOpenCloudDocument = vi.fn();
  const mockRemoveRecentFile = vi.fn();
  const mockSetActiveTab = vi.fn();
  const mockSetShowExport = vi.fn();
  const mockToggleZenMode = vi.fn();

  const mockStore = {
    setShowCommandPalette: mockSetShowCommandPalette,
    createNewDocument: mockCreateNewDocument,
    saveCurrentDocument: mockSaveCurrentDocument,
    setShowSettings: mockSetShowSettings,
    setShowAuth: mockSetShowAuth,
    toggleSidebar: mockToggleSidebar,
    togglePreview: mockTogglePreview,
    theme: 'dark',
    setTheme: mockSetTheme,
    isAuthenticated: false,
    logout: mockLogout,
    loadCloudDocuments: mockLoadCloudDocuments,
    tabs: [],
    activeTabId: null,
    saveDocumentToCloud: mockSaveDocumentToCloud,
    showPreview: false,
    showSidebar: true,
    cloudDocuments: [],
    openCloudDocument: mockOpenCloudDocument,
    recentFiles: [],
    removeRecentFile: mockRemoveRecentFile,
    setActiveTab: mockSetActiveTab,
    setShowExport: mockSetShowExport,
    toggleZenMode: mockToggleZenMode,
    zenMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    (useStore as any).getState = () => mockStore;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render command palette', () => {
      const { container } = render(<CommandPalette />);
      expect(container.querySelector('.command-palette')).toBeTruthy();
    });

    it('should show search input', () => {
      const { getByPlaceholderText } = render(<CommandPalette />);
      expect(getByPlaceholderText(/Type a command/)).toBeTruthy();
    });

    it('should focus input on mount', () => {
      const { getByPlaceholderText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      expect(document.activeElement).toBe(input);
    });

    it('should show footer hints', () => {
      const { getByText } = render(<CommandPalette />);
      expect(getByText('↑↓ to navigate')).toBeTruthy();
      expect(getByText('↵ to select')).toBeTruthy();
      expect(getByText('esc to close')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter commands by search query', () => {
      const { getByPlaceholderText, getByText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'save' } });
      
      expect(getByText('Save')).toBeTruthy();
      expect(getByText('Save to Cloud')).toBeTruthy();
    });

    it('should filter commands case-insensitively', () => {
      const { getByPlaceholderText, getByText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'SAVE' } });
      
      expect(getByText('Save')).toBeTruthy();
    });

    it('should show "No commands found" when no matches', () => {
      const { getByPlaceholderText, getByText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'nonexistentcommand' } });
      
      expect(getByText('No commands found')).toBeTruthy();
    });

    it('should switch to files mode when input starts with @', () => {
      const { getByPlaceholderText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '@test' } });
      
      expect(input.placeholder).toBe('Search files...');
    });

    it('should switch to commands mode when input is >', () => {
      const { getByPlaceholderText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      // First switch to files mode
      fireEvent.change(input, { target: { value: '@test' } });
      // Then switch back to commands
      fireEvent.change(input, { target: { value: '>' } });
      
      expect(input.placeholder).toBe('Type a command or @ to search files...');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with ArrowDown', () => {
      const { getByPlaceholderText, container } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      
      const selected = container.querySelector('.command-palette-item.selected');
      expect(selected).toBeTruthy();
    });

    it('should navigate up with ArrowUp', async () => {
      const { container } = render(<CommandPalette />);
      
      // Wait for component to render and keyboard handler to be set up
      await waitFor(() => {
        const items = container.querySelectorAll('.command-palette-item');
        expect(items.length).toBeGreaterThan(0);
      });
      
      // Initial state: index 0 is selected
      let items = container.querySelectorAll('.command-palette-item');
      let selected = container.querySelector('.command-palette-item.selected');
      expect(selected).toBeTruthy();
      let selectedIndex = Array.from(items).indexOf(selected!);
      expect(selectedIndex).toBe(0);
      
      // Navigate down to index 1
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      await waitFor(() => {
        items = container.querySelectorAll('.command-palette-item');
        selected = container.querySelector('.command-palette-item.selected');
        expect(selected).toBeTruthy();
        selectedIndex = Array.from(items).indexOf(selected!);
        expect(selectedIndex).toBe(1);
      });
      
      // Navigate down again to index 2
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      await waitFor(() => {
        items = container.querySelectorAll('.command-palette-item');
        selected = container.querySelector('.command-palette-item.selected');
        expect(selected).toBeTruthy();
        selectedIndex = Array.from(items).indexOf(selected!);
        expect(selectedIndex).toBe(2);
      });
      
      // Then navigate up back to index 1
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      await waitFor(() => {
        items = container.querySelectorAll('.command-palette-item');
        selected = container.querySelector('.command-palette-item.selected');
        expect(selected).toBeTruthy();
        selectedIndex = Array.from(items).indexOf(selected!);
        expect(selectedIndex).toBe(1);
      });
    });

    it('should not navigate below last item', () => {
      const { getByPlaceholderText, container } = render(<CommandPalette />);
      
      // Navigate down many times
      for (let i = 0; i < 100; i++) {
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      }
      
      const items = container.querySelectorAll('.command-palette-item');
      const selected = container.querySelector('.command-palette-item.selected');
      expect(selected).toBe(items[items.length - 1]);
    });

    it('should not navigate above first item', () => {
      const { getByPlaceholderText, container } = render(<CommandPalette />);
      
      // Navigate down then up many times
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      for (let i = 0; i < 100; i++) {
        fireEvent.keyDown(window, { key: 'ArrowUp' });
      }
      
      const items = container.querySelectorAll('.command-palette-item');
      const selected = container.querySelector('.command-palette-item.selected');
      expect(selected).toBe(items[0]);
    });

    it('should close palette with Escape', () => {
      render(<CommandPalette />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should switch from themes mode to commands mode with Escape', () => {
      const { getByPlaceholderText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      // Switch to themes mode
      fireEvent.change(input, { target: { value: 'theme' } });
      const changeThemeItem = document.querySelector('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Should be back in commands mode
      expect(input.placeholder).toBe('Type a command or @ to search files...');
    });

    it('should execute selected command with Enter', async () => {
      const { container } = render(<CommandPalette />);
      
      // Wait for component to render and keyboard handler to be set up
      await waitFor(() => {
        const items = container.querySelectorAll('.command-palette-item');
        expect(items.length).toBeGreaterThan(0);
      });
      
      // First item should be selected by default (index 0)
      // Press Enter to execute
      fireEvent.keyDown(window, { key: 'Enter' });
      
      // Should execute the first command (New File)
      await waitFor(() => {
        expect(mockCreateNewDocument).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });
  });

  describe('Command Execution', () => {
    it('should execute New File command', () => {
      const { getByText } = render(<CommandPalette />);
      
      const newFileItem = getByText('New File').closest('.command-palette-item');
      if (newFileItem) {
        fireEvent.click(newFileItem);
      }
      
      expect(mockCreateNewDocument).toHaveBeenCalled();
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should execute Save command', () => {
      const { getByText } = render(<CommandPalette />);
      
      const saveItem = getByText('Save').closest('.command-palette-item');
      if (saveItem) {
        fireEvent.click(saveItem);
      }
      
      expect(mockSaveCurrentDocument).toHaveBeenCalled();
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should execute Save to Cloud command when activeTabId exists', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        activeTabId: 'tab-1',
      });
      
      const { getByText } = render(<CommandPalette />);
      
      const saveToCloudItem = getByText('Save to Cloud').closest('.command-palette-item');
      if (saveToCloudItem) {
        fireEvent.click(saveToCloudItem);
      }
      
      expect(mockSaveDocumentToCloud).toHaveBeenCalledWith('tab-1');
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should execute Toggle Sidebar command', () => {
      const { getByText } = render(<CommandPalette />);
      
      const toggleSidebarItem = getByText('Hide Sidebar').closest('.command-palette-item');
      if (toggleSidebarItem) {
        fireEvent.click(toggleSidebarItem);
      }
      
      expect(mockToggleSidebar).toHaveBeenCalled();
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should execute Toggle Preview command', () => {
      const { getByText } = render(<CommandPalette />);
      
      const togglePreviewItem = getByText('Show Preview').closest('.command-palette-item');
      if (togglePreviewItem) {
        fireEvent.click(togglePreviewItem);
      }
      
      expect(mockTogglePreview).toHaveBeenCalled();
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should execute Open Settings command', () => {
      const { getByText } = render(<CommandPalette />);
      
      const settingsItem = getByText('Open Settings').closest('.command-palette-item');
      if (settingsItem) {
        fireEvent.click(settingsItem);
      }
      
      expect(mockSetShowSettings).toHaveBeenCalledWith(true);
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should show Sign In when not authenticated', () => {
      const { getByText } = render(<CommandPalette />);
      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should show Sign Out when authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
      });
      
      const { getByText } = render(<CommandPalette />);
      expect(getByText('Sign Out')).toBeTruthy();
    });

    it('should execute Sign Out command when authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
      });
      
      const { getByText } = render(<CommandPalette />);
      
      const logoutItem = getByText('Sign Out').closest('.command-palette-item');
      if (logoutItem) {
        fireEvent.click(logoutItem);
      }
      
      expect(mockLogout).toHaveBeenCalled();
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should execute Sign In command when not authenticated', () => {
      const { getByText } = render(<CommandPalette />);
      
      const loginItem = getByText('Sign In').closest('.command-palette-item');
      if (loginItem) {
        fireEvent.click(loginItem);
      }
      
      expect(mockSetShowAuth).toHaveBeenCalledWith(true);
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });
  });

  describe('Theme Selection', () => {
    it('should switch to themes mode when Change Color Theme is clicked', () => {
      const { getByText, getByPlaceholderText } = render(<CommandPalette />);
      
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      const input = getByPlaceholderText('Select a theme...') as HTMLInputElement;
      expect(input).toBeTruthy();
    });

    it('should show all themes in themes mode', () => {
      const { getByText, getByPlaceholderText } = render(<CommandPalette />);
      
      // Switch to themes mode
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      // Check that themes are displayed
      THEMES.forEach((theme) => {
        expect(getByText(theme.name)).toBeTruthy();
      });
    });

    it('should filter themes by search query', () => {
      const { getByText, getByPlaceholderText } = render(<CommandPalette />);
      
      // Switch to themes mode
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      const input = getByPlaceholderText('Select a theme...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'dark' } });
      
      // Should show themes containing "dark"
      const darkThemes = THEMES.filter((t) => t.name.toLowerCase().includes('dark'));
      darkThemes.forEach((theme) => {
        expect(getByText(theme.name)).toBeTruthy();
      });
    });

    it('should apply theme on selection', () => {
      const { getByText, getByPlaceholderText } = render(<CommandPalette />);
      
      // Switch to themes mode
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      // Select first theme
      const firstTheme = getByText(THEMES[0].name).closest('.command-palette-item');
      if (firstTheme) {
        fireEvent.click(firstTheme);
      }
      
      expect(mockSetTheme).toHaveBeenCalledWith(THEMES[0].id);
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should show "Current" indicator for active theme', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        theme: THEMES[0].id,
      });
      
      const { getByText, getByPlaceholderText } = render(<CommandPalette />);
      
      // Switch to themes mode
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      const currentThemeItem = getByText(THEMES[0].name).closest('.command-palette-item');
      expect(currentThemeItem?.textContent).toContain('Current');
    });
  });

  describe('File Selection', () => {
    it('should show recent files in commands mode', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        recentFiles: [
          { id: '1', title: 'file1.md', path: '/path/to/file1.md' },
          { id: '2', title: 'file2.md', path: '/path/to/file2.md' },
        ],
      });
      
      const { getByText } = render(<CommandPalette />);
      expect(getByText('file1.md')).toBeTruthy();
      expect(getByText('file2.md')).toBeTruthy();
    });

    it('should show cloud documents in files mode when authenticated', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
          { id: 'doc2', title: 'cloud2.md', content: '', updatedAt: new Date() },
        ],
      });
      
      const { getByPlaceholderText, getByText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      // Switch to files mode
      fireEvent.change(input, { target: { value: '@' } });
      
      expect(getByText('cloud1.md')).toBeTruthy();
      expect(getByText('cloud2.md')).toBeTruthy();
    });

    it('should filter files by search query', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [
          { id: 'tab1', title: 'file1.md' },
          { id: 'tab2', title: 'file2.md' },
        ],
      });
      
      const { getByPlaceholderText, getByText, queryByText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      // Switch to files mode and search
      fireEvent.change(input, { target: { value: '@file1' } });
      
      expect(getByText('file1.md')).toBeTruthy();
      expect(queryByText('file2.md')).toBeFalsy();
    });

    it('should open cloud document when selected', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        isAuthenticated: true,
        cloudDocuments: [
          { id: 'doc1', title: 'cloud1.md', content: '', updatedAt: new Date() },
        ],
      });
      
      const { getByPlaceholderText, getByText } = render(<CommandPalette />);
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      
      // Switch to files mode
      fireEvent.change(input, { target: { value: '@' } });
      
      // Select cloud document
      const cloudDocItem = getByText('cloud1.md').closest('.command-palette-item');
      if (cloudDocItem) {
        fireEvent.click(cloudDocItem);
      }
      
      expect(mockOpenCloudDocument).toHaveBeenCalledWith('doc1');
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(false);
    });

    it('should remove recent file when remove button is clicked', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        recentFiles: [
          { id: '1', title: 'file1.md', path: '/path/to/file1.md' },
        ],
      });
      
      const { getByText, container } = render(<CommandPalette />);
      
      const recentFileItem = getByText('file1.md').closest('.command-palette-item');
      if (recentFileItem) {
        // Hover to show remove button
        fireEvent.mouseEnter(recentFileItem);
        
        const removeButton = recentFileItem.querySelector('button');
        if (removeButton) {
          fireEvent.click(removeButton);
        }
      }
      
      expect(mockRemoveRecentFile).toHaveBeenCalledWith('1');
    });
  });

  describe('Mode Switching', () => {
    it('should show close button in themes mode', () => {
      const { getByText, container } = render(<CommandPalette />);
      
      // Switch to themes mode
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      const closeButton = container.querySelector('button');
      expect(closeButton).toBeTruthy();
    });

    it('should switch back to commands mode when close button is clicked', () => {
      const { getByText, getByPlaceholderText, container } = render(<CommandPalette />);
      
      // Switch to themes mode
      const changeThemeItem = getByText('Change Color Theme').closest('.command-palette-item');
      if (changeThemeItem) {
        fireEvent.click(changeThemeItem);
      }
      
      // Click close button
      const closeButton = container.querySelector('button');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      
      const input = getByPlaceholderText(/Type a command/) as HTMLInputElement;
      expect(input.placeholder).toBe('Type a command or @ to search files...');
    });
  });
});

