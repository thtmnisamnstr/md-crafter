import { io, Socket } from 'socket.io-client';
import { logger } from '@md-crafter/shared';
import { useStore } from '../store';

/**
 * Service for managing real-time document synchronization via WebSocket
 * 
 * Handles WebSocket connections, document subscriptions, and real-time updates.
 * Automatically detects conflicts when remote changes occur while local edits exist.
 */
class SyncService {
  private socket: Socket | null = null;
  private subscribedDocuments: Set<string> = new Set();

  /**
   * Connects to the WebSocket server and sets up event handlers
   * 
   * Establishes a Socket.IO connection with automatic reconnection. Sets up handlers
   * for document updates, deletions, and connection events. Automatically resubscribes
   * to previously subscribed documents on reconnect.
   * 
   * @param token - API token for authentication
   */
  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io({
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      logger.info('WebSocket connected');
      // Resubscribe to documents
      this.subscribedDocuments.forEach((docId) => {
        this.socket?.emit('document:subscribe', docId);
      });
    });

    this.socket.on('disconnect', () => {
      logger.info('WebSocket disconnected');
    });

    this.socket.on('document:updated', (data: {
      documentId: string;
      etag: string;
      updatedAt: string;
      userId: string;
    }) => {
      // Handle remote update
      const store = useStore.getState();
      const tab = store.tabs.find((t) => t.documentId === data.documentId);
      
      if (tab && tab.savedContent !== tab.content) {
        // Local has changes, potential conflict
        store.setConflict({
          documentId: data.documentId,
          localContent: tab.content,
          remoteContent: '', // Will be fetched
          localTimestamp: Date.now(),
          remoteTimestamp: new Date(data.updatedAt).getTime(),
        });
      } else if (tab) {
        // No local changes, auto-update
        store.openCloudDocument(data.documentId);
      }
    });

    this.socket.on('document:deleted', (data: { documentId: string }) => {
      const store = useStore.getState();
      const tab = store.tabs.find((t) => t.documentId === data.documentId);
      if (tab) {
        store.closeTab(tab.id);
        store.addToast({
          type: 'warning',
          message: 'Document was deleted from another device',
        });
      }
      store.loadCloudDocuments();
    });

    this.socket.on('error', (error: { message: string }) => {
      logger.error('WebSocket error', error);
    });
  }

  /**
   * Disconnects from the WebSocket server
   * 
   * Closes the socket connection and clears the socket reference.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscribedDocuments.clear();
  }

  subscribeToDocument(documentId: string) {
    this.subscribedDocuments.add(documentId);
    if (this.socket?.connected) {
      this.socket.emit('document:subscribe', documentId);
    }
  }

  unsubscribeFromDocument(documentId: string) {
    this.subscribedDocuments.delete(documentId);
    if (this.socket?.connected) {
      this.socket.emit('document:unsubscribe', documentId);
    }
  }

  updateCursor(documentId: string, position: { line: number; column: number }) {
    if (this.socket?.connected) {
      this.socket.emit('cursor:update', { documentId, position });
    }
  }

  updateSelection(
    documentId: string,
    selection: { startLine: number; startColumn: number; endLine: number; endColumn: number }
  ) {
    if (this.socket?.connected) {
      this.socket.emit('selection:update', { documentId, selection });
    }
  }

  updatePresence(documentId: string, status: 'active' | 'idle') {
    if (this.socket?.connected) {
      this.socket.emit('presence:update', { documentId, status });
    }
  }
}

export const syncService = new SyncService();

