import { useStore } from '../store';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

export function Toast() {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <XCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-yellow-500" />;
      case 'info':
        return <Info size={18} className="text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={clsx('toast', toast.type)}
          style={{ color: 'var(--editor-fg)' }}
        >
          {getIcon(toast.type)}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded hover:bg-sidebar-hover opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

