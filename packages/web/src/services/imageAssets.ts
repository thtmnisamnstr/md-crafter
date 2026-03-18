import { logger } from '@md-crafter/shared';

export const ASSET_URL_PREFIX = 'mdc://asset/';
export const ASSET_ID_DRAG_MIME_TYPE = 'application/x-md-crafter-asset-id';

const STANDALONE_IMAGE_URL_RE = /^\s*(https?:\/\/[^\s]+)\s*$/i;
const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:[?#].*)?$/i;
const MARKDOWN_IMAGE_INLINE_RE = /!\[([^\]]*)\]\((<[^>]+>|[^)\s]+)(?:\s+"([^"]*)")?\)(\{[^}]*\})?/g;
const MARKDOWN_IMAGE_REFERENCE_RE = /!\[([^\]]*)\]\[([^\]]+)\](\{[^}]*\})?/g;
const MARKDOWN_REFERENCE_DEF_RE = /^\s*\[([^\]]+)\]:\s*(<[^>]+>|\([^)]+\)|[^\s]+)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]+)\)))?\s*$/gm;
const WIDTH_ATTR_RE = /\bwidth\s*=\s*"?(\d+)(?:px)?"?/i;
const MIME_RE = /^data:([^;,]+)[;,]/i;
const IMAGE_DATA_URL_RE = /^data:image\/[^;,]+[;,]/i;
let embeddedReferenceCounter = 1;

export interface MarkdownImageToken {
  index: number;
  start: number;
  end: number;
  raw: string;
  alt: string;
  src: string;
  title?: string;
  attrsRaw?: string;
  width?: number;
  sourceKind?: 'inline' | 'reference';
  referenceLabel?: string;
  referenceDefinitionStart?: number;
  referenceDefinitionEnd?: number;
}

export interface ImageAssetInput {
  id?: string;
  dataUrl: string;
  mimeType: string;
  fileName: string;
  sourceUrl?: string;
}

interface ImageInsertionOptions {
  embedImagesAsBase64: boolean;
  upsertImageAsset: (asset: ImageAssetInput) => string;
}

interface ImageSaveOptions extends ImageInsertionOptions {
  resolveAssetDataUrl: (assetId: string) => string | null;
}

export type ImageExportFormat = 'png' | 'jpg';

export function isLikelyImageUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith(ASSET_URL_PREFIX)) return true;
  try {
    const parsed = new URL(trimmed);
    if (IMAGE_EXTENSION_RE.test(parsed.pathname)) return true;
    if (/image\//i.test(parsed.searchParams.get('contentType') || '')) return true;

    const nestedImageUrl = (
      parsed.searchParams.get('url')
      || parsed.searchParams.get('src')
      || parsed.searchParams.get('image')
      || ''
    ).trim();
    if (nestedImageUrl && nestedImageUrl !== trimmed && isLikelyImageUrl(nestedImageUrl)) {
      return true;
    }

    // Next.js and similar proxy endpoints: /image?url=...
    if (/\/image(?:\/|$)/i.test(parsed.pathname) && parsed.searchParams.has('url')) {
      return true;
    }

    return false;
  } catch {
    return IMAGE_EXTENSION_RE.test(trimmed);
  }
}

export function normalizeContentForImagePreview(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('![') || trimmed.startsWith('<img')) return line;
      const match = line.match(STANDALONE_IMAGE_URL_RE);
      if (!match || !isLikelyImageUrl(match[1])) return line;
      const indentation = line.match(/^\s*/)?.[0] ?? '';
      return `${indentation}![](${match[1]})`;
    })
    .join('\n');
}

