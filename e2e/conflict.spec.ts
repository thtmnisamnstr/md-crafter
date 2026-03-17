import { test, expect, Page } from '@playwright/test';
import { createNewDocument, setEditorContent } from './helpers';

const AUTH_TOKEN = 'conflict-e2e-token';
const BASE_CONTENT = 'Shared base content';
const LOCAL_CONTENT = 'Local conflicting content';
const REMOTE_CONTENT = 'Remote cloud content';
const REMOTE_ETAG = 'etag-doc-1-v2';

interface MockCloudDocument {
  id: string;
  title: string;
  content: string;
  language: string;
  etag: string;
  createdAt: string;
  updatedAt: string;
}

interface UpdateRequestRecord {
  documentId: string;
  content: string;
  etag: string | null;
}

interface ConflictMockServer {
  syncRequests: UpdateRequestRecord[];
  updateRequests: UpdateRequestRecord[];
}

function buildPersistedState(token: string) {
  return {
    state: {
      apiToken: token,
      theme: 'dark',
      settings: {
        fontSize: 14,
        fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
        tabSize: 2,
        wordWrap: true,
        lineNumbers: true,
        minimap: true,
        autoSync: true,
        syncInterval: 100,
        spellCheck: true,
      },
      sidebarWidth: 280,
      recentFiles: [],
      tabs: [],
      activeTabId: null,
    },
    version: 0,
  };
}

async function seedAuthenticatedState(page: Page): Promise<void> {
  await page.addInitScript((storageValue) => {
    localStorage.setItem('md-crafter-storage', JSON.stringify(storageValue));
  }, buildPersistedState(AUTH_TOKEN));
}

function toApiDocument(doc: MockCloudDocument) {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    language: doc.language,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    etag: doc.etag,
    isCloudSynced: true,
  };
}

async function installConflictApiMock(page: Page): Promise<ConflictMockServer> {
  const docs = new Map<string, MockCloudDocument>();
  let conflictPending = true;
  const syncRequests: UpdateRequestRecord[] = [];
  const updateRequests: UpdateRequestRecord[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/auth/validate' && method === 'POST') {
      const body = request.postDataJSON() as { token?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: body.token === AUTH_TOKEN }),
      });
      return;
    }

    if (path === '/api/auth/me' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'conflict-user-1', email: 'conflict@example.com' }),
      });
      return;
    }

    if (path === '/api/documents' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: Array.from(docs.values()).map(toApiDocument) }),
      });
      return;
    }

    if (path === '/api/documents' && method === 'POST') {
      const body = request.postDataJSON() as { title?: string; content?: string; language?: string };
      const now = new Date().toISOString();
      const createdDoc: MockCloudDocument = {
        id: 'doc-1',
        title: body.title ?? 'Untitled',
        content: body.content ?? '',
        language: body.language ?? 'markdown',
        createdAt: now,
        updatedAt: now,
        etag: 'etag-doc-1-v1',
      };
      docs.set(createdDoc.id, createdDoc);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toApiDocument(createdDoc)),
      });
      return;
    }

    const syncMatch = path.match(/^\/api\/documents\/([^/]+)\/sync$/);
    if (syncMatch && method === 'POST') {
      const documentId = decodeURIComponent(syncMatch[1]);
      const body = request.postDataJSON() as { content?: string; etag?: string | null };
      syncRequests.push({
        documentId,
        content: body.content ?? '',
        etag: body.etag ?? null,
      });

      if (conflictPending) {
        conflictPending = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            conflict: {
              serverContent: REMOTE_CONTENT,
              serverEtag: REMOTE_ETAG,
              serverTimestamp: Date.now(),
            },
          }),
        });
        return;
      }

      const existing = docs.get(documentId);
      if (!existing) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Document not found' }),
        });
        return;
      }

      const updated: MockCloudDocument = {
        ...existing,
        content: body.content ?? existing.content,
        etag: 'etag-doc-1-v3',
        updatedAt: new Date().toISOString(),
      };
      docs.set(documentId, updated);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, document: toApiDocument(updated) }),
      });
      return;
    }

    const docMatch = path.match(/^\/api\/documents\/([^/]+)$/);
    if (docMatch) {
      const documentId = decodeURIComponent(docMatch[1]);
      const existing = docs.get(documentId);
      if (!existing) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Document not found' }),
        });
        return;
      }

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(toApiDocument(existing)),
        });
        return;
      }

      if (method === 'PUT') {
        const body = request.postDataJSON() as { content?: string; etag?: string | null; title?: string; language?: string };
        updateRequests.push({
          documentId,
          content: body.content ?? '',
          etag: body.etag ?? null,
        });

        const updated: MockCloudDocument = {
          ...existing,
          title: body.title ?? existing.title,
          language: body.language ?? existing.language,
          content: body.content ?? existing.content,
          etag: 'etag-doc-1-v4',
          updatedAt: new Date().toISOString(),
        };
        docs.set(documentId, updated);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(toApiDocument(updated)),
        });
        return;
      }
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: `Unhandled API route: ${method} ${path}` }),
    });
  });

  return { syncRequests, updateRequests };
}

