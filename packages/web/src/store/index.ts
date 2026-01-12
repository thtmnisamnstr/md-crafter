import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '@md-crafter/shared';
import { api as apiService } from '../services/api';
import { syncService } from '../services/sync';
import { copyAsRichText, pasteAsMarkdown } from '../services/clipboard';
import { importDocx } from '../services/docx';
import { MAX_RECENT_FILES } from '../constants';
import { AppState, Tab } from './types';
import { createTabsSlice } from './tabs';
import { createUISlice } from './ui';
import { createToastsSlice } from './toasts';
import { createDocumentsSlice } from './documents';
import { createAuthSlice } from './auth';
import { createSyncSlice } from './sync';
import { createSettingsSlice } from './settings';

// Create a storage adapter that safely accesses localStorage
// This prevents errors when localStorage is not available (e.g., in tests with jsdom)
const getStorage = () => {
  try {
    // In test environment, localStorage might throw errors
    // Return a mock storage if localStorage is not available
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    // Fallback: return a mock storage object
    const mockStorage: Storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
    return mockStorage;
  } catch (e) {
    // If accessing localStorage throws an error, return mock storage
    const mockStorage: Storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
    return mockStorage;
  }
};

export const useStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      // Hydration tracking - starts false, set to true after rehydration
      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),
      
      ...createTabsSlice(set, get, api),
      ...createUISlice(set, get, api),
      ...createToastsSlice(set, get, api),
      ...createDocumentsSlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createSyncSlice(set, get, api),
      ...createSettingsSlice(set, get, api),
      
      // ============================================================================
      // CRITICAL INITIALIZATION FUNCTION
      // ============================================================================
      /**
       * Initializes the application state on startup
       * 
       * Sets initial online status, validates and restores authentication if a token
       * exists in storage, populates userId, connects sync service, loads cloud documents,
       * and creates a welcome tab if no tabs exist (first run).
       * 
       * Should be called once when the app first loads.
       */
      initializeApp: async () => {
        const { apiToken, tabs: persistedTabs, activeTabId: persistedActiveTabId } = get();
        
        // Set initial online status (listeners are managed by useOnlineStatus hook)
        set({ isOnline: navigator.onLine });
        
        if (apiToken) {
          const valid = await apiService.validateToken(apiToken);
          if (valid) {
            apiService.setToken(apiToken);
            
            // Fetch user info to populate userId
            try {
              const user = await apiService.getCurrentUser();
              set({ 
                isAuthenticated: true,
                userId: user.id 
              });
            } catch (error) {
              logger.error('Failed to fetch user info during initialization', error);
              set({ 
                isAuthenticated: true,
                userId: null 
              });
            }
            
            syncService.connect(apiToken);
            await get().loadCloudDocuments();
          } else {
            set({ apiToken: null, isAuthenticated: false, userId: null });
          }
        }
        
        // Restore persisted tabs
        if (persistedTabs && persistedTabs.length > 0) {
          const { isElectron } = await import('../utils/platform');
          const restoredTabs: Tab[] = [];
          let restoredActiveTabId: string | null = persistedActiveTabId;
          
          for (const persistedTab of persistedTabs) {
            // For desktop: Check if file exists and reload content
            if (isElectron() && persistedTab.path && window.api?.fileExists) {
              try {
                const exists = await window.api.fileExists(persistedTab.path);
                if (exists && window.api?.readFile) {
                  // File exists - reload content from disk
                  const result = await window.api.readFile(persistedTab.path);
                  if (result.success && result.content !== undefined) {
                    // Use content from disk, but preserve isDirty if user had unsaved changes
                    const tab: Tab = {
                      ...persistedTab,
                      content: persistedTab.isDirty ? persistedTab.content : result.content,
                      savedContent: persistedTab.isDirty ? persistedTab.savedContent : result.content,
                      showPreview: persistedTab.showPreview ?? false,
                      undoStack: persistedTab.undoStack || [],
                      redoStack: persistedTab.redoStack || [],
                    };
                    restoredTabs.push(tab);
                    
                    // Watch file for external changes
                    if (window.api.watchFile) {
                      window.api.watchFile(persistedTab.path);
                    }
                  } else {
                    // File read failed - skip this tab
                    logger.warn(`Failed to read file ${persistedTab.path}, skipping tab restoration`);
                  }
                } else {
                  // File doesn't exist - skip this tab
                  logger.warn(`File ${persistedTab.path} no longer exists, skipping tab restoration`);
                }
              } catch (error) {
                logger.error(`Error checking file existence for ${persistedTab.path}`, error);
                // On error, restore tab with persisted content (unsaved changes preserved)
                restoredTabs.push(persistedTab as Tab);
              }
            } else if (persistedTab.documentId) {
              // Cloud document - restore via API
              try {
                const doc = await apiService.getDocument(persistedTab.documentId);
                const tab: Tab = {
                  ...persistedTab,
                  // Use persisted content if dirty (unsaved changes), otherwise use cloud content
                  content: persistedTab.isDirty ? persistedTab.content : doc.content,
                  savedContent: persistedTab.isDirty ? persistedTab.savedContent : doc.content,
                  showPreview: persistedTab.showPreview ?? false,
                  splitMode: persistedTab.splitMode ?? 'none',
                  diffMode: persistedTab.diffMode ?? { enabled: false, compareWithSaved: false },
                  splitSecondaryTabId: persistedTab.splitSecondaryTabId ?? null,
                  splitPaneRatio: persistedTab.splitPaneRatio,
                  previewPaneRatio: persistedTab.previewPaneRatio,
                  diffPaneRatio: persistedTab.diffPaneRatio,
                  cursor: persistedTab.cursor ?? null,
                  selection: persistedTab.selection ?? null,
                  undoStack: persistedTab.undoStack || [],
                  redoStack: persistedTab.redoStack || [],
                };
                restoredTabs.push(tab);
                
                // Subscribe to updates
                syncService.subscribeToDocument(persistedTab.documentId);
              } catch (error) {
                logger.error(`Failed to restore cloud document ${persistedTab.documentId}`, error);
                // On error, restore tab with persisted content (unsaved changes preserved)
                restoredTabs.push(persistedTab as Tab);
              }
            } else {
              // Local file without path (web) - restore from persisted content
              restoredTabs.push({
                ...(persistedTab as Tab),
                showPreview: persistedTab.showPreview ?? false,
                splitMode: persistedTab.splitMode ?? 'none',
                diffMode: persistedTab.diffMode ?? { enabled: false, compareWithSaved: false },
                splitSecondaryTabId: persistedTab.splitSecondaryTabId ?? null,
                splitPaneRatio: persistedTab.splitPaneRatio,
                previewPaneRatio: persistedTab.previewPaneRatio,
                diffPaneRatio: persistedTab.diffPaneRatio,
                cursor: persistedTab.cursor ?? null,
                selection: persistedTab.selection ?? null,
                undoStack: persistedTab.undoStack || [],
                redoStack: persistedTab.redoStack || [],
              });
            }
          }
          
          // Verify activeTabId still exists
          if (restoredActiveTabId && !restoredTabs.find(t => t.id === restoredActiveTabId)) {
            restoredActiveTabId = restoredTabs.length > 0 ? restoredTabs[0].id : null;
          }
          
          if (restoredTabs.length > 0) {
            set({ tabs: restoredTabs, activeTabId: restoredActiveTabId });
          }
          // If no tabs restored, leave tabs empty - Layout will show WelcomeTab automatically
        }
        // If no persisted tabs, leave tabs empty - Layout will show WelcomeTab automatically
      },
      
      // ============================================================================
      // CLIPBOARD ACTIONS
      // ============================================================================
      // Clipboard actions - use Monaco editor directly
      /**
       * Copies the active document's content as rich text for Word/Docs compatibility
       * 
       * Converts markdown content to HTML rich text format that can be pasted into
       * Microsoft Word or Google Docs while preserving formatting.
       * 
       * @returns Promise that resolves when copy operation completes
       */
      copyForWordDocs: async () => {
        const { tabs, activeTabId, addToast } = get();
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (!activeTab) return;
        
        try {
          await copyAsRichText(activeTab.content);
          addToast({ type: 'success', message: 'Copied for Word/Docs' });
        } catch (error) {
          addToast({ type: 'error', message: 'Failed to copy' });
        }
      },
      
      /**
       * Pastes content from Word/Docs clipboard and converts to markdown
       * 
       * Reads HTML/rich text from clipboard, converts it to markdown, and inserts
       * it at the current cursor position in the Monaco editor. Falls back to
       * appending if no cursor position is available.
       * 
       * @returns Promise that resolves when paste operation completes
       */
      pasteFromWordDocs: async (editor?: import('monaco-editor').editor.IStandaloneCodeEditor) => {
        const { tabs, activeTabId, addToast, updateTabContent } = get();
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (!activeTab || !activeTabId) return;
        
        // Capture the selection/range immediately (before async clipboard work),
        // so we replace the correct range even if focus/selection changes during await.
        let initialRange: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        } | null = null;

        let initialPosition: { lineNumber: number; column: number } | null = null;

        if (editor) {
          const sel = editor.getSelection();
          if (sel) {
            initialRange = {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            };
          }
          const pos = editor.getPosition();
          if (pos) {
            initialPosition = { lineNumber: pos.lineNumber, column: pos.column };
          }
        }

        try {
          const markdown = await pasteAsMarkdown();
          if (markdown) {
            // Insert at cursor position or append
            if (editor) {
              // Ensure editor has focus so selection is available
              if (!editor.hasTextFocus()) {
                editor.focus();
              }

              let selection = initialRange ? {
                startLineNumber: initialRange.startLineNumber,
                startColumn: initialRange.startColumn,
                endLineNumber: initialRange.endLineNumber,
                endColumn: initialRange.endColumn,
              } as import('monaco-editor').Selection : editor.getSelection();

              // Fallback to stored selection if Monaco doesn't have one (e.g., focus shift)
              if (!selection && activeTab.selection) {
                selection = {
                  startLineNumber: activeTab.selection.startLine,
                  startColumn: activeTab.selection.startColumn,
                  endLineNumber: activeTab.selection.endLine,
                  endColumn: activeTab.selection.endColumn,
                } as unknown as import('monaco-editor').Selection;
                editor.setSelection(selection);
              }

              const position = initialPosition || editor.getPosition();
              const range = selection
                ? {
                    startLineNumber: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLineNumber: selection.endLineNumber,
                    endColumn: selection.endColumn,
                  }
                : position
                  ? {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    }
                  : null;

              if (range) {
                editor.executeEdits('paste', [{
                  range,
                  text: markdown,
                  forceMoveMarkers: true,
                }]);
              } else {
                // Append to content
                updateTabContent(activeTabId, activeTab.content + '\n' + markdown);
              }
            } else {
              updateTabContent(activeTabId, activeTab.content + '\n' + markdown);
            }
            addToast({ type: 'success', message: 'Pasted from Word/Docs' });
          }
        } catch (error) {
          addToast({ type: 'error', message: 'Failed to paste' });
        }
      },
      
      // ============================================================================
      // IMPORT/EXPORT ACTIONS
      // ============================================================================
      // Import actions - uses external service
      importDocxFile: async (file: File) => {
        const { openTab, addToast } = get();
        try {
          const markdown = await importDocx(file);
          const title = file.name.replace(/\.docx$/i, '.md');
          openTab({
            title,
            content: markdown,
            language: 'markdown',
          });
        } catch (error) {
          addToast({ type: 'error', message: 'Failed to import document' });
          throw error;
        }
      },
      
      // ============================================================================
      // FORMATTING AND GRAMMAR ACTIONS
      // ============================================================================
      /**
       * Formats the active document using Prettier markdown formatter.
       * 
       * Formats the content of the currently active tab and updates it with
       * the formatted version. Shows a toast notification on success or error.
       * 
       * @returns Promise that resolves when formatting is complete
       */
      formatDocument: async () => {
        const { tabs, activeTabId, updateTabContent, addToast } = get();
        
        if (!activeTabId) {
          addToast({ type: 'warning', message: 'No document open' });
          return;
        }
        
        const activeTab = tabs.find((t) => t.id === activeTabId);
        
        if (!activeTab) {
          addToast({ type: 'warning', message: 'No document open' });
          return;
        }
        
        // Only format markdown and MDX files
        const isMarkdown = activeTab.language === 'markdown' || activeTab.title.endsWith('.md');
        const isMdx = activeTab.language === 'mdx' || activeTab.title.endsWith('.mdx');
        
        if (!isMarkdown && !isMdx) {
          addToast({ type: 'warning', message: 'Formatting is only available for markdown and MDX files' });
          return;
        }
        
        try {
          // Import formatter functions
          const { formatMarkdown, formatMdx, isLikelyMdx } = await import('../utils/markdownFormatter');
          
          // Use appropriate formatter based on file type
          const treatAsMdx = isMdx || isLikelyMdx(activeTab.content);
          const formatted = treatAsMdx
            ? await formatMdx(activeTab.content)
            : await formatMarkdown(activeTab.content);
          
          updateTabContent(activeTabId, formatted);
          addToast({ type: 'success', message: 'Document formatted' });
        } catch (error) {
          logger.error('Failed to format document', error);
          addToast({ 
            type: 'error', 
            message: `Failed to format: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      },
      
      /**
       * Checks grammar of the active document using textlint
       * 
       * Shows grammar issues as Monaco markers and code actions.
       * Grammar checking runs in a web worker to avoid blocking the UI.
       * 
       * @param options - Optional editor, monaco, and grammarService instances. If not provided, operation will fail.
       * @returns Promise that resolves when grammar check is complete
       */
      checkGrammar: async (options?: {
        editor?: import('monaco-editor').editor.IStandaloneCodeEditor;
        monaco?: typeof import('monaco-editor');
        grammarService?: import('../services/grammar').GrammarService;
      }) => {
        const { tabs, activeTabId, addToast } = get();
        
        if (!activeTabId) {
          addToast({ type: 'warning', message: 'No document open' });
          return;
        }
        
        const activeTab = tabs.find((t) => t.id === activeTabId);
        
        if (!activeTab) {
          addToast({ type: 'warning', message: 'No document open' });
          return;
        }
        
        // Only check grammar for markdown/MDX files
        const isMarkdownFile = activeTab.language === 'markdown' || activeTab.title.endsWith('.md');
        const isMdxFile = activeTab.language === 'mdx' || activeTab.title.endsWith('.mdx');
        if (!isMarkdownFile && !isMdxFile) {
          addToast({ type: 'warning', message: 'Grammar checking is only available for markdown/MDX files' });
          return;
        }
        
        try {
          const editor = options?.editor;
          const monaco = options?.monaco;
          let grammarService = options?.grammarService;
          
          if (!editor || !monaco) {
            addToast({ type: 'error', message: 'Editor not available' });
            return;
          }
          
          if (!grammarService) {
            // Create and initialize if not exists
            const { GrammarService } = await import('../services/grammar');
            grammarService = new GrammarService();
          }
          await grammarService.initialize(monaco, editor);
          
          // Open modal immediately (will show progress/error when callbacks fire)
          get().setShowGrammarReview(true);
          await grammarService.checkGrammar(
            activeTab.content, 
            activeTab.title,
            (issueCount) => {
              addToast({ type: 'info', message: `Grammar check complete - ${issueCount} issue${issueCount === 1 ? '' : 's'}` });
              get().setGrammarIssuesCount(issueCount);
              get().setShowGrammarReview(true);
              get().setGrammarError(null);
            },
            (issues) => {
              const flat = issues.flatMap((res) => res.messages || []);
              get().setGrammarIssues(flat);
              get().setShowGrammarReview(true);
              get().setGrammarError(null);
            },
            (message) => {
              const errorMessage = message || 'Grammar check failed';
              addToast({ type: 'error', message: errorMessage });
              get().setShowGrammarReview(true);
              get().setGrammarIssues([]);
              get().setGrammarIssuesCount(0);
              get().setGrammarError(errorMessage);
            }
          );
        } catch (error) {
          logger.error('Failed to check grammar', error);
          addToast({ 
            type: 'error', 
            message: `Failed to check grammar: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
          get().setShowGrammarReview(true);
          get().setGrammarIssues([]);
          get().setGrammarIssuesCount(0);
          get().setGrammarError(error instanceof Error ? error.message : 'Unknown error');
        }
      },
    }),
    {
      name: 'md-crafter-storage',
      storage: createJSONStorage(getStorage),
      onRehydrateStorage: () => (state) => {
        // Called when rehydration is complete
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        apiToken: state.apiToken,
        theme: state.theme,
        settings: state.settings,
        sidebarWidth: state.sidebarWidth,
        recentFiles: state.recentFiles.slice(0, MAX_RECENT_FILES),
        // Persist tabs and active tab for restoration
        tabs: state.tabs
          .map(tab => ({
            id: tab.id,
            documentId: tab.documentId,
            title: tab.title,
            content: tab.content, // Persist content for unsaved changes
            splitMode: tab.splitMode,
            diffMode: tab.diffMode,
            splitSecondaryTabId: tab.splitSecondaryTabId ?? null,
            splitPaneRatio: tab.splitPaneRatio,
            previewPaneRatio: tab.previewPaneRatio,
            diffPaneRatio: tab.diffPaneRatio,
            showPreview: tab.showPreview,
            language: tab.language,
            isDirty: tab.isDirty,
            syncStatus: tab.syncStatus,
            isCloudSynced: tab.isCloudSynced,
            savedContent: tab.savedContent,
            hasSavedVersion: tab.hasSavedVersion ?? false,
            path: tab.path, // Persist file path for desktop
            undoStack: tab.undoStack || [],
            redoStack: tab.redoStack || [],
            cursor: tab.cursor ?? null,
            selection: tab.selection ?? null,
          })),
        activeTabId: state.activeTabId,
      }),
    }
  )
);

/**
 * Hook to check if the store has completed hydration from localStorage
 * Use this when you need to wait for persisted state to be available
 */
export const useHasHydrated = () => useStore((state) => state._hasHydrated);