export function parseMarkdownImageTokens(content: string): MarkdownImageToken[] {
  const definitions = collectReferenceDefinitions(content);
  const definitionByNormalizedLabel = new Map(
    definitions.map((definition) => [normalizeReferenceLabel(definition.label), definition])
  );

  const matches: Array<{
    kind: 'inline' | 'reference';
    start: number;
    end: number;
    match: RegExpExecArray;
  }> = [];

  const inlineRegex = new RegExp(MARKDOWN_IMAGE_INLINE_RE.source, 'g');
  let inlineMatch: RegExpExecArray | null = inlineRegex.exec(content);
  while (inlineMatch) {
    matches.push({
      kind: 'inline',
      start: inlineMatch.index,
      end: inlineMatch.index + inlineMatch[0].length,
      match: inlineMatch,
    });
    inlineMatch = inlineRegex.exec(content);
  }

  const referenceRegex = new RegExp(MARKDOWN_IMAGE_REFERENCE_RE.source, 'g');
  let referenceMatch: RegExpExecArray | null = referenceRegex.exec(content);
  while (referenceMatch) {
    matches.push({
      kind: 'reference',
      start: referenceMatch.index,
      end: referenceMatch.index + referenceMatch[0].length,
      match: referenceMatch,
    });
    referenceMatch = referenceRegex.exec(content);
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const tokens: MarkdownImageToken[] = [];
  let index = 0;
  let lastEnd = -1;

  for (const candidate of matches) {
    if (candidate.start < lastEnd) continue;
    const raw = candidate.match[0];
    let src = '';
    let title: string | undefined;
    let attrsRaw: string | undefined;
    let referenceLabel: string | undefined;
    let referenceDefinitionStart: number | undefined;
    let referenceDefinitionEnd: number | undefined;

    if (candidate.kind === 'inline') {
      src = normalizeImageSrc(candidate.match[2] || '');
      title = candidate.match[3] || undefined;
      attrsRaw = candidate.match[4];
    } else {
      attrsRaw = candidate.match[3];
      referenceLabel = (candidate.match[2] || '').trim();
      const definition = definitionByNormalizedLabel.get(normalizeReferenceLabel(referenceLabel));
      if (definition) {
        src = normalizeImageSrc(definition.src);
        title = definition.title;
        referenceLabel = definition.label;
        referenceDefinitionStart = definition.start;
        referenceDefinitionEnd = definition.end;
      }
    }

    if (!src) continue;
    const widthMatch = attrsRaw?.match(WIDTH_ATTR_RE);
    const width = widthMatch ? Number(widthMatch[1]) : undefined;
    tokens.push({
      index,
      start: candidate.start,
      end: candidate.end,
      raw,
      alt: candidate.match[1] || '',
      src,
      title,
      attrsRaw,
      width,
      sourceKind: candidate.kind,
      referenceLabel,
      referenceDefinitionStart,
      referenceDefinitionEnd,
    });
    index += 1;
    lastEnd = candidate.end;
  }

  return tokens;
}

export function buildMarkdownImageToken(
  token: Pick<MarkdownImageToken, 'alt' | 'src' | 'title' | 'attrsRaw' | 'width'>
): string {
  const src = wrapImageSrc(token.src);
  const escapedAlt = escapeMarkdownAlt(token.alt);
  const title = token.title ? ` "${escapeMarkdownTitle(token.title)}"` : '';
  const attrs = applyWidthToAttrs(token.attrsRaw, token.width);
  return `![${escapedAlt}](${src}${title})${attrs ?? ''}`;
}

export function updateMarkdownImageToken(
  content: string,
  imageIndex: number,
  updates: Partial<Pick<MarkdownImageToken, 'alt' | 'src' | 'title' | 'width'>>
): string {
  const normalizedContent = normalizeContentForImagePreview(content);
  const tokens = parseMarkdownImageTokens(normalizedContent);
  const token = tokens[imageIndex];
  if (!token) return normalizeDocumentImageReferences(normalizedContent);

  const nextTokens = tokens.map((candidate, index) => {
    if (index !== imageIndex) return candidate;
    return {
      ...candidate,
      alt: updates.alt ?? candidate.alt,
      src: updates.src ?? candidate.src,
      title: updates.title === undefined ? candidate.title : updates.title || undefined,
      width: updates.width === undefined ? candidate.width : updates.width || undefined,
    };
  });

  return composeDocumentWithImageCatalog(normalizedContent, nextTokens);
}

export function normalizeDocumentImageReferences(content: string): string {
  const normalizedContent = normalizeContentForImagePreview(content);
  const tokens = parseMarkdownImageTokens(normalizedContent);
  if (tokens.length === 0) return stripImageDefinitionBlocks(normalizedContent, []);
  return composeDocumentWithImageCatalog(normalizedContent, tokens);
}

export function materializeClipboardMarkdownImages(
  content: string,
  options: {
    resolveAssetDataUrl: (assetId: string) => string | null;
    referenceContext?: string;
  }
): string {
  if (!content) return content;

  const definitionsByLabel = new Map<string, { src: string; title?: string }>();
  const contextDefinitions = options.referenceContext
    ? collectReferenceDefinitions(options.referenceContext)
    : [];
  const contentDefinitions = collectReferenceDefinitions(content);

  // Context definitions are fallback-only; content-local definitions take precedence.
  contextDefinitions.forEach((definition) => {
    definitionsByLabel.set(normalizeReferenceLabel(definition.label), {
      src: definition.src,
      title: definition.title,
    });
  });
  contentDefinitions.forEach((definition) => {
    definitionsByLabel.set(normalizeReferenceLabel(definition.label), {
      src: definition.src,
      title: definition.title,
    });
  });

  const inlineRegex = new RegExp(MARKDOWN_IMAGE_INLINE_RE.source, 'g');
  const referenceRegex = new RegExp(MARKDOWN_IMAGE_REFERENCE_RE.source, 'g');

  const withInlineAssetsMaterialized = content.replace(inlineRegex, (raw, alt, srcRaw, title, attrsRaw) => {
    const src = normalizeImageSrc(String(srcRaw || ''));
    const assetId = extractAssetIdFromSrc(src);
    if (!assetId) return raw;
    const dataUrl = options.resolveAssetDataUrl(assetId);
    if (!dataUrl) return raw;
    const widthMatch = String(attrsRaw || '').match(WIDTH_ATTR_RE);
    const width = widthMatch ? Number(widthMatch[1]) : undefined;
    return buildMarkdownImageToken({
      alt: String(alt || ''),
      src: dataUrl,
      title: String(title || '') || undefined,
      attrsRaw: String(attrsRaw || '') || undefined,
      width,
    });
  });

  const withReferenceImagesMaterialized = withInlineAssetsMaterialized.replace(
    referenceRegex,
    (raw, alt, label, attrsRaw) => {
      const normalizedLabel = normalizeReferenceLabel(String(label || ''));
      const definition = definitionsByLabel.get(normalizedLabel);
      if (!definition) return raw;

      const sourceAssetId = extractAssetIdFromSrc(definition.src);
      const src = sourceAssetId
        ? options.resolveAssetDataUrl(sourceAssetId) || definition.src
        : definition.src;

      const widthMatch = String(attrsRaw || '').match(WIDTH_ATTR_RE);
      const width = widthMatch ? Number(widthMatch[1]) : undefined;
      return buildMarkdownImageToken({
        alt: String(alt || ''),
        src,
        title: definition.title,
        attrsRaw: String(attrsRaw || '') || undefined,
        width,
      });
    }
  );

  return withReferenceImagesMaterialized;
}

export function removeAssetImageReferencesFromContent(content: string, assetId: string): string {
  if (!assetId) return content;
  const normalizedContent = normalizeContentForImagePreview(content);
  const tokens = parseMarkdownImageTokens(normalizedContent);
  if (tokens.length === 0) return normalizeDocumentImageReferences(normalizedContent);

  const tokensToRemove = tokens.filter((token) => extractAssetIdFromSrc(token.src) === assetId);
  if (tokensToRemove.length === 0) return normalizeDocumentImageReferences(normalizedContent);

  const removedIndexes = new Set(tokensToRemove.map((token) => token.index));
  const remainingReferenceLabels = new Set(
    tokens
      .filter((token) => !removedIndexes.has(token.index))
      .map((token) => (token.referenceLabel ? normalizeReferenceLabel(token.referenceLabel) : ''))
      .filter(Boolean)
  );

  const rangesToRemove: Array<{ start: number; end: number }> = [];
  for (const token of tokensToRemove) {
    rangesToRemove.push({ start: token.start, end: token.end });
    if (
      token.referenceLabel
      && token.referenceDefinitionStart !== undefined
      && token.referenceDefinitionEnd !== undefined
      && !remainingReferenceLabels.has(normalizeReferenceLabel(token.referenceLabel))
    ) {
      rangesToRemove.push({
        start: token.referenceDefinitionStart,
        end: token.referenceDefinitionEnd,
      });
    }
  }

  const stripped = cleanupBodyAfterImageExtraction(removeRanges(normalizedContent, rangesToRemove));
  return normalizeDocumentImageReferences(stripped);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });
}

