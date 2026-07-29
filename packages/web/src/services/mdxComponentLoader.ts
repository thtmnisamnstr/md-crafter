import { logger } from '@md-crafter/shared';
import { mdxComponents } from '../components/mdx';
import type { ComponentType } from 'react';
import type {
  MdxComponentDefinition,
  MdxComponentPropDoc,
} from '../store/types';
import { createWorkspaceFileSystem, WorkspacePathContext } from './workspaceFs';

export interface ResolverContext extends WorkspacePathContext {
  specifierSource?: 'document-import' | 'component-library';
}

export interface LoadedComponentModule {
  module: Record<string, unknown>;
  resolvedSpecifier: string;
}

export interface LoadedComponentDefinition {
  definition: MdxComponentDefinition;
  component: ComponentType<unknown> | null;
  propDocs: MdxComponentPropDoc[];
  error?: string;
}

export interface BuildComponentMapContext extends WorkspacePathContext {
  componentDefinitions?: MdxComponentDefinition[];
  documentImports?: DocumentImportStatement[];
  baseComponents?: Record<string, unknown>;
}

export interface BuildComponentMapResult {
  components: Record<string, unknown>;
  definitionResults: LoadedComponentDefinition[];
  importErrors: string[];
}

export interface DocumentImportStatement {
  raw: string;
  source: string;
  defaultImport?: string;
  namespaceImport?: string;
  namedImports: Array<{ imported: string; local: string }>;
}

export interface DocumentImportParseResult {
  imports: DocumentImportStatement[];
  contentWithoutImports: string;
}

const moduleCache = new Map<string, Promise<Record<string, unknown>>>();
const esmShBlobUrlCache = new Map<string, Promise<string>>();
const cssInjectionCache = new Map<string, Promise<void>>();
const scriptInjectionCache = new Map<string, Promise<void>>();
let esbuildInitPromise: Promise<typeof import('esbuild-wasm')> | null = null;
const TAILWIND_RUNTIME_SCRIPT_URL = 'https://cdn.tailwindcss.com';
const RUNTIME_BRIDGE_PATH_MAP: Record<string, string> = {
  react: 'mdx-runtime/react.js',
  'react/jsx-runtime': 'mdx-runtime/react-jsx-runtime.js',
  'react/jsx-dev-runtime': 'mdx-runtime/react-jsx-dev-runtime.js',
  'react-dom': 'mdx-runtime/react-dom.js',
  'react-dom/client': 'mdx-runtime/react-dom-client.js',
  'react-dom/server': 'mdx-runtime/react-dom-server.js',
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
}

function inferLoaderFromPath(pathOrType: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  if (pathOrType.endsWith('.tsx')) return 'tsx';
  if (pathOrType.endsWith('.ts')) return 'ts';
  if (pathOrType.endsWith('.jsx')) return 'jsx';
  return 'js';
}

function normalizeSpecifier(specifier: string): string {
  return specifier.trim().replace(/^['"]|['"]$/g, '');
}

function isHttpSpecifier(specifier: string): boolean {
  return specifier.startsWith('http://') || specifier.startsWith('https://');
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function isBareSpecifier(specifier: string): boolean {
  return !isRelativeSpecifier(specifier) && !specifier.startsWith('/') && !specifier.startsWith('workspace:/') && !isHttpSpecifier(specifier);
}

function toRuntimeBridgeUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const locationHref =
    (typeof window !== 'undefined' && window.location?.href) ||
    ((globalThis as { location?: { href?: string } }).location?.href);
  if (locationHref) {
    return new URL(normalizedPath, locationHref).toString();
  }
  return `/${normalizedPath}`;
}

function mapRuntimeSpecifierToHostUrl(specifier: string): string | null {
  const normalized = normalizeSpecifier(specifier);
  if (!normalized) return null;
  if (normalized.includes('/mdx-runtime/')) return normalized;
  if (normalized.startsWith('/@id/')) {
    const viteId = normalized.replace(/^\/@id\//, '');
    if (RUNTIME_BRIDGE_PATH_MAP[viteId]) {
      return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP[viteId]);
    }
  }
  if (normalized.includes('/@id/')) {
    const marker = '/@id/';
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      const viteId = normalized.slice(idx + marker.length);
      if (RUNTIME_BRIDGE_PATH_MAP[viteId]) {
        return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP[viteId]);
      }
    }
  }
  if (RUNTIME_BRIDGE_PATH_MAP[normalized]) {
    return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP[normalized]);
  }

  if (normalized.startsWith('https://esm.sh/')) {
    let pathname = '';
    try {
      pathname = new URL(normalized).pathname;
    } catch {
      return null;
    }
    const segments = pathname.split('/').filter(Boolean);
    if (!segments.length) return null;

    let index = 0;
    if (/^v\d+$/.test(segments[index]) || segments[index] === 'stable') index += 1;
    const root = segments[index] || '';
    const trailing = segments.slice(index + 1).join('/');

    if (root.startsWith('react@') || root === 'react') {
      if (/jsx-dev-runtime(?:\.mjs)?$/.test(trailing) || trailing.startsWith('jsx-dev-runtime')) {
        return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP['react/jsx-dev-runtime']);
      }
      if (/jsx-runtime(?:\.mjs)?$/.test(trailing) || trailing.startsWith('jsx-runtime')) {
        return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP['react/jsx-runtime']);
      }
      return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP.react);
    }

    if (root.startsWith('react-dom@') || root === 'react-dom') {
      if (/\/client(?:\.mjs)?$/.test(`/${trailing}`) || trailing.startsWith('client')) {
        return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP['react-dom/client']);
      }
      if (/\/server(?:\.mjs)?$/.test(`/${trailing}`) || trailing.startsWith('server')) {
        return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP['react-dom/server']);
      }
      return toRuntimeBridgeUrl(RUNTIME_BRIDGE_PATH_MAP['react-dom']);
    }
  }

  return null;
}

