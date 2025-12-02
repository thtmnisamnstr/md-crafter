import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { X, ArrowLeft, ArrowRight, GitMerge } from 'lucide-react';
import { diffLines } from '@md-edit/shared';

export function ConflictModal() {
  const { conflict, resolveConflict, setConflict } = useStore();
  const [mergedContent, setMergedContent] = useState('');
  const [showMerge, setShowMerge] = useState(false);

  const diff = useMemo(() => {
    if (!conflict) return null;
    return diffLines(conflict.localContent, conflict.remoteContent);
  }, [conflict]);

  if (!conflict) return null;

  const handleKeepLocal = () => {
    resolveConflict('keep_local');
  };

  const handleKeepRemote = () => {
    resolveConflict('keep_remote');
  };

  const handleMerge = () => {
    if (showMerge) {
      resolveConflict('merge', mergedContent);
    } else {
      // Initialize merge content with local content
      setMergedContent(conflict.localContent);
      setShowMerge(true);
    }
  };

  const DiffView = () => (
    <div className="flex gap-4 h-[400px]">
      {/* Local version */}
      <div className="flex-1 flex flex-col border border-tab-border rounded overflow-hidden">
        <div className="px-3 py-2 bg-sidebar-bg border-b border-tab-border text-sm font-medium flex items-center gap-2">
          <span className="text-yellow-400">●</span>
          Local Changes
        </div>
        <pre 
          className="flex-1 p-3 overflow-auto text-sm font-mono whitespace-pre-wrap"
          style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
        >
          {conflict.localContent}
        </pre>
      </div>

      {/* Remote version */}
      <div className="flex-1 flex flex-col border border-tab-border rounded overflow-hidden">
        <div className="px-3 py-2 bg-sidebar-bg border-b border-tab-border text-sm font-medium flex items-center gap-2">
          <span className="text-blue-400">●</span>
          Cloud Version
        </div>
        <pre 
          className="flex-1 p-3 overflow-auto text-sm font-mono whitespace-pre-wrap"
          style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
        >
          {conflict.remoteContent}
        </pre>
      </div>
    </div>
  );

  const MergeEditor = () => (
    <div className="h-[400px] flex flex-col border border-tab-border rounded overflow-hidden">
      <div className="px-3 py-2 bg-sidebar-bg border-b border-tab-border text-sm font-medium flex items-center gap-2">
        <GitMerge size={14} />
        Merged Result
      </div>
      <textarea
        value={mergedContent}
        onChange={(e) => setMergedContent(e.target.value)}
        className="flex-1 p-3 font-mono text-sm resize-none outline-none"
        style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
        spellCheck={false}
      />
    </div>
  );

  return (
    <div className="modal-overlay">
      <div 
        className="bg-sidebar-bg border border-tab-border rounded-lg shadow-2xl w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-tab-border">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
              Sync Conflict Detected
            </h2>
            <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
              The document has been modified both locally and in the cloud.
            </p>
          </div>
          <button
            onClick={() => setConflict(null)}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {/* Summary */}
          {diff && (
            <div className="mb-4 flex gap-4 text-sm">
              <span className="text-green-400">
                +{diff.insertions} additions
              </span>
              <span className="text-red-400">
                -{diff.deletions} deletions
              </span>
            </div>
          )}

          {/* Content */}
          {showMerge ? <MergeEditor /> : <DiffView />}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-tab-border">
          <div className="text-xs opacity-50" style={{ color: 'var(--editor-fg)' }}>
            Choose how to resolve this conflict
          </div>
          
          <div className="flex gap-2">
            {showMerge && (
              <button
                onClick={() => setShowMerge(false)}
                className="btn btn-ghost"
              >
                Back to Compare
              </button>
            )}
            
            <button
              onClick={handleKeepLocal}
              className="btn btn-ghost flex items-center gap-2"
            >
              <ArrowLeft size={14} />
              Keep Local
            </button>
            
            <button
              onClick={handleKeepRemote}
              className="btn btn-ghost flex items-center gap-2"
            >
              <ArrowRight size={14} />
              Keep Cloud
            </button>
            
            <button
              onClick={handleMerge}
              className="btn btn-primary flex items-center gap-2"
            >
              <GitMerge size={14} />
              {showMerge ? 'Save Merge' : 'Manual Merge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

