# Testing Guide

This document explains the testing philosophy, structure, and how to write and run tests for md-crafter.

## Testing Philosophy

We follow these principles:

1. **Test user-visible behavior, not implementation details** - Tests should verify what users see and experience, not internal state or implementation specifics.
2. **Use real components when possible** - Prefer integration tests over isolated unit tests. Mock only when necessary (external APIs, file system, etc.).
3. **Keep tests simple and maintainable** - Tests should be easy to understand and modify as the codebase evolves.
4. **Focus on critical paths** - Ensure all major user workflows are covered by E2E tests.

## Test Structure

### Unit Tests

Unit tests are located in `packages/*/src/**/__tests__/` directories, using the naming pattern `*.test.ts` or `*.test.tsx`.

**Current unit test coverage:**
- `packages/shared/src/__tests__/` - Utility functions (debounce, hash, diff, wordCount)
- `packages/web/src/components/__tests__/` - React components (32 test files covering all major components: Editor, MenuBar, StatusBar, SplitEditor, Layout, TabBar, Sidebar, all modals, ErrorBoundary, Toast, WelcomeTab, etc.)
- `packages/web/src/components/menus/__tests__/` - Menu generator functions (FileMenu, EditMenu, ViewMenu, HelpMenu)
- `packages/web/src/services/__tests__/` - Services (api, sync, grammar, spellcheck)
- `packages/web/src/utils/__tests__/` - Utilities (language, markdownFormatter, platform)
- `packages/web/src/hooks/__tests__/` - Custom hooks (useResize)
- `packages/web/src/contexts/__tests__/` - Editor Context (EditorContextProvider, useEditorContext)

**Testing Framework:**
- **Vitest** - Fast unit test framework
- **happy-dom** - Lightweight DOM environment (faster and more reliable than jsdom)
- **@testing-library/react** - React component testing utilities

### E2E Tests

E2E tests are located in `e2e/` directory, using the naming pattern `*.spec.ts`.

**Current E2E test coverage:**
- `e2e/auth.spec.ts` - Authentication flows (login, logout, token validation)
- `e2e/conflict.spec.ts` - Sync conflict detection and resolution
- `e2e/editor.spec.ts` - Editor functionality, preview, keyboard shortcuts, themes, split editor, open recent
- `e2e/paste.spec.ts` - Paste functionality (plain text, rich text, Word/Docs)
- `e2e/statusbar.spec.ts` - Status bar word/character counts and selection stats
- `e2e/sync.spec.ts` - Document synchronization with server

**Testing Framework:**
- **Playwright** - Cross-browser E2E testing (Chromium, Firefox, WebKit)

## Running Tests

### All Tests

```bash
# Run all unit tests
npm test

# Run all E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm test && npm run test:e2e
```

### Specific Tests

```bash
# Run tests for a specific package
npm run test:web
npm run test:shared
npm run test:server

# Run a specific test file
npm test -- packages/web/src/components/__tests__/Editor.test.tsx

# Run E2E tests for a specific file
npm run test:e2e -- e2e/editor.spec.ts

# Run E2E tests in UI mode (interactive)
npm run test:e2e:ui
```

### Watch Mode

```bash
# Watch mode for unit tests
npm run test:watch

# Watch mode for E2E tests (not available - use UI mode instead)
npm run test:e2e:ui
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

# Coverage report will be available at:
# packages/web/coverage/index.html
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MyComponent } from '../MyComponent';
import { useStore } from '../../store';

// Mock dependencies
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('MyComponent', () => {
  const mockStore = {
    // Mock store state
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  it('should render component', () => {
    const { container } = render(<MyComponent />);
    expect(container.querySelector('[data-testid="my-component"]')).toBeTruthy();
  });

  it('should handle user interaction', () => {
    const { getByText } = render(<MyComponent />);
    const button = getByText('Click me');
    fireEvent.click(button);
    // Verify behavior
  });
});
```

**Important Notes:**
- **Avoid using `screen`** - Use `render()` return values (`getByText`, `getByRole`, `container`) instead. This avoids React Testing Library initialization issues.
- **Mock only when necessary** - Prefer real components and store interactions when possible.
- **Test behavior, not implementation** - Verify what users see, not internal state.

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Use accessible selectors
    await page.getByRole('button', { name: 'File' }).click();
    
    // Use proper waits, not arbitrary timeouts
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    
    // Verify behavior
    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

