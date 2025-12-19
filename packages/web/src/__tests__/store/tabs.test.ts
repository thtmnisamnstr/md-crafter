import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTabsSlice, TabsSlice } from '../../store/tabs';
import { AppState, Tab } from '../../store/types';

// Mock the utils
vi.mock('../../store/utils', () => ({
  generateId: vi.fn(() => 'mock-tab-id'),
}));

// Create mock state
const createMockState = (overrides: Partial<AppState> = {}): AppState => ({
  tabs: [],
  activeTabId: null,
  showPreview: false,
  splitMode: 'none',
  diffMode: { enabled: false, viewMode: 'side-by-side' },
  addRecentFile: vi.fn(),
  addToast: vi.fn(),
  setConfirmation: vi.fn(),
  settings: { autoSync: false },
  isAuthenticated: false,
  syncDocument: vi.fn(),
  ...overrides,
} as unknown as AppState);

describe('Tabs Slice', () => {
  let slice: TabsSlice;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockState: AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createMockState();
    mockSet = vi.fn();
    mockGet = vi.fn(() => mockState);
    slice = createTabsSlice(mockSet, mockGet, {} as any);
  });

  describe('Initial State', () => {
    it('should have empty tabs array', () => {
      expect(slice.tabs).toEqual([]);
    });

    it('should have null active tab', () => {
      expect(slice.activeTabId).toBeNull();
    });
  });

  describe('openTab', () => {
    it('should open a new tab with document', () => {
      slice.openTab({ title: 'Test', content: 'Hello world' });
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [], activeTabId: null });
      
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0]).toMatchObject({
        title: 'Test',
        content: 'Hello world',
        isDirty: false,
      });
      expect(result.activeTabId).toBe('mock-tab-id');
    });

    it('should reuse existing tab when opening same document', () => {
      const existingTab: Tab = {
        id: 'existing-tab',
        documentId: 'doc-123',
        title: 'Existing',
        content: 'Content',
        showPreview: false,
        language: 'markdown',
        isDirty: false,
        syncStatus: 'synced',
        isCloudSynced: true,
        savedContent: 'Content',
        hasSavedVersion: true,
        undoStack: [],
        redoStack: [],
        splitMode: 'none',
        diffMode: { enabled: false, compareWithSaved: false },
        splitSecondaryTabId: null,
        cursor: null,
      };
      
      mockState = createMockState({ tabs: [existingTab] });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.openTab({ id: 'doc-123', title: 'Test', content: '' });
      
      expect(mockSet).toHaveBeenCalledWith({ activeTabId: 'existing-tab' });
    });

    it('should mark local documents as not cloud synced', () => {
      slice.openTab({ title: 'Local Doc', content: 'Local content' });
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [] });
      
      expect(result.tabs[0].isCloudSynced).toBe(false);
      expect(result.tabs[0].syncStatus).toBe('local');
    });

    it('should mark cloud documents as synced', () => {
      slice.openTab({ id: 'cloud-doc', title: 'Cloud Doc', content: 'Content' });
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [] });
      
      expect(result.tabs[0].isCloudSynced).toBe(true);
      expect(result.tabs[0].syncStatus).toBe('synced');
    });
  });

  describe('closeTab', () => {
    it('should close a tab', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', title: 'Tab 1', isDirty: false } as Tab,
        { id: 'tab-2', title: 'Tab 2', isDirty: false } as Tab,
      ];
      mockState = createMockState({ tabs, activeTabId: 'tab-1' });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.closeTab('tab-1');
      
      expect(mockSet).toHaveBeenCalled();
    });

    it('should show confirmation for dirty tabs', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', title: 'Tab 1', isDirty: true } as Tab,
      ];
      mockState = createMockState({ tabs, activeTabId: 'tab-1' });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.closeTab('tab-1');
      
      expect(mockState.setConfirmation).toHaveBeenCalled();
    });
  });

  describe('setActiveTab', () => {
    it('should set active tab', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', title: 'Tab 1', showPreview: true, cursor: { line: 5, column: 10 } } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.setActiveTab('tab-1');
      
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe('updateTabContent', () => {
    it('should update tab content and mark as dirty', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', title: 'Tab 1', content: 'Original', isDirty: false, undoStack: [] } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.updateTabContent('tab-1', 'Updated content');
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      expect(result.tabs[0].content).toBe('Updated content');
      expect(result.tabs[0].isDirty).toBe(true);
    });

    it('should skip history when skipHistory option is true', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', title: 'Tab 1', content: 'Original', undoStack: ['prev'] } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.updateTabContent('tab-1', 'Updated', { skipHistory: true });
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      // Undo stack should remain unchanged
      expect(result.tabs[0].undoStack).toEqual(['prev']);
    });

    it('should reset cursor and selection when resetCursor option is true', () => {
      const tabs: Tab[] = [
        { 
          id: 'tab-1', 
          title: 'Tab 1', 
          content: 'Original', 
          cursor: { line: 10, column: 5 },
          selection: { startLine: 10, startColumn: 1, endLine: 10, endColumn: 10 },
        } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.updateTabContent('tab-1', 'Updated content', { resetCursor: true });
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      // Cursor should be reset to (1, 1) and selection should be null
      expect(result.tabs[0].cursor).toEqual({ line: 1, column: 1 });
      expect(result.tabs[0].selection).toBeNull();
    });

    it('should preserve cursor and selection when resetCursor is not set', () => {
      const tabs: Tab[] = [
        { 
          id: 'tab-1', 
          title: 'Tab 1', 
          content: 'Original', 
          cursor: { line: 10, column: 5 },
          selection: { startLine: 10, startColumn: 1, endLine: 10, endColumn: 10 },
        } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.updateTabContent('tab-1', 'Updated content');
      
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      // Cursor and selection should remain unchanged
      expect(result.tabs[0].cursor).toEqual({ line: 10, column: 5 });
      expect(result.tabs[0].selection).toEqual({ startLine: 10, startColumn: 1, endLine: 10, endColumn: 10 });
    });
  });

  describe('updateTabLanguage', () => {
    it('should update tab language', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', language: 'markdown' } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.updateTabLanguage('tab-1', 'javascript');
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      expect(result.tabs[0].language).toBe('javascript');
    });
  });

  describe('reorderTabs', () => {
    it('should reorder tabs by moving from one index to another', () => {
      const tabs: Tab[] = [
        { id: 'tab-1' } as Tab,
        { id: 'tab-2' } as Tab,
        { id: 'tab-3' } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      // Move tab from index 0 to index 2
      slice.reorderTabs(0, 2);
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      // The function receives state and returns new state
      // It clones tabs internally, so pass the original tabs
      const result = setFn({ tabs });
      
      // After removing from 0 and inserting at 2:
      // [tab-1, tab-2, tab-3] -> remove tab-1 -> [tab-2, tab-3] -> insert at 2 -> [tab-2, tab-3, tab-1]
      expect(result.tabs.map((t: Tab) => t.id)).toEqual(['tab-2', 'tab-3', 'tab-1']);
    });
  });

  describe('setTabPreviewRatio', () => {
    it('should set preview pane ratio', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', previewPaneRatio: undefined } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.setTabPreviewRatio('tab-1', 0.4);
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      expect(result.tabs[0].previewPaneRatio).toBe(0.4);
    });
  });

  describe('setTabCursor', () => {
    it('should set tab cursor position', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', cursor: null } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.setTabCursor('tab-1', { line: 10, column: 5 });
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      expect(result.tabs[0].cursor).toEqual({ line: 10, column: 5 });
    });
  });

  describe('markTabSaved', () => {
    it('should mark tab as having a saved version', () => {
      const tabs: Tab[] = [
        { id: 'tab-1', content: 'Current', isDirty: true, savedContent: 'Old', hasSavedVersion: false } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.markTabSaved('tab-1');
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      // markTabSaved only sets hasSavedVersion, doesn't clear isDirty
      expect(result.tabs[0].hasSavedVersion).toBe(true);
    });
  });

  describe('revertToSaved', () => {
    it('should revert content to saved version', () => {
      const tabs: Tab[] = [
        { 
          id: 'tab-1', 
          content: 'Modified content', 
          savedContent: 'Original saved content',
          isDirty: true, 
          hasSavedVersion: true,
          undoStack: ['old1', 'old2'],
          redoStack: ['redo1'],
        } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.revertToSaved('tab-1');
      
      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs });
      
      expect(result.tabs[0].content).toBe('Original saved content');
      expect(result.tabs[0].isDirty).toBe(false);
      expect(result.tabs[0].undoStack).toEqual([]);
      expect(result.tabs[0].redoStack).toEqual([]);
    });

    it('should not revert if tab has no saved version', () => {
      const tabs: Tab[] = [
        { 
          id: 'tab-1', 
          content: 'Modified content', 
          savedContent: '',
          isDirty: true, 
          hasSavedVersion: false,
        } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.revertToSaved('tab-1');
      
      // Should not call set because tab has no saved version
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should not revert if tab is not dirty', () => {
      const tabs: Tab[] = [
        { 
          id: 'tab-1', 
          content: 'Clean content', 
          savedContent: 'Clean content',
          isDirty: false, 
          hasSavedVersion: true,
        } as Tab,
      ];
      mockState = createMockState({ tabs });
      mockGet.mockReturnValue(mockState);
      slice = createTabsSlice(mockSet, mockGet, {} as any);
      
      slice.revertToSaved('tab-1');
      
      // Should not call set because tab is not dirty
      expect(mockSet).not.toHaveBeenCalled();
    });
  });
});

