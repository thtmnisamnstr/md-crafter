import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupWebSocket } from '../../websocket/index.js';

// Mock dbHelpers
vi.mock('../../db/setup.js', () => ({
  dbHelpers: {
    findUserByToken: vi.fn(),
    findDocumentById: vi.fn(),
  },
}));

import { dbHelpers } from '../../db/setup.js';

describe('WebSocket Setup', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let clientSocket: ClientSocket | null = null;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a new HTTP server and Socket.IO instance for each test
    httpServer = createServer();
    io = new SocketIOServer(httpServer);
    
    // Setup WebSocket handlers
    setupWebSocket(io);
    
    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        port = typeof address === 'object' && address ? address.port : 3001;
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Cleanup client socket
    if (clientSocket) {
      clientSocket.disconnect();
      clientSocket = null;
    }
    
    // Cleanup server
    io.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject connection without token', async () => {
      await new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          autoConnect: false,
        });
        
        clientSocket.on('connect_error', (error) => {
          expect(error.message).toBe('Authentication required');
          resolve();
        });
        
        clientSocket.on('connect', () => {
          reject(new Error('Should not connect without token'));
        });
        
        clientSocket.connect();
        
        // Timeout after 2 seconds
        setTimeout(() => resolve(), 2000);
      });
    });

    it('should reject connection with invalid token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue(undefined);
      
      await new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: 'invalid-token' },
          autoConnect: false,
        });
        
        clientSocket.on('connect_error', (error) => {
          expect(error.message).toBe('Invalid token');
          resolve();
        });
        
        clientSocket.on('connect', () => {
          reject(new Error('Should not connect with invalid token'));
        });
        
        clientSocket.connect();
        
        // Timeout after 2 seconds
        setTimeout(() => resolve(), 2000);
      });
    });

    it('should accept connection with valid token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        api_token: 'valid-token',
        email: 'test@example.com',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: 'valid-token' },
          autoConnect: false,
        });
        
        clientSocket.on('connect', () => {
          expect(clientSocket!.connected).toBe(true);
          resolve();
        });
        
        clientSocket.on('connect_error', (error) => {
          reject(error);
        });
        
        clientSocket.connect();
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });
  });

  describe('Document Subscription', () => {
    beforeEach(async () => {
      // Set up authenticated connection
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        api_token: 'valid-token',
        email: 'test@example.com',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: 'valid-token' },
          autoConnect: false,
        });
        
        clientSocket.on('connect', () => resolve());
        clientSocket.on('connect_error', reject);
        clientSocket.connect();
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should allow subscribing to owned document', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-123',
        user_id: 'user-123',
        title: 'Test Document',
        content: 'Test content',
        language: 'markdown',
        etag: 'etag-123',
        is_cloud_synced: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket!.on('document:subscribed', (data) => {
          expect(data.documentId).toBe('doc-123');
          resolve();
        });
        
        clientSocket!.on('error', (data) => {
          reject(new Error(data.message));
        });
        
        clientSocket!.emit('document:subscribe', 'doc-123');
        
        setTimeout(() => reject(new Error('Subscription timeout')), 3000);
      });
    });

    it('should reject subscribing to non-owned document', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue({
        id: 'doc-123',
        user_id: 'other-user',
        title: 'Test Document',
        content: 'Test content',
        language: 'markdown',
        etag: 'etag-123',
        is_cloud_synced: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket!.on('error', (data) => {
          expect(data.message).toBe('Document not found or access denied');
          resolve();
        });
        
        clientSocket!.on('document:subscribed', () => {
          reject(new Error('Should not allow subscription to non-owned doc'));
        });
        
        clientSocket!.emit('document:subscribe', 'doc-123');
        
        setTimeout(() => reject(new Error('Error timeout')), 3000);
      });
    });

    it('should reject subscribing to non-existent document', async () => {
      vi.mocked(dbHelpers.findDocumentById).mockResolvedValue(undefined);
      
      await new Promise<void>((resolve, reject) => {
        clientSocket!.on('error', (data) => {
          expect(data.message).toBe('Document not found or access denied');
          resolve();
        });
        
        clientSocket!.emit('document:subscribe', 'non-existent');
        
        setTimeout(() => reject(new Error('Error timeout')), 3000);
      });
    });

    it('should allow unsubscribing from document', async () => {
      await new Promise<void>((resolve, reject) => {
        clientSocket!.on('document:unsubscribed', (data) => {
          expect(data.documentId).toBe('doc-123');
          resolve();
        });
        
        clientSocket!.emit('document:unsubscribe', 'doc-123');
        
        setTimeout(() => reject(new Error('Unsubscribe timeout')), 3000);
      });
    });
  });

  describe('Ping/Pong', () => {
    beforeEach(async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        api_token: 'valid-token',
        email: 'test@example.com',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: 'valid-token' },
          autoConnect: false,
        });
        
        clientSocket.on('connect', () => resolve());
        clientSocket.on('connect_error', reject);
        clientSocket.connect();
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should respond to ping with pong', async () => {
      await new Promise<void>((resolve, reject) => {
        clientSocket!.on('pong', () => {
          resolve();
        });
        
        clientSocket!.emit('ping');
        
        setTimeout(() => reject(new Error('Pong timeout')), 3000);
      });
    });
  });

  describe('Cursor and Selection Updates', () => {
    beforeEach(async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        api_token: 'valid-token',
        email: 'test@example.com',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token: 'valid-token' },
          autoConnect: false,
        });
        
        clientSocket.on('connect', () => resolve());
        clientSocket.on('connect_error', reject);
        clientSocket.connect();
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should emit cursor update event', async () => {
      // Cursor updates are broadcast to others in the room, not the sender
      // Just verify the event is accepted without error
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(), 500);
        
        clientSocket!.on('error', (data) => {
          clearTimeout(timeoutId);
          reject(new Error(data.message));
        });
        
        clientSocket!.emit('cursor:update', {
          documentId: 'doc-123',
          position: { line: 10, column: 5 },
        });
      });
    });

    it('should emit selection update event', async () => {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(), 500);
        
        clientSocket!.on('error', (data) => {
          clearTimeout(timeoutId);
          reject(new Error(data.message));
        });
        
        clientSocket!.emit('selection:update', {
          documentId: 'doc-123',
          selection: {
            startLine: 1,
            startColumn: 1,
            endLine: 5,
            endColumn: 10,
          },
        });
      });
    });

    it('should emit presence update event', async () => {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(), 500);
        
        clientSocket!.on('error', (data) => {
          clearTimeout(timeoutId);
          reject(new Error(data.message));
        });
        
        clientSocket!.emit('presence:update', {
          documentId: 'doc-123',
          status: 'active',
        });
      });
    });
  });
});

