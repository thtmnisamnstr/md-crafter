import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ExportModal } from '../ExportModal';
import { useStore } from '../../store';
import { batchExport, exportMdxToStaticHtml, stripMdxToMarkdown } from '../../services/mdxExport';

vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

vi.mock('../../services/mdxExport', () => ({
  exportMdxToStaticHtml: vi.fn(),
  stripMdxToMarkdown: vi.fn(),
  batchExport: vi.fn(),
}));

describe('ExportModal', () => {
  const mockOnClose = vi.fn();
  const mockAddToast = vi.fn();

  const mockStore = {
    tabs: [
      {
        id: 'tab-1',
        title: 'test.mdx',
        content: '# Test\n\n<Callout>Demo</Callout>',
        path: '/workspace/docs/test.mdx',
      },
    ],
    activeTabId: 'tab-1',
    cloudDocuments: [
      { id: 'cloud-1', title: 'cloud-doc.md', content: '# Cloud', language: 'markdown' },
    ],
    addToast: mockAddToast,
    workspaceRoots: [],
    activeWorkspaceRootId: null,
    mdxComponentDefinitions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    (exportMdxToStaticHtml as any).mockResolvedValue('<html><body>ok</body></html>');
    (stripMdxToMarkdown as any).mockResolvedValue('# stripped');
    (batchExport as any).mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' }));
    global.URL.createObjectURL = vi.fn(() => 'blob://export');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders format options and scope controls', () => {
    const { getByText } = render(<ExportModal onClose={mockOnClose} />);
    expect(getByText('Current Document')).toBeTruthy();
    expect(getByText('Batch Export')).toBeTruthy();
    expect(getByText('Static HTML')).toBeTruthy();
    expect(getByText('Markdown (strip MDX)')).toBeTruthy();
  });

  it('exports current document as static html by default', async () => {
    const { getByRole } = render(<ExportModal onClose={mockOnClose} />);
    fireEvent.click(getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(exportMdxToStaticHtml).toHaveBeenCalledWith(
        '# Test\n\n<Callout>Demo</Callout>',
        expect.objectContaining({
          title: 'test',
          documentPath: '/workspace/docs/test.mdx',
        })
      );
      expect(mockAddToast).toHaveBeenCalledWith({ type: 'success', message: 'Export complete' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('exports stripped markdown when selected', async () => {
    const { getByRole, getByText } = render(<ExportModal onClose={mockOnClose} />);
    fireEvent.click(getByText('Markdown (strip MDX)'));
    fireEvent.click(getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(stripMdxToMarkdown).toHaveBeenCalledWith('# Test\n\n<Callout>Demo</Callout>', { normalizeWhitespace: true });
    });
  });

  it('runs batch export with selected docs', async () => {
    const { getByText } = render(<ExportModal onClose={mockOnClose} />);
    fireEvent.click(getByText('Batch Export'));
    fireEvent.click(getByText('cloud-doc.md'));
    fireEvent.click(getByText('Export Batch'));

    await waitFor(() => {
      expect(batchExport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'tab-1', title: 'test.mdx' }),
          expect.objectContaining({ id: 'cloud-1', title: 'cloud-doc.md' }),
        ]),
        'html',
        expect.any(Object)
      );
    });
  });
});
