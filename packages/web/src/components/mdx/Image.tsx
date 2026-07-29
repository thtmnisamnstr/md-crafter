import { useEffect, useState } from 'react';

interface ImageProps {
  src?: string;
  alt?: string;
  caption?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  children?: React.ReactNode;
}

export function Image({ src, alt = '', caption, title, width, height, children }: ImageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const source = src || (typeof children === 'string' ? children.trim() : '');

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  if (!source) {
    return null;
  }

  return (
    <>
      <figure className="my-4">
        <img
          src={source}
          alt={alt}
          title={title}
          style={{
            maxWidth: '100%',
            width,
            height,
            borderRadius: '8px',
            cursor: 'zoom-in',
            border: '1px solid var(--tab-border)',
          }}
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setLightboxOpen(true);
            }
          }}
        />
        {(caption || title) && (
          <figcaption
            className="text-sm mt-2"
            style={{ color: 'var(--editor-fg)', opacity: 0.7, textAlign: 'center' }}
          >
            {caption || title}
          </figcaption>
        )}
      </figure>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setLightboxOpen(false);
            }
          }}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-label={alt || 'Image preview'}
        >
          <img
            src={source}
            alt={alt}
            style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: '8px' }}
          />
        </div>
      )}
    </>
  );
}
