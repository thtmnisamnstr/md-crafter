import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

export const useStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createTabsSlice(set, get, api),
      ...createUISlice(set, get, api),
      ...createToastsSlice(set, get, api),
      ...createDocumentsSlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createSyncSlice(set, get, api),
      ...createSettingsSlice(set, get, api),
      // Additional actions that don't fit in slices
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
        const { apiToken } = get();
        
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
        
        // Create a welcome tab if no tabs (first run)
        if (get().tabs.length === 0) {
          const tabId = 'welcome-tab';
          const welcomeTab: Tab = {
            id: tabId,
            documentId: null,
            title: 'Welcome',
            content: '',
            language: 'markdown',
            isDirty: false,
            syncStatus: 'local',
            isCloudSynced: false,
            savedContent: '',
            isWelcome: true,
          };
          set({ tabs: [welcomeTab], activeTabId: tabId });
        }
      },
      
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
      pasteFromWordDocs: async () => {
        const { tabs, activeTabId, addToast, updateTabContent } = get();
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (!activeTab || !activeTabId) return;
        
        try {
          const markdown = await pasteAsMarkdown();
          if (markdown) {
            // Insert at cursor position or append
            const editor = window.monacoEditor;
            if (editor) {
              const selection = editor.getSelection();
              const range = selection ? {
                startLineNumber: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLineNumber: selection.endLineNumber,
                endColumn: selection.endColumn,
              } : null;
              
              if (range) {
                editor.executeEdits('paste', [{
                  range,
                  text: markdown,
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
    }),
    {
      name: 'md-crafter-storage',
      partialize: (state) => ({
        apiToken: state.apiToken,
        theme: state.theme,
        settings: state.settings,
        sidebarWidth: state.sidebarWidth,
        recentFiles: state.recentFiles.slice(0, MAX_RECENT_FILES),
      }),
    }
  )
);
