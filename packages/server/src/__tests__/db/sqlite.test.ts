import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteAdapter } from '../../db/adapters/sqlite.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SqliteAdapter', () => {
  let adapter: SqliteAdapter;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a unique test database path
    testDbPath = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    adapter = new SqliteAdapter(testDbPath);
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.close();
    // Clean up test database file
    try {
      await fs.unlink(testDbPath);
    } catch {
      // File may not exist, ignore
    }
  });

  describe('User Operations', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      api_token: 'test-token-123',
      settings_json: '{"theme":"dark"}',
      token_expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should create a user', async () => {
      const user = await adapter.createUser(testUser);
      
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.api_token).toBe('test-token-123');
    });

    it('should find user by token', async () => {
      await adapter.createUser(testUser);
      
      const user = await adapter.findUserByToken('test-token-123');
      
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent token', async () => {
      const user = await adapter.findUserByToken('non-existent');
      
      expect(user).toBeNull();
    });

    it('should find user by id', async () => {
      await adapter.createUser(testUser);
      
      const user = await adapter.findUserById('user-123');
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should find user by email', async () => {
      await adapter.createUser(testUser);
      
      const user = await adapter.findUserByEmail('test@example.com');
      
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-123');
    });

    it('should update user', async () => {
      await adapter.createUser(testUser);
      
      const updated = await adapter.updateUser('user-123', {
        email: 'newemail@example.com',
      });
      
      expect(updated?.email).toBe('newemail@example.com');
      expect(updated?.api_token).toBe('test-token-123'); // Unchanged
    });

    it('should return null when updating non-existent user', async () => {
      const updated = await adapter.updateUser('non-existent', {
        email: 'new@example.com',
      });
      
      expect(updated).toBeNull();
    });
  });

  describe('Document Operations', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      api_token: 'test-token-123',
      settings_json: '{}',
      token_expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const testDoc = {
      id: 'doc-123',
      user_id: 'user-123',
      title: 'Test Document',
      content: '# Hello World',
      language: 'markdown',
      etag: 'etag-123',
      is_cloud_synced: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(async () => {
      await adapter.createUser(testUser);
    });

    it('should create a document', async () => {
      const doc = await adapter.createDocument(testDoc);
      
      expect(doc.id).toBe('doc-123');
      expect(doc.title).toBe('Test Document');
      expect(doc.content).toBe('# Hello World');
    });

    it('should find document by id', async () => {
      await adapter.createDocument(testDoc);
      
      const doc = await adapter.findDocumentById('doc-123');
      
      expect(doc).not.toBeNull();
      expect(doc?.title).toBe('Test Document');
    });

    it('should return null for non-existent document', async () => {
      const doc = await adapter.findDocumentById('non-existent');
      
      expect(doc).toBeNull();
    });

    it('should find documents by user id', async () => {
      await adapter.createDocument(testDoc);
      await adapter.createDocument({
        ...testDoc,
        id: 'doc-456',
        title: 'Second Document',
      });
      
      const docs = await adapter.findDocumentsByUserId('user-123');
      
      expect(docs).toHaveLength(2);
    });

    it('should return empty array for user with no documents', async () => {
      const docs = await adapter.findDocumentsByUserId('user-456');
      
      expect(docs).toEqual([]);
    });

    it('should update document', async () => {
      await adapter.createDocument(testDoc);
      
      const updated = await adapter.updateDocument('doc-123', {
        title: 'Updated Title',
        content: '# Updated Content',
      });
      
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.content).toBe('# Updated Content');
      expect(updated?.language).toBe('markdown'); // Unchanged
    });

    it('should return null when updating non-existent document', async () => {
      const updated = await adapter.updateDocument('non-existent', {
        title: 'New Title',
      });
      
      expect(updated).toBeNull();
    });

    it('should delete document', async () => {
      await adapter.createDocument(testDoc);
      
      const result = await adapter.deleteDocument('doc-123');
      
      expect(result).toBe(true);
      
      const doc = await adapter.findDocumentById('doc-123');
      expect(doc).toBeNull();
    });

    it('should return false when deleting non-existent document', async () => {
      const result = await adapter.deleteDocument('non-existent');
      
      expect(result).toBe(false);
    });

    it('should search documents', async () => {
      await adapter.createDocument(testDoc);
      await adapter.createDocument({
        ...testDoc,
        id: 'doc-456',
        title: 'JavaScript Guide',
        content: 'Learn JavaScript',
      });
      
      const results = await adapter.searchDocuments('user-123', 'JavaScript');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Guide');
    });

    it('should search in both title and content', async () => {
      await adapter.createDocument({
        ...testDoc,
        content: 'This mentions javascript in the content',
      });
      
      const results = await adapter.searchDocuments('user-123', 'javascript');
      
      expect(results).toHaveLength(1);
    });
  });

  describe('Version Operations', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      api_token: 'test-token-123',
      settings_json: '{}',
      token_expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const testDoc = {
      id: 'doc-123',
      user_id: 'user-123',
      title: 'Test Document',
      content: '# Hello World',
      language: 'markdown',
      etag: 'etag-123',
      is_cloud_synced: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(async () => {
      await adapter.createUser(testUser);
      await adapter.createDocument(testDoc);
    });

    it('should create a version', async () => {
      const version = await adapter.createVersion({
        id: 'ver-123',
        document_id: 'doc-123',
        content: '# Version 1',
        version_number: 1,
        created_at: new Date().toISOString(),
      });
      
      expect(version.id).toBe('ver-123');
      expect(version.version_number).toBe(1);
    });

    it('should find versions by document id', async () => {
      await adapter.createVersion({
        id: 'ver-1',
        document_id: 'doc-123',
        content: '# V1',
        version_number: 1,
        created_at: new Date().toISOString(),
      });
      await adapter.createVersion({
        id: 'ver-2',
        document_id: 'doc-123',
        content: '# V2',
        version_number: 2,
        created_at: new Date().toISOString(),
      });
      
      const versions = await adapter.findVersionsByDocumentId('doc-123');
      
      expect(versions).toHaveLength(2);
      // Should be ordered by version_number DESC
      expect(versions[0].version_number).toBe(2);
      expect(versions[1].version_number).toBe(1);
    });

    it('should find version by id', async () => {
      await adapter.createVersion({
        id: 'ver-123',
        document_id: 'doc-123',
        content: '# Version 1',
        version_number: 1,
        created_at: new Date().toISOString(),
      });
      
      const version = await adapter.findVersionById('ver-123');
      
      expect(version).not.toBeNull();
      expect(version?.content).toBe('# Version 1');
    });

    it('should get max version number', async () => {
      await adapter.createVersion({
        id: 'ver-1',
        document_id: 'doc-123',
        content: '# V1',
        version_number: 1,
        created_at: new Date().toISOString(),
      });
      await adapter.createVersion({
        id: 'ver-2',
        document_id: 'doc-123',
        content: '# V2',
        version_number: 5,
        created_at: new Date().toISOString(),
      });
      
      const maxVersion = await adapter.getMaxVersionNumber('doc-123');
      
      expect(maxVersion).toBe(5);
    });

    it('should return 0 for document with no versions', async () => {
      const maxVersion = await adapter.getMaxVersionNumber('doc-123');
      
      expect(maxVersion).toBe(0);
    });

    it('should cleanup old versions', async () => {
      // Create 5 versions
      for (let i = 1; i <= 5; i++) {
        await adapter.createVersion({
          id: `ver-${i}`,
          document_id: 'doc-123',
          content: `# V${i}`,
          version_number: i,
          created_at: new Date().toISOString(),
        });
      }
      
      // Keep only 2 versions
      await adapter.cleanupOldVersions('doc-123', 2);
      
      const remaining = await adapter.findVersionsByDocumentId('doc-123');
      
      expect(remaining).toHaveLength(2);
      // Should keep the newest versions (5 and 4)
      expect(remaining[0].version_number).toBe(5);
      expect(remaining[1].version_number).toBe(4);
    });

    it('should delete versions when document is deleted', async () => {
      await adapter.createVersion({
        id: 'ver-1',
        document_id: 'doc-123',
        content: '# V1',
        version_number: 1,
        created_at: new Date().toISOString(),
      });
      
      await adapter.deleteDocument('doc-123');
      
      const versions = await adapter.findVersionsByDocumentId('doc-123');
      expect(versions).toHaveLength(0);
    });
  });

  describe('Persistence', () => {
    it('should persist data to file', async () => {
      // Create a user
      await adapter.createUser({
        id: 'persist-user',
        email: 'persist@example.com',
        api_token: 'persist-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      // Close and reopen
      await adapter.close();
      
      const newAdapter = new SqliteAdapter(testDbPath);
      await newAdapter.initialize();
      
      // Data should be persisted
      const user = await newAdapter.findUserByToken('persist-token');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('persist@example.com');
      
      await newAdapter.close();
    });
  });
});

