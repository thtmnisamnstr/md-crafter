import { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

interface CardProps {
  title: string;
  href?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function Card({ title, href, icon, children }: CardProps) {
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`block my-4 p-4 rounded-lg border border-tab-border transition-colors ${
        href ? 'hover:border-editor-accent cursor-pointer' : ''
      }`}
      style={{ background: 'var(--sidebar-bg)' }}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--editor-accent)', color: 'white' }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold" style={{ color: 'var(--editor-fg)' }}>
              {title}
            </h4>
            {href && (
              <ExternalLink size={14} style={{ color: 'var(--editor-fg)', opacity: 0.5 }} />
            )}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--editor-fg)', opacity: 0.7 }}>
            {children}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

