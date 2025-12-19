import { X } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'File',
    shortcuts: [
      { keys: '⌘ N', description: 'New document' },
      { keys: '⌘ O', description: 'Open file(s)' },
      { keys: '⌘ S', description: 'Save' },
      { keys: '⌘ ⇧ S', description: 'Save as' },
      { keys: '⌘ W', description: 'Close tab' },
      { keys: '⌘ E', description: 'Export' },
      { keys: '⌘ P', description: 'Print / Export PDF' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: '⌘ Z', description: 'Undo' },
      { keys: '⌘ ⇧ Z', description: 'Redo' },
      { keys: '⌘ X', description: 'Cut' },
      { keys: '⌘ C', description: 'Copy' },
      { keys: '⌘ ⇧ C', description: 'Copy for Word/Docs' },
      { keys: '⌘ V', description: 'Paste' },
      { keys: '⌘ ⇧ V', description: 'Paste from Word/Docs' },
      { keys: '⌘ F', description: 'Find' },
      { keys: '⌘ H', description: 'Find and replace' },
      { keys: '⌘ A', description: 'Select all' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: '⌘ ⇧ P', description: 'Command palette' },
      { keys: '⌘ B', description: 'Toggle sidebar' },
      { keys: '⌘ \\', description: 'Toggle split view' },
      { keys: '⌘ K Z', description: 'Zen mode' },
      { keys: '⌘ ,', description: 'Settings' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: '⌘ /', description: 'Toggle comment' },
      { keys: '⌘ ]', description: 'Indent line' },
      { keys: '⌘ [', description: 'Outdent line' },
      { keys: '⌘ D', description: 'Add selection to next match' },
      { keys: '⌘ L', description: 'Select line' },
      { keys: '⌥ ↑', description: 'Move line up' },
      { keys: '⌥ ↓', description: 'Move line down' },
      { keys: '⌥ ⇧ ↑', description: 'Copy line up' },
      { keys: '⌥ ⇧ ↓', description: 'Copy line down' },
    ],
  },
  {
    title: 'Markdown (in editor)',
    shortcuts: [
      { keys: '⌘ B', description: 'Bold' },
      { keys: '⌘ I', description: 'Italic' },
      { keys: '⌘ K', description: 'Insert link' },
    ],
  },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '700px', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
          <p className="text-sm opacity-60 mb-4" style={{ color: 'var(--editor-fg)' }}>
            On Windows/Linux, use Ctrl instead of ⌘ (Command).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3
                  className="text-sm font-semibold mb-2 opacity-70"
                  style={{ color: 'var(--editor-fg)' }}
                >
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-1 text-sm"
                      style={{ color: 'var(--editor-fg)' }}
                    >
                      <span className="opacity-80">{shortcut.description}</span>
                      <kbd
                        className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{
                          background: 'var(--sidebar-hover)',
                          color: 'var(--editor-fg)',
                        }}
                      >
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