**Important Notes:**
- **Use accessible selectors** - Prefer `getByRole`, `getByText`, `getByLabel` over CSS selectors.
- **Use proper waits** - Use `waitForSelector`, `waitForFunction` instead of `waitForTimeout`.
- **Test complete workflows** - E2E tests should verify end-to-end user scenarios.

## Test Environment Setup

### Unit Tests

The test environment is configured in `packages/web/vitest.config.ts`:

- **Environment**: `happy-dom` (lightweight DOM implementation)
- **Globals**: Enabled (no need to import `describe`, `it`, `expect`)
- **Setup File**: `packages/web/src/__tests__/setup.ts` (mocks browser APIs)

The setup file (`setup.ts`) provides:
- Jest-dom matchers (`toBeInTheDocument`, etc.)
- Mock `localStorage`
- Mock `ResizeObserver`
- Mock `matchMedia`
- Mock `clipboard` API
- Mock `URL.createObjectURL`

### Mock Files vs vi.mock()

**Important**: Vitest does NOT automatically use files in `__mocks__` directories like Jest does.

- **To use a mock file**: Explicitly call `vi.mock()` in your test file:
  ```typescript
  vi.mock('@testing-library/react', () => require('../__mocks__/@testing-library/react'));
  ```
- **Current state**: The `__mocks__/@testing-library/react.tsx` file exists but is not currently used. Tests import directly from `@testing-library/react` and it works correctly with happy-dom environment.
- **When to use mocks**: Only mock when the real implementation causes issues (e.g., document access problems). The current setup works without mocks.

### E2E Tests

E2E tests use Playwright with three browsers:
- Chromium (default)
- Firefox
- WebKit (Safari)

Configuration is in `playwright.config.ts`.

## Common Patterns

### Testing Components with Store

```typescript
import { useStore } from '../../store';

vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('Component', () => {
  const mockStore = {
    // Provide all required store properties
    tabs: [],
    activeTabId: null,
    // ... other properties
  };

  beforeEach(() => {
    (useStore as any).mockReturnValue(mockStore);
  });

  it('should render', () => {
    const { container } = render(<Component />);
    // Test...
  });
});
```

### Testing Components with Editor Context

Components that use `useEditorContext()` must be wrapped with `MockEditorContextProvider`:

```typescript
import { render, cleanup } from '@testing-library/react';
import { MockEditorContextProvider, createMockEditor, createMockMonaco } from '../../__tests__/mocks/editor-context';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render with editor context', () => {
    const mockEditor = createMockEditor();
    const mockMonaco = createMockMonaco();
    
    const { container } = render(
      <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
        <MyComponent />
      </MockEditorContextProvider>
    );
    
    expect(container.querySelector('[data-testid="my-component"]')).toBeTruthy();
  });
});
```

**Important Notes:**
- **Always wrap with MockEditorContextProvider** - Components using `useEditorContext()` will throw an error without it
- **Use createMockEditor() and createMockMonaco()** - These utilities create properly typed mock instances
- **Mock model methods** - The mock editor's model includes `onDidChangeContent()` and other methods needed by hooks
- **Cleanup after each test** - Use `afterEach(cleanup)` to ensure proper test isolation

### Testing Editor Context Itself

```typescript
import { render, cleanup } from '@testing-library/react';
import { EditorContextProvider, useEditorContext } from '../EditorContext';

function TestComponent() {
  const context = useEditorContext();
  return <div data-testid="has-context">{context.primaryEditor ? 'yes' : 'no'}</div>;
}

describe('EditorContext', () => {
  afterEach(() => {
    cleanup();
  });

  it('should provide context', () => {
    const { getByTestId } = render(
      <EditorContextProvider>
        <TestComponent />
      </EditorContextProvider>
    );
    expect(getByTestId('has-context').textContent).toBe('no');
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useEditorContext must be used within an EditorContextProvider');
  });
});
```

### Testing Async Behavior

```typescript
it('should handle async operation', async () => {
  const { getByText } = render(<Component />);
  const button = getByText('Load Data');
  fireEvent.click(button);
  
  // Wait for async operation
  await waitFor(() => {
    expect(getByText('Data loaded')).toBeTruthy();
  });
});
```

### Testing E2E with Monaco Editor

**Note**: E2E tests may access Monaco editor differently than unit tests. In E2E tests, you can interact with the editor through the DOM or by accessing editor instances via `window.monacoEditor` (development mode only).

