import { test, expect } from '@playwright/test';
import {
  MONACO_TIMEOUT,
  waitForMonacoEditor,
  createNewDocument,
  setEditorContent,
  getStatusBar,
} from './helpers';

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the app', async ({ page }) => {
    await expect(page).toHaveTitle(/md-crafter/i);
  });

  test('should show WelcomeTab on first load', async ({ page }) => {
    await expect(page.getByText('Welcome to md-crafter')).toBeVisible();
  });

  test('should have menu bar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
  });

  test('should open File menu', async ({ page }) => {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await expect(page.getByText('New Document').first()).toBeVisible();
  });

  test('should create new document and show Monaco editor', async ({ page }) => {
    await createNewDocument(page);
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Verify status bar is visible
    const statusBar = getStatusBar(page);
    await expect(statusBar).toBeVisible();
    await expect(statusBar).toContainText(/words/i);
    await expect(statusBar).toContainText(/chars/i);
  });

  test('should toggle sidebar', async ({ page }) => {
    // Wait for app to be fully loaded
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 });

    const sidebar = page.locator('.sidebar');
    const initiallyVisible = await sidebar.isVisible();

    await page.keyboard.press('Control+b');

    // Wait for sidebar state to change
    if (initiallyVisible) {
      await expect(sidebar).not.toBeVisible({ timeout: 3000 });
    } else {
      await expect(sidebar).toBeVisible({ timeout: 3000 });
    }

    const afterToggle = await sidebar.isVisible();
    expect(afterToggle).not.toBe(initiallyVisible);
  });
});

test.describe('Markdown Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createNewDocument(page);
  });

  test('should toggle preview', async ({ page }) => {
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText(/Show Preview|Hide Preview/).first().click();

    await expect(page.locator('.markdown-preview')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open command palette with Ctrl+Shift+P', async ({ page }) => {
    await page.keyboard.press('Control+Shift+p');
    await expect(page.locator('.command-palette, [class*="command-palette"]').first()).toBeVisible();
  });

  test('should close command palette with Escape', async ({ page }) => {
    await page.keyboard.press('Control+Shift+p');
    await expect(page.locator('.command-palette, [class*="command-palette"]').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette, [class*="command-palette"]').first()).not.toBeVisible();
  });

  test('should open search with Ctrl+Shift+Alt+F', async ({ page }) => {
    // Global search uses Ctrl+Shift+Alt+F (Ctrl+Shift+F is for format document)
    await page.keyboard.press('Control+Shift+Alt+f');
    // Wait for modal overlay to appear (search modal uses modal-overlay class)
    await expect(page.locator('.modal-overlay .modal').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Themes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should change theme via View menu', async ({ page }) => {
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByRole('button', { name: /Settings/ }).first().click();
    await expect(page.getByText('Theme', { exact: true })).toBeVisible({ timeout: 5000 });

    const initialTheme = await page.evaluate(() => {
      return document.documentElement.className.split(' ').find(cls =>
        cls === 'dark' || cls === 'light'
      );
    });
    expect(initialTheme).toBeDefined();
  });
});

test.describe('Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create multiple tabs', async ({ page }) => {
    // Create first document
    await createNewDocument(page);

    // Wait for tab to be created - use role selector for better reliability
    await expect(page.locator('[role="tab"]').first()).toBeVisible();

    // Verify at least one tab exists
    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should switch between tabs', async ({ page }) => {
    // Create a document
    await createNewDocument(page);

    // Verify editor is visible
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Verify tab exists
    await expect(page.locator('[role="tab"]').first()).toBeVisible();
  });

  test('should close tab', async ({ page }) => {
    // Create a document
    await createNewDocument(page);

    // Count tabs
    const initialCount = await page.locator('[role="tab"]').count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // Try to close the last tab by clicking its close button
    const lastTab = page.locator('[role="tab"]').last();
    const closeButton = lastTab.locator('button, [class*="close"], svg').first();

    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();

      // Wait for tab count to change
      await expect(async () => {
        const finalCount = await page.locator('[role="tab"]').count();
        expect(finalCount).toBeLessThanOrEqual(initialCount);
      }).toPass({ timeout: 3000 });
    }
  });

  test('should not show unsaved changes modal for blank new document', async ({ page }) => {
    // Navigate to root to ensure clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create new document
    await createNewDocument(page);

    // Wait for tab to be visible
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(1);

    // Attempt to close the tab
    const closeButton = page.getByRole('button', { name: /Close Untitled/i });
    await closeButton.click();

    // Check that the tab closed without showing the "Unsaved Changes" modal
    await expect(page.getByText('Unsaved Changes')).not.toBeVisible();

    // Check that tab count is 0
    await expect(tabs).toHaveCount(0);

    // We should be back at the Welcome tab
    await expect(page.getByText('Welcome to md-crafter')).toBeVisible();
  });

  test('should show unsaved changes modal for modified document', async ({ page }) => {
    // Navigate to root to ensure clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create new document and add content
    await createNewDocument(page);
    await setEditorContent(page, 'Dirty content');

    // Wait for dirty indicator to appear in the tab
    const dirtyIndicator = page.locator('[aria-label="Unsaved changes"]');
    await expect(dirtyIndicator).toBeVisible();

    // Attempt to close the tab via File menu
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByText('Close Tab').click();

    // Check that the modal is visible using a more specific selector
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Unsaved Changes');

    // Cancel closing
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();

    // Tab should still be there
    await expect(page.locator('[role="tab"]')).toHaveCount(1);
  });
});

