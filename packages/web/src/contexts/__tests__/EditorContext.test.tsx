import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EditorContextProvider, useEditorContext } from '../EditorContext';

// Test component that uses the context
function TestComponent() {
  const context = useEditorContext();
  return (
    <div>
      <div data-testid="has-primary">{context.primaryEditor ? 'yes' : 'no'}</div>
      <div data-testid="has-secondary">{context.secondaryEditor ? 'yes' : 'no'}</div>
      <div data-testid="has-diff">{context.diffEditor ? 'yes' : 'no'}</div>
      <div data-testid="has-register">{context.registerPrimaryEditor ? 'yes' : 'no'}</div>
    </div>
  );
}

describe('EditorContext', () => {
  afterEach(() => {
    cleanup();
  });

  it('should provide context with null values by default', () => {
    const { getByTestId } = render(
      <EditorContextProvider>
        <TestComponent />
      </EditorContextProvider>
    );
    
    expect(getByTestId('has-primary').textContent).toBe('no');
    expect(getByTestId('has-secondary').textContent).toBe('no');
    expect(getByTestId('has-diff').textContent).toBe('no');
    expect(getByTestId('has-register').textContent).toBe('yes');
  });

  it('should throw error when useEditorContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useEditorContext must be used within an EditorContextProvider');
    
    consoleError.mockRestore();
  });

  it('should provide registration functions', () => {
    let contextValue: ReturnType<typeof useEditorContext> | null = null;
    
    function TestWithRegistration() {
      const context = useEditorContext();
      contextValue = context;
      return <div data-testid="test">Test</div>;
    }
    
    const { getByTestId } = render(
      <EditorContextProvider>
        <TestWithRegistration />
      </EditorContextProvider>
    );
    
    expect(getByTestId('test')).toBeTruthy();
    expect(contextValue?.registerPrimaryEditor).toBeDefined();
    expect(contextValue?.registerSecondaryEditor).toBeDefined();
    expect(contextValue?.registerDiffEditor).toBeDefined();
    expect(contextValue?.getActiveEditor).toBeDefined();
  });

  it('should clean up disposables when unregistering editors', async () => {
    let contextValue: ReturnType<typeof useEditorContext> | null = null;
    const mockDispose = vi.fn();
    
    function TestWithRegistration() {
      const context = useEditorContext();
      contextValue = context;
      return <div data-testid="test">Test</div>;
    }
    
    const { unmount } = render(
      <EditorContextProvider>
        <TestWithRegistration />
      </EditorContextProvider>
    );
    
    // Wait for context to be available
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Create a mock editor with disposable
    const mockEditor = {
      onDidFocusEditorText: vi.fn(() => ({ dispose: mockDispose })),
    } as any;
    
    // Register editor
    contextValue?.registerPrimaryEditor(mockEditor, {} as any);
    
    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Unregister editor (this should clean up the disposable)
    contextValue?.unregisterPrimaryEditor();
    
    // Verify dispose was called (WeakMap cleanup)
    expect(mockDispose).toHaveBeenCalled();
    
    unmount();
  });
});

