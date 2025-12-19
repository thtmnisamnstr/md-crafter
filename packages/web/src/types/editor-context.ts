import type * as monaco from 'monaco-editor';
import type { GrammarService } from '../services/grammar';
import type { SpellcheckService } from '../services/spellcheck';
import type { Tab } from '../store/types';

/**
 * Editor instance type alias for clarity
 */
export type EditorInstance = monaco.editor.IStandaloneCodeEditor;
export type DiffEditorInstance = monaco.editor.IDiffEditor;
export type MonacoInstance = typeof monaco;

/**
 * Context value for Editor Context
 * Provides access to editor instances and services throughout the app
 */
export interface EditorContextValue {
  // Primary editor (active tab)
  primaryEditor: EditorInstance | null;
  primaryMonaco: MonacoInstance | null;
  
  // Secondary editor (split view)
  secondaryEditor: EditorInstance | null;
  secondaryMonaco: MonacoInstance | null;
  
  // Diff editor (when in diff mode)
  diffEditor: DiffEditorInstance | null;
  diffMonaco: MonacoInstance | null;
  
  // Services
  grammarService: GrammarService | null;
  spellcheckService: SpellcheckService | null;
  
  // Registration functions
  registerPrimaryEditor: (editor: EditorInstance, monaco: MonacoInstance) => void;
  registerSecondaryEditor: (editor: EditorInstance, monaco: MonacoInstance) => void;
  registerDiffEditor: (editor: DiffEditorInstance, monaco: MonacoInstance) => void;
  unregisterPrimaryEditor: () => void;
  unregisterSecondaryEditor: () => void;
  unregisterDiffEditor: () => void;
  
  // Service registration
  registerGrammarService: (service: GrammarService) => void;
  registerSpellcheckService: (service: SpellcheckService) => void;
  unregisterGrammarService: () => void;
  unregisterSpellcheckService: () => void;
  
  // Helper to get active editor (primary or secondary based on focus)
  getActiveEditor: () => EditorInstance | null;

  // Monaco model management (per-tab models for undo/redo persistence)
  getOrCreateModel: (tab: Tab, monacoInstance?: MonacoInstance | null) => monaco.editor.ITextModel | null;
  disposeModel: (tabId: string) => void;
}
