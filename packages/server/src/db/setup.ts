/**
 * Database setup and initialization
 * Uses the factory to create the appropriate adapter
 */

import { logger } from '@md-crafter/shared';
import { createDatabase } from './factory.js';
import type { DatabaseAdapter, User, Document, DocumentVersion } from './adapters/interface.js';

// Re-export types for convenience
export type { User, Document, DocumentVersion, DatabaseAdapter };

let db: DatabaseAdapter | null = null;

/**
 * Initialize the database
 * Creates tables and returns the adapter
 */
export async function setupDatabase(): Promise<DatabaseAdapter> {
  if (db) return db;

  db = await createDatabase();
  await db.initialize();
  
  logger.info('Database initialized');
  return db;
}

/**
 * Get the database adapter
 * Throws if not initialized
 */
export function getDatabase(): DatabaseAdapter {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * Database helper functions
 * Provides a simplified API for common operations
 */
export const dbHelpers = {
  // Users
  async findUserByToken(token: string): Promise<User | undefined> {
    const result = await getDatabase().findUserByToken(token);
    return result ?? undefined;
  },

  async findUserById(id: string): Promise<User | undefined> {
    const result = await getDatabase().findUserById(id);
    return result ?? undefined;
  },

  async findUserByEmail(email: string): Promise<User | undefined> {
    const result = await getDatabase().findUserByEmail(email);
    return result ?? undefined;
  },

  async createUser(user: User): Promise<User> {
    return getDatabase().createUser(user);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await getDatabase().updateUser(id, updates);
    return result ?? undefined;
  },

  // Documents
  async findDocumentsByUserId(userId: string): Promise<Document[]> {
    return getDatabase().findDocumentsByUserId(userId);
  },

  async findDocumentById(id: string): Promise<Document | undefined> {
    const result = await getDatabase().findDocumentById(id);
    return result ?? undefined;
  },

  async createDocument(doc: Document): Promise<Document> {
    return getDatabase().createDocument(doc);
  },

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const result = await getDatabase().updateDocument(id, updates);
    return result ?? undefined;
  },

  async deleteDocument(id: string): Promise<boolean> {
    return getDatabase().deleteDocument(id);
  },

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    return getDatabase().searchDocuments(userId, query);
  },

  // Document Versions
  async findVersionsByDocumentId(documentId: string): Promise<DocumentVersion[]> {
    return getDatabase().findVersionsByDocumentId(documentId);
  },

  async findVersionById(id: string): Promise<DocumentVersion | undefined> {
    const result = await getDatabase().findVersionById(id);
    return result ?? undefined;
  },

  async createVersion(version: DocumentVersion): Promise<DocumentVersion> {
    return getDatabase().createVersion(version);
  },

  async getMaxVersionNumber(documentId: string): Promise<number> {
    return getDatabase().getMaxVersionNumber(documentId);
  },

  async cleanupOldVersions(documentId: string, maxVersions: number): Promise<void> {
    return getDatabase().cleanupOldVersions(documentId, maxVersions);
  },
};
