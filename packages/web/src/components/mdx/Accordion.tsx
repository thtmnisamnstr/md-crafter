import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="my-4 border border-tab-border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between text-left font-medium hover:bg-sidebar-hover transition-colors"
        style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          className="px-4 py-3 border-t border-tab-border"
          style={{ background: 'var(--editor-bg)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

