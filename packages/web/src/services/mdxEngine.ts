import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';
import type { ComponentType } from 'react';
import { logger } from '@md-crafter/shared';
import type { MdxComponentDefinition, WorkspaceRoot } from '../store/types';
import {
  buildComponentMap,
  BuildComponentMapResult,
  parseDocumentImports,
  DocumentImportParseResult,
} from './mdxComponentLoader';

export interface MdxEngineDocumentContext {
  documentPath?: string;
  workspaceRoots?: WorkspaceRoot[];
  activeWorkspaceRootId?: string | null;
  componentDefinitions?: MdxComponentDefinition[];
}

export interface CompileMdxResult {
  code: string;
  imports: DocumentImportParseResult['imports'];
  contentWithoutImports: string;
  errors: string[];
  cacheKey: string;
}

export interface RenderMdxResult {
  component: ComponentType<{ components?: Record<string, unknown> }> | null;
  componentMap: Record<string, unknown>;
  compile: CompileMdxResult | null;
  errors: string[];
  cached: boolean;
}

const compileCache = new Map<string, Promise<CompileMdxResult>>();
const runtimeCache = new Map<string, Promise<ComponentType<{ components?: Record<string, unknown> }>>>();
const componentMapCache = new Map<string, Promise<BuildComponentMapResult>>();

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function getComponentRegistryHash(definitions: MdxComponentDefinition[]): string {
  const relevant = definitions
    .filter((definition) => definition.enabled !== false)
    .map((definition) => ({
      id: definition.id,
      name: definition.name,
      sourceType: definition.sourceType,
      source: definition.source,
      exportName: definition.exportName || 'default',
      versionOrRef: definition.versionOrRef || '',
      updatedAt: definition.updatedAt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return hashString(JSON.stringify(relevant));
}

function remarkMermaidFenceToComponent() {
  return (tree: any) => {
    visit(tree, 'code', (node: any, index: number | undefined, parent: any) => {
      if (!parent || typeof index !== 'number') return;
      if (!node || node.lang !== 'mermaid') return;

      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value || '',
          },
        ],
        children: [],
      };
    });
  };
}

export async function compileMdxDocument(
  source: string,
  context: MdxEngineDocumentContext = {}
): Promise<CompileMdxResult> {
  const { imports, contentWithoutImports } = parseDocumentImports(source);
  const componentHash = getComponentRegistryHash(context.componentDefinitions || []);
  const contentHash = hashString(contentWithoutImports);
  const cacheKey = `${contentHash}:${componentHash}`;

  if (compileCache.has(cacheKey)) {
    return compileCache.get(cacheKey)!;
  }

  const compilePromise = (async (): Promise<CompileMdxResult> => {
    const errors: string[] = [];
    try {
      const compiled = await compile(contentWithoutImports, {
        outputFormat: 'function-body',
        development: false,
        remarkPlugins: [remarkGfm, remarkMath, remarkMermaidFenceToComponent],
        rehypePlugins: [rehypeKatex, rehypeSlug],
      });
      return {
        code: String(compiled),
        imports,
        contentWithoutImports,
        errors,
        cacheKey,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('MDX compile error', error);
      errors.push(message);
      return {
        code: '',
        imports,
        contentWithoutImports,
        errors,
        cacheKey,
      };
    }
  })();

  compileCache.set(cacheKey, compilePromise);
  return compilePromise;
}

async function runCompiledCode(
  code: string,
  cacheKey: string
): Promise<ComponentType<{ components?: Record<string, unknown> }>> {
  if (runtimeCache.has(cacheKey)) {
    return runtimeCache.get(cacheKey)!;
  }

  const runtimePromise = (async () => {
    const result = await run(code, {
      ...runtime,
      baseUrl: import.meta.url,
    });
    return result.default as ComponentType<{ components?: Record<string, unknown> }>;
  })();

  runtimeCache.set(cacheKey, runtimePromise);
  return runtimePromise;
}

async function getComponentMapForDocument(
  compileResult: CompileMdxResult,
  context: MdxEngineDocumentContext
): Promise<BuildComponentMapResult> {
  const componentHash = getComponentRegistryHash(context.componentDefinitions || []);
  const importsHash = hashString(JSON.stringify(compileResult.imports.map((statement) => statement.raw)));
  const cacheKey = `${componentHash}:${importsHash}:${context.documentPath || ''}:${context.activeWorkspaceRootId || ''}`;

  if (componentMapCache.has(cacheKey)) {
    return componentMapCache.get(cacheKey)!;
  }

  const mapPromise = buildComponentMap({
    componentDefinitions: context.componentDefinitions || [],
    documentImports: compileResult.imports,
    documentPath: context.documentPath,
    workspaceRoots: context.workspaceRoots,
    activeWorkspaceRootId: context.activeWorkspaceRootId,
  });

  componentMapCache.set(cacheKey, mapPromise);
  return mapPromise;
}

export async function renderMdxDocument(
  source: string,
  context: MdxEngineDocumentContext = {}
): Promise<RenderMdxResult> {
  const compileResult = await compileMdxDocument(source, context);
  const errors = [...compileResult.errors];
  if (!compileResult.code) {
    return {
      component: null,
      componentMap: {},
      compile: compileResult,
      errors,
      cached: compileCache.has(compileResult.cacheKey),
    };
  }

  try {
    const componentMapResult = await getComponentMapForDocument(compileResult, context);
    if (componentMapResult.importErrors.length) {
      errors.push(...componentMapResult.importErrors);
    }

    const component = await runCompiledCode(compileResult.code, compileResult.cacheKey);
    return {
      component,
      componentMap: componentMapResult.components,
      compile: compileResult,
      errors,
      cached: runtimeCache.has(compileResult.cacheKey),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to run compiled MDX', error);
    errors.push(message);
    return {
      component: null,
      componentMap: {},
      compile: compileResult,
      errors,
      cached: runtimeCache.has(compileResult.cacheKey),
    };
  }
}

export function clearMdxEngineCaches(): void {
  compileCache.clear();
  runtimeCache.clear();
  componentMapCache.clear();
}
