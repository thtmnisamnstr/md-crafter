import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { logger } from '@md-crafter/shared';

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Component that throws an error for testing
function ThrowError({ shouldThrow = false, message = 'Test error' }: { shouldThrow?: boolean; message?: string }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalReload = window.location.reload;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    process.env.NODE_ENV = originalEnv;
    window.location.reload = originalReload;
  });

  describe('Rendering', () => {
    it('should render children when no error', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      expect(getByText('Test content')).toBeTruthy();
    });

    it('should render custom fallback when error occurs', () => {
      const fallback = <div>Custom fallback</div>;
      const { getByText } = render(
        <ErrorBoundary fallback={fallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(getByText('Custom fallback')).toBeTruthy();
    });
  });

  describe('Error Display', () => {
    it('should show error UI when error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error message" />
        </ErrorBoundary>
      );
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('An unexpected error occurred. Please try reloading the page.')).toBeTruthy();
    });

    it('should display reload button', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const reloadButton = getByText('Reload Page');
      expect(reloadButton).toBeTruthy();
    });
  });

  describe('Error Details (Development Mode)', () => {
    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );
      expect(getByText('Error Details (Development Only)')).toBeTruthy();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const { queryByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );
      expect(queryByText('Error Details (Development Only)')).toBeFalsy();
    });

    it('should display error name and message in development', () => {
      process.env.NODE_ENV = 'development';
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error message" />
        </ErrorBoundary>
      );
      // Check that error message appears in the rendered content
      expect(container.textContent).toContain('Test error message');
    });

    it('should display error stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at ThrowError';
      
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );
      
      // Stack trace should be in a pre element
      const preElements = container.querySelectorAll('pre');
      expect(preElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Logging', () => {
    it('should log errors with logger.error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );
      
      expect(logger.error).toHaveBeenCalledWith(
        'React component error',
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('Reload Functionality', () => {
    it('should call window.location.reload when reload button is clicked', () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: {
          reload: reloadSpy,
        },
        writable: true,
      });

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const reloadButton = getByText('Reload Page');
      reloadButton.click();
      
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Component Stack', () => {
    it('should display component stack in development mode', () => {
      process.env.NODE_ENV = 'development';
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Component stack should be displayed (check for the label text)
      const componentStackLabel = container.textContent?.includes('Component Stack:');
      expect(componentStackLabel).toBe(true);
    });
  });
});

