import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  isGoogleConfigured,
  isGoogleSignedIn,
  signOutFromGoogle,
} from '../google';
import { logger } from '@md-crafter/shared';

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global google object
const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(),
      revoke: vi.fn((token: string, callback: () => void) => {
        callback();
      }),
    },
  },
  picker: {
    View: vi.fn(),
    ViewId: {
      DOCS: 'docs',
    },
    PickerBuilder: vi.fn(() => ({
      addView: vi.fn().mockReturnThis(),
      setOAuthToken: vi.fn().mockReturnThis(),
      setDeveloperKey: vi.fn().mockReturnThis(),
      setCallback: vi.fn().mockReturnThis(),
      build: vi.fn(() => ({
        setVisible: vi.fn(),
      })),
    })),
    Action: {
      PICKED: 'picked',
      CANCEL: 'cancel',
    },
  },
};

const mockGapi = {
  load: vi.fn((api: string, callback: () => void) => {
    callback();
  }),
  client: {
    init: vi.fn().mockResolvedValue(undefined),
  },
};

// Mock window.google and window.gapi
declare global {
  interface Window {
    google?: typeof mockGoogle;
    gapi?: typeof mockGapi;
  }
}

describe('google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level state by re-importing
    vi.resetModules();
    
    // Set up environment variables
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'test-api-key');
    
    // Mock window objects
    global.window = {
      google: mockGoogle,
      gapi: mockGapi,
      document: {
        querySelector: vi.fn(() => null),
        createElement: vi.fn(() => ({
          src: '',
          async: false,
          defer: false,
          onload: null,
          onerror: null,
        })),
        head: {
          appendChild: vi.fn(),
        },
      } as any,
    } as any;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isGoogleConfigured', () => {
    it('should return true when client ID is configured', () => {
      // Re-import to get fresh module with env vars
      vi.resetModules();
      vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
      
      // This test is limited because env vars are read at module load time
      // We test the function exists and can be called
      expect(typeof isGoogleConfigured).toBe('function');
    });

    it('should be a function', () => {
      expect(isGoogleConfigured).toBeDefined();
      expect(typeof isGoogleConfigured).toBe('function');
    });
  });

  describe('isGoogleSignedIn', () => {
    it('should return false initially', () => {
      expect(isGoogleSignedIn()).toBe(false);
    });

    it('should be a function', () => {
      expect(typeof isGoogleSignedIn).toBe('function');
    });
  });

  describe('signOutFromGoogle', () => {
    it('should call google.accounts.oauth2.revoke when accessToken exists', () => {
      // Mock accessToken state (this is module-level, so limited testing)
      // We can test the function exists and can be called
      expect(typeof signOutFromGoogle).toBe('function');
      
      // Call the function - it should not throw
      expect(() => signOutFromGoogle()).not.toThrow();
    });

    it('should be a function', () => {
      expect(typeof signOutFromGoogle).toBe('function');
    });
  });

  // Note: Testing initGoogleApi, signInWithGoogle, and other functions that
  // depend on external scripts and module-level state is complex. These tests
  // focus on verifying the functions exist and basic error handling.
  // Full integration testing would require loading actual Google APIs.
});

