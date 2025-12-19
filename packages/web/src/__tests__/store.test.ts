import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Store - addRecentFile', () => {
  beforeEach(() => {
    // Ensure window exists
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should add a file to recent files', async () => {
    const { useStore } = await import('../store');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add a recent file
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'Test Document.md',
      isCloud: false,
    });
    
    const recentFiles = useStore.getState().recentFiles;
    expect(recentFiles).toHaveLength(1);
    expect(recentFiles[0].id).toBe('test-id-1');
    expect(recentFiles[0].title).toBe('Test Document.md');
    expect(recentFiles[0].isCloud).toBe(false);
    expect(recentFiles[0].lastOpened).toBeGreaterThan(0);
  });

  it('should deduplicate recent files by id', async () => {
    const { useStore } = await import('../store');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add same file twice
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'Test Document.md',
      isCloud: false,
    });
    
    const firstTimestamp = useStore.getState().recentFiles[0].lastOpened;
    
    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'Test Document.md',
      isCloud: false,
    });
    
    const recentFiles = useStore.getState().recentFiles;
    // Should still have only one file, but with updated timestamp
    expect(recentFiles).toHaveLength(1);
    expect(recentFiles[0].lastOpened).toBeGreaterThan(firstTimestamp);
  });

  it('should deduplicate recent files by documentId', async () => {
    const { useStore } = await import('../store');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add cloud document
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'Cloud Document.md',
      documentId: 'doc-123',
      isCloud: true,
    });
    
    // Add same document with different id but same documentId
    useStore.getState().addRecentFile({
      id: 'test-id-2',
      title: 'Cloud Document.md',
      documentId: 'doc-123',
      isCloud: true,
    });
    
    const recentFiles = useStore.getState().recentFiles;
    // Should have only one file (deduplicated by documentId)
    expect(recentFiles).toHaveLength(1);
    expect(recentFiles[0].documentId).toBe('doc-123');
  });

  it('should sort recent files by lastOpened (newest first)', async () => {
    const { useStore } = await import('../store');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add first file
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'First Document.md',
      isCloud: false,
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Add second file
    useStore.getState().addRecentFile({
      id: 'test-id-2',
      title: 'Second Document.md',
      isCloud: false,
    });
    
    const recentFiles = useStore.getState().recentFiles;
    // Second file should be first (newest)
    expect(recentFiles).toHaveLength(2);
    expect(recentFiles[0].id).toBe('test-id-2');
    expect(recentFiles[1].id).toBe('test-id-1');
  });

  it('should limit recent files to MAX_RECENT_FILES', async () => {
    const { useStore } = await import('../store');
    const { MAX_RECENT_FILES } = await import('../constants');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add more than MAX_RECENT_FILES files
    for (let i = 0; i < MAX_RECENT_FILES + 5; i++) {
      useStore.getState().addRecentFile({
        id: `test-id-${i}`,
        title: `Document ${i}.md`,
        isCloud: false,
      });
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    const recentFiles = useStore.getState().recentFiles;
    // Should be limited to MAX_RECENT_FILES
    expect(recentFiles).toHaveLength(MAX_RECENT_FILES);
    
    // Most recent files should be kept
    expect(recentFiles[0].id).toBe(`test-id-${MAX_RECENT_FILES + 4}`);
  });

  it('should remove a file from recent files', async () => {
    const { useStore } = await import('../store');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add two files
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'Test Document 1.md',
      isCloud: false,
    });
    useStore.getState().addRecentFile({
      id: 'test-id-2',
      title: 'Test Document 2.md',
      isCloud: false,
    });
    
    expect(useStore.getState().recentFiles).toHaveLength(2);
    
    // Remove one file
    useStore.getState().removeRecentFile('test-id-1');
    
    const recentFiles = useStore.getState().recentFiles;
    expect(recentFiles).toHaveLength(1);
    expect(recentFiles[0].id).toBe('test-id-2');
  });

  it('should handle removing non-existent file gracefully', async () => {
    const { useStore } = await import('../store');
    
    // Clear existing recent files
    useStore.setState({ recentFiles: [] });
    
    // Add a file
    useStore.getState().addRecentFile({
      id: 'test-id-1',
      title: 'Test Document.md',
      isCloud: false,
    });
    
    // Try to remove non-existent file
    useStore.getState().removeRecentFile('non-existent-id');
    
    // Should still have the original file
    expect(useStore.getState().recentFiles).toHaveLength(1);
  });
});

describe('Store - checkGrammar', () => {
  let mockGrammarService: any;
  let mockEditor: any;
  let mockMonaco: any;

  beforeEach(() => {
    // Ensure window exists
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }

    // Create mock grammar service
    mockGrammarService = {
      checkGrammar: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock editor
    mockEditor = {
      getModel: vi.fn(() => ({})),
    };

    // Create mock Monaco
    mockMonaco = {};

  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call checkGrammar only once when grammarService exists', async () => {
    const { useStore } = await import('../store');
    
    const store = useStore.getState();
    
    // Create a test tab
    store.createNewDocument();
    const tabs = store.tabs;
    const testTab = tabs[0];
    
    if (testTab) {
      store.setActiveTab(testTab.id);
      store.updateTabContent(testTab.id, '# Test Document\n\nThis is a test.');
      
      // Call checkGrammar with editor, monaco, and grammarService
      await store.checkGrammar({
        editor: mockEditor as any,
        monaco: mockMonaco as any,
        grammarService: mockGrammarService,
      });
      
      // Verify checkGrammar was called exactly once
      expect(mockGrammarService.checkGrammar).toHaveBeenCalledTimes(1);
    }
  });

  it('should show error toast when editor is not available', async () => {
    // Get fresh store instance
    const { useStore } = await import('../store');
    const store = useStore.getState();
    
    // Clear any existing toasts first
    store.toasts.forEach(toast => store.removeToast(toast.id));
    
    // Create a test tab first - createNewDocument creates 'Untitled.md' which is a markdown file
    store.createNewDocument();
    const tabs = store.tabs;
    const testTab = tabs[0];
    
    expect(testTab).toBeDefined();
    
    // Ensure the tab language is set to markdown (createNewDocument should already do this)
    store.updateTabLanguage(testTab.id, 'markdown');
    store.setActiveTab(testTab.id);
    store.updateTabContent(testTab.id, '# Test Document\n\nThis is a test.');
    
    // Verify the tab is set up correctly before calling checkGrammar
    expect(store.activeTabId).toBe(testTab.id);
    const activeTabBefore = store.tabs.find(t => t.id === store.activeTabId);
    expect(activeTabBefore).toBeDefined();
    expect(activeTabBefore?.language).toBe('markdown');
    expect(activeTabBefore?.title).toMatch(/\.md$/);
    
    // Call checkGrammar without editor - should show error because editor is not available
    await store.checkGrammar();
    
    // Get fresh state after checkGrammar (Zustand state might need to be re-read)
    const finalState = useStore.getState();
    const toasts = finalState.toasts;
    
    // Verify error toast was shown (check the last toast)
    expect(toasts.length).toBeGreaterThan(0);
    const lastToast = toasts[toasts.length - 1];
    expect(lastToast).toBeDefined();
    expect(lastToast?.type).toBe('error');
    expect(lastToast?.message).toBe('Editor not available');
  });
});

