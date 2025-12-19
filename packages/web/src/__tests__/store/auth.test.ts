import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthSlice, AuthSlice } from '../../store/auth';
import { AppState } from '../../store/types';

// Mock the api module
vi.mock('../../services/api', () => ({
  api: {
    validateToken: vi.fn(),
    setToken: vi.fn(),
    getCurrentUser: vi.fn(),
    generateToken: vi.fn(),
  },
}));

// Mock the sync service
vi.mock('../../services/sync', () => ({
  syncService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

// Import mocked modules
import { api } from '../../services/api';
import { syncService } from '../../services/sync';

// Create mock state
const createMockState = (overrides: Partial<AppState> = {}): AppState => ({
  apiToken: null,
  userId: null,
  isAuthenticated: false,
  showAuth: false,
  cloudDocuments: [],
  addToast: vi.fn(),
  loadCloudDocuments: vi.fn(),
  ...overrides,
} as unknown as AppState);

describe('Auth Slice', () => {
  let slice: AuthSlice;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockState: AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createMockState();
    mockSet = vi.fn();
    mockGet = vi.fn(() => mockState);
    slice = createAuthSlice(mockSet, mockGet, {} as any);
  });

  describe('Initial State', () => {
    it('should have null apiToken', () => {
      expect(slice.apiToken).toBeNull();
    });

    it('should have null userId', () => {
      expect(slice.userId).toBeNull();
    });

    it('should not be authenticated', () => {
      expect(slice.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully with valid token', async () => {
      vi.mocked(api.validateToken).mockResolvedValue(true);
      vi.mocked(api.getCurrentUser).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      const result = await slice.login('valid-token');

      expect(result).toBe(true);
      expect(api.validateToken).toHaveBeenCalledWith('valid-token');
      expect(api.setToken).toHaveBeenCalledWith('valid-token');
      expect(api.getCurrentUser).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        apiToken: 'valid-token',
        userId: 'user-123',
        isAuthenticated: true,
        showAuth: false,
      });
      expect(syncService.connect).toHaveBeenCalledWith('valid-token');
      expect(mockState.loadCloudDocuments).toHaveBeenCalled();
      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Logged in successfully',
      });
    });

    it('should login with null userId if getCurrentUser fails', async () => {
      vi.mocked(api.validateToken).mockResolvedValue(true);
      vi.mocked(api.getCurrentUser).mockRejectedValue(new Error('User not found'));

      const result = await slice.login('valid-token');

      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith({
        apiToken: 'valid-token',
        userId: null,
        isAuthenticated: true,
        showAuth: false,
      });
    });

    it('should fail login with invalid token', async () => {
      vi.mocked(api.validateToken).mockResolvedValue(false);

      const result = await slice.login('invalid-token');

      expect(result).toBe(false);
      expect(api.setToken).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Invalid API token',
      });
    });

    it('should connect sync service after successful login', async () => {
      vi.mocked(api.validateToken).mockResolvedValue(true);
      vi.mocked(api.getCurrentUser).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      await slice.login('valid-token');

      expect(syncService.connect).toHaveBeenCalledWith('valid-token');
    });

    it('should load cloud documents after successful login', async () => {
      vi.mocked(api.validateToken).mockResolvedValue(true);
      vi.mocked(api.getCurrentUser).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

      await slice.login('valid-token');

      expect(mockState.loadCloudDocuments).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockState = createMockState({
        apiToken: 'existing-token',
        userId: 'user-123',
        isAuthenticated: true,
        cloudDocuments: [{ id: 'doc-1' }] as any,
      });
      mockGet.mockReturnValue(mockState);
      slice = createAuthSlice(mockSet, mockGet, {} as any);
    });

    it('should clear auth state on logout', () => {
      slice.logout();

      expect(api.setToken).toHaveBeenCalledWith(null);
      expect(mockSet).toHaveBeenCalledWith({
        apiToken: null,
        userId: null,
        isAuthenticated: false,
        cloudDocuments: [],
      });
    });

    it('should disconnect sync service', () => {
      slice.logout();

      expect(syncService.disconnect).toHaveBeenCalled();
    });

    it('should show logout toast', () => {
      slice.logout();

      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Logged out',
      });
    });
  });

  describe('generateToken', () => {
    it('should generate token successfully', async () => {
      vi.mocked(api.generateToken).mockResolvedValue({
        apiToken: 'new-token-123',
        userId: 'user-456',
      });

      const result = await slice.generateToken('test@example.com');

      expect(result).toBe('new-token-123');
      expect(api.generateToken).toHaveBeenCalledWith('test@example.com');
      expect(mockSet).toHaveBeenCalledWith({ userId: 'user-456' });
      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Token generated! Save it securely.',
      });
    });

    it('should generate token without email', async () => {
      vi.mocked(api.generateToken).mockResolvedValue({
        apiToken: 'new-token-123',
        userId: 'user-456',
      });

      await slice.generateToken();

      expect(api.generateToken).toHaveBeenCalledWith(undefined);
    });

    it('should return null and show error on failure', async () => {
      vi.mocked(api.generateToken).mockRejectedValue(new Error('Server error'));

      const result = await slice.generateToken('test@example.com');

      expect(result).toBeNull();
      expect(mockState.addToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to generate token',
      });
    });

    it('should set userId from response', async () => {
      vi.mocked(api.generateToken).mockResolvedValue({
        apiToken: 'new-token',
        userId: 'generated-user-id',
      });

      await slice.generateToken();

      expect(mockSet).toHaveBeenCalledWith({ userId: 'generated-user-id' });
    });
  });
});

