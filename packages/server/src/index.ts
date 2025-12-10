import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '@md-crafter/shared';
import { setupDatabase } from './db/setup.js';
import { authRouter } from './routes/auth.js';
import { documentsRouter } from './routes/documents.js';
import { settingsRouter } from './routes/settings.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { setupWebSocket } from './websocket/index.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '0.0.0-pre' });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/documents', authMiddleware, documentsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

// Error handling
app.use(errorHandler);

// WebSocket setup
setupWebSocket(io);

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Initialize database
    await setupDatabase();
    logger.info('Database initialized');

    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info('WebSocket server ready');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();