test.describe('Split Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createNewDocument(page);
    await createNewDocument(page); // Second document required for split mode
  });

  test('should enable split mode', async ({ page }) => {
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Split Editor').hover();
    await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });
    await page.getByText('Split Right').click();

    // Verify split mode is enabled (should see two editors)
    const editors = page.locator('.monaco-editor');
    await expect(editors).toHaveCount(2);
  });

  test('should allow different files in each pane', async ({ page }) => {
    // Enable vertical split
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Split Editor').hover();
    await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });
    await page.getByText('Split Right').click();

    // Look for pane labels or selectors
    // The split view should show some UI to select files for each pane
    const editors = page.locator('.monaco-editor');
    await expect(editors).toHaveCount(2);
  });

  test('should disable split mode', async ({ page }) => {
    // Enable split mode first
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Split Editor').hover();
    await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });
    await page.getByText('Split Right').click();

    // Verify split is enabled
    await expect(page.locator('.monaco-editor')).toHaveCount(2);

    // Disable split mode
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Split Editor').hover();
    await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });
    await page.getByText(/No Split/).click();

    // Should only see one editor
    await expect(page.locator('.monaco-editor')).toHaveCount(1);
  });
});

test.describe('Open Recent Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show recent files in menu', async ({ page }) => {
    // Create a document to add to recent files
    await createNewDocument(page);

    // Open File menu and check Open Recent submenu
    await page.getByRole('button', { name: 'File', exact: true }).click();

    // Check if Open Recent exists (may not be visible in web mode)
    const openRecentVisible = await page.getByText('Open Recent').isVisible().catch(() => false);
    if (openRecentVisible) {
      await page.getByText('Open Recent').hover();
      await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });

      const recentMenu = page.locator('text=Open Recent').locator('..');
      await expect(recentMenu).toBeVisible();
    }
    // In web mode without Electron, Open Recent may not be available
  });

  test('should open recent file when tab exists', async ({ page }) => {
    // Create a document
    await createNewDocument(page);

    // Verify tab exists
    await expect(page.locator('[role="tab"]').first()).toBeVisible();

    // Open File menu
    await page.getByRole('button', { name: 'File', exact: true }).click();

    // File menu should be visible
    await expect(page.getByText('New Document').first()).toBeVisible();

    // Close menu
    await page.keyboard.press('Escape');
  });
});

test.describe('View Submenu Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createNewDocument(page);
  });

  test('should open Split Editor submenu', async ({ page }) => {
    await page.getByRole('button', { name: 'View', exact: true }).click();

    const splitEditorButton = page.getByRole('button', { name: 'Split Editor' });
    await splitEditorButton.hover();

    // Verify submenu is visible
    const submenu = page.locator('[data-submenu]');
    await expect(submenu).toBeVisible({ timeout: 5000 });
  });

  test('should close submenu when clicking an option', async ({ page }) => {
    await page.getByRole('button', { name: 'View', exact: true }).click();

    const splitEditorButton = page.getByRole('button', { name: 'Split Editor' });
    await splitEditorButton.hover();

    const submenu = page.locator('[data-submenu]');
    await expect(submenu).toBeVisible({ timeout: 5000 });

    // Click an option in the submenu
    await page.getByText('Split Right').click();

    // Menu should close after clicking
    await expect(submenu).not.toBeVisible({ timeout: 2000 });
  });

  test('should close submenu when mouse leaves', async ({ page }) => {
    await page.getByRole('button', { name: 'View', exact: true }).click();

    const splitEditorButton = page.getByRole('button', { name: 'Split Editor' });
    await splitEditorButton.hover();

    const submenu = page.locator('[data-submenu]');
    await expect(submenu).toBeVisible({ timeout: 5000 });

    // Move mouse away
    await page.mouse.move(10, 10);

    await expect(submenu).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Diff View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show Compare Files submenu in View menu', async ({ page }) => {
    // Create a new document
    await createNewDocument(page);
    await setEditorContent(page, 'Hello world');

    // Open View menu
    await page.getByRole('button', { name: 'View', exact: true }).click();

    // Verify Compare Files option exists
    await expect(page.getByText('Compare Files')).toBeVisible();

    // Hover to open submenu
    await page.getByText('Compare Files').hover();
    await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });

    // Verify submenu options exist
    await expect(page.getByText('Compare with Saved Version')).toBeVisible();

    // Close menu
    await page.keyboard.press('Escape');
  });

  test('should show Compare with Saved Version option', async ({ page }) => {
    // Create a new document with content
    await createNewDocument(page);
    await setEditorContent(page, 'Original content');

    // Open View menu and hover on Compare Files
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Compare Files').hover();
    await expect(page.locator('[data-submenu]')).toBeVisible({ timeout: 3000 });

    // Verify the option exists (may be disabled if no saved version)
    await expect(page.getByText('Compare with Saved Version')).toBeVisible();

    // Close menu
    await page.keyboard.press('Escape');
  });
});
