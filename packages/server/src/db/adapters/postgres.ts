/**
 * PostgreSQL adapter
 * Uses the pg library for PostgreSQL connections
 */

import { Pool } from 'pg';
import { logger } from '@md-crafter/shared';
import type { DatabaseAdapter, User, Document, DocumentVersion, RowData } from './interface.js';

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool | null = null;
  private connectionUrl: string;

  constructor(connectionUrl: string) {
    this.connectionUrl = connectionUrl;
  }

  private ensurePool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  async initialize(): Promise<void> {
    // Dynamic import to avoid requiring pg when not used
    const pg = await import('pg');
    this.pool = new pg.default.Pool({ connectionString: this.connectionUrl });

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      logger.info('Connected to PostgreSQL');

      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          api_token TEXT UNIQUE NOT NULL,
          settings_json TEXT DEFAULT '{}',
          token_expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          language TEXT DEFAULT 'markdown',
          etag TEXT,
          is_cloud_synced BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS document_versions (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        )
      `);

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_token ON users(api_token)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_versions_document_id ON document_versions(document_id)`);
      
      // Full-text search index (ignore errors if extension not available)
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_documents_search 
          ON documents USING gin(to_tsvector('english', title || ' ' || content))
        `);
      } catch {
        logger.warn('Full-text search index not created (may require pg_trgm extension)');
      }

      logger.info('PostgreSQL database initialized');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  // Users
  async findUserByToken(token: string): Promise<User | null> {
    const pool = this.ensurePool();
    const result = await pool.query('SELECT * FROM users WHERE api_token = $1', [token]);
    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const pool = this.ensurePool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const pool = this.ensurePool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  async createUser(user: User): Promise<User> {
    const pool = this.ensurePool();
    await pool.query(
      `INSERT INTO users (id, email, api_token, settings_json, token_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.email, user.api_token, user.settings_json, user.token_expires_at, user.created_at, user.updated_at]
    );
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findUserById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    const pool = this.ensurePool();
    await pool.query(
      `UPDATE users SET email = $1, api_token = $2, settings_json = $3, token_expires_at = $4, updated_at = $5
       WHERE id = $6`,
      [updated.email, updated.api_token, updated.settings_json, updated.token_expires_at, updated.updated_at, id]
    );
    return updated;
  }

  // Documents
  async findDocumentsByUserId(userId: string): Promise<Document[]> {
    const pool = this.ensurePool();
    const result = await pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows.map((row: RowData) => this.rowToDocument(row));
  }

  async findDocumentById(id: string): Promise<Document | null> {
    const pool = this.ensurePool();
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0] ? this.rowToDocument(result.rows[0]) : null;
  }

  async createDocument(doc: Document): Promise<Document> {
    const pool = this.ensurePool();
    await pool.query(
      `INSERT INTO documents (id, user_id, title, content, language, etag, is_cloud_synced, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [doc.id, doc.user_id, doc.title, doc.content, doc.language, doc.etag, doc.is_cloud_synced, doc.created_at, doc.updated_at]
    );
    return doc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    const existing = await this.findDocumentById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    const pool = this.ensurePool();
    await pool.query(
      `UPDATE documents SET title = $1, content = $2, language = $3, etag = $4, is_cloud_synced = $5, updated_at = $6
       WHERE id = $7`,
      [updated.title, updated.content, updated.language, updated.etag, updated.is_cloud_synced, updated.updated_at, id]
    );
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const pool = this.ensurePool();
    const result = await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    // Use PostgreSQL full-text search with fallback to ILIKE
    const pool = this.ensurePool();
    const result = await pool.query(
      `SELECT * FROM documents 
       WHERE user_id = $1 
       AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY updated_at DESC`,
      [userId, `%${query}%`]
    );
    return result.rows.map((row: RowData) => this.rowToDocument(row));
  }

  // Versions
  async findVersionsByDocumentId(documentId: string): Promise<DocumentVersion[]> {
    const pool = this.ensurePool();
    const result = await pool.query(
      'SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC',
      [documentId]
    );
    return result.rows.map((row: RowData) => this.rowToVersion(row));
  }

  async findVersionById(id: string): Promise<DocumentVersion | null> {
    const pool = this.ensurePool();
    const result = await pool.query('SELECT * FROM document_versions WHERE id = $1', [id]);
    return result.rows[0] ? this.rowToVersion(result.rows[0]) : null;
  }

  async createVersion(version: DocumentVersion): Promise<DocumentVersion> {
    const pool = this.ensurePool();
    await pool.query(
      `INSERT INTO document_versions (id, document_id, content, version_number, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [version.id, version.document_id, version.content, version.version_number, version.created_at]
    );
    return version;
  }

  async getMaxVersionNumber(documentId: string): Promise<number> {
    const pool = this.ensurePool();
    const result = await pool.query(
      'SELECT MAX(version_number) as max_version FROM document_versions WHERE document_id = $1',
      [documentId]
    );
    return result.rows[0]?.max_version || 0;
  }

  async cleanupOldVersions(documentId: string, maxVersions: number): Promise<void> {
    const pool = this.ensurePool();
    await pool.query(
      `DELETE FROM document_versions 
       WHERE document_id = $1 
       AND id NOT IN (
         SELECT id FROM document_versions 
         WHERE document_id = $1 
         ORDER BY version_number DESC 
         LIMIT $2
       )`,
      [documentId, maxVersions]
    );
  }

  // Helper methods
  private rowToUser(row: RowData): User {
    return {
      id: String(row.id),
      email: row.email ? String(row.email) : null,
      api_token: String(row.api_token),
      settings_json: String(row.settings_json || '{}'),
      token_expires_at: row.token_expires_at ? new Date(String(row.token_expires_at)).toISOString() : null,
      created_at: new Date(String(row.created_at)).toISOString(),
      updated_at: new Date(String(row.updated_at)).toISOString(),
    };
  }

  private rowToDocument(row: RowData): Document {
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      title: String(row.title),
      content: String(row.content),
      language: String(row.language || 'markdown'),
      etag: String(row.etag || ''),
      is_cloud_synced: Boolean(row.is_cloud_synced),
      created_at: new Date(String(row.created_at)).toISOString(),
      updated_at: new Date(String(row.updated_at)).toISOString(),
    };
  }

  private rowToVersion(row: RowData): DocumentVersion {
    return {
      id: String(row.id),
      document_id: String(row.document_id),
      content: String(row.content),
      version_number: Number(row.version_number),
      created_at: new Date(String(row.created_at)).toISOString(),
    };
  }
}
