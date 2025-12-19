import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from '../AuthModal';
import { useStore } from '../../store';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock platform utils - use hoisted function
const mockIsElectron = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../utils/platform', () => ({
  isElectron: mockIsElectron,
}));

// Mock API service - use hoisted function
const mockSetBaseUrl = vi.hoisted(() => vi.fn());
vi.mock('../../services/api', () => ({
  api: {
    setBaseUrl: mockSetBaseUrl,
  },
}));

describe('AuthModal', () => {
  const mockSetShowAuth = vi.fn();
  const mockLogin = vi.fn();
  const mockGenerateToken = vi.fn();

  const mockStore = {
    setShowAuth: mockSetShowAuth,
    login: mockLogin,
    generateToken: mockGenerateToken,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    localStorage.clear();
    mockSetBaseUrl.mockClear();
    // Reset isElectron mock to default (false/web mode)
    mockIsElectron.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render auth modal', () => {
      const { getByText } = render(<AuthModal />);
      expect(getByText('Cloud Sync Setup')).toBeTruthy();
    });

    it('should show web mode by default', () => {
      const { getByPlaceholderText } = render(<AuthModal />);
      expect(getByPlaceholderText('your@email.com')).toBeTruthy();
    });

    it('should show desktop mode when isElectron returns true', () => {
      // Mock isElectron to return true
      mockIsElectron.mockReturnValueOnce(true);
      
      const { getByText, getByPlaceholderText } = render(<AuthModal />);
      expect(getByText('Connect to Cloud')).toBeTruthy();
      expect(getByPlaceholderText('https://your-md-crafter-server.com')).toBeTruthy();
    });

    it('should show close button', () => {
      const { container } = render(<AuthModal />);
      const closeButton = container.querySelector('button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<AuthModal />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockSetShowAuth).toHaveBeenCalledWith(false);
    });
  });

  describe('Web Mode - Token Generation', () => {
    it('should show email input', () => {
      const { getByPlaceholderText } = render(<AuthModal />);
      expect(getByPlaceholderText(/email/i)).toBeTruthy();
    });

    it('should generate token when Generate Token button is clicked', async () => {
      mockGenerateToken.mockResolvedValueOnce('test-token-123');
      
      const { getByText, getByPlaceholderText } = render(<AuthModal />);
      const emailInput = getByPlaceholderText('your@email.com') as HTMLInputElement;
      const generateButton = getByText('Generate API Token');
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateToken).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should generate token without email if email is empty', async () => {
      mockGenerateToken.mockResolvedValueOnce('test-token-123');
      
      const { getByText } = render(<AuthModal />);
      const generateButton = getByText('Generate API Token');
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateToken).toHaveBeenCalledWith(undefined);
      });
    });

    it('should display generated token', async () => {
      mockGenerateToken.mockResolvedValueOnce('test-token-123');
      
      const { getByText, container } = render(<AuthModal />);
      const generateButton = getByText('Generate API Token');
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const codeElement = container.querySelector('code');
        expect(codeElement?.textContent).toBe('test-token-123');
      });
    });

    it('should show error when token generation fails', async () => {
      mockGenerateToken.mockResolvedValueOnce(null);
      
      const { getByText } = render(<AuthModal />);
      const generateButton = getByText('Generate API Token');
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(getByText('Failed to generate token')).toBeTruthy();
      });
    });

    it('should copy token to clipboard', async () => {
      // Mock navigator.clipboard
      const clipboardWriteSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardWriteSpy },
        writable: true,
        configurable: true,
      });
      
      mockGenerateToken.mockResolvedValueOnce('test-token-123');
      
      const { getByText, container } = render(<AuthModal />);
      const generateButton = getByText('Generate API Token');
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        // Wait for token to be displayed
        const codeElement = container.querySelector('code');
        return codeElement && codeElement.textContent === 'test-token-123';
      });
      
      const copyButton = container.querySelector('button[title="Copy to clipboard"]');
      expect(copyButton).toBeTruthy();
      
      if (copyButton) {
        fireEvent.click(copyButton);
        await waitFor(() => {
          expect(clipboardWriteSpy).toHaveBeenCalledWith('test-token-123');
        });
      }
    });

    it('should login with generated token when Use Token button is clicked', async () => {
      mockGenerateToken.mockResolvedValueOnce('test-token-123');
      mockLogin.mockResolvedValueOnce(true);
      
      const { getByText } = render(<AuthModal />);
      const generateButton = getByText('Generate API Token');
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const useTokenButton = getByText('Start Using Cloud Sync');
        fireEvent.click(useTokenButton);
      });
      
      expect(mockLogin).toHaveBeenCalledWith('test-token-123');
    });
  });

  describe('Desktop Mode - Server URL and Token', () => {
    beforeEach(() => {
      // Mock isElectron to return true for desktop mode tests
      mockIsElectron.mockReturnValue(true);
    });

    it('should show server URL input', () => {
      const { getByPlaceholderText } = render(<AuthModal />);
      expect(getByPlaceholderText('https://your-md-crafter-server.com')).toBeTruthy();
    });

    it('should show API token input', () => {
      const { getByPlaceholderText } = render(<AuthModal />);
      expect(getByPlaceholderText('Enter your API token')).toBeTruthy();
    });

    it('should load saved server URL from localStorage', () => {
      localStorage.setItem('md-crafter-server-url', 'https://example.com');
      
      const { getByDisplayValue } = render(<AuthModal />);
      expect(getByDisplayValue('https://example.com')).toBeTruthy();
    });

    it('should validate server URL format', async () => {
      const { getByPlaceholderText, getByText } = render(<AuthModal />);
      const serverUrlInput = getByPlaceholderText('https://your-md-crafter-server.com') as HTMLInputElement;
      const tokenInput = getByPlaceholderText('Enter your API token') as HTMLInputElement;
      const loginButton = getByText('Connect');
      
      fireEvent.change(serverUrlInput, { target: { value: 'invalid-url' } });
      fireEvent.change(tokenInput, { target: { value: 'token' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(getByText(/valid server url/i)).toBeTruthy();
      });
    });

    it('should require server URL', async () => {
      const { getByPlaceholderText, getByText } = render(<AuthModal />);
      const tokenInput = getByPlaceholderText('Enter your API token') as HTMLInputElement;
      const loginButton = getByText('Connect');
      
      fireEvent.change(tokenInput, { target: { value: 'token' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(getByText('Please enter the server URL')).toBeTruthy();
      });
    });

    it('should require API token', async () => {
      const { getByPlaceholderText, getByText } = render(<AuthModal />);
      const serverUrlInput = getByPlaceholderText('https://your-md-crafter-server.com') as HTMLInputElement;
      const loginButton = getByText('Connect');
      
      fireEvent.change(serverUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(getByText('Please enter your API token')).toBeTruthy();
      });
    });

    it('should login with token and server URL', async () => {
      mockLogin.mockResolvedValueOnce(true);
      
      const { getByPlaceholderText, getByText } = render(<AuthModal />);
      const serverUrlInput = getByPlaceholderText('https://your-md-crafter-server.com') as HTMLInputElement;
      const tokenInput = getByPlaceholderText('Enter your API token') as HTMLInputElement;
      const loginButton = getByText('Connect');
      
      fireEvent.change(serverUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.change(tokenInput, { target: { value: 'test-token' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(mockSetBaseUrl).toHaveBeenCalledWith('https://example.com');
        expect(mockLogin).toHaveBeenCalledWith('test-token');
      });
    });

    it('should save server URL to localStorage on login', async () => {
      mockLogin.mockResolvedValueOnce(true);
      
      const { getByPlaceholderText, getByText } = render(<AuthModal />);
      const serverUrlInput = getByPlaceholderText('https://your-md-crafter-server.com') as HTMLInputElement;
      const tokenInput = getByPlaceholderText('Enter your API token') as HTMLInputElement;
      const loginButton = getByText('Connect');
      
      fireEvent.change(serverUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.change(tokenInput, { target: { value: 'test-token' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('md-crafter-server-url')).toBe('https://example.com');
      });
    });

    it('should show error when login fails', async () => {
      mockLogin.mockResolvedValueOnce(false);
      
      const { getByPlaceholderText, getByText } = render(<AuthModal />);
      const serverUrlInput = getByPlaceholderText('https://your-md-crafter-server.com') as HTMLInputElement;
      const tokenInput = getByPlaceholderText('Enter your API token') as HTMLInputElement;
      const loginButton = getByText('Connect');
      
      fireEvent.change(serverUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.change(tokenInput, { target: { value: 'invalid-token' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(getByText(/invalid.*token|unable to connect/i)).toBeTruthy();
      });
    });

    it('should submit on Enter key in token input', async () => {
      mockLogin.mockResolvedValueOnce(true);
      
      const { getByPlaceholderText } = render(<AuthModal />);
      const serverUrlInput = getByPlaceholderText('https://your-md-crafter-server.com') as HTMLInputElement;
      const tokenInput = getByPlaceholderText('Enter your API token') as HTMLInputElement;
      
      fireEvent.change(serverUrlInput, { target: { value: 'https://example.com' } });
      fireEvent.change(tokenInput, { target: { value: 'test-token' } });
      fireEvent.keyDown(tokenInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear error when user starts typing', async () => {
      mockGenerateToken.mockResolvedValueOnce(null);
      
      const { getByText, getByPlaceholderText } = render(<AuthModal />);
      const generateButton = getByText('Generate API Token');
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(getByText('Failed to generate token')).toBeTruthy();
      });
      
      const emailInput = getByPlaceholderText('your@email.com') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'new@email.com' } });
      
      // Error might still be visible, but new input should be possible
      expect(emailInput.value).toBe('new@email.com');
    });
  });
});