export async function createImageMarkdownFromFiles(
  files: File[],
  options: ImageInsertionOptions
): Promise<string[]> {
  const lines: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const dataUrl = await blobToDataUrl(file);
    const src = options.embedImagesAsBase64
      ? dataUrl
      : `${ASSET_URL_PREFIX}${options.upsertImageAsset({
        dataUrl,
        mimeType: file.type || extractMimeTypeFromDataUrl(dataUrl),
        fileName: file.name || createDefaultImageName(file.type),
      })}`;
    const alt = deriveAltFromFileName(file.name || 'image');
    if (options.embedImagesAsBase64) {
      lines.push(buildEmbeddedMarkdownReferenceSnippet(alt, src));
    } else {
      lines.push(buildMarkdownImageToken({
        alt,
        src,
        title: undefined,
        width: undefined,
        attrsRaw: undefined,
      }));
    }
  }
  return lines;
}

export async function createImageMarkdownFromUrls(
  urls: string[],
  options: ImageInsertionOptions
): Promise<string[]> {
  const lines: string[] = [];

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url || !isLikelyImageUrl(url)) continue;

    let src = url;
    try {
      const resolved = await fetchImageUrlAsDataUrl(url);
      if (resolved) {
        src = options.embedImagesAsBase64
          ? resolved.dataUrl
          : `${ASSET_URL_PREFIX}${options.upsertImageAsset({
            dataUrl: resolved.dataUrl,
            mimeType: resolved.mimeType || extractMimeTypeFromDataUrl(resolved.dataUrl),
            fileName: fileNameFromUrl(url) || createDefaultImageName(resolved.mimeType),
            sourceUrl: url,
          })}`;
      }
    } catch (error) {
      logger.warn('Failed to cache image URL on insertion, keeping original URL', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const alt = deriveAltFromFileName(fileNameFromUrl(url) || 'image');
    if (options.embedImagesAsBase64 && isEmbeddedImageSrc(src)) {
      lines.push(buildEmbeddedMarkdownReferenceSnippet(alt, src));
    } else {
      lines.push(buildMarkdownImageToken({
        alt,
        src,
        title: undefined,
        width: undefined,
        attrsRaw: undefined,
      }));
    }
  }

  return lines;
}

