import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { 
  errorHandler, 
  createError, 
  notFound, 
  badRequest, 
  unauthorized, 
  forbidden, 
  conflict,
} from '../../middleware/error.js';

// Mock shared package
vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Error Middleware', () => {
  describe('errorHandler', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      
      // Route that throws different errors
      app.get('/error/:type', (req: Request, _res: Response, next: NextFunction) => {
        const type = req.params.type;
        switch (type) {
          case 'notfound':
            next(notFound('Resource not found'));
            break;
          case 'badrequest':
            next(badRequest('Invalid input'));
            break;
          case 'unauthorized':
            next(unauthorized('Not authenticated'));
            break;
          case 'forbidden':
            next(forbidden('Access denied'));
            break;
          case 'conflict':
            next(conflict('Resource conflict'));
            break;
          case 'custom':
            next(createError('Custom error', 418, 'TEAPOT'));
            break;
          case 'generic':
            next(new Error('Generic error'));
            break;
          default:
            next(new Error('Unknown'));
        }
      });
      
      app.use(errorHandler);
    });

    it('should handle 404 not found errors', async () => {
      const response = await request(app).get('/error/notfound');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Resource not found',
        code: 'NOT_FOUND',
      });
    });

    it('should handle 400 bad request errors', async () => {
      const response = await request(app).get('/error/badrequest');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid input',
        code: 'BAD_REQUEST',
      });
    });

    it('should handle 401 unauthorized errors', async () => {
      const response = await request(app).get('/error/unauthorized');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Not authenticated',
        code: 'UNAUTHORIZED',
      });
    });

    it('should handle 403 forbidden errors', async () => {
      const response = await request(app).get('/error/forbidden');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
    });

    it('should handle 409 conflict errors', async () => {
      const response = await request(app).get('/error/conflict');

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        error: 'Resource conflict',
        code: 'CONFLICT',
      });
    });

    it('should handle custom errors with status code', async () => {
      const response = await request(app).get('/error/custom');

      expect(response.status).toBe(418);
      expect(response.body).toMatchObject({
        error: 'Custom error',
        code: 'TEAPOT',
      });
    });

    it('should default to 500 for generic errors', async () => {
      const response = await request(app).get('/error/generic');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Generic error');
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app).get('/error/generic');

      expect(response.body).toHaveProperty('stack');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/error/generic');

      expect(response.body).not.toHaveProperty('stack');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error factory functions', () => {
    it('should create error with createError', () => {
      const error = createError('Test error', 500, 'TEST_CODE');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_CODE');
    });

    it('should create error with default status code', () => {
      const error = createError('Default error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
    });

    it('should create notFound error', () => {
      const error = notFound('Item not found');

      expect(error.message).toBe('Item not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create notFound error with default message', () => {
      const error = notFound();

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create badRequest error', () => {
      const error = badRequest('Invalid data');

      expect(error.message).toBe('Invalid data');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should create badRequest error with default message', () => {
      const error = badRequest();

      expect(error.message).toBe('Bad request');
    });

    it('should create unauthorized error', () => {
      const error = unauthorized('Login required');

      expect(error.message).toBe('Login required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create forbidden error', () => {
      const error = forbidden('No access');

      expect(error.message).toBe('No access');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create conflict error', () => {
      const error = conflict('Version mismatch');

      expect(error.message).toBe('Version mismatch');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
});

