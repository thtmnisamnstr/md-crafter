import { test, expect } from '@playwright/test';

// Increase default timeout for Monaco editor initialization
const MONACO_TIMEOUT = 30000;

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the app', async ({ page }) => {
    await expect(page).toHaveTitle(/md-edit/i);
  });

  test('should have Monaco editor visible', async ({ page }) => {
    // Wait for Monaco editor to load (longer timeout for CI)
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('should have menu bar', async ({ page }) => {
    // Use specific button selectors to avoid matching "Search All Files"
    await expect(page.getByRole('button', { name: 'File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible();
  });

  test('should open File menu', async ({ page }) => {
    await page.getByRole('button', { name: 'File' }).click();
    await expect(page.getByText('New Document')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Open/i }).or(page.getByText('Open'))).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Save/i }).or(page.getByText('Save'))).toBeVisible();
  });

  test('should create new document', async ({ page }) => {
    // Click File menu
    await page.getByRole('button', { name: 'File' }).click();
    // Click New Document
    await page.getByText('New Document').click();
    // Should create a new tab - wait for Monaco to be visible as indicator
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('should toggle sidebar', async ({ page }) => {
    // Wait for app to fully load
    await page.waitForTimeout(1000);
    
    // Find sidebar toggle or use keyboard shortcut
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
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
  });

  test('should toggle preview', async ({ page }) => {
    // Click View menu
    await page.getByRole('button', { name: 'View' }).click();
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
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
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
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
  });

  test('should change theme via View menu', async ({ page }) => {
    // Click View menu
    await page.getByRole('button', { name: 'View' }).click();
    // Hover over Theme
    await page.getByText('Theme').hover();
    
    // Should see theme options
    await expect(page.getByText('Dark+')).toBeVisible();
    await expect(page.getByText('Light+')).toBeVisible();
  });
});
