import { test, expect, Page } from '@playwright/test';
import { createNewDocument, setEditorContent, getStatusBar } from './helpers';

const AUTH_TOKEN = 'sync-e2e-token';

interface MockCloudDocument {
  id: string;
  title: string;
  content: string;
  language: string;
  etag: string;
  createdAt: string;
  updatedAt: string;
}

interface SyncRequestRecord {
  documentId: string;
  content: string;
  etag: string | null;
}

interface MockSyncServer {
  syncRequests: SyncRequestRecord[];
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

async function installSyncApiMock(page: Page, initialDocs: MockCloudDocument[] = []): Promise<MockSyncServer> {
  const docs = new Map<string, MockCloudDocument>(initialDocs.map((doc) => [doc.id, { ...doc }]));
  let nextDocId = initialDocs.length + 1;
  const syncRequests: SyncRequestRecord[] = [];

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
        body: JSON.stringify({ id: 'sync-user-1', email: 'sync@example.com' }),
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
      const id = `doc-${nextDocId}`;
      const createdDoc: MockCloudDocument = {
        id,
        title: body.title ?? 'Untitled',
        content: body.content ?? '',
        language: body.language ?? 'markdown',
        createdAt: now,
        updatedAt: now,
        etag: `etag-${nextDocId}-v1`,
      };
      docs.set(id, createdDoc);
      nextDocId += 1;

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
      const existing = docs.get(documentId);
      if (!existing) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Document not found' }),
        });
        return;
      }

      const body = request.postDataJSON() as { content?: string; etag?: string | null };
      syncRequests.push({
        documentId,
        content: body.content ?? '',
        etag: body.etag ?? null,
      });

      const nextVersion = Number(existing.etag.match(/v(\d+)$/)?.[1] ?? '1') + 1;
      const updated: MockCloudDocument = {
        ...existing,
        content: body.content ?? '',
        updatedAt: new Date().toISOString(),
        etag: `${existing.etag.replace(/v\d+$/, '')}v${nextVersion}`,
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
        const body = request.postDataJSON() as { title?: string; content?: string; language?: string; etag?: string };
        const nextVersion = Number(existing.etag.match(/v(\d+)$/)?.[1] ?? '1') + 1;
        const updated: MockCloudDocument = {
          ...existing,
          title: body.title ?? existing.title,
          content: body.content ?? existing.content,
          language: body.language ?? existing.language,
          updatedAt: new Date().toISOString(),
          etag: `${existing.etag.replace(/v\d+$/, '')}v${nextVersion}`,
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

  return { syncRequests };
}

test.describe('Cloud Sync', () => {
  test('shows authenticated sync status and cloud documents on load', async ({ page }) => {
    const now = new Date().toISOString();
    await seedAuthenticatedState(page);
    await installSyncApiMock(page, [
      {
        id: 'doc-1',
        title: 'Cloud Doc One',
        content: '# Cloud Doc',
        language: 'markdown',
        etag: 'etag-1-v1',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(getStatusBar(page)).toContainText('Online');
    await expect(getStatusBar(page)).toContainText('Syncing enabled');
    await expect(page.getByText('Cloud Doc One')).toBeVisible();
  });

  test('saves document to cloud and auto-syncs edits with etag', async ({ page }) => {
    await seedAuthenticatedState(page);
    const server = await installSyncApiMock(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createNewDocument(page);
    await setEditorContent(page, 'Initial sync content');

    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('button', { name: 'Save to Cloud' }).click();

    await expect(page.getByText('Saved to cloud')).toBeVisible();
    await expect(page.locator('[role="tab"]').first()).toHaveAttribute('aria-label', /cloud synced/i);
    await expect(getStatusBar(page)).toContainText('Synced');

    await setEditorContent(page, 'Updated sync content');

    await expect.poll(() => server.syncRequests.length).toBeGreaterThan(0);
    expect(server.syncRequests[0]?.etag).toBe('etag-1-v1');
    await expect(getStatusBar(page)).toContainText('Synced');
  });

  test('shows deterministic offline and back-online transitions', async ({ page }) => {
    await seedAuthenticatedState(page);
    await installSyncApiMock(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(getStatusBar(page)).toContainText('Online');

    await page.context().setOffline(true);
    await expect(getStatusBar(page)).toContainText('Offline');
    await expect(page.locator('.toast').filter({ hasText: 'You are offline' }).first()).toBeVisible();

    await page.context().setOffline(false);
    await expect(getStatusBar(page)).toContainText('Online');
    await expect(page.locator('.toast').filter({ hasText: 'Back online' }).first()).toBeVisible();
  });
});

test.describe('Sync Settings', () => {
  test('disabling auto-sync prevents sync calls after edits', async ({ page }) => {
    await seedAuthenticatedState(page);
    const server = await installSyncApiMock(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('button', { name: /Settings/ }).first().click();
    await expect(page.locator('.modal h2').filter({ hasText: 'Settings' })).toBeVisible();

    const autoSyncRow = page.locator('label').filter({ hasText: 'Auto Sync' }).first();
    await autoSyncRow.locator('button[type="button"]').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await createNewDocument(page);
    await setEditorContent(page, 'Cloud-save baseline');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('button', { name: 'Save to Cloud' }).click();
    await expect(page.getByText('Saved to cloud')).toBeVisible();

    await setEditorContent(page, 'Edit after disabling auto-sync');
    await page.waitForTimeout(500);

    expect(server.syncRequests).toHaveLength(0);
  });
});
