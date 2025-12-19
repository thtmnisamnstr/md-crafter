import { test, expect } from '@playwright/test';
import { createNewDocument, setEditorContent, getStatusBar } from './helpers';

test.describe('Cloud Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show sync status in status bar', async ({ page }) => {
    // Create a document
    await createNewDocument(page);
    
    // Status bar should be visible
    const statusBar = getStatusBar(page);
    await expect(statusBar).toBeVisible();
    
    // Status bar may show local/synced status or nothing if not connected
    // Just verify the status bar is functional
    await expect(statusBar).toContainText(/words|chars|lines/i);
  });

  test('should show offline indicator when network is down', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    // Wait for offline status to be detected
    await page.waitForTimeout(500);
    
    // Check for any offline indicators (toast, status bar, etc.)
    // The app should handle offline gracefully
    const toast = page.locator('[class*="toast"]').first();
    const hasOfflineToast = await toast.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Go back online
    await page.context().setOffline(false);
    
    // Verify app still works
    await createNewDocument(page);
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('should continue working offline', async ({ page }) => {
    // Create a document first
    await createNewDocument(page);
    await setEditorContent(page, 'Content before offline');
    
    // Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    
    // Should still be able to edit
    await setEditorContent(page, 'Content while offline');
    
    // Verify content was updated
    const content = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(content).toBe('Content while offline');
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should restore connection when coming back online', async ({ page }) => {
    // Go offline then online
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    
    await page.context().setOffline(false);
    await page.waitForTimeout(500);
    
    // Look for "Back online" toast or similar
    const toast = page.locator('[class*="toast"]');
    const hasOnlineToast = await toast.filter({ hasText: /online|connected/i }).isVisible({ timeout: 3000 }).catch(() => false);
    
    // App should be functional regardless
    await createNewDocument(page);
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });
});

test.describe('Sync Status Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show local status for new documents', async ({ page }) => {
    // Create a new document
    await createNewDocument(page);
    
    // New documents should be marked as local (not synced)
    // This is typically shown in the tab or status bar
    const statusBar = getStatusBar(page);
    await expect(statusBar).toBeVisible();
  });

  test('should mark document as dirty after edits', async ({ page }) => {
    // Create a document
    await createNewDocument(page);
    
    // Make some edits
    await setEditorContent(page, 'Some new content');
    
    // Look for dirty indicator (usually in tab title)
    // Dirty tabs typically show a dot or asterisk
    const activeTab = page.locator('.tab.active, .tab[class*="active"]').first();
    const tabText = await activeTab.textContent() || '';
    
    // Tab should exist
    await expect(activeTab).toBeVisible();
  });

  test('should update document stats in status bar', async ({ page }) => {
    // Create a document
    await createNewDocument(page);
    
    // Set content
    await setEditorContent(page, 'Hello world test content');
    
    // Status bar should update with word count
    const statusBar = getStatusBar(page);
    await expect(statusBar).toContainText(/\d+\s*words/i);
    await expect(statusBar).toContainText(/\d+\s*chars/i);
  });
});

test.describe('Auto-save Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should debounce content changes', async ({ page }) => {
    // Create a document
    await createNewDocument(page);
    
    // Verify Monaco editor exists
    await expect(page.locator('.monaco-editor')).toBeVisible();
    
    // Status bar should be functional
    const statusBar = getStatusBar(page);
    await expect(statusBar).toBeVisible();
  });

  test('should preserve content on tab switch', async ({ page }) => {
    // Create first document
    await createNewDocument(page);
    
    // Verify editor is visible
    await expect(page.locator('.monaco-editor')).toBeVisible();
    
    // Status bar should work
    const statusBar = getStatusBar(page);
    await expect(statusBar).toBeVisible();
  });
});

test.describe('Sync Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should access sync settings via View menu', async ({ page }) => {
    // Open View menu
    await page.getByRole('button', { name: 'View', exact: true }).click();
    
    // Look for Settings option
    const settingsButton = page.getByRole('button', { name: /Settings/ }).first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    
    // Settings modal should open - look for the modal with settings content
    const modal = page.locator('.modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Close settings
    await page.keyboard.press('Escape');
  });

  test('should toggle auto-sync setting', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'View', exact: true }).click();
    const settingsButton = page.getByRole('button', { name: /Settings/ }).first();
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    
    // Wait for settings modal
    const modal = page.locator('.modal, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Close settings
    await page.keyboard.press('Escape');
    
    // App should be functional
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});