export function resolveImageSourceForPreview(
  src: string,
  resolveAssetDataUrl: (assetId: string) => string | null
): string {
  if (!src.startsWith(ASSET_URL_PREFIX)) return src;
  const assetId = extractAssetIdFromSrc(src);
  if (!assetId) return src;
  return resolveAssetDataUrl(assetId) || src;
}

export function extractAssetIdFromSrc(src: string): string | null {
  if (!src.startsWith(ASSET_URL_PREFIX)) return null;
  const id = src.slice(ASSET_URL_PREFIX.length).trim();
  return id || null;
}

export function listAssetIdsInContent(content: string): string[] {
  const normalizedContent = normalizeContentForImagePreview(content);
  const tokens = parseMarkdownImageTokens(normalizedContent);
  const ids = tokens
    .map((token) => extractAssetIdFromSrc(token.src))
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

export function isEmbeddedImageSrc(src: string): boolean {
  return IMAGE_DATA_URL_RE.test(src.trim());
}

export function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(MIME_RE);
  return match?.[1] || 'image/png';
}

export function imageFormatToMimeType(format: ImageExportFormat): 'image/png' | 'image/jpeg' {
  return format === 'png' ? 'image/png' : 'image/jpeg';
}

export function imageFormatToExtension(format: ImageExportFormat): 'png' | 'jpg' {
  return format === 'png' ? 'png' : 'jpg';
}

export function fileBaseName(fileName: string | undefined, fallback = 'image'): string {
  const normalized = (fileName || fallback).trim();
  const withoutExt = normalized.replace(/\.[^.]+$/, '').trim();
  return withoutExt || fallback;
}

