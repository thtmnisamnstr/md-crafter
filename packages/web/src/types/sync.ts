/**
 * Sync error types
 */
export interface SyncConflict {
  serverContent: string;
  serverEtag: string;
  serverTimestamp: number;
}

export interface SyncError {
  conflict?: SyncConflict;
  error?: string;
}

