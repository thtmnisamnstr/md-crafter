import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEditMenuItems } from '../EditMenu';
import { useStore } from '../../../store';

// Mock the store
vi.mock('../../../store', () => ({
  useStore: {
    getState: vi.fn(),
  },
}));

describe('EditMenu', () => {
  const mockStore = {
    activeTabId: 'tab-1',
    tabs: [
      { id: 'tab-1', title: 'test.md', content: 'test', language: 'markdown' },
    ],
    copyForWordDocs: vi.fn(),
    pasteFromWordDocs: vi.fn(),
    formatDocument: vi.fn(),
    checkGrammar: vi.fn(),
  };

  const mockEditorContext = {
    getActiveEditor: vi.fn(() => ({
      getAction: vi.fn((action: string) => ({
        run: vi.fn(),
      })),
    })) as any,
    primaryMonaco: {} as any,
    grammarService: {} as any,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore.getState as any).mockReturnValue(mockStore);
  });

  describe('Menu Items Structure', () => {
    it('should return array of menu items', () => {
      const items = getEditMenuItems(mockEditorContext);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('should include Undo item', () => {
      const items = getEditMenuItems(mockEditorContext);
      const undoItem = items.find(item => item.id === 'undo');
      expect(undoItem).toBeTruthy();
      expect(undoItem?.label).toBe('Undo');
      expect(undoItem?.shortcut).toBe('⌘Z');
    });

    it('should include Redo item', () => {
      const items = getEditMenuItems(mockEditorContext);
      const redoItem = items.find(item => item.id === 'redo');
      expect(redoItem).toBeTruthy();
      expect(redoItem?.label).toBe('Redo');
      expect(redoItem?.shortcut).toBe('⌘⇧Z');
    });

    it('should include Find item', () => {
      const items = getEditMenuItems(mockEditorContext);
      const findItem = items.find(item => item.id === 'find');
      expect(findItem).toBeTruthy();
      expect(findItem?.label).toBe('Find');
      expect(findItem?.shortcut).toBe('⌘F');
    });

    it('should include Replace item', () => {
      const items = getEditMenuItems(mockEditorContext);
      const replaceItem = items.find(item => item.id === 'replace');
      expect(replaceItem).toBeTruthy();
      expect(replaceItem?.label).toBe('Replace');
      expect(replaceItem?.shortcut).toBe('⌘H');
    });
  });

  describe('Editor Context Usage', () => {
    it('should use getActiveEditor for Find action', () => {
      const items = getEditMenuItems(mockEditorContext);
      const findItem = items.find(item => item.id === 'find');
      findItem?.action?.();
      expect(mockEditorContext.getActiveEditor).toHaveBeenCalled();
    });

    it('should use getActiveEditor for Replace action', () => {
      const items = getEditMenuItems(mockEditorContext);
      const replaceItem = items.find(item => item.id === 'replace');
      replaceItem?.action?.();
      expect(mockEditorContext.getActiveEditor).toHaveBeenCalled();
    });

    it('should use getActiveEditor for Paste from Word action', () => {
      const items = getEditMenuItems(mockEditorContext);
      const pasteWordItem = items.find(item => item.id === 'paste-word');
      pasteWordItem?.action?.();
      expect(mockEditorContext.getActiveEditor).toHaveBeenCalled();
    });

    it('should use editor context for grammar check', () => {
      const items = getEditMenuItems(mockEditorContext);
      const grammarItem = items.find(item => item.id === 'grammar');
      grammarItem?.action?.();
      expect(mockEditorContext.getActiveEditor).toHaveBeenCalled();
      expect(mockStore.checkGrammar).toHaveBeenCalledWith({
        editor: expect.any(Object),
        monaco: mockEditorContext.primaryMonaco,
        grammarService: mockEditorContext.grammarService,
      });
    });
  });

  describe('Disabled States', () => {
    it('should disable format/grammar for non-markdown files', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        tabs: [
          { id: 'tab-1', title: 'test.js', content: 'test', language: 'javascript' },
        ],
      });

      const items = getEditMenuItems(mockEditorContext);
      const formatItem = items.find(item => item.id === 'format');
      const grammarItem = items.find(item => item.id === 'grammar');

      expect(formatItem?.disabled).toBe(true);
      expect(grammarItem?.disabled).toBe(true);
    });

    it('should enable format/grammar for markdown files', () => {
      const items = getEditMenuItems(mockEditorContext);
      const formatItem = items.find(item => item.id === 'format');
      const grammarItem = items.find(item => item.id === 'grammar');

      expect(formatItem?.disabled).toBe(false);
      expect(grammarItem?.disabled).toBe(false);
    });

    it('should disable Copy for Word/Docs when no active tab', () => {
      (useStore.getState as any).mockReturnValue({
        ...mockStore,
        activeTabId: null,
        tabs: [],
      });

      const items = getEditMenuItems(mockEditorContext);
      const copyWordItem = items.find(item => item.id === 'copy-word');
      expect(copyWordItem?.disabled).toBe(true);
    });
  });

  describe('Actions', () => {
    it('should call copyForWordDocs when Copy for Word/Docs action is executed', () => {
      const items = getEditMenuItems(mockEditorContext);
      const copyWordItem = items.find(item => item.id === 'copy-word');
      copyWordItem?.action?.();
      expect(mockStore.copyForWordDocs).toHaveBeenCalled();
    });

    it('should call formatDocument when Format Document action is executed', () => {
      const items = getEditMenuItems(mockEditorContext);
      const formatItem = items.find(item => item.id === 'format');
      formatItem?.action?.();
      expect(mockStore.formatDocument).toHaveBeenCalled();
    });

    it('should call checkGrammar when Check Grammar action is executed', () => {
      const items = getEditMenuItems(mockEditorContext);
      const grammarItem = items.find(item => item.id === 'grammar');
      grammarItem?.action?.();
      expect(mockStore.checkGrammar).toHaveBeenCalled();
    });
  });
});

