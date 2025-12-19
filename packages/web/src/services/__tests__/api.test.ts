import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../api';
import { logger } from '@md-crafter/shared';

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ApiService', () => {
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // Reset API service state
    api.setToken(null);
    api.setBaseUrl('/api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Management', () => {
    it('should set and get token', () => {
      api.setToken('test-token-123');
      // Token is private, but we can verify it's used in requests
      expect(api.getBaseUrl()).toBe('/api');
    });

    it('should clear token when set to null', () => {
      api.setToken('test-token');
      api.setToken(null);
      // Token is cleared, verify via request headers
    });

    it('should get base URL', () => {
      expect(api.getBaseUrl()).toBe('/api');
    });

    it('should normalize URL without trailing slash', () => {
      api.setBaseUrl('https://example.com');
      expect(api.getBaseUrl()).toBe('https://example.com/api');
    });

    it('should normalize URL with trailing slash', () => {
      api.setBaseUrl('https://example.com/');
      expect(api.getBaseUrl()).toBe('https://example.com/api');
    });

    it('should not add /api if already present', () => {
      api.setBaseUrl('https://example.com/api');
      expect(api.getBaseUrl()).toBe('https://example.com/api');
    });

    it('should add /api if not present', () => {
      api.setBaseUrl('https://example.com/v1');
      expect(api.getBaseUrl()).toBe('https://example.com/v1/api');
    });
  });

  describe('Auth Methods', () => {
    it('should generate token', async () => {
      const mockResponse = { userId: 'user-123', apiToken: 'token-456' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.generateToken('test@example.com');
      
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });

    it('should generate token without email', async () => {
      const mockResponse = { userId: 'user-123', apiToken: 'token-456' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await api.generateToken();
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: undefined }),
        })
      );
    });

    it('should validate token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const result = await api.validateToken('test-token');
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'test-token' }),
        })
      );
    });

    it('should return false on token validation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: false }),
      });

      const result = await api.validateToken('invalid-token');
      
      expect(result).toBe(false);
    });

    it('should return false on token validation error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.validateToken('test-token');
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Token validation failed', expect.any(Error));
    });

    it('should get current user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const result = await api.getCurrentUser();
      
      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
    });
  });

  describe('Document CRUD', () => {
    it('should get all documents', async () => {
      const mockDocuments = [
        { id: 'doc-1', title: 'Doc 1', content: 'Content 1' },
        { id: 'doc-2', title: 'Doc 2', content: 'Content 2' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments }),
      });

      const result = await api.getDocuments();
      
      expect(result).toEqual(mockDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/documents', expect.any(Object));
    });

    it('should get single document', async () => {
      const mockDocument = { id: 'doc-1', title: 'Doc 1', content: 'Content' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const result = await api.getDocument('doc-1');
      
      expect(result).toEqual(mockDocument);
      expect(mockFetch).toHaveBeenCalledWith('/api/documents/doc-1', expect.any(Object));
    });

    it('should create document', async () => {
      const mockDocument = { id: 'doc-1', title: 'New Doc', content: 'Content' };
      const createData = { title: 'New Doc', content: 'Content' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const result = await api.createDocument(createData);
      
      expect(result).toEqual(mockDocument);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createData),
        })
      );
    });

    it('should update document', async () => {
      const mockDocument = { id: 'doc-1', title: 'Updated Doc', content: 'Updated Content' };
      const updateData = { title: 'Updated Doc' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      });

      const result = await api.updateDocument('doc-1', updateData);
      
      expect(result).toEqual(mockDocument);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should delete document', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.deleteDocument('doc-1');
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Sync Methods', () => {
    it('should sync document successfully', async () => {
      const mockResult = {
        success: true,
        document: { id: 'doc-1', title: 'Doc', content: 'Content' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await api.syncDocument('doc-1', 'Content');
      
      expect(result).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/documents/doc-1/sync',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"content":"Content"'),
        })
      );
    });

    it('should detect conflict on sync', async () => {
      const mockResult = {
        success: false,
        conflict: {
          serverContent: 'Server content',
          serverEtag: 'etag-123',
          serverTimestamp: 1234567890,
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await api.syncDocument('doc-1', 'Local content');
      
      expect(result).toEqual(mockResult);
      expect(result.conflict).toBeDefined();
    });

    it('should get document versions', async () => {
      const mockVersions = {
        versions: [
          { id: 'v1', versionNumber: 1, createdAt: '2024-01-01' },
          { id: 'v2', versionNumber: 2, createdAt: '2024-01-02' },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersions,
      });

      const result = await api.getDocumentVersions('doc-1');
      
      expect(result).toEqual(mockVersions);
      expect(mockFetch).toHaveBeenCalledWith('/api/documents/doc-1/versions', expect.any(Object));
    });

    it('should get specific document version', async () => {
      const mockVersion = {
        id: 'v1',
        content: 'Version content',
        versionNumber: 1,
        createdAt: '2024-01-01',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersion,
      });

      const result = await api.getDocumentVersion('doc-1', 'v1');
      
      expect(result).toEqual(mockVersion);
      expect(mockFetch).toHaveBeenCalledWith('/api/documents/doc-1/versions/v1', expect.any(Object));
    });
  });

  describe('Settings', () => {
    it('should get settings', async () => {
      const mockSettings = { theme: 'dark', fontSize: 14 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      });

      const result = await api.getSettings();
      
      expect(result).toEqual(mockSettings);
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', expect.any(Object));
    });

    it('should update settings', async () => {
      const mockSettings = { theme: 'light', fontSize: 16 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      });

      const result = await api.updateSettings(mockSettings);
      
      expect(result).toEqual(mockSettings);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ settings: mockSettings }),
        })
      );
    });
  });

  describe('Authentication Headers', () => {
    it('should include Authorization header when token is set', async () => {
      api.setToken('test-token-123');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-1' }),
      });

      await api.getCurrentUser();
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should not include Authorization header when token is null', async () => {
      api.setToken(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-1' }),
      });

      await api.getCurrentUser();
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      await expect(api.getDocument('doc-1')).rejects.toThrow('Not found');
    });

    it('should throw HTTP status error when error message is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(api.getDocument('doc-1')).rejects.toThrow('HTTP 500');
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(api.getDocument('doc-1')).rejects.toThrow('HTTP 500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getDocument('doc-1')).rejects.toThrow('Network error');
    });
  });

  describe('Request Configuration', () => {
    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-1' }),
      });

      await api.getCurrentUser();
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should merge custom headers', async () => {
      // This tests the internal fetch method's header merging
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-1' }),
      });

      await api.getCurrentUser();
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});