function npmSpecifierToUrl(specifier: string, version?: string): string {
  const cleaned = normalizeSpecifier(specifier).replace(/^npm:/, '');
  if (!cleaned) throw new Error('Invalid npm specifier');
  if (version && !cleaned.includes('@')) {
    return `https://esm.sh/${cleaned}@${version}`;
  }
  return `https://esm.sh/${cleaned}`;
}

interface GithubModuleTarget {
  owner: string;
  repo: string;
  ref?: string;
  filePath: string;
}

function encodePathSegments(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function parseGitHubHttpUrl(urlValue: URL): GithubModuleTarget | null {
  const host = urlValue.hostname.toLowerCase();
  const pathSegments = urlValue.pathname.split('/').filter(Boolean);
  if (!pathSegments.length) return null;

  if (host === 'github.com') {
    if (pathSegments.length < 5) return null;
    const [owner, repo, mode, ...rest] = pathSegments;
    if (!owner || !repo) return null;
    if (mode !== 'blob' && mode !== 'raw' && mode !== 'tree') return null;
    const ref = rest.shift();
    const filePath = rest.join('/');
    if (!ref || !filePath) return null;
    return { owner, repo, ref, filePath };
  }

  if (host === 'raw.githubusercontent.com') {
    if (pathSegments.length < 4) return null;
    const [owner, repo] = pathSegments;
    if (!owner || !repo) return null;

    if (pathSegments[2] === 'refs' && pathSegments.length >= 6) {
      const ref = `${pathSegments[2]}/${pathSegments[3]}/${pathSegments[4]}`;
      const filePath = pathSegments.slice(5).join('/');
      if (!filePath) return null;
      return { owner, repo, ref, filePath };
    }

    const ref = pathSegments[2];
    const filePath = pathSegments.slice(3).join('/');
    if (!ref || !filePath) return null;
    return { owner, repo, ref, filePath };
  }

  return null;
}

function parseGitHubSpecifier(source: string): GithubModuleTarget | null {
  const cleaned = normalizeSpecifier(source).replace(/^github:/, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      return parseGitHubHttpUrl(new URL(cleaned));
    } catch {
      return null;
    }
  }

  const pathSegments = cleaned.split('/').filter(Boolean);
  if (pathSegments.length < 3) return null;
  const owner = pathSegments[0];
  const repoWithOptionalRef = pathSegments[1];
  if (!owner || !repoWithOptionalRef) return null;

  const [repo, inlineRef] = repoWithOptionalRef.split('@');
  if (!repo) return null;
  const filePath = pathSegments.slice(2).join('/');
  if (!filePath) return null;
  return { owner, repo, ref: inlineRef || undefined, filePath };
}

function githubSpecifierToUrl(source: string, ref?: string): string {
  const parsed = parseGitHubSpecifier(source);
  if (!parsed) {
    throw new Error('Invalid GitHub specifier. Use owner/repo/path, github.com/blob URL, or raw.githubusercontent URL.');
  }
  const effectiveRef = (ref || parsed.ref || '').trim();
  const refPart = effectiveRef ? `@${encodeURIComponent(effectiveRef)}` : '';
  const filePath = encodePathSegments(parsed.filePath);
  return `https://esm.sh/gh/${parsed.owner}/${parsed.repo}${refPart}/${filePath}`;
}

