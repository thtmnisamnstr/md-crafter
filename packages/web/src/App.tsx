import { useEffect, useCallback, lazy, Suspense } from 'react';
import { useStore } from './store';
import { MenuBar } from './components/MenuBar';
import { Layout } from './components/Layout';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EditorContextProvider } from './contexts/EditorContext';
import { isElectron, isMacOS } from './utils/platform';
import { useKeyboardShortcuts, useOnlineStatus, useElectronMenu } from './hooks';
import { getLanguageFromExtension } from './utils/language';
import { ConfirmationModal } from './components/ConfirmationModal';

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
const SearchModal = lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const GrammarReviewModal = lazy(() => import('./components/GrammarReviewModal').then(m => ({ default: m.GrammarReviewModal })));
const DictionaryModal = lazy(() => import('./components/DictionaryModal').then(m => ({ default: m.DictionaryModal })));

export default function App() {
  return (
    <ErrorBoundary>
      <EditorContextProvider>
        <AppContent />
      </EditorContextProvider>
    </ErrorBoundary>
  );
}

// Inner component that can use EditorContext
function AppContent() {
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
    showSearch,
    setShowSearch,
    showGrammarReview,
    showDictionaryModal,
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
    // Remove all existing theme classes and add the new one
    const root = document.documentElement;
    const themeClasses = ['dark', 'light', 'monokai', 'dracula', 'github-dark', 'nord'];
    themeClasses.forEach(cls => root.classList.remove(cls));
    root.classList.add(theme);
  }, [theme]);

  // Setup Electron native menu event listeners
  useElectronMenu();

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
      
      {/* Confirmation modal - preloaded for critical UX */}
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
        {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
        {showGrammarReview && <GrammarReviewModal />}
        {showDictionaryModal && <DictionaryModal />}
        {conflict && <ConflictModal />}
      </Suspense>
      
      <Toast />
    </div>
  );
}
