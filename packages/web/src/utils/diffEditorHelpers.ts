import type * as monaco from 'monaco-editor';

export type DiffViewMode = 'side-by-side' | 'over-under';

/**
 * Apply consistent word wrap and layout options to a Monaco diff editor and both panes.
 * Uses the dedicated override options so each side respects the setting reliably.
 */
export function applyDiffEditorWrap(
  diffEditor: monaco.editor.IDiffEditor,
  opts: { wordWrap: boolean; viewMode: DiffViewMode }
): void {
  const wrap: 'on' | 'off' = opts.wordWrap ? 'on' : 'off';
  const originalEditor = diffEditor.getOriginalEditor();
  const modifiedEditor = diffEditor.getModifiedEditor();

  originalEditor?.updateOptions({ wordWrap: wrap });
  modifiedEditor?.updateOptions({ wordWrap: wrap });

  diffEditor.updateOptions({
    wordWrap: wrap,
    wordWrapOverride1: wrap,
    wordWrapOverride2: wrap,
    diffWordWrap: wrap,
    renderSideBySide: opts.viewMode === 'side-by-side',
  });
}

/**
 * Attach model-change listeners that reapply wrap/layout when models swap in.
 * Returns a cleanup function to dispose listeners.
 */
export function attachDiffModelListeners(
  diffEditor: monaco.editor.IDiffEditor,
  opts: { wordWrap: boolean; viewMode: DiffViewMode }
): () => void {
  const disposables: monaco.IDisposable[] = [];

  const original = diffEditor.getOriginalEditor();
  const modified = diffEditor.getModifiedEditor();

  if (original?.onDidChangeModel) {
    disposables.push(
      original.onDidChangeModel(() => applyDiffEditorWrap(diffEditor, opts))
    );
  }
  if (modified?.onDidChangeModel) {
    disposables.push(
      modified.onDidChangeModel(() => applyDiffEditorWrap(diffEditor, opts))
    );
  }

  // Initial apply in case models were already present
  applyDiffEditorWrap(diffEditor, opts);

  return () => {
    disposables.forEach(d => d.dispose());
  };
}
