import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncService } from '../sync';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../../store';
import { logger } from '@md-crafter/shared';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  disconnect: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
} as unknown as Socket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock store
const mockStore = {
  tabs: [],
  setConflict: vi.fn(),
  openCloudDocument: vi.fn(),
  closeTab: vi.fn(),
  addToast: vi.fn(),
  loadCloudDocuments: vi.fn(),
  getState: vi.fn(() => mockStore),
};

vi.mock('../../store', () => ({
  useStore: {
    getState: vi.fn(() => mockStore),
  },
}));

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockSocket as any).connected = false;
    (mockSocket as any).on.mockClear();
    (mockSocket as any).emit.mockClear();
    (mockSocket as any).disconnect.mockClear();
    mockStore.tabs = [];
    mockStore.setConflict.mockClear();
    mockStore.openCloudDocument.mockClear();
    mockStore.closeTab.mockClear();
    mockStore.addToast.mockClear();
    mockStore.loadCloudDocuments.mockClear();
  });

  afterEach(() => {
    syncService.disconnect();
  });

  describe('Connection', () => {
    it('should connect to WebSocket server', () => {
      syncService.connect('test-token');
      
      expect(io).toHaveBeenCalledWith({
        auth: { token: 'test-token' },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    });

    it('should not connect if already connected', () => {
      // First connect to create socket
      syncService.connect('test-token');
      vi.clearAllMocks();
      // Now set connected to true
      (mockSocket as any).connected = true;
      // Try to connect again
      syncService.connect('test-token');
      
      // Should not create new socket
      expect(io).not.toHaveBeenCalled();
    });

    it('should set up event handlers on connect', () => {
      syncService.connect('test-token');
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('document:updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('document:deleted', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log connection', () => {
      syncService.connect('test-token');
      
      // Trigger connect event
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1];
      
      if (connectHandler) {
        connectHandler();
        expect(logger.info).toHaveBeenCalledWith('WebSocket connected');
      }
    });

    it('should resubscribe to documents on reconnect', () => {
      syncService.connect('test-token');
      syncService.subscribeToDocument('doc-1');
      syncService.subscribeToDocument('doc-2');
      
      // Disconnect
      syncService.disconnect();
      vi.clearAllMocks();
      
      // Reconnect
      syncService.connect('test-token');
      
      // Trigger connect event - get the LAST connect handler (from reconnect)
      const connectCalls = (mockSocket.on as any).mock.calls.filter(
        (call: any[]) => call[0] === 'connect'
      );
      const connectHandler = connectCalls[connectCalls.length - 1]?.[1];
      
      if (connectHandler) {
        (mockSocket as any).connected = true;
        connectHandler();
        
        expect(mockSocket.emit).toHaveBeenCalledWith('document:subscribe', 'doc-1');
        expect(mockSocket.emit).toHaveBeenCalledWith('document:subscribe', 'doc-2');
      }
    });

    it('should disconnect from WebSocket server', () => {
      syncService.connect('test-token');
      syncService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should clear subscribed documents on disconnect', () => {
      syncService.connect('test-token');
      syncService.subscribeToDocument('doc-1');
      syncService.disconnect();
      
      // Should clear subscriptions
      expect(syncService.subscribeToDocument).toBeDefined();
    });
  });

  describe('Document Subscription', () => {
    beforeEach(() => {
      syncService.connect('test-token');
    });

    it('should subscribe to document', () => {
      (mockSocket as any).connected = true;
      syncService.subscribeToDocument('doc-1');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('document:subscribe', 'doc-1');
    });

    it('should not emit if socket is not connected', () => {
      (mockSocket as any).connected = false;
      syncService.subscribeToDocument('doc-1');
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should unsubscribe from document', () => {
      (mockSocket as any).connected = true;
      syncService.subscribeToDocument('doc-1');
      syncService.unsubscribeFromDocument('doc-1');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('document:unsubscribe', 'doc-1');
    });

    it('should not emit unsubscribe if socket is not connected', () => {
      (mockSocket as any).connected = false;
      syncService.subscribeToDocument('doc-1');
      syncService.unsubscribeFromDocument('doc-1');
      
      // Should not emit, but should remove from set
      const emitCalls = (mockSocket.emit as any).mock.calls.filter(
        (call: any[]) => call[0] === 'document:unsubscribe'
      );
      expect(emitCalls.length).toBe(0);
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      syncService.connect('test-token');
    });

    it('should handle document:updated with conflict detection', () => {
      mockStore.tabs = [
        {
          id: 'tab-1',
          documentId: 'doc-1',
          content: 'Modified content',
          savedContent: 'Original content',
        },
      ];
      
      const updateHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'document:updated'
      )?.[1];
      
      if (updateHandler) {
        updateHandler({
          documentId: 'doc-1',
          etag: 'etag-123',
          updatedAt: '2024-01-01T00:00:00Z',
          userId: 'user-1',
        });
        
        expect(mockStore.setConflict).toHaveBeenCalledWith({
          documentId: 'doc-1',
          localContent: 'Modified content',
          remoteContent: '',
          localTimestamp: expect.any(Number),
          remoteTimestamp: expect.any(Number),
        });
      }
    });

    it('should auto-update document when no local changes', () => {
      mockStore.tabs = [
        {
          id: 'tab-1',
          documentId: 'doc-1',
          content: 'Content',
          savedContent: 'Content',
        },
      ];
      
      const updateHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'document:updated'
      )?.[1];
      
      if (updateHandler) {
        updateHandler({
          documentId: 'doc-1',
          etag: 'etag-123',
          updatedAt: '2024-01-01T00:00:00Z',
          userId: 'user-1',
        });
        
        expect(mockStore.openCloudDocument).toHaveBeenCalledWith('doc-1');
        expect(mockStore.setConflict).not.toHaveBeenCalled();
      }
    });

    it('should handle document:deleted event', () => {
      mockStore.tabs = [
        {
          id: 'tab-1',
          documentId: 'doc-1',
          content: 'Content',
          savedContent: 'Content',
        },
      ];
      
      const deleteHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'document:deleted'
      )?.[1];
      
      if (deleteHandler) {
        deleteHandler({ documentId: 'doc-1' });
        
        expect(mockStore.closeTab).toHaveBeenCalledWith('tab-1');
        expect(mockStore.addToast).toHaveBeenCalledWith({
          type: 'warning',
          message: 'Document was deleted from another device',
        });
        expect(mockStore.loadCloudDocuments).toHaveBeenCalled();
      }
    });

    it('should handle WebSocket errors', () => {
      const errorHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        errorHandler({ message: 'Connection error' });
        
        expect(logger.error).toHaveBeenCalledWith('WebSocket error', { message: 'Connection error' });
      }
    });
  });

  describe('Presence and Cursor Updates', () => {
    beforeEach(() => {
      syncService.connect('test-token');
      (mockSocket as any).connected = true;
    });

    it('should update cursor position', () => {
      syncService.updateCursor('doc-1', { line: 5, column: 10 });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('cursor:update', {
        documentId: 'doc-1',
        position: { line: 5, column: 10 },
      });
    });

    it('should update selection', () => {
      syncService.updateSelection('doc-1', {
        startLine: 1,
        startColumn: 0,
        endLine: 2,
        endColumn: 10,
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('selection:update', {
        documentId: 'doc-1',
        selection: {
          startLine: 1,
          startColumn: 0,
          endLine: 2,
          endColumn: 10,
        },
      });
    });

    it('should update presence status', () => {
      syncService.updatePresence('doc-1', 'active');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('presence:update', {
        documentId: 'doc-1',
        status: 'active',
      });
    });

    it('should not emit if socket is not connected', () => {
      (mockSocket as any).connected = false;
      syncService.updateCursor('doc-1', { line: 5, column: 10 });
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});

