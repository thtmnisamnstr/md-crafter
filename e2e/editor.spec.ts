import { test, expect } from '@playwright/test';

// Increase default timeout for Monaco editor initialization
const MONACO_TIMEOUT = 30000;

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to fully load (network idle)
    await page.waitForLoadState('networkidle');
  });

  test('should load the app', async ({ page }) => {
    await expect(page).toHaveTitle(/md-edit/i);
  });

  test('should show WelcomeTab on first load', async ({ page }) => {
    // On first load, WelcomeTab should be visible (not Monaco editor)
    await expect(page.getByText('Welcome to md-edit')).toBeVisible();
  });

  test('should have menu bar', async ({ page }) => {
    // Use exact: true to avoid "Edit" matching "OPEN EDITORS"
    await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
  });

  test('should open File menu', async ({ page }) => {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    // Use first() since "New Document" appears in both menu and WelcomeTab
    await expect(page.getByText('New Document').first()).toBeVisible();
  });

  test('should create new document and show Monaco editor', async ({ page }) => {
    // Click File menu
    await page.getByRole('button', { name: 'File', exact: true }).click();
    // Click New Document (use first() to avoid WelcomeTab duplicate)
    await page.getByText('New Document').first().click();
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('should toggle sidebar', async ({ page }) => {
    // Wait for app to fully load
    await page.waitForTimeout(500);
    
    // Find sidebar
    const sidebar = page.locator('.sidebar');
    
    // Check initial state
    const initiallyVisible = await sidebar.isVisible();
    
    // Use keyboard shortcut Ctrl+B to toggle
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(300);
    
    // Check toggled state
    const afterToggle = await sidebar.isVisible();
    expect(afterToggle).not.toBe(initiallyVisible);
  });
});

test.describe('Markdown Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Create a document first so Monaco exists
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByText('New Document').first().click();
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
  });

  test('should toggle preview', async ({ page }) => {
    // Click View menu
    await page.getByRole('button', { name: 'View', exact: true }).click();
    // Click Toggle Preview
    await page.getByText('Toggle Preview').click();
    
    // Preview should be visible - check for common preview class names
    await expect(
      page.locator('.markdown-preview, .preview-pane, [class*="preview"]').first()
    ).toBeVisible({ timeout: 5000 });
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

  test('should open search with Ctrl+Shift+F', async ({ page }) => {
    await page.keyboard.press('Control+Shift+f');
    await expect(page.locator('.search-modal, [class*="search-modal"]').first()).toBeVisible();
  });
});

test.describe('Themes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should change theme via View menu', async ({ page }) => {
    // Click View menu
    await page.getByRole('button', { name: 'View', exact: true }).click();
    // Hover over Theme
    await page.getByText('Theme').hover();
    
    // Should see theme options
    await expect(page.getByText('Dark+')).toBeVisible();
    await expect(page.getByText('Light+')).toBeVisible();
  });
});
