import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type * as monaco from 'monaco-editor';
import type { EditorContextValue } from '../types/editor-context';
import type { GrammarService } from '../services/grammar';
import type { SpellcheckService } from '../services/spellcheck';
import type { Tab } from '../store/types';

// Track editor disposables using WeakMap for type-safe cleanup
// WeakMap allows garbage collection when editor instances are no longer referenced
const editorDisposables = new WeakMap<
  monaco.editor.IStandaloneCodeEditor,
  monaco.IDisposable
>();

export const EditorContext = createContext<EditorContextValue | undefined>(undefined);

/**
 * Hook to access the Editor Context
 * @throws Error if used outside of EditorContextProvider
 */
export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorContext must be used within an EditorContextProvider');
  }
  return context;
}

interface EditorContextProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for Editor Context
 * Manages editor instances and services for the entire application
 */
export function EditorContextProvider({ children }: EditorContextProviderProps) {
  // Editor instances state
  const [primaryEditor, setPrimaryEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [primaryMonaco, setPrimaryMonaco] = useState<typeof monaco | null>(null);
  const [secondaryEditor, setSecondaryEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [secondaryMonaco, setSecondaryMonaco] = useState<typeof monaco | null>(null);
  const [diffEditor, setDiffEditor] = useState<monaco.editor.IDiffEditor | null>(null);
  const [diffMonaco, setDiffMonaco] = useState<typeof monaco | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const modelsRef = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
  
  // Refs for synchronous access to editors (fixes race conditions in event handlers)
  const primaryEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const secondaryEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  // Services stored in refs to avoid re-renders
  const grammarServiceRef = useRef<GrammarService | null>(null);
  const spellcheckServiceRef = useRef<SpellcheckService | null>(null);
  
  // Track which editor is currently focused
  const focusedEditorRef = useRef<'primary' | 'secondary' | null>(null);
  
  // Registration functions
  const registerPrimaryEditor = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    // Set window properties SYNCHRONOUSLY for E2E test access
    // This must happen before React state updates to avoid race conditions
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      window.monacoEditor = editor;
      window.monaco = monacoInstance;
    }
    
    primaryEditorRef.current = editor;
    setPrimaryEditor(editor);
    setPrimaryMonaco(monacoInstance);
    monacoRef.current = monacoInstance;
    
    // Track focus to determine active editor
    const disposable = editor.onDidFocusEditorText(() => {
      focusedEditorRef.current = 'primary';
    });
    
    // Store disposable for cleanup using WeakMap (type-safe)
    editorDisposables.set(editor, disposable);
  }, []);
  
  const registerSecondaryEditor = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    // Set window properties SYNCHRONOUSLY for E2E test access
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      window.secondaryEditor = editor;
    }
    
    secondaryEditorRef.current = editor;
    setSecondaryEditor(editor);
    setSecondaryMonaco(monacoInstance);
    monacoRef.current = monacoInstance;
    
    // Track focus to determine active editor
    const disposable = editor.onDidFocusEditorText(() => {
      focusedEditorRef.current = 'secondary';
    });
    
    // Store disposable for cleanup using WeakMap (type-safe)
    editorDisposables.set(editor, disposable);
  }, []);
  
  const registerDiffEditor = useCallback((editor: monaco.editor.IDiffEditor, monacoInstance: typeof monaco) => {
    // Set window properties SYNCHRONOUSLY for E2E test access
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      window.diffEditor = editor;
    }
    
    setDiffEditor(editor);
    setDiffMonaco(monacoInstance);
    monacoRef.current = monacoInstance;
  }, []);
  
  const unregisterPrimaryEditor = useCallback(() => {
    // NOTE: Do NOT delete window.monacoEditor here - it causes race conditions
    // with React's useEffect dependency updates. The register functions overwrite
    // the value when a new editor mounts, and page unload cleans up naturally.
    
    // Cleanup focus tracking using WeakMap (type-safe)
    if (primaryEditorRef.current) {
      const disposable = editorDisposables.get(primaryEditorRef.current);
      disposable?.dispose();
      editorDisposables.delete(primaryEditorRef.current);
    }
    
    primaryEditorRef.current = null;
    setPrimaryEditor(null);
    setPrimaryMonaco(null);
    if (focusedEditorRef.current === 'primary') {
      focusedEditorRef.current = null;
    }
  }, []);
  
  const unregisterSecondaryEditor = useCallback(() => {
    // NOTE: Do NOT delete window.secondaryEditor here - same race condition issue
    
    // Cleanup focus tracking using WeakMap (type-safe)
    if (secondaryEditorRef.current) {
      const disposable = editorDisposables.get(secondaryEditorRef.current);
      disposable?.dispose();
      editorDisposables.delete(secondaryEditorRef.current);
    }
    
    secondaryEditorRef.current = null;
    setSecondaryEditor(null);
    setSecondaryMonaco(null);
    if (focusedEditorRef.current === 'secondary') {
      focusedEditorRef.current = null;
    }
  }, []);
  
  const unregisterDiffEditor = useCallback(() => {
    // NOTE: Do NOT delete window.diffEditor here - same race condition issue
    
    setDiffEditor(null);
    setDiffMonaco(null);
  }, []);
  
  // Service registration
  const registerGrammarService = useCallback((service: GrammarService) => {
    grammarServiceRef.current = service;
  }, []);
  
  const registerSpellcheckService = useCallback((service: SpellcheckService) => {
    spellcheckServiceRef.current = service;
  }, []);
  
  const unregisterGrammarService = useCallback(() => {
    grammarServiceRef.current = null;
  }, []);
  
  const unregisterSpellcheckService = useCallback(() => {
    spellcheckServiceRef.current = null;
  }, []);
  
  // Helper to get active editor (primary or secondary based on focus)
  const getActiveEditor = useCallback((): monaco.editor.IStandaloneCodeEditor | null => {
    // If we have a focused editor preference, use that
    if (focusedEditorRef.current === 'secondary' && secondaryEditorRef.current) {
      return secondaryEditorRef.current;
    }
    if (focusedEditorRef.current === 'primary' && primaryEditorRef.current) {
      return primaryEditorRef.current;
    }
    
    // Fallback to primary editor if available
    if (primaryEditorRef.current) {
      return primaryEditorRef.current;
    }
    
    // Last resort: secondary editor
    return secondaryEditorRef.current;
  }, []);

  // Monaco model management
  const hydrateModelHistory = useCallback((model: monaco.editor.ITextModel, tab: Tab) => {
    const snapshots = [...(tab.undoStack || []), tab.content];
    if (snapshots.length === 0) {
      model.setValue(tab.content);
      return;
    }
    // Build undo chain: set base, then apply each snapshot with undo stops
    model.setValue(snapshots[0]);
    for (let i = 1; i < snapshots.length; i++) {
      model.pushStackElement();
      model.setValue(snapshots[i]);
      model.pushStackElement();
    }
    // Redo stack across sessions is not reliable to reconstruct; start clean
  }, []);

  const getOrCreateModel = useCallback(
    (tab: Tab, monacoInstance?: typeof monaco | null) => {
      const m = monacoInstance || monacoRef.current || primaryMonaco || secondaryMonaco || diffMonaco;
      if (!m) return null;
      monacoRef.current = m;
      const existing = modelsRef.current.get(tab.id);
      if (existing) {
        // Check if model was disposed externally (e.g., by DiffEditor cleanup)
        if (existing.isDisposed()) {
          modelsRef.current.delete(tab.id);
          // Fall through to create new model
        } else {
          return existing;
        }
      }
      const ext = tab.title.split('.').pop() || tab.language || 'txt';
      const uri = m.Uri.parse(`inmemory://tab/${tab.id}.${ext}`);
      const model = m.editor.createModel(tab.content, undefined, uri);
      m.editor.setModelLanguage(model, tab.language || 'markdown');
      hydrateModelHistory(model, tab);
      modelsRef.current.set(tab.id, model);
      return model;
    },
    [diffMonaco, hydrateModelHistory, primaryMonaco, secondaryMonaco]
  );

  const disposeModel = useCallback((tabId: string) => {
    const existing = modelsRef.current.get(tabId);
    if (existing) {
      if (!existing.isDisposed()) {
        existing.dispose();
      }
      modelsRef.current.delete(tabId);
    }
  }, []);

  // Cleanup focus tracking when editors change (not models!)
  useEffect(() => {
    // Capture the current editors for cleanup
    const currentPrimaryEditor = primaryEditor;
    const currentSecondaryEditor = secondaryEditor;
    
    return () => {
      // Only cleanup focus tracking for the specific editors that are changing
      // DO NOT clear models here - they should persist across editor changes
      if (currentPrimaryEditor) {
        const disposable = editorDisposables.get(currentPrimaryEditor);
        disposable?.dispose();
        editorDisposables.delete(currentPrimaryEditor);
      }
      if (currentSecondaryEditor) {
        const disposable = editorDisposables.get(currentSecondaryEditor);
        disposable?.dispose();
        editorDisposables.delete(currentSecondaryEditor);
      }
    };
  }, [primaryEditor, secondaryEditor]);

  // Cleanup models only on unmount (not when editors change)
  useEffect(() => {
    return () => {
      modelsRef.current.forEach((model) => {
        if (!model.isDisposed()) {
          model.dispose();
        }
      });
      modelsRef.current.clear();
    };
  }, []); // Empty deps - only runs on unmount
  
  // Backup sync for window properties (E2E testing, development/test only)
  // Primary assignment happens synchronously in register functions above.
  // This useEffect serves as a fallback for edge cases and keeps values in sync.
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      // Only set if not already set (register functions handle synchronous assignment)
      if (primaryEditor && !window.monacoEditor) {
        window.monacoEditor = primaryEditor;
      }
      if (primaryMonaco && !window.monaco) {
        window.monaco = primaryMonaco;
      }
      if (diffEditor && !window.diffEditor) {
        window.diffEditor = diffEditor;
      }
      if (secondaryEditor && !window.secondaryEditor) {
        window.secondaryEditor = secondaryEditor;
    }
    }
    // NO CLEANUP HERE - cleanup is handled by unregister functions synchronously
    // Having cleanup here causes race conditions with React StrictMode
  }, [primaryEditor, primaryMonaco, diffEditor, secondaryEditor]);
  
  const value: EditorContextValue = {
    primaryEditor,
    primaryMonaco,
    secondaryEditor,
    secondaryMonaco,
    diffEditor,
    diffMonaco,
    grammarService: grammarServiceRef.current,
    spellcheckService: spellcheckServiceRef.current,
    registerPrimaryEditor,
    registerSecondaryEditor,
    registerDiffEditor,
    unregisterPrimaryEditor,
    unregisterSecondaryEditor,
    unregisterDiffEditor,
    registerGrammarService,
    registerSpellcheckService,
    unregisterGrammarService,
    unregisterSpellcheckService,
    getActiveEditor,
    getOrCreateModel,
    disposeModel,
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}
