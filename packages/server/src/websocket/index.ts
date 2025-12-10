import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@md-crafter/shared';
import { dbHelpers } from '../db/setup.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  apiToken?: string;
}

export function setupWebSocket(io: SocketIOServer): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const user = await dbHelpers.findUserByToken(token as string);
      
      if (!user) {
        return next(new Error('Invalid token'));
      }
      
      socket.userId = user.id;
      socket.apiToken = token as string;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('User connected', { userId: socket.userId });
    
    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Subscribe to document changes
    socket.on('document:subscribe', async (documentId: string) => {
      try {
        const document = await dbHelpers.findDocumentById(documentId);
        
        if (document && document.user_id === socket.userId) {
          socket.join(`doc:${documentId}`);
          socket.emit('document:subscribed', { documentId });
          logger.info('User subscribed to document', { userId: socket.userId, documentId });
        } else {
          socket.emit('error', { message: 'Document not found or access denied' });
        }
      } catch (error) {
        logger.error('Subscribe error', error);
        socket.emit('error', { message: 'Failed to subscribe to document' });
      }
    });

    // Unsubscribe from document
    socket.on('document:unsubscribe', (documentId: string) => {
      socket.leave(`doc:${documentId}`);
      socket.emit('document:unsubscribed', { documentId });
      logger.info('User unsubscribed from document', { userId: socket.userId, documentId });
    });

    // Handle cursor position updates (for future collaboration)
    socket.on('cursor:update', (data: { documentId: string; position: { line: number; column: number } }) => {
      socket.to(`doc:${data.documentId}`).emit('cursor:updated', {
        userId: socket.userId,
        position: data.position,
      });
    });

    // Handle selection updates
    socket.on('selection:update', (data: {
      documentId: string;
      selection: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    }) => {
      socket.to(`doc:${data.documentId}`).emit('selection:updated', {
        userId: socket.userId,
        selection: data.selection,
      });
    });

    // Handle presence (user activity)
    socket.on('presence:update', (data: { documentId: string; status: 'active' | 'idle' }) => {
      socket.to(`doc:${data.documentId}`).emit('presence:updated', {
        userId: socket.userId,
        status: data.status,
      });
    });

    // Ping/pong for keepalive
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      logger.info('User disconnected', { userId: socket.userId });
      // Notify all rooms this user was in
      socket.rooms.forEach((room) => {
        if (room.startsWith('doc:')) {
          socket.to(room).emit('presence:left', { userId: socket.userId });
        }
      });
    });

    socket.on('error', (error) => {
      logger.error('Socket error', error, { userId: socket.userId });
    });
  });
}
