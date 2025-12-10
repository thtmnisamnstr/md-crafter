import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, generateHash } from '@md-crafter/shared';
import { dbHelpers, Document } from '../db/setup.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { notFound, conflict } from '../middleware/error.js';
import { Server as SocketIOServer } from 'socket.io';

export const documentsRouter = Router();

const MAX_VERSIONS = parseInt(process.env.MAX_DOCUMENT_VERSIONS || '50', 10);

// Get all documents for current user
documentsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documents = await dbHelpers.findDocumentsByUserId(req.user!.id);
    
    // Sort by updated_at descending
    documents.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    // Return only metadata
    const metadata = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      language: doc.language,
      etag: doc.etag,
      isCloudSynced: doc.is_cloud_synced,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));
    
    res.json({ documents: metadata });
  } catch (error) {
    logger.error('Get documents error', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Get a specific document
documentsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const document = await dbHelpers.findDocumentById(req.params.id);
    
    if (!document || document.user_id !== req.user!.id) {
      return next(notFound('Document not found'));
    }
    
    res.json({
      id: document.id,
      title: document.title,
      content: document.content,
      language: document.language,
      etag: document.etag,
      isCloudSynced: document.is_cloud_synced,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    });
  } catch (error) {
    logger.error('Get document error', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Create a new document
documentsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, language } = req.body;
    
    if (!title) {
      res.status(400).json({ error: 'Title required' });
      return;
    }
    
    const id = uuidv4();
    const etag = generateHash(content || '');
    const now = new Date().toISOString();
    
    const document: Document = {
      id,
      user_id: req.user!.id,
      title,
      content: content || '',
      language: language || 'plaintext',
      etag,
      is_cloud_synced: true,
      created_at: now,
      updated_at: now,
    };
    
    await dbHelpers.createDocument(document);
    
    // Create initial version
    await dbHelpers.createVersion({
      id: uuidv4(),
      document_id: id,
      content: content || '',
      version_number: 1,
      created_at: now,
    });
    
    res.status(201).json({
      id,
      title,
      content: content || '',
      language: language || 'plaintext',
      etag,
      isCloudSynced: true,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    logger.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update a document
documentsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { title, content, language, etag: clientEtag } = req.body;
    
    const document = await dbHelpers.findDocumentById(req.params.id);
    
    if (!document || document.user_id !== req.user!.id) {
      return next(notFound('Document not found'));
    }
    
    // Check for conflicts if etag provided
    if (clientEtag && clientEtag !== document.etag) {
      return next(conflict('Document has been modified. Please refresh and try again.'));
    }
    
    const newEtag = content !== undefined ? generateHash(content) : document.etag;
    const now = new Date().toISOString();
    
    const updates: Partial<Document> = {
      updated_at: now,
      etag: newEtag,
    };
    
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (language !== undefined) updates.language = language;
    
    const updated = await dbHelpers.updateDocument(req.params.id, updates);
    
    // Create new version if content changed
    if (content !== undefined && content !== document.content) {
      const maxVersion = await dbHelpers.getMaxVersionNumber(req.params.id);
      await dbHelpers.createVersion({
        id: uuidv4(),
        document_id: req.params.id,
        content,
        version_number: maxVersion + 1,
        created_at: now,
      });
      await dbHelpers.cleanupOldVersions(req.params.id, MAX_VERSIONS);
    }
    
    // Notify connected clients
    const io: SocketIOServer = req.app.get('io');
    io.to(`doc:${req.params.id}`).emit('document:updated', {
      documentId: req.params.id,
      etag: newEtag,
      updatedAt: now,
      userId: req.user!.id,
    });
    
    res.json({
      id: updated!.id,
      title: updated!.title,
      content: updated!.content,
      language: updated!.language,
      etag: updated!.etag,
      isCloudSynced: updated!.is_cloud_synced,
      createdAt: updated!.created_at,
      updatedAt: updated!.updated_at,
    });
  } catch (error) {
    logger.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Sync a document (with conflict detection)
documentsRouter.post('/:id/sync', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { content, etag: clientEtag } = req.body;
    
    const document = await dbHelpers.findDocumentById(req.params.id);
    
    if (!document || document.user_id !== req.user!.id) {
      return next(notFound('Document not found'));
    }
    
    // Check for conflicts
    if (clientEtag && clientEtag !== document.etag) {
      // Conflict detected
      res.json({
        success: false,
        conflict: {
          serverContent: document.content,
          serverEtag: document.etag,
          serverTimestamp: new Date(document.updated_at).getTime(),
        },
      });
      return;
    }
    
    // No conflict, update document
    const newEtag = generateHash(content);
    const now = new Date().toISOString();
    
    await dbHelpers.updateDocument(req.params.id, {
      content,
      etag: newEtag,
      updated_at: now,
    });
    
    // Create new version
    const maxVersion = await dbHelpers.getMaxVersionNumber(req.params.id);
    await dbHelpers.createVersion({
      id: uuidv4(),
      document_id: req.params.id,
      content,
      version_number: maxVersion + 1,
      created_at: now,
    });
    await dbHelpers.cleanupOldVersions(req.params.id, MAX_VERSIONS);
    
    // Notify other clients
    const io: SocketIOServer = req.app.get('io');
    io.to(`doc:${req.params.id}`).emit('document:updated', {
      documentId: req.params.id,
      etag: newEtag,
      updatedAt: now,
      userId: req.user!.id,
    });
    
    res.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        content,
        language: document.language,
        etag: newEtag,
        isCloudSynced: true,
        createdAt: document.created_at,
        updatedAt: now,
      },
    });
  } catch (error) {
    logger.error('Sync document error:', error);
    res.status(500).json({ error: 'Failed to sync document' });
  }
});

// Get document versions
documentsRouter.get('/:id/versions', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const document = await dbHelpers.findDocumentById(req.params.id);
    
    if (!document || document.user_id !== req.user!.id) {
      return next(notFound('Document not found'));
    }
    
    const versions = await dbHelpers.findVersionsByDocumentId(req.params.id);
    
    res.json({
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        createdAt: v.created_at,
      })),
    });
  } catch (error) {
    logger.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

// Get a specific version's content
documentsRouter.get('/:id/versions/:versionId', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const document = await dbHelpers.findDocumentById(req.params.id);
    
    if (!document || document.user_id !== req.user!.id) {
      return next(notFound('Document not found'));
    }
    
    const version = await dbHelpers.findVersionById(req.params.versionId);
    
    if (!version || version.document_id !== req.params.id) {
      return next(notFound('Version not found'));
    }
    
    res.json({
      id: version.id,
      documentId: version.document_id,
      content: version.content,
      versionNumber: version.version_number,
      createdAt: version.created_at,
    });
  } catch (error) {
    logger.error('Get version error:', error);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

// Delete a document
documentsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const document = await dbHelpers.findDocumentById(req.params.id);
    
    if (!document || document.user_id !== req.user!.id) {
      return next(notFound('Document not found'));
    }
    
    await dbHelpers.deleteDocument(req.params.id);
    
    // Notify clients
    const io: SocketIOServer = req.app.get('io');
    io.to(`doc:${req.params.id}`).emit('document:deleted', {
      documentId: req.params.id,
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});
