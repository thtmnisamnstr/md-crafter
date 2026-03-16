import { test, expect, Page } from '@playwright/test';

const DEFAULT_TOKEN = 'test-token-auth-123';

interface MockAuthApiOptions {
  generatedToken?: string;
  validateToken?: (token: string) => boolean;
  cloudDocuments?: Array<{ id: string; title: string; content: string; etag: string }>;
  failTokenGeneration?: boolean;
}

async function mockAuthApi(page: Page, options: MockAuthApiOptions = {}): Promise<void> {
  const {
    generatedToken = DEFAULT_TOKEN,
    validateToken = (token) => token === generatedToken,
    cloudDocuments = [],
    failTokenGeneration = false,
  } = options;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/auth/token' && method === 'POST') {
      if (failTokenGeneration) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to generate token' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'user-auth-1',
          apiToken: generatedToken,
        }),
      });
      return;
    }

    if (path === '/api/auth/validate' && method === 'POST') {
      const body = request.postDataJSON() as { token?: string };
      const token = body.token ?? '';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: validateToken(token) }),
      });
      return;
    }

    if (path === '/api/auth/me' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'user-auth-1', email: 'user@example.com' }),
      });
      return;
    }

    if (path === '/api/documents' && method === 'GET') {
      const now = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: cloudDocuments.map((doc) => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            language: 'markdown',
            createdAt: now,
            updatedAt: now,
            etag: doc.etag,
            isCloudSynced: true,
          })),
        }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: `Unhandled API route: ${method} ${path}` }),
    });
  });
}

async function openAuthModalFromSidebar(page: Page): Promise<void> {
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Cloud Sync Setup')).toBeVisible();
}

async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });
}

test.describe('Authentication Flow', () => {
  test('shows signed-out cloud prompt and opens auth modal from sidebar', async ({ page }) => {
    await openApp(page);

    await expect(page.getByText('Sign in to sync your documents')).toBeVisible();
    await openAuthModalFromSidebar(page);

    await page.locator('.modal .modal-header button').first().click();
    await expect(page.getByText('Cloud Sync Setup')).not.toBeVisible();
  });

  test('opens auth modal from command palette Sign In command', async ({ page }) => {
    await openApp(page);

    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('button', { name: 'Command Palette' }).click();
    await expect(page.locator('.command-palette')).toBeVisible();

    const commandInput = page.locator('.command-palette input').first();
    await commandInput.fill('sign in');
    await page.locator('.command-palette-list').getByText('Sign In', { exact: true }).first().click();

    await expect(page.getByText('Cloud Sync Setup')).toBeVisible();
  });

  test('generates token and signs in through Start Using Cloud Sync', async ({ page }) => {
    const cloudDocuments = [
      { id: 'cloud-doc-1', title: 'Cloud Notes', content: '# Cloud Notes', etag: 'etag-cloud-1' },
    ];
    await mockAuthApi(page, { cloudDocuments });

    await openApp(page);
    await openAuthModalFromSidebar(page);

    await page.getByPlaceholder('your@email.com').fill('person@example.com');
    await page.getByRole('button', { name: 'Generate API Token' }).click();

    await expect(page.getByText('API Token generated successfully!')).toBeVisible();
    await expect(page.getByText(DEFAULT_TOKEN)).toBeVisible();

    await page.getByRole('button', { name: 'Start Using Cloud Sync' }).click();

    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    await expect(page.locator('div[role="status"]')).toContainText('Syncing enabled');
    await expect(page.getByText('Cloud Notes')).toBeVisible();
  });

  test('shows deterministic error when token generation fails', async ({ page }) => {
    await mockAuthApi(page, { failTokenGeneration: true });

    await openApp(page);
    await openAuthModalFromSidebar(page);

    await page.getByRole('button', { name: 'Generate API Token' }).click();
    await expect(page.locator('.modal').getByText('Failed to generate token')).toBeVisible();
  });
});

test.describe('Token Management', () => {
  test('persists authenticated state across page reload', async ({ page }) => {
    const cloudDocuments = [
      { id: 'cloud-doc-1', title: 'Reload Doc', content: 'Persist me', etag: 'etag-reload-1' },
    ];
    let validateCalls = 0;

    await mockAuthApi(page, {
      cloudDocuments,
      validateToken: (token) => {
        validateCalls += 1;
        return token === DEFAULT_TOKEN;
      },
    });

    await openApp(page);
    await openAuthModalFromSidebar(page);

    await page.getByRole('button', { name: 'Generate API Token' }).click();
    await page.getByRole('button', { name: 'Start Using Cloud Sync' }).click();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

    await page.reload();
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    await expect(page.getByText('Reload Doc')).toBeVisible();
    expect(validateCalls).toBeGreaterThanOrEqual(2);
  });

  test('clears authenticated UI state on logout', async ({ page }) => {
    await mockAuthApi(page);

    await openApp(page);
    await openAuthModalFromSidebar(page);

    await page.getByRole('button', { name: 'Generate API Token' }).click();
    await page.getByRole('button', { name: 'Start Using Cloud Sync' }).click();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();

    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('div[role="status"]')).not.toContainText('Syncing enabled');
  });
});
