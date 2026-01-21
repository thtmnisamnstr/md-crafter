import { test, expect } from '@playwright/test';
import { MONACO_INIT_TIMEOUT_MS } from '../packages/web/src/constants';
import { grantClipboardPermissions, writeClipboardWithHtml } from './helpers';

const MONACO_TIMEOUT = MONACO_INIT_TIMEOUT_MS;

test.describe('Paste Functionality - Replacement', () => {
  // Skip Firefox/Webkit due to clipboard permission issues
  test.skip(({ browserName }) => browserName === 'firefox' || browserName === 'webkit', 'Clipboard permissions issues');

  test.beforeEach(async ({ page, context, browserName }) => {
    // Grant clipboard permissions
    await grantClipboardPermissions(context, browserName);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Create a document first so Monaco exists
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByText('New Document').first().click();
    await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
    // Ensure editor is focused
    await page.click('.monaco-editor');
    await page.waitForTimeout(200);
  });

  test('should replace selected text when pasting from Word/Docs', async ({ page, browserName }) => {
    const initialText = 'Text to be replaced';
    const pasteText = 'Pasted content';
    const htmlContent = '<p>Pasted content</p>';

    // Set initial content
    await page.evaluate((text) => {
      const editor = (window as any).monacoEditor;
      if (editor) {
        editor.setValue(text);
      }
    }, initialText);
    await page.waitForTimeout(200);

    // Write to clipboard using shared helper
    await writeClipboardWithHtml(page, htmlContent, pasteText);
    await page.waitForTimeout(200);

    // Select all text ensuring editor is focused right before pasting
    await page.click('.monaco-editor');
    await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      if (editor) {
        const model = editor.getModel();
        const fullRange = model.getFullModelRange();
        editor.setSelection(fullRange);
      }
    });
    // Short wait for selection to apply
    await page.waitForTimeout(50);


    // Trigger the "Paste from Word/Docs" action
    // We can trigger it via command palette or shortcut. Shortcut is easier.
    // Ctrl+Shift+V
    await page.keyboard.press('Control+Shift+V');

    // Wait for the paste to happen (it's async)
    await page.waitForTimeout(1000);

    // Verify content
    const editorContent = await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      return editor?.getValue() || '';
    });

    // Expectation: The content should be EXACTLY "Pasted content"
    // If it failed (bug), it would be "Text to be replacedPasted content" or similar
    expect(editorContent.trim()).toBe(pasteText);
  });
});
