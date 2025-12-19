import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHelpMenuItems } from '../HelpMenu';
import { useStore } from '../../../store';

// Mock the store
vi.mock('../../../store', () => ({
  useStore: {
    getState: vi.fn(),
  },
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

describe('HelpMenu', () => {
  const mockStore = {
    setShowAbout: vi.fn(),
    setShowShortcuts: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore.getState as any).mockReturnValue(mockStore);
  });

  describe('Menu Items Structure', () => {
    it('should return array of menu items', () => {
      const items = getHelpMenuItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(4); // docs, shortcuts, separator, about
    });

    it('should include Documentation item', () => {
      const items = getHelpMenuItems();
      const docsItem = items.find(item => item.id === 'docs');
      expect(docsItem).toBeTruthy();
      expect(docsItem?.label).toBe('Documentation');
    });

    it('should include Keyboard Shortcuts item', () => {
      const items = getHelpMenuItems();
      const shortcutsItem = items.find(item => item.id === 'shortcuts');
      expect(shortcutsItem).toBeTruthy();
      expect(shortcutsItem?.label).toBe('Keyboard Shortcuts');
      expect(shortcutsItem?.shortcut).toBe('⌘K ⌘S');
    });

    it('should include About item', () => {
      const items = getHelpMenuItems();
      const aboutItem = items.find(item => item.id === 'about');
      expect(aboutItem).toBeTruthy();
      expect(aboutItem?.label).toBe('About md-crafter');
    });

    it('should include separator', () => {
      const items = getHelpMenuItems();
      const separator = items.find(item => item.separator);
      expect(separator).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('should open documentation link when Documentation action is executed', () => {
      const items = getHelpMenuItems();
      const docsItem = items.find(item => item.id === 'docs');
      docsItem?.action?.();
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://github.com/thtmnisamnstr/md-crafter#readme',
        '_blank'
      );
    });

    it('should call setShowShortcuts when Keyboard Shortcuts action is executed', () => {
      const items = getHelpMenuItems();
      const shortcutsItem = items.find(item => item.id === 'shortcuts');
      shortcutsItem?.action?.();
      expect(mockStore.setShowShortcuts).toHaveBeenCalledWith(true);
    });

    it('should call setShowAbout when About action is executed', () => {
      const items = getHelpMenuItems();
      const aboutItem = items.find(item => item.id === 'about');
      aboutItem?.action?.();
      expect(mockStore.setShowAbout).toHaveBeenCalledWith(true);
    });
  });
});

