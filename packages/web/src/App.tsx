import { useEffect, useCallback, lazy, Suspense } from 'react';
import { useStore } from './store';
import { MenuBar } from './components/MenuBar';
import { Layout } from './components/Layout';
import { Toast } from './components/Toast';
import { isElectron, isMacOS } from './utils/platform';

// Lazy load modal components for better initial load performance
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ConflictModal = lazy(() => import('./components/ConflictModal').then(m => ({ default: m.ConflictModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ExportModal = lazy(() => import('./components/ExportModal').then(m => ({ default: m.ExportModal })));
const ImportDocxModal = lazy(() => import('./components/ImportDocxModal').then(m => ({ default: m.ImportDocxModal })));
const ExportDocxModal = lazy(() => import('./components/ExportDocxModal').then(m => ({ default: m.ExportDocxModal })));
const PrintView = lazy(() => import('./components/PrintView').then(m => ({ default: m.PrintView })));
const AboutModal = lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })));
const ShortcutsModal = lazy(() => import('./components/ShortcutsModal').then(m => ({ default: m.ShortcutsModal })));
const GoogleImportModal = lazy(() => import('./components/GoogleImportModal').then(m => ({ default: m.GoogleImportModal })));
const GoogleExportModal = lazy(() => import('./components/GoogleExportModal').then(m => ({ default: m.GoogleExportModal })));
const SearchModal = lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));

