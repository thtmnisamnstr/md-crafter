import { X } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            About md-crafter
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body text-center">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--editor-accent), #9333ea)',
                color: 'white',
              }}
            >
              M
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--editor-fg)' }}>
            md-crafter
          </h1>
          
          <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
            Version 0.1.0-beta-1
          </p>

          <p className="mb-4" style={{ color: 'var(--editor-fg)' }}>
            A cloud-synced markdown and MDX editor.
          </p>

          <div className="text-sm opacity-70 space-y-2" style={{ color: 'var(--editor-fg)' }}>
            <p>Built with:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['React', 'Monaco Editor', 'TypeScript', 'Electron', 'Tailwind CSS'].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--sidebar-hover)' }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-tab-border">
            <p className="text-xs opacity-50" style={{ color: 'var(--editor-fg)' }}>
              © 2025 Gavin Johnson. MIT License.
            </p>
            <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--editor-fg)' }}>
              <a
                href="https://github.com/thtmnisamnstr/md-crafter"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--editor-accent)' }}
              >
                View on GitHub
              </a>
            </p>
          </div>
        </div>

        <div className="modal-footer justify-center">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

