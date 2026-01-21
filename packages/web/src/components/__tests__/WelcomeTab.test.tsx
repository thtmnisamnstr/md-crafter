import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { WelcomeTab } from '../WelcomeTab';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('WelcomeTab', () => {
  const mockSetShowSettings = vi.fn();
  const mockSetShowAuth = vi.fn();
  const mockSetShowCommandPalette = vi.fn();
  const mockOpenTab = vi.fn();

  const mockStore = {
    setShowSettings: mockSetShowSettings,
    setShowAuth: mockSetShowAuth,
    setShowCommandPalette: mockSetShowCommandPalette,
    openTab: mockOpenTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    // Mock navigator.platform
    Object.defineProperty(navigator, 'platform', {
      writable: true,
      value: 'MacIntel',
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render welcome content', () => {
      const { getByText } = render(<WelcomeTab />);
      expect(getByText(/Welcome to/)).toBeTruthy();
      expect(getByText('md-crafter')).toBeTruthy();
      expect(getByText(/A modern, cloud-synced markdown editor/)).toBeTruthy();
    });

    it('should render quick action cards', () => {
      const { container } = render(<WelcomeTab />);
      expect(container.textContent).toContain('Quick Actions');
      expect(container.textContent).toContain('New Document');
      expect(container.textContent).toContain('Command Palette');
      expect(container.textContent).toContain('Cloud Sync');
      expect(container.textContent).toContain('Customize');
    });

    it('should render features list', () => {
      const { container } = render(<WelcomeTab />);
      expect(container.textContent).toContain('Features');
      expect(container.textContent).toContain('Split Editor View');
      expect(container.textContent).toContain('Multiple Themes');
      expect(container.textContent).toContain('Export to PDF/Word');
      expect(container.textContent).toContain('Import from Word');
      expect(container.textContent).toContain('Cloud Sync');
      expect(container.textContent).toContain('MDX Support');
    });

    it('should render keyboard shortcuts section', () => {
      const { container } = render(<WelcomeTab />);
      expect(container.textContent).toContain('Keyboard Shortcuts');
      expect(container.textContent).toContain('Command Palette');
      expect(container.textContent).toContain('Save');
      expect(container.textContent).toContain('Toggle Sidebar');
      expect(container.textContent).toContain('Settings');
      expect(container.textContent).toContain('Zen Mode');
    });

    it('should render documentation links', () => {
      const { getByText } = render(<WelcomeTab />);
      expect(getByText('Need help?')).toBeTruthy();
      const docLink = getByText('Documentation');
      expect(docLink.closest('a')).toHaveAttribute('href', 'https://github.com/thtmnisamnstr/md-crafter');
      expect(docLink.closest('a')).toHaveAttribute('target', '_blank');

      const issueLink = getByText('Report Issue');
      expect(issueLink.closest('a')).toHaveAttribute('href', 'https://github.com/thtmnisamnstr/md-crafter/issues');
      expect(issueLink.closest('a')).toHaveAttribute('target', '_blank');
    });
  });

  describe('Interactions', () => {
    it('should create new document when Create button is clicked', () => {
      const { getByText } = render(<WelcomeTab />);
      const createButton = getByText('Create');
      fireEvent.click(createButton);

      expect(mockOpenTab).toHaveBeenCalledWith({
        title: 'Untitled.md',
        content: '',
        language: 'markdown',
      });
    });

    it('should open command palette when Command Palette card action is clicked', () => {
      const { container } = render(<WelcomeTab />);
      // Find all buttons and get the one in the Command Palette card
      const buttons = Array.from(container.querySelectorAll('button'));
      const commandPaletteButton = buttons.find(btn =>
        btn.closest('.p-4')?.textContent?.includes('Command Palette')
      );
      if (commandPaletteButton) {
        fireEvent.click(commandPaletteButton);
      }
      expect(mockSetShowCommandPalette).toHaveBeenCalledWith(true);
    });

    it('should open auth modal when Cloud Sync card action is clicked', () => {
      const { container } = render(<WelcomeTab />);
      // Find all buttons in the quick actions section
      const buttons = Array.from(container.querySelectorAll('button'));
      // Find the "Connect" button (Cloud Sync card button)
      const cloudSyncButton = buttons.find(btn => btn.textContent?.trim() === 'Connect');
      if (cloudSyncButton) {
        fireEvent.click(cloudSyncButton);
      }
      expect(mockSetShowAuth).toHaveBeenCalledWith(true);
    });

    it('should open settings modal when Customize card action is clicked', () => {
      const { getByText } = render(<WelcomeTab />);
      const customizeCard = getByText('Customize').closest('.p-4');
      const actionButton = customizeCard?.querySelector('button');
      if (actionButton) {
        fireEvent.click(actionButton);
      }
      expect(mockSetShowSettings).toHaveBeenCalledWith(true);
    });
  });

  describe('Platform Detection', () => {
    it('should show ⌘ for Mac platform', () => {
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'MacIntel',
      });

      const { container } = render(<WelcomeTab />);
      // Check that modifier key is displayed (should be ⌘ for Mac)
      const buttons = Array.from(container.querySelectorAll('button'));
      const commandPaletteButton = buttons.find(btn =>
        btn.closest('.p-4')?.textContent?.includes('Command Palette')
      );
      expect(commandPaletteButton?.textContent).toContain('⌘');
    });

    it('should show Ctrl for Windows platform', () => {
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'Win32',
      });

      const { container } = render(<WelcomeTab />);
      const buttons = Array.from(container.querySelectorAll('button'));
      const commandPaletteButton = buttons.find(btn =>
        btn.closest('.p-4')?.textContent?.includes('Command Palette')
      );
      expect(commandPaletteButton?.textContent).toContain('Ctrl');
    });

    it('should show Ctrl for Linux platform', () => {
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'Linux x86_64',
      });

      const { container } = render(<WelcomeTab />);
      const buttons = Array.from(container.querySelectorAll('button'));
      const commandPaletteButton = buttons.find(btn =>
        btn.closest('.p-4')?.textContent?.includes('Command Palette')
      );
      expect(commandPaletteButton?.textContent).toContain('Ctrl');
    });

    it('should display correct modifier key in keyboard shortcuts', () => {
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'MacIntel',
      });

      const { container } = render(<WelcomeTab />);
      // Check that shortcuts show ⌘ symbol
      const shortcuts = container.querySelectorAll('kbd');
      expect(shortcuts.length).toBeGreaterThan(0);
      // At least one shortcut should contain ⌘
      const hasCommandKey = Array.from(shortcuts).some(kbd => kbd.textContent?.includes('⌘'));
      expect(hasCommandKey).toBe(true);
    });
  });

  describe('Content', () => {
    it('should display all feature items', () => {
      const { container } = render(<WelcomeTab />);
      const features = [
        'Split Editor View',
        'Multiple Themes',
        'Export to PDF/Word',
        'Import from Word',
        'Cloud Sync',
        'MDX Support',
      ];

      features.forEach((feature) => {
        expect(container.textContent).toContain(feature);
      });
    });

    it('should display all keyboard shortcuts', () => {
      const { container } = render(<WelcomeTab />);
      const shortcuts = [
        'Command Palette',
        'Open File(s)',
        'Print / Export PDF',
        'Save',
        'Toggle Sidebar / Bold',
        'Split View',
        'Format Document',
        'Settings',
        'Zen Mode',
      ];

      shortcuts.forEach((shortcut) => {
        expect(container.textContent).toContain(shortcut);
      });
    });

    it('should create document with correct content', () => {
      const { getByText } = render(<WelcomeTab />);
      const createButton = getByText('Create');
      fireEvent.click(createButton);

      expect(mockOpenTab).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled.md',
          content: '',
          language: 'markdown',
        })
      );
    });
  });
});

