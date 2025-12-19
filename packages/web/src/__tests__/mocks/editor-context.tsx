import { ReactNode } from 'react';
import { vi } from 'vitest';
import type * as monaco from 'monaco-editor';
import { EditorContext } from '../../contexts/EditorContext';
import type { EditorContextValue } from '../../types/editor-context';
import type { GrammarService } from '../../services/grammar';
import type { SpellcheckService } from '../../services/spellcheck';

/**
 * Mock editor instance for testing
 */
export interface MockEditor {
  getSelection: () => monaco.Selection | null;
  getModel: () => monaco.editor.ITextModel | null;
  executeEdits: (source: string, edits: monaco.editor.IIdentifiedSingleEditOperation[]) => void;
  getAction: (actionId: string) => { run: () => void } | null;
  onDidChangeCursorSelection: (callback: () => void) => { dispose: () => void };
  onDidChangeModelContent: (callback: () => void) => { dispose: () => void };
  onDidFocusEditorText: (callback: () => void) => { dispose: () => void };
  focus: () => void;
  getDomNode: () => HTMLElement | null;
  dispose: () => void;
}

/**
 * Creates a mock Monaco editor instance for testing
 */
export function createMockEditor(overrides?: Partial<MockEditor>): MockEditor {
  const mockSelection: monaco.Selection = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1,
    selectionStartLineNumber: 1,
    selectionStartColumn: 1,
    positionLineNumber: 1,
    positionColumn: 1,
  };

  const mockModel: monaco.editor.ITextModel = {
    getValueInRange: () => '',
    getValue: () => '',
    getLineCount: () => 1,
    getLineContent: () => '',
    getLineMaxColumn: () => 1,
    onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeLanguage: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  } as any;

  return {
    getSelection: () => mockSelection,
    getModel: () => mockModel,
    updateOptions: vi.fn(),
    executeEdits: vi.fn(),
    getAction: vi.fn(() => ({ run: vi.fn() })),
    onDidChangeCursorSelection: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    onDidFocusEditorText: vi.fn(() => ({ dispose: vi.fn() })),
    focus: vi.fn(),
    getDomNode: () => {
      // Safely create element, fallback to mock if document not available
      if (typeof document !== 'undefined') {
        return document.createElement('div');
      }
      return { tagName: 'div' } as HTMLElement;
    },
    dispose: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock Monaco instance for testing
 */
export function createMockMonaco(): typeof monaco {
  return {
    editor: {
      setTheme: vi.fn(),
      defineTheme: vi.fn(),
      createModel: vi.fn((value: string) => ({
        getValue: () => value,
        setValue: vi.fn(),
        onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeLanguage: vi.fn(() => ({ dispose: vi.fn() })),
        pushUndoStop: vi.fn(),
        dispose: vi.fn(),
      })),
      setModelLanguage: vi.fn(),
    },
    Selection: class {},
    Range: class {},
    Uri: {
      parse: (v: string) => ({ toString: () => v }),
    },
  } as any;
}

/**
 * Mock Editor Context Provider for testing
 * 
 * Provides a controlled editor context that can be customized for each test.
 * Use this instead of the real EditorContextProvider in tests.
 * 
 * This uses the real EditorContext so components using useEditorContext will work correctly.
 */
export function MockEditorContextProvider({
  children,
  primaryEditor,
  primaryMonaco,
  secondaryEditor,
  secondaryMonaco,
  diffEditor,
  diffMonaco,
  grammarService,
  spellcheckService,
}: {
  children: ReactNode;
  primaryEditor?: MockEditor | null;
  primaryMonaco?: typeof monaco | null;
  secondaryEditor?: MockEditor | null;
  secondaryMonaco?: typeof monaco | null;
  diffEditor?: monaco.editor.IDiffEditor | null;
  diffMonaco?: typeof monaco | null;
  grammarService?: GrammarService | null;
  spellcheckService?: SpellcheckService | null;
}) {
  const mockValue: EditorContextValue = {
    primaryEditor: (primaryEditor as any) || null,
    primaryMonaco: primaryMonaco || null,
    secondaryEditor: (secondaryEditor as any) || null,
    secondaryMonaco: secondaryMonaco || null,
    diffEditor: diffEditor || null,
    diffMonaco: diffMonaco || null,
    grammarService: grammarService || null,
    spellcheckService: spellcheckService || null,
    registerPrimaryEditor: vi.fn(),
    registerSecondaryEditor: vi.fn(),
    registerDiffEditor: vi.fn(),
    unregisterPrimaryEditor: vi.fn(),
    unregisterSecondaryEditor: vi.fn(),
    unregisterDiffEditor: vi.fn(),
    registerGrammarService: vi.fn(),
    registerSpellcheckService: vi.fn(),
    unregisterGrammarService: vi.fn(),
    unregisterSpellcheckService: vi.fn(),
    getActiveEditor: () => (primaryEditor as any) || null,
    getOrCreateModel: vi.fn(() => null),
    disposeModel: vi.fn(),
  };

  // Use the real EditorContext so components using useEditorContext work correctly
  return <EditorContext.Provider value={mockValue}>{children}</EditorContext.Provider>;
}

/**
 * Helper to create a mock editor context value
 */
export function createMockEditorContext(overrides?: Partial<EditorContextValue>): EditorContextValue {
  const mockEditor = createMockEditor();
  const mockMonaco = createMockMonaco();

  return {
    primaryEditor: mockEditor as any,
    primaryMonaco: mockMonaco,
    secondaryEditor: null,
    secondaryMonaco: null,
    diffEditor: null,
    diffMonaco: null,
    grammarService: null,
    spellcheckService: null,
    registerPrimaryEditor: vi.fn(),
    registerSecondaryEditor: vi.fn(),
    registerDiffEditor: vi.fn(),
    unregisterPrimaryEditor: vi.fn(),
    unregisterSecondaryEditor: vi.fn(),
    unregisterDiffEditor: vi.fn(),
    registerGrammarService: vi.fn(),
    registerSpellcheckService: vi.fn(),
    unregisterGrammarService: vi.fn(),
    unregisterSpellcheckService: vi.fn(),
    getActiveEditor: () => mockEditor as any,
    getOrCreateModel: vi.fn(() => null),
    disposeModel: vi.fn(),
    ...overrides,
  };
}
