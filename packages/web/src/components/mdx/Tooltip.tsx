import { ReactNode, useState } from 'react';

interface TooltipProps {
  tip: string;
  children: ReactNode;
}

/**
 * Tooltip component for MDX
 * Shows a tooltip on hover
 */
export function Tooltip({ tip, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span
          className="absolute z-50 px-2 py-1 text-xs rounded shadow-lg whitespace-nowrap"
          style={{
            backgroundColor: 'var(--sidebar-bg)',
            color: 'var(--editor-fg)',
            border: '1px solid var(--tab-border)',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
          }}
        >
          {tip}
        </span>
      )}
    </span>
  );
}

