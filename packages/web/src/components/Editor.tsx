import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useStore } from '../store';
import { useEditorContext } from '../contexts/EditorContext';
import { logger } from '@md-crafter/shared';
import { defineMonacoThemes } from '../utils/monacoThemes';
import { ErrorBoundary } from './ErrorBoundary';
import { SpellcheckService } from '../services/spellcheck';
import { GrammarService } from '../services/grammar';
import { EDITOR_DEBOUNCE_DELAY_MS } from '../constants';
import { materializeClipboardMarkdownImages } from '../services/imageAssets';

/**
 * Check if a Monaco model has been disposed
 * Monaco models have isDisposed() but it's not in the public type definitions
 */
function isModelDisposed(model: monaco.editor.ITextModel | null): boolean {
  if (!model) return true;
  return typeof (model as { isDisposed?: () => boolean }).isDisposed === 'function' 
    && (model as { isDisposed: () => boolean }).isDisposed();
}

function getImageFilesFromClipboardEvent(event: ClipboardEvent): File[] {
  const files: File[] = [];
  const clipboardData = event.clipboardData;
  if (!clipboardData) return files;

  for (const item of Array.from(clipboardData.items || [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file && file.type.startsWith('image/')) {
      files.push(file);
    }
  }

  if (files.length === 0) {
    for (const file of Array.from(clipboardData.files || [])) {
      if (file.type.startsWith('image/')) {
        files.push(file);
      }
    }
  }

  return files;
}

function getImageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  return Array.from(dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));
}

interface EditorProps {
  tabId?: string; // Optional - if not provided, uses activeTabId
  registerAs?: 'primary' | 'secondary'; // Optional - determines which editor slot to register as
  autoFocus?: boolean; // Optional - whether to auto-focus the editor (defaults based on registerAs)
}