function githubRawUrl(target: GithubModuleTarget, filePath: string): string {
  const ref = (target.ref || 'main').split('/').filter(Boolean).map((part) => encodeURIComponent(part)).join('/');
  const normalizedPath = encodePathSegments(filePath);
  return `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${ref}/${normalizedPath}`;
}

function extractStaticCssImports(source: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /import\s+['"]([^'"]+\.css(?:\?[^'"]*)?)['"]/g,
    /import\s+[^'"]+\s+from\s+['"]([^'"]+\.css(?:\?[^'"]*)?)['"]/g,
    /export\s+[^'"]+\s+from\s+['"]([^'"]+\.css(?:\?[^'"]*)?)['"]/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const specifier = match[1]?.trim();
      if (specifier) matches.add(specifier);
    }
  }
  return [...matches];
}

function resolveGithubCssSpecifierToRawUrl(target: GithubModuleTarget, cssSpecifier: string): string | null {
  const clean = cssSpecifier.split('?')[0]?.trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('/')) {
    if (clean.startsWith('/@/')) {
      const aliasBase = inferAliasBasePath(target.filePath);
      if (!aliasBase) return null;
      const aliasPath = `${aliasBase}${clean.slice('/@/'.length)}`;
      return githubRawUrl(target, aliasPath);
    }
    return null;
  }
  if (!clean.startsWith('./') && !clean.startsWith('../')) {
    return null;
  }
  const origin = `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${(target.ref || 'main').split('/').filter(Boolean).map((part) => encodeURIComponent(part)).join('/')}/`;
  const basePath = target.filePath.startsWith('/') ? target.filePath.slice(1) : target.filePath;
  const baseDir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/') + 1) : '';
  const resolvedUrl = new URL(clean, `${origin}${baseDir}`).toString();
  return resolvedUrl;
}

async function injectCssText(cssText: string, key: string): Promise<void> {
  if (typeof document === 'undefined') return;
  if (document.head.querySelector(`style[data-mdx-component-style="${key}"]`)) return;
  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-mdx-component-style', key);
  styleElement.textContent = cssText;
  document.head.appendChild(styleElement);
}

async function loadAndInjectCss(url: string): Promise<void> {
  if (cssInjectionCache.has(url)) {
    return cssInjectionCache.get(url)!;
  }

  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSS ${url} (${response.status})`);
    }
    const cssText = await response.text();
    await injectCssText(cssText, url);
  })();

  cssInjectionCache.set(url, promise);
  try {
    await promise;
  } catch (error) {
    cssInjectionCache.delete(url);
    throw error;
  }
}

async function ensureTailwindRuntimeLoaded(): Promise<void> {
  const url = TAILWIND_RUNTIME_SCRIPT_URL;
  if (scriptInjectionCache.has(url)) {
    return scriptInjectionCache.get(url)!;
  }

  const promise = (async () => {
    if (typeof document === 'undefined') return;
    const existing = document.head.querySelector(`script[data-mdx-component-style-script="${url}"]`);
    if (existing) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-mdx-component-style-script', url);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${url}`));
      document.head.appendChild(script);
    });
  })();

  scriptInjectionCache.set(url, promise);
  try {
    await promise;
  } catch (error) {
    scriptInjectionCache.delete(url);
    throw error;
  }
}

async function ensureGithubCssLoaded(source: string, ref?: string): Promise<void> {
  const parsed = parseGitHubSpecifier(source);
  if (!parsed) return;
  const target: GithubModuleTarget = {
    ...parsed,
    ref: (ref || parsed.ref || 'main').trim() || 'main',
  };

  let candidates: string[] = [];
  try {
    const sourceResponse = await fetch(githubRawUrl(target, target.filePath));
    if (sourceResponse.ok) {
      const moduleSource = await sourceResponse.text();
      const cssSpecifiers = extractStaticCssImports(moduleSource);
      candidates = cssSpecifiers
        .map((specifier) => resolveGithubCssSpecifierToRawUrl(target, specifier))
        .filter((url): url is string => !!url);
    }
  } catch {
    candidates = [];
  }

  await ensureTailwindRuntimeLoaded().catch(() => {
    // Optional enhancement; repo CSS may still be sufficient.
  });
  if (!candidates.length) return;

  await Promise.all(candidates.map(async (candidateUrl) => {
    try {
      await loadAndInjectCss(candidateUrl);
    } catch {
      // best-effort; missing candidate files are expected for many repos.
    }
  }));
}

