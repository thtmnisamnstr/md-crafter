/**
 * MySQL adapter
 * Uses mysql2 library for MySQL connections
 */

import type { DatabaseAdapter, User, Document, DocumentVersion } from './interface.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MySQLPool = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowData = Record<string, any>;

export class MysqlAdapter implements DatabaseAdapter {
  private pool: MySQLPool = null;
  private connectionUrl: string;

  constructor(connectionUrl: string) {
    this.connectionUrl = connectionUrl;
  }

  async initialize(): Promise<void> {
    const mysql = await import('mysql2/promise');
    this.pool = mysql.createPool(this.connectionUrl);

    const connection = await this.pool.getConnection();
    try {
      await connection.query('SELECT 1');
      console.log('Connected to MySQL');

      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255),
          api_token VARCHAR(255) UNIQUE NOT NULL,
          settings_json TEXT,
          token_expires_at DATETIME,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          INDEX idx_users_token (api_token),
          INDEX idx_users_email (email)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content LONGTEXT NOT NULL,
          language VARCHAR(50) DEFAULT 'markdown',
          etag VARCHAR(255),
          is_cloud_synced BOOLEAN DEFAULT true,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          INDEX idx_documents_user_id (user_id),
          INDEX idx_documents_updated_at (updated_at),
          FULLTEXT INDEX idx_documents_search (title, content)
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS document_versions (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          content LONGTEXT NOT NULL,
          version_number INT NOT NULL,
          created_at DATETIME NOT NULL,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
          INDEX idx_versions_document_id (document_id)
        )
      `);

      console.log('MySQL database initialized');
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async findUserByToken(token: string): Promise<User | null> {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE api_token = ?', [token]);
    const row = (rows as RowData[])[0];
    return row ? this.rowToUser(row) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const row = (rows as RowData[])[0];
    return row ? this.rowToUser(row) : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const row = (rows as RowData[])[0];
    return row ? this.rowToUser(row) : null;
  }

  async createUser(user: User): Promise<User> {
    await this.pool.query(
      `INSERT INTO users (id, email, api_token, settings_json, token_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.api_token, user.settings_json, user.token_expires_at, user.created_at, user.updated_at]
    );
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findUserById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    await this.pool.query(
      `UPDATE users SET email = ?, api_token = ?, settings_json = ?, token_expires_at = ?, updated_at = ? WHERE id = ?`,
      [updated.email, updated.api_token, updated.settings_json, updated.token_expires_at, updated.updated_at, id]
    );
    return updated;
  }

  async findDocumentsByUserId(userId: string): Promise<Document[]> {
    const [rows] = await this.pool.query(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    return (rows as RowData[]).map(row => this.rowToDocument(row));
  }

  async findDocumentById(id: string): Promise<Document | null> {
    const [rows] = await this.pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    const row = (rows as RowData[])[0];
    return row ? this.rowToDocument(row) : null;
  }

  async createDocument(doc: Document): Promise<Document> {
    await this.pool.query(
      `INSERT INTO documents (id, user_id, title, content, language, etag, is_cloud_synced, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.user_id, doc.title, doc.content, doc.language, doc.etag, doc.is_cloud_synced, doc.created_at, doc.updated_at]
    );
    return doc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    const existing = await this.findDocumentById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    await this.pool.query(
      `UPDATE documents SET title = ?, content = ?, language = ?, etag = ?, is_cloud_synced = ?, updated_at = ? WHERE id = ?`,
      [updated.title, updated.content, updated.language, updated.etag, updated.is_cloud_synced, updated.updated_at, id]
    );
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const [result] = await this.pool.query('DELETE FROM documents WHERE id = ?', [id]);
    return ((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    try {
      const [rows] = await this.pool.query(
        `SELECT * FROM documents WHERE user_id = ? AND MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE) ORDER BY updated_at DESC`,
        [userId, query]
      );
      return (rows as RowData[]).map(row => this.rowToDocument(row));
    } catch {
      const [rows] = await this.pool.query(
        `SELECT * FROM documents WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC`,
        [userId, `%${query}%`, `%${query}%`]
      );
      return (rows as RowData[]).map(row => this.rowToDocument(row));
    }
  }

  async findVersionsByDocumentId(documentId: string): Promise<DocumentVersion[]> {
    const [rows] = await this.pool.query(
      'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC',
      [documentId]
    );
    return (rows as RowData[]).map(row => this.rowToVersion(row));
  }

  async findVersionById(id: string): Promise<DocumentVersion | null> {
    const [rows] = await this.pool.query('SELECT * FROM document_versions WHERE id = ?', [id]);
    const row = (rows as RowData[])[0];
    return row ? this.rowToVersion(row) : null;
  }

  async createVersion(version: DocumentVersion): Promise<DocumentVersion> {
    await this.pool.query(
      `INSERT INTO document_versions (id, document_id, content, version_number, created_at) VALUES (?, ?, ?, ?, ?)`,
      [version.id, version.document_id, version.content, version.version_number, version.created_at]
    );
    return version;
  }

  async getMaxVersionNumber(documentId: string): Promise<number> {
    const [rows] = await this.pool.query(
      'SELECT MAX(version_number) as max_version FROM document_versions WHERE document_id = ?',
      [documentId]
    );
    const row = (rows as RowData[])[0];
    return (row?.max_version as number) || 0;
  }

  async cleanupOldVersions(documentId: string, maxVersions: number): Promise<void> {
    await this.pool.query(
      `DELETE FROM document_versions WHERE document_id = ? AND id NOT IN (
         SELECT id FROM (SELECT id FROM document_versions WHERE document_id = ? ORDER BY version_number DESC LIMIT ?) AS keep
       )`,
      [documentId, documentId, maxVersions]
    );
  }

  private rowToUser(row: RowData): User {
    return {
      id: String(row.id),
      email: row.email ? String(row.email) : null,
      api_token: String(row.api_token),
      settings_json: String(row.settings_json || '{}'),
      token_expires_at: row.token_expires_at ? new Date(row.token_expires_at).toISOString() : null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
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
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private rowToVersion(row: RowData): DocumentVersion {
    return {
      id: String(row.id),
      document_id: String(row.document_id),
      content: String(row.content),
      version_number: Number(row.version_number),
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}
