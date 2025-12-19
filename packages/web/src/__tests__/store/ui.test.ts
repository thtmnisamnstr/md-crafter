import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUISlice, UISlice } from '../../store/ui';
import { AppState } from '../../store/types';
import { DEFAULT_SIDEBAR_WIDTH } from '../../constants';

// Create a mock store state
const createMockState = (overrides: Partial<AppState> = {}): AppState => ({
  // Minimal required state
  tabs: [],
  activeTabId: null,
  splitMode: 'none',
  diffMode: { enabled: false, viewMode: 'side-by-side' },
  theme: 'dark',
  showSidebar: true,
  showCommandPalette: false,
  showSettings: false,
  showAuth: false,
  showPreview: false,
  showExport: false,
  showImportDocx: false,
  showExportDocx: false,
  showExportPdf: false,
  showAbout: false,
  showShortcuts: false,
  showSearch: false,
  zenMode: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  confirmation: null,
  grammarIssues: [],
  grammarIssueIndex: 0,
  showGrammarReview: false,
  grammarIssueCount: 0,
  grammarError: null,
  addToast: vi.fn(),
  ...overrides,
} as unknown as AppState);

describe('UI Slice', () => {
  let slice: UISlice;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockSet = vi.fn();
    mockGet = vi.fn(() => createMockState());
    slice = createUISlice(mockSet, mockGet, {} as any);
  });

  describe('Initial State', () => {
    it('should have correct default values', () => {
      expect(slice.theme).toBe('dark');
      expect(slice.showSidebar).toBe(true);
      expect(slice.showCommandPalette).toBe(false);
      expect(slice.showSettings).toBe(false);
      expect(slice.showPreview).toBe(false);
      expect(slice.zenMode).toBe(false);
      expect(slice.splitMode).toBe('none');
      expect(slice.sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH);
      expect(slice.grammarIssues).toEqual([]);
    });

    it('should have correct diff mode defaults', () => {
      expect(slice.diffMode).toEqual({
        enabled: false,
        leftTabId: undefined,
        rightTabId: undefined,
        compareWithSaved: false,
        viewMode: 'side-by-side',
      });
    });
  });

  describe('Theme', () => {
    it('should set theme', () => {
      slice.setTheme('light');
      expect(mockSet).toHaveBeenCalledWith({ theme: 'light' });
    });
  });

  describe('Sidebar', () => {
    it('should toggle sidebar visibility', () => {
      slice.toggleSidebar();
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
      
      // Execute the function passed to set
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ showSidebar: true });
      expect(result).toEqual({ showSidebar: false });
    });

    it('should set sidebar width', () => {
      slice.setSidebarWidth(300);
      expect(mockSet).toHaveBeenCalledWith({ sidebarWidth: 300 });
    });
  });

  describe('Modal Controls', () => {
    it('should show/hide command palette', () => {
      slice.setShowCommandPalette(true);
      expect(mockSet).toHaveBeenCalledWith({ showCommandPalette: true });
      
      slice.setShowCommandPalette(false);
      expect(mockSet).toHaveBeenCalledWith({ showCommandPalette: false });
    });

    it('should show/hide settings', () => {
      slice.setShowSettings(true);
      expect(mockSet).toHaveBeenCalledWith({ showSettings: true });
    });

    it('should show/hide auth', () => {
      slice.setShowAuth(true);
      expect(mockSet).toHaveBeenCalledWith({ showAuth: true });
    });

    it('should show/hide export', () => {
      slice.setShowExport(true);
      expect(mockSet).toHaveBeenCalledWith({ showExport: true });
    });

    it('should show/hide import docx', () => {
      slice.setShowImportDocx(true);
      expect(mockSet).toHaveBeenCalledWith({ showImportDocx: true });
    });

    it('should show/hide export docx', () => {
      slice.setShowExportDocx(true);
      expect(mockSet).toHaveBeenCalledWith({ showExportDocx: true });
    });

    it('should show/hide export pdf', () => {
      slice.setShowExportPdf(true);
      expect(mockSet).toHaveBeenCalledWith({ showExportPdf: true });
    });

    it('should show/hide about', () => {
      slice.setShowAbout(true);
      expect(mockSet).toHaveBeenCalledWith({ showAbout: true });
    });

    it('should show/hide shortcuts', () => {
      slice.setShowShortcuts(true);
      expect(mockSet).toHaveBeenCalledWith({ showShortcuts: true });
    });

    it('should show/hide search', () => {
      slice.setShowSearch(true);
      expect(mockSet).toHaveBeenCalledWith({ showSearch: true });
    });
  });

  describe('Preview', () => {
    it('should toggle preview for active tab', () => {
      slice.togglePreview();
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
      
      // Execute with a mock state that has an active tab
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1', showPreview: false }],
        showPreview: false,
      });
      
      expect(result.showPreview).toBe(true);
      expect(result.tabs[0].showPreview).toBe(true);
    });

    it('should toggle global preview when no active tab', () => {
      slice.togglePreview();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        activeTabId: null,
        tabs: [],
        showPreview: false,
      });
      
      expect(result).toEqual({ showPreview: true });
    });
  });

  describe('Zen Mode', () => {
    it('should toggle zen mode and hide sidebar', () => {
      slice.toggleZenMode();
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ zenMode: false });
      
      expect(result.zenMode).toBe(true);
      expect(result.showSidebar).toBe(false);
    });

    it('should show sidebar when exiting zen mode', () => {
      slice.toggleZenMode();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ zenMode: true });
      
      expect(result.zenMode).toBe(false);
      expect(result.showSidebar).toBe(true);
    });
  });

  describe('Confirmation Dialog', () => {
    it('should set confirmation', () => {
      const confirmation = {
        title: 'Confirm',
        message: 'Are you sure?',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      };
      slice.setConfirmation(confirmation);
      expect(mockSet).toHaveBeenCalledWith({ confirmation });
    });

    it('should clear confirmation', () => {
      slice.clearConfirmation();
      expect(mockSet).toHaveBeenCalledWith({ confirmation: null });
    });
  });

  describe('Split Mode', () => {
    it('should set split mode', () => {
      slice.setSplitMode('horizontal');
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should exit diff mode when setting non-diff split mode', () => {
      slice.setSplitMode('vertical');
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        splitMode: 'diff',
        diffMode: { enabled: true },
        tabs: [{ id: 'tab-1' }],
        activeTabId: 'tab-1',
      });
      
      expect(result.splitMode).toBe('vertical');
      expect(result.diffMode.enabled).toBe(false);
    });
  });

  describe('Diff Mode', () => {
    it('should enable diff mode with tabs', () => {
      mockGet.mockReturnValue(createMockState({
        tabs: [{ id: 'tab-1', hasSavedVersion: true, isDirty: true } as any],
        activeTabId: 'tab-1',
      }));
      
      slice = createUISlice(mockSet, mockGet, {} as any);
      slice.setDiffMode(true, 'tab-1', 'tab-2', false, 'side-by-side');
      
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should exit diff mode', () => {
      slice.exitDiffMode();
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        diffMode: { enabled: true, viewMode: 'side-by-side' },
        tabs: [{ id: 'tab-1' }],
        activeTabId: 'tab-1',
      });
      
      expect(result.splitMode).toBe('none');
      expect(result.diffMode.enabled).toBe(false);
    });
  });

  describe('Grammar', () => {
    it('should set grammar issues', () => {
      const issues = [{ message: 'Issue 1' }] as any;
      slice.setGrammarIssues(issues);
      expect(mockSet).toHaveBeenCalledWith({
        grammarIssues: issues,
        grammarIssueIndex: 0,
        showGrammarReview: true,
      });
    });

    it('should set grammar issue index within bounds', () => {
      slice.setGrammarIssueIndex(2);
      expect(mockSet).toHaveBeenCalledWith(expect.any(Function));
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ grammarIssues: [1, 2, 3] });
      expect(result.grammarIssueIndex).toBe(2);
    });

    it('should clamp grammar issue index to valid range', () => {
      slice.setGrammarIssueIndex(10);
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ grammarIssues: [1, 2] });
      expect(result.grammarIssueIndex).toBe(1); // Max valid index
    });

    it('should close grammar review', () => {
      slice.closeGrammarReview();
      expect(mockSet).toHaveBeenCalledWith({
        showGrammarReview: false,
        grammarIssues: [],
        grammarIssueIndex: 0,
        grammarIssueCount: 0,
        grammarError: null,
      });
    });

    it('should set grammar issues count', () => {
      slice.setGrammarIssuesCount(5);
      expect(mockSet).toHaveBeenCalledWith({ grammarIssueCount: 5 });
    });

    it('should show/hide grammar review', () => {
      slice.setShowGrammarReview(true);
      expect(mockSet).toHaveBeenCalledWith({ showGrammarReview: true });
    });

    it('should set grammar error', () => {
      slice.setGrammarError('Grammar check failed');
      expect(mockSet).toHaveBeenCalledWith({ grammarError: 'Grammar check failed' });
    });
  });
});

