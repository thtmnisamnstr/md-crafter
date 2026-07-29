interface VideoProps {
  src?: string;
  title?: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number | string;
  height?: number | string;
  children?: React.ReactNode;
}

interface EmbedTarget {
  type: 'youtube' | 'vimeo' | 'file';
  src: string;
}

function extractSource(src?: string, children?: React.ReactNode): string {
  if (typeof src === 'string' && src.trim()) return src.trim();
  if (typeof children === 'string' && children.trim()) return children.trim();
  return '';
}

function resolveEmbedTarget(raw: string): EmbedTarget {
  const value = raw.trim();

  const youtubeMatch = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (youtubeMatch?.[1]) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
    };
  }

  const vimeoMatch = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch?.[1]) {
    return {
      type: 'vimeo',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return {
    type: 'file',
    src: value,
  };
}

export function Video({
  src,
  title,
  poster,
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  width = '100%',
  height,
  children,
}: VideoProps) {
  const source = extractSource(src, children);

  if (!source) {
    return null;
  }

  const embed = resolveEmbedTarget(source);
  const containerStyle: React.CSSProperties = {
    width,
    maxWidth: '100%',
  };

  if (embed.type !== 'file') {
    const ratioHeight = height ?? '420px';
    return (
      <div className="my-4" style={containerStyle}>
        <iframe
          title={title || 'Embedded video'}
          src={embed.src}
          width="100%"
          height={String(ratioHeight)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ border: '1px solid var(--tab-border)', borderRadius: '8px' }}
        />
      </div>
    );
  }

  return (
    <div className="my-4" style={containerStyle}>
      <video
        src={embed.src}
        title={title}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        poster={poster}
        width="100%"
        height={height}
        style={{ borderRadius: '8px', border: '1px solid var(--tab-border)' }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
