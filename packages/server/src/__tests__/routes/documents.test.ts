import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { documentsRouter } from '../../routes/documents.js';
import { errorHandler } from '../../middleware/error.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// Mock database helpers
vi.mock('../../db/setup.js', () => ({
  dbHelpers: {
    findDocumentsByUserId: vi.fn(),
    findDocumentById: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    createVersion: vi.fn(),
    findVersionsByDocumentId: vi.fn(),
    findVersionById: vi.fn(),
    getMaxVersionNumber: vi.fn(),
    cleanupOldVersions: vi.fn(),
  },
}));

// Mock shared package
vi.mock('@md-crafter/shared', () => ({
  generateHash: vi.fn((content: string) => `hash-${content.substring(0, 10)}`),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { dbHelpers } from '../../db/setup.js';

// Helper to add mock user to request
const mockAuthMiddleware = (req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) => {
  req.user = { id: 'user-123', email: 'test@example.com', apiToken: 'token-123' };
  next();
};

describe('Documents Routes', () => {
  let app: Express;
  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.set('io', mockIo);
    app.use('/documents', mockAuthMiddleware, documentsRouter);
    app.use(errorHandler);
  });

  describe('GET /documents', () => {
    it('should return user documents sorted by updated_at', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          user_id: 'user-123',
          title: 'First Doc',
          content: 'Content 1',
          language: 'markdown',
          etag: 'etag-1',
          is_cloud_synced: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'doc-2',
          user_id: 'user-123',
          title: 'Second Doc',
          content: 'Content 2',
          language: 'markdown',
          etag: 'etag-2',
          is_cloud_synced: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
      ];
      vi.mocked(dbHelpers.findDocumentsByUserId).mockResolvedValue(mockDocs);

      const response = await request(app).get('/documents');

      expect(response.status).toBe(200);
      expect(response.body.documents).toHaveLength(2);
      // Should be sorted by updated_at descending
      expect(response.body.documents[0].id).toBe('doc-2');
      expect(response.body.documents[1].id).toBe('doc-1');
    });

    it('should return empty array when no documents', async () => {
      vi.mocked(dbHelpers.findDocumentsByUserId).mockResolvedValue([]);

      const response = await request(app).get('/documents');

      expect(response.status).toBe(200);
      expect(response.body.documents).toEqual([]);
    });
  });

  describe('GET /documents/:id', () => {
    it('should return a specific document', async () => {
      const mockDoc = {
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Test Doc',
        content: 'Hello world',
        language: 'markdown',
        etag: 'etag-1',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(mockDoc);

      const response = await request(app).get('/documents/doc-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'doc-1',
        title: 'Test Doc',
        content: 'Hello world',
      });
    });

    it('should return 404 for non-existent document', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(undefined);

      const response = await request(app).get('/documents/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Document not found');
    });

    it('should return 404 for document owned by another user', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-1',
        user_id: 'other-user',
        title: 'Other Doc',
        content: '',
        language: 'markdown',
        etag: 'etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app).get('/documents/doc-1');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /documents', () => {
    it('should create a new document', async () => {
      vi.mocked(dbHelpers.createDocument).mockResolvedValue({ id: 'doc-1', user_id: 'user-123', title: 'New Doc', content: '', language: 'markdown', etag: '', is_cloud_synced: true, created_at: '', updated_at: '' });
      vi.mocked(dbHelpers.createVersion).mockResolvedValue({ id: 'v1', document_id: 'doc-1', content: '', version_number: 1, created_at: '' });

      const response = await request(app)
        .post('/documents')
        .send({ title: 'New Doc', content: 'Hello', language: 'markdown' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'New Doc',
        content: 'Hello',
        language: 'markdown',
        isCloudSynced: true,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('etag');
      expect(dbHelpers.createDocument).toHaveBeenCalledOnce();
      expect(dbHelpers.createVersion).toHaveBeenCalledOnce();
    });

    it('should create document with defaults', async () => {
      vi.mocked(dbHelpers.createDocument).mockResolvedValue({ id: 'doc-1', user_id: 'user-123', title: 'Minimal Doc', content: '', language: 'plaintext', etag: '', is_cloud_synced: true, created_at: '', updated_at: '' });
      vi.mocked(dbHelpers.createVersion).mockResolvedValue({ id: 'v1', document_id: 'doc-1', content: '', version_number: 1, created_at: '' });

      const response = await request(app)
        .post('/documents')
        .send({ title: 'Minimal Doc' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Minimal Doc',
        content: '',
        language: 'plaintext',
      });
    });

    it('should require title', async () => {
      const response = await request(app)
        .post('/documents')
        .send({ content: 'No title' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title required');
    });
  });

  describe('PUT /documents/:id', () => {
    it('should update document content', async () => {
      const existingDoc = {
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Original',
        content: 'Original content',
        language: 'markdown',
        etag: 'old-etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(existingDoc);
      vi.mocked(dbHelpers.updateDocument).mockResolvedValue({
        ...existingDoc,
        content: 'Updated content',
        etag: 'new-etag',
      });
      vi.mocked(dbHelpers.getMaxVersionNumber).mockResolvedValue(1);
      vi.mocked(dbHelpers.createVersion).mockResolvedValue({ id: 'v1', document_id: 'doc-1', content: '', version_number: 1, created_at: '' });
      vi.mocked(dbHelpers.cleanupOldVersions).mockResolvedValue();

      const response = await request(app)
        .put('/documents/doc-1')
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(dbHelpers.updateDocument).toHaveBeenCalledWith('doc-1', expect.objectContaining({
        content: 'Updated content',
      }));
    });

    it('should detect conflicts with mismatched etag', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Content',
        language: 'markdown',
        etag: 'current-etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app)
        .put('/documents/doc-1')
        .send({ content: 'New content', etag: 'wrong-etag' });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should notify clients via websocket on update', async () => {
      const existingDoc = {
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Content',
        language: 'markdown',
        etag: 'etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(existingDoc);
      vi.mocked(dbHelpers.updateDocument).mockResolvedValue(existingDoc);
      vi.mocked(dbHelpers.getMaxVersionNumber).mockResolvedValue(1);
      vi.mocked(dbHelpers.createVersion).mockResolvedValue({ id: 'v1', document_id: 'doc-1', content: '', version_number: 1, created_at: '' });
      vi.mocked(dbHelpers.cleanupOldVersions).mockResolvedValue();

      await request(app)
        .put('/documents/doc-1')
        .send({ content: 'Updated' });

      expect(mockIo.to).toHaveBeenCalledWith('doc:doc-1');
      expect(mockIo.emit).toHaveBeenCalledWith('document:updated', expect.objectContaining({
        documentId: 'doc-1',
      }));
    });
  });

  describe('DELETE /documents/:id', () => {
    it('should delete a document', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Content',
        language: 'markdown',
        etag: 'etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(dbHelpers.deleteDocument).mockResolvedValue(true);

      const response = await request(app).delete('/documents/doc-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(dbHelpers.deleteDocument).toHaveBeenCalledWith('doc-1');
    });

    it('should return 404 for non-existent document', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(undefined);

      const response = await request(app).delete('/documents/non-existent');

      expect(response.status).toBe(404);
    });

    it('should notify clients via websocket on delete', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Content',
        language: 'markdown',
        etag: 'etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(dbHelpers.deleteDocument).mockResolvedValue(true);

      await request(app).delete('/documents/doc-1');

      expect(mockIo.to).toHaveBeenCalledWith('doc:doc-1');
      expect(mockIo.emit).toHaveBeenCalledWith('document:deleted', {
        documentId: 'doc-1',
      });
    });
  });

  describe('GET /documents/:id/versions', () => {
    it('should return document versions', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Content',
        language: 'markdown',
        etag: 'etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(dbHelpers.findVersionsByDocumentId).mockResolvedValue([
        { id: 'v1', document_id: 'doc-1', content: 'v1', version_number: 1, created_at: '2024-01-01T00:00:00Z' },
        { id: 'v2', document_id: 'doc-1', content: 'v2', version_number: 2, created_at: '2024-01-02T00:00:00Z' },
      ]);

      const response = await request(app).get('/documents/doc-1/versions');

      expect(response.status).toBe(200);
      expect(response.body.versions).toHaveLength(2);
      expect(response.body.versions[0]).toHaveProperty('versionNumber', 1);
    });
  });

  describe('POST /documents/:id/sync', () => {
    it('should sync document when no conflict', async () => {
      const existingDoc = {
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Old content',
        language: 'markdown',
        etag: 'current-etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(existingDoc);
      vi.mocked(dbHelpers.updateDocument).mockResolvedValue(undefined);
      vi.mocked(dbHelpers.getMaxVersionNumber).mockResolvedValue(1);
      vi.mocked(dbHelpers.createVersion).mockResolvedValue({ id: 'v1', document_id: 'doc-1', content: '', version_number: 1, created_at: '' });
      vi.mocked(dbHelpers.cleanupOldVersions).mockResolvedValue();

      const response = await request(app)
        .post('/documents/doc-1/sync')
        .send({ content: 'New content', etag: 'current-etag' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.document).toHaveProperty('content', 'New content');
    });

    it('should return conflict info when etags mismatch', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-1',
        user_id: 'user-123',
        title: 'Doc',
        content: 'Server content',
        language: 'markdown',
        etag: 'server-etag',
        is_cloud_synced: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      });

      const response = await request(app)
        .post('/documents/doc-1/sync')
        .send({ content: 'Client content', etag: 'client-etag' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.conflict).toMatchObject({
        serverContent: 'Server content',
        serverEtag: 'server-etag',
      });
    });
  });
});

