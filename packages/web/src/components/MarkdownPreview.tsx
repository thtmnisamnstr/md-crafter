import { useMemo, useRef, useEffect, useState } from 'react';
import { marked } from 'marked';
import { MDXPreview } from './MDXPreview';

interface MarkdownPreviewProps {
  content: string;
  isMdx?: boolean;
}

// Configure marked for GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Simple HTML sanitizer to prevent XSS
function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function MarkdownPreview({ content, isMdx = false }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Check if content looks like MDX
  const hasJsx = useMemo(() => {
    if (isMdx) return true;
    // Check for common MDX patterns
    return /<[A-Z][a-zA-Z]*/.test(content) || /^import\s+/m.test(content);
  }, [content, isMdx]);
  
  // If MDX, use the MDX preview
  if (hasJsx) {
    return <MDXPreview content={content} />;
  }

  // Parse and sanitize markdown
  const html = useMemo(() => {
    try {
      const rawHtml = marked.parse(content) as string;
      return sanitizeHtml(rawHtml);
    } catch (error) {
      console.error('Markdown parse error:', error);
      return '<p class="text-red-400">Error rendering markdown</p>';
    }
  }, [content]);

  // Handle link clicks to open in new tab
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          // Handle relative links and anchors
          if (href.startsWith('#')) {
            const element = container.querySelector(href);
            element?.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  // Add IDs to headers for anchor links
  const processedHtml = useMemo(() => {
    return html.replace(/<(h[1-6])>([^<]+)<\/\1>/gi, (match, tag, text) => {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `<${tag} id="${id}">${text}</${tag}>`;
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
