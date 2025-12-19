import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StatusBar } from '../StatusBar';
import { useStore } from '../../store';
import { useEditorSelection } from '../../hooks/useEditorSelection';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from '../../__tests__/mocks/editor-context';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

// Mock useEditorSelection hook
vi.mock('../../hooks/useEditorSelection', () => ({
  useEditorSelection: vi.fn(() => null),
}));

describe('StatusBar', () => {
  const mockStore = {
    tabs: [],
    activeTabId: null,
    isOnline: true,
    isAuthenticated: false,
    showSidebar: true,
    showPreview: false,
    toggleSidebar: vi.fn(),
    togglePreview: vi.fn(),
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

  it('should render status bar', () => {
    const { container } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('should show online status', () => {
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(getByText('Online')).toBeTruthy();
  });

  it('should show offline status when offline', () => {
    (useStore as any).mockReturnValue({
      ...mockStore,
      isOnline: false,
    });
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(getByText('Offline')).toBeTruthy();
  });

  it('should show syncing enabled when authenticated', () => {
    (useStore as any).mockReturnValue({
      ...mockStore,
      isAuthenticated: true,
    });
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(getByText('Syncing enabled')).toBeTruthy();
  });

  it('should show file information when tab is active', () => {
    (useStore as any).mockReturnValue({
      ...mockStore,
      tabs: [
        {
          id: 'test-tab',
          title: 'test.md',
          content: 'Hello world',
          language: 'markdown',
          isDirty: false,
          syncStatus: 'local',
          isCloudSynced: false,
          savedContent: 'Hello world',
        },
      ],
      activeTabId: 'test-tab',
    });
    const { container } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(container.textContent?.toLowerCase().includes('markdown')).toBe(true);
    expect(container.textContent?.toLowerCase().includes('lines')).toBe(true);
  });

  it('should show unsaved indicator when tab is dirty', () => {
    (useStore as any).mockReturnValue({
      ...mockStore,
      tabs: [
        {
          id: 'test-tab',
          title: 'test.md',
          content: 'Hello world',
          language: 'markdown',
          isDirty: true,
          syncStatus: 'local',
          isCloudSynced: false,
          savedContent: '',
        },
      ],
      activeTabId: 'test-tab',
    });
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(getByText('● Unsaved')).toBeTruthy();
  });

  it('should show preview toggle for markdown files', () => {
    (useStore as any).mockReturnValue({
      ...mockStore,
      tabs: [
        {
          id: 'test-tab',
          title: 'test.md',
          content: 'Hello',
          language: 'markdown',
          isDirty: false,
          syncStatus: 'local',
          isCloudSynced: false,
          savedContent: 'Hello',
        },
      ],
      activeTabId: 'test-tab',
    });
    const { getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <StatusBar />
      </MockEditorContextProvider>
    );
    expect(getByText('Preview')).toBeTruthy();
  });

  describe('Selection Statistics', () => {
    it('should display document stats when no text is selected', () => {
      vi.mocked(useEditorSelection).mockReturnValue(null as any);

      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [
          {
            id: 'test-tab',
            title: 'test.md',
            content: 'Hello world',
            language: 'markdown',
            isDirty: false,
            syncStatus: 'local',
            isCloudSynced: false,
            savedContent: 'Hello world',
          },
        ],
        activeTabId: 'test-tab',
      });

      const { getByText } = render(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <StatusBar />
        </MockEditorContextProvider>
      );

      expect(getByText('2 words')).toBeTruthy();
      expect(getByText('11 chars')).toBeTruthy();
    });

    it('should display selection stats when text is selected', () => {
      vi.mocked(useEditorSelection).mockReturnValue({
        text: 'Hello',
        wordCount: 1,
        charCount: 5,
        position: { line: 1, column: 1 },
      } as any);

      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [
          {
            id: 'test-tab',
            title: 'test.md',
            content: 'Hello world',
            language: 'markdown',
            isDirty: false,
            syncStatus: 'local',
            isCloudSynced: false,
            savedContent: 'Hello world',
          },
        ],
        activeTabId: 'test-tab',
      });

      const { getByText } = render(
        <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
          <StatusBar />
        </MockEditorContextProvider>
      );

      expect(getByText('1 words selected')).toBeTruthy();
      expect(getByText('5 chars selected')).toBeTruthy();
      expect(getByText('2 words')).toBeTruthy();
      expect(getByText('11 chars')).toBeTruthy();
    });

    it('should display selection stats in diff mode', () => {
      vi.mocked(useEditorSelection).mockReturnValue({
        text: 'world',
        wordCount: 1,
        charCount: 5,
        position: { line: 1, column: 1 },
      } as any);

      const modifiedEditor = createMockEditor();
      const mockDiffEditor = {
        getModifiedEditor: () => modifiedEditor,
        getOriginalEditor: () => null,
      } as any;

      (useStore as any).mockReturnValue({
        ...mockStore,
        tabs: [
          {
            id: 'test-tab',
            title: 'test.md',
            content: 'Hello world',
            language: 'markdown',
            isDirty: false,
            syncStatus: 'local',
            isCloudSynced: false,
            savedContent: 'Hello world',
          },
        ],
        activeTabId: 'test-tab',
      });

      const { getByText } = render(
        <MockEditorContextProvider 
          primaryEditor={null} 
          primaryMonaco={null}
          diffEditor={mockDiffEditor}
          diffMonaco={mockMonaco}
        >
          <StatusBar />
        </MockEditorContextProvider>
      );

      expect(getByText('1 words selected')).toBeTruthy();
      expect(getByText('5 chars selected')).toBeTruthy();
      expect(getByText('2 words')).toBeTruthy();
      expect(getByText('11 chars')).toBeTruthy();
    });
  });
});
