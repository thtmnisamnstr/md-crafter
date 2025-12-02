import { test, expect } from '@playwright/test';

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the app', async ({ page }) => {
    await expect(page).toHaveTitle(/md-edit/i);
  });

  test('should have Monaco editor visible', async ({ page }) => {
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('should have menu bar', async ({ page }) => {
    await expect(page.getByText('File')).toBeVisible();
    await expect(page.getByText('Edit')).toBeVisible();
    await expect(page.getByText('View')).toBeVisible();
    await expect(page.getByText('Help')).toBeVisible();
  });

  test('should open File menu', async ({ page }) => {
    await page.getByText('File').click();
    await expect(page.getByText('New Document')).toBeVisible();
    await expect(page.getByText('Open')).toBeVisible();
    await expect(page.getByText('Save')).toBeVisible();
  });

  test('should create new document', async ({ page }) => {
    // Click File menu
    await page.getByText('File').click();
    // Click New Document
    await page.getByText('New Document').click();
    // Should create a new tab
    await expect(page.locator('.tab-bar')).toBeVisible();
  });

  test('should toggle sidebar', async ({ page }) => {
    // Find sidebar toggle or use keyboard shortcut
    const sidebar = page.locator('.sidebar');
    
    // Check initial state
    const initiallyVisible = await sidebar.isVisible();
    
    // Use keyboard shortcut Ctrl+B to toggle
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(100);
    
    // Check toggled state
    const afterToggle = await sidebar.isVisible();
    expect(afterToggle).not.toBe(initiallyVisible);
  });
});

test.describe('Markdown Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
  });

  test('should toggle preview', async ({ page }) => {
    // Click View menu
    await page.getByText('View').click();
    // Click Toggle Preview
    await page.getByText('Toggle Preview').click();
    
    // Preview should be visible
    await expect(page.locator('.markdown-preview, .preview-pane')).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
  });

  test('should open command palette with Ctrl+Shift+P', async ({ page }) => {
    await page.keyboard.press('Control+Shift+p');
    await expect(page.locator('.command-palette')).toBeVisible();
  });

  test('should close command palette with Escape', async ({ page }) => {
    await page.keyboard.press('Control+Shift+p');
    await expect(page.locator('.command-palette')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette')).not.toBeVisible();
  });

  test('should open search with Ctrl+Shift+F', async ({ page }) => {
    await page.keyboard.press('Control+Shift+f');
    await expect(page.locator('.search-modal')).toBeVisible();
  });
});

test.describe('Themes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
  });

  test('should change theme via View menu', async ({ page }) => {
    // Click View menu
    await page.getByText('View').click();
    // Hover over Theme
    await page.getByText('Theme').hover();
    
    // Should see theme options
    await expect(page.getByText('Dark+')).toBeVisible();
    await expect(page.getByText('Light+')).toBeVisible();
  });
});

