import { useMemo } from 'react';
import { useStore } from '../store';
import { X, Check, CornerUpLeft, CornerUpRight } from 'lucide-react';

function applyFixToContent(content: string, fix: { range: [number, number]; text: string }): string {
  const [start, end] = fix.range;
  return content.slice(0, start) + fix.text + content.slice(end);
}

export function GrammarReviewModal() {
  const {
    grammarIssues,
    grammarIssueIndex,
    grammarIssueCount,
    closeGrammarReview,
    setGrammarIssueIndex,
    tabs,
    activeTabId,
    updateTabContent,
    grammarError,
  } = useStore();

  const issue = grammarIssues[grammarIssueIndex];
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const hasPrev = grammarIssueIndex > 0;
  const hasNext = grammarIssues.length > 0 && grammarIssueIndex < grammarIssues.length - 1;

  const preview = useMemo(() => {
    if (!issue || !activeTab) return { before: '', selection: '', after: '' };
    const modelText = activeTab.content;
    const startOffset = issue.fix?.range?.[0] ?? 0;
    const endOffset = issue.fix?.range?.[1] ?? 0;
    const before = modelText.slice(Math.max(0, startOffset - 40), startOffset);
    const selection = modelText.slice(startOffset, endOffset || startOffset + (issue.length || 0));
    const after = modelText.slice(endOffset || startOffset, (endOffset || startOffset) + 40);
    return { before, selection, after };
  }, [issue, activeTab]);

  if (!issue) {
    return (
      <div className="modal-overlay" onClick={closeGrammarReview}>
        <div
          className="modal max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
          style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        >
          <div className="modal-header flex items-center justify-between">
            <h2 className="text-lg font-semibold">Grammar Review</h2>
            <button onClick={closeGrammarReview} className="p-1 rounded hover:bg-sidebar-hover">
              <X size={18} />
            </button>
          </div>
          <div className="modal-body text-sm opacity-80">
            {grammarError
              ? `Grammar check failed: ${grammarError}`
              : grammarIssueCount === 0
                ? 'No grammar issues found.'
                : 'No issue selected.'}
          </div>
          <div className="modal-footer">
            <button onClick={closeGrammarReview} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const applyFix = () => {
    if (!issue.fix || !activeTab) {
      // No fix, just move on
      goNext();
      return;
    }
    const newContent = applyFixToContent(activeTab.content, issue.fix);
    // Reset cursor since grammar fix may change line positions
    updateTabContent(activeTab.id, newContent, { resetCursor: true });
    goNext();
  };

  const goNext = () => {
    if (hasNext) {
      setGrammarIssueIndex(grammarIssueIndex + 1);
    } else {
      closeGrammarReview();
    }
  };

  const goPrev = () => {
    if (hasPrev) {
      setGrammarIssueIndex(grammarIssueIndex - 1);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeGrammarReview}>
      <div
        className="modal max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
      >
        <div className="modal-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Grammar Review</h2>
            <span className="text-xs opacity-70">
              {grammarIssueIndex + 1} / {grammarIssues.length}
            </span>
          </div>
          <button onClick={closeGrammarReview} className="p-1 rounded hover:bg-sidebar-hover">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-3">
          <div className="text-sm opacity-80">
            <strong>{issue.ruleId || 'Issue'}</strong>: {issue.message}
          </div>
          <div className="text-sm opacity-60">
            Line {issue.line ?? '?'} • Column {issue.column ?? '?'}
          </div>
          <div className="bg-editor-bg border border-tab-border rounded p-3 text-sm">
            <span className="opacity-60">{preview.before}</span>
            <span className="bg-editor-accent/30 px-1 rounded">{preview.selection}</span>
            <span className="opacity-60">{preview.after}</span>
          </div>
        </div>

        <div className="modal-footer flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              className="btn btn-ghost flex items-center gap-1 disabled:opacity-50"
            >
              <CornerUpLeft size={14} />
              Prev
            </button>
            <button
              onClick={goNext}
              disabled={!hasNext}
              className="btn btn-ghost flex items-center gap-1 disabled:opacity-50"
            >
              Next
              <CornerUpRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goNext}
              className="btn btn-ghost"
              title="Ignore and continue"
            >
              Ignore
            </button>
            <button
              onClick={applyFix}
              className="btn btn-primary flex items-center gap-1"
              disabled={!issue.fix}
              title={issue.fix ? 'Apply fix' : 'No automatic fix available'}
            >
              <Check size={14} />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