export function Editor({ 
  tabId, 
  registerAs = 'primary',
  autoFocus = registerAs === 'primary' // Primary auto-focuses, secondary does not
}: EditorProps = {}) {
  const { 
    tabs, 
    activeTabId, 
    updateTabContent, 
    settings, 
    theme,
    addToast,
    updateSettings,
    upsertImageAsset,
    setTabCursor,
    setTabSelection,
    splitMode,
    diffMode,
    _hasHydrated,
  } = useStore();
  
  const {
    registerPrimaryEditor,
    registerSecondaryEditor,
    unregisterPrimaryEditor,
    unregisterSecondaryEditor,
    registerGrammarService,
    registerSpellcheckService,
    unregisterGrammarService,
    executeEditorCommand,
    getOrCreateModel,
  } = useEditorContext();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  // Track when editor is mounted to trigger useEffect re-run
  const [editorMounted, setEditorMounted] = useState(false);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const spellcheckServiceRef = useRef<SpellcheckService | null>(null);
  const grammarServiceRef = useRef<GrammarService | null>(null);
  const ignoreChangeRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdateRef = useRef<{ tabId: string; content: string; skipHistory?: boolean } | null>(null);
  const prevTabIdRef = useRef<string | null>(null);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAppliedTabIdRef = useRef<string | null>(null);
  // Skip one native paste event when Ctrl/Cmd+Shift+V is handled explicitly.
  const skipNextNativePasteRef = useRef(false);

  // Use provided tabId or fall back to activeTabId
  const displayTabId = tabId || activeTabId;
  const activeTab = tabs.find((t) => t.id === displayTabId);
  
  // Track content listener separately so it can be re-attached after model changes
  const contentListenerRef = useRef<monaco.IDisposable | null>(null);

  const restoreCursorSelection = useCallback(() => {
    if (!editorRef.current || !activeTab) return;
    const apply = () => {
      if (!editorRef.current || !activeTab) return;
      
      // Only restore selection if it's NOT collapsed (has actual selected text)
      // Collapsed selections are just cursor positions stored in old format - skip them
      if (activeTab.selection) {
        const isCollapsed = 
          activeTab.selection.startLine === activeTab.selection.endLine &&
          activeTab.selection.startColumn === activeTab.selection.endColumn;
        
        if (!isCollapsed) {
          try {
            editorRef.current.setSelection({
              startLineNumber: activeTab.selection.startLine,
              startColumn: activeTab.selection.startColumn,
              endLineNumber: activeTab.selection.endLine,
              endColumn: activeTab.selection.endColumn,
            });
            editorRef.current.revealRangeInCenter({
              startLineNumber: activeTab.selection.startLine,
              startColumn: activeTab.selection.startColumn,
              endLineNumber: activeTab.selection.endLine,
              endColumn: activeTab.selection.endColumn,
            });
            if (autoFocus) {
              editorRef.current.focus();
            }
            return;
          } catch {
            // fall through to cursor restore
          }
        }
      }
      
      // Restore cursor position
      if (activeTab.cursor) {
        const position = { lineNumber: activeTab.cursor.line, column: activeTab.cursor.column };
        editorRef.current.setPosition(position);
        editorRef.current.revealPositionInCenter(position);
        if (autoFocus) {
          editorRef.current.focus();
        }
      }
    };
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 0);
  }, [activeTab, displayTabId, autoFocus]);

  const persistPosition = useCallback(
    (targetTabId?: string | null, editorInstance?: monaco.editor.IStandaloneCodeEditor | null) => {
      const tabId = targetTabId || displayTabId;
      const editor = editorInstance || editorRef.current;
      if (!tabId || !editor) return;
      const tab = useStore.getState().tabs.find((t) => t.id === tabId);
      if (!tab) return;
      const pos = editor.getPosition();
      const selection = editor.getSelection();
      const nextCursor = pos ? { line: pos.lineNumber, column: pos.column } : null;
      
      // Check if selection is collapsed (start == end means cursor only, no actual selection)
      const isCollapsed = selection && 
        selection.startLineNumber === selection.endLineNumber && 
        selection.startColumn === selection.endColumn;
      
      // Only store selection if it's NOT collapsed (has actual selected text)
      const nextSelection = (selection && !isCollapsed)
        ? {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
          }
        : null;
      
      const cursorChanged =
        (nextCursor && (!tab.cursor || tab.cursor.line !== nextCursor.line || tab.cursor.column !== nextCursor.column)) ||
        (!nextCursor && !!tab.cursor);
      const selectionChanged =
        (nextSelection &&
          (!tab.selection ||
            tab.selection.startLine !== nextSelection.startLine ||
            tab.selection.startColumn !== nextSelection.startColumn ||
            tab.selection.endLine !== nextSelection.endLine ||
            tab.selection.endColumn !== nextSelection.endColumn)) ||
        (!nextSelection && !!tab.selection);
      if (cursorChanged && nextCursor) {
        setTabCursor(tabId, nextCursor);
      }
      if (selectionChanged) {
        setTabSelection(tabId, nextSelection);
      }
    },
    [displayTabId, setTabCursor, setTabSelection]
  );

  const flushPendingUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingUpdateRef.current) {
      const { tabId: pendingTabId, content, skipHistory } = pendingUpdateRef.current;
      updateTabContent(pendingTabId, content, { skipHistory });
      pendingUpdateRef.current = null;
    }
  }, [updateTabContent]);

  const insertTextAtSelection = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, text: string, source: string) => {
      const selection = editor.getSelection();
      if (!selection) return;
      editor.executeEdits(source, [{
        range: {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn,
        },
        text,
        forceMoveMarkers: true,
      }]);
    },
    []
  );

  const normalizeImagesInEditor = useCallback(async (source: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const { normalizeDocumentImageReferences } = await import('../services/imageAssets');
    const currentContent = model.getValue();
    const normalizedContent = normalizeDocumentImageReferences(currentContent);
    if (normalizedContent === currentContent) return;

    editor.executeEdits(source, [{
      range: model.getFullModelRange(),
      text: normalizedContent,
      forceMoveMarkers: true,
    }]);
  }, [editorMounted]);

  // Get Monaco theme name based on app theme
  const monacoTheme = useMemo(() => {
    switch (theme) {
      case 'light':
        return 'md-crafter-light';
      case 'monokai':
        return 'md-crafter-monokai';
      case 'dracula':
        return 'vs-dark'; // Monaco's built-in dracula theme
      case 'github-dark':
        return 'md-crafter-github-dark';
      case 'nord':
        return 'md-crafter-nord';
      default:
        return 'md-crafter-dark';
    }
  }, [theme]);

  const handleEditorMount: OnMount = async (editor, monaco) => {
    // Dispose any lingering listeners from prior mounts
    disposablesRef.current.forEach((d) => d.dispose());
    disposablesRef.current = [];

    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register editor with context based on registerAs prop
    if (registerAs === 'secondary') {
      registerSecondaryEditor(editor, monaco);
    } else {
      registerPrimaryEditor(editor, monaco);
    }
    
    // Define Monaco themes (idempotent - safe to call multiple times)
    defineMonacoThemes(monaco);

    // Apply theme
    monaco.editor.setTheme(monacoTheme);

    // NOTE: Spellcheck initialization is handled by a useEffect that waits for
    // store hydration to complete, ensuring persisted settings are applied correctly.

    // Initialize grammar service (lazy initialization - will be ready when checkGrammar is called)
    // Register with context for access from store actions
    if (!grammarServiceRef.current) {
      grammarServiceRef.current = new GrammarService();
      registerGrammarService(grammarServiceRef.current);
    }
    
    // Reset lastAppliedTabIdRef on mount to ensure cursor is restored
    // This handles returning from diff/split mode where tab ID stays the same
    lastAppliedTabIdRef.current = null;
    
    // Restore cursor/selection when editor is ready
    restoreCursorSelection();
    // Attach per-tab model (preserves Monaco undo/redo per tab)
    // Read fresh state from store to avoid stale closure issues
    const freshState = useStore.getState();
    const currentTabId = tabId || freshState.activeTabId;
    const currentTab = freshState.tabs.find(t => t.id === currentTabId);
    
    const tabToUse = currentTab || activeTab;
    if (tabToUse) {
      const model = getOrCreateModel(tabToUse, monaco);
      if (model && !isModelDisposed(model)) {
        try {
          editor.setModel(model);
        } catch {
          // If Monaco is disposing, skip attaching model
        }
      }
    }

    // Track cursor position per tab for persistence
    // Skip during model/content changes (ignoreChangeRef) to avoid overwriting saved positions
    const cursorDisposable = editor.onDidChangeCursorSelection(() => {
      if (ignoreChangeRef.current) return;
      const tabId = useStore.getState().activeTabId || displayTabId;
      persistPosition(tabId, editor);
    });
    disposablesRef.current.push(cursorDisposable);

    // NOTE: Content change listener is set up in the useEffect after setModel,
    // because setModel disposes listeners attached before it.

    // Editor-level keydown handling for custom paste-from-word shortcut.
    const undoRedoDisposable = editor.onKeyDown((e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.keyCode === monaco.KeyCode.KeyV && e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        skipNextNativePasteRef.current = true;
        setTimeout(() => {
          skipNextNativePasteRef.current = false;
        }, 250);
        useStore.getState().pasteFromWordDocs(editor);
        return;
      }
      if (e.keyCode === monaco.KeyCode.KeyV && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        skipNextNativePasteRef.current = true;
        setTimeout(() => {
          skipNextNativePasteRef.current = false;
        }, 250);

        void (async () => {
          try {
            const imageFiles: File[] = [];
            if (navigator.clipboard?.read) {
              try {
                const clipboardItems = await navigator.clipboard.read();
                let imageCounter = 1;
                for (const item of clipboardItems) {
                  const imageType = item.types.find((type) => type.startsWith('image/'));
                  if (!imageType) continue;
                  const blob = await item.getType(imageType);
                  const extension = imageType.split('/')[1]?.split(';')[0] || 'png';
                  const fileName = `pasted-image-${Date.now()}-${imageCounter}.${extension}`;
                  imageCounter += 1;
                  if (typeof File !== 'undefined') {
                    imageFiles.push(new File([blob], fileName, { type: blob.type || imageType }));
                  } else {
                    imageFiles.push(Object.assign(blob, { name: fileName, lastModified: Date.now() }) as File);
                  }
                }
              } catch {
                // Ignore and fall back to plain text clipboard handling.
              }
            }

            if (imageFiles.length > 0) {
              const { createImageMarkdownFromFiles } = await import('../services/imageAssets');
              const snippets = await createImageMarkdownFromFiles(imageFiles, {
                embedImagesAsBase64: true,
                upsertImageAsset: useStore.getState().upsertImageAsset,
              });
              if (snippets.length > 0) {
                insertTextAtSelection(editor, snippets.join('\n'), 'paste-image');
                await normalizeImagesInEditor('paste-image-normalize');
                return;
              }
            }

            const { getPlainTextFromClipboard } = await import('../services/clipboard');
            const plainText = (await getPlainTextFromClipboard()) ?? '';
            if (!plainText) return;
            insertTextAtSelection(editor, plainText, 'paste');
          } catch (error) {
            logger.warn('Failed to handle keyboard paste', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })();
        return;
      }
      if (e.keyCode === monaco.KeyCode.KeyZ && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          executeEditorCommand('redo');
        } else {
          executeEditorCommand('undo');
        }
        return;
      }
      if (e.keyCode === monaco.KeyCode.KeyY && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        executeEditorCommand('redo');
      }
    });
    disposablesRef.current.push(undoRedoDisposable);

    // Focus editor only if autoFocus is enabled
    if (autoFocus) {
      editor.focus();
    }
    
    // NOTE: window.monacoEditor is managed by EditorContext.tsx (single source of truth)
    // to avoid race conditions with React StrictMode double-mount cycles.
    
    // Trigger useEffect re-run to set up content listener after editor is mounted
    setEditorMounted(true);
  };

  // Update theme when it changes (after initial mount)
  useEffect(() => {
    if (monacoRef.current && monacoTheme) {
      // Ensure themes are defined
      defineMonacoThemes(monacoRef.current);
      // Apply theme
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme, theme]); // Add theme for extra safety

  // Cleanup editor registration and services on unmount
  useEffect(() => {
    return () => {
      // Unregister editor from context
      if (registerAs === 'secondary') {
        unregisterSecondaryEditor();
      } else {
        unregisterPrimaryEditor();
      }
      
      // NOTE: Spellcheck service uses singleton pattern and should NOT be cleaned up here.
      // The singleton persists across React StrictMode remounts. Calling cleanup() here
      // would corrupt the singleton state during StrictMode's simulated unmount.
      // The singleton manages its own lifecycle.

      // Dispose editor-level subscriptions
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
      
      // Cleanup grammar service
      if (grammarServiceRef.current) {
        grammarServiceRef.current.cleanup();
        unregisterGrammarService();
        grammarServiceRef.current = null;
      }
      
      // NOTE: window.monacoEditor cleanup is handled by EditorContext.tsx (single source of truth)
    };
  }, [registerAs, unregisterPrimaryEditor, unregisterSecondaryEditor, unregisterGrammarService]);

  // Handle spellcheck setting changes
  // Wait for both: editor mounted AND store hydrated from localStorage
  // This ensures persisted settings are applied correctly on startup
  // 
  // Uses singleton SpellcheckService.getInstance() to avoid React 18 StrictMode 
  // double-initialization issues. The singleton handles concurrent initialization
  // attempts internally via isInitializing flag.
  useEffect(() => {
    // Wait for editor refs to be set
    if (!monacoRef.current || !editorRef.current) {
      return;
    }
    
    // Wait for store hydration to complete before initializing spellcheck
    // This ensures we use the persisted setting, not the default value
    if (!_hasHydrated) {
      return;
    }

    // Capture refs at effect start
    const monaco = monacoRef.current;
    const editor = editorRef.current;

    const enableSpellcheck = async () => {
      if (settings.spellCheck) {
        try {
          // Use singleton instance - safe to call multiple times
          const service = SpellcheckService.getInstance();
          spellcheckServiceRef.current = service;
          
          // initialize() handles concurrent calls via isInitializing flag
          await service.initialize(monaco, editor);
          
          service.enable();
          registerSpellcheckService(service);
        } catch (error) {
          logger.error('Failed to enable spellchecking', error);
          addToast?.({ type: 'warning', message: 'Spellcheck could not be enabled' });
          updateSettings?.({ spellCheck: false });
        }
      } else {
        // Disable spellcheck
        const service = spellcheckServiceRef.current;
        if (service) {
          service.disable();
        }
      }
    };

    enableSpellcheck();

    // NO cleanup here - singleton persists across StrictMode remounts
    // Actual cleanup happens on component unmount via the separate cleanup effect (lines 322-362)
  }, [settings.spellCheck, _hasHydrated, editorMounted, registerSpellcheckService]);

  // Handle paste events to support both image and plain text insertion.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const insertImages = async (files: File[]) => {
      const { createImageMarkdownFromFiles } = await import('../services/imageAssets');
      const snippets = await createImageMarkdownFromFiles(files, {
        embedImagesAsBase64: true,
        upsertImageAsset,
      });
      if (snippets.length > 0) {
        insertTextAtSelection(editor, snippets.join('\n'), 'paste-image');
        await normalizeImagesInEditor('paste-image-normalize');
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      // Check if Monaco text area is focused
      if (!editor.hasTextFocus()) return;

      if (skipNextNativePasteRef.current) {
        skipNextNativePasteRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Skip paste interception if Ctrl+Shift+V (or Cmd+Shift+V) is pressed
      // This allows the special "Paste from Word/Docs" functionality to work
      const keyboardEvent = e as ClipboardEvent & { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean };
      const isCtrlShiftV = (keyboardEvent.ctrlKey || keyboardEvent.metaKey) && keyboardEvent.shiftKey && !keyboardEvent.altKey;
      if (isCtrlShiftV) {
        // Let the keyboard shortcut handler take care of this paste
        return;
      }

      const imageFiles = getImageFilesFromClipboardEvent(e);
      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        try {
          await insertImages(imageFiles);
        } catch (error) {
          logger.warn('Failed to paste image(s)', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      const hasHtml = e.clipboardData?.types.includes('text/html') ?? false;
      const hasPlainText = e.clipboardData?.types.includes('text/plain') ?? false;

      // Intercept clipboard text insertion so paste is always a single Monaco undo step.
      e.preventDefault();
      e.stopPropagation();

      try {
        let plainText = '';
        const { getPlainTextFromClipboard } = await import('../services/clipboard');

        if (hasHtml || !e.clipboardData) {
          plainText = (await getPlainTextFromClipboard()) ?? '';
        } else if (hasPlainText) {
          plainText = e.clipboardData?.getData('text/plain') || '';
          if (!plainText) {
            plainText = (await getPlainTextFromClipboard()) ?? '';
          }
        } else {
          plainText = (await getPlainTextFromClipboard()) ?? '';
        }

        if (!plainText) return;
        insertTextAtSelection(editor, plainText, 'paste');
      } catch (error) {
        logger.warn('Failed to intercept paste', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    document.addEventListener('paste', handlePaste, true);
    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [insertTextAtSelection, normalizeImagesInEditor, upsertImageAsset]);

  // Ensure local asset images are copied as embedded data URLs.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleCopy = (event: ClipboardEvent) => {
      if (!editor.hasTextFocus()) return;
      if (!event.clipboardData) return;

      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection || selection.isEmpty()) return;

      const selectedText = model.getValueInRange(selection);
      if (!selectedText) return;

      try {
        const transformed = materializeClipboardMarkdownImages(selectedText, {
          resolveAssetDataUrl: useStore.getState().getImageAssetDataUrl,
          referenceContext: model.getValue(),
        });

        if (transformed === selectedText) return;
        event.preventDefault();
        event.stopPropagation();
        event.clipboardData.setData('text/plain', transformed);
      } catch (error) {
        logger.warn('Failed to transform copied markdown image assets', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    document.addEventListener('copy', handleCopy, true);
    return () => {
      document.removeEventListener('copy', handleCopy, true);
    };
  }, []);

  // Handle drag-and-drop image insertion directly inside Monaco editor.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const editorNode = editor.getDomNode();
    if (!editorNode) return;

    const looksLikeImageUrl = (value: string): boolean => {
      const trimmed = value.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('data:image/')) return true;
      return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:[?#].*)?$/i.test(trimmed);
    };

    const parseDroppedUrls = (dataTransfer: DataTransfer | null): string[] => {
      if (!dataTransfer) return [];
      const uriList = dataTransfer.getData('text/uri-list');
      const fromUriList = uriList
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && looksLikeImageUrl(line));

      if (fromUriList.length > 0) return fromUriList;

      const plainText = dataTransfer.getData('text/plain').trim();
      if (looksLikeImageUrl(plainText)) return [plainText];

      return [];
    };

    const parseDroppedAssetIds = (dataTransfer: DataTransfer | null): string[] => {
      if (!dataTransfer) return [];
      const fromCustomType = dataTransfer
        .getData('application/x-md-crafter-asset-id')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (fromCustomType.length > 0) {
        return Array.from(new Set(fromCustomType));
      }

      const plainText = dataTransfer.getData('text/plain').trim();
      if (!plainText) return [];
      const assetIds: string[] = [];
      const regex = /mdc:\/\/asset\/([a-zA-Z0-9_-]+)/g;
      let match: RegExpExecArray | null = regex.exec(plainText);
      while (match) {
        const id = (match[1] || '').trim();
        if (id) assetIds.push(id);
        match = regex.exec(plainText);
      }
      return Array.from(new Set(assetIds));
    };

    const isDropInsideEditor = (event: DragEvent): boolean => {
      const target = event.target;
      if (!(target instanceof Node)) return false;
      return editorNode.contains(target);
    };

    const insertDroppedImages = async (files: File[], urls: string[], assetIds: string[]) => {
      let insertedAnyImages = false;
      if (assetIds.length > 0) {
        const { ASSET_URL_PREFIX, buildMarkdownImageToken, fileBaseName } = await import('../services/imageAssets');
        const state = useStore.getState();
        const snippets = assetIds
          .map((assetId) => {
            const asset = state.imageAssets[assetId];
            if (!asset) return null;
            const alt = fileBaseName(asset.fileName || 'image', 'image')
              .replace(/[_-]+/g, ' ')
              .trim() || 'image';
            return buildMarkdownImageToken({
              alt,
              src: `${ASSET_URL_PREFIX}${assetId}`,
              title: undefined,
              width: undefined,
              attrsRaw: undefined,
            });
          })
          .filter((snippet): snippet is string => Boolean(snippet));

        if (snippets.length > 0) {
          insertTextAtSelection(editor, snippets.join('\n'), 'drop-image-asset');
          insertedAnyImages = true;
        }
      }

      if (files.length > 0) {
        const { createImageMarkdownFromFiles } = await import('../services/imageAssets');
        const snippets = await createImageMarkdownFromFiles(files, {
          embedImagesAsBase64: true,
          upsertImageAsset,
        });
        if (snippets.length > 0) {
          insertTextAtSelection(editor, snippets.join('\n'), 'drop-image');
          insertedAnyImages = true;
        }
      }

      if (urls.length > 0) {
        const { createImageMarkdownFromUrls } = await import('../services/imageAssets');
        const snippets = await createImageMarkdownFromUrls(urls, {
          embedImagesAsBase64: true,
          upsertImageAsset,
        });
        if (snippets.length > 0) {
          insertTextAtSelection(editor, snippets.join('\n'), 'drop-image-url');
          insertedAnyImages = true;
        }
      }

      if (insertedAnyImages) {
        await normalizeImagesInEditor('drop-image-normalize');
      }
    };

    const handleDragOver = (event: DragEvent) => {
      if (!isDropInsideEditor(event)) return;
      const files = getImageFilesFromDataTransfer(event.dataTransfer);
      const urls = parseDroppedUrls(event.dataTransfer);
      const assetIds = parseDroppedAssetIds(event.dataTransfer);
      if (files.length === 0 && urls.length === 0 && assetIds.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDrop = async (event: DragEvent) => {
      if (!isDropInsideEditor(event)) return;

      const files = getImageFilesFromDataTransfer(event.dataTransfer);
      const urls = parseDroppedUrls(event.dataTransfer);
      const assetIds = parseDroppedAssetIds(event.dataTransfer);
      if (files.length === 0 && urls.length === 0 && assetIds.length === 0) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        editor.focus();
        await insertDroppedImages(files, urls, assetIds);
      } catch (error) {
        logger.warn('Failed to drop image(s) into editor', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    document.addEventListener('dragover', handleDragOver, true);
    document.addEventListener('drop', handleDrop, true);
    return () => {
      document.removeEventListener('dragover', handleDragOver, true);
      document.removeEventListener('drop', handleDrop, true);
    };
  }, [insertTextAtSelection, normalizeImagesInEditor, upsertImageAsset]);

  // Ensure model/content stays in sync when tab changes (belt-and-suspenders)
  useEffect(() => {
    // Start periodic cursor persistence (every 2s) for active tab
    if (cursorIntervalRef.current) {
      clearInterval(cursorIntervalRef.current);
    }
    cursorIntervalRef.current = setInterval(() => {
      const tabId = useStore.getState().activeTabId || displayTabId;
      persistPosition(tabId);
    }, 2000);

    // Persist cursor of the previous tab before switching
    if (prevTabIdRef.current && editorRef.current) {
      persistPosition(prevTabIdRef.current);
    }
    prevTabIdRef.current = displayTabId || null;

    // Flush any pending edits from the previously active tab before switching
    flushPendingUpdate();
    if (!editorRef.current || !monacoRef.current || !activeTab) return;
    const editorInstance = editorRef.current;
    let model = getOrCreateModel(activeTab, monacoRef.current);
    if (isModelDisposed(model)) {
      model = getOrCreateModel(activeTab, monacoRef.current);
    }
    if (isModelDisposed(model)) {
      return;
    }
    if (model) {
      const currentModel = editorInstance.getModel();
      const isTabSwitch = currentModel !== model;
      
      if (isTabSwitch) {
        try {
          // Prevent cursor/content persistence during model switch to avoid overwriting saved positions
          ignoreChangeRef.current = true;
          editorInstance.setModel(model);
        } catch {
          ignoreChangeRef.current = false;
          return;
        }
        
        // Sync content when switching tabs
        const currentValue = model.getValue();
        if (currentValue !== activeTab.content) {
          const fullRange = model.getFullModelRange();
          model.pushEditOperations(
            [],
            [{ range: fullRange, text: activeTab.content }],
            () => null
          );
        }
      } else {
        // Also sync content for the CURRENT tab when store content differs from model
        // This handles "revert to saved" and other external content updates
        // Only do this when there's no pending user edit (to avoid race conditions)
        const shouldSyncFromStore =
          activeTab.lastContentSource === 'external-replace' ||
          activeTab.lastContentSource === 'preview-edit';
        const currentValue = model.getValue();
        if (shouldSyncFromStore && currentValue !== activeTab.content && !pendingUpdateRef.current) {
          ignoreChangeRef.current = true;
          const fullRange = model.getFullModelRange();
          model.pushEditOperations(
            [],
            [{ range: fullRange, text: activeTab.content }],
            () => null
          );
          ignoreChangeRef.current = false;
        }
      }
      
      // Sync language if changed externally (safe to do always)
      if (monacoRef.current && activeTab.language) {
        monacoRef.current.editor.setModelLanguage(model, activeTab.language);
      }
    }
    // Restore cursor/selection position only when activating a tab (avoid reapplying during edits)
    if (lastAppliedTabIdRef.current !== displayTabId) {
      restoreCursorSelection();
      lastAppliedTabIdRef.current = displayTabId || null;
    }
    // Re-enable cursor/content change handling after restore is complete
    ignoreChangeRef.current = false;
    
    // Set up content change listener AFTER model is set (setModel disposes previous listeners)
    // Dispose any existing content listener first
    if (contentListenerRef.current) {
      contentListenerRef.current.dispose();
      contentListenerRef.current = null;
    }
    
    // Attach content change listener to the editor
    contentListenerRef.current = editorInstance.onDidChangeModelContent((event) => {
      if (ignoreChangeRef.current) return;
      const currentTabId = useStore.getState().activeTabId || displayTabId;
      const value = editorInstance.getModel()?.getValue();
      if (currentTabId && value !== undefined) {
        const skipHistory = event.isUndoing || event.isRedoing;
        
        // Immediately mark tab as dirty for responsive UI feedback
        // The full content update is debounced for performance
        const tab = useStore.getState().tabs.find(t => t.id === currentTabId);
        if (tab && value !== tab.savedContent && !tab.isDirty) {
          useStore.setState((state) => ({
            tabs: state.tabs.map(t => 
              t.id === currentTabId ? { ...t, isDirty: true } : t
            ),
          }));
        }
        
        pendingUpdateRef.current = { tabId: currentTabId, content: value, skipHistory };
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          flushPendingUpdate();
        }, EDITOR_DEBOUNCE_DELAY_MS);
      }
    });
  }, [activeTab?.id, activeTab?.content, activeTab?.language, displayTabId, persistPosition, flushPendingUpdate, restoreCursorSelection, getOrCreateModel, editorMounted]);

  // Reset lastAppliedTabIdRef when returning from split/diff mode
  // This forces cursor restoration on next render
  // Note: Cursor persistence BEFORE mode transitions is handled in Layout.tsx
  useEffect(() => {
    if (splitMode === 'none' && !diffMode.enabled) {
      lastAppliedTabIdRef.current = null;
    }
  }, [splitMode, diffMode.enabled]);

  useEffect(() => {
    return () => {
      // Persist cursor on unmount
      if (editorRef.current && displayTabId) {
        persistPosition(displayTabId);
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
      // Dispose content listener
      if (contentListenerRef.current) {
        contentListenerRef.current.dispose();
        contentListenerRef.current = null;
      }
      flushPendingUpdate();
    };
  }, [flushPendingUpdate, persistPosition, displayTabId]);

  if (!activeTab) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
      >
        <div className="text-center opacity-100 space-y-1">
          <p className="text-lg font-semibold">No document open</p>
          <p className="text-sm opacity-80">
            Press <kbd className="px-2 py-1 bg-sidebar-bg rounded">Ctrl+N</kbd> to create a new document
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
            Editor failed to load. Please refresh the page.
          </p>
        </div>
      </div>
    }>
      <MonacoEditor
      height="100%"
      onMount={handleEditorMount}
      options={{
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        lineNumbers: settings.lineNumbers ? 'on' : 'off',
        minimap: { enabled: settings.minimap },
        scrollBeyondLastLine: true,
        smoothScrolling: true,
        cursorBlinking: 'blink',
        cursorStyle: 'line',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'languageDefined',
        autoClosingQuotes: 'languageDefined',
        formatOnPaste: false,
        formatOnType: false,
        automaticLayout: true,
        padding: { top: 10, bottom: 10 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
      />
    </ErrorBoundary>
  );
}