**Environment Detection:**
- `window.monacoEditor` is only available in development mode (`import.meta.env.DEV`)
- E2E tests run in development mode, so the editor is accessible
- Production builds do not expose the editor to `window` for security

```typescript
import { MONACO_INIT_TIMEOUT_MS } from '../packages/web/src/constants';

// Wait for Monaco editor to initialize
await page.waitForSelector('.monaco-editor', { timeout: MONACO_INIT_TIMEOUT_MS });

// Option 1: Interact via DOM (recommended for E2E)
await page.fill('.monaco-editor textarea', 'Hello world');

// Option 2: Access editor via window.monacoEditor (dev mode only)
await page.evaluate(() => {
  const editor = (window as any).monacoEditor;
  if (editor) {
    editor.setValue('Hello world');
  }
});

// Wait for UI to update
await page.waitForTimeout(500);
```

### Testing Custom Hooks

Custom hooks can be tested using `renderHook` from `@testing-library/react`:

```typescript
import { renderHook } from '@testing-library/react';
import { useElectronMenu } from '../hooks/useElectronMenu';
import { MockEditorContextProvider } from '../__tests__/mocks/editor-context';

describe('useElectronMenu', () => {
  it('should set up menu handlers in Electron', () => {
    const mockEditor = createMockEditor();
    renderHook(() => useElectronMenu(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider primaryEditor={mockEditor}>
          {children}
        </MockEditorContextProvider>
      ),
    });
    
    // Verify handlers were registered
    expect(window.api?.onMenuNewFile).toHaveBeenCalled();
  });
});
```

**Hook Testing Best Practices:**
- Wrap hook in appropriate providers (EditorContext, Store, etc.)
- Mock external dependencies (Electron API, platform detection)
- Test cleanup functions (unmount hook, verify cleanup called)
- Test conditional behavior (e.g., only runs in Electron)

### Testing Selection Stats Hook with Diff Editors

The `useEditorSelection` hook supports both regular and diff editors:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useEditorSelection } from '../hooks/useEditorSelection';
import { MockEditorContextProvider, createMockEditor } from '../__tests__/mocks/editor-context';

describe('useEditorSelection with diff editor', () => {
  it('should track selection from modified editor in diff mode', async () => {
    const modifiedEditor = createMockEditor({
      getSelection: () => mockSelection,
      getModel: () => mockModel,
    });

    const mockDiffEditor = {
      getModifiedEditor: () => modifiedEditor,
      getOriginalEditor: () => null,
    };

    const { result } = renderHook(() => useEditorSelection(), {
      wrapper: ({ children }) => (
        <MockEditorContextProvider 
          primaryEditor={null} 
          diffEditor={mockDiffEditor}
        >
          {children}
        </MockEditorContextProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
  });
});
```

### Testing Diff Editor Word Wrap

Diff editors use a retry mechanism for word wrap. Test both immediate application and retry scenarios:

```typescript
import { render, waitFor } from '@testing-library/react';
import { SimpleDiffEditor } from '../DiffEditor';
import { createMockEditor } from '../__tests__/mocks/editor-context';

describe('DiffEditor word wrap', () => {
  it('should apply word wrap when models are ready', async () => {
    const originalEditor = createMockEditor();
    const modifiedEditor = createMockEditor();
    const originalModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };
    const modifiedModel = { onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })) };

    originalEditor.getModel = vi.fn(() => originalModel);
    modifiedEditor.getModel = vi.fn(() => modifiedModel);

    const updateOptionsSpy = vi.fn();
    originalEditor.updateOptions = updateOptionsSpy;

    const mockDiffEditor = {
      getOriginalEditor: () => originalEditor,
      getModifiedEditor: () => modifiedEditor,
    };

    // Mock requestAnimationFrame to execute immediately
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0);
        return 0;
      });

    render(<SimpleDiffEditor originalContent="a" modifiedContent="b" />);

    await waitFor(() => {
      expect(updateOptionsSpy).toHaveBeenCalledWith({ wordWrap: 'on' });
    });

    requestAnimationFrameSpy.mockRestore();
  });

  it('should stop retrying after MAX_RETRIES', () => {
    const originalEditor = createMockEditor();
    originalEditor.getModel = vi.fn(() => null); // Models never ready

    const mockDiffEditor = {
      getOriginalEditor: () => originalEditor,
      getModifiedEditor: () => createMockEditor(),
    };

    const rafCalls: Array<() => void> = [];
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        rafCalls.push(cb as () => void);
        return rafCalls.length;
      });

    render(<SimpleDiffEditor originalContent="a" modifiedContent="b" />);

    // Execute retries
    for (let i = 0; i < 52; i++) {
      if (rafCalls[i]) rafCalls[i]();
    }

    // Should have called requestAnimationFrame MAX_RETRIES times (50)
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(51);

    requestAnimationFrameSpy.mockRestore();
  });
});
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for components and utilities
- **E2E Tests**: All major user workflows covered
- **Shared Utilities**: 100% coverage (already achieved)

