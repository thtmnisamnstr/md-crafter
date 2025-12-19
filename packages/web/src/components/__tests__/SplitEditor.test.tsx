import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SplitEditor } from '../SplitEditor';
import { useStore } from '../../store';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from '../../__tests__/mocks/editor-context';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock Editor component
vi.mock('../Editor', () => ({
  Editor: ({ tabId }: { tabId?: string }) => <div data-testid={`editor-${tabId || 'active'}`}>Editor</div>,
}));

// Suppress Monaco loader errors in test output
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = args[0]?.toString() || '';
  if (msg.includes('Failed to load script') || msg.includes('monaco-editor')) {
    return;
  }
  originalError(...args);
};

describe('SplitEditor', () => {
  const baseTabs = [
    {
      id: 'tab-1',
      title: 'File 1.md',
      content: 'Content 1',
      language: 'markdown',
      isDirty: false,
      syncStatus: 'local' as const,
      isCloudSynced: false,
      savedContent: 'Content 1',
    },
    {
      id: 'tab-2',
      title: 'File 2.md',
      content: 'Content 2',
      language: 'markdown',
      isDirty: false,
      syncStatus: 'local' as const,
      isCloudSynced: false,
      savedContent: 'Content 2',
    },
  ];

  const mockStore = {
    tabs: baseTabs,
    activeTabId: 'tab-1',
    setActiveTab: vi.fn(),
    diffMode: { enabled: false },
    exitDiffMode: vi.fn(),
    setDiffMode: vi.fn(),
    settings: {
      fontSize: 14,
      fontFamily: 'monospace',
      tabSize: 2,
      wordWrap: true,
      lineNumbers: true,
      minimap: false,
      autoSync: false,
      syncInterval: 1000,
      spellCheck: false,
    },
    theme: 'dark',
  };

  const mockEditor = createMockEditor();
  const mockMonaco = createMockMonaco();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders split editor in vertical mode', () => {
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <SplitEditor mode="vertical" />
      </MockEditorContextProvider>
    );
    expect(getByText('Primary:')).toBeTruthy();
    expect(getByText('Secondary:')).toBeTruthy();
  });

  it('renders split editor in horizontal mode', () => {
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <SplitEditor mode="horizontal" />
      </MockEditorContextProvider>
    );
    expect(getByText('Primary:')).toBeTruthy();
    expect(getByText('Secondary:')).toBeTruthy();
  });

  describe('Primary pane locking', () => {
    it('should lock primary pane to initiating document', () => {
      // Render with tab-1 as active
      const { getByText, rerender } = render(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <SplitEditor mode="vertical" />
        </MockEditorContextProvider>
      );
      
      // Primary should show File 1.md (the initiating document)
      expect(getByText('File 1.md')).toBeTruthy();
      
      // Even if activeTabId changes, primary should remain locked
      const updatedStore = {
        ...mockStore,
        activeTabId: 'tab-2', // Changed active tab
      };
      (useStore as any).mockReturnValue(updatedStore);
      
      rerender(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <SplitEditor mode="vertical" />
        </MockEditorContextProvider>
      );
      
      // Primary should still show File 1.md (locked)
      expect(getByText('File 1.md')).toBeTruthy();
    });

    it('should not have a dropdown for changing primary tab', () => {
      const { container, getByText } = render(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <SplitEditor mode="vertical" />
        </MockEditorContextProvider>
      );
      
      // Primary pane should show title text, not a select dropdown
      // Find the primary section (first div with "Primary:" label)
      const primaryLabel = getByText('Primary:');
      const primaryHeader = primaryLabel.closest('div.text-xs');
      
      // The primary header should NOT contain a select element
      // (We changed it to a span showing the locked title)
      const selectInPrimary = primaryHeader?.querySelector('select');
      expect(selectInPrimary).toBeNull();
    });

    it('should allow changing secondary tab freely', () => {
      const mockSetActiveTab = vi.fn();
      const storeWithMocks = {
        ...mockStore,
        setActiveTab: mockSetActiveTab,
        setTabSplitState: vi.fn(),
        setSplitMode: vi.fn(),
      };
      (useStore as any).mockReturnValue(storeWithMocks);
      
      const { container } = render(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <SplitEditor mode="vertical" />
        </MockEditorContextProvider>
      );
      
      // Find the secondary section's select element
      const selects = container.querySelectorAll('select');
      // There should be exactly one select (for secondary pane)
      expect(selects.length).toBe(1);
      
      // The select should have options for tabs other than primary
      const options = selects[0].querySelectorAll('option');
      // Should only have tab-2 since tab-1 is locked as primary
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('tab-2');
    });

    it('should exclude primary tab from secondary dropdown options', () => {
      const threeTabsStore = {
        ...mockStore,
        tabs: [
          ...baseTabs,
          {
            id: 'tab-3',
            title: 'File 3.md',
            content: 'Content 3',
            language: 'markdown',
            isDirty: false,
            syncStatus: 'local' as const,
            isCloudSynced: false,
            savedContent: 'Content 3',
          },
        ],
        setSplitMode: vi.fn(),
        setTabSplitState: vi.fn(),
      };
      (useStore as any).mockReturnValue(threeTabsStore);
      
      const { container } = render(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <SplitEditor mode="vertical" />
        </MockEditorContextProvider>
      );
      
      // Find the secondary select
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBe(1);
      
      // Should have options for tab-2 and tab-3 (not tab-1 which is locked as primary)
      const options = selects[0].querySelectorAll('option');
      const optionValues = Array.from(options).map(opt => opt.value);
      
      expect(optionValues).not.toContain('tab-1'); // Primary is excluded
      expect(optionValues).toContain('tab-2');
      expect(optionValues).toContain('tab-3');
    });
  });
});
