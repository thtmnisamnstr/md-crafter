import { test, expect, Page } from '@playwright/test';
import { createNewDocument, grantClipboardPermissions, writeClipboardWithHtml } from './helpers';

async function renameTab(page: Page, index: number, title: string): Promise<void> {
  const tab = page.locator('[role="tab"]').nth(index);
  await tab.click();
  await tab.focus();
  await page.keyboard.press('F2');
  const input = tab.locator('input');
  if (!(await input.isVisible().catch(() => false))) {
    await tab.dblclick();
  }
  await expect(input).toBeVisible();
  await input.fill(title);
  await input.press('Enter');
  await expect(tab).toContainText(title);
}

async function tabOrder(page: Page): Promise<string[]> {
  return page.locator('[role="tab"]').evaluateAll((elements) => {
    return elements.map((el) => {
      const aria = el.getAttribute('aria-label') || '';
      return aria.replace(/\s+\(.*$/, '').trim();
    });
  });
}

test.describe('Remediation Regression', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    await grantClipboardPermissions(context, browserName);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('paste from Word/Docs is undone by one Ctrl/Cmd+Z', async ({ page, browserName }) => {
    test.skip(
      browserName === 'firefox' || browserName === 'webkit',
      'Clipboard APIs are unstable in Firefox/WebKit automation'
    );

    await createNewDocument(page);
    await writeClipboardWithHtml(page, '<p>Pasted text</p>', 'Pasted text');
    await page.keyboard.press('Control+Shift+V');

    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toContain('Pasted text');

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');

    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe('');
  });

  test('plain paste is undone by one Ctrl/Cmd+Z and restored by redo', async ({ page, browserName }) => {
    test.skip(
      browserName === 'firefox' || browserName === 'webkit',
      'Clipboard APIs are unstable in Firefox/WebKit automation'
    );

    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    const redoShortcut = process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y';
    const pasted = 'Plain pasted text';

    await createNewDocument(page);
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, pasted);

    await page.keyboard.press(`${mod}+V`);
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe(pasted);

    await page.keyboard.press(`${mod}+Z`);
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe('');

    await page.keyboard.press(redoShortcut);
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe(pasted);
  });

  test('web Edit menu Undo/Redo applies to active editor', async ({ page, browserName }) => {
    test.skip(
      browserName === 'firefox' || browserName === 'webkit',
      'Clipboard APIs are unstable in Firefox/WebKit automation'
    );

    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    const pasted = 'Menu undo redo text';

    await createNewDocument(page);
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, pasted);
    await page.keyboard.press(`${mod}+V`);

    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe(pasted);

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: /^Undo/ }).click();

    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe('');

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: /^Redo/ }).click();

    await expect.poll(async () => {
      return page.evaluate(() => (window as any).monacoEditor?.getValue() || '');
    }).toBe(pasted);
  });

  test('dragging tabs reorders them', async ({ page }) => {
    const initialTabCount = await page.locator('[role="tab"]').count();
    await createNewDocument(page);
    await createNewDocument(page);
    await createNewDocument(page);

    await renameTab(page, initialTabCount, 'Tab A');
    await renameTab(page, initialTabCount + 1, 'Tab B');
    await renameTab(page, initialTabCount + 2, 'Tab C');

    await page
      .locator('[role="tab"]')
      .nth(initialTabCount)
      .dragTo(page.locator('[role="tab"]').nth(initialTabCount + 2));

    await expect
      .poll(async () => (await tabOrder(page)).filter((name) => ['Tab A', 'Tab B', 'Tab C'].includes(name)))
      .toEqual(['Tab B', 'Tab C', 'Tab A']);
  });

  test('Alt+Shift+Arrow reorders focused tab', async ({ page }) => {
    const initialTabCount = await page.locator('[role="tab"]').count();
    await createNewDocument(page);
    await createNewDocument(page);
    await createNewDocument(page);

    await renameTab(page, initialTabCount, 'Tab A');
    await renameTab(page, initialTabCount + 1, 'Tab B');
    await renameTab(page, initialTabCount + 2, 'Tab C');

    const secondTab = page.locator('[role="tab"]').nth(initialTabCount + 1);
    await secondTab.click();
    await secondTab.focus();
    await page.keyboard.press('Alt+Shift+ArrowLeft');

    await expect
      .poll(async () => (await tabOrder(page)).filter((name) => ['Tab A', 'Tab B', 'Tab C'].includes(name)))
      .toEqual(['Tab B', 'Tab A', 'Tab C']);
  });

  test('unsaved tab rename persists across tab switches', async ({ page }) => {
    const initialTabCount = await page.locator('[role="tab"]').count();
    await createNewDocument(page);
    await createNewDocument(page);

    await renameTab(page, initialTabCount, 'Scratch Notes');
    await page.locator('[role="tab"]').nth(initialTabCount + 1).click();
    await page.locator('[role="tab"]').nth(initialTabCount).click();

    await expect(page.locator('[role="tab"]').nth(initialTabCount)).toContainText('Scratch Notes');
  });

  test('diff typing keeps cursor position stable', async ({ page }) => {
    await createNewDocument(page);

    await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      if (!editor) return;
      const lines = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`);
      editor.setValue(lines.join('\n'));
    });
    await page.keyboard.press('Control+S');

    await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      if (!editor) return;
      const lines = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`);
      lines[4] = 'Line 5 changed';
      editor.setValue(lines.join('\n'));
    });

    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Compare Files').hover();
    await page.getByText('Compare with Saved Version').click();

    await page.waitForFunction(() => !!(window as any).diffEditor, { timeout: 5000 });
    await page.evaluate(() => {
      const diffEditor = (window as any).diffEditor;
      const modified = diffEditor?.getModifiedEditor?.();
      if (!modified) return;
      modified.setPosition({ lineNumber: 5, column: 3 });
      modified.focus();
    });

    await page.keyboard.type('abc');
    await page.waitForTimeout(400);

    const cursor = await page.evaluate(() => {
      const diffEditor = (window as any).diffEditor;
      const modified = diffEditor?.getModifiedEditor?.();
      const pos = modified?.getPosition?.();
      return pos ? { line: pos.lineNumber, column: pos.column } : null;
    });

    expect(cursor).toEqual({ line: 5, column: 6 });
  });

  test('diff typing keeps left/original pane cursor stable in file compare mode', async ({ page }) => {
    await createNewDocument(page);
    await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      if (!editor) return;
      const lines = Array.from({ length: 60 }, (_, i) => `Primary ${i + 1}`);
      editor.setValue(lines.join('\n'));
    });

    await createNewDocument(page);
    await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      if (!editor) return;
      const lines = Array.from({ length: 60 }, (_, i) => `Secondary ${i + 1}`);
      editor.setValue(lines.join('\n'));
    });

    // Make the first tab active so it becomes the left/original side in file-compare mode.
    await page.locator('[role="tab"]').first().click();

    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.getByText('Compare Files').hover();
    await page.getByText('Compare Active File with...').click();

    await page.waitForFunction(() => !!(window as any).diffEditor, { timeout: 5000 });
    await page.evaluate(() => {
      const diffEditor = (window as any).diffEditor;
      const original = diffEditor?.getOriginalEditor?.();
      if (!original) return;
      original.setPosition({ lineNumber: 5, column: 3 });
      original.focus();
    });

    await page.keyboard.type('abc');
    await page.waitForTimeout(400);

    const cursor = await page.evaluate(() => {
      const diffEditor = (window as any).diffEditor;
      const original = diffEditor?.getOriginalEditor?.();
      const pos = original?.getPosition?.();
      return pos ? { line: pos.lineNumber, column: pos.column } : null;
    });

    expect(cursor).toEqual({ line: 5, column: 6 });
  });

  test('grammar check shows user-visible issues end-to-end', async ({ page }) => {
    await createNewDocument(page);
    await page.evaluate(() => {
      const editor = (window as any).monacoEditor;
      editor?.setValue('There is alot of text in this sentence.');
    });

    await page.keyboard.press('Control+Shift+G');
    await expect(page.getByText('Grammar Review')).toBeVisible();
    await expect(page.getByText('No grammar issues found.')).not.toBeVisible();

    const markerCount = await page.evaluate(() => {
      const monaco = (window as any).monaco;
      const editor = (window as any).monacoEditor;
      const model = editor?.getModel?.();
      if (!monaco || !model) return 0;
      return monaco.editor.getModelMarkers({ resource: model.uri, owner: 'grammar' }).length;
    });
    expect(markerCount).toBeGreaterThan(0);
  });
});
