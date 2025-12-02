export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  etag: string;
  isCloudSynced: boolean;
  localPath?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  createdAt: Date;
  versionNumber: number;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  language: string;
  updatedAt: Date;
  isCloudSynced: boolean;
  syncStatus: SyncStatusType;
}

export type SyncStatusType = 'synced' | 'syncing' | 'pending' | 'conflict' | 'offline' | 'local';

export interface CreateDocumentRequest {
  title: string;
  content: string;
  language?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  language?: string;
  etag: string; // Required for conflict detection
}

export interface DocumentSyncRequest {
  content: string;
  etag: string;
  localTimestamp: number;
}

export interface DocumentSyncResponse {
  success: boolean;
  document?: Document;
  conflict?: {
    serverContent: string;
    serverEtag: string;
    serverTimestamp: number;
  };
}

