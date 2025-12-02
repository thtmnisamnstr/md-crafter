/**
 * SQLite adapter using sql.js (WebAssembly SQLite)
 * Works in Node.js and browsers without native dependencies
 */

import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import type { DatabaseAdapter, User, Document, DocumentVersion } from './interface.js';

export class SqliteAdapter implements DatabaseAdapter {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private saveInterval: NodeJS.Timeout | null = null;
  private isDirty = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    try {
      // Try to load existing database
      const dir = dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        const fileBuffer = await fs.readFile(this.dbPath);
        this.db = new SQL.Database(fileBuffer) as SqlJsDatabase;
        console.log('Loaded existing SQLite database from:', this.dbPath);
      } catch {
        // File doesn't exist, create new database
        this.db = new SQL.Database() as SqlJsDatabase;
        console.log('Created new SQLite database');
      }
    } catch {
      // Create in-memory database as fallback
      const SQL2 = await initSqlJs();
      this.db = new SQL2.Database() as SqlJsDatabase;
      console.log('Created in-memory SQLite database');
    }

    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        api_token TEXT UNIQUE NOT NULL,
        settings_json TEXT DEFAULT '{}',
        token_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT DEFAULT 'markdown',
        etag TEXT,
        is_cloud_synced INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        content TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )
    `);

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_users_token ON users(api_token)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_versions_document_id ON document_versions(document_id)`);

    // Auto-save every 5 seconds if dirty
    this.saveInterval = setInterval(() => {
      if (this.isDirty) {
        this.persistToFile().catch(console.error);
      }
    }, 5000);

    // Initial save
    await this.persistToFile();
    console.log('SQLite database initialized at:', this.dbPath);
  }

  private async persistToFile(): Promise<void> {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      await fs.writeFile(this.dbPath, buffer);
      this.isDirty = false;
    } catch (error) {
      console.error('Failed to persist database:', error);
    }
  }

  private markDirty(): void {
    this.isDirty = true;
  }

  async close(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    if (this.db) {
      await this.persistToFile();
      this.db.close();
      this.db = null;
    }
  }

  // Users
  async findUserByToken(token: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec('SELECT * FROM users WHERE api_token = ?', [token]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.rowToUser(result[0].columns, result[0].values[0]);
  }

  async findUserById(id: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec('SELECT * FROM users WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.rowToUser(result[0].columns, result[0].values[0]);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec('SELECT * FROM users WHERE email = ?', [email]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.rowToUser(result[0].columns, result[0].values[0]);
  }

  async createUser(user: User): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT INTO users (id, email, api_token, settings_json, token_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.api_token, user.settings_json, user.token_expires_at, user.created_at, user.updated_at]
    );
    this.markDirty();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    const existing = await this.findUserById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.db.run(
      `UPDATE users SET email = ?, api_token = ?, settings_json = ?, token_expires_at = ?, updated_at = ?
       WHERE id = ?`,
      [updated.email, updated.api_token, updated.settings_json, updated.token_expires_at, updated.updated_at, id]
    );
    this.markDirty();
    return updated;
  }

  // Documents
  async findDocumentsByUserId(userId: string): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec('SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
    if (result.length === 0) return [];
    return result[0].values.map(row => this.rowToDocument(result[0].columns, row));
  }

  async findDocumentById(id: string): Promise<Document | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec('SELECT * FROM documents WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.rowToDocument(result[0].columns, result[0].values[0]);
  }

  async createDocument(doc: Document): Promise<Document> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT INTO documents (id, user_id, title, content, language, etag, is_cloud_synced, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.user_id, doc.title, doc.content, doc.language, doc.etag, doc.is_cloud_synced ? 1 : 0, doc.created_at, doc.updated_at]
    );
    this.markDirty();
    return doc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    if (!this.db) throw new Error('Database not initialized');
    const existing = await this.findDocumentById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.db.run(
      `UPDATE documents SET title = ?, content = ?, language = ?, etag = ?, is_cloud_synced = ?, updated_at = ?
       WHERE id = ?`,
      [updated.title, updated.content, updated.language, updated.etag, updated.is_cloud_synced ? 1 : 0, updated.updated_at, id]
    );
    this.markDirty();
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    const existing = await this.findDocumentById(id);
    if (!existing) return false;

    this.db.run('DELETE FROM document_versions WHERE document_id = ?', [id]);
    this.db.run('DELETE FROM documents WHERE id = ?', [id]);
    this.markDirty();
    return true;
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');
    const searchPattern = `%${query}%`;
    const result = this.db.exec(
      `SELECT * FROM documents WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC`,
      [userId, searchPattern, searchPattern]
    );
    if (result.length === 0) return [];
    return result[0].values.map(row => this.rowToDocument(result[0].columns, row));
  }

  // Versions
  async findVersionsByDocumentId(documentId: string): Promise<DocumentVersion[]> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec(
      'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC',
      [documentId]
    );
    if (result.length === 0) return [];
    return result[0].values.map(row => this.rowToVersion(result[0].columns, row));
  }

  async findVersionById(id: string): Promise<DocumentVersion | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec('SELECT * FROM document_versions WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.rowToVersion(result[0].columns, result[0].values[0]);
  }

  async createVersion(version: DocumentVersion): Promise<DocumentVersion> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT INTO document_versions (id, document_id, content, version_number, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [version.id, version.document_id, version.content, version.version_number, version.created_at]
    );
    this.markDirty();
    return version;
  }

  async getMaxVersionNumber(documentId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec(
      'SELECT MAX(version_number) as max_version FROM document_versions WHERE document_id = ?',
      [documentId]
    );
    if (result.length === 0 || result[0].values.length === 0) return 0;
    return (result[0].values[0][0] as number) || 0;
  }

  async cleanupOldVersions(documentId: string, maxVersions: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const versions = await this.findVersionsByDocumentId(documentId);
    if (versions.length <= maxVersions) return;

    const toDelete = versions.slice(maxVersions);
    for (const version of toDelete) {
      this.db.run('DELETE FROM document_versions WHERE id = ?', [version.id]);
    }
    this.markDirty();
  }

  // Helper methods
  private rowToUser(columns: string[], values: unknown[]): User {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = values[i]; });
    return {
      id: obj.id as string,
      email: obj.email as string | null,
      api_token: obj.api_token as string,
      settings_json: obj.settings_json as string,
      token_expires_at: obj.token_expires_at as string | null,
      created_at: obj.created_at as string,
      updated_at: obj.updated_at as string,
    };
  }

  private rowToDocument(columns: string[], values: unknown[]): Document {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = values[i]; });
    return {
      id: obj.id as string,
      user_id: obj.user_id as string,
      title: obj.title as string,
      content: obj.content as string,
      language: obj.language as string,
      etag: obj.etag as string,
      is_cloud_synced: Boolean(obj.is_cloud_synced),
      created_at: obj.created_at as string,
      updated_at: obj.updated_at as string,
    };
  }

  private rowToVersion(columns: string[], values: unknown[]): DocumentVersion {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = values[i]; });
    return {
      id: obj.id as string,
      document_id: obj.document_id as string,
      content: obj.content as string,
      version_number: obj.version_number as number,
      created_at: obj.created_at as string,
    };
  }
}

