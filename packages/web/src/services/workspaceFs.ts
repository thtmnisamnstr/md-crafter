import { WorkspaceRoot } from '../store/types';
import { isElectron } from '../utils/platform';

export interface WorkspacePathContext {
  documentPath?: string;
  workspaceRoots?: WorkspaceRoot[];
  activeWorkspaceRootId?: string | null;
}

export interface WorkspaceFileSystem {
  resolveSpecifierPath: (specifier: string, context: WorkspacePathContext) => string | null;
  readTextFile: (resolvedPath: string) => Promise<string>;
  exists: (resolvedPath: string) => Promise<boolean>;
}

const webWorkspaceDirectoryHandles = new Map<string, FileSystemDirectoryHandle>();

export function registerWebWorkspaceDirectoryHandle(
  workspaceRootId: string,
  handle: FileSystemDirectoryHandle
): void {
  webWorkspaceDirectoryHandles.set(workspaceRootId, handle);
}

export function unregisterWebWorkspaceDirectoryHandle(workspaceRootId: string): void {
  webWorkspaceDirectoryHandles.delete(workspaceRootId);
}

function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, '/');
}

function normalizePath(path: string): string {
  const normalized = normalizeSlashes(path.trim());
  const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized);
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === '.') continue;
    if (segment === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') {
        out.pop();
      } else if (!isAbsolute) {
        out.push('..');
      }
      continue;
    }
    out.push(segment);
  }

  const prefix = /^[A-Za-z]:\//.test(normalized)
    ? normalized.slice(0, 2)
    : isAbsolute
      ? '/'
      : '';
  return `${prefix}${out.join('/')}` || (isAbsolute ? '/' : '.');
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const driveMatch = normalized.match(/^([A-Za-z]:)(\/.*)?$/);
  if (driveMatch) {
    const rest = driveMatch[2] || '';
    const idx = rest.lastIndexOf('/');
    if (idx <= 0) return `${driveMatch[1]}/`;
    return `${driveMatch[1]}${rest.slice(0, idx)}`;
  }

  const idx = normalized.lastIndexOf('/');
  if (idx <= 0) return normalized.startsWith('/') ? '/' : '.';
  return normalized.slice(0, idx);
}

function joinPath(...parts: string[]): string {
  const joined = parts
    .filter((part) => part !== undefined && part !== null && part !== '')
    .map((part) => normalizeSlashes(part))
    .join('/');
  return normalizePath(joined);
}

function isNativeAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

function getActiveWorkspaceRoot(context: WorkspacePathContext): WorkspaceRoot | null {
  const roots = context.workspaceRoots || [];
  if (!roots.length) return null;
  if (!context.activeWorkspaceRootId) return roots[0];
  return roots.find((root) => root.id === context.activeWorkspaceRootId) || roots[0];
}

function resolveAbsoluteWebPath(specifier: string, context: WorkspacePathContext): string | null {
  const activeRoot = getActiveWorkspaceRoot(context);
  if (activeRoot?.path) {
    return joinPath(activeRoot.path, specifier.replace(/^\/+/, ''));
  }

  if (specifier.startsWith('/workspace/')) {
    return specifier;
  }

  return joinPath('/workspace', specifier.replace(/^\/+/, ''));
}

async function readFromWebDirectoryHandle(
  resolvedPath: string,
  context: WorkspacePathContext
): Promise<string | null> {
  const activeRoot = getActiveWorkspaceRoot(context);
  if (!activeRoot) return null;
  const handle = webWorkspaceDirectoryHandles.get(activeRoot.id);
  if (!handle) return null;

  const normalized = normalizePath(resolvedPath);
  const rootPath = activeRoot.path ? normalizePath(activeRoot.path) : '';
  const relative = rootPath && normalized.startsWith(rootPath)
    ? normalized.slice(rootPath.length).replace(/^\/+/, '')
    : normalized.replace(/^\/+/, '');

  const segments = relative.split('/').filter(Boolean);
  if (!segments.length) return null;

  let current: FileSystemDirectoryHandle = handle;
  for (let i = 0; i < segments.length - 1; i += 1) {
    current = await current.getDirectoryHandle(segments[i]);
  }
  const fileHandle = await current.getFileHandle(segments[segments.length - 1]);
  const file = await fileHandle.getFile();
  return file.text();
}

