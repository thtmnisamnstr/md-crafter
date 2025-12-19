import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MenuBar } from '../MenuBar';
import { useStore } from '../../store';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from '../../__tests__/mocks/editor-context';

// Mock platform utilities
vi.mock('../../utils/platform', () => ({
  isElectron: vi.fn(() => false),
  isMac: () => true,
  isWindows: () => false,
  isLinux: () => false,
  getModifierKey: () => '⌘',
}));

// Mock the store
const mockStore = {
  tabs: [],
  activeTabId: null,
  createNewDocument: vi.fn(),
  saveCurrentDocument: vi.fn(),
  saveDocumentToCloud: vi.fn(),
  closeTab: vi.fn(),
  setActiveTab: vi.fn(),
  toggleSidebar: vi.fn(),
  togglePreview: vi.fn(),
  toggleZenMode: vi.fn(),
  showSidebar: true,
  showPreview: false,
  zenMode: false,
  setShowCommandPalette: vi.fn(),
  setShowSettings: vi.fn(),
  setTheme: vi.fn(),
  theme: 'dark',
  recentFiles: [],
  openCloudDocument: vi.fn(),
  removeRecentFile: vi.fn(),
  isAuthenticated: false,
  setShowImportDocx: vi.fn(),
  setShowExportDocx: vi.fn(),
  setShowExportPdf: vi.fn(),
  setShowExport: vi.fn(),
  copyForWordDocs: vi.fn(),
  pasteFromWordDocs: vi.fn(),
  formatDocument: vi.fn(),
  checkGrammar: vi.fn(),
  setShowAbout: vi.fn(),
  setShowShortcuts: vi.fn(),
  setSplitMode: vi.fn(),
  splitMode: 'none' as const,
  setDiffMode: vi.fn(),
  exitDiffMode: vi.fn(),
  diffMode: { enabled: false },
  importDocxFile: vi.fn(),
  openTab: vi.fn(),
  addToast: vi.fn(),
};

vi.mock('../../store', () => ({
  useStore: Object.assign(vi.fn(() => mockStore), {
    getState: () => mockStore,
  }),
}));

describe('MenuBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockStore to default values
    Object.assign(mockStore, {
      tabs: [],
      activeTabId: null,
      recentFiles: [],
      isAuthenticated: false,
      showSidebar: true,
      showPreview: false,
      zenMode: false,
      theme: 'dark',
      splitMode: 'none' as const,
    });
  });

  afterEach(() => {
    cleanup();
  });

  const mockEditor = createMockEditor();
  const mockMonaco = createMockMonaco();

  it('should render menu bar', () => {
    const { container } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <MenuBar />
      </MockEditorContextProvider>
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    const buttonTexts = buttons.map(btn => btn.textContent || '');
    expect(buttonTexts.some(text => text.includes('File'))).toBe(true);
    expect(buttonTexts.some(text => text.includes('Edit'))).toBe(true);
    expect(buttonTexts.some(text => text.includes('View'))).toBe(true);
    expect(buttonTexts.some(text => text.includes('Help'))).toBe(true);
  });

  it('should open File menu on click', () => {
    const { container, getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <MenuBar />
      </MockEditorContextProvider>
    );
    const fileButton = Array.from(container.querySelectorAll('button')).find(btn => btn.textContent === 'File');
    expect(fileButton).toBeTruthy();
    if (fileButton) {
      fireEvent.click(fileButton);
      expect(getByText('New Document')).toBeTruthy();
    }
  });

  it('should call createNewDocument when New Document is clicked', () => {
    const { container, getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <MenuBar />
      </MockEditorContextProvider>
    );
    const fileButton = Array.from(container.querySelectorAll('button')).find(btn => btn.textContent === 'File');
    expect(fileButton).toBeTruthy();
    if (fileButton) {
      fireEvent.click(fileButton);
      const newDocButton = getByText('New Document');
      fireEvent.click(newDocButton);
      expect(mockStore.createNewDocument).toHaveBeenCalled();
    }
  });

  it('should show recent files in Open Recent submenu', async () => {
    // Mock isElectron to return true for this test
    const { isElectron } = await import('../../utils/platform');
    vi.mocked(isElectron).mockReturnValue(true);
    
    Object.assign(mockStore, {
      recentFiles: [
        {
          id: 'recent-1',
          title: 'Recent File.md',
          isCloud: false,
          lastOpened: Date.now(),
        },
      ],
    });
    const { container, getByText } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <MenuBar />
      </MockEditorContextProvider>
    );
    const fileButton = Array.from(container.querySelectorAll('button')).find(btn => btn.textContent === 'File');
    expect(fileButton).toBeTruthy();
    if (fileButton) {
      fireEvent.click(fileButton);
      const openRecent = getByText('Open Recent');
      fireEvent.mouseEnter(openRecent);
      expect(getByText('Recent File.md')).toBeTruthy();
    }
    
    // Reset mock
    vi.mocked(isElectron).mockReturnValue(false);
  });
});

