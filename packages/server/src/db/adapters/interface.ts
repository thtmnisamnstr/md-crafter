/**
 * Database adapter interface
 * Provides a common interface for different database backends
 */

export interface User {
  id: string;
  email: string | null;
  api_token: string;
  settings_json: string;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  language: string;
  etag: string;
  is_cloud_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: string;
  version_number: number;
  created_at: string;
}

/**
 * Row data type for database queries
 * Represents a row returned from a database query
 */
export type RowData = Record<string, unknown>;

export interface DatabaseAdapter {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Users
  findUserByToken(token: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;

  // Documents
  findDocumentsByUserId(userId: string): Promise<Document[]>;
  findDocumentById(id: string): Promise<Document | null>;
  createDocument(doc: Document): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | null>;
  deleteDocument(id: string): Promise<boolean>;
  searchDocuments(userId: string, query: string): Promise<Document[]>;

  // Versions
  findVersionsByDocumentId(documentId: string): Promise<DocumentVersion[]>;
  findVersionById(id: string): Promise<DocumentVersion | null>;
  createVersion(version: DocumentVersion): Promise<DocumentVersion>;
  getMaxVersionNumber(documentId: string): Promise<number>;
  cleanupOldVersions(documentId: string, maxVersions: number): Promise<void>;
}