export async function imageSourceToDataUrl(src: string): Promise<string> {
  const normalizedSrc = normalizeImageSrc(src);
  if (isEmbeddedImageSrc(normalizedSrc)) {
    return normalizedSrc;
  }

  const desktopDataUrl = await fetchImageDataUrlViaDesktopApi(normalizedSrc);
  if (desktopDataUrl) {
    return desktopDataUrl;
  }

  const response = await fetch(normalizedSrc);
  if (!response.ok) {
    throw new Error(`Failed to fetch image source: ${response.status}`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('Image source did not resolve to an image');
  }
  return blobToDataUrl(blob);
}

export async function convertDataUrlToImageFormat(
  dataUrl: string,
  format: ImageExportFormat
): Promise<string> {
  const targetMime = imageFormatToMimeType(format);
  if (mimeTypeFromDataUrl(dataUrl) === targetMime) {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 1;
        canvas.height = img.naturalHeight || img.height || 1;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Could not get canvas context for image conversion'));
          return;
        }

        // Use a white background when converting to JPEG so transparency does not turn black.
        if (targetMime === 'image/jpeg') {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to decode image data for conversion'));
    img.src = dataUrl;
  });
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function downloadImageDataUrlAsFormat(
  dataUrl: string,
  format: ImageExportFormat,
  fileNameBase: string
): Promise<void> {
  const converted = await convertDataUrlToImageFormat(dataUrl, format);
  const ext = imageFormatToExtension(format);
  downloadDataUrl(converted, `${fileNameBase}.${ext}`);
}

export async function downloadImageSourceAsFormat(
  src: string,
  format: ImageExportFormat,
  fileNameBase: string
): Promise<void> {
  const dataUrl = await imageSourceToDataUrl(src);
  await downloadImageDataUrlAsFormat(dataUrl, format, fileNameBase);
}

export async function cacheDocumentImagesForSave(
  content: string,
  options: ImageSaveOptions
): Promise<string> {
  const normalizedContent = normalizeContentForImagePreview(content);
  const tokens = parseMarkdownImageTokens(normalizedContent);
  if (tokens.length === 0) return normalizedContent;

  let nextContent = normalizedContent;
  for (let imageIndex = 0; imageIndex < tokens.length; imageIndex += 1) {
    const currentTokens = parseMarkdownImageTokens(nextContent);
    const token = currentTokens[imageIndex];
    if (!token) continue;
    const normalizedSrc = await normalizeImageSourceForSave(token.src, options, token.index);
    nextContent = updateMarkdownImageToken(nextContent, imageIndex, {
      src: normalizedSrc,
    });
  }

  return nextContent;
}

function normalizeImageSrc(src: string): string {
  const trimmed = src.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return normalizeImageSrc(trimmed.slice(1, -1));
  }
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function wrapImageSrc(src: string): string {
  if (/\s/.test(src)) return `<${src}>`;
  return src;
}

function wrapMarkdownReferenceSrc(src: string): string {
  if (src.startsWith('data:')) return `<${src}>`;
  return wrapImageSrc(src);
}

function escapeMarkdownAlt(alt: string): string {
  return alt.replace(/]/g, '\\]');
}

function escapeMarkdownReferenceLabel(label: string): string {
  return label.replace(/]/g, '\\]');
}

function escapeMarkdownTitle(title: string): string {
  return title.replace(/"/g, '\\"');
}

function applyWidthToAttrs(attrsRaw: string | undefined, width: number | undefined): string | undefined {
  const current = (attrsRaw || '').replace(/[{}]/g, '').trim();
  let next = current;

  if (width && width > 0) {
    if (WIDTH_ATTR_RE.test(next)) {
      next = next.replace(WIDTH_ATTR_RE, `width=${Math.round(width)}`);
    } else {
      next = `${next} width=${Math.round(width)}`.trim();
    }
  } else {
    next = next.replace(WIDTH_ATTR_RE, '').replace(/\s{2,}/g, ' ').trim();
  }

  return next ? `{${next}}` : undefined;
}

function buildMarkdownImageReferenceToken(token: {
  alt: string;
  referenceLabel: string;
  attrsRaw?: string;
  width?: number;
}): string {
  const escapedAlt = escapeMarkdownAlt(token.alt);
  const escapedReferenceLabel = escapeMarkdownReferenceLabel(token.referenceLabel);
  const attrs = applyWidthToAttrs(token.attrsRaw, token.width);
  return `![${escapedAlt}][${escapedReferenceLabel}]${attrs ?? ''}`;
}

function buildMarkdownReferenceDefinition(definition: {
  label: string;
  src: string;
  title?: string;
}): string {
  const title = definition.title ? ` "${escapeMarkdownTitle(definition.title)}"` : '';
  return `[${escapeMarkdownReferenceLabel(definition.label)}]: ${wrapMarkdownReferenceSrc(definition.src)}${title}`;
}

function deriveAltFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base.replace(/[_-]+/g, ' ').trim() || 'image';
}

function normalizeReferenceLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function collectReferenceDefinitions(content: string): Array<{
  label: string;
  src: string;
  title?: string;
  start: number;
  end: number;
}> {
  const definitions: Array<{
    label: string;
    src: string;
    title?: string;
    start: number;
    end: number;
  }> = [];

  const regex = new RegExp(MARKDOWN_REFERENCE_DEF_RE.source, 'gm');
  let match: RegExpExecArray | null = regex.exec(content);
  while (match) {
    definitions.push({
      label: (match[1] || '').trim(),
      src: normalizeImageSrc(match[2] || ''),
      title: match[3] || match[4] || match[5] || undefined,
      start: match.index,
      end: match.index + match[0].length,
    });
    match = regex.exec(content);
  }

  return definitions;
}

function nextEmbeddedReferenceLabel(): string {
  const label = `image${embeddedReferenceCounter}`;
  embeddedReferenceCounter += 1;
  return label;
}

function buildEmbeddedMarkdownReferenceSnippet(alt: string, dataUrl: string): string {
  const referenceLabel = nextEmbeddedReferenceLabel();
  const token = buildMarkdownImageReferenceToken({
    alt,
    referenceLabel,
    attrsRaw: undefined,
    width: undefined,
  });
  const definition = buildMarkdownReferenceDefinition({
    label: referenceLabel,
    src: dataUrl,
    title: undefined,
  });
  return `${token}\n\n${definition}`;
}

function fileNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || null;
  } catch {
    return null;
  }
}

function extractMimeTypeFromDataUrl(dataUrl: string): string {
  return mimeTypeFromDataUrl(dataUrl);
}

function composeDocumentWithImageCatalog(
  content: string,
  tokens: Array<Pick<MarkdownImageToken, 'start' | 'end' | 'raw' | 'alt' | 'src' | 'title' | 'attrsRaw' | 'width' | 'referenceLabel'>>
): string {
  if (tokens.length === 0) return stripImageDefinitionBlocks(content, []);

  const sortedTokens = [...tokens].sort((a, b) => a.start - b.start || a.end - b.end);

  let cursor = 0;
  let bodyWithCanonicalReferences = '';
  const referenceEntries = sortedTokens.map((token, index) => {
    const referenceLabel = `image${index + 1}`;
    bodyWithCanonicalReferences += content.slice(cursor, token.start);
    bodyWithCanonicalReferences += buildMarkdownImageReferenceToken({
      alt: token.alt,
      referenceLabel,
      attrsRaw: token.attrsRaw,
      width: token.width,
    });
    cursor = token.end;

    const definition = buildMarkdownReferenceDefinition({
      label: referenceLabel,
      src: token.src,
      title: token.title,
    });
    return { label: referenceLabel, definition };
  });
  bodyWithCanonicalReferences += content.slice(cursor);

  const definitionCleanupTokens = [
    ...sortedTokens,
    ...referenceEntries.map((entry) => ({ referenceLabel: entry.label })),
  ];
  const bodyWithoutImageDefinitions = stripImageDefinitionBlocks(
    bodyWithCanonicalReferences,
    definitionCleanupTokens
  );
  const definitionSection = referenceEntries.map((entry) => entry.definition).join('\n\n');
  if (!bodyWithoutImageDefinitions.trim()) return definitionSection;
  return `${bodyWithoutImageDefinitions.trimEnd()}\n\n${definitionSection}`;
}

function collectImageDefinitionRanges(
  content: string,
  tokens: Array<Pick<MarkdownImageToken, 'referenceLabel'>>
): Array<{ start: number; end: number }> {
  const tokenReferenceLabels = new Set(
    tokens
      .map((token) => (token.referenceLabel ? normalizeReferenceLabel(token.referenceLabel) : ''))
      .filter(Boolean)
  );

  return collectReferenceDefinitions(content)
    .filter((definition) => (
      tokenReferenceLabels.has(normalizeReferenceLabel(definition.label))
      || isImageLikeSource(definition.src)
    ))
    .map((definition) => ({ start: definition.start, end: definition.end }));
}

