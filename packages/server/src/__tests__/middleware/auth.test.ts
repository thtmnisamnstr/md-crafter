import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../../middleware/auth.js';

// Mock database helpers
vi.mock('../../db/setup.js', () => ({
  dbHelpers: {
    findUserByToken: vi.fn(),
  },
}));

// Mock shared package
vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { dbHelpers } from '../../db/setup.js';

describe('Auth Middleware', () => {
  let app: Express;

  describe('authMiddleware', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      app = express();
      app.use(express.json());
      app.get('/protected', authMiddleware, (req: AuthenticatedRequest, res) => {
        res.json({ userId: req.user?.id, email: req.user?.email });
      });
    });

    it('should allow access with valid Bearer token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'valid-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should allow access with token without Bearer prefix', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        email: null,
        api_token: 'valid-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'valid-token');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user-123');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authorization header required');
    });

    it('should reject request with invalid token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid API token');
    });

    it('should reject request with empty Bearer token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      // Empty token after "Bearer " still gets looked up and returns invalid
      expect(response.body).toHaveProperty('error', 'Invalid API token');
    });

    it('should handle database errors', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });

    it('should set user info on request object', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-456',
        email: 'user@test.com',
        api_token: 'my-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer my-token');

      expect(response.body).toEqual({
        userId: 'user-456',
        email: 'user@test.com',
      });
    });
  });

  describe('optionalAuth', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      app = express();
      app.use(express.json());
      app.get('/optional', optionalAuth, (req: AuthenticatedRequest, res) => {
        res.json({ 
          authenticated: !!req.user,
          userId: req.user?.id || null,
        });
      });
    });

    it('should allow access without authorization header', async () => {
      const response = await request(app).get('/optional');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        authenticated: false,
        userId: null,
      });
    });

    it('should authenticate if valid token provided', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'valid-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        authenticated: true,
        userId: 'user-123',
      });
    });

    it('should reject if invalid token provided', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid API token');
    });
  });
});

