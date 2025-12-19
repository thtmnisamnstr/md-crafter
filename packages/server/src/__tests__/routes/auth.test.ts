import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { authRouter } from '../../routes/auth.js';

// Mock the database helpers
vi.mock('../../db/setup.js', () => ({
  dbHelpers: {
    findUserByEmail: vi.fn(),
    findUserByToken: vi.fn(),
    createUser: vi.fn(),
  },
}));

// Mock shared package
vi.mock('@md-crafter/shared', () => ({
  generateApiToken: vi.fn(() => 'test-api-token-123'),
  DEFAULT_USER_SETTINGS: { theme: 'dark', fontSize: 14 },
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { dbHelpers } from '../../db/setup.js';

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  describe('POST /auth/token', () => {
    it('should create a new user and return token', async () => {
      vi.mocked(dbHelpers.findUserByEmail).mockResolvedValue(undefined);
      vi.mocked(dbHelpers.createUser).mockResolvedValue({ id: 'user-123', email: '', api_token: '', settings_json: '{}', token_expires_at: null, created_at: '', updated_at: '' });

      const response = await request(app)
        .post('/auth/token')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('apiToken', 'test-api-token-123');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('message');
      expect(dbHelpers.createUser).toHaveBeenCalledOnce();
    });

    it('should create user without email', async () => {
      vi.mocked(dbHelpers.createUser).mockResolvedValue({ id: 'user-123', email: null, api_token: '', settings_json: '{}', token_expires_at: null, created_at: '', updated_at: '' });

      const response = await request(app)
        .post('/auth/token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('apiToken');
    });

    it('should reject duplicate email', async () => {
      vi.mocked(dbHelpers.findUserByEmail).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
        api_token: 'existing-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/auth/token')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should handle database errors', async () => {
      vi.mocked(dbHelpers.findUserByEmail).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/auth/token')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate token');
    });
  });

  describe('POST /auth/validate', () => {
    it('should validate a valid token', async () => {
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
        .post('/auth/validate')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('userId', 'user-123');
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });

    it('should reject invalid token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/validate')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('valid', false);
    });

    it('should require token', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token required');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user info with Bearer token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'valid-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'user-123');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('createdAt', '2024-01-01T00:00:00Z');
    });

    it('should support token without Bearer prefix', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'valid-token',
        settings_json: '{}',
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'user-123');
    });

    it('should require authorization header', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authorization required');
    });

    it('should reject invalid token', async () => {
      vi.mocked(dbHelpers.findUserByToken).mockResolvedValue(undefined);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });
});

