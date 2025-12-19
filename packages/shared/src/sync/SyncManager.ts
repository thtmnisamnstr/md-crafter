import { Document } from '../types/document.js';
import { SyncState, SyncQueueItem, SyncEvent, SyncConfig, DEFAULT_SYNC_CONFIG } from '../types/sync.js';
import { generateHash, generateUUID } from '../utils/hash.js';
import { debounce } from '../utils/debounce.js';
import { logger } from '../utils/logger.js';
import { SyncStatus } from './SyncStatus.js';

export type SyncEventHandler = (event: SyncEvent) => void;

export interface SyncApiClient {
  getDocument(id: string): Promise<Document | null>;
  saveDocument(doc: Partial<Document> & { id: string; content: string; etag: string }): Promise<Document>;
  syncDocument(id: string, content: string, etag: string): Promise<{
    success: boolean;
    document?: Document;
    conflict?: { serverContent: string; serverEtag: string };
  }>;
}

export class SyncManager {
  private config: SyncConfig;
  private states: Map<string, SyncState> = new Map();
  private queue: SyncQueueItem[] = [];
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private syncTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isOnline: boolean = true;
  private apiClient: SyncApiClient | null = null;
  private statusInstances: Map<string, SyncStatus> = new Map();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    
    // Listen for online/offline events in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));
      this.isOnline = navigator.onLine;
    }
  }

  setApiClient(client: SyncApiClient): void {
    this.apiClient = client;
  }

  setOnline(online: boolean): void {
    this.isOnline = online;
    if (online) {
      this.processQueue();
    } else {
      // Update all synced documents to offline status
      this.states.forEach((state, docId) => {
        if (state.status === 'synced' || state.status === 'syncing') {
          this.updateState(docId, { status: 'offline' });
        }
      });
    }
  }

  getStatus(documentId: string): SyncStatus {
    if (!this.statusInstances.has(documentId)) {
      this.statusInstances.set(documentId, new SyncStatus());
    }
    return this.statusInstances.get(documentId)!;
  }

  getState(documentId: string): SyncState | undefined {
    return this.states.get(documentId);
  }

  /**
   * Register a document for syncing
   */
  registerDocument(documentId: string, initialEtag: string | null = null): void {
    if (!this.states.has(documentId)) {
      this.states.set(documentId, {
        documentId,
        status: 'local',
        lastSyncedAt: null,
        lastLocalChange: null,
        pendingChanges: false,
        localEtag: initialEtag,
        remoteEtag: null,
      });
    }
  }

  /**
   * Unregister a document from syncing
   */
  unregisterDocument(documentId: string): void {
    this.states.delete(documentId);
    this.statusInstances.delete(documentId);
    const timer = this.syncTimers.get(documentId);
    if (timer) {
      clearTimeout(timer);
      this.syncTimers.delete(documentId);
    }
    // Remove from queue
    this.queue = this.queue.filter((item) => item.documentId !== documentId);
  }

  /**
   * Enable cloud sync for a document
   */
  enableCloudSync(documentId: string): void {
    const state = this.states.get(documentId);
    if (state && state.status === 'local') {
      this.updateState(documentId, { status: 'pending' });
    }
  }

  /**
   * Notify the sync manager that a document has changed
   */
  notifyChange(documentId: string, content: string): void {
    const state = this.states.get(documentId);
    if (!state || state.status === 'local') return;

    const newEtag = generateHash(content);
    this.updateState(documentId, {
      lastLocalChange: new Date(),
      pendingChanges: true,
      localEtag: newEtag,
      status: 'pending',
    });

    if (this.config.autoSync) {
      this.scheduleSyncDebounced(documentId, content);
    }
  }

  private scheduleSyncDebounced = debounce((documentId: string, content: string) => {
    this.scheduleSync(documentId, content);
  }, 500);

  /**
   * Schedule a sync for a document
   */
  private scheduleSync(documentId: string, content: string): void {
    // Clear existing timer
    const existingTimer = this.syncTimers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new sync
    const timer = setTimeout(() => {
      this.syncDocument(documentId, content);
    }, this.config.syncInterval);

    this.syncTimers.set(documentId, timer);
  }

  /**
   * Immediately sync a document
   */
  async syncDocument(documentId: string, content: string): Promise<boolean> {
    if (!this.apiClient) {
      logger.warn('No API client configured for sync');
      return false;
    }

    const state = this.states.get(documentId);
    if (!state) return false;

    if (!this.isOnline) {
      this.addToQueue(documentId, content);
      return false;
    }

    this.updateState(documentId, { status: 'syncing' });
    this.emitEvent({ type: 'sync_start', documentId, timestamp: Date.now() });

    try {
      const result = await this.apiClient.syncDocument(
        documentId,
        content,
        state.localEtag || ''
      );

      if (result.success && result.document) {
        this.updateState(documentId, {
          status: 'synced',
          lastSyncedAt: new Date(),
          pendingChanges: false,
          localEtag: result.document.etag,
          remoteEtag: result.document.etag,
        });
        this.emitEvent({
          type: 'sync_complete',
          documentId,
          timestamp: Date.now(),
          data: result.document,
        });
        return true;
      } else if (result.conflict) {
        this.updateState(documentId, {
          status: 'conflict',
          remoteEtag: result.conflict.serverEtag,
        });
        this.emitEvent({
          type: 'conflict_detected',
          documentId,
          timestamp: Date.now(),
          data: {
            localContent: content,
            remoteContent: result.conflict.serverContent,
            remoteEtag: result.conflict.serverEtag,
          },
        });
        return false;
      }

      return false;
    } catch (error) {
      this.updateState(documentId, { status: 'pending', error: String(error) });
      this.emitEvent({
        type: 'sync_error',
        documentId,
        timestamp: Date.now(),
        data: error,
      });
      this.addToQueue(documentId, content);
      return false;
    }
  }

  /**
   * Force sync now (bypass debouncing)
   */
  async forceSyncNow(documentId: string, content: string): Promise<boolean> {
    // Clear any scheduled sync
    const timer = this.syncTimers.get(documentId);
    if (timer) {
      clearTimeout(timer);
      this.syncTimers.delete(documentId);
    }

    return this.syncDocument(documentId, content);
  }

  /**
   * Add a sync request to the offline queue
   */
  private addToQueue(documentId: string, content: string): void {
    // Remove existing queue item for this document
    this.queue = this.queue.filter((item) => item.documentId !== documentId);

    // Add new queue item
    this.queue.push({
      id: generateUUID(),
      documentId,
      content,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Process the offline queue
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const items = [...this.queue];
    this.queue = [];

    for (const item of items) {
      const success = await this.syncDocument(item.documentId, item.content);
      
      if (!success && item.retryCount < item.maxRetries) {
        // Re-add to queue with incremented retry count
        this.queue.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      }
    }

    // Schedule retry if there are still items in queue
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.config.retryDelay);
    }
  }

  /**
   * Subscribe to sync events
   */
  onEvent(handler: SyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: SyncEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  private updateState(documentId: string, updates: Partial<SyncState>): void {
    const current = this.states.get(documentId);
    if (current) {
      const newState = { ...current, ...updates };
      this.states.set(documentId, newState);
      
      // Update status instance
      const status = this.getStatus(documentId);
      if (updates.status) {
        status.setStatus(updates.status);
      }
    }
  }

  /**
   * Get all documents with pending changes
   */
  getPendingDocuments(): string[] {
    return Array.from(this.states.entries())
      .filter(([_, state]) => state.pendingChanges)
      .map(([id]) => id);
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return Array.from(this.states.values()).some((state) => state.pendingChanges);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }
}

