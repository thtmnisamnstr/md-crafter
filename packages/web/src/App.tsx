import { useEffect, useCallback } from 'react';
import { useStore } from './store';
import { MenuBar } from './components/MenuBar';
import { Layout } from './components/Layout';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { ConflictModal } from './components/ConflictModal';
import { Toast } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { ExportModal } from './components/ExportModal';
import { ImportDocxModal } from './components/ImportDocxModal';
import { ExportDocxModal } from './components/ExportDocxModal';
import { PrintView } from './components/PrintView';
import { AboutModal } from './components/AboutModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { GoogleImportModal } from './components/GoogleImportModal';
import { GoogleExportModal } from './components/GoogleExportModal';
import { SearchModal } from './components/SearchModal';

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl/Cmd + Shift + P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowCommandPalette(true);
      }
      
      // Quick open: Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setShowCommandPalette(true);
      }
      
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        useStore.getState().saveCurrentDocument();
      }
      
      // New document: Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        useStore.getState().createNewDocument();
      }
      
      // Close tab: Ctrl/Cmd + W
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const activeTab = useStore.getState().activeTabId;
        if (activeTab) {
          useStore.getState().closeTab(activeTab);
        }
      }
      
      // Toggle sidebar: Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        useStore.getState().toggleSidebar();
      }
      
      // Settings: Ctrl/Cmd + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useStore.getState().setShowSettings(true);
      }
      
      // Export: Ctrl/Cmd + E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        useStore.getState().setShowExport(true);
      }
      
      // Copy for Word/Docs: Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        useStore.getState().copyForWordDocs();
      }
      
      // Paste from Word/Docs: Ctrl/Cmd + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        useStore.getState().pasteFromWordDocs();
      }
      
      // Global search: Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        useStore.getState().setShowSearch(true);
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
      }
      
      // Escape to exit Zen mode
      if (e.key === 'Escape' && useStore.getState().zenMode) {
        useStore.getState().toggleZenMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--editor-bg)' }}>
      {!zenMode && <MenuBar />}
      <div className="flex-1 overflow-hidden">
        <Layout />
      </div>
      
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
      
      <Toast />
    </div>
  );
}

