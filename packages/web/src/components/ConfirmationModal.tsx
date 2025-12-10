import { useEffect } from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
}: ConfirmationModalProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  // Get icon and button styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle size={20} className="text-red-400" />,
          confirmButtonClass: 'btn-danger',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} className="text-yellow-400" />,
          confirmButtonClass: 'btn-warning',
        };
      default:
        return {
          icon: <Info size={20} className="text-blue-400" />,
          confirmButtonClass: 'btn-primary',
        };
    }
  };

  const { icon, confirmButtonClass } = getVariantStyles();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="bg-sidebar-bg border border-tab-border rounded-lg shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-tab-border">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-sidebar-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm" style={{ color: 'var(--editor-fg)' }}>
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-tab-border">
          <button onClick={onCancel} className="btn btn-ghost">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`btn ${confirmButtonClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

