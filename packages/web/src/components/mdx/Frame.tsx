import { ReactNode } from 'react';

interface FrameProps {
  caption?: string;
  children: ReactNode;
}

/**
 * Frame component for MDX
 * Wraps content (typically images) with an optional caption
 */
export function Frame({ caption, children }: FrameProps) {
  return (
    <figure className="my-4">
      <div className="frame-content">
        {children}
      </div>
      {caption && (
        <figcaption className="text-sm opacity-70 mt-2 text-center" style={{ color: 'var(--editor-fg)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

