import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDocumentsSlice, DocumentsSlice } from '../../store/documents';
import { AppState, Tab, RecentFile } from '../../store/types';

// Mock the utils
vi.mock('../../store/utils', () => ({
  generateId: vi.fn(() => 'mock-doc-id'),
}));

// Mock the api module
vi.mock('../../services/api', () => ({
  api: {
    getDocuments: vi.fn(),
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

// Mock the sync service
vi.mock('../../services/sync', () => ({
  syncService: {
    subscribeToDocument: vi.fn(),
    unsubscribeFromDocument: vi.fn(),
  },
}));

// Mock the platform util
vi.mock('../../utils/platform', () => ({
  isElectron: vi.fn(() => false),
}));

// Import mocked modules
import { api } from '../../services/api';
import { syncService } from '../../services/sync';
import { isElectron } from '../../utils/platform';

// Create mock state
const createMockState = (overrides: Partial<AppState> = {}): AppState => ({
  tabs: [],
  activeTabId: null,
  cloudDocuments: [],
  recentFiles: [],
  isAuthenticated: false,
  addToast: vi.fn(),
  openTab: vi.fn(),
  closeTab: vi.fn(),
  cleanupSyncDebouncer: vi.fn(),
  loadCloudDocuments: vi.fn(),
  saveDocumentToCloud: vi.fn(),
  ...overrides,
} as unknown as AppState);

describe('Documents Slice', () => {
  let slice: DocumentsSlice;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockState: AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createMockState();
    mockSet = vi.fn();
    mockGet = vi.fn(() => mockState);
    slice = createDocumentsSlice(mockSet, mockGet, {} as any);
  });

  describe('Initial State', () => {
    it('should have empty cloudDocuments array', () => {
      expect(slice.cloudDocuments).toEqual([]);
    });

    it('should have empty recentFiles array', () => {
      expect(slice.recentFiles).toEqual([]);
    });
  });

  describe('createNewDocument', () => {
    it('should create a new document tab', () => {
      slice.createNewDocument();

      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [] });

      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0]).toMatchObject({
        id: 'mock-doc-id',
        title: 'Untitled.md',
        language: 'markdown',
        isDirty: true,
        isCloudSynced: false,
        hasSavedVersion: false,
      });
      expect(result.activeTabId).toBe('mock-doc-id');
    });

    it('should set default content for new documents', () => {
      slice.createNewDocument();

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [] });

      expect(result.tabs[0].content).toBe('# New Document\n\nStart writing here...\n');
    });

    it('should reset UI state for new document', () => {
      slice.createNewDocument();

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [] });

      expect(result.splitMode).toBe('none');
      expect(result.showPreview).toBe(false);
      expect(result.diffMode).toEqual({
        enabled: false,
        compareWithSaved: false,
        viewMode: 'side-by-side',
      });
    });
  });

  describe('saveCurrentDocument', () => {
    it('should do nothing if no active tab', async () => {
      mockState = createMockState({ activeTabId: null });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      await slice.saveCurrentDocument();

      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should mark document as saved locally for non-cloud documents', async () => {
      const tab: Tab = {
        id: 'tab-1',
        title: 'Test.md',
        content: 'Content',
        isDirty: true,
        isCloudSynced: false,
      } as Tab;
      mockState = createMockState({
        activeTabId: 'tab-1',
        tabs: [tab],
        isAuthenticated: false,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      await slice.saveCurrentDocument();

      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({ tabs: [tab] });

      expect(result.tabs[0].isDirty).toBe(false);
      expect(result.tabs[0].hasSavedVersion).toBe(true);
      expect(result.tabs[0].savedContent).toBe('Content');
    });

    it('should save to cloud for cloud-synced documents when authenticated', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'cloud-doc-1',
        title: 'Cloud.md',
        content: 'Cloud content',
        isDirty: true,
        isCloudSynced: true,
      } as Tab;
      mockState = createMockState({
        activeTabId: 'tab-1',
        tabs: [tab],
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      await slice.saveCurrentDocument();

      expect(mockState.saveDocumentToCloud).toHaveBeenCalledWith('tab-1');
    });

    it('should show success toast for local save', async () => {
      const tab: Tab = {
        id: 'tab-1',
        content: 'Content',
        isDirty: true,
        isCloudSynced: false,
      } as Tab;
      mockState = createMockState({
        activeTabId: 'tab-1',
        tabs: [tab],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      await slice.saveCurrentDocument();

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Document saved locally',
      });
    });
  });

  describe('saveDocumentToCloud', () => {
    beforeEach(() => {
      mockState = createMockState({ isAuthenticated: true });
      mockGet.mockReturnValue(mockState);
    });

    it('should do nothing if tab not found', async () => {
      mockState = createMockState({
        tabs: [],
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      await slice.saveDocumentToCloud('non-existent');

      expect(api.createDocument).not.toHaveBeenCalled();
      expect(api.updateDocument).not.toHaveBeenCalled();
    });

    it('should create new document if no documentId', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: null,
        title: 'New.md',
        content: 'New content',
        language: 'markdown',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      vi.mocked(api.createDocument).mockResolvedValue({
        id: 'new-cloud-doc',
        title: 'New.md',
        content: 'New content',
        language: 'markdown',
      } as any);

      await slice.saveDocumentToCloud('tab-1');

      expect(api.createDocument).toHaveBeenCalledWith({
        title: 'New.md',
        content: 'New content',
        language: 'markdown',
      });
    });

    it('should update existing document if has documentId', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'existing-doc',
        title: 'Existing.md',
        content: 'Updated content',
        language: 'markdown',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      vi.mocked(api.updateDocument).mockResolvedValue({
        id: 'existing-doc',
        title: 'Existing.md',
        content: 'Updated content',
        language: 'markdown',
      } as any);

      await slice.saveDocumentToCloud('tab-1');

      expect(api.updateDocument).toHaveBeenCalledWith('existing-doc', {
        title: 'Existing.md',
        content: 'Updated content',
        language: 'markdown',
      });
    });

    it('should set sync status to syncing during save', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: null,
        title: 'New.md',
        content: 'Content',
        language: 'markdown',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      vi.mocked(api.createDocument).mockResolvedValue({ id: 'new-doc' } as any);

      await slice.saveDocumentToCloud('tab-1');

      // First set call should set syncing status
      const firstSetFn = mockSet.mock.calls[0][0];
      const syncingResult = firstSetFn({ tabs: [tab] });
      expect(syncingResult.tabs[0].syncStatus).toBe('syncing');
    });

    it('should handle save errors', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: null,
        title: 'New.md',
        content: 'Content',
        language: 'markdown',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      vi.mocked(api.createDocument).mockRejectedValue(new Error('Network error'));

      await slice.saveDocumentToCloud('tab-1');

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to save to cloud',
      });
    });
  });

  describe('loadCloudDocuments', () => {
    it('should fetch and set cloud documents', async () => {
      const docs = [
        { id: 'doc-1', title: 'Doc 1' },
        { id: 'doc-2', title: 'Doc 2' },
      ];
      vi.mocked(api.getDocuments).mockResolvedValue(docs as any);

      await slice.loadCloudDocuments();

      expect(api.getDocuments).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ cloudDocuments: docs });
    });

    it('should show error toast on failure', async () => {
      vi.mocked(api.getDocuments).mockRejectedValue(new Error('API error'));

      await slice.loadCloudDocuments();

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to load cloud documents',
      });
    });
  });

  describe('openCloudDocument', () => {
    it('should switch to existing tab if document already open', async () => {
      const existingTab: Tab = {
        id: 'tab-1',
        documentId: 'cloud-doc-1',
        title: 'Cloud Doc',
      } as Tab;
      mockState = createMockState({
        tabs: [existingTab],
        addRecentFile: vi.fn(),
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      await slice.openCloudDocument('cloud-doc-1');

      expect(mockSet).toHaveBeenCalledWith({ activeTabId: 'tab-1' });
      expect(api.getDocument).not.toHaveBeenCalled();
      expect(mockState.addRecentFile).toHaveBeenCalled();
    });

    it('should fetch and open new document', async () => {
      const doc = {
        id: 'cloud-doc-1',
        title: 'Cloud Doc',
        content: 'Cloud content',
        language: 'markdown',
      };
      vi.mocked(api.getDocument).mockResolvedValue(doc as any);

      await slice.openCloudDocument('cloud-doc-1');

      expect(api.getDocument).toHaveBeenCalledWith('cloud-doc-1');
      expect(mockState.openTab).toHaveBeenCalledWith({
        id: 'cloud-doc-1',
        title: 'Cloud Doc',
        content: 'Cloud content',
        language: 'markdown',
      });
    });

    it('should subscribe to document updates', async () => {
      vi.mocked(api.getDocument).mockResolvedValue({
        id: 'cloud-doc-1',
        title: 'Doc',
        content: '',
        language: 'markdown',
      } as any);

      await slice.openCloudDocument('cloud-doc-1');

      expect(syncService.subscribeToDocument).toHaveBeenCalledWith('cloud-doc-1');
    });

    it('should show error toast on failure', async () => {
      vi.mocked(api.getDocument).mockRejectedValue(new Error('Not found'));

      await slice.openCloudDocument('cloud-doc-1');

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to open document',
      });
    });
  });

  describe('deleteCloudDocument', () => {
    it('should delete document from cloud', async () => {
      vi.mocked(api.deleteDocument).mockResolvedValue(undefined);

      await slice.deleteCloudDocument('cloud-doc-1');

      expect(api.deleteDocument).toHaveBeenCalledWith('cloud-doc-1');
    });

    it('should close any open tabs for deleted document', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'cloud-doc-1',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      vi.mocked(api.deleteDocument).mockResolvedValue(undefined);

      await slice.deleteCloudDocument('cloud-doc-1');

      expect(mockState.closeTab).toHaveBeenCalledWith('tab-1');
    });

    it('should clean up sync debouncer', async () => {
      vi.mocked(api.deleteDocument).mockResolvedValue(undefined);

      await slice.deleteCloudDocument('cloud-doc-1');

      expect(mockState.cleanupSyncDebouncer).toHaveBeenCalledWith('cloud-doc-1');
    });

    it('should show success toast', async () => {
      vi.mocked(api.deleteDocument).mockResolvedValue(undefined);

      await slice.deleteCloudDocument('cloud-doc-1');

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Document deleted',
      });
    });

    it('should show error toast on failure', async () => {
      vi.mocked(api.deleteDocument).mockRejectedValue(new Error('Delete failed'));

      await slice.deleteCloudDocument('cloud-doc-1');

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to delete document',
      });
    });
  });

  describe('addRecentFile', () => {
    it('should add file to recent files list', () => {
      slice.addRecentFile({
        id: 'file-1',
        title: 'Recent File',
        isCloud: false,
      });

      expect(mockSet).toHaveBeenCalled();
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.recentFiles).toHaveLength(1);
      expect(setCall.recentFiles[0]).toMatchObject({
        id: 'file-1',
        title: 'Recent File',
        isCloud: false,
      });
      expect(setCall.recentFiles[0].lastOpened).toBeDefined();
    });

    it('should remove duplicate entries by id', () => {
      mockState = createMockState({
        recentFiles: [
          { id: 'file-1', title: 'Old Title', lastOpened: 1000, isCloud: false },
        ],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      slice.addRecentFile({
        id: 'file-1',
        title: 'New Title',
        isCloud: false,
      });

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.recentFiles).toHaveLength(1);
      expect(setCall.recentFiles[0].title).toBe('New Title');
    });

    it('should remove duplicate entries by documentId', () => {
      mockState = createMockState({
        recentFiles: [
          { id: 'file-1', documentId: 'doc-1', title: 'Old', lastOpened: 1000, isCloud: true },
        ],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      slice.addRecentFile({
        id: 'file-2',
        documentId: 'doc-1',
        title: 'New',
        isCloud: true,
      });

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.recentFiles).toHaveLength(1);
      expect(setCall.recentFiles[0].id).toBe('file-2');
    });

    it('should sort by lastOpened with newest first', () => {
      const oldDate = Date.now() - 10000;
      mockState = createMockState({
        recentFiles: [
          { id: 'old-file', title: 'Old', lastOpened: oldDate, isCloud: false },
        ],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      slice.addRecentFile({
        id: 'new-file',
        title: 'New',
        isCloud: false,
      });

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.recentFiles[0].id).toBe('new-file');
      expect(setCall.recentFiles[1].id).toBe('old-file');
    });
  });

  describe('removeRecentFile', () => {
    it('should remove file from recent files', () => {
      mockState = createMockState({
        recentFiles: [
          { id: 'file-1', title: 'File 1', lastOpened: 1000, isCloud: false },
          { id: 'file-2', title: 'File 2', lastOpened: 2000, isCloud: false },
        ],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      slice.removeRecentFile('file-1');

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.recentFiles).toHaveLength(1);
      expect(setCall.recentFiles[0].id).toBe('file-2');
    });

    it('should handle removing non-existent file', () => {
      mockState = createMockState({
        recentFiles: [
          { id: 'file-1', title: 'File 1', lastOpened: 1000, isCloud: false },
        ],
      });
      mockGet.mockReturnValue(mockState);
      slice = createDocumentsSlice(mockSet, mockGet, {} as any);

      slice.removeRecentFile('non-existent');

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.recentFiles).toHaveLength(1);
    });
  });
});

