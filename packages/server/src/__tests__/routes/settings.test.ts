import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { settingsRouter } from '../../routes/settings.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// Mock database helpers
vi.mock('../../db/setup.js', () => ({
  dbHelpers: {
    findUserById: vi.fn(),
    updateUser: vi.fn(),
  },
}));

// Mock shared package
vi.mock('@md-crafter/shared', () => ({
  DEFAULT_USER_SETTINGS: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Monaco',
    wordWrap: true,
    autoSave: true,
    autoSaveDelay: 1000,
    lineNumbers: true,
    minimap: false,
  },
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { dbHelpers } from '../../db/setup.js';
import { DEFAULT_USER_SETTINGS } from '@md-crafter/shared';

// Helper to add mock user to request
const mockAuthMiddleware = (req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) => {
  req.user = { id: 'user-123', email: 'test@example.com', apiToken: 'token-123' };
  next();
};

describe('Settings Routes', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/settings', mockAuthMiddleware, settingsRouter);
  });

  describe('GET /settings', () => {
    it('should return user settings', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'token-123',
        settings_json: JSON.stringify({ theme: 'light', fontSize: 16 }),
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body.settings).toMatchObject({
        theme: 'light',
        fontSize: 16,
      });
    });

    it('should return default settings for new user', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'token-123',
        settings_json: '',
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body.settings).toEqual(DEFAULT_USER_SETTINGS);
    });

    it('should merge user settings with defaults', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'token-123',
        settings_json: JSON.stringify({ theme: 'light' }),
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body.settings.theme).toBe('light');
      expect(response.body.settings.fontSize).toBe(14); // Default
    });

    it('should handle invalid JSON in settings', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'token-123',
        settings_json: 'invalid json',
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app).get('/settings');

      expect(response.status).toBe(200);
      expect(response.body.settings).toEqual(DEFAULT_USER_SETTINGS);
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue(undefined);

      const response = await request(app).get('/settings');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('PUT /settings', () => {
    it('should update user settings', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'token-123',
        settings_json: JSON.stringify(DEFAULT_USER_SETTINGS),
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(dbHelpers.updateUser).mockResolvedValue({ id: 'user-123', email: '', api_token: '', settings_json: '{}', token_expires_at: null, created_at: '', updated_at: '' });

      const response = await request(app)
        .put('/settings')
        .send({ settings: { theme: 'light', fontSize: 18 } });

      expect(response.status).toBe(200);
      expect(response.body.settings).toMatchObject({
        theme: 'light',
        fontSize: 18,
      });
      expect(dbHelpers.updateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
        settings_json: expect.stringContaining('"theme":"light"'),
      }));
    });

    it('should require settings object', async () => {
      const response = await request(app)
        .put('/settings')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Settings object required');
    });

    it('should require settings to be an object', async () => {
      const response = await request(app)
        .put('/settings')
        .send({ settings: 'not an object' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Settings object required');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/settings')
        .send({ settings: { theme: 'light' } });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should merge with existing settings', async () => {
      vi.mocked(dbHelpers.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        api_token: 'token-123',
        settings_json: JSON.stringify({ ...DEFAULT_USER_SETTINGS, theme: 'light' }),
        token_expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(dbHelpers.updateUser).mockResolvedValue({ id: 'user-123', email: '', api_token: '', settings_json: '{}', token_expires_at: null, created_at: '', updated_at: '' });

      const response = await request(app)
        .put('/settings')
        .send({ settings: { fontSize: 18 } });

      expect(response.status).toBe(200);
      expect(response.body.settings.theme).toBe('light'); // Preserved
      expect(response.body.settings.fontSize).toBe(18); // Updated
    });
  });

  describe('POST /settings/reset', () => {
    it('should reset settings to defaults', async () => {
      vi.mocked(dbHelpers.updateUser).mockResolvedValue({ id: 'user-123', email: '', api_token: '', settings_json: '{}', token_expires_at: null, created_at: '', updated_at: '' });

      const response = await request(app)
        .post('/settings/reset');

      expect(response.status).toBe(200);
      expect(response.body.settings).toEqual(DEFAULT_USER_SETTINGS);
      expect(dbHelpers.updateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
        settings_json: JSON.stringify(DEFAULT_USER_SETTINGS),
      }));
    });

    it('should handle database errors', async () => {
      vi.mocked(dbHelpers.updateUser).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/settings/reset');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to reset settings');
    });
  });
});