function rewriteBareImportsToEsm(source: string): string {
  return source.replace(
    /(from\s+['"])([^'"]+)(['"])/g,
    (_match, prefix: string, specifier: string, suffix: string) => {
      if (!isBareSpecifier(specifier)) return `${prefix}${specifier}${suffix}`;
      const runtimeSpecifier = mapRuntimeSpecifierToHostUrl(specifier);
      if (runtimeSpecifier) return `${prefix}${runtimeSpecifier}${suffix}`;
      return `${prefix}https://esm.sh/${specifier}${suffix}`;
    }
  ).replace(
    /(import\s+['"])([^'"]+)(['"])/g,
    (_match, prefix: string, specifier: string, suffix: string) => {
      if (!isBareSpecifier(specifier)) return `${prefix}${specifier}${suffix}`;
      const runtimeSpecifier = mapRuntimeSpecifierToHostUrl(specifier);
      if (runtimeSpecifier) return `${prefix}${runtimeSpecifier}${suffix}`;
      return `${prefix}https://esm.sh/${specifier}${suffix}`;
    }
  );
}

function parseEsmShGithubUrl(specifier: string): GithubModuleTarget | null {
  const withoutQuery = specifier.split('?')[0];
  const match = withoutQuery.match(/^https:\/\/esm\.sh\/gh\/([^/]+)\/([^@/]+)(?:@([^/]+))?\/(.+)$/);
  if (!match) return null;
  const [, owner, repo, refRaw, filePath] = match;
  const ref = refRaw ? decodeURIComponent(refRaw) : undefined;
  return {
    owner,
    repo,
    ref,
    filePath,
  };
}

function hasPathExtension(path: string): boolean {
  const lastSegment = path.split('/').filter(Boolean).pop() || '';
  return /\.[a-zA-Z0-9]+$/.test(lastSegment);
}

function splitUrlAndQuery(specifier: string): { url: string; query: string } {
  const [url, ...queryParts] = specifier.split('?');
  return {
    url,
    query: queryParts.length ? `?${queryParts.join('?')}` : '',
  };
}

function normalizeGithubSourcePath(filePath: string): string {
  const segments = filePath.split('/').filter(Boolean);
  if (!segments.length) return filePath;
  const first = segments[0]?.toLowerCase() || '';
  if (/^es\d{4}$/.test(first) || first === 'esnext') {
    return segments.slice(1).join('/');
  }
  return segments.join('/');
}

function inferAliasBasePath(filePath: string): string {
  const normalizedFilePath = normalizeGithubSourcePath(filePath);
  const srcIndex = normalizedFilePath.lastIndexOf('/src/');
  if (srcIndex >= 0) {
    return normalizedFilePath.slice(0, srcIndex + '/src/'.length);
  }
  const lastSlash = normalizedFilePath.lastIndexOf('/');
  if (lastSlash >= 0) {
    return normalizedFilePath.slice(0, lastSlash + 1);
  }
  return '';
}

function rewriteRootRelativeImports(
  source: string,
  baseOrigin: string,
  githubTarget?: GithubModuleTarget | null
): string {
  const splitPathAndQuery = (value: string): { pathname: string; query: string } => {
    const [pathname, ...rest] = value.split('?');
    return {
      pathname,
      query: rest.length ? `?${rest.join('?')}` : '',
    };
  };

  const toAbsolute = (path: string): string => {
    if (!path.startsWith('/')) return path;
    if (githubTarget && path.startsWith('/@/')) {
      const { pathname, query } = splitPathAndQuery(path);
      const aliasBase = inferAliasBasePath(githubTarget.filePath);
      if (aliasBase) {
        const aliasPath = `${aliasBase}${pathname.slice('/@/'.length)}`;
        const githubUrl = githubSpecifierToUrl(
          `github:${githubTarget.owner}/${githubTarget.repo}/${aliasPath}`,
          githubTarget.ref
        );
        return `${githubUrl}${query}`;
      }
    }
    return `${baseOrigin}${path}`;
  };

  return source
    .replace(
      /(from\s+['"])(\/[^'"]+)(['"])/g,
      (_match, prefix: string, specifier: string, suffix: string) => `${prefix}${toAbsolute(specifier)}${suffix}`
    )
    .replace(
      /(import\s+['"])(\/[^'"]+)(['"])/g,
      (_match, prefix: string, specifier: string, suffix: string) => `${prefix}${toAbsolute(specifier)}${suffix}`
    )
    .replace(
      /(export\s+\*\s+from\s+['"])(\/[^'"]+)(['"])/g,
      (_match, prefix: string, specifier: string, suffix: string) => `${prefix}${toAbsolute(specifier)}${suffix}`
    )
    .replace(
      /(export\s+\{[^}]+\}\s+from\s+['"])(\/[^'"]+)(['"])/g,
      (_match, prefix: string, specifier: string, suffix: string) => `${prefix}${toAbsolute(specifier)}${suffix}`
    )
    .replace(
      /(import\(\s*['"])(\/[^'"]+)(['"]\s*\))/g,
      (_match, prefix: string, specifier: string, suffix: string) => `${prefix}${toAbsolute(specifier)}${suffix}`
    );
}

