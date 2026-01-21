import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver } from '../sync/ConflictResolver.js';
import { ConflictInfo } from '../types/sync.js';

describe('ConflictResolver', () => {
    let resolver: ConflictResolver;

    beforeEach(() => {
        resolver = new ConflictResolver();
    });

    describe('attemptAutoMerge', () => {
        it('should merge when local changes and remote is same as base', () => {
            const conflict: ConflictInfo = {
                documentId: 'doc1',
                baseContent: 'Line 1\nLine 2\nLine 3',
                localContent: 'Line 1\nLine 2 changed\nLine 3',
                remoteContent: 'Line 1\nLine 2\nLine 3',
                localTimestamp: Date.now(),
                remoteTimestamp: Date.now(),
            };

            const result = resolver.attemptAutoMerge(conflict);
            expect(result).toBe('Line 1\nLine 2 changed\nLine 3');
        });

        it('should merge when remote changes and local is same as base', () => {
            const conflict: ConflictInfo = {
                documentId: 'doc1',
                baseContent: 'Line 1\nLine 2\nLine 3',
                localContent: 'Line 1\nLine 2\nLine 3',
                remoteContent: 'Line 1\nLine 2 remote changed\nLine 3',
                localTimestamp: Date.now(),
                remoteTimestamp: Date.now(),
            };

            const result = resolver.attemptAutoMerge(conflict);
            expect(result).toBe('Line 1\nLine 2 remote changed\nLine 3');
        });

        it('should merge non-overlapping changes', () => {
            const conflict: ConflictInfo = {
                documentId: 'doc1',
                baseContent: 'Line 1\nLine 2\nLine 3',
                localContent: 'Line 1 changed\nLine 2\nLine 3',
                remoteContent: 'Line 1\nLine 2\nLine 3 changed',
                localTimestamp: Date.now(),
                remoteTimestamp: Date.now(),
            };

            const result = resolver.attemptAutoMerge(conflict);
            expect(result).toBe('Line 1 changed\nLine 2\nLine 3 changed');
        });

        it('should detect conflict on overlapping changes', () => {
            const conflict: ConflictInfo = {
                documentId: 'doc1',
                baseContent: 'Line 1\nLine 2\nLine 3',
                localContent: 'Line 1\nLine 2 local\nLine 3',
                remoteContent: 'Line 1\nLine 2 remote\nLine 3',
                localTimestamp: Date.now(),
                remoteTimestamp: Date.now(),
            };

            const result = resolver.attemptAutoMerge(conflict);
            expect(result).toBeNull();
        });

        it('should handle insertions correctly (the shifted index problem)', () => {
            const conflict: ConflictInfo = {
                documentId: 'doc1',
                baseContent: 'Line 1\nLine 2',
                localContent: 'Line 0\nLine 1\nLine 2', // Insertion at top
                remoteContent: 'Line 1\nLine 2 changed', // Modification at bottom
                localTimestamp: Date.now(),
                remoteTimestamp: Date.now(),
            };

            // Naive implementation will see:
            // Index 0: base='Line 1', local='Line 0', remote='Line 1' -> result='Line 0' (wrong, remote was same as base)
            // Index 1: base='Line 2', local='Line 1', remote='Line 2 changed' -> CONFLICT (wrong)

            const result = resolver.attemptAutoMerge(conflict);
            // Expected: 'Line 0\nLine 1\nLine 2 changed'
            expect(result).toBe('Line 0\nLine 1\nLine 2 changed');
        });
    });
});