## Troubleshooting

### Tests Fail with "document is not available"

This should not happen with the current setup. The root `vitest.config.ts` uses project-specific configs:
- Web package uses `happy-dom` environment
- Shared/Server packages use `node` environment

If you see this error:
1. Ensure `happy-dom` is installed: `npm install --save-dev happy-dom`
2. Check `packages/web/vitest.config.ts` has `environment: 'happy-dom'`
3. Verify root `vitest.config.ts` has project-specific configs set up correctly
4. Verify `setup.ts` is being loaded

### Tests Fail with "Invalid Chai property: toBeInTheDocument"

Ensure `setup.ts` extends expect with jest-dom matchers:
```typescript
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);
```

### E2E Tests Timeout

- Increase timeout for slow operations: `test.setTimeout(60000)`
- Use proper waits instead of `waitForTimeout`
- Check if Monaco editor is fully initialized before interacting

### Tests Are Slow

- Unit tests should be fast (< 1s total)
- E2E tests are slower but should complete in < 2 minutes
- Use `npm run test:watch` for faster feedback during development

## Common Issues

### Tests Fail After Refactoring Components

If tests fail after refactoring components, check:
1. **Store mocks**: Ensure all required store properties are mocked
2. **Editor Context**: Components using `useEditorContext()` must be wrapped with `MockEditorContextProvider`
3. **Import paths**: Verify imports match new file structure

### Mock Store Pattern

When mocking the store, use this pattern:
```typescript
const mockStore = {
  // All required properties
};

vi.mock('../../store', () => ({
  useStore: Object.assign(vi.fn(() => mockStore), {
    getState: () => mockStore,
  }),
}));
```

### Testing Generator Functions

Menu generators (`getFileMenuItems`, etc.) are functions, not components:
- Test return values, not rendering
- Mock `useStore.getState()` directly
- Verify menu item structure and actions

### Excluded Test Files

The following test files are temporarily excluded due to Vite import resolution issues with `@cspell` dictionary packages:

- `packages/web/src/services/__tests__/spellcheck.test.ts`
- `packages/web/src/components/__tests__/Editor.test.tsx`

**Root Cause**: Vite's `vite:import-analysis` plugin fails to resolve the `@cspell/dict-*` package exports before `vi.mock()` can intercept them. The actual spellcheck functionality works correctly in the build.

**Workaround**: These tests are excluded in `vitest.config.ts`. The spellcheck service is tested indirectly through E2E tests and manual testing.

**Tracking**: This will be resolved in a future update by either:
1. Upgrading to a Vitest version with better ESM mock support
2. Restructuring the dictionary imports to be more test-friendly

## Best Practices

1. **Write tests first (TDD)** - Write tests before implementing features when possible
2. **Keep tests independent** - Each test should be able to run in isolation
3. **Use descriptive test names** - Test names should clearly describe what is being tested
4. **Avoid testing implementation details** - Test what users see, not how it's implemented
5. **Mock external dependencies** - Mock APIs, file system, browser APIs
6. **Use fixtures for test data** - Create reusable test data structures
7. **Clean up after tests** - Use `afterEach` to reset state between tests

## Adding New Tests

When adding new functionality:

1. **Add unit tests** for components/services/hooks
2. **Add E2E tests** for user workflows
3. **Update this guide** if introducing new testing patterns
4. **Ensure all tests pass** before submitting PR

## Test Maintenance

- **Review tests regularly** - Remove obsolete tests, update outdated ones
- **Keep tests in sync with code** - Update tests when refactoring
- **Monitor test performance** - Keep test suite fast and responsive
- **Document complex tests** - Add comments explaining why tests are structured a certain way