export default function App() {
  const { 
    theme, 
    showCommandPalette, 
    showSettings, 
    showAuth,
    showExport,
    setShowExport,
    showImportDocx,
    setShowImportDocx,
    showExportDocx,
    setShowExportDocx,
    showExportPdf,
    setShowExportPdf,
    showAbout,
    setShowAbout,
    showShortcuts,
    setShowShortcuts,
    showGoogleImport,
    setShowGoogleImport,
    showGoogleExport,
    setShowGoogleExport,
    showSearch,
    setShowSearch,
    conflict,
    initializeApp,
    openTab,
    addToast,
    zenMode,
    tabs,
    activeTabId,
    importDocxFile,
  } = useStore();

  // Handle drag and drop files
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (!files) return;
    
    Array.from(files).forEach(async (file) => {
      // Handle .docx files
      if (file.name.endsWith('.docx')) {
        try {
          await importDocxFile(file);
        } catch (error) {
          addToast({ type: 'error', message: `Failed to import ${file.name}` });
        }
        return;
      }
      
      // Check if it's a text file
      if (file.type.startsWith('text/') || 
          file.name.match(/\.(md|mdx|txt|js|ts|jsx|tsx|json|html|css|py|go|rs|java|c|cpp|h|rb|php|sql|yaml|yml|xml|sh)$/i)) {
        try {
          const content = await file.text();
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          const languageMap: Record<string, string> = {
            md: 'markdown',
            mdx: 'mdx',
            markdown: 'markdown',
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            json: 'json',
            html: 'html',
            css: 'css',
            py: 'python',
            go: 'go',
            rs: 'rust',
            java: 'java',
            c: 'c',
            cpp: 'cpp',
            h: 'cpp',
            rb: 'ruby',
            php: 'php',
            sql: 'sql',
            yaml: 'yaml',
            yml: 'yaml',
            xml: 'xml',
            sh: 'shell',
          };
          
          openTab({
            title: file.name,
            content,
            language: languageMap[ext] || 'plaintext',
          });
        } catch (error) {
          addToast({ type: 'error', message: `Failed to read ${file.name}` });
        }
      } else {
        addToast({ type: 'warning', message: `Unsupported file type: ${file.name}` });
      }
    });
  }, [openTab, addToast, importDocxFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Setup drag and drop
  useEffect(() => {
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);
    
    return () => {
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [handleDrop, handleDragOver]);

  useEffect(() => {
    // Apply theme class to root element
    document.documentElement.className = theme;
  }, [theme]);

  // Setup Electron native menu event listeners
  useEffect(() => {
    if (!isElectron()) return;
    
    // Get the api from the window object (exposed by preload)
    const api = (window as Window & { api?: {
      onMenuNewFile: (cb: () => void) => () => void;
      onMenuSave: (cb: () => void) => () => void;
      onMenuSaveToCloud: (cb: () => void) => () => void;
      onMenuCloseTab: (cb: () => void) => () => void;
      onMenuToggleSidebar: (cb: () => void) => () => void;
      onMenuTogglePreview: (cb: () => void) => () => void;
      onMenuCommandPalette: (cb: () => void) => () => void;
      onMenuSettings: (cb: () => void) => () => void;
      onMenuFind: (cb: () => void) => () => void;
      onMenuReplace: (cb: () => void) => () => void;
      onMenuCopyForWord: (cb: () => void) => () => void;
      onMenuPasteFromWord: (cb: () => void) => () => void;
      onMenuExportPdf: (cb: () => void) => () => void;
      onMenuExportWord: (cb: () => void) => () => void;
      onMenuExportHtml: (cb: () => void) => () => void;
      onMenuImportWord: (cb: () => void) => () => void;
      onMenuImportGoogleDoc: (cb: () => void) => () => void;
      onMenuExportGoogleDrive: (cb: () => void) => () => void;
      onMenuZenMode: (cb: () => void) => () => void;
      onMenuSplitVertical: (cb: () => void) => () => void;
      onMenuSplitHorizontal: (cb: () => void) => () => void;
      onMenuNoSplit: (cb: () => void) => () => void;
      onMenuAbout: (cb: () => void) => () => void;
      onMenuShortcuts: (cb: () => void) => () => void;
      onMenuSearch: (cb: () => void) => () => void;
    } }).api;
    
    if (!api) return;
    
    const cleanups: (() => void)[] = [];
    
    // File menu actions
    if (api.onMenuNewFile) {
      cleanups.push(api.onMenuNewFile(() => useStore.getState().createNewDocument()));
    }
    if (api.onMenuSave) {
      cleanups.push(api.onMenuSave(() => useStore.getState().saveCurrentDocument()));
    }
    if (api.onMenuSaveToCloud) {
      cleanups.push(api.onMenuSaveToCloud(() => {
        const { activeTabId } = useStore.getState();
        if (activeTabId) useStore.getState().saveDocumentToCloud(activeTabId);
      }));
    }
    if (api.onMenuCloseTab) {
      cleanups.push(api.onMenuCloseTab(() => {
        const { activeTabId, closeTab } = useStore.getState();
        if (activeTabId) closeTab(activeTabId);
      }));
    }
    
    // View menu actions
    if (api.onMenuToggleSidebar) {
      cleanups.push(api.onMenuToggleSidebar(() => useStore.getState().toggleSidebar()));
    }
    if (api.onMenuTogglePreview) {
      cleanups.push(api.onMenuTogglePreview(() => useStore.getState().togglePreview()));
    }
    if (api.onMenuCommandPalette) {
      cleanups.push(api.onMenuCommandPalette(() => useStore.getState().setShowCommandPalette(true)));
    }
    if (api.onMenuSettings) {
      cleanups.push(api.onMenuSettings(() => useStore.getState().setShowSettings(true)));
    }
    if (api.onMenuZenMode) {
      cleanups.push(api.onMenuZenMode(() => useStore.getState().toggleZenMode()));
    }
    if (api.onMenuSplitVertical) {
      cleanups.push(api.onMenuSplitVertical(() => useStore.getState().setSplitMode('vertical')));
    }
    if (api.onMenuSplitHorizontal) {
      cleanups.push(api.onMenuSplitHorizontal(() => useStore.getState().setSplitMode('horizontal')));
    }
    if (api.onMenuNoSplit) {
      cleanups.push(api.onMenuNoSplit(() => useStore.getState().setSplitMode('none')));
    }
    
    // Edit menu - Copy/Paste for Word
    if (api.onMenuCopyForWord) {
      cleanups.push(api.onMenuCopyForWord(() => useStore.getState().copyForWordDocs()));
    }
    if (api.onMenuPasteFromWord) {
      cleanups.push(api.onMenuPasteFromWord(() => useStore.getState().pasteFromWordDocs()));
    }
    
    // Export actions
    if (api.onMenuExportPdf) {
      cleanups.push(api.onMenuExportPdf(() => useStore.getState().setShowExportPdf(true)));
    }
    if (api.onMenuExportWord) {
      cleanups.push(api.onMenuExportWord(() => useStore.getState().setShowExportDocx(true)));
    }
    if (api.onMenuExportHtml) {
      cleanups.push(api.onMenuExportHtml(() => useStore.getState().setShowExport(true)));
    }
    if (api.onMenuImportWord) {
      cleanups.push(api.onMenuImportWord(() => useStore.getState().setShowImportDocx(true)));
    }
    if (api.onMenuImportGoogleDoc) {
      cleanups.push(api.onMenuImportGoogleDoc(() => useStore.getState().setShowGoogleImport(true)));
    }
    if (api.onMenuExportGoogleDrive) {
      cleanups.push(api.onMenuExportGoogleDrive(() => useStore.getState().setShowGoogleExport(true)));
    }
    
    // Search
    if (api.onMenuSearch) {
      cleanups.push(api.onMenuSearch(() => useStore.getState().setShowSearch(true)));
    }
    
    // Help menu actions
    if (api.onMenuAbout) {
      cleanups.push(api.onMenuAbout(() => useStore.getState().setShowAbout(true)));
    }
    if (api.onMenuShortcuts) {
      cleanups.push(api.onMenuShortcuts(() => useStore.getState().setShowShortcuts(true)));
    }
    
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl/Cmd + Shift + P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowCommandPalette(true);
        return;
      }
      
      // Print/PDF Export: Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowExportPdf(true);
        return;
      }
      
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        useStore.getState().saveCurrentDocument();
        return;
      }
      
      // Save As: Ctrl/Cmd + Shift + S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        // Save As downloads the file
        const { tabs, activeTabId } = useStore.getState();
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
          const blob = new Blob([tab.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = tab.title;
          a.click();
          URL.revokeObjectURL(url);
        }
        return;
      }
      
      // New document: Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        useStore.getState().createNewDocument();
        return;
      }
      
      // Close tab: Ctrl/Cmd + W
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const activeTab = useStore.getState().activeTabId;
        if (activeTab) {
          useStore.getState().closeTab(activeTab);
        }
        return;
      }
      
      // Toggle sidebar: Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        useStore.getState().toggleSidebar();
        return;
      }
      
      // Settings: Ctrl/Cmd + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useStore.getState().setShowSettings(true);
        return;
      }
      
      // Export HTML: Ctrl/Cmd + E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        useStore.getState().setShowExport(true);
        return;
      }
      
      // Copy for Word/Docs: Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        useStore.getState().copyForWordDocs();
        return;
      }
      
      // Paste from Word/Docs: Ctrl/Cmd + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        useStore.getState().pasteFromWordDocs();
        return;
      }
      
      // Global search: Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        useStore.getState().setShowSearch(true);
        return;
      }
      
      // Split editor vertical: Ctrl/Cmd + \
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '\\') {
        e.preventDefault();
        const { splitMode, setSplitMode } = useStore.getState();
        setSplitMode(splitMode === 'vertical' ? 'none' : 'vertical');
        return;
      }
      
      // Split editor horizontal: Ctrl/Cmd + Shift + \
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '|') {
        e.preventDefault();
        const { splitMode, setSplitMode } = useStore.getState();
        setSplitMode(splitMode === 'horizontal' ? 'none' : 'horizontal');
        return;
      }
      
      // Zen mode: Ctrl/Cmd + K, Z (VS Code style)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // Wait for next key
        const handleZenKey = (e2: KeyboardEvent) => {
          if (e2.key === 'z') {
            e2.preventDefault();
            useStore.getState().toggleZenMode();
          }
          window.removeEventListener('keydown', handleZenKey);
        };
        window.addEventListener('keydown', handleZenKey);
        setTimeout(() => window.removeEventListener('keydown', handleZenKey), 500);
        return;
      }
      
      // Escape to exit Zen mode
      if (e.key === 'Escape' && useStore.getState().zenMode) {
        useStore.getState().toggleZenMode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  
  // Check if running in Electron - only show web menu bar in browser
  const inElectron = isElectron();
  const showMenuBar = !zenMode && !inElectron;
  
  // Add padding for macOS traffic lights when in Electron with hidden title bar
  const needsTrafficLightPadding = inElectron && isMacOS();

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--editor-bg)' }}>
      {/* Show web menu bar only when not in Electron (Electron uses native menu) */}
      {showMenuBar && <MenuBar />}
      
      {/* Main content with optional padding for macOS traffic lights */}
      <div 
        className="flex-1 overflow-hidden"
        style={needsTrafficLightPadding ? { paddingTop: '28px' } : undefined}
      >
        <Layout />
      </div>
      
      {/* Lazy-loaded modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {showCommandPalette && <CommandPalette />}
        {showSettings && <SettingsModal />}
        {showAuth && <AuthModal />}
        {showExport && <ExportModal onClose={() => setShowExport(false)} />}
        {showImportDocx && <ImportDocxModal onClose={() => setShowImportDocx(false)} />}
        {showExportDocx && <ExportDocxModal onClose={() => setShowExportDocx(false)} />}
        {showExportPdf && activeTab && (
          <PrintView
            content={activeTab.content}
            title={activeTab.title}
            onClose={() => setShowExportPdf(false)}
          />
        )}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
        {showGoogleImport && <GoogleImportModal onClose={() => setShowGoogleImport(false)} />}
        {showGoogleExport && <GoogleExportModal onClose={() => setShowGoogleExport(false)} />}
        {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
        {conflict && <ConflictModal />}
      </Suspense>
      
      <Toast />
    </div>
  );
}

