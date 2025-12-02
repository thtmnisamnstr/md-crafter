import { ReactNode } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: ReactNode;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

const colors = {
  info: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgb(59, 130, 246)',
    icon: 'rgb(59, 130, 246)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgb(245, 158, 11)',
    icon: 'rgb(245, 158, 11)',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgb(239, 68, 68)',
    icon: 'rgb(239, 68, 68)',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.1)',
    border: 'rgb(34, 197, 94)',
    icon: 'rgb(34, 197, 94)',
  },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const Icon = icons[type];
  const color = colors[type];

  return (
    <div
      className="rounded-lg p-4 my-4 flex gap-3"
      style={{
        backgroundColor: color.bg,
        borderLeft: `4px solid ${color.border}`,
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={20} style={{ color: color.icon }} />
      </div>
      <div className="flex-1">
        {title && (
          <div className="font-semibold mb-1" style={{ color: color.icon }}>
            {title}
          </div>
        )}
        <div className="text-sm" style={{ color: 'var(--editor-fg)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