async function fetchWebPath(resolvedPath: string): Promise<string> {
  const asAbsoluteUrl = resolvedPath.startsWith('http://') || resolvedPath.startsWith('https://')
    ? resolvedPath
    : `${window.location.origin}${resolvedPath.startsWith('/') ? '' : '/'}${resolvedPath}`;
  const response = await fetch(asAbsoluteUrl);
  if (!response.ok) {
    throw new Error(`Failed to load local module from ${resolvedPath}: ${response.status}`);
  }
  return response.text();
}

function buildDesktopAdapter(): WorkspaceFileSystem {
  return {
    resolveSpecifierPath: (specifier: string, context: WorkspacePathContext) => {
      const trimmed = specifier.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith('workspace:/')) {
        const rest = trimmed.replace(/^workspace:\//, '/');
        if (isNativeAbsolutePath(rest)) return normalizePath(rest);
      }

      if (isNativeAbsolutePath(trimmed)) {
        return normalizePath(trimmed);
      }

      const fromDocument = context.documentPath ? dirname(context.documentPath) : null;
      if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
        if (!fromDocument) return null;
        return joinPath(fromDocument, trimmed);
      }

      const activeRoot = getActiveWorkspaceRoot(context);
      if (activeRoot?.path) {
        return joinPath(activeRoot.path, trimmed);
      }

      return null;
    },
    readTextFile: async (resolvedPath: string) => {
      if (!window.api?.readFile) {
        throw new Error('Desktop file read API is not available');
      }
      const result = await window.api.readFile(resolvedPath);
      if (!result.success || typeof result.content !== 'string') {
        throw new Error(result.error || `Failed to read ${resolvedPath}`);
      }
      return result.content;
    },
    exists: async (resolvedPath: string) => {
      if (!window.api?.fileExists) return false;
      return window.api.fileExists(resolvedPath);
    },
  };
}

function buildWebAdapter(context: WorkspacePathContext): WorkspaceFileSystem {
  return {
    resolveSpecifierPath: (specifier: string, ctx: WorkspacePathContext) => {
      const trimmed = specifier.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }

      if (trimmed.startsWith('workspace:/')) {
        return resolveAbsoluteWebPath(trimmed.replace(/^workspace:\//, '/'), ctx);
      }

      if (trimmed.startsWith('/')) {
        return resolveAbsoluteWebPath(trimmed, ctx);
      }

      if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
        const base = ctx.documentPath ? dirname(ctx.documentPath) : getActiveWorkspaceRoot(ctx)?.path || '/workspace';
        return joinPath(base, trimmed);
      }

      const activeRoot = getActiveWorkspaceRoot(ctx);
      if (activeRoot?.path) {
        return joinPath(activeRoot.path, trimmed);
      }

      return joinPath('/workspace', trimmed);
    },
    readTextFile: async (resolvedPath: string) => {
      try {
        const fromHandle = await readFromWebDirectoryHandle(resolvedPath, context);
        if (typeof fromHandle === 'string') {
          return fromHandle;
        }
      } catch {
        // Fall through to fetch-based loading.
      }
      return fetchWebPath(resolvedPath);
    },
    exists: async (resolvedPath: string) => {
      try {
        await fetchWebPath(resolvedPath);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createWorkspaceFileSystem(context: WorkspacePathContext): WorkspaceFileSystem {
  if (isElectron()) {
    return buildDesktopAdapter();
  }
  return buildWebAdapter(context);
}

