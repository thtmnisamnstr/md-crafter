import { StateCreator } from 'zustand';
import { logger } from '@md-crafter/shared';
import { AppState } from './types';
import { api } from '../services/api';
import { syncService } from '../services/sync';

export interface AuthSlice {
  apiToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  
  // Auth actions
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  generateToken: (email?: string) => Promise<string | null>;
}

/**
 * Creates the auth slice for managing authentication state and operations
 * 
 * Handles user authentication via API tokens, including login, logout, and token
 * generation. Populates userId from API responses for future multitenant support.
 * 
 * @param set - Zustand state setter function
 * @param get - Zustand state getter function
 * @returns AuthSlice with auth state and actions
 */
export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => {
  return {
  apiToken: null,
  userId: null,
  isAuthenticated: false,
  
  /**
   * Authenticates a user with an API token
   * 
   * Validates the token, fetches user information to populate userId, connects
   * the sync service, and loads cloud documents. If user info fetch fails, still
   * allows login but logs the error for debugging.
   * 
   * @param token - The API token to authenticate with
   * @returns Promise resolving to true if login successful, false otherwise
   */
  login: async (token) => {
    const valid = await api.validateToken(token);
    if (valid) {
      api.setToken(token);
      
      // Fetch user info to populate userId
      try {
        const user = await api.getCurrentUser();
        set({ 
          apiToken: token, 
          userId: user.id,
          isAuthenticated: true, 
          showAuth: false 
        });
      } catch (error) {
        // If getCurrentUser fails, still allow login but log error
        logger.error('Failed to fetch user info', error);
        set({ 
          apiToken: token, 
          userId: null, // Will be populated on next successful call
          isAuthenticated: true, 
          showAuth: false 
        });
      }
      
      syncService.connect(token);
      await get().loadCloudDocuments();
      get().addToast({ type: 'success', message: 'Logged in successfully' });
      return true;
    }
    get().addToast({ type: 'error', message: 'Invalid API token' });
    return false;
  },
  
  logout: () => {
    api.setToken(null);
    syncService.disconnect();
    set({
      apiToken: null,
      userId: null,
      isAuthenticated: false,
      cloudDocuments: [],
    });
    get().addToast({ type: 'info', message: 'Logged out' });
  },
  
  generateToken: async (email) => {
    try {
      const result = await api.generateToken(email);
      // Set userId from response (for future multitenant support)
      set({ userId: result.userId });
      get().addToast({
        type: 'success',
        message: 'Token generated! Save it securely.',
      });
      return result.apiToken;
    } catch (error) {
      logger.error('Failed to generate token', error);
      get().addToast({ type: 'error', message: 'Failed to generate token' });
      return null;
    }
  },
  };
};

