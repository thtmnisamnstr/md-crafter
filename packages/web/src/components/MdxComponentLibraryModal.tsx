import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import { useStore } from '../store';
import type {
  MdxComponentDefinition,
  MdxComponentSourceType,
} from '../store/types';
import { renderMdxDocument } from '../services/mdxEngine';
import { loadComponent } from '../services/mdxComponentLoader';
import {
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Save,
  X,
  Check,
  RefreshCw,
  FolderPlus,
  Folder,
} from 'lucide-react';
import { isElectron } from '../utils/platform';
import { registerWebWorkspaceDirectoryHandle } from '../services/workspaceFs';
import { ErrorBoundary } from './ErrorBoundary';

interface MdxComponentLibraryModalProps {
  onClose: () => void;
}

type DraftComponent = Omit<MdxComponentDefinition, 'id' | 'createdAt' | 'updatedAt'>;

function createDefaultDraft(): DraftComponent {
  return {
    name: 'CustomComponent',
    sourceType: 'inline',
    source: `export default function CustomComponent({ children }) {
  return <div style={{ padding: '12px', border: '1px solid #555', borderRadius: '8px' }}>{children || 'Custom component output'}</div>;
}`,
    exportName: 'default',
    versionOrRef: '',
    enabled: true,
    docs: '',
    propsSchema: '',
    example: '<CustomComponent>Preview content</CustomComponent>',
    propDocs: [],
  };
}

function sourcePlaceholderFor(type: MdxComponentSourceType): string {
  switch (type) {
    case 'npm':
      return 'Example: @acme/ui or @acme/ui/components/button';
    case 'github':
      return 'Example: owner/repo/path/to/module.tsx or https://github.com/owner/repo/blob/main/path/to/module.tsx';
    case 'local':
      return 'Example: ./components/Button.tsx or /Users/me/project/components/Button.tsx';
    case 'inline':
    default:
      return 'Paste ESM module source that exports a React component.';
  }
}

function cloneDraftFromDefinition(definition: MdxComponentDefinition): DraftComponent {
  return {
    name: definition.name,
    sourceType: definition.sourceType,
    source: definition.source,
    exportName: definition.exportName || 'default',
    versionOrRef: definition.versionOrRef || '',
    enabled: definition.enabled,
    docs: definition.docs || '',
    propsSchema: definition.propsSchema || '',
    example: definition.example || `<${definition.name} />`,
    propDocs: definition.propDocs || [],
  };
}

