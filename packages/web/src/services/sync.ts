import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';

class SyncService {
  private socket: Socket | null = null;
  private subscribedDocuments: Set<string> = new Set();

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
      console.log('WebSocket connected');
      // Resubscribe to documents
      this.subscribedDocuments.forEach((docId) => {
        this.socket?.emit('document:subscribe', docId);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
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
      console.error('WebSocket error:', error);
    });
  }

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