function parseStaticModuleSpecifiers(source: string): Set<string> {
  const values = new Set<string>();
  const importPattern = /import\s*(?:[^'"]*?\s*from\s*)?["']([^"']+)["']/g;
  const exportPattern = /export\s*(?:[^'"]*?\s*from\s*)["']([^"']+)["']/g;
  const dynamicImportPattern = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const pattern of [importPattern, exportPattern, dynamicImportPattern]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const specifier = match[1]?.trim();
      if (specifier) values.add(specifier);
    }
  }
  return values;
}

function rewriteModuleSpecifiers(
  source: string,
  replacementMap: Map<string, string>
): string {
  const replaceSpecifier = (specifier: string): string => replacementMap.get(specifier) || specifier;
  return source
    .replace(
      /(import\s*(?:[^'"]*?\s*from\s*)?)(["'])([^"']+)(\2)/g,
      (_match, prefix: string, quote: string, specifier: string) => `${prefix}${quote}${replaceSpecifier(specifier)}${quote}`
    )
    .replace(
      /(export\s*(?:[^'"]*?\s*from\s*))(["'])([^"']+)(\2)/g,
      (_match, prefix: string, quote: string, specifier: string) => `${prefix}${quote}${replaceSpecifier(specifier)}${quote}`
    )
    .replace(
      /(import\s*\(\s*)(["'])([^"']+)(\2)(\s*\))/g,
      (_match, prefix: string, quote: string, specifier: string, _q2: string, suffix: string) =>
        `${prefix}${quote}${replaceSpecifier(specifier)}${quote}${suffix}`
    );
}

function resolveModuleSpecifier(
  specifier: string,
  parentModuleUrl: string,
  githubTarget?: GithubModuleTarget | null
): string {
  const normalized = normalizeSpecifier(specifier);
  if (!normalized) return normalized;
  const runtimeSpecifier = mapRuntimeSpecifierToHostUrl(normalized);
  if (runtimeSpecifier) return runtimeSpecifier;
  if (normalized.startsWith('blob:') || normalized.startsWith('data:') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    if (githubTarget && normalized.startsWith('/@/')) {
      const [pathname, ...queryParts] = normalized.split('?');
      const query = queryParts.length ? `?${queryParts.join('?')}` : '';
      const aliasBase = inferAliasBasePath(githubTarget.filePath);
      if (aliasBase) {
        const aliasPath = `${aliasBase}${pathname.slice('/@/'.length)}`;
        return `${githubSpecifierToUrl(`github:${githubTarget.owner}/${githubTarget.repo}/${aliasPath}`, githubTarget.ref)}${query}`;
      }
    }
    return `https://esm.sh${normalized}`;
  }
  if (normalized.startsWith('./') || normalized.startsWith('../')) {
    return new URL(normalized, parentModuleUrl).toString();
  }
  return normalized;
}

async function materializeEsmShModule(url: string): Promise<string> {
  const normalized = normalizeSpecifier(url);
  if (!normalized.startsWith('https://esm.sh/')) return normalized;
  if (esmShBlobUrlCache.has(normalized)) {
    return esmShBlobUrlCache.get(normalized)!;
  }

  const blobPromise = (async () => {
    const { url: normalizedNoQuery, query } = splitUrlAndQuery(normalized);
    const fetchModuleSource = async (): Promise<{ source: string; effectiveUrl: string }> => {
      const response = await fetch(normalized);
      if (response.ok) {
        return {
          source: await response.text(),
          effectiveUrl: normalized,
        };
      }

      const githubTarget = parseEsmShGithubUrl(normalizedNoQuery);
      if (githubTarget && !hasPathExtension(githubTarget.filePath)) {
        const candidatePaths = [
          `${githubTarget.filePath}/index.tsx`,
          `${githubTarget.filePath}/index.jsx`,
          `${githubTarget.filePath}/index.ts`,
          `${githubTarget.filePath}/index.js`,
          `${githubTarget.filePath}.tsx`,
          `${githubTarget.filePath}.jsx`,
          `${githubTarget.filePath}.ts`,
          `${githubTarget.filePath}.js`,
        ];
        for (const candidatePath of candidatePaths) {
          const candidateUrl = `${githubSpecifierToUrl(
            `github:${githubTarget.owner}/${githubTarget.repo}/${candidatePath}`,
            githubTarget.ref
          )}${query}`;
          const candidateResponse = await fetch(candidateUrl);
          if (candidateResponse.ok) {
            return {
              source: await candidateResponse.text(),
              effectiveUrl: candidateUrl,
            };
          }
        }
      }

      throw new Error(`Failed to fetch module ${normalized} (${response.status})`);
    };

    const { source, effectiveUrl } = await fetchModuleSource();
    const githubTarget = parseEsmShGithubUrl(splitUrlAndQuery(effectiveUrl).url);
    const prelim = rewriteRootRelativeImports(source, 'https://esm.sh', githubTarget);
    const specifiers = parseStaticModuleSpecifiers(prelim);
    const replacementMap = new Map<string, string>();

    await Promise.all([...specifiers].map(async (specifier) => {
      const resolved = resolveModuleSpecifier(specifier, normalized, githubTarget);
      if (resolved.startsWith('https://esm.sh/')) {
        replacementMap.set(specifier, await materializeEsmShModule(resolved));
      } else {
        replacementMap.set(specifier, resolved);
      }
    }));

    const rewritten = rewriteModuleSpecifiers(prelim, replacementMap);
    const blob = new Blob([rewritten], { type: 'text/javascript' });
    return URL.createObjectURL(blob);
  })();

  esmShBlobUrlCache.set(normalized, blobPromise);
  return blobPromise;
}

async function ensureEsbuild(): Promise<typeof import('esbuild-wasm')> {
  if (esbuildInitPromise) return esbuildInitPromise;
  esbuildInitPromise = (async () => {
    const esbuild = await import('esbuild-wasm');
    await esbuild.initialize({
      wasmURL: 'https://esm.sh/esbuild-wasm@0.25.12/esbuild.wasm',
      worker: true,
    });
    return esbuild;
  })();
  return esbuildInitPromise;
}

async function transpileInlineModule(
  source: string,
  loader: 'js' | 'jsx' | 'ts' | 'tsx'
): Promise<string> {
  const esbuild = await ensureEsbuild();
  const transformed = await esbuild.transform(source, {
    loader,
    format: 'esm',
    target: 'es2020',
    jsx: 'automatic',
    sourcemap: false,
  });
  return rewriteBareImportsToEsm(transformed.code);
}

async function importModuleFromCode(
  code: string,
  cacheKey: string
): Promise<Record<string, unknown>> {
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)!;
  }

  const modulePromise = (async () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      const loaded = await import(/* @vite-ignore */ blobUrl);
      return loaded as Record<string, unknown>;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  })();

  moduleCache.set(cacheKey, modulePromise);
  return modulePromise;
}

export function parseDocumentImports(source: string): DocumentImportParseResult {
  const lines = source.split('\n');
  const imports: DocumentImportStatement[] = [];
  const keptLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('import ') || !trimmed.includes(' from ')) {
      keptLines.push(line);
      continue;
    }

    const match = trimmed.match(/^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?$/);
    if (!match) {
      keptLines.push(line);
      continue;
    }

    const importClause = match[1].trim();
    const sourceSpecifier = match[2].trim();
    let defaultImport: string | undefined;
    let namespaceImport: string | undefined;
    const namedImports: Array<{ imported: string; local: string }> = [];

    if (importClause.startsWith('{') && importClause.endsWith('}')) {
      const inner = importClause.slice(1, -1).trim();
      if (inner) {
        for (const part of inner.split(',').map((value) => value.trim()).filter(Boolean)) {
          const [imported, local] = part.split(/\s+as\s+/);
          namedImports.push({
            imported: imported.trim(),
            local: (local || imported).trim(),
          });
        }
      }
    } else if (importClause.startsWith('* as ')) {
      namespaceImport = importClause.replace('* as ', '').trim();
    } else if (importClause.includes(',')) {
      const [first, second] = importClause.split(',', 2).map((part) => part.trim());
      defaultImport = first;
      if (second.startsWith('{') && second.endsWith('}')) {
        const inner = second.slice(1, -1).trim();
        if (inner) {
          for (const part of inner.split(',').map((value) => value.trim()).filter(Boolean)) {
            const [imported, local] = part.split(/\s+as\s+/);
            namedImports.push({
              imported: imported.trim(),
              local: (local || imported).trim(),
            });
          }
        }
      } else if (second.startsWith('* as ')) {
        namespaceImport = second.replace('* as ', '').trim();
      }
    } else {
      defaultImport = importClause;
    }

    imports.push({
      raw: line,
      source: sourceSpecifier,
      defaultImport,
      namespaceImport,
      namedImports,
    });
  }

  return {
    imports,
    contentWithoutImports: keptLines.join('\n'),
  };
}

export async function resolveSpecifier(
  specifier: string,
  context: ResolverContext
): Promise<string> {
  const normalized = normalizeSpecifier(specifier);
  if (!normalized) {
    throw new Error('Empty import specifier');
  }

  const runtimeSpecifier = mapRuntimeSpecifierToHostUrl(normalized);
  if (runtimeSpecifier) {
    return runtimeSpecifier;
  }

  if (normalized.startsWith('npm:')) {
    return npmSpecifierToUrl(normalized);
  }
  if (normalized.startsWith('github:')) {
    return githubSpecifierToUrl(normalized);
  }
  if (isHttpSpecifier(normalized)) {
    const maybeGitHub = parseGitHubSpecifier(normalized);
    if (maybeGitHub) {
      return githubSpecifierToUrl(normalized);
    }
    return normalized;
  }
  if (isBareSpecifier(normalized)) {
    return npmSpecifierToUrl(normalized);
  }

  const fsAdapter = createWorkspaceFileSystem(context);
  const resolvedLocal = fsAdapter.resolveSpecifierPath(normalized, context);
  if (!resolvedLocal) {
    throw new Error(`Unable to resolve local import path: ${specifier}`);
  }
  return resolvedLocal;
}

async function loadLocalModuleFromWorkspace(
  resolvedPath: string,
  context: ResolverContext
): Promise<Record<string, unknown>> {
  const fsAdapter = createWorkspaceFileSystem(context);
  const source = await fsAdapter.readTextFile(resolvedPath);
  const loader = inferLoaderFromPath(resolvedPath);
  const transpiled = await transpileInlineModule(source, loader);
  const cacheKey = `local:${resolvedPath}:${stableStringify(source.length)}`;
  return importModuleFromCode(transpiled, cacheKey);
}

async function loadModuleFromRemoteUrl(url: string): Promise<Record<string, unknown>> {
  const normalized = normalizeSpecifier(url);
  const esmShPrefix = 'https://esm.sh/';
  if (normalized.startsWith(esmShPrefix)) {
    const cacheKey = `remote-esmsh-recursive:${normalized}`;
    if (!moduleCache.has(cacheKey)) {
      moduleCache.set(cacheKey, (async () => {
        const blobUrl = await materializeEsmShModule(normalized);
        const mod = await import(/* @vite-ignore */ blobUrl);
        return mod as Record<string, unknown>;
      })());
    }
    return moduleCache.get(cacheKey)!;
  }

  const cacheKey = `remote:${normalized}`;
  if (!moduleCache.has(cacheKey)) {
    moduleCache.set(cacheKey, import(/* @vite-ignore */ normalized).then((mod) => mod as Record<string, unknown>));
  }
  return moduleCache.get(cacheKey)!;
}

function coercePropDocs(value: unknown): MdxComponentPropDoc[] {
  if (!Array.isArray(value)) return [];
  const results: MdxComponentPropDoc[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const source = entry as Record<string, unknown>;
    if (typeof source.name !== 'string' || typeof source.type !== 'string') continue;
    results.push({
      name: source.name,
      type: source.type,
      required: typeof source.required === 'boolean' ? source.required : undefined,
      defaultValue: typeof source.defaultValue === 'string' ? source.defaultValue : undefined,
      description: typeof source.description === 'string' ? source.description : undefined,
    });
  }
  return results;
}

export function extractPropDocsFromModule(
  module: Record<string, unknown>,
  exportName?: string
): MdxComponentPropDoc[] {
  const resolvedExportName = exportName || 'default';
  const exportedValue = (module as Record<string, unknown>)[resolvedExportName];
  if (!exportedValue) {
    return coercePropDocs(module.propsSchema ?? module.__docgenInfo);
  }

  const asObject = exportedValue as Record<string, unknown>;
  const fromComponent = coercePropDocs(asObject.propsSchema ?? asObject.__docgenInfo);
  if (fromComponent.length) return fromComponent;

  return coercePropDocs(module.propsSchema ?? module.__docgenInfo);
}

export async function loadComponent(definition: MdxComponentDefinition, context: ResolverContext): Promise<LoadedComponentDefinition> {
  try {
    let moduleExports: Record<string, unknown>;
    let resolvedSpecifier: string;

    if (definition.sourceType === 'inline') {
      // Inline definitions are authored directly in the modal and most often contain JSX.
      // Use TSX parsing to support plain JS/JSX as well as optional type annotations.
      const loader: 'tsx' = 'tsx';
      const transpiled = await transpileInlineModule(definition.source, loader);
      const cacheKey = `inline:${definition.id}:${definition.updatedAt}`;
      moduleExports = await importModuleFromCode(transpiled, cacheKey);
      resolvedSpecifier = `inline:${definition.id}`;
    } else if (definition.sourceType === 'npm') {
      resolvedSpecifier = npmSpecifierToUrl(definition.source, definition.versionOrRef);
      moduleExports = await loadModuleFromRemoteUrl(resolvedSpecifier);
    } else if (definition.sourceType === 'github') {
      resolvedSpecifier = githubSpecifierToUrl(definition.source, definition.versionOrRef);
      moduleExports = await loadModuleFromRemoteUrl(resolvedSpecifier);
      await ensureGithubCssLoaded(definition.source, definition.versionOrRef);
    } else {
      resolvedSpecifier = await resolveSpecifier(definition.source, {
        ...context,
        specifierSource: 'component-library',
      });
      moduleExports = isHttpSpecifier(resolvedSpecifier)
        ? await loadModuleFromRemoteUrl(resolvedSpecifier)
        : await loadLocalModuleFromWorkspace(resolvedSpecifier, context);
    }

    const exportName = definition.exportName || 'default';
    const exported = moduleExports[exportName];
    const component = typeof exported === 'function'
      ? (exported as ComponentType<unknown>)
      : null;

    const propDocs = definition.propDocs && definition.propDocs.length > 0
      ? definition.propDocs
      : extractPropDocsFromModule(moduleExports, exportName);

    if (!component) {
      return {
        definition,
        component: null,
        propDocs,
        error: `Export "${exportName}" is not a React component in ${resolvedSpecifier}`,
      };
    }

    return {
      definition,
      component,
      propDocs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to load MDX component definition', {
      id: definition.id,
      name: definition.name,
      sourceType: definition.sourceType,
      error: message,
    });
    return {
      definition,
      component: null,
      propDocs: definition.propDocs || [],
      error: message,
    };
  }
}

async function applyDocumentImport(
  statement: DocumentImportStatement,
  components: Record<string, unknown>,
  context: ResolverContext
): Promise<string | null> {
  try {
    const resolved = await resolveSpecifier(statement.source, {
      ...context,
      specifierSource: 'document-import',
    });
    const module = isHttpSpecifier(resolved)
      ? await loadModuleFromRemoteUrl(resolved)
      : await loadLocalModuleFromWorkspace(resolved, context);

    if (statement.defaultImport) {
      components[statement.defaultImport] = module.default;
    }
    if (statement.namespaceImport) {
      components[statement.namespaceImport] = module;
    }
    for (const namedImport of statement.namedImports) {
      components[namedImport.local] = module[namedImport.imported];
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function buildComponentMap(context: BuildComponentMapContext): Promise<BuildComponentMapResult> {
  const components: Record<string, unknown> = {
    ...(context.baseComponents || mdxComponents),
  };
  const definitionResults: LoadedComponentDefinition[] = [];
  const importErrors: string[] = [];

  const definitions = (context.componentDefinitions || [])
    .filter((definition) => definition.enabled !== false);

  for (const definition of definitions) {
    const loaded = await loadComponent(definition, context);
    definitionResults.push(loaded);
    if (loaded.component) {
      components[definition.name] = loaded.component;
    } else if (loaded.error) {
      importErrors.push(`${definition.name}: ${loaded.error}`);
    }
  }

  for (const statement of context.documentImports || []) {
    const error = await applyDocumentImport(statement, components, context);
    if (error) {
      importErrors.push(`${statement.source}: ${error}`);
    }
  }

  return {
    components,
    definitionResults,
    importErrors,
  };
}
