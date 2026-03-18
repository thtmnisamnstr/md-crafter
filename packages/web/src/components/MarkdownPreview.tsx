import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { marked } from 'marked';
import { logger } from '@md-crafter/shared';
import { MDXPreview } from './MDXPreview';
import {
  downloadImageSourceAsFormat,
  fileBaseName,
  imageSourceToDataUrl,
  isEmbeddedImageSrc,
  type ImageExportFormat,
  normalizeContentForImagePreview,
  parseMarkdownImageTokens,
  resolveImageSourceForPreview,
  updateMarkdownImageToken,
} from '../services/imageAssets';

interface MarkdownPreviewProps {
  content: string;
  isMdx?: boolean;
  tabId?: string;
  resolveImageAssetSrc?: (assetId: string) => string | null;
  onContentChange?: (nextContent: string) => void;
  promoteEmbeddedImageToAsset?: (
    dataUrl: string,
    imageIndex: number,
    format: ImageExportFormat
  ) => Promise<string | null> | string | null;
  onImageEmbedded?: (payload: {
    originalSrc: string;
    embeddedDataUrl: string;
    nextContent: string;
    imageIndex: number;
  }) => void;
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

export function MarkdownPreview({
  content,
  isMdx = false,
  resolveImageAssetSrc = () => null,
  onContentChange,
  promoteEmbeddedImageToAsset,
  onImageEmbedded,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [savingFormat, setSavingFormat] = useState<ImageExportFormat | null>(null);
  const [embeddingImage, setEmbeddingImage] = useState(false);
  const altInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  
  // Check if content looks like MDX
  const hasJsx = useMemo(() => {
    if (isMdx) return true;
    // Check for common MDX patterns
    return /<[A-Z][a-zA-Z]*/.test(content) || /^import\s+/m.test(content);
  }, [content, isMdx]);

  const renderModel = useMemo(() => {
    if (hasJsx) {
      return {
        normalizedContent: content,
        tokens: [],
        html: '',
      };
    }

    try {
      const normalizedContent = normalizeContentForImagePreview(content);
      const tokens = parseMarkdownImageTokens(normalizedContent);

      let markdownWithPlaceholders = '';
      let cursor = 0;
      for (const token of tokens) {
        markdownWithPlaceholders += normalizedContent.slice(cursor, token.start);
        markdownWithPlaceholders += `MDC_IMAGE_PLACEHOLDER_${token.index}`;
        cursor = token.end;
      }
      markdownWithPlaceholders += normalizedContent.slice(cursor);

      const rawHtml = marked.parse(markdownWithPlaceholders) as string;
      const sanitizedHtml = sanitizeHtml(rawHtml);
      const htmlWithHeaders = addHeaderIds(sanitizedHtml);
      const html = injectImageFigures(
        htmlWithHeaders,
        tokens,
        selectedImageIndex,
        resolveImageAssetSrc
      );

      return {
        normalizedContent,
        tokens,
        html,
      };
    } catch (error) {
      logger.error('Markdown parse error', error);
      return {
        normalizedContent: content,
        tokens: [],
        html: '<p class="text-red-400">Error rendering markdown</p>',
      };
    }
  }, [content, hasJsx, selectedImageIndex, resolveImageAssetSrc]);

  const selectedImageToken = useMemo(() => {
    if (selectedImageIndex === null) return null;
    return renderModel.tokens.find((token) => token.index === selectedImageIndex) || null;
  }, [renderModel.tokens, selectedImageIndex]);

  useEffect(() => {
    if (!selectedImageToken) {
      if (altInputRef.current) altInputRef.current.value = '';
      if (captionInputRef.current) captionInputRef.current.value = '';
      return;
    }
    if (altInputRef.current) altInputRef.current.value = selectedImageToken.alt || '';
    if (captionInputRef.current) captionInputRef.current.value = selectedImageToken.title || '';
  }, [selectedImageToken]);

  const applyImageUpdate = useCallback((imageIndex: number, updates: {
    alt?: string;
    src?: string;
    title?: string;
  }) => {
    const nextContent = updateMarkdownImageToken(renderModel.normalizedContent, imageIndex, updates);
    onContentChange?.(nextContent);
  }, [onContentChange, renderModel.normalizedContent]);

  const handleSaveSelectedImage = useCallback(async (format: ImageExportFormat) => {
    if (!selectedImageToken) return;
    const sourceForDownload = resolveImageSourceForPreview(selectedImageToken.src, resolveImageAssetSrc);
    const fallbackBaseName = `image-${selectedImageToken.index + 1}`;
    const imageName = fileBaseName(selectedImageToken.alt || selectedImageToken.title || fallbackBaseName);
    const isEmbedded = isEmbeddedImageSrc(selectedImageToken.src);

    setSavingFormat(format);
    try {
      if (promoteEmbeddedImageToAsset) {
        const dataUrlForSave = isEmbedded
          ? selectedImageToken.src
          : await imageSourceToDataUrl(sourceForDownload);
        const assetSrc = await promoteEmbeddedImageToAsset(
          dataUrlForSave,
          selectedImageToken.index,
          format
        );
        if (assetSrc) {
          applyImageUpdate(selectedImageToken.index, { src: assetSrc });
        }
        return;
      }

      if (isEmbedded) {
        logger.warn('Embedded image save requested but no asset promotion handler is configured', {
          format,
          imageIndex: selectedImageToken.index,
        });
        return;
      }

      await downloadImageSourceAsFormat(sourceForDownload, format, imageName);
    } catch (error) {
      logger.warn('Failed to save image from markdown preview', {
        format,
        imageIndex: selectedImageToken.index,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSavingFormat(null);
    }
  }, [applyImageUpdate, promoteEmbeddedImageToAsset, resolveImageAssetSrc, selectedImageToken]);

  const handleEmbedSelectedImage = useCallback(async () => {
    if (!selectedImageToken || isEmbeddedImageSrc(selectedImageToken.src)) return;

    const sourceForEmbed = resolveImageSourceForPreview(selectedImageToken.src, resolveImageAssetSrc);
    setEmbeddingImage(true);
    try {
      const embeddedDataUrl = await imageSourceToDataUrl(sourceForEmbed);
      const nextContent = updateMarkdownImageToken(renderModel.normalizedContent, selectedImageToken.index, {
        src: embeddedDataUrl,
      });
      onContentChange?.(nextContent);
      onImageEmbedded?.({
        originalSrc: selectedImageToken.src,
        embeddedDataUrl,
        nextContent,
        imageIndex: selectedImageToken.index,
      });
    } catch (error) {
      logger.warn('Failed to embed image in markdown preview', {
        imageIndex: selectedImageToken.index,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setEmbeddingImage(false);
    }
  }, [onContentChange, onImageEmbedded, renderModel.normalizedContent, resolveImageAssetSrc, selectedImageToken]);

  // Handle link clicks to open in new tab
  useEffect(() => {
    if (hasJsx) return;
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
        return;
      }

      const image = target.closest('.md-image-figure img[data-image-index]') as HTMLImageElement | null;
      if (image) {
        const imageIndex = Number(image.dataset.imageIndex || '');
        if (!Number.isNaN(imageIndex)) {
          setSelectedImageIndex(imageIndex);
        }
        return;
      }

      if (!target.closest('.md-image-toolbar')) {
        setSelectedImageIndex(null);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [hasJsx]);

  if (hasJsx) {
    return <MDXPreview content={content} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div
        ref={containerRef}
        className="markdown-preview flex-1"
        dangerouslySetInnerHTML={{ __html: renderModel.html }}
      />

      {selectedImageToken && onContentChange && (
        <div className="md-image-toolbar border-t border-tab-border p-3" key={selectedImageIndex ?? 'none'}>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs opacity-80 min-w-[52px]">Alt Text</label>
            <input
              ref={altInputRef}
              className="input flex-1 min-w-[180px]"
              defaultValue={selectedImageToken.alt || ''}
              placeholder="Describe the image"
            />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <label className="text-xs opacity-80 min-w-[52px]">Caption</label>
            <input
              ref={captionInputRef}
              className="input flex-1 min-w-[180px]"
              defaultValue={selectedImageToken.title || ''}
              placeholder="Optional caption"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                if (selectedImageIndex === null) return;
                const alt = altInputRef.current?.value.trim() || '';
                const title = captionInputRef.current?.value.trim() || '';
                applyImageUpdate(selectedImageIndex, {
                  alt,
                  title,
                });
              }}
            >
              Apply Image Changes
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => void handleSaveSelectedImage('png')}
              disabled={savingFormat !== null || embeddingImage}
            >
              {savingFormat === 'png' ? 'Saving .png...' : 'Save As .png'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => void handleSaveSelectedImage('jpg')}
              disabled={savingFormat !== null || embeddingImage}
            >
              {savingFormat === 'jpg' ? 'Saving .jpg...' : 'Save As .jpg'}
            </button>
            {!isEmbeddedImageSrc(selectedImageToken.src) && (
              <button
                className="btn btn-ghost"
                onClick={() => void handleEmbedSelectedImage()}
                disabled={embeddingImage || savingFormat !== null}
              >
                {embeddingImage ? 'Embedding...' : 'Embed Image'}
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => setSelectedImageIndex(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function addHeaderIds(html: string): string {
  return html.replace(/<(h[1-6])>([^<]+)<\/\1>/gi, (_match, tag, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `<${tag} id="${id}">${text}</${tag}>`;
  });
}

function injectImageFigures(
  html: string,
  tokens: ReturnType<typeof parseMarkdownImageTokens>,
  selectedImageIndex: number | null,
  resolveImageAssetSrc: (assetId: string) => string | null
): string {
  let nextHtml = html;
  for (const token of tokens) {
    const figureClass = token.index === selectedImageIndex
      ? 'md-image-figure is-selected'
      : 'md-image-figure';
    const resolvedSrc = resolveImageSourceForPreview(token.src, resolveImageAssetSrc);
    const src = escapeHtmlAttribute(resolvedSrc || token.src);
    const alt = escapeHtmlAttribute(token.alt || '');
    const caption = token.title ? `<figcaption>${escapeHtmlText(token.title)}</figcaption>` : '';
    const replacement = [
      `<figure class="${figureClass}" data-image-index="${token.index}">`,
      `<img src="${src}" alt="${alt}" data-image-index="${token.index}" />`,
      caption,
      '</figure>',
    ].join('');
    nextHtml = nextHtml.replace(`MDC_IMAGE_PLACEHOLDER_${token.index}`, replacement);
  }
  return nextHtml;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
