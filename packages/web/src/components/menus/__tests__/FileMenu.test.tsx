import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFileMenuItems, MenuItem } from '../FileMenu';

// Mock the store
vi.mock('../../../store', () => ({
  useStore: {
    getState: vi.fn(() => ({
      createNewDocument: vi.fn(),
      saveCurrentDocument: vi.fn(),
      activeTabId: 'tab-1',
      saveDocumentToCloud: vi.fn(),
      tabs: [
        { id: 'tab-1', title: 'Test Doc', content: 'Hello' },
      ],
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      recentFiles: [
        { id: 'recent-1', title: 'Recent 1', isCloud: false, path: '/path/to/file.md' },
        { id: 'recent-2', title: 'Recent 2', isCloud: true, documentId: 'doc-123' },
      ],
      openCloudDocument: vi.fn(),
      removeRecentFile: vi.fn(),
      isAuthenticated: true,
      importDocxFile: vi.fn(),
      openTab: vi.fn(),
      addToast: vi.fn(),
      setShowImportDocx: vi.fn(),
      setShowExportPdf: vi.fn(),
      setShowExportDocx: vi.fn(),
      setShowExport: vi.fn(),
    })),
  },
}));

// Mock platform utility - default to false (not Electron)
vi.mock('../../../utils/platform', () => ({
  isElectron: vi.fn(() => false),
}));

import { isElectron } from '../../../utils/platform';
import { useStore } from '../../../store';

