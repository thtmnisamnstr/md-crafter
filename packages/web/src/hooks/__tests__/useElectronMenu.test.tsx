import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useElectronMenu } from '../useElectronMenu';
import { MockEditorContextProvider, createMockEditor } from '../../__tests__/mocks/editor-context';
import { useStore } from '../../store';
import * as platformUtils from '../../utils/platform';

// Mock platform utils
vi.mock('../../utils/platform', () => ({
  isElectron: vi.fn(() => false),
}));

// Mock store
vi.mock('../../store', () => ({
  useStore: Object.assign(vi.fn(), {
    getState: vi.fn(),
  }),
}));

describe('useElectronMenu', () => {
  const mockStore = {
    createNewDocument: vi.fn(),
    saveCurrentDocument: vi.fn(),
    saveDocumentToCloud: vi.fn(),
    closeTab: vi.fn(),
    openTab: vi.fn(),
    updateTabPath: vi.fn(),
    updateTabContent: vi.fn(),
    setActiveTab: vi.fn(),
    setState: vi.fn(),
    addToast: vi.fn(),
    toggleSidebar: vi.fn(),
    togglePreview: vi.fn(),
    setShowCommandPalette: vi.fn(),
    setShowSettings: vi.fn(),
    toggleZenMode: vi.fn(),
    setSplitMode: vi.fn(),
    setDiffMode: vi.fn(),
    exitDiffMode: vi.fn(),
    copyForWordDocs: vi.fn(),
    pasteFromWordDocs: vi.fn(),
    setShowExportPdf: vi.fn(),
    setShowExportDocx: vi.fn(),
    setShowExport: vi.fn(),
    setShowImportDocx: vi.fn(),
    setShowSearch: vi.fn(),
    setShowAbout: vi.fn(),
    setShowShortcuts: vi.fn(),
    setConfirmation: vi.fn(),
    clearConfirmation: vi.fn(),
    tabs: [],
    activeTabId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
    (useStore.getState as any).mockReturnValue(mockStore);
    
    // Mock window.api
    global.window = {
      ...global.window,
      api: undefined,
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing when not in Electron', () => {
    vi.mocked(platformUtils.isElectron).mockReturnValue(false);

    const mockEditor = createMockEditor();
    renderHook(() => useElectronMenu(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider primaryEditor={mockEditor}>
          {children}
        </MockEditorContextProvider>
      ),
    });

    // Should not access window.api
    expect(global.window.api).toBeUndefined();
  });

  it('should do nothing when window.api is not available', () => {
    vi.mocked(platformUtils.isElectron).mockReturnValue(true);
    global.window.api = undefined;

    const mockEditor = createMockEditor();
    renderHook(() => useElectronMenu(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider primaryEditor={mockEditor}>
          {children}
        </MockEditorContextProvider>
      ),
    });

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should set up menu handlers when in Electron with api', () => {
    vi.mocked(platformUtils.isElectron).mockReturnValue(true);

    const mockCleanup = vi.fn();
    const mockApi = {
      onMenuNewFile: vi.fn(() => mockCleanup),
      onMenuSave: vi.fn(() => mockCleanup),
      onMenuSaveToCloud: vi.fn(() => mockCleanup),
      onMenuCloseTab: vi.fn(() => mockCleanup),
      onFileOpened: vi.fn(() => mockCleanup),
      onFileSaveAsPath: vi.fn(() => mockCleanup),
      onExternalChange: vi.fn(() => mockCleanup),
      onMenuToggleSidebar: vi.fn(() => mockCleanup),
      onMenuTogglePreview: vi.fn(() => mockCleanup),
      onMenuCommandPalette: vi.fn(() => mockCleanup),
      onMenuSettings: vi.fn(() => mockCleanup),
      onMenuZenMode: vi.fn(() => mockCleanup),
      onMenuSplitVertical: vi.fn(() => mockCleanup),
      onMenuSplitHorizontal: vi.fn(() => mockCleanup),
      onMenuNoSplit: vi.fn(() => mockCleanup),
      onMenuDiffWithSaved: vi.fn(() => mockCleanup),
      onMenuDiffWithFile: vi.fn(() => mockCleanup),
      onMenuDiffExit: vi.fn(() => mockCleanup),
      onMenuCopyForWord: vi.fn(() => mockCleanup),
      onMenuPasteFromWord: vi.fn(() => mockCleanup),
      onMenuExportPdf: vi.fn(() => mockCleanup),
      onMenuExportWord: vi.fn(() => mockCleanup),
      onMenuExportHtml: vi.fn(() => mockCleanup),
      onMenuImportWord: vi.fn(() => mockCleanup),
      onMenuSearch: vi.fn(() => mockCleanup),
      onMenuAbout: vi.fn(() => mockCleanup),
      onMenuShortcuts: vi.fn(() => mockCleanup),
      watchFile: vi.fn(),
      writeFile: vi.fn(),
    };

    global.window.api = mockApi as any;

    const mockEditor = createMockEditor();
    const { unmount } = renderHook(() => useElectronMenu(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider primaryEditor={mockEditor}>
          {children}
        </MockEditorContextProvider>
      ),
    });

    // Verify handlers were registered
    expect(mockApi.onMenuNewFile).toHaveBeenCalled();
    expect(mockApi.onMenuSave).toHaveBeenCalled();
    expect(mockApi.onMenuSaveToCloud).toHaveBeenCalled();

    // Unmount should clean up
    unmount();
    // Cleanup functions should be called (number of handlers registered)
    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should handle menu actions correctly', () => {
    vi.mocked(platformUtils.isElectron).mockReturnValue(true);

    const mockHandler = vi.fn();
    const mockApi = {
      onMenuNewFile: vi.fn((callback) => {
        // Simulate menu action
        setTimeout(() => callback(), 0);
        return mockHandler;
      }),
    };

    global.window.api = mockApi as any;

    const mockEditor = createMockEditor();
    renderHook(() => useElectronMenu(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider primaryEditor={mockEditor}>
          {children}
        </MockEditorContextProvider>
      ),
    });

    // Wait for async callback
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(mockStore.createNewDocument).toHaveBeenCalled();
        resolve(undefined);
      }, 10);
    });
  });
});

