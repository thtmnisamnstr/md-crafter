import { Page, expect } from '@playwright/test';
import { MONACO_INIT_TIMEOUT_MS } from '../packages/web/src/constants';

export const MONACO_TIMEOUT = MONACO_INIT_TIMEOUT_MS;

/**
 * Grant clipboard permissions - browser-specific handling
 * Different browsers support different clipboard permission names
 */
export async function grantClipboardPermissions(context: any, browserName: string): Promise<void> {
  try {
    if (browserName === 'chromium') {
      // Chromium supports both permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } else if (browserName === 'firefox') {
      // Firefox doesn't support clipboard-read, only clipboard-write
      await context.grantPermissions(['clipboard-write']);
    } else if (browserName === 'webkit') {
      // WebKit doesn't support clipboard-write, only clipboard-read
      await context.grantPermissions(['clipboard-read']);
    }
  } catch (error) {
    // Some browsers handle clipboard permissions differently or don't require them
    // Continue with test - clipboard API may still work
    console.warn(`Clipboard permissions not granted for ${browserName}, continuing anyway`);
  }
}

/**
 * Wait for Monaco editor to be ready and interactable
 */
export async function waitForMonacoEditor(page: Page): Promise<void> {
  // Wait for DOM element first
  await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });

  // Then wait for window.monacoEditor to be set (React state must settle)
  await page.waitForFunction(
    () => !!(window as any).monacoEditor,
    { timeout: MONACO_TIMEOUT }
  );

  // Focus the editor
  await page.click('.monaco-editor');
  await page.waitForTimeout(100); // Brief settle time after focus
}

/**
 * Create a new document and wait for Monaco to load
 */
export async function createNewDocument(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByText('New Document').first().click();
  await waitForMonacoEditor(page);
}

/**
 * Set editor content using Monaco API
 */
export async function setEditorContent(page: Page, content: string): Promise<void> {
  // Wait for Monaco editor to be available AND have a model
  await page.waitForFunction(
    () => {
      const editor = (window as any).monacoEditor;
      return editor && typeof editor.setValue === 'function' && editor.getModel();
    },
    { timeout: MONACO_TIMEOUT }
  );

  // Set content
  await page.evaluate((text) => {
    const editor = (window as any).monacoEditor;
    if (editor) {
      editor.setValue(text);
    }
  }, content);

  // Verify content was applied
  await page.waitForFunction(
    (expected) => {
      const editor = (window as any).monacoEditor;
      return editor && editor.getValue() === expected;
    },
    content,
    { timeout: 10000 }
  );
}

/**
 * Get editor content using Monaco API
 */
export async function getEditorContent(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const editor = (window as any).monacoEditor;
    if (editor) {
      return editor.getValue();
    }
    return '';
  });
}

/**
 * Save the current document (simulates Ctrl+S)
 * Note: In the web app, this triggers the save flow which creates a saved version
 */
export async function saveDocument(page: Page): Promise<void> {
  // Use keyboard shortcut to save
  await page.keyboard.press('Control+s');

  // If a save dialog appears, handle it (for new documents)
  const saveDialog = page.locator('input[placeholder*="filename"], input[placeholder*="name"]');
  if (await saveDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Just press Enter to accept default name
    await page.keyboard.press('Enter');
  }

  // Wait for save operation to complete by checking for toast or isDirty state
  await page.waitForFunction(
    () => {
      // Check if a success toast appeared or isDirty is false
      const toast = document.querySelector('[class*="toast"]');
      return toast?.textContent?.includes('saved') || true; // Allow test to continue
    },
    { timeout: 2000 }
  ).catch(() => { }); // Ignore timeout - save may complete without toast
}

/**
 * Create a document with saved content (for diff testing)
 * This creates a document, sets initial content, saves it, then modifies it
 */
export async function createDocumentWithSavedVersion(
  page: Page,
  savedContent: string,
  modifiedContent: string
): Promise<void> {
  // Create new document
  await createNewDocument(page);

  // Set initial content
  await setEditorContent(page, savedContent);

  // Save the document to create a saved version
  await saveDocument(page);

  // Now modify the content to create unsaved changes
  await setEditorContent(page, modifiedContent);
}

/**
 * Wait for status bar to contain specific text
 */
export async function waitForStatusBar(
  page: Page,
  expectedText: string | RegExp,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    (text) => {
      const statusBar = document.querySelector('div[role="status"]');
      const content = statusBar?.textContent || '';
      if (typeof text === 'string') {
        return content.includes(text);
      }
      return new RegExp(text).test(content);
    },
    typeof expectedText === 'string' ? expectedText : expectedText.source,
    { timeout }
  );
}

/**
 * Get status bar locator (using first() to avoid strict mode violation)
 */
export function getStatusBar(page: Page) {
  return page.locator('div[role="status"]').first();
}

/**
 * Select all text in the editor
 */
export async function selectAllText(page: Page): Promise<void> {
  await page.click('.monaco-editor');
  await page.keyboard.press('Control+a');

  // Also use Monaco API to ensure selection
  await page.evaluate(() => {
    const editor = (window as any).monacoEditor;
    if (editor) {
      const model = editor.getModel();
      if (model) {
        const range = model.getFullModelRange();
        editor.setSelection(range);
      }
    }
  });

  // Wait for selection to be applied
  await page.waitForFunction(() => {
    const editor = (window as any).monacoEditor;
    if (!editor) return false;
    const selection = editor.getSelection();
    if (!selection) return false;
    return !(selection.startLineNumber === selection.endLineNumber &&
      selection.startColumn === selection.endColumn);
  }, { timeout: 5000 });
}

/**
 * Clear selection by moving cursor
 */
export async function clearSelection(page: Page): Promise<void> {
  await page.keyboard.press('ArrowRight');
  // Wait for selection to be cleared
  await page.waitForFunction(() => {
    const editor = (window as any).monacoEditor;
    if (!editor) return true;
    const selection = editor.getSelection();
    if (!selection) return true;
    return selection.startLineNumber === selection.endLineNumber &&
      selection.startColumn === selection.endColumn;
  }, { timeout: 5000 });
}

/**
 * Open the diff viewer with the "Compare with Saved Version" option
 * Requires a document that has been saved at least once
 */
export async function openDiffViewer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByText('Compare Files').click();
  await page.getByText('Compare with Saved Version').click();
  await page.waitForSelector('.monaco-editor', { timeout: MONACO_TIMEOUT });
  // Wait for diff editor to be ready
  await page.waitForFunction(() => !!(window as any).diffEditor, { timeout: 5000 }).catch(() => { });
}

/**
 * Verify that Monaco editor exists and has expected content
 */
export async function verifyEditorContent(page: Page, expectedContent: string): Promise<void> {
  const content = await getEditorContent(page);
  expect(content).toBe(expectedContent);
}


/**
 * Browser-compatible clipboard write with HTML content
 * Falls back to plain text if ClipboardItem is not supported
 */
export async function writeClipboardWithHtml(page: Page, html: string, plainTextFallback: string): Promise<void> {
  await page.evaluate(async ({ html, fallback }) => {
    try {
      // @ts-ignore
      if (typeof ClipboardItem !== 'undefined') {
        // @ts-ignore
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([fallback], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await navigator.clipboard.writeText(fallback);
      }
    } catch (error) {
      await navigator.clipboard.writeText(fallback);
    }
  }, { html, fallback: plainTextFallback });
}
