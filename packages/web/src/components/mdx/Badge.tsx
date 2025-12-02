import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: ReactNode;
}

const variants = {
  default: {
    bg: 'var(--sidebar-hover)',
    color: 'var(--editor-fg)',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.2)',
    color: 'rgb(34, 197, 94)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.2)',
    color: 'rgb(245, 158, 11)',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.2)',
    color: 'rgb(239, 68, 68)',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.2)',
    color: 'rgb(59, 130, 246)',
  },
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  const style = variants[variant];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {children}
    </span>
  );
}

