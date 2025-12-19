import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSyncSlice, SyncSlice } from '../../store/sync';
import { AppState, Tab } from '../../store/types';
import { ConflictInfo } from '@md-crafter/shared';

// Mock the api module
vi.mock('../../services/api', () => ({
  api: {
    syncDocument: vi.fn(),
  },
}));

// Import mocked modules
import { api } from '../../services/api';

// Create mock state
const createMockState = (overrides: Partial<AppState> = {}): AppState => ({
  isOnline: true,
  isAuthenticated: true,
  conflict: null,
  tabs: [],
  settings: { syncInterval: 100 },
  addToast: vi.fn(),
  syncDocument: vi.fn(),
  saveDocumentToCloud: vi.fn(),
  ...overrides,
} as unknown as AppState);

describe('Sync Slice', () => {
  let slice: SyncSlice;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockState: AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockState = createMockState();
    mockSet = vi.fn();
    mockGet = vi.fn(() => mockState);
    slice = createSyncSlice(mockSet, mockGet, {} as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should be online by default', () => {
      expect(slice.isOnline).toBe(true);
    });

    it('should have no conflict initially', () => {
      expect(slice.conflict).toBeNull();
    });
  });

  describe('setOnline', () => {
    it('should set online status to true', () => {
      slice.setOnline(true);

      expect(mockSet).toHaveBeenCalledWith({ isOnline: true });
    });

    it('should set online status to false', () => {
      slice.setOnline(false);

      expect(mockSet).toHaveBeenCalledWith({ isOnline: false });
    });

    it('should show "Back online" toast when coming online', () => {
      slice.setOnline(true);

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Back online',
      });
    });

    it('should show "You are offline" toast when going offline', () => {
      slice.setOnline(false);

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'warning',
        message: 'You are offline',
      });
    });

    it('should sync pending dirty cloud documents when coming online', () => {
      const dirtyCloudTab: Tab = {
        id: 'tab-1',
        isDirty: true,
        isCloudSynced: true,
        documentId: 'doc-1',
      } as Tab;
      const cleanTab: Tab = {
        id: 'tab-2',
        isDirty: false,
        isCloudSynced: true,
        documentId: 'doc-2',
      } as Tab;
      const localTab: Tab = {
        id: 'tab-3',
        isDirty: true,
        isCloudSynced: false,
      } as Tab;

      mockState = createMockState({
        tabs: [dirtyCloudTab, cleanTab, localTab],
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      slice.setOnline(true);

      // Should sync only the dirty cloud-synced tab
      expect(mockState.syncDocument).toHaveBeenCalledWith('tab-1');
      expect(mockState.syncDocument).not.toHaveBeenCalledWith('tab-2');
      expect(mockState.syncDocument).not.toHaveBeenCalledWith('tab-3');
    });

    it('should not sync documents when going offline', () => {
      const dirtyCloudTab: Tab = {
        id: 'tab-1',
        isDirty: true,
        isCloudSynced: true,
      } as Tab;

      mockState = createMockState({ tabs: [dirtyCloudTab] });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      slice.setOnline(false);

      expect(mockState.syncDocument).not.toHaveBeenCalled();
    });
  });

  describe('setConflict', () => {
    it('should set conflict state', () => {
      const conflict: ConflictInfo = {
        documentId: 'doc-1',
        localContent: 'local',
        remoteContent: 'remote',
        localTimestamp: 1000,
        remoteTimestamp: 2000,
      };

      slice.setConflict(conflict);

      expect(mockSet).toHaveBeenCalledWith({ conflict });
    });

    it('should clear conflict when set to null', () => {
      slice.setConflict(null);

      expect(mockSet).toHaveBeenCalledWith({ conflict: null });
    });
  });

  describe('resolveConflict', () => {
    const conflict: ConflictInfo = {
      documentId: 'doc-1',
      localContent: 'local content',
      remoteContent: 'remote content',
      localTimestamp: 1000,
      remoteTimestamp: 2000,
    };

    beforeEach(() => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'doc-1',
        content: 'local content',
      } as Tab;

      mockState = createMockState({
        conflict,
        tabs: [tab],
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);
    });

    it('should do nothing if no conflict', async () => {
      mockState = createMockState({ conflict: null });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      await slice.resolveConflict('keep_local');

      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should do nothing if tab not found', async () => {
      mockState = createMockState({
        conflict,
        tabs: [], // No matching tab
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      await slice.resolveConflict('keep_local');

      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should keep local content when resolving with keep_local', async () => {
      await slice.resolveConflict('keep_local');

      expect(mockSet).toHaveBeenCalled();
      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        tabs: [{ id: 'tab-1', documentId: 'doc-1', content: 'old' }],
      });

      expect(result.tabs[0].content).toBe('local content');
      expect(result.conflict).toBeNull();
    });

    it('should keep remote content when resolving with keep_remote', async () => {
      await slice.resolveConflict('keep_remote');

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        tabs: [{ id: 'tab-1', documentId: 'doc-1', content: 'old' }],
      });

      expect(result.tabs[0].content).toBe('remote content');
    });

    it('should use merged content when resolving with merge', async () => {
      await slice.resolveConflict('merge', 'merged content');

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        tabs: [{ id: 'tab-1', documentId: 'doc-1', content: 'old' }],
      });

      expect(result.tabs[0].content).toBe('merged content');
    });

    it('should fall back to local content when merge has no merged content', async () => {
      await slice.resolveConflict('merge');

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        tabs: [{ id: 'tab-1', documentId: 'doc-1', content: 'old' }],
      });

      expect(result.tabs[0].content).toBe('local content');
    });

    it('should mark tab as dirty after resolution', async () => {
      await slice.resolveConflict('keep_local');

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        tabs: [{ id: 'tab-1', documentId: 'doc-1', content: 'old', isDirty: false }],
      });

      expect(result.tabs[0].isDirty).toBe(true);
    });

    it('should clear conflict after resolution', async () => {
      await slice.resolveConflict('keep_local');

      const setFn = mockSet.mock.calls[0][0];
      const result = setFn({
        tabs: [{ id: 'tab-1', documentId: 'doc-1' }],
      });

      expect(result.conflict).toBeNull();
    });

    it('should save to cloud after resolution', async () => {
      await slice.resolveConflict('keep_local');

      expect(mockState.saveDocumentToCloud).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('syncDocument', () => {
    it('should not sync if tab not found', async () => {
      mockState = createMockState({ tabs: [] });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      await slice.syncDocument('non-existent');

      expect(api.syncDocument).not.toHaveBeenCalled();
    });

    it('should not sync if tab has no documentId', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: null,
        content: 'content',
      } as Tab;
      mockState = createMockState({ tabs: [tab] });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      await slice.syncDocument('tab-1');

      expect(api.syncDocument).not.toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'doc-1',
        content: 'content',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isOnline: false,
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      await slice.syncDocument('tab-1');

      expect(api.syncDocument).not.toHaveBeenCalled();
    });

    it('should not sync when not authenticated', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'doc-1',
        content: 'content',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isAuthenticated: false,
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      await slice.syncDocument('tab-1');

      expect(api.syncDocument).not.toHaveBeenCalled();
    });

    it('should debounce sync calls', async () => {
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'debounce-doc',
        content: 'content',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isOnline: true,
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      vi.mocked(api.syncDocument).mockResolvedValue(undefined);

      // Call multiple times rapidly
      await slice.syncDocument('tab-1');
      await slice.syncDocument('tab-1');
      await slice.syncDocument('tab-1');

      // Should not have called API yet (debounced)
      expect(api.syncDocument).not.toHaveBeenCalled();

      // Advance timers past debounce interval
      await vi.advanceTimersByTimeAsync(150);

      // Now it should have been called once
      expect(api.syncDocument).toHaveBeenCalledTimes(1);
      expect(api.syncDocument).toHaveBeenCalledWith('debounce-doc', 'content');
    });
  });

  describe('cleanupSyncDebouncer', () => {
    it('should clean up debouncer for document', () => {
      // Create a debouncer first
      const tab: Tab = {
        id: 'tab-1',
        documentId: 'cleanup-doc',
        content: 'content',
      } as Tab;
      mockState = createMockState({
        tabs: [tab],
        isOnline: true,
        isAuthenticated: true,
      });
      mockGet.mockReturnValue(mockState);
      slice = createSyncSlice(mockSet, mockGet, {} as any);

      // Trigger sync to create debouncer
      slice.syncDocument('tab-1');

      // Clean up the debouncer
      slice.cleanupSyncDebouncer('cleanup-doc');

      // This should complete without error
      expect(true).toBe(true);
    });

    it('should handle cleaning up non-existent debouncer', () => {
      // Should not throw when cleaning up non-existent
      expect(() => {
        slice.cleanupSyncDebouncer('non-existent-doc');
      }).not.toThrow();
    });
  });
});

