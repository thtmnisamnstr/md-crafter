import { describe, it, expect } from 'vitest';
import {
  buildComponentMap,
  parseDocumentImports,
  resolveSpecifier,
} from '../mdxComponentLoader';

describe('mdxComponentLoader', () => {
  it('parses document import statements and strips them from content', () => {
    const source = `import Card from '@acme/ui'\nimport { Chart as ChartView } from './chart.tsx'\n# Title\n\nBody`;
    const parsed = parseDocumentImports(source);

    expect(parsed.imports).toHaveLength(2);
    expect(parsed.imports[0].defaultImport).toBe('Card');
    expect(parsed.imports[1].namedImports[0]).toEqual({ imported: 'Chart', local: 'ChartView' });
    expect(parsed.contentWithoutImports).toContain('# Title');
    expect(parsed.contentWithoutImports).not.toContain('import Card');
  });

  it('resolves npm and github specifiers to esm.sh urls', async () => {
    const npm = await resolveSpecifier('react-chartjs-2', {});
    const github = await resolveSpecifier('github:owner/repo/path/file.tsx', {});
    expect(npm).toBe('https://esm.sh/react-chartjs-2');
    expect(github).toBe('https://esm.sh/gh/owner/repo/path/file.tsx');
  });

  it('maps React runtime specifiers to host runtime modules', async () => {
    const react = await resolveSpecifier('react', {});
    const jsxRuntime = await resolveSpecifier('react/jsx-runtime', {});
    const reactDomClient = await resolveSpecifier('react-dom/client', {});
    const legacyViteId = await resolveSpecifier('/@id/react/jsx-runtime', {});

    expect(react).toContain('/mdx-runtime/react.js');
    expect(jsxRuntime).toContain('/mdx-runtime/react-jsx-runtime.js');
    expect(reactDomClient).toContain('/mdx-runtime/react-dom-client.js');
    expect(legacyViteId).toContain('/mdx-runtime/react-jsx-runtime.js');
  });

  it('resolves github blob and raw URLs to esm.sh gh urls', async () => {
    const blob = await resolveSpecifier(
      'https://github.com/mintlify/components/blob/main/packages/components/src/components/callout/callout.tsx',
      {}
    );
    const raw = await resolveSpecifier(
      'https://raw.githubusercontent.com/mintlify/components/refs/heads/main/packages/components/src/components/callout/callout.tsx',
      {}
    );

    expect(blob).toBe(
      'https://esm.sh/gh/mintlify/components@main/packages/components/src/components/callout/callout.tsx'
    );
    expect(raw).toBe(
      'https://esm.sh/gh/mintlify/components@refs%2Fheads%2Fmain/packages/components/src/components/callout/callout.tsx'
    );
  });

  it('resolves github tree URLs to esm.sh gh urls', async () => {
    const tree = await resolveSpecifier(
      'https://github.com/PaulieScanlon/mdx-embed/tree/main/packages/mdx-embed/src/components/gist/index.ts',
      {}
    );
    expect(tree).toBe(
      'https://esm.sh/gh/PaulieScanlon/mdx-embed@main/packages/mdx-embed/src/components/gist/index.ts'
    );
  });

  it('resolves github blob URLs with case-insensitive refs', async () => {
    const blob = await resolveSpecifier(
      'https://github.com/mintlify/components/blob/Main/packages/components/src/components/callout/callout.tsx',
      {}
    );
    expect(blob).toBe(
      'https://esm.sh/gh/mintlify/components@Main/packages/components/src/components/callout/callout.tsx'
    );
  });

  it('resolves relative local paths using document path context', async () => {
    const resolved = await resolveSpecifier('./components/Button.tsx', {
      documentPath: '/workspace/docs/page.mdx',
      workspaceRoots: [{ id: 'root', name: 'workspace', mode: 'web', path: '/workspace', createdAt: Date.now() }],
      activeWorkspaceRootId: 'root',
    });
    expect(resolved).toBe('/workspace/docs/components/Button.tsx');
  });

  it('builds component map with built-ins by default', async () => {
    const result = await buildComponentMap({});
    expect(result.components.Callout).toBeTruthy();
    expect(result.importErrors).toHaveLength(0);
  });

});