function extractMdxComponentTags(source: string): string[] {
  const matches = source.match(/<([A-Z][A-Za-z0-9_]*)\b/g) || [];
  const unique = new Set<string>();
  for (const match of matches) {
    const tag = match.slice(1).trim();
    if (tag) unique.add(tag);
  }
  return [...unique];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMdxTagName(source: string, fromTag: string, toTag: string): string {
  if (!source || !fromTag || !toTag || fromTag === toTag) return source;
  const pattern = new RegExp(`(<\\s*\\/?)${escapeRegExp(fromTag)}(?=[\\s>/])`, 'g');
  return source.replace(pattern, (_match, prefix: string) => `${prefix}${toTag}`);
}

function normalizeTagNameInput(value: string): string {
  const normalized = value.replace(/\s+/g, '');
  if (!normalized) return normalized;
  const first = normalized[0];
  if (/[a-z]/.test(first)) {
    return first.toUpperCase() + normalized.slice(1);
  }
  return normalized;
}

function fallbackPreviewValueForProp(propName: string): unknown {
  if (/^on[A-Z]/.test(propName)) return () => {};
  if (propName === 'children') return 'Preview';
  if (propName === 'style') return {};
  if (propName === 'className') return '';
  if (/gist/i.test(propName) && /(link|url|src|path)/i.test(propName)) {
    return 'defunkt/370591';
  }
  if (propName === 'disabled') return false;
  if (propName === 'open') return true;
  if (propName === 'count' || propName === 'length' || /^num(ber)?/i.test(propName)) return 1;
  if (/items|list|rows|columns|data|options/i.test(propName)) return [];
  if (/json|payload|config|schema|metadata|meta/i.test(propName)) return {};
  if (/src|href|url/i.test(propName)) return 'https://example.com';
  if (/link|path/i.test(propName)) return 'preview/path';
  if (/id|slug|name|title|type|variant|kind|value|label|text|content/i.test(propName)) {
    return `preview-${propName}`;
  }
  return `preview-${propName}`;
}

const PREVIEW_DEFAULT_PROP_KEYS = [
  'children',
  'className',
  'style',
  'disabled',
  'open',
  'onClick',
  'onChange',
  'onSubmit',
  'onLoad',
  'onError',
] as const;

const componentPropCandidateCache = new WeakMap<Function, string[]>();

function inferComponentPropCandidates(component: unknown): string[] {
  if (typeof component !== 'function') return [];
  if (componentPropCandidateCache.has(component)) {
    return componentPropCandidateCache.get(component)!;
  }

  const source = Function.prototype.toString.call(component);
  const results = new Set<string>();
  const riskyMethods = [
    'split',
    'replace',
    'match',
    'trim',
    'toLowerCase',
    'toUpperCase',
    'startsWith',
    'endsWith',
    'includes',
    'indexOf',
    'map',
    'filter',
    'forEach',
    'reduce',
  ].join('|');

  const parameterMatch = source.match(
    /^(?:async\s+)?(?:function\b[^(]*\(\s*([A-Za-z_$][\w$]*)\s*\)|\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>|([A-Za-z_$][\w$]*)\s*=>)/
  );
  const parameterName = parameterMatch?.[1] || parameterMatch?.[2] || parameterMatch?.[3];

  const destructuredMatch = source.match(
    /^(?:async\s+)?(?:function\b[^(]*\(\s*\{([^}]*)\}\s*\)|\(\s*\{([^}]*)\}\s*\)\s*=>|\{\s*([^}]*)\}\s*=>)/
  );
  const destructuredRaw = destructuredMatch?.[1] || destructuredMatch?.[2] || destructuredMatch?.[3] || '';
  const destructuredBindings = destructuredRaw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const withoutDefault = entry.split('=')[0]?.trim() || '';
      const normalized = withoutDefault.replace(/^\.\.\./, '').trim();
      if (!normalized) return null;
      if (normalized.includes(':')) {
        const [rawProp, rawLocal] = normalized.split(':', 2).map((part) => part.trim());
        const prop = rawProp.replace(/^\.\.\./, '').trim();
        const local = rawLocal.replace(/^\.\.\./, '').trim();
        if (!/^[A-Za-z_$][\w$]*$/.test(prop)) return null;
        if (!/^[A-Za-z_$][\w$]*$/.test(local)) return null;
        return { prop, local };
      }
      if (!/^[A-Za-z_$][\w$]*$/.test(normalized)) return null;
      return { prop: normalized, local: normalized };
    })
    .filter((entry): entry is { prop: string; local: string } => !!entry);

  for (const binding of destructuredBindings) {
    const riskyDestructuredPattern = new RegExp(`\\b${binding.local}\\??\\.(${riskyMethods})\\(`, 'g');
    if (riskyDestructuredPattern.test(source)) {
      results.add(binding.prop);
    }
  }

  if (parameterName) {
    const riskyPattern = new RegExp(
      `\\b${parameterName}\\??\\.([A-Za-z_$][\\w$]*)\\.(${riskyMethods})\\(`,
      'g'
    );
    let match: RegExpExecArray | null;
    while ((match = riskyPattern.exec(source)) !== null) {
      results.add(match[1]);
    }

    const aliasPattern = new RegExp(
      `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${parameterName}\\??\\.([A-Za-z_$][\\w$]*)\\b`,
      'g'
    );
    const aliasToProp = new Map<string, string>();
    while ((match = aliasPattern.exec(source)) !== null) {
      aliasToProp.set(match[1], match[2]);
    }

    for (const [alias, prop] of aliasToProp.entries()) {
      const aliasRiskyPattern = new RegExp(`\\b${alias}\\??\\.(${riskyMethods})\\(`, 'g');
      if (aliasRiskyPattern.test(source)) {
        results.add(prop);
      }
    }
  }

  const inferred = [...results].filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
  componentPropCandidateCache.set(component, inferred);
  return inferred;
}

function createPreviewSafeProps<T extends Record<string, unknown>>(
  props: T,
  inferredKeys: string[] = []
): T {
  const merged: Record<string, unknown> = {};
  const defaultKeys = new Set<string>([...PREVIEW_DEFAULT_PROP_KEYS, ...inferredKeys]);

  for (const key of defaultKeys) {
    merged[key] = fallbackPreviewValueForProp(key);
  }

  for (const [key, value] of Object.entries(props || {})) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  if (merged.children === undefined || merged.children === null) {
    merged.children = 'Preview';
  }

  return merged as T;
}

