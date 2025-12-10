import { useEffect, useCallback, lazy, Suspense } from 'react';
import { useStore } from './store';
import { MenuBar } from './components/MenuBar';
import { Layout } from './components/Layout';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isElectron, isMacOS } from './utils/platform';
import { useKeyboardShortcuts, useOnlineStatus } from './hooks';
import { getLanguageFromExtension } from './utils/language';

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
const ConfirmationModal = lazy(() => import('./components/ConfirmationModal').then(m => ({ default: m.ConfirmationModal })));

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
    confirmation,
    clearConfirmation,
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
    
    Promise.all(
      Array.from(files).map(async (file) => {
        try {
          // Handle .docx files
          if (file.name.endsWith('.docx')) {
            await importDocxFile(file);
            return;
          }
          
          // Check if it's a text file
          if (file.type.startsWith('text/') || 
              file.name.match(/\.(md|mdx|txt|js|ts|jsx|tsx|json|html|css|py|go|rs|java|c|cpp|h|rb|php|sql|yaml|yml|xml|sh)$/i)) {
            const content = await file.text();
            const ext = file.name.split('.').pop();
            
            openTab({
              title: file.name,
              content,
              language: getLanguageFromExtension(ext),
            });
          } else {
            addToast({ type: 'warning', message: `Unsupported file type: ${file.name}` });
          }
        } catch (error) {
          addToast({ type: 'error', message: `Failed to process ${file.name}` });
        }
      })
    );
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
  useKeyboardShortcuts();
  useOnlineStatus();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  
  // Check if running in Electron - only show web menu bar in browser
  const inElectron = isElectron();
  const showMenuBar = !zenMode && !inElectron;
  
  // Add padding for macOS traffic lights when in Electron with hidden title bar
  const needsTrafficLightPadding = inElectron && isMacOS();

  return (
    <ErrorBoundary>
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
        {confirmation && (
          <ConfirmationModal
            title={confirmation.title}
            message={confirmation.message}
            confirmLabel={confirmation.confirmLabel}
            cancelLabel={confirmation.cancelLabel}
            variant={confirmation.variant}
            onConfirm={() => {
              confirmation.onConfirm();
            }}
            onCancel={clearConfirmation}
          />
        )}
      </Suspense>
      
      <Toast />
      </div>
    </ErrorBoundary>
  );
}

