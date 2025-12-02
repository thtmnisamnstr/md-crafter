/**
 * Simple diff utilities for comparing document content
 * For complex diffing, Monaco's built-in diff editor is used
 */

export interface DiffLine {
  type: 'equal' | 'insert' | 'delete';
  content: string;
  lineNumber: {
    left?: number;
    right?: number;
  };
}

export interface DiffResult {
  lines: DiffLine[];
  hasChanges: boolean;
  insertions: number;
  deletions: number;
}

/**
 * Simple line-by-line diff algorithm
 * For character-level diff, use Monaco's diff editor
 */
export function diffLines(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result: DiffLine[] = [];
  let insertions = 0;
  let deletions = 0;
  
  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(oldLines, newLines);
  
  let oldIndex = 0;
  let newIndex = 0;
  let leftLineNum = 1;
  let rightLineNum = 1;
  
  for (const match of lcs) {
    // Add deletions (lines in old but not in common)
    while (oldIndex < match.oldIndex) {
      result.push({
        type: 'delete',
        content: oldLines[oldIndex],
        lineNumber: { left: leftLineNum++ },
      });
      deletions++;
      oldIndex++;
    }
    
    // Add insertions (lines in new but not in common)
    while (newIndex < match.newIndex) {
      result.push({
        type: 'insert',
        content: newLines[newIndex],
        lineNumber: { right: rightLineNum++ },
      });
      insertions++;
      newIndex++;
    }
    
    // Add equal line
    result.push({
      type: 'equal',
      content: oldLines[oldIndex],
      lineNumber: { left: leftLineNum++, right: rightLineNum++ },
    });
    
    oldIndex++;
    newIndex++;
  }
  
  // Handle remaining lines
  while (oldIndex < oldLines.length) {
    result.push({
      type: 'delete',
      content: oldLines[oldIndex],
      lineNumber: { left: leftLineNum++ },
    });
    deletions++;
    oldIndex++;
  }
  
  while (newIndex < newLines.length) {
    result.push({
      type: 'insert',
      content: newLines[newIndex],
      lineNumber: { right: rightLineNum++ },
    });
    insertions++;
    newIndex++;
  }
  
  return {
    lines: result,
    hasChanges: insertions > 0 || deletions > 0,
    insertions,
    deletions,
  };
}

interface LCSMatch {
  oldIndex: number;
  newIndex: number;
}

function longestCommonSubsequence(oldLines: string[], newLines: string[]): LCSMatch[] {
  const m = oldLines.length;
  const n = newLines.length;
  
  // Build LCS length table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find the actual LCS
  const result: LCSMatch[] = [];
  let i = m;
  let j = n;
  
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return result;
}

/**
 * Check if two strings have any differences
 */
export function hasChanges(oldText: string, newText: string): boolean {
  return oldText !== newText;
}

/**
 * Get a summary of changes between two texts
 */
export function getChangeSummary(oldText: string, newText: string): string {
  const diff = diffLines(oldText, newText);
  
  if (!diff.hasChanges) {
    return 'No changes';
  }
  
  const parts: string[] = [];
  if (diff.insertions > 0) {
    parts.push(`+${diff.insertions} line${diff.insertions !== 1 ? 's' : ''}`);
  }
  if (diff.deletions > 0) {
    parts.push(`-${diff.deletions} line${diff.deletions !== 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
}

