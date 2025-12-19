import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useEditorSelection } from '../hooks/useEditorSelection';
import { countWords, countCharacters } from '@md-crafter/shared';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from './mocks/editor-context';

describe('useEditorSelection', () => {
  let mockEditor: ReturnType<typeof createMockEditor>;
  let mockModel: any;
  let mockSelection: any;

  beforeEach(() => {
    // Create mock selection
    mockSelection = {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 5,
      selectionStartLineNumber: 1,
      selectionStartColumn: 1,
      positionLineNumber: 1,
      positionColumn: 5,
    };

    // Create mock model
    mockModel = {
      getValueInRange: vi.fn(() => 'Hello'),
      onDidChangeContent: vi.fn(() => ({
        dispose: vi.fn(),
      })),
    };

    // Create mock editor with proper methods
    mockEditor = createMockEditor({
      getSelection: () => mockSelection,
      getModel: () => mockModel,
      onDidChangeCursorSelection: vi.fn(() => ({
        dispose: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('Selection calculation logic', () => {
    it('should return null when editor is not available', () => {
      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider primaryEditor={null} primaryMonaco={null}>
            {children}
          </MockEditorContextProvider>
        ),
      });
      
      expect(result.current).toBeNull();
    });

    it('should return null when selection is empty (cursor position)', () => {
      const emptySelection = {
        ...mockSelection,
        startColumn: 1,
        endColumn: 1,
      };
      
      const editorWithEmptySelection = createMockEditor({
        getSelection: () => emptySelection,
        getModel: () => mockModel,
      });
      
      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider primaryEditor={editorWithEmptySelection} primaryMonaco={createMockMonaco()}>
            {children}
          </MockEditorContextProvider>
        ),
      });
      
      expect(result.current).toBeNull();
    });

    it('should calculate selection stats correctly', async () => {
      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={createMockMonaco()}>
            {children}
          </MockEditorContextProvider>
        ),
      });
      
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });
      
      expect(result.current).toEqual({
        text: 'Hello',
        wordCount: 1,
        charCount: 5,
        position: { line: 1, column: 5 },
      });
    });

    it('should return null when model is not available', () => {
      const editorWithoutModel = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => null,
      });
      
      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider primaryEditor={editorWithoutModel} primaryMonaco={createMockMonaco()}>
            {children}
          </MockEditorContextProvider>
        ),
      });
      
      expect(result.current).toBeNull();
    });
    
    it('should handle selection changes correctly', async () => {
      const updatedSelection = {
        ...mockSelection,
        endColumn: 11,
      };
      
      const updatedModel = {
        ...mockModel,
        getValueInRange: vi.fn(() => 'Hello world'),
      };
      
      const editorWithUpdatedSelection = createMockEditor({
        getSelection: () => updatedSelection,
        getModel: () => updatedModel,
      });
      
      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider primaryEditor={editorWithUpdatedSelection} primaryMonaco={createMockMonaco()}>
            {children}
          </MockEditorContextProvider>
        ),
      });
      
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });
      
      expect(result.current).toEqual({
        text: 'Hello world',
        wordCount: 2,
        charCount: 11,
        position: { line: 1, column: 5 },
      });
    });
  });

  describe('Event listener setup and cleanup', () => {
    it('should set up selection change listener', () => {
      const disposeMock = vi.fn();
      const editorWithListener = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => mockModel,
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: disposeMock,
        })),
      });

      const disposable = editorWithListener.onDidChangeCursorSelection();
      expect(editorWithListener.onDidChangeCursorSelection).toHaveBeenCalled();
      expect(disposable.dispose).toBe(disposeMock);
    });

    it('should set up content change listener', () => {
      const disposeMock = vi.fn();
      const modelWithListener = {
        ...mockModel,
        onDidChangeContent: vi.fn(() => ({
          dispose: disposeMock,
        })),
      };

      const disposable = modelWithListener.onDidChangeContent();
      expect(modelWithListener.onDidChangeContent).toHaveBeenCalled();
      expect(disposable.dispose).toBe(disposeMock);
    });

    it('should dispose listeners correctly', () => {
      const disposeMock = vi.fn();
      const contentDisposeMock = vi.fn();
      
      const editorWithListeners = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => ({
          ...mockModel,
          onDidChangeContent: vi.fn(() => ({
            dispose: contentDisposeMock,
          })),
        }),
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: disposeMock,
        })),
      });
      
      const selectionDisposable = editorWithListeners.onDidChangeCursorSelection();
      const model = editorWithListeners.getModel();
      const contentDisposable = model?.onDidChangeContent();
      
      selectionDisposable.dispose();
      contentDisposable?.dispose();
      
      expect(disposeMock).toHaveBeenCalled();
      expect(contentDisposeMock).toHaveBeenCalled();
    });
  });

  describe('Word and character counting', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello')).toBe(1);
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('Hello   world')).toBe(2);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should count characters correctly', () => {
      expect(countCharacters('Hello')).toBe(5);
      expect(countCharacters('Hello world')).toBe(11);
      expect(countCharacters('')).toBe(0);
      expect(countCharacters('   ')).toBe(3);
    });
  });

  describe('Diff editor selection tracking', () => {
    it('should get position from modified (right) editor in diff mode', async () => {
      // Modified (right) editor should be prioritized - this is the current document being edited
      const modifiedEditor = createMockEditor({
        getSelection: () => ({
          ...mockSelection,
          endColumn: 10,
        }),
        getModel: () => ({
          ...mockModel,
          getValueInRange: vi.fn(() => 'Right Ed'),
        }),
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const originalEditor = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => mockModel,
      });

      const mockDiffEditor = {
        getModifiedEditor: () => modifiedEditor,
        getOriginalEditor: () => originalEditor,
      } as any;

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Should get position from modified (right) editor, not original
      expect(result.current).toEqual({
        text: 'Right Ed',
        wordCount: 2,
        charCount: 8,
        position: { line: 1, column: 5 },
      });
    });

    it('should fallback to original editor if modified unavailable', async () => {
      const originalEditor = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => mockModel,
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const mockDiffEditor = {
        getModifiedEditor: () => null,
        getOriginalEditor: () => originalEditor,
      } as any;

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current).toEqual({
        text: 'Hello',
        wordCount: 1,
        charCount: 5,
        position: { line: 1, column: 5 },
      });
    });
    
    it('should return position with line and column for cursor-only selection', async () => {
      // When there's no text selected, just a cursor position
      const emptySelection = {
        startLineNumber: 5,
        startColumn: 10,
        endLineNumber: 5,
        endColumn: 10, // Same as start = cursor only, no selection
        selectionStartLineNumber: 5,
        selectionStartColumn: 10,
        positionLineNumber: 5,
        positionColumn: 10,
      };
      
      const modifiedEditor = createMockEditor({
        getSelection: () => emptySelection,
        getModel: () => ({
          ...mockModel,
          getValueInRange: vi.fn(() => ''),
        }),
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const mockDiffEditor = {
        getModifiedEditor: () => modifiedEditor,
        getOriginalEditor: () => null,
      } as any;

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      // Should return null when selection is empty (cursor only)
      expect(result.current).toBeNull();
    });

    it('should return null when diff editor has no sub-editors', () => {
      const mockDiffEditor = {
        getModifiedEditor: () => null,
        getOriginalEditor: () => null,
      } as any;

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      expect(result.current).toBeNull();
    });

    it('should prioritize diff editor over primary editor', async () => {
      // Modified (right) editor of diff should be used, not primary editor
      const modifiedEditor = createMockEditor({
        getSelection: () => ({
          ...mockSelection,
          endColumn: 10,
        }),
        getModel: () => ({
          ...mockModel,
          getValueInRange: vi.fn(() => 'Diff text'),
        }),
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const mockDiffEditor = {
        getModifiedEditor: () => modifiedEditor,
        getOriginalEditor: () => null,
      } as any;

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={mockEditor} 
            primaryMonaco={createMockMonaco()}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Should track diff editor's modified editor, not primary editor
      expect(result.current?.text).toBe('Diff text');
    });

    it('should set up listeners on diff editor modified editor', () => {
      const disposeMock = vi.fn();
      const modifiedEditor = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => mockModel,
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: disposeMock,
        })),
        onDidFocusEditorText: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const mockDiffEditor = {
        getModifiedEditor: () => modifiedEditor,
        getOriginalEditor: () => null,
      } as any;

      renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      expect(modifiedEditor.onDidChangeCursorSelection).toHaveBeenCalled();
      expect(modifiedEditor.onDidFocusEditorText).toHaveBeenCalled();
    });

    it('should handle mouseup events on diff editor', () => {
      const mockDomNode = document.createElement('div');
      const modifiedEditor = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => mockModel,
        getDomNode: () => mockDomNode,
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
        onDidFocusEditorText: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const mockDiffEditor = {
        getModifiedEditor: () => modifiedEditor,
        getOriginalEditor: () => null,
      } as any;

      const addEventListenerSpy = vi.spyOn(mockDomNode, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(mockDomNode, 'removeEventListener');

      const { unmount } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            diffEditor={mockDiffEditor}
            diffMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });

  describe('Split mode selection tracking', () => {
    it('should always use primaryEditor in split mode, not secondary (focused) editor', async () => {
      // Create primary editor with specific selection
      const primaryEditorSelection = {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 8,
        selectionStartLineNumber: 1,
        selectionStartColumn: 1,
        positionLineNumber: 1,
        positionColumn: 8,
      };
      
      const primaryEditorInstance = createMockEditor({
        getSelection: () => primaryEditorSelection,
        getModel: () => ({
          ...mockModel,
          getValueInRange: vi.fn(() => 'Primary'),
        }),
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      // Create secondary editor with different selection
      const secondaryEditorSelection = {
        startLineNumber: 5,
        startColumn: 1,
        endLineNumber: 5,
        endColumn: 10,
        selectionStartLineNumber: 5,
        selectionStartColumn: 1,
        positionLineNumber: 5,
        positionColumn: 10,
      };
      
      const secondaryEditorInstance = createMockEditor({
        getSelection: () => secondaryEditorSelection,
        getModel: () => ({
          ...mockModel,
          getValueInRange: vi.fn(() => 'Secondary'),
        }),
        onDidChangeCursorSelection: vi.fn(() => ({
          dispose: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={primaryEditorInstance} 
            primaryMonaco={createMockMonaco()}
            secondaryEditor={secondaryEditorInstance}
            secondaryMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Should show primary editor stats, not secondary
      expect(result.current?.text).toBe('Primary');
      expect(result.current?.position).toEqual({ line: 1, column: 8 });
    });

    it('should return null when primaryEditor is not available in split mode', () => {
      // Create secondary editor
      const secondaryEditorInstance = createMockEditor({
        getSelection: () => mockSelection,
        getModel: () => mockModel,
      });

      const { result } = renderHook(() => useEditorSelection(), {
        wrapper: ({ children }) => (
          <MockEditorContextProvider 
            primaryEditor={null} 
            primaryMonaco={null}
            secondaryEditor={secondaryEditorInstance}
            secondaryMonaco={createMockMonaco()}
          >
            {children}
          </MockEditorContextProvider>
        ),
      });

      // Should return null when no primaryEditor, not fallback to secondary
      expect(result.current).toBeNull();
    });
  });
});
