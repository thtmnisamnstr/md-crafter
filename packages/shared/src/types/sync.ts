import { SyncStatusType } from './document.js';

export interface SyncState {
  documentId: string;
  status: SyncStatusType;
  lastSyncedAt: Date | null;
  lastLocalChange: Date | null;
  pendingChanges: boolean;
  localEtag: string | null;
  remoteEtag: string | null;
  error?: string;
}

export interface SyncQueueItem {
  id: string;
  documentId: string;
  content: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'conflict_detected' | 'remote_update';
  documentId: string;
  timestamp: number;
  data?: unknown;
}

export interface ConflictInfo {
  documentId: string;
  localContent: string;
  remoteContent: string;
  localTimestamp: number;
  remoteTimestamp: number;
  baseContent?: string;
}

export interface ConflictResolution {
  documentId: string;
  resolution: 'keep_local' | 'keep_remote' | 'merge';
  mergedContent?: string;
}

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  conflictStrategy: 'ask' | 'keep_local' | 'keep_remote' | 'merge';
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  autoSync: true,
  syncInterval: 2000,
  maxRetries: 3,
  retryDelay: 5000,
  conflictStrategy: 'ask',
};

export interface WebSocketMessage {
  type: 'document_updated' | 'document_deleted' | 'sync_request' | 'presence' | 'cursor';
  documentId?: string;
  userId: string;
  payload: unknown;
  timestamp: number;
}

export interface PresenceInfo {
  userId: string;
  documentId: string;
  cursor?: { line: number; column: number };
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  color: string;
  name: string;
}