function stripImageDefinitionBlocks(
  content: string,
  tokens: Array<Pick<MarkdownImageToken, 'referenceLabel'>>
): string {
  const ranges = collectImageDefinitionRanges(content, tokens);
  return cleanupBodyAfterImageExtraction(removeRanges(content, ranges));
}

function isImageLikeSource(src: string): boolean {
  const normalized = normalizeImageSrc(src);
  return isLikelyImageUrl(normalized) || normalized.startsWith(ASSET_URL_PREFIX);
}

function removeRanges(content: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) return content;
  const merged = mergeRanges(ranges);
  let cursor = 0;
  let result = '';
  for (const range of merged) {
    result += content.slice(cursor, range.start);
    cursor = range.end;
  }
  result += content.slice(cursor);
  return result;
}

function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  const sorted = [...ranges]
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Array<{ start: number; end: number }> = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
      continue;
    }
    if (range.end > last.end) {
      last.end = range.end;
    }
  }
  return merged;
}

function cleanupBodyAfterImageExtraction(content: string): string {
  return content
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function createDefaultImageName(mimeType: string): string {
  const extension = mimeType.split('/')[1]?.split(';')[0] || 'png';
  return `image-${Date.now()}.${extension}`;
}

async function normalizeImageSourceForSave(
  rawSrc: string,
  options: ImageSaveOptions,
  imageIndex: number
): Promise<string> {
  const src = normalizeImageSrc(rawSrc);

  if (src.startsWith(ASSET_URL_PREFIX)) {
    if (!options.embedImagesAsBase64) return src;
    const assetId = extractAssetIdFromSrc(src);
    if (!assetId) return src;
    return options.resolveAssetDataUrl(assetId) || src;
  }

  if (src.startsWith('data:image/')) {
    if (options.embedImagesAsBase64) return src;
    const assetId = options.upsertImageAsset({
      dataUrl: src,
      mimeType: extractMimeTypeFromDataUrl(src),
      fileName: `embedded-image-${imageIndex + 1}.${extractMimeTypeFromDataUrl(src).split('/')[1] || 'png'}`,
    });
    return `${ASSET_URL_PREFIX}${assetId}`;
  }

  if (!isLikelyImageUrl(src)) return src;

  try {
    const resolved = await fetchImageUrlAsDataUrl(src);
    if (!resolved) return src;
    const { dataUrl, mimeType } = resolved;
    if (options.embedImagesAsBase64) return dataUrl;

    const assetId = options.upsertImageAsset({
      dataUrl,
      mimeType: mimeType || extractMimeTypeFromDataUrl(dataUrl),
      fileName: fileNameFromUrl(src) || createDefaultImageName(mimeType),
      sourceUrl: src,
    });
    return `${ASSET_URL_PREFIX}${assetId}`;
  } catch (error) {
    logger.warn('Failed to cache image for save, keeping original source', {
      src,
      error: error instanceof Error ? error.message : String(error),
    });
    return src;
  }
}

type DesktopImageFetchResult = {
  success: boolean;
  dataUrl?: string;
  mimeType?: string;
  error?: string;
};

async function fetchImageDataUrlViaDesktopApi(src: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const fetchImageDataUrl = window.api?.fetchImageDataUrl;
  if (typeof fetchImageDataUrl !== 'function') return null;

  try {
    const result = await fetchImageDataUrl(src) as DesktopImageFetchResult;
    if (result?.success && result.dataUrl && isEmbeddedImageSrc(result.dataUrl)) {
      return result.dataUrl;
    }
    if (result && !result.success) {
      logger.warn('Desktop image fetch returned unsuccessful result', {
        src,
        error: result.error,
      });
    }
  } catch (error) {
    logger.warn('Desktop image fetch failed', {
      src,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

async function fetchImageUrlAsDataUrl(
  src: string
): Promise<{ dataUrl: string; mimeType: string } | null> {
  const normalizedSrc = normalizeImageSrc(src);
  const desktopDataUrl = await fetchImageDataUrlViaDesktopApi(normalizedSrc);
  if (desktopDataUrl) {
    return {
      dataUrl: desktopDataUrl,
      mimeType: extractMimeTypeFromDataUrl(desktopDataUrl),
    };
  }

  const response = await fetch(normalizedSrc);
  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    return null;
  }

  const dataUrl = await blobToDataUrl(blob);
  return {
    dataUrl,
    mimeType: blob.type || extractMimeTypeFromDataUrl(dataUrl),
  };
}
