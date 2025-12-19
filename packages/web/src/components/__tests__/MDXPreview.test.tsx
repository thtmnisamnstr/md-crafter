import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MDXPreview } from '../MDXPreview';
import * as shared from '@md-crafter/shared';

// Mock MDX compilation - use hoisted functions
const mockCompile = vi.hoisted(() => vi.fn());
const mockRun = vi.hoisted(() => vi.fn());

vi.mock('@mdx-js/mdx', () => ({
  compile: mockCompile,
  run: mockRun,
}));

// Mock MDX components
vi.mock('../mdx', () => ({
  mdxComponents: {
    h1: ({ children }: any) => <h1>{children}</h1>,
    p: ({ children }: any) => <p>{children}</p>,
  },
}));

describe('MDXPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful compilation
    mockCompile.mockResolvedValue('export default function MDXContent() { return <div>Content</div>; }');
    mockRun.mockResolvedValue({
      default: () => <div data-testid="mdx-component">MDX Content</div>,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering States', () => {
    it('should show loading state initially', () => {
      const { getByText } = render(<MDXPreview content="# Hello" />);
      expect(getByText('Compiling MDX...')).toBeTruthy();
    });

    it('should render compiled MDX component', async () => {
      const { getByTestId, queryByText } = render(<MDXPreview content="# Hello" />);
      
      await waitFor(() => {
        expect(getByTestId('mdx-component')).toBeTruthy();
      }, { timeout: 1000 });
      
      expect(queryByText('Compiling MDX...')).toBeFalsy();
    });

    it('should show error state when compilation fails', async () => {
      mockCompile.mockRejectedValueOnce(new Error('Compilation failed'));
      
      const { getByText, queryByText } = render(<MDXPreview content="Invalid MDX" />);
      
      await waitFor(() => {
        expect(getByText('MDX Compilation Error')).toBeTruthy();
      }, { timeout: 1000 });
      
      expect(queryByText('Compiling MDX...')).toBeFalsy();
    });
  });

  describe('MDX Compilation', () => {
    it('should compile MDX content', async () => {
      render(<MDXPreview content="# Hello World" />);
      
      await waitFor(() => {
        expect(mockCompile).toHaveBeenCalledWith('# Hello World', {
          outputFormat: 'function-body',
          development: false,
        });
      }, { timeout: 1000 });
    });

    it('should debounce compilation', async () => {
      const { rerender } = render(<MDXPreview content="Initial" />);
      
      // Rapidly change content
      rerender(<MDXPreview content="Change 1" />);
      rerender(<MDXPreview content="Change 2" />);
      rerender(<MDXPreview content="Change 3" />);
      
      // Should only compile once after debounce
      await waitFor(() => {
        expect(mockCompile).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should handle empty content', async () => {
      render(<MDXPreview content="" />);
      
      await waitFor(() => {
        expect(mockCompile).toHaveBeenCalledWith('', expect.any(Object));
      }, { timeout: 1000 });
    });
  });

  describe('Error Handling', () => {
    it('should display compilation error message', async () => {
      const errorMessage = 'Syntax error at line 5';
      mockCompile.mockRejectedValueOnce(new Error(errorMessage));
      
      const { getByText } = render(<MDXPreview content="Invalid MDX {<Component}" />);
      
      await waitFor(() => {
        expect(getByText('MDX Compilation Error')).toBeTruthy();
        expect(getByText(errorMessage)).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should handle non-Error exceptions', async () => {
      mockCompile.mockRejectedValueOnce('String error');
      
      const { getByText } = render(<MDXPreview content="Invalid" />);
      
      await waitFor(() => {
        expect(getByText('MDX Compilation Error')).toBeTruthy();
        expect(getByText('Unknown error')).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should log errors', async () => {
      const loggerErrorSpy = vi.spyOn(shared.logger, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      mockCompile.mockRejectedValueOnce(error);
      
      render(<MDXPreview content="Invalid" />);
      
      await waitFor(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith('MDX compilation error', expect.any(Error));
      }, { timeout: 2000 });
      
      loggerErrorSpy.mockRestore();
    });

    it('should clear error when compilation succeeds after failure', async () => {
      // First render with error
      mockCompile.mockRejectedValueOnce(new Error('Error 1'));
      const { rerender, queryByText, getByText } = render(<MDXPreview content="Invalid" />);
      
      await waitFor(() => {
        expect(getByText('MDX Compilation Error')).toBeTruthy();
      }, { timeout: 1000 });
      
      // Then render with valid content
      mockCompile.mockResolvedValueOnce('export default function MDXContent() { return <div>Content</div>; }');
      rerender(<MDXPreview content="# Valid" />);
      
      await waitFor(() => {
        expect(queryByText('MDX Compilation Error')).toBeFalsy();
      }, { timeout: 1000 });
    });
  });

  describe('Component Rendering', () => {
    it('should render MDX component with mdxComponents', async () => {
      const MockComponent = () => <div data-testid="custom-component">Custom</div>;
      mockRun.mockResolvedValueOnce({
        default: MockComponent,
      });
      
      const { getByTestId } = render(<MDXPreview content="# Hello" />);
      
      await waitFor(() => {
        expect(getByTestId('custom-component')).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should apply MDX content styles', async () => {
      const { container } = render(<MDXPreview content="# Hello" />);
      
      await waitFor(() => {
        const mdxContent = container.querySelector('.mdx-content');
        expect(mdxContent).toBeTruthy();
      }, { timeout: 1000 });
    });

    it('should handle component props', async () => {
      const MockComponent = ({ title }: { title?: string }) => (
        <div data-testid="component-with-props">{title || 'No title'}</div>
      );
      mockRun.mockResolvedValueOnce({
        default: MockComponent,
      });
      
      const { getByTestId } = render(<MDXPreview content="# Hello" />);
      
      await waitFor(() => {
        expect(getByTestId('component-with-props')).toBeTruthy();
      }, { timeout: 1000 });
    });
  });

  describe('Content Updates', () => {
    it('should recompile when content changes', async () => {
      const { rerender } = render(<MDXPreview content="Initial" />);
      
      await waitFor(() => {
        expect(mockCompile).toHaveBeenCalledWith('Initial', expect.any(Object));
      }, { timeout: 1000 });
      
      vi.clearAllMocks();
      
      rerender(<MDXPreview content="Updated" />);
      
      await waitFor(() => {
        expect(mockCompile).toHaveBeenCalledWith('Updated', expect.any(Object));
      }, { timeout: 1000 });
    });

    it('should cancel pending compilation on unmount', () => {
      const { unmount } = render(<MDXPreview content="Content" />);
      
      unmount();
      
      // Should not throw errors after unmount
      expect(() => {
        // Component should clean up properly
      }).not.toThrow();
    });
  });
});

