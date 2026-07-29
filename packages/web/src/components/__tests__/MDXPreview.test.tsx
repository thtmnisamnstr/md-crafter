import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MDXPreview } from '../MDXPreview';
import { renderMdxDocument } from '../../services/mdxEngine';

vi.mock('../../services/mdxEngine', () => ({
  renderMdxDocument: vi.fn(),
}));

vi.mock('../../store', () => ({
  useStore: vi.fn(() => ({
    mdxComponentDefinitions: [],
    workspaceRoots: [],
    activeWorkspaceRootId: null,
  })),
}));

describe('MDXPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (renderMdxDocument as any).mockResolvedValue({
      component: () => <div data-testid="mdx-component">Rendered MDX</div>,
      componentMap: {},
      compile: null,
      errors: [],
      cached: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows compiling state initially', () => {
    const { getByText } = render(<MDXPreview content="# test" />);
    expect(getByText('Compiling MDX...')).toBeTruthy();
  });

  it('renders mdx content after compile completes', async () => {
    const { getByTestId } = render(<MDXPreview content="# Hello" />);

    await waitFor(() => {
      expect(getByTestId('mdx-component')).toBeTruthy();
    });
  });

  it('shows error view when engine returns no component', async () => {
    (renderMdxDocument as any).mockResolvedValueOnce({
      component: null,
      componentMap: {},
      compile: null,
      errors: ['Failed to compile'],
      cached: false,
    });

    const { getByText } = render(<MDXPreview content="<Broken>" />);

    await waitFor(() => {
      expect(getByText('MDX Compilation Error')).toBeTruthy();
      expect(getByText('Failed to compile')).toBeTruthy();
    });
  });

  it('passes document path to mdx engine', async () => {
    render(<MDXPreview content="# Hello" documentPath="/workspace/docs/file.mdx" />);

    await waitFor(() => {
      expect(renderMdxDocument).toHaveBeenCalledWith('# Hello', expect.objectContaining({
        documentPath: '/workspace/docs/file.mdx',
      }));
    });
  });

  it('renders content with warnings when engine returns a component and non-fatal errors', async () => {
    (renderMdxDocument as any).mockResolvedValueOnce({
      component: () => <div data-testid="mdx-component">Rendered with warning</div>,
      componentMap: {},
      compile: null,
      errors: ['CustomComponent: failed optional import'],
      cached: false,
    });

    const { getByTestId, getByText } = render(<MDXPreview content="# Hello" />);

    await waitFor(() => {
      expect(getByTestId('mdx-component')).toBeTruthy();
      expect(getByText('MDX Preview Warning')).toBeTruthy();
      expect(getByText('CustomComponent: failed optional import')).toBeTruthy();
    });
  });
});
