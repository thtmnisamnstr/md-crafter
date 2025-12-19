import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ShortcutsModal } from '../ShortcutsModal';

describe('ShortcutsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('Keyboard Shortcuts')).toBeTruthy();
    });

    it('should render platform hint', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText(/On Windows\/Linux, use Ctrl instead of ⌘/)).toBeTruthy();
    });

    it('should render all shortcut groups', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('File')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
      expect(getByText('View')).toBeTruthy();
      expect(getByText('Editor')).toBeTruthy();
      expect(getByText('Markdown (in editor)')).toBeTruthy();
    });

    it('should render File shortcuts', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('New document')).toBeTruthy();
      expect(getByText('Open file(s)')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
      expect(getByText('Save as')).toBeTruthy();
      expect(getByText('Close tab')).toBeTruthy();
      expect(getByText('Export')).toBeTruthy();
      expect(getByText('Print / Export PDF')).toBeTruthy();
    });

    it('should render Edit shortcuts', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('Undo')).toBeTruthy();
      expect(getByText('Redo')).toBeTruthy();
      expect(getByText('Cut')).toBeTruthy();
      expect(getByText('Copy')).toBeTruthy();
      expect(getByText('Copy for Word/Docs')).toBeTruthy();
      expect(getByText('Paste')).toBeTruthy();
      expect(getByText('Paste from Word/Docs')).toBeTruthy();
      expect(getByText('Find')).toBeTruthy();
      expect(getByText('Find and replace')).toBeTruthy();
      expect(getByText('Select all')).toBeTruthy();
    });

    it('should render View shortcuts', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('Command palette')).toBeTruthy();
      expect(getByText('Toggle sidebar')).toBeTruthy();
      expect(getByText('Toggle split view')).toBeTruthy();
      expect(getByText('Zen mode')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
    });

    it('should render Editor shortcuts', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('Toggle comment')).toBeTruthy();
      expect(getByText('Indent line')).toBeTruthy();
      expect(getByText('Outdent line')).toBeTruthy();
      expect(getByText('Add selection to next match')).toBeTruthy();
      expect(getByText('Select line')).toBeTruthy();
      expect(getByText('Move line up')).toBeTruthy();
      expect(getByText('Move line down')).toBeTruthy();
      expect(getByText('Copy line up')).toBeTruthy();
      expect(getByText('Copy line down')).toBeTruthy();
    });

    it('should render Markdown shortcuts', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      expect(getByText('Bold')).toBeTruthy();
      expect(getByText('Italic')).toBeTruthy();
      expect(getByText('Insert link')).toBeTruthy();
    });

    it('should display shortcut keys', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      // Check for some key combinations
      expect(getByText('⌘ N')).toBeTruthy();
      expect(getByText('⌘ S')).toBeTruthy();
      expect(getByText('⌘ Z')).toBeTruthy();
      expect(getByText('⌘ ⇧ Z')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(<ShortcutsModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should close modal when overlay is clicked', () => {
      const { container } = render(<ShortcutsModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<ShortcutsModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Close button is clicked', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      const closeButton = getByText('Close');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when clicking inside modal content', () => {
      const { container } = render(<ShortcutsModal onClose={mockOnClose} />);
      const modal = container.querySelector('.modal');
      if (modal) {
        fireEvent.click(modal);
      }
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Shortcuts Display', () => {
    it('should display all shortcuts with correct keys and descriptions', () => {
      const { getByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      
      // File shortcuts
      const newDocRow = getByText('New document').closest('div');
      expect(newDocRow?.querySelector('kbd')?.textContent).toBe('⌘ N');
      
      const saveRow = getByText('Save').closest('div');
      expect(saveRow?.querySelector('kbd')?.textContent).toBe('⌘ S');
      
      // Edit shortcuts
      const undoRow = getByText('Undo').closest('div');
      expect(undoRow?.querySelector('kbd')?.textContent).toBe('⌘ Z');
      
      // View shortcuts
      const commandPaletteRow = getByText('Command palette').closest('div');
      expect(commandPaletteRow?.querySelector('kbd')?.textContent).toBe('⌘ ⇧ P');
    });

    it('should have correct number of shortcuts per group', () => {
      const { container, getAllByText } = render(<ShortcutsModal onClose={mockOnClose} />);
      
      // File group should have 7 shortcuts
      const fileHeaders = getAllByText('File');
      const fileGroup = fileHeaders[0]?.parentElement;
      const fileShortcuts = fileGroup?.querySelectorAll('.space-y-1 > div');
      expect(fileShortcuts?.length).toBe(7);
      
      // Edit group should have 10 shortcuts
      const editHeaders = getAllByText('Edit');
      const editGroup = editHeaders[0]?.parentElement;
      const editShortcuts = editGroup?.querySelectorAll('.space-y-1 > div');
      expect(editShortcuts?.length).toBe(10);
      
      // Markdown group should have 3 shortcuts
      const markdownHeaders = getAllByText('Markdown (in editor)');
      const markdownGroup = markdownHeaders[0]?.parentElement;
      const markdownShortcuts = markdownGroup?.querySelectorAll('.space-y-1 > div');
      expect(markdownShortcuts?.length).toBe(3);
    });
  });
});