async function createCloudDocAndTriggerConflict(page: Page): Promise<void> {
  await createNewDocument(page);
  await setEditorContent(page, BASE_CONTENT);

  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'Save to Cloud' }).click();
  await expect(page.getByText('Saved to cloud')).toBeVisible();

  await setEditorContent(page, LOCAL_CONTENT);
  await expect(page.getByText('Sync Conflict Detected')).toBeVisible();
}

async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });
}

test.describe('Conflict Resolution', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthenticatedState(page);
  });

  test('shows conflict modal with deterministic local and cloud content', async ({ page }) => {
    const server = await installConflictApiMock(page);

    await openApp(page);
    await createCloudDocAndTriggerConflict(page);

    await expect(page.locator('.modal-overlay pre').filter({ hasText: LOCAL_CONTENT }).first()).toBeVisible();
    await expect(page.locator('.modal-overlay pre').filter({ hasText: REMOTE_CONTENT }).first()).toBeVisible();
    expect(server.syncRequests[0]?.etag).toBe('etag-doc-1-v1');
  });

  test('Keep Cloud applies remote content and closes modal', async ({ page }) => {
    await installConflictApiMock(page);

    await openApp(page);
    await createCloudDocAndTriggerConflict(page);

    await page.getByRole('button', { name: 'Keep Cloud' }).click();
    await expect(page.getByText('Sync Conflict Detected')).not.toBeVisible();

    const content = await page.evaluate(() => (window as any).monacoEditor?.getValue?.() ?? '');
    expect(content).toBe(REMOTE_CONTENT);
  });

  test('Keep Local re-saves local content using remote etag', async ({ page }) => {
    const server = await installConflictApiMock(page);

    await openApp(page);
    await createCloudDocAndTriggerConflict(page);

    await page.getByRole('button', { name: 'Keep Local' }).click();
    await expect(page.getByText('Sync Conflict Detected')).not.toBeVisible();

    await expect.poll(() => server.updateRequests.length).toBe(1);
    expect(server.updateRequests[0]).toEqual({
      documentId: 'doc-1',
      content: LOCAL_CONTENT,
      etag: REMOTE_ETAG,
    });
  });

  test('Manual merge saves merged content with remote etag', async ({ page }) => {
    const server = await installConflictApiMock(page);
    const mergedContent = 'Merged local + remote content';

    await openApp(page);
    await createCloudDocAndTriggerConflict(page);

    await page.getByRole('button', { name: 'Manual Merge' }).click();
    const mergeEditor = page.locator('.modal-overlay textarea[spellcheck="false"]').first();
    await expect(mergeEditor).toBeVisible();

    await mergeEditor.fill(mergedContent);
    await expect(mergeEditor).toHaveValue(mergedContent);
    await page.getByRole('button', { name: 'Save Merge' }).click();
    await expect(page.getByText('Sync Conflict Detected')).not.toBeVisible();

    await expect.poll(() => server.updateRequests.length).toBe(1);
    expect(server.updateRequests[0]).toEqual({
      documentId: 'doc-1',
      content: mergedContent,
      etag: REMOTE_ETAG,
    });
  });
});
