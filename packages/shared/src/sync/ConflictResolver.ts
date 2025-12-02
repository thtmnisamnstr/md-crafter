import { ConflictInfo, ConflictResolution } from '../types/sync';
import { diffLines, DiffResult } from '../utils/diff';

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
   * Simple three-way merge
   * Returns null if there are actual conflicts that need manual resolution
   */
  private threeWayMerge(base: string, local: string, remote: string): string | null {
    const baseLines = base.split('\n');
    const localLines = local.split('\n');
    const remoteLines = remote.split('\n');
    
    const result: string[] = [];
    let hasConflict = false;
    
    const maxLen = Math.max(baseLines.length, localLines.length, remoteLines.length);
    
    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i] ?? '';
      const localLine = localLines[i] ?? '';
      const remoteLine = remoteLines[i] ?? '';
      
      if (localLine === remoteLine) {
        // Both agree, use either
        result.push(localLine);
      } else if (localLine === baseLine) {
        // Local unchanged, use remote
        result.push(remoteLine);
      } else if (remoteLine === baseLine) {
        // Remote unchanged, use local
        result.push(localLine);
      } else {
        // Both changed differently - conflict
        hasConflict = true;
        break;
      }
    }
    
    return hasConflict ? null : result.join('\n');
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

