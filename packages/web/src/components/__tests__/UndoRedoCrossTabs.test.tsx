import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../../store';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from '../../__tests__/mocks/editor-context';

describe('Undo/Redo across tabs', () => {
  const mockEditor = createMockEditor();
  const mockMonaco = createMockMonaco();

  beforeEach(() => {
    // Reset store to initial state
    const store = useStore.getState();
    useStore.setState({
      ...store,
      tabs: [],
      activeTabId: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('preserves undo/redo stacks when switching tabs', () => {
    const { result } = renderHook(() => useStore(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider
          primaryEditor={mockEditor}
          primaryMonaco={mockMonaco}
        >
          {children}
        </MockEditorContextProvider>
      ),
    });

    // Open two tabs
    act(() => {
      result.current.openTab({ id: 'tab-1', title: 't1', content: 'One' });
      result.current.openTab({ id: 'tab-2', title: 't2', content: 'Two' });
    });
    const firstTab = result.current.tabs.find((t) => t.title === 't1')!;
    const secondTab = result.current.tabs.find((t) => t.title === 't2')!;

    // Edit tab-1
    act(() => {
      result.current.setActiveTab(firstTab.id);
      result.current.updateTabContent(firstTab.id, 'One updated');
    });

    // Switch to tab-2
    act(() => {
      result.current.setActiveTab(secondTab.id);
    });

    // Switch back to tab-1 and confirm history is retained (undo snapshot exists)
    act(() => {
      result.current.setActiveTab(firstTab.id);
    });

    const tab1 = result.current.tabs.find((t) => t.id === firstTab.id);
    expect(tab1?.undoStack).toContain('One');
  });
});