describe('FileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFileMenuItems', () => {
    it('should return menu items array', () => {
      const items = getFileMenuItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('should include New Document item', () => {
      const items = getFileMenuItems();
      const newItem = items.find(item => item.id === 'new');
      expect(newItem).toBeDefined();
      expect(newItem?.label).toBe('New Document');
      expect(newItem?.shortcut).toBe('⌘N');
    });

    it('should include Open item', () => {
      const items = getFileMenuItems();
      const openItem = items.find(item => item.id === 'open');
      expect(openItem).toBeDefined();
      expect(openItem?.label).toBe('Open...');
      expect(openItem?.shortcut).toBe('⌘O');
    });

    it('should include Save item', () => {
      const items = getFileMenuItems();
      const saveItem = items.find(item => item.id === 'save');
      expect(saveItem).toBeDefined();
      expect(saveItem?.label).toBe('Save');
      expect(saveItem?.shortcut).toBe('⌘S');
    });

    it('should include Save to Cloud item', () => {
      const items = getFileMenuItems();
      const cloudItem = items.find(item => item.id === 'save-cloud');
      expect(cloudItem).toBeDefined();
      expect(cloudItem?.label).toBe('Save to Cloud');
    });

    it('should include Save As item', () => {
      const items = getFileMenuItems();
      const saveAsItem = items.find(item => item.id === 'save-as');
      expect(saveAsItem).toBeDefined();
      expect(saveAsItem?.label).toBe('Save As...');
      expect(saveAsItem?.shortcut).toBe('⌘⇧S');
    });

    it('should include Revert to Last Saved item', () => {
      const items = getFileMenuItems();
      const revertItem = items.find(item => item.id === 'revert');
      expect(revertItem).toBeDefined();
      expect(revertItem?.label).toBe('Revert to Last Saved');
    });

    it('should include Import from Word item', () => {
      const items = getFileMenuItems();
      const importItem = items.find(item => item.id === 'import-docx');
      expect(importItem).toBeDefined();
      expect(importItem?.label).toBe('Import from Word (.docx)');
    });

    it('should include export items', () => {
      const items = getFileMenuItems();
      const pdfItem = items.find(item => item.id === 'export-pdf');
      const docxItem = items.find(item => item.id === 'export-docx');
      const htmlItem = items.find(item => item.id === 'export-html');
      
      expect(pdfItem).toBeDefined();
      expect(pdfItem?.label).toBe('Export as PDF');
      
      expect(docxItem).toBeDefined();
      expect(docxItem?.label).toBe('Export as Word (.docx)');
      
      expect(htmlItem).toBeDefined();
      expect(htmlItem?.label).toBe('Export as HTML');
    });

    it('should include Close Tab item', () => {
      const items = getFileMenuItems();
      const closeItem = items.find(item => item.id === 'close');
      expect(closeItem).toBeDefined();
      expect(closeItem?.label).toBe('Close Tab');
      expect(closeItem?.shortcut).toBe('⌘W');
    });

    it('should not include Open Recent in web mode', () => {
      vi.mocked(isElectron).mockReturnValue(false);
      const items = getFileMenuItems();
      const recentItem = items.find(item => item.id === 'recent');
      expect(recentItem).toBeUndefined();
    });

    it('should include Open Recent in Electron mode', () => {
      vi.mocked(isElectron).mockReturnValue(true);
      const items = getFileMenuItems();
      const recentItem = items.find(item => item.id === 'recent');
      expect(recentItem).toBeDefined();
      expect(recentItem?.label).toBe('Open Recent');
      expect(recentItem?.submenu).toBeDefined();
    });

    it('should include separators', () => {
      const items = getFileMenuItems();
      const separators = items.filter(item => item.separator);
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Menu item actions', () => {
    it('should call createNewDocument when New Document is clicked', () => {
      const mockCreate = vi.fn();
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        createNewDocument: mockCreate,
      });
      
      const items = getFileMenuItems();
      const newItem = items.find(item => item.id === 'new');
      newItem?.action?.();
      
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should call saveCurrentDocument when Save is clicked', () => {
      const mockSave = vi.fn();
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        saveCurrentDocument: mockSave,
      });
      
      const items = getFileMenuItems();
      const saveItem = items.find(item => item.id === 'save');
      saveItem?.action?.();
      
      expect(mockSave).toHaveBeenCalled();
    });

    it('should call closeTab when Close Tab is clicked', () => {
      const mockClose = vi.fn();
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        closeTab: mockClose,
        activeTabId: 'tab-123',
        tabs: [{ id: 'tab-123' }],
      });
      
      const items = getFileMenuItems();
      const closeItem = items.find(item => item.id === 'close');
      closeItem?.action?.();
      
      expect(mockClose).toHaveBeenCalledWith('tab-123');
    });

    it('should call revertToSaved when Revert to Last Saved is clicked', () => {
      const mockRevert = vi.fn();
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        revertToSaved: mockRevert,
        activeTabId: 'tab-123',
        tabs: [{ id: 'tab-123', hasSavedVersion: true, isDirty: true }],
      });
      
      const items = getFileMenuItems();
      const revertItem = items.find(item => item.id === 'revert');
      revertItem?.action?.();
      
      expect(mockRevert).toHaveBeenCalledWith('tab-123');
    });
  });

  describe('Menu item disabled states', () => {
    it('should disable Save when no active tab', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: null,
        tabs: [],
      });
      
      const items = getFileMenuItems();
      const saveItem = items.find(item => item.id === 'save');
      expect(saveItem?.disabled).toBe(true);
    });

    it('should disable Save to Cloud when not authenticated', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        isAuthenticated: false,
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1' }],
      });
      
      const items = getFileMenuItems();
      const cloudItem = items.find(item => item.id === 'save-cloud');
      expect(cloudItem?.disabled).toBe(true);
    });

    it('should disable Close Tab when no active tab', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: null,
        tabs: [],
      });
      
      const items = getFileMenuItems();
      const closeItem = items.find(item => item.id === 'close');
      expect(closeItem?.disabled).toBe(true);
    });

    it('should disable export items when no active tab', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: null,
        tabs: [],
      });
      
      const items = getFileMenuItems();
      const pdfItem = items.find(item => item.id === 'export-pdf');
      const docxItem = items.find(item => item.id === 'export-docx');
      const htmlItem = items.find(item => item.id === 'export-html');
      
      expect(pdfItem?.disabled).toBe(true);
      expect(docxItem?.disabled).toBe(true);
      expect(htmlItem?.disabled).toBe(true);
    });

    it('should disable Revert to Last Saved when no active tab', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: null,
        tabs: [],
      });
      
      const items = getFileMenuItems();
      const revertItem = items.find(item => item.id === 'revert');
      expect(revertItem?.disabled).toBe(true);
    });

    it('should disable Revert to Last Saved when tab has no saved version', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1', hasSavedVersion: false, isDirty: true }],
      });
      
      const items = getFileMenuItems();
      const revertItem = items.find(item => item.id === 'revert');
      expect(revertItem?.disabled).toBe(true);
    });

    it('should disable Revert to Last Saved when tab is not dirty', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1', hasSavedVersion: true, isDirty: false }],
      });
      
      const items = getFileMenuItems();
      const revertItem = items.find(item => item.id === 'revert');
      expect(revertItem?.disabled).toBe(true);
    });

    it('should enable Revert to Last Saved when tab has saved version and is dirty', () => {
      vi.mocked(useStore.getState).mockReturnValue({
        ...vi.mocked(useStore.getState)(),
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1', hasSavedVersion: true, isDirty: true }],
      });
      
      const items = getFileMenuItems();
      const revertItem = items.find(item => item.id === 'revert');
      expect(revertItem?.disabled).toBe(false);
    });
  });
});
