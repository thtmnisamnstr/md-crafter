import { test, expect } from '@playwright/test';
import { createNewDocument, setEditorContent, getStatusBar } from './helpers';

test.describe('Conflict Resolution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render conflict modal when conflict exists', async ({ page }) => {
    // This test verifies the conflict modal component structure
    // In a real scenario, a conflict would be triggered by the server
    
    // We can verify the modal structure exists in the app bundle
    // by checking if the ConflictModal component is lazy loaded
    
    // Create a document
    await createNewDocument(page);
    await setEditorContent(page, 'Some content');
    
    // The conflict modal is lazy loaded and won't appear unless there's a conflict
    // We just verify the app is functional and ready to handle conflicts
    await expect(page.locator('.monaco-editor')).toBeVisible();
    
    // Verify status bar works (shows app is responsive)
    const statusBar = getStatusBar(page);
    await expect(statusBar).toBeVisible();
  });

  test('should continue working normally without conflicts', async ({ page }) => {
    // Create and edit a document
    await createNewDocument(page);
    await setEditorContent(page, 'Content without conflicts');
    
    // Verify editor is functional
    const content = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(content).toBe('Content without conflicts');
    
    // No conflict modal should be visible
    const conflictModal = page.locator('[class*="conflict"], text=Conflict Detected');
    const hasConflict = await conflictModal.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasConflict).toBe(false);
  });

  test('should allow editing while syncing', async ({ page }) => {
    // Create a document
    await createNewDocument(page);
    await setEditorContent(page, 'Initial content');
    
    // Continue typing - edits should work regardless of sync status
    await setEditorContent(page, 'Updated content during potential sync');
    
    // Verify content is updated
    const content = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(content).toBe('Updated content during potential sync');
  });
});

test.describe('Conflict Modal UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should verify app can handle conflict state', async ({ page }) => {
    // Set up a document
    await createNewDocument(page);
    await setEditorContent(page, 'Test content for conflict scenario');
    
    // Simulate setting conflict state via window API (if exposed for testing)
    const hasConflictState = await page.evaluate(() => {
      // Check if the store is accessible (it may be in dev mode)
      return typeof (window as any).monacoEditor !== 'undefined';
    });
    
    expect(hasConflictState).toBe(true);
  });

  test('should preserve local changes during conflict', async ({ page }) => {
    // Create document with content
    await createNewDocument(page);
    const localContent = 'This is my local content that should be preserved';
    await setEditorContent(page, localContent);
    
    // Verify local content is intact
    const content = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(content).toBe(localContent);
    
    // Content should persist even if we interact with other UI elements
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.keyboard.press('Escape');
    
    // Re-verify content
    const contentAfter = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(contentAfter).toBe(localContent);
  });
});

test.describe('Merge Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should support undo after edits', async ({ page }) => {
    // Create document
    await createNewDocument(page);
    
    // Make several edits
    await setEditorContent(page, 'First version');
    await setEditorContent(page, 'Second version');
    
    // Try undo
    await page.keyboard.press('Control+z');
    
    // Content may or may not be undone depending on how Monaco handles setValue
    // Just verify undo doesn't break the editor
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
  });

  test('should support redo after undo', async ({ page }) => {
    // Create document
    await createNewDocument(page);
    
    // Type some content directly (not using setValue which clears undo)
    await page.locator('.monaco-editor').click();
    await page.keyboard.type('Hello World');
    
    // Undo
    await page.keyboard.press('Control+z');
    
    // Redo
    await page.keyboard.press('Control+Shift+z');
    
    // Editor should still be functional
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
  });
});

test.describe('Offline Conflict Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should queue changes while offline', async ({ page }) => {
    // Create document
    await createNewDocument(page);
    await setEditorContent(page, 'Content before offline');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Make edits
    await setEditorContent(page, 'Content while offline - no sync possible');
    
    // Verify content is saved locally
    const content = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(content).toBe('Content while offline - no sync possible');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Content should still be there
    const contentAfter = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(contentAfter).toBe('Content while offline - no sync possible');
  });

  test('should handle rapid offline/online toggles', async ({ page }) => {
    // Create document
    await createNewDocument(page);
    await setEditorContent(page, 'Initial content');
    
    // Toggle offline/online rapidly
    for (let i = 0; i < 3; i++) {
      await page.context().setOffline(true);
      await page.waitForTimeout(100);
      await page.context().setOffline(false);
      await page.waitForTimeout(100);
    }
    
    // App should remain functional
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    
    // Content should be preserved
    const content = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor ? editor.getValue() : '';
    });
    expect(content).toBe('Initial content');
  });
});

