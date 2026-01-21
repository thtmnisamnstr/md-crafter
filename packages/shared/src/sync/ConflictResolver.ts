import { ConflictInfo, ConflictResolution } from '../types/sync.js';
import { diffLines, DiffResult, DiffLine } from '../utils/diff.js';

export class ConflictResolver {
  /**
   * Analyze a conflict and provide diff information
   */
  analyzeConflict(conflict: ConflictInfo): DiffResult {
    return diffLines(conflict.localContent, conflict.remoteContent);
  }

  /**
   * Attempt automatic merge if possible
   * Returns null if merge is not possible (conflicts exist)
   */
  attemptAutoMerge(conflict: ConflictInfo): string | null {
    // If we have a base content, we can try three-way merge
    if (conflict.baseContent) {
      return this.threeWayMerge(
        conflict.baseContent,
        conflict.localContent,
        conflict.remoteContent
      );
    }

    // Without base content, we can only merge if one side hasn't changed
    if (conflict.localContent === conflict.remoteContent) {
      return conflict.localContent;
    }

    return null;
  }

  /**
   * Robust three-way merge
   * Uses diff information relative to the base to identify and combine changes.
   * Returns null if there are actual conflicts that need manual resolution.
   */
  private threeWayMerge(base: string, local: string, remote: string): string | null {
    const diffLocal = diffLines(base, local).lines;
    const diffRemote = diffLines(base, remote).lines;
    const baseLines = base.split('\n');

    return this.applyThreeWayMerge(baseLines, diffLocal, diffRemote);
  }

  private applyThreeWayMerge(baseLines: string[], diffLocal: DiffLine[], diffRemote: DiffLine[]): string | null {
    const baseCount = baseLines.length;

    // Transform diffs into a map of [baseIndex] -> { status, inserts }
    // baseIndex 0..baseCount-1 are the lines, baseCount is the virtual index after the last line
    const getChangeMap = (diffs: DiffLine[]) => {
      const map = new Map<number, { status: 'ok' | 'deleted', inserts: string[] }>();
      for (let i = 0; i <= baseCount; i++) {
        map.set(i, { status: 'ok', inserts: [] });
      }

      let lastBaseIdx = -1;
      for (const d of diffs) {
        if (d.type === 'equal') {
          lastBaseIdx = (d.lineNumber.left as number) - 1;
        } else if (d.type === 'delete') {
          lastBaseIdx = (d.lineNumber.left as number) - 1;
          map.get(lastBaseIdx)!.status = 'deleted';
        } else if (d.type === 'insert') {
          // Insertions are grouped into the slot immediately following the last seen base line
          const targetIdx = lastBaseIdx + 1;
          map.get(targetIdx)!.inserts.push(d.content);
        }
      }
      return map;
    };

    const localMap = getChangeMap(diffLocal);
    const remoteMap = getChangeMap(diffRemote);

    const mergedLines: string[] = [];
    let hasConflict = false;

    for (let i = 0; i <= baseCount; i++) {
      const local = localMap.get(i)!;
      const remote = remoteMap.get(i)!;

      // 1. Handle insertions before/at this index
      if (local.inserts.length > 0 || remote.inserts.length > 0) {
        if (local.inserts.join('\n') === remote.inserts.join('\n')) {
          mergedLines.push(...local.inserts);
        } else if (local.inserts.length > 0 && remote.inserts.length === 0) {
          mergedLines.push(...local.inserts);
        } else if (remote.inserts.length > 0 && local.inserts.length === 0) {
          mergedLines.push(...remote.inserts);
        } else {
          hasConflict = true;
          break;
        }
      }

      // 2. Handle the base line itself
      if (i < baseCount) {
        if (local.status === 'ok' && remote.status === 'ok') {
          mergedLines.push(baseLines[i]);
        } else if (local.status === 'deleted' && remote.status === 'ok') {
          // Deletion wins
        } else if (remote.status === 'deleted' && local.status === 'ok') {
          // Deletion wins
        } else if (local.status === 'deleted' && remote.status === 'deleted') {
          // Both deleted
        } else {
          hasConflict = true;
          break;
        }
      }
    }

    return hasConflict ? null : mergedLines.join('\n');
  }


  /**
   * Apply a conflict resolution
   */
  resolveConflict(conflict: ConflictInfo, resolution: ConflictResolution): string {
    switch (resolution.resolution) {
      case 'keep_local':
        return conflict.localContent;
      case 'keep_remote':
        return conflict.remoteContent;
      case 'merge':
        if (resolution.mergedContent) {
          return resolution.mergedContent;
        }
        throw new Error('Merge resolution requires mergedContent');
      default:
        throw new Error(`Unknown resolution type: ${resolution.resolution}`);
    }
  }

  /**
   * Generate conflict markers for manual resolution
   */
  generateConflictMarkers(conflict: ConflictInfo): string {
    const lines: string[] = [];

    lines.push('<<<<<<< LOCAL');
    lines.push(conflict.localContent);
    lines.push('=======');
    lines.push(conflict.remoteContent);
    lines.push('>>>>>>> REMOTE');

    return lines.join('\n');
  }

  /**
   * Parse content with conflict markers and extract sections
   */
  parseConflictMarkers(content: string): {
    hasMarkers: boolean;
    sections: Array<{ type: 'normal' | 'local' | 'remote'; content: string }>;
  } {
    const lines = content.split('\n');
    const sections: Array<{ type: 'normal' | 'local' | 'remote'; content: string }> = [];
    let currentSection: string[] = [];
    let currentType: 'normal' | 'local' | 'remote' = 'normal';
    let hasMarkers = false;

    for (const line of lines) {
      if (line.startsWith('<<<<<<< ')) {
        hasMarkers = true;
        if (currentSection.length > 0) {
          sections.push({ type: currentType, content: currentSection.join('\n') });
        }
        currentSection = [];
        currentType = 'local';
      } else if (line === '=======') {
        sections.push({ type: currentType, content: currentSection.join('\n') });
        currentSection = [];
        currentType = 'remote';
      } else if (line.startsWith('>>>>>>> ')) {
        sections.push({ type: currentType, content: currentSection.join('\n') });
        currentSection = [];
        currentType = 'normal';
      } else {
        currentSection.push(line);
      }
    }

    if (currentSection.length > 0) {
      sections.push({ type: currentType, content: currentSection.join('\n') });
    }

    return { hasMarkers, sections };
  }
}

