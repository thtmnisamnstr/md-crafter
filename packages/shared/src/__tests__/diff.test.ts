import { describe, it, expect } from 'vitest';
import { diffLines, hasChanges, getChangeSummary } from '../utils/diff';

describe('diffLines', () => {
  it('should return no changes for identical content', () => {
    const text = 'line1\nline2\nline3';
    const result = diffLines(text, text);

    expect(result.hasChanges).toBe(false);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.lines.every((line) => line.type === 'equal')).toBe(true);
  });

  it('should detect insertions', () => {
    const oldText = 'line1\nline2';
    const newText = 'line1\nline2\nline3';
    const result = diffLines(oldText, newText);

    expect(result.hasChanges).toBe(true);
    expect(result.insertions).toBe(1);
    expect(result.deletions).toBe(0);
  });

  it('should detect deletions', () => {
    const oldText = 'line1\nline2\nline3';
    const newText = 'line1\nline2';
    const result = diffLines(oldText, newText);

    expect(result.hasChanges).toBe(true);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(1);
  });

  it('should detect modifications (as delete + insert)', () => {
    const oldText = 'line1\nold line\nline3';
    const newText = 'line1\nnew line\nline3';
    const result = diffLines(oldText, newText);

    expect(result.hasChanges).toBe(true);
    expect(result.insertions).toBe(1);
    expect(result.deletions).toBe(1);
  });

  it('should handle empty old text', () => {
    const result = diffLines('', 'line1\nline2');

    expect(result.hasChanges).toBe(true);
    // Empty string splits to [''], so we have 1 deletion + 2 insertions
    expect(result.insertions).toBeGreaterThan(0);
  });

  it('should handle empty new text', () => {
    const result = diffLines('line1\nline2', '');

    expect(result.hasChanges).toBe(true);
    // Empty string splits to [''], so we have 2 deletions + 1 insertion  
    expect(result.deletions).toBeGreaterThan(0);
  });

  it('should handle both texts empty', () => {
    const result = diffLines('', '');

    expect(result.hasChanges).toBe(false);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(0);
  });

  it('should include line numbers', () => {
    const oldText = 'line1\nline2';
    const newText = 'line1\nnew line\nline2';
    const result = diffLines(oldText, newText);

    const equalLine = result.lines.find((l) => l.type === 'equal' && l.content === 'line1');
    expect(equalLine?.lineNumber.left).toBe(1);
    expect(equalLine?.lineNumber.right).toBe(1);
  });

  it('should handle complex changes', () => {
    const oldText = 'a\nb\nc\nd\ne';
    const newText = 'a\nx\nc\ny\ne';
    const result = diffLines(oldText, newText);

    expect(result.hasChanges).toBe(true);
    expect(result.insertions).toBe(2);
    expect(result.deletions).toBe(2);
  });
});

describe('hasChanges', () => {
  it('should return false for identical strings', () => {
    expect(hasChanges('hello', 'hello')).toBe(false);
  });

  it('should return true for different strings', () => {
    expect(hasChanges('hello', 'world')).toBe(true);
  });

  it('should return false for empty strings', () => {
    expect(hasChanges('', '')).toBe(false);
  });

  it('should be case sensitive', () => {
    expect(hasChanges('Hello', 'hello')).toBe(true);
  });

  it('should detect whitespace differences', () => {
    expect(hasChanges('hello', 'hello ')).toBe(true);
  });
});

describe('getChangeSummary', () => {
  it('should return "No changes" for identical content', () => {
    const text = 'line1\nline2';
    expect(getChangeSummary(text, text)).toBe('No changes');
  });

  it('should format insertions correctly (singular)', () => {
    expect(getChangeSummary('line1', 'line1\nline2')).toBe('+1 line');
  });

  it('should format insertions correctly (plural)', () => {
    expect(getChangeSummary('line1', 'line1\nline2\nline3')).toBe('+2 lines');
  });

  it('should format deletions correctly (singular)', () => {
    expect(getChangeSummary('line1\nline2', 'line1')).toBe('-1 line');
  });

  it('should format deletions correctly (plural)', () => {
    expect(getChangeSummary('line1\nline2\nline3', 'line1')).toBe('-2 lines');
  });

  it('should format both insertions and deletions', () => {
    expect(getChangeSummary('line1\nold', 'new\nline1')).toBe('+1 line, -1 line');
  });
});

