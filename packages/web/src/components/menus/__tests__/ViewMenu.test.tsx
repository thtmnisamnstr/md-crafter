import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getViewMenuItems } from '../ViewMenu';
import { useStore } from '../../../store';
import { THEMES } from '../../../utils/themes';

// Mock the store
vi.mock('../../../store', () => ({
  useStore: {
    getState: vi.fn(),
  },
}));

describe('ViewMenu', () => {
  const mockStore = {
    setShowCommandPalette: vi.fn(),
    toggleSidebar: vi.fn(),
    togglePreview: vi.fn(),
    toggleZenMode: vi.fn(),
    showSidebar: true,
    showPreview: false,
    zenMode: false,
    setTheme: vi.fn(),
    theme: 'dark',
    setShowSettings: vi.fn(),
    activeTabId: 'tab-1',
    tabs: [
      { id: 'tab-1', title: 'test.md', content: 'test', language: 'markdown', isDirty: true, hasSavedVersion: true },
      { id: 'tab-2', title: 'test2.md', content: 'test2', language: 'markdown', isDirty: false, hasSavedVersion: true },
    ],
    setSplitMode: vi.fn(),
    splitMode: 'none' as const,
    setDiffMode: vi.fn(),
    exitDiffMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore.getState as any).mockReturnValue(mockStore);
  });

  describe('Menu Items Structure', () => {
    it('should return array of menu items', () => {
      const items = getViewMenuItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('should include Command Palette item', () => {
      const items = getViewMenuItems();
      const cmdPaletteItem = items.find(item => item.id === 'command-palette');
      expect(cmdPaletteItem).toBeTruthy();
      expect(cmdPaletteItem?.label).toBe('Command Palette');
      expect(cmdPaletteItem?.shortcut).toBe('⌘⇧P');
    });

    it('should include Settings item', () => {
      const items = getViewMenuItems();
      const settingsItem = items.find(item => item.id === 'settings');
      expect(settingsItem).toBeTruthy();
      expect(settingsItem?.label).toBe('Settings');
      expect(settingsItem?.shortcut).toBe('⌘,');
    });
  });

  describe('Split Editor Submenu', () => {
    it('should include Split Editor item with submenu', () => {
      const items = getViewMenuItems();
      const splitItem = items.find(item => item.id === 'split-editor');
      expect(splitItem).toBeTruthy();
      expect(splitItem?.submenu).toBeDefined();
      expect(splitItem?.submenu?.length).toBe(3);
    });

    it('should mark current split mode in submenu', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        splitMode: 'vertical',
      });

      const items = getViewMenuItems();
      const splitItem = items.find(item => item.id === 'split-editor');
      const verticalItem = splitItem?.submenu?.find(item => item.id === 'split-vertical');
      expect(verticalItem?.label).toContain('✓');
    });

    it('should call setSplitMode when submenu item is clicked', () => {
      const items = getViewMenuItems();
      const splitItem = items.find(item => item.id === 'split-editor');
      const noneItem = splitItem?.submenu?.find(item => item.id === 'split-none');
      noneItem?.action?.();
      expect(mockStore.setSplitMode).toHaveBeenCalledWith('none');
    });
  });

  describe('Diff View Submenu', () => {
    it('should include Compare Files item with submenu', () => {
      const items = getViewMenuItems();
      const diffItem = items.find(item => item.id === 'diff-view');
      expect(diffItem).toBeTruthy();
      expect(diffItem?.submenu).toBeDefined();
      expect(diffItem?.submenu?.length).toBe(3);
    });

    it('should disable Compare with Saved Version when tab has no saved version', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        tabs: [
          { id: 'tab-1', title: 'test.md', content: 'test', language: 'markdown', isDirty: true, hasSavedVersion: false },
        ],
      });

      const items = getViewMenuItems();
      const diffItem = items.find(item => item.id === 'diff-view');
      const savedItem = diffItem?.submenu?.find(item => item.id === 'diff-with-saved');
      expect(savedItem?.disabled).toBe(true);
    });

    it('should disable Compare with Saved Version when tab is clean', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        tabs: [
          { id: 'tab-1', title: 'test.md', content: 'test', language: 'markdown', isDirty: false, hasSavedVersion: true },
        ],
      });

      const items = getViewMenuItems();
      const diffItem = items.find(item => item.id === 'diff-view');
      const savedItem = diffItem?.submenu?.find(item => item.id === 'diff-with-saved');
      expect(savedItem?.disabled).toBe(true);
    });

    it('should enable Compare with Saved Version when tab has a saved version and is dirty', () => {
      const items = getViewMenuItems();
      const diffItem = items.find(item => item.id === 'diff-view');
      const savedItem = diffItem?.submenu?.find(item => item.id === 'diff-with-saved');
      expect(savedItem?.disabled).toBe(false);
    });

    it('should disable Compare Active File when less than 2 tabs', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        tabs: [
          { id: 'tab-1', title: 'test.md', content: 'test', language: 'markdown' },
        ],
      });

      const items = getViewMenuItems();
      const diffItem = items.find(item => item.id === 'diff-view');
      const fileItem = diffItem?.submenu?.find(item => item.id === 'diff-with-file');
      expect(fileItem?.disabled).toBe(true);
    });
  });

  describe('Theme Submenu', () => {
    it('should include Change Theme item with submenu', () => {
      const items = getViewMenuItems();
      const themeItem = items.find(item => item.id === 'theme');
      expect(themeItem).toBeTruthy();
      expect(themeItem?.submenu).toBeDefined();
      expect(themeItem?.submenu?.length).toBe(THEMES.length);
    });

    it('should mark current theme in submenu', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        theme: 'light',
      });

      const items = getViewMenuItems();
      const themeItem = items.find(item => item.id === 'theme');
      const lightTheme = themeItem?.submenu?.find(item => item.id === 'light');
      expect(lightTheme?.label).toContain('✓');
    });

    it('should call setTheme when theme submenu item is clicked', () => {
      const items = getViewMenuItems();
      const themeItem = items.find(item => item.id === 'theme');
      const darkTheme = themeItem?.submenu?.find(item => item.id === 'dark');
      darkTheme?.action?.();
      expect(mockStore.setTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('Dynamic Labels', () => {
    it('should show Hide Sidebar when sidebar is visible', () => {
      const items = getViewMenuItems();
      const sidebarItem = items.find(item => item.id === 'toggle-sidebar');
      expect(sidebarItem?.label).toBe('Hide Sidebar');
    });

    it('should show Show Sidebar when sidebar is hidden', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        showSidebar: false,
      });

      const items = getViewMenuItems();
      const sidebarItem = items.find(item => item.id === 'toggle-sidebar');
      expect(sidebarItem?.label).toBe('Show Sidebar');
    });

    it('should show Exit Zen Mode when zen mode is active', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        zenMode: true,
      });

      const items = getViewMenuItems();
      const zenItem = items.find(item => item.id === 'toggle-zen');
      expect(zenItem?.label).toBe('Exit Zen Mode');
    });
  });

  describe('Actions', () => {
    it('should call setShowCommandPalette when Command Palette action is executed', () => {
      const items = getViewMenuItems();
      const cmdPaletteItem = items.find(item => item.id === 'command-palette');
      cmdPaletteItem?.action?.();
      expect(mockStore.setShowCommandPalette).toHaveBeenCalledWith(true);
    });

    it('should call toggleSidebar when Toggle Sidebar action is executed', () => {
      const items = getViewMenuItems();
      const sidebarItem = items.find(item => item.id === 'toggle-sidebar');
      sidebarItem?.action?.();
      expect(mockStore.toggleSidebar).toHaveBeenCalled();
    });

    it('should call setShowSettings when Settings action is executed', () => {
      const items = getViewMenuItems();
      const settingsItem = items.find(item => item.id === 'settings');
      settingsItem?.action?.();
      expect(mockStore.setShowSettings).toHaveBeenCalledWith(true);
    });
  });
});