export function MdxComponentLibraryModal({ onClose }: MdxComponentLibraryModalProps) {
  const {
    mdxComponentDefinitions,
    addMdxComponentDefinition,
    updateMdxComponentDefinition,
    removeMdxComponentDefinition,
    duplicateMdxComponentDefinition,
    toggleMdxComponentDefinitionEnabled,
    workspaceRoots,
    activeWorkspaceRootId,
    addWorkspaceRoot,
    removeWorkspaceRoot,
    setActiveWorkspaceRootId,
    addToast,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(mdxComponentDefinitions[0]?.id || null);
  const [draft, setDraft] = useState<DraftComponent>(createDefaultDraft());
  const [isCreating, setIsCreating] = useState<boolean>(mdxComponentDefinitions.length === 0);
  const [previewComponent, setPreviewComponent] = useState<ComponentType<{ components?: Record<string, unknown> }> | null>(null);
  const [previewComponentMap, setPreviewComponentMap] = useState<Record<string, unknown>>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewScriptError, setPreviewScriptError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [resolvedPreviewSignature, setResolvedPreviewSignature] = useState<string>('');
  const [isAutoFillingDocs, setIsAutoFillingDocs] = useState(false);
  const [leftRatio, setLeftRatio] = useState(0.5);
  const [topRatio, setTopRatio] = useState(0.62);
  const [dragMode, setDragMode] = useState<'vertical' | 'horizontal' | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const topRowRef = useRef<HTMLDivElement | null>(null);

  const selectedDefinition = useMemo(
    () => mdxComponentDefinitions.find((definition) => definition.id === selectedId) || null,
    [mdxComponentDefinitions, selectedId]
  );

  useEffect(() => {
    if (isCreating) return;
    if (!selectedDefinition) {
      if (mdxComponentDefinitions.length) {
        setSelectedId(mdxComponentDefinitions[0].id);
      }
      return;
    }
    setDraft(cloneDraftFromDefinition(selectedDefinition));
  }, [isCreating, mdxComponentDefinitions, selectedDefinition]);

  const previewTagName = useMemo(() => {
    const draftName = normalizeTagNameInput((draft.name || '').trim());
    if (draftName) return draftName;
    const selectedName = normalizeTagNameInput((selectedDefinition?.name || '').trim());
    return selectedName || 'CustomComponent';
  }, [draft.name, selectedDefinition?.name]);

  const usageSnippet = useMemo(() => {
    const tag = previewTagName || 'CustomComponent';
    const requiredProps = (draft.propDocs || [])
      .filter((prop) => prop.required && prop.name?.trim())
      .map((prop) => prop.name.trim());

    if (!requiredProps.length) {
      return `<${tag}>\n  Content\n</${tag}>`;
    }

    const attrs = requiredProps.map((name) => `${name}={...}`).join(' ');
    return `<${tag} ${attrs}>\n  Content\n</${tag}>`;
  }, [draft.propDocs, previewTagName]);

  const effectiveDefinitions = useMemo(() => {
    const cloned = [...mdxComponentDefinitions];
    const draftDefinition: MdxComponentDefinition = {
      ...draft,
      name: previewTagName,
      id: selectedId || 'draft-component',
      createdAt: selectedDefinition?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (isCreating) {
      cloned.push(draftDefinition);
      return cloned;
    }

    return cloned.map((definition) => (
      definition.id === selectedId ? draftDefinition : definition
    ));
  }, [draft, isCreating, mdxComponentDefinitions, previewTagName, selectedDefinition?.createdAt, selectedId]);

  const previewMdx = useMemo(() => {
    const fallback = `<${previewTagName} />`;
    return draft.example?.trim() ? draft.example : fallback;
  }, [draft.example, previewTagName]);

  const previewSignature = useMemo(() => {
    const defsSig = effectiveDefinitions
      .map((definition) => [
        definition.id,
        definition.name,
        definition.sourceType,
        definition.source,
        definition.exportName || 'default',
        definition.versionOrRef || '',
        definition.enabled ? '1' : '0',
        String(definition.updatedAt || 0),
      ].join('|'))
      .join('||');
    return `${previewMdx}@@${defsSig}@@${activeWorkspaceRootId || ''}`;
  }, [activeWorkspaceRootId, effectiveDefinitions, previewMdx]);

  useEffect(() => {
    let cancelled = false;
    const activeSignature = previewSignature;
    setIsPreviewing(true);
    setPreviewScriptError(null);

    void renderMdxDocument(previewMdx, {
      componentDefinitions: effectiveDefinitions,
      workspaceRoots,
      activeWorkspaceRootId,
    }).then((result) => {
      if (cancelled) return;
      if (!result.component) {
        setPreviewComponent(null);
        setPreviewComponentMap({});
        setPreviewError(result.errors[0] || 'Failed to render preview');
      } else {
        setPreviewComponent(() => result.component);
        setPreviewComponentMap(result.componentMap);
        setPreviewError(result.errors.length ? result.errors.join('\n') : null);
      }
    }).catch((error) => {
      if (cancelled) return;
      setPreviewComponent(null);
      setPreviewComponentMap({});
      setPreviewError(error instanceof Error ? error.message : String(error));
    }).finally(() => {
      if (!cancelled) {
        setIsPreviewing(false);
        setResolvedPreviewSignature(activeSignature);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceRootId, effectiveDefinitions, previewMdx, previewSignature, workspaceRoots]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const callbackParamNames = ['callback', 'cb', 'jsonp', 'jsoncallback'];

    const buildJsonpFallbackPayload = () => ({
      stylesheet: '',
      div: '<pre>External embed unavailable in preview.</pre>',
      html: '<pre>External embed unavailable in preview.</pre>',
      files: [{ filename: 'preview.txt' }],
      data: {},
      status: 'ok',
    });

    const parseCallbackName = (src: string): string | null => {
      try {
        const url = new URL(src, window.location.href);
        const callbackParamName = callbackParamNames.find((name) => url.searchParams.has(name));
        if (!callbackParamName) return null;
        const callbackValue = url.searchParams.get(callbackParamName);
        return callbackValue?.trim() || null;
      } catch {
        return null;
      }
    };

    const invokeJsonpCallback = (callbackName: string): boolean => {
      const callbackCandidate = (window as unknown as Record<string, unknown>)[callbackName];
      if (typeof callbackCandidate !== 'function') return false;
      try {
        (callbackCandidate as (payload: unknown) => void)(buildJsonpFallbackPayload());
        return true;
      } catch {
        return false;
      }
    };

    const rescueScriptUrl = (scriptSrc: string): boolean => {
      const callbackName = parseCallbackName(scriptSrc);
      if (!callbackName) return false;

      let attempts = 0;
      const maxAttempts = 6;
      const tryInvoke = () => {
        attempts += 1;
        if (invokeJsonpCallback(callbackName)) return;
        if (attempts < maxAttempts) {
          setTimeout(tryInvoke, 0);
        }
      };
      tryInvoke();

      return true;
    };

    const handleScriptError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLScriptElement)) return;
      const scriptSrc = target.src || '';
      if (!scriptSrc) return;

      if (rescueScriptUrl(scriptSrc)) {
        return;
      }

      setPreviewScriptError(`External script failed to load in preview: ${scriptSrc}`);

      // Generic JSONP rescue path: if the failed URL contains a callback name and the function exists,
      // invoke it with a minimal payload so components don't stay permanently blank in preview.
      try {
        const url = new URL(scriptSrc, window.location.href);
        const callbackParamName = ['callback', 'cb', 'jsonp', 'jsoncallback']
          .find((name) => url.searchParams.has(name));
        const callbackFnName = callbackParamName ? url.searchParams.get(callbackParamName) : null;
        const candidate = callbackFnName ? (window as unknown as Record<string, unknown>)[callbackFnName] : null;
        if (typeof candidate === 'function') {
          (candidate as (payload: unknown) => void)({
            stylesheet: '',
            div: '<pre>External embed unavailable in preview.</pre>',
            html: '<pre>External embed unavailable in preview.</pre>',
            files: [{ filename: 'preview.txt' }],
            data: {},
          });
        }
      } catch {
        // best-effort fallback only
      }
    };

    window.addEventListener('error', handleScriptError, true);
    return () => {
      window.removeEventListener('error', handleScriptError, true);
    };
  }, []);

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedId(null);
    setDraft(createDefaultDraft());
  };

  const handleSave = async () => {
    const normalizedName = normalizeTagNameInput(draft.name.trim());
    if (!normalizedName) {
      addToast({ type: 'warning', message: 'Component tag name is required' });
      return;
    }
    if (!draft.source.trim()) {
      addToast({ type: 'warning', message: 'Component source is required' });
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        const id = addMdxComponentDefinition({
          ...draft,
          name: normalizedName,
          source: draft.source.trim(),
          exportName: (draft.exportName || 'default').trim(),
          versionOrRef: draft.versionOrRef?.trim(),
          docs: draft.docs?.trim(),
          propsSchema: draft.propsSchema?.trim(),
          example: draft.example?.trim(),
          propDocs: draft.propDocs || [],
        });
        setSelectedId(id);
        setIsCreating(false);
        addToast({ type: 'success', message: `Component ${draft.name} created` });
        return;
      }

      if (!selectedId) return;
      updateMdxComponentDefinition(selectedId, {
        ...draft,
        name: normalizedName,
        source: draft.source.trim(),
        exportName: (draft.exportName || 'default').trim(),
        versionOrRef: draft.versionOrRef?.trim(),
        docs: draft.docs?.trim(),
        propsSchema: draft.propsSchema?.trim(),
        example: draft.example?.trim(),
      });
      addToast({ type: 'success', message: `Component ${draft.name} updated` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFillDocs = async () => {
    const tempDefinition: MdxComponentDefinition = {
      ...draft,
      id: selectedId || 'draft-component',
      createdAt: selectedDefinition?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    setIsAutoFillingDocs(true);
    try {
      const loaded = await loadComponent(tempDefinition, {
        workspaceRoots,
        activeWorkspaceRootId,
      });
      if (!loaded.propDocs.length) {
        addToast({ type: 'info', message: 'No doc metadata found on module export' });
        return;
      }
      setDraft((current) => ({ ...current, propDocs: loaded.propDocs }));
      addToast({ type: 'success', message: 'Prop docs imported from module metadata' });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load prop docs',
      });
    } finally {
      setIsAutoFillingDocs(false);
    }
  };

  const handleDelete = () => {
    if (!selectedId) return;
    removeMdxComponentDefinition(selectedId);
    const remaining = mdxComponentDefinitions.filter((definition) => definition.id !== selectedId);
    setSelectedId(remaining[0]?.id || null);
    setIsCreating(remaining.length === 0);
  };

  const handleAddWorkspaceRoot = async () => {
    if (isElectron() && window.api?.selectFolder) {
      const selected = await window.api.selectFolder();
      if (!selected) return;
      const pathParts = selected.replace(/\\/g, '/').split('/');
      const name = pathParts[pathParts.length - 1] || selected;
      addWorkspaceRoot({ name, mode: 'desktop', path: selected });
      addToast({ type: 'success', message: `Workspace root added: ${name}` });
      return;
    }

    if ('showDirectoryPicker' in window) {
      try {
        // @ts-expect-error File System Access API type varies by browser/TS lib version.
        const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
        const name = handle.name || 'workspace';
        const id = addWorkspaceRoot({
          name,
          mode: 'web',
          path: `/workspace/${name}`,
        });
        registerWebWorkspaceDirectoryHandle(id, handle);
        addToast({ type: 'success', message: `Workspace root added: ${name}` });
        return;
      } catch {
        // Ignore cancellation.
      }
    }

    const fallbackPath = window.prompt('Enter workspace root path', '/workspace');
    if (!fallbackPath) return;
    const normalized = fallbackPath.trim();
    if (!normalized) return;
    const segments = normalized.replace(/\\/g, '/').split('/');
    const name = segments[segments.length - 1] || normalized;
    addWorkspaceRoot({
      name,
      mode: isElectron() ? 'desktop' : 'web',
      path: normalized,
    });
    addToast({ type: 'success', message: `Workspace root added: ${name}` });
  };

  const Preview = previewComponent;
  const previewRenderComponents = useMemo(() => {
    if (!draft.enabled || !Preview) return previewComponentMap;

    const wrapped: Record<string, unknown> = { ...previewComponentMap };
    const referencedTags = extractMdxComponentTags(previewMdx);

    for (const tag of referencedTags) {
      const mapped = wrapped[tag];
      if (typeof mapped !== 'function') continue;
      const Original = mapped as ComponentType<Record<string, unknown>>;
      const inferredKeys = inferComponentPropCandidates(Original);
      const SafeWrapper = (props: Record<string, unknown>) => {
        const safeProps = createPreviewSafeProps<Record<string, unknown>>(props || {}, inferredKeys);
        return (
          <ErrorBoundary
            fallback={(
              <div className="p-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-xs">
                {`Component preview fallback (${tag})`}
              </div>
            )}
          >
            <Original {...safeProps} />
          </ErrorBoundary>
        );
      };
      (SafeWrapper as { displayName?: string }).displayName = `PreviewSafe(${tag})`;
      wrapped[tag] = SafeWrapper;
    }

    return wrapped;
  }, [Preview, draft.enabled, previewComponentMap, previewMdx]);

  const missingPreviewComponents = useMemo(() => {
    if (!draft.enabled) return [];
    if (resolvedPreviewSignature !== previewSignature) return [];
    if (isPreviewing) return [];
    if (!Preview) return [];
    const referenced = extractMdxComponentTags(previewMdx);
    return referenced.filter((tag) => {
      if (tag === 'CustomComponent' && previewTagName !== 'CustomComponent') {
        // Avoid transient warning flicker while renaming the default starter tag.
        return false;
      }
      return !Object.prototype.hasOwnProperty.call(previewComponentMap, tag);
    });
  }, [Preview, draft.enabled, isPreviewing, previewComponentMap, previewMdx, previewSignature, previewTagName, resolvedPreviewSignature]);
  const previewRenderKey = useMemo(
    () => [
      selectedId || 'new',
      draft.name,
      draft.sourceType,
      draft.source,
      draft.exportName || 'default',
      draft.versionOrRef || '',
      draft.enabled ? 'enabled' : 'disabled',
      previewMdx,
      previewSignature,
      resolvedPreviewSignature,
    ].join('::'),
    [
      selectedId,
      draft.enabled,
      draft.exportName,
      draft.name,
      draft.source,
      draft.sourceType,
      draft.versionOrRef,
      previewMdx,
      previewSignature,
      resolvedPreviewSignature,
    ]
  );
  const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const startDragging = (event: ReactMouseEvent, mode: 'vertical' | 'horizontal') => {
    event.preventDefault();
    setDragMode(mode);
  };

  useEffect(() => {
    if (!dragMode) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = dragMode === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (event: MouseEvent) => {
      if (dragMode === 'vertical') {
        const row = topRowRef.current;
        if (!row) return;
        const rect = row.getBoundingClientRect();
        const usableWidth = rect.width - 8;
        if (usableWidth <= 0) return;
        const minPane = Math.min(280, Math.max(160, usableWidth * 0.2));
        const maxLeft = Math.max(minPane, usableWidth - minPane);
        const nextLeft = clamp(event.clientX - rect.left, minPane, maxLeft);
        setLeftRatio(nextLeft / rect.width);
        return;
      }

      const content = contentRef.current;
      if (!content) return;
      const rect = content.getBoundingClientRect();
      const usableHeight = rect.height - 8;
      if (usableHeight <= 0) return;
      const minTop = Math.min(320, Math.max(220, usableHeight * 0.25));
      const minBottom = Math.min(200, Math.max(150, usableHeight * 0.2));
      const maxTop = Math.max(minTop, usableHeight - minBottom);
      const nextTop = clamp(event.clientY - rect.top, minTop, maxTop);
      setTopRatio(nextTop / rect.height);
    };

    const handleMouseUp = () => {
      setDragMode(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragMode]);

  const leftPercent = Math.round(leftRatio * 10000) / 100;
  const rightPercent = Math.round((1 - leftRatio) * 10000) / 100;
  const topPercent = Math.round(topRatio * 10000) / 100;
  const bottomPercent = Math.round((1 - topRatio) * 10000) / 100;
  const fieldStyle = {
    backgroundColor: 'var(--sidebar-bg)',
    color: 'var(--editor-fg)',
    borderColor: 'var(--tab-border)',
  } as const;
  const sectionTitleStyle = { color: 'var(--editor-fg)' } as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal h-[84vh] flex flex-col"
        style={{
          color: 'var(--editor-fg)',
          width: 'min(95vw, 1200px)',
          maxWidth: '1200px',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header flex-shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            MDX Component Library
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover" aria-label="Close component library">
            <X size={18} />
          </button>
        </div>

        <div
          ref={contentRef}
          className="grid flex-1 min-h-0"
          style={{ gridTemplateRows: `${topPercent}% 8px ${bottomPercent}%` }}
        >
          <div
            ref={topRowRef}
            className="grid min-h-0"
            style={{ gridTemplateColumns: `${leftPercent}% 8px ${rightPercent}%` }}
          >
            <aside className="border-r border-tab-border overflow-y-auto p-3 min-w-0">
              <div className="mb-3">
                <span className="text-xs uppercase opacity-60" style={sectionTitleStyle}>Components</span>
              </div>
              <div className="space-y-1">
                {mdxComponentDefinitions.map((definition) => (
                  <button
                    key={definition.id}
                    className={`w-full text-left p-2 rounded border ${
                      selectedId === definition.id && !isCreating
                        ? 'border-editor-accent bg-sidebar-active'
                        : 'border-transparent hover:bg-sidebar-hover'
                    }`}
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedId(definition.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{definition.name}</span>
                      <span className="text-[10px] uppercase opacity-60">{definition.sourceType}</span>
                    </div>
                    <div className="text-xs opacity-70 truncate mt-1">{definition.source}</div>
                    <div className="mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        definition.enabled ? 'bg-green-500/20 text-green-300' : 'bg-zinc-500/20 text-zinc-300'
                      }`}>
                        {definition.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                  </button>
                ))}
                {!mdxComponentDefinitions.length && (
                  <p className="text-xs opacity-60" style={sectionTitleStyle}>No components defined yet.</p>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-tab-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase opacity-60" style={sectionTitleStyle}>Workspace Roots</span>
                  <button className="btn btn-ghost px-2 py-1" onClick={() => void handleAddWorkspaceRoot()}>
                    <FolderPlus size={14} />
                  </button>
                </div>
                {workspaceRoots.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      className="input w-full"
                      style={fieldStyle}
                      value={activeWorkspaceRootId || workspaceRoots[0].id}
                      onChange={(event) => setActiveWorkspaceRootId(event.target.value)}
                    >
                      {workspaceRoots.map((root) => (
                        <option key={root.id} value={root.id}>
                          {root.name} ({root.mode})
                        </option>
                      ))}
                    </select>
                    {workspaceRoots.map((root) => (
                      <div key={root.id} className="flex items-center justify-between gap-2 text-xs opacity-80">
                        <span className="truncate inline-flex items-center gap-1">
                          <Folder size={12} />
                          {root.path || root.name}
                        </span>
                        <button
                          className="btn btn-ghost px-1 py-0.5"
                          onClick={() => removeWorkspaceRoot(root.id)}
                          aria-label={`Remove workspace root ${root.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-60" style={sectionTitleStyle}>No workspace roots configured.</p>
                )}
              </div>
            </aside>

            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize component columns"
              onMouseDown={(event) => startDragging(event, 'vertical')}
              style={{
                cursor: 'col-resize',
                backgroundColor: dragMode === 'vertical' ? 'var(--editor-accent)' : 'var(--tab-border)',
                opacity: dragMode === 'vertical' ? 0.35 : 0.8,
              }}
            />

            <section className="min-w-0 overflow-y-auto p-4">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm" style={sectionTitleStyle}>
                    <div className="mb-1 opacity-80" style={sectionTitleStyle}>Tag name</div>
                    <input
                      className="input w-full"
                      style={fieldStyle}
                      value={draft.name}
                      onChange={(event) => {
                        const nextName = normalizeTagNameInput(event.target.value);
                        setDraft((current) => {
                          const previousName = (current.name || 'CustomComponent').trim();
                          const normalizedNextName = nextName.trim();
                          const next = { ...current, name: nextName };
                          if (!current.example?.trim() || !normalizedNextName) return next;
                          const refs = extractMdxComponentTags(current.example);
                          if (refs.includes(previousName)) {
                            next.example = replaceMdxTagName(current.example, previousName, normalizedNextName);
                            return next;
                          }
                          if (previousName !== 'CustomComponent' && refs.includes('CustomComponent')) {
                            next.example = replaceMdxTagName(current.example, 'CustomComponent', normalizedNextName);
                          }
                          return next;
                        });
                      }}
                      placeholder="Component tag (e.g., MermaidChart)"
                    />
                  </label>
                  <label className="text-sm" style={sectionTitleStyle}>
                    <div className="mb-1 opacity-80" style={sectionTitleStyle}>Source type</div>
                    <select
                      className="input w-full"
                      style={fieldStyle}
                      value={draft.sourceType}
                      onChange={(event) => {
                        const nextType = event.target.value as MdxComponentSourceType;
                        setDraft((current) => {
                          if (current.sourceType === nextType) return current;
                          const next: DraftComponent = {
                            ...current,
                            sourceType: nextType,
                          };
                          // Switching away from inline should not keep inline module source in the locator field.
                          if (current.sourceType === 'inline' && nextType !== 'inline') {
                            const isDefaultInline = current.source.includes('export default function CustomComponent');
                            if (!current.source.trim() || isDefaultInline) {
                              next.source = '';
                            }
                          }
                          // Switching to inline should seed a valid component implementation if source is empty.
                          if (nextType === 'inline' && !next.source.trim()) {
                            next.source = `export default function ${current.name || 'CustomComponent'}({ children }) {
  return <div style={{ padding: '12px', border: '1px solid #555', borderRadius: '8px' }}>{children || 'Custom component output'}</div>;
}`;
                          }
                          return next;
                        });
                      }}
                    >
                      <option value="inline">Inline definition</option>
                      <option value="npm">npm package</option>
                      <option value="github">GitHub repo</option>
                      <option value="local">Local path</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm" style={sectionTitleStyle}>
                    <div className="mb-1 opacity-80" style={sectionTitleStyle}>Export name</div>
                    <input
                      className="input w-full"
                      style={fieldStyle}
                      value={draft.exportName ?? ''}
                      onChange={(event) => setDraft((current) => ({ ...current, exportName: event.target.value }))}
                      placeholder="default"
                    />
                  </label>
                  <label className="text-sm" style={sectionTitleStyle}>
                    <div className="mb-1 opacity-80" style={sectionTitleStyle}>
                      {draft.sourceType === 'npm' ? 'Version' : draft.sourceType === 'github' ? 'Ref (branch/tag/sha)' : 'Version / Ref'}
                    </div>
                    <input
                      className="input w-full"
                      style={fieldStyle}
                      value={draft.versionOrRef || ''}
                      onChange={(event) => setDraft((current) => ({ ...current, versionOrRef: event.target.value }))}
                      placeholder={draft.sourceType === 'npm' ? 'latest or 1.2.3' : draft.sourceType === 'github' ? 'main' : ''}
                    />
                  </label>
                </div>

                <label className="text-sm" style={sectionTitleStyle}>
                  <div className="mb-1 opacity-80" style={sectionTitleStyle}>
                    {draft.sourceType === 'inline' ? 'Module source' : 'Source location'}
                  </div>
                  {draft.sourceType === 'inline' ? (
                    <textarea
                      className="input w-full min-h-[220px] font-mono text-xs"
                      style={fieldStyle}
                      value={draft.source}
                      onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
                      placeholder={sourcePlaceholderFor(draft.sourceType)}
                    />
                  ) : (
                    <input
                      className="input w-full"
                      style={fieldStyle}
                      value={draft.source}
                      onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
                      placeholder={sourcePlaceholderFor(draft.sourceType)}
                    />
                  )}
                </label>

                <label className="text-sm" style={sectionTitleStyle}>
                  <div className="mb-1 opacity-80" style={sectionTitleStyle}>Component docs</div>
                  <textarea
                    className="input w-full min-h-[88px]"
                    style={fieldStyle}
                    value={draft.docs || ''}
                    onChange={(event) => setDraft((current) => ({ ...current, docs: event.target.value }))}
                    placeholder="Usage notes, caveats, and examples."
                  />
                </label>

                <label className="text-sm" style={sectionTitleStyle}>
                  <div className="mb-1 opacity-80" style={sectionTitleStyle}>Live preview MDX</div>
                  <textarea
                    className="input w-full min-h-[88px] font-mono text-xs"
                    style={fieldStyle}
                    value={draft.example || ''}
                    onChange={(event) => setDraft((current) => ({ ...current, example: event.target.value }))}
                    placeholder={`<${draft.name || 'CustomComponent'} />`}
                  />
                </label>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-80" style={sectionTitleStyle}>Props documentation</span>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost px-2 py-1"
                        onClick={() => setDraft((current) => ({
                          ...current,
                          propDocs: [...(current.propDocs || []), { name: '', type: '', required: false }],
                        }))}
                      >
                        <Plus size={14} /> Add
                      </button>
                      <button className="btn btn-ghost px-2 py-1" onClick={() => void handleAutoFillDocs()} disabled={isAutoFillingDocs}>
                        {isAutoFillingDocs ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Auto-fill
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(draft.propDocs || []).map((prop, index) => (
                      <div key={`${prop.name}-${index}`} className="grid grid-cols-[1fr_120px_90px_1fr_auto] gap-2 items-center">
                        <input
                          className="input"
                          style={fieldStyle}
                          value={prop.name}
                          placeholder="prop"
                          onChange={(event) => setDraft((current) => ({
                            ...current,
                            propDocs: (current.propDocs || []).map((entry, i) => (
                              i === index ? { ...entry, name: event.target.value } : entry
                            )),
                          }))}
                        />
                        <input
                          className="input"
                          style={fieldStyle}
                          value={prop.type}
                          placeholder="type"
                          onChange={(event) => setDraft((current) => ({
                            ...current,
                            propDocs: (current.propDocs || []).map((entry, i) => (
                              i === index ? { ...entry, type: event.target.value } : entry
                            )),
                          }))}
                        />
                        <label className="inline-flex items-center gap-1 text-xs" style={sectionTitleStyle}>
                          <input
                            type="checkbox"
                            checked={!!prop.required}
                            onChange={(event) => setDraft((current) => ({
                              ...current,
                              propDocs: (current.propDocs || []).map((entry, i) => (
                                i === index ? { ...entry, required: event.target.checked } : entry
                              )),
                            }))}
                          />
                          required
                        </label>
                        <input
                          className="input"
                          style={fieldStyle}
                          value={prop.description || ''}
                          placeholder="description"
                          onChange={(event) => setDraft((current) => ({
                            ...current,
                            propDocs: (current.propDocs || []).map((entry, i) => (
                              i === index ? { ...entry, description: event.target.value } : entry
                            )),
                          }))}
                        />
                        <button
                          className="btn btn-ghost px-2 py-1"
                          onClick={() => setDraft((current) => ({
                            ...current,
                            propDocs: (current.propDocs || []).filter((_, i) => i !== index),
                          }))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {!draft.propDocs?.length && (
                      <p className="text-xs opacity-60" style={sectionTitleStyle}>No prop docs yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize editor and preview rows"
            onMouseDown={(event) => startDragging(event, 'horizontal')}
            style={{
              cursor: 'row-resize',
              backgroundColor: dragMode === 'horizontal' ? 'var(--editor-accent)' : 'var(--tab-border)',
              opacity: dragMode === 'horizontal' ? 0.35 : 0.8,
            }}
          />

          <aside className="min-h-0 overflow-y-auto p-4 border-t border-tab-border">
            <h3 className="font-semibold mb-2" style={sectionTitleStyle}>Live Component Preview</h3>
            <p className="text-xs opacity-70 mb-3">
              Rendering against the current component definition and workspace resolver.
            </p>
            <div className="grid gap-3">
              <div className="rounded border border-tab-border p-3 h-[110px] overflow-auto">
                {!draft.enabled && (
                  <div className="text-sm opacity-70">
                    Preview disabled. Enable this component to render the live preview.
                  </div>
                )}

                {draft.enabled && isPreviewing && !Preview && (
                  <div className="text-sm opacity-70">Compiling preview...</div>
                )}

                {draft.enabled && previewError && (
                  <div className="mb-3 p-2 rounded border border-red-500/40 bg-red-500/10 text-xs whitespace-pre-wrap">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} />
                      <span className="font-semibold">Preview Error</span>
                    </div>
                    {previewError}
                  </div>
                )}

                {draft.enabled && previewScriptError && (
                  <div className="mb-3 p-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-xs whitespace-pre-wrap">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} />
                      <span className="font-semibold">Preview Warning</span>
                    </div>
                    {previewScriptError}
                  </div>
                )}

                {draft.enabled && missingPreviewComponents.length > 0 && (
                  <div className="mb-3 p-2 rounded border border-yellow-500/40 bg-yellow-500/10 text-xs whitespace-pre-wrap">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} />
                      <span className="font-semibold">Preview Warning</span>
                    </div>
                    Missing component mapping for: {missingPreviewComponents.join(', ')}.
                    Update Tag name, Source location, Export name, or preview MDX.
                  </div>
                )}

                {draft.enabled && Preview && missingPreviewComponents.length === 0 && (
                  <ErrorBoundary
                    key={previewRenderKey}
                    fallback={(
                      <div className="mb-3 p-2 rounded border border-red-500/40 bg-red-500/10 text-xs whitespace-pre-wrap">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle size={14} />
                          <span className="font-semibold">Preview Error</span>
                        </div>
                        Failed to render preview. Ensure the component source and export are valid for the selected source type.
                      </div>
                    )}
                  >
                    <div className="mdx-content">
                      <Preview components={previewRenderComponents} />
                    </div>
                  </ErrorBoundary>
                )}
              </div>

              <div className="rounded border border-tab-border p-3">
                <div className="text-xs uppercase opacity-60 mb-2" style={sectionTitleStyle}>
                  Usage Snippet
                </div>
                <p className="text-xs opacity-70 mb-2">
                  Add this component directly in your document MDX.
                </p>
                <pre
                  className="text-xs font-mono whitespace-pre-wrap rounded border border-tab-border p-2"
                  style={fieldStyle}
                >
                  {usageSnippet}
                </pre>
              </div>
            </div>
          </aside>
        </div>

        <div className="modal-footer flex-shrink-0">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-ghost inline-flex items-center gap-2" onClick={handleCreateNew}>
            <Plus size={14} /> New
          </button>
          {!isCreating && selectedId && (
            <>
              <button className="btn btn-ghost inline-flex items-center gap-2" onClick={() => duplicateMdxComponentDefinition(selectedId)}>
                <Copy size={14} /> Duplicate
              </button>
              <button
                className="btn btn-ghost inline-flex items-center gap-2"
                onClick={() => toggleMdxComponentDefinitionEnabled(selectedId)}
              >
                <Check size={14} /> {selectedDefinition?.enabled ? 'Disable' : 'Enable'}
              </button>
              <button className="btn btn-ghost inline-flex items-center gap-2" onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          <button className="btn btn-primary inline-flex items-center gap-2" onClick={() => void handleSave()} disabled={isSaving}>
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Definition'}
          </button>
        </div>
      </div>
    </div>
  );
}
