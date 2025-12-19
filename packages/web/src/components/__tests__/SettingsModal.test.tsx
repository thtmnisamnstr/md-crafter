import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../SettingsModal';
import { useStore } from '../../store';
import { THEMES } from '../../utils/themes';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('SettingsModal', () => {
  const mockSetShowSettings = vi.fn();
  const mockUpdateSettings = vi.fn();
  const mockSetTheme = vi.fn();

  const mockStore = {
    setShowSettings: mockSetShowSettings,
    settings: {
      fontSize: 14,
      fontFamily: 'monospace',
      tabSize: 2,
      wordWrap: true,
      lineNumbers: true,
      minimap: false,
      autoSync: false,
      syncInterval: 1000,
      spellCheck: false,
    },
    updateSettings: mockUpdateSettings,
    theme: 'dark',
    setTheme: mockSetTheme,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render settings modal', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('Settings')).toBeTruthy();
    });

    it('should show close button', () => {
      const { container } = render(<SettingsModal />);
      const closeButton = container.querySelector('button[aria-label*="Close"], button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<SettingsModal />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockSetShowSettings).toHaveBeenCalledWith(false);
    });

    it('should close modal when overlay is clicked', () => {
      const { container } = render(<SettingsModal />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockSetShowSettings).toHaveBeenCalledWith(false);
    });
  });

  describe('Theme Selection', () => {
    it('should show all available themes', () => {
      const { getByText } = render(<SettingsModal />);
      THEMES.forEach((theme) => {
        expect(getByText(theme.name)).toBeTruthy();
      });
    });

    it('should mark current theme as selected', () => {
      const { getByText } = render(<SettingsModal />);
      const darkThemeButton = getByText('Dark+ (Default)').closest('button');
      expect(darkThemeButton?.className).toContain('border-editor-accent');
    });

    it('should update local theme when theme is clicked', () => {
      const { getByText } = render(<SettingsModal />);
      const lightThemeButton = getByText('Light+').closest('button');
      
      if (lightThemeButton) {
        fireEvent.click(lightThemeButton);
      }
      
      // Local state should update (theme button should be selected)
      const updatedButton = getByText('Light+').closest('button');
      expect(updatedButton?.className).toContain('border-editor-accent');
    });

    it('should save theme when save is clicked', () => {
      const { getByText, container } = render(<SettingsModal />);
      
      // Change theme
      const lightThemeButton = getByText('Light+').closest('button');
      if (lightThemeButton) {
        fireEvent.click(lightThemeButton);
      }
      
      // Find and click save button
      const saveButton = getByText('Save Changes');
      fireEvent.click(saveButton);
      
      expect(mockSetTheme).toHaveBeenCalled();
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  describe('Font Settings', () => {
    it('should show font size options', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('14px')).toBeTruthy();
      expect(getByText('16px')).toBeTruthy();
      expect(getByText('18px')).toBeTruthy();
    });

    it('should mark current font size as selected', () => {
      const { getByText } = render(<SettingsModal />);
      const fontSizeButton = getByText('14px').closest('button');
      expect(fontSizeButton?.className).toContain('border-editor-accent');
    });

    it('should update font size when clicked', () => {
      const { getByText } = render(<SettingsModal />);
      const fontSizeButton = getByText('16px').closest('button');
      
      if (fontSizeButton) {
        fireEvent.click(fontSizeButton);
      }
      
      const updatedButton = getByText('16px').closest('button');
      expect(updatedButton?.className).toContain('border-editor-accent');
    });

    it('should show tab size options', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('2 spaces')).toBeTruthy();
      expect(getByText('4 spaces')).toBeTruthy();
      expect(getByText('8 spaces')).toBeTruthy();
    });

    it('should mark current tab size as selected', () => {
      const { getByText } = render(<SettingsModal />);
      const tabSizeButton = getByText('2 spaces').closest('button');
      expect(tabSizeButton?.className).toContain('border-editor-accent');
    });

    it('should update tab size when clicked', () => {
      const { getByText } = render(<SettingsModal />);
      const tabSizeButton = getByText('4 spaces').closest('button');
      
      if (tabSizeButton) {
        fireEvent.click(tabSizeButton);
      }
      
      const updatedButton = getByText('4 spaces').closest('button');
      expect(updatedButton?.className).toContain('border-editor-accent');
    });
  });

  describe('Toggle Settings', () => {
    it('should show word wrap toggle', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('Word Wrap')).toBeTruthy();
    });

    it('should show line numbers toggle', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('Line Numbers')).toBeTruthy();
    });

    it('should show minimap toggle', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('Minimap')).toBeTruthy();
    });

    it('should show auto sync toggle', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('Auto Sync')).toBeTruthy();
    });

    it('should show spell check toggle', () => {
      const { getByText } = render(<SettingsModal />);
      expect(getByText('Real-time Spell Check')).toBeTruthy();
    });

    it('should toggle word wrap setting', () => {
      const { getByText, container } = render(<SettingsModal />);
      
      // Find toggle button (it's a button inside the label)
      const wordWrapLabel = getByText('Word Wrap').closest('label');
      const toggleButton = wordWrapLabel?.querySelector('button');
      
      if (toggleButton) {
        const initialChecked = toggleButton.className.includes('bg-editor-accent');
        fireEvent.click(toggleButton);
        
        // Toggle should change state
        const updatedChecked = toggleButton.className.includes('bg-editor-accent');
        expect(updatedChecked).toBe(!initialChecked);
      }
    });
  });

  describe('Settings Persistence', () => {
    it('should save all settings when save button is clicked', () => {
      const { container, getByText } = render(<SettingsModal />);
      
      // Change multiple settings
      const lightThemeButton = getByText('Light+').closest('button');
      if (lightThemeButton) {
        fireEvent.click(lightThemeButton);
      }
      
      const fontSizeButton = getByText('16px').closest('button');
      if (fontSizeButton) {
        fireEvent.click(fontSizeButton);
      }
      
      // Find save button
      const saveButton = getByText('Save Changes');
      fireEvent.click(saveButton);
      
      expect(mockUpdateSettings).toHaveBeenCalled();
      expect(mockSetTheme).toHaveBeenCalled();
      expect(mockSetShowSettings).toHaveBeenCalledWith(false);
    });

    it('should not save settings when modal is closed without saving', () => {
      const { container, getByText } = render(<SettingsModal />);
      
      // Change a setting
      const lightThemeButton = getByText('Light+').closest('button');
      if (lightThemeButton) {
        fireEvent.click(lightThemeButton);
      }
      
      // Close without saving
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      
      // Settings should not be updated
      expect(mockUpdateSettings).not.toHaveBeenCalled();
      expect(mockSetTheme).not.toHaveBeenCalled();
    });
  });
});

