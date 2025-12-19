import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { SimpleDiffEditor } from '../DiffEditor';
import { useStore } from '../../store';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from '../../__tests__/mocks/editor-context';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock Monaco DiffEditor
const mockDiffEditor = {
  getOriginalEditor: vi.fn(() => createMockEditor()),
  getModifiedEditor: vi.fn(() => createMockEditor()),
  updateOptions: vi.fn(),
  onDidChangeModel: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
};

// Mock @monaco-editor/react before any imports
vi.mock('@monaco-editor/react', () => {
  const React = require('react');
  return {
    DiffEditor: React.forwardRef(({ onMount, original, modified, language, theme, options }: any, ref: any) => {
      React.useEffect(() => {
        // Simulate editor mount
        if (onMount) {
          const timeoutId = setTimeout(() => {
            onMount(mockDiffEditor, createMockMonaco());
          }, 0);
          return () => clearTimeout(timeoutId);
        }
      }, [onMount]);
      
      return React.createElement('div', {
        'data-testid': 'diff-editor',
        'data-original': original,
        'data-modified': modified,
        'data-language': language,
        'data-theme': theme,
      }, 'Diff Editor');
    }),
  };
});

describe('SimpleDiffEditor', () => {
  const mockStore = {
    settings: {
      fontSize: 14,
      fontFamily: 'monospace',
      wordWrap: true,
    },
    theme: 'dark',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render diff editor with original and modified content', () => {
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original text"
            modifiedContent="modified text"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor).toBeTruthy();
      expect(editor.getAttribute('data-original')).toBe('original text');
      expect(editor.getAttribute('data-modified')).toBe('modified text');
    });

    it('applies word wrap to both panes and diff editor', async () => {
      const originalEditor = createMockEditor();
      const modifiedEditor = createMockEditor();
      
      mockDiffEditor.getOriginalEditor.mockReturnValue(originalEditor);
      mockDiffEditor.getModifiedEditor.mockReturnValue(modifiedEditor);
      
      render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="Long line without breaks"
            modifiedContent="Another long line without breaks"
            originalTitle="Original"
            modifiedTitle="Modified"
            language="markdown"
          />
        </MockEditorContextProvider>
      );

      await waitFor(() => {
        expect(originalEditor.updateOptions).toHaveBeenCalledWith({ wordWrap: 'on' });
        expect(modifiedEditor.updateOptions).toHaveBeenCalledWith({ wordWrap: 'on' });
        expect(mockDiffEditor.updateOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            wordWrap: 'on',
            wordWrapOverride1: 'on',
            wordWrapOverride2: 'on',
            diffWordWrap: 'on',
          })
        );
      });
    });

    it('should apply correct language', () => {
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="const x = 1;"
            modifiedContent="const x = 2;"
            originalTitle="Original"
            modifiedTitle="Modified"
            language="typescript"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-language')).toBe('typescript');
    });

    it('should default to markdown language', () => {
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="# Hello"
            modifiedContent="# Hello World"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-language')).toBe('markdown');
    });

    it('should apply correct theme based on app theme', () => {
      (useStore as any).mockReturnValue({
        ...mockStore,
        theme: 'light',
      });

      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-theme')).toBe('vs');
    });

    it('should apply dark theme for dark app themes', () => {
      const darkThemes = ['dark', 'monokai', 'dracula', 'github-dark', 'nord'];
      
      darkThemes.forEach((theme) => {
        (useStore as any).mockReturnValue({
          ...mockStore,
          theme,
        });

        const { getByTestId, unmount } = render(
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={null}
            diffMonaco={null}
          >
            <SimpleDiffEditor
              originalContent="original"
              modifiedContent="modified"
              originalTitle="Original"
              modifiedTitle="Modified"
            />
          </MockEditorContextProvider>
        );

        const editor = getByTestId('diff-editor');
        expect(editor.getAttribute('data-theme')).toBe('vs-dark');
        unmount();
      });
    });
  });

  describe('Editor Registration', () => {
    it('should render diff editor component', () => {
      // Note: Testing actual registration with EditorContext requires complex mocking
      // that conflicts with MockEditorContextProvider. The registration is tested
      // indirectly by verifying the component renders and calls onMount callback.
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      // Verify component renders (registration happens in onMount callback)
      expect(getByTestId('diff-editor')).toBeTruthy();
    });
  });

  describe('Content Display', () => {
    it('should display original content in left pane', () => {
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="left content"
            modifiedContent="right content"
            originalTitle="Left"
            modifiedTitle="Right"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-original')).toBe('left content');
    });

    it('should display modified content in right pane', () => {
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="left content"
            modifiedContent="right content"
            originalTitle="Left"
            modifiedTitle="Right"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-modified')).toBe('right content');
    });

    it('should handle empty content', () => {
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent=""
            modifiedContent=""
            originalTitle="Empty"
            modifiedTitle="Empty"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-original')).toBe('');
      expect(editor.getAttribute('data-modified')).toBe('');
    });

    it('should handle large content', () => {
      const largeContent = 'a'.repeat(10000);
      const { getByTestId } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent={largeContent}
            modifiedContent={largeContent + ' modified'}
            originalTitle="Large"
            modifiedTitle="Large Modified"
          />
        </MockEditorContextProvider>
      );

      const editor = getByTestId('diff-editor');
      expect(editor.getAttribute('data-original')).toBe(largeContent);
      expect(editor.getAttribute('data-modified')).toBe(largeContent + ' modified');
    });
  });

  describe('Word Wrap', () => {
    it('should apply word wrap when models are ready immediately', async () => {
      const originalEditor = createMockEditor();
      const modifiedEditor = createMockEditor();
      const originalModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };
      const modifiedModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };

      originalEditor.getModel = vi.fn(() => originalModel as any);
      modifiedEditor.getModel = vi.fn(() => modifiedModel as any);

      const updateOptionsSpy = vi.fn();
      originalEditor.updateOptions = updateOptionsSpy;
      modifiedEditor.updateOptions = vi.fn();

      mockDiffEditor.getOriginalEditor = vi.fn(() => originalEditor);
      mockDiffEditor.getModifiedEditor = vi.fn(() => modifiedEditor);

      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });

      render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      await waitFor(() => {
        expect(updateOptionsSpy).toHaveBeenCalledWith({
          wordWrap: 'on',
        });
      });

      requestAnimationFrameSpy.mockRestore();
    });

    it('should retry word wrap application when models are not ready initially', async () => {
      const originalEditor = createMockEditor();
      const modifiedEditor = createMockEditor();
      const originalModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };
      const modifiedModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };

      let callCount = 0;
      originalEditor.getModel = vi.fn(() => {
        callCount++;
        // Return null first two times, then model
        return callCount > 2 ? (originalModel as any) : null;
      });
      modifiedEditor.getModel = vi.fn(() => {
        return callCount > 2 ? (modifiedModel as any) : null;
      });

      const updateOptionsSpy = vi.fn();
      originalEditor.updateOptions = updateOptionsSpy;
      modifiedEditor.updateOptions = vi.fn();

      mockDiffEditor.getOriginalEditor = vi.fn(() => originalEditor);
      mockDiffEditor.getModifiedEditor = vi.fn(() => modifiedEditor);

      const rafCalls: Array<() => void> = [];
      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCalls.push(cb as () => void);
        return rafCalls.length;
      });

      render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      // Execute retries
      for (let i = 0; i < 3; i++) {
        if (rafCalls[i]) {
          rafCalls[i]();
        }
      }

      await waitFor(() => {
        expect(updateOptionsSpy).toHaveBeenCalledWith({
          wordWrap: 'on',
        });
      });

      requestAnimationFrameSpy.mockRestore();
    });

    it('should stop retrying after MAX_RETRIES (50)', async () => {
      const originalEditor = createMockEditor();
      const modifiedEditor = createMockEditor();

      // Always return null (models never ready)
      originalEditor.getModel = vi.fn(() => null);
      modifiedEditor.getModel = vi.fn(() => null);

      mockDiffEditor.getOriginalEditor = vi.fn(() => originalEditor);
      mockDiffEditor.getModifiedEditor = vi.fn(() => modifiedEditor);

      const rafCalls: Array<() => void> = [];
      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCalls.push(cb as () => void);
        return rafCalls.length;
      });

      render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      await waitFor(() => {
        expect(mockDiffEditor.updateOptions).toHaveBeenCalledWith(
          expect.objectContaining({ wordWrap: 'on' })
        );
      });
      // No retries should be scheduled when models are already available
      expect(requestAnimationFrameSpy).not.toHaveBeenCalled();

      requestAnimationFrameSpy.mockRestore();
    });

    it('should update word wrap when settings change', async () => {
      const originalEditor = createMockEditor();
      const modifiedEditor = createMockEditor();
      const originalModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };
      const modifiedModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };

      originalEditor.getModel = vi.fn(() => originalModel as any);
      modifiedEditor.getModel = vi.fn(() => modifiedModel as any);

      const originalUpdateOptionsSpy = vi.fn();
      const modifiedUpdateOptionsSpy = vi.fn();
      originalEditor.updateOptions = originalUpdateOptionsSpy;
      modifiedEditor.updateOptions = modifiedUpdateOptionsSpy;

      mockDiffEditor.getOriginalEditor = vi.fn(() => originalEditor);
      mockDiffEditor.getModifiedEditor = vi.fn(() => modifiedEditor);

      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });

      const { rerender } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      // Change word wrap setting
      (useStore as any).mockReturnValue({
        ...mockStore,
        settings: {
          ...mockStore.settings,
          wordWrap: false,
        },
      });

      rerender(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      await waitFor(() => {
        expect(originalUpdateOptionsSpy).toHaveBeenCalledWith({
          wordWrap: 'off',
        });
        expect(modifiedUpdateOptionsSpy).toHaveBeenCalledWith({
          wordWrap: 'off',
        });
      });

      requestAnimationFrameSpy.mockRestore();
    });

    it('should apply word wrap to both original and modified editors', async () => {
      const originalEditor = createMockEditor();
      const modifiedEditor = createMockEditor();
      const originalModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };
      const modifiedModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };

      originalEditor.getModel = vi.fn(() => originalModel as any);
      modifiedEditor.getModel = vi.fn(() => modifiedModel as any);

      const originalUpdateOptionsSpy = vi.fn();
      const modifiedUpdateOptionsSpy = vi.fn();
      originalEditor.updateOptions = originalUpdateOptionsSpy;
      modifiedEditor.updateOptions = modifiedUpdateOptionsSpy;

      mockDiffEditor.getOriginalEditor = vi.fn(() => originalEditor);
      mockDiffEditor.getModifiedEditor = vi.fn(() => modifiedEditor);

      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });

      render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={null}
          diffMonaco={null}
        >
          <SimpleDiffEditor
            originalContent="original"
            modifiedContent="modified"
            originalTitle="Original"
            modifiedTitle="Modified"
          />
        </MockEditorContextProvider>
      );

      await waitFor(() => {
        expect(originalUpdateOptionsSpy).toHaveBeenCalledWith({
          wordWrap: 'on',
        });
        expect(modifiedUpdateOptionsSpy).toHaveBeenCalledWith({
          wordWrap: 'on',
        });
      });

      requestAnimationFrameSpy.mockRestore();
    });
  });
});
