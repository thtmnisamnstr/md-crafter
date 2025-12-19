import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { Editor } from './Editor';
import { SimpleDiffEditor } from './DiffEditor';
import { X } from 'lucide-react';
import { useResize } from '../hooks/useResize';
import { useEditorContext } from '../contexts/EditorContext';

interface SplitEditorProps {
  mode: 'horizontal' | 'vertical' | 'diff';
}

export function SplitEditor({ mode }: SplitEditorProps) {
  const { tabs, activeTabId, setActiveTab, setSplitMode, setTabSplitState, setTabCursor, setTabSelection } = useStore();
  const { primaryEditor } = useEditorContext();
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [secondaryTabId, setSecondaryTabId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSide, setActiveSide] = useState<'primary' | 'secondary'>('primary');
  
  // Lock primary pane to the tab that initiated split mode
  const lockedPrimaryTabIdRef = useRef<string | null>(null);
  
  const isHorizontal = mode === 'horizontal';
  
  // Helper to persist cursor from primary editor before closing split mode
  const persistPrimaryCursor = useCallback(() => {
    const primaryId = lockedPrimaryTabIdRef.current || activeTabId;
    if (!primaryEditor || !primaryId) return;
    
    try {
      const pos = primaryEditor.getPosition();
      const selection = primaryEditor.getSelection();
      
      if (pos) {
        setTabCursor(primaryId, { line: pos.lineNumber, column: pos.column });
      }
      
      // Handle selection - clear if collapsed, save if actual selection
      if (selection) {
        const isCollapsed = selection.startLineNumber === selection.endLineNumber && 
                            selection.startColumn === selection.endColumn;
        if (isCollapsed) {
          setTabSelection(primaryId, null);
        } else {
          setTabSelection(primaryId, {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
          });
        }
      }
    } catch {
      // Editor might be disposed, ignore errors
    }
  }, [primaryEditor, activeTabId, setTabCursor, setTabSelection]);

  // Lock primary tab ID when split mode first activates
  useEffect(() => {
    if (!lockedPrimaryTabIdRef.current && activeTabId) {
      lockedPrimaryTabIdRef.current = activeTabId;
    }
  }, []); // Only run once on mount

  // Initialize secondaryTabId when split mode is enabled or tabs change
  useEffect(() => {
    const primaryId = lockedPrimaryTabIdRef.current || activeTabId;
    const activeTab = tabs.find((t) => t.id === primaryId);
    if (activeTab?.splitSecondaryTabId) {
      setSecondaryTabId(activeTab.splitSecondaryTabId);
    } else if (tabs.length > 1 && !secondaryTabId) {
      // Find first tab that's not the primary one
      const otherTab = tabs.find(t => t.id !== primaryId);
      if (otherTab) {
        setSecondaryTabId(otherTab.id);
      }
    } else if (tabs.length === 1) {
      // Only one tab - clear secondary
      setSecondaryTabId(null);
    } else if (secondaryTabId && !tabs.find(t => t.id === secondaryTabId)) {
      // Secondary tab was closed - find another one
      const otherTab = tabs.find(t => t.id !== primaryId);
      if (otherTab) {
        setSecondaryTabId(otherTab.id);
      } else {
        setSecondaryTabId(null);
      }
    }
  }, [tabs, activeTabId, secondaryTabId]);

  // Load stored split ratio per tab
  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.splitPaneRatio && activeTab.splitPaneRatio > 0 && activeTab.splitPaneRatio < 1) {
      setSplitRatio(activeTab.splitPaneRatio);
    } else {
      setSplitRatio(0.5);
    }
  }, [activeTabId, tabs]);

  // Determine which tab is shown in each pane
  // Primary is locked to the initiating document
  const primaryTabId = lockedPrimaryTabIdRef.current || activeTabId;
  const primaryTab = tabs.find((t) => t.id === primaryTabId);
  const secondaryTab = secondaryTabId 
    ? tabs.find((t) => t.id === secondaryTabId)
    : null;

  // Split resize using ratio mode
  const {
    isResizing,
    handleResizeStart,
  } = useResize({
    mode: 'ratio',
    direction: isHorizontal ? 'vertical' : 'horizontal',
    containerRef,
    min: 0.2,
    max: 0.8,
    onResize: (ratio) => {
      setSplitRatio(ratio);
      if (primaryTabId) {
        setTabSplitState(primaryTabId, { ratio });
      }
    },
  });

  const handlePrimaryClick = () => {
    setActiveSide('primary');
    // Ensure the locked primary tab remains the active tab
    if (primaryTab && activeTabId !== primaryTab.id) {
      setActiveTab(primaryTab.id);
    }
  };

  const handleSecondaryClick = () => {
    setActiveSide('secondary');
  };

  const selectSecondaryTab = (tabId: string) => {
    setSecondaryTabId(tabId);
    if (primaryTabId) {
      setTabSplitState(primaryTabId, { secondaryTabId: tabId });
    }
    setActiveSide('secondary');
    // Do not change active/primary tab when choosing secondary
  };

  // Conditionally render diff mode AFTER all hooks are called
  if (mode === 'diff') {
    return <DiffModeView />;
  }

  const flexDirection = isHorizontal ? 'flex-col' : 'flex-row';
  const resizeHandleClass = isHorizontal 
    ? 'h-1 cursor-row-resize w-full' 
    : 'w-1 cursor-col-resize h-full';

  return (
    <div 
      ref={containerRef}
      className={`flex ${flexDirection} h-full w-full overflow-hidden ${isResizing ? 'select-none' : ''}`}
    >
      {/* Primary pane */}
      <div 
        className={`flex flex-col overflow-hidden ${
          activeSide === 'primary' ? 'ring-2 ring-editor-accent/50' : ''
        }`}
        style={{
          [isHorizontal ? 'height' : 'width']: `${splitRatio * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
        }}
        onClick={handlePrimaryClick}
      >
        <div className="text-xs px-2 py-1 border-b border-tab-border flex items-center gap-2"
          style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        >
          <button
            className="p-1 rounded hover:bg-sidebar-hover flex-shrink-0"
            title="Close split view"
            onClick={(e) => {
              e.stopPropagation();
              // Persist cursor from primary editor BEFORE exiting split mode
              persistPrimaryCursor();
              setSplitMode('none');
            }}
          >
            <X size={14} />
          </button>
          <span className="font-medium opacity-70 flex-shrink-0">Primary:</span>
          <span className="opacity-70 truncate" title={primaryTab?.title}>
            {primaryTab?.title || 'No file'}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {primaryTab ? (
            <Editor tabId={primaryTab.id} registerAs="primary" autoFocus={true} />
          ) : (
            <div 
              className="flex items-center justify-center h-full text-sm opacity-50"
              style={{ color: 'var(--editor-fg)', background: 'var(--editor-bg)' }}
            >
              No file open
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className={`${resizeHandleClass} bg-tab-border hover:bg-editor-accent/50 transition-colors flex-shrink-0`}
        onMouseDown={handleResizeStart}
      />

      {/* Secondary pane */}
      <div 
        className={`flex flex-col overflow-hidden ${
          activeSide === 'secondary' ? 'ring-2 ring-editor-accent/50' : ''
        }`}
        style={{
          [isHorizontal ? 'height' : 'width']: `${(1 - splitRatio) * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
        }}
        onClick={handleSecondaryClick}
      >
        <div className="text-xs px-2 py-1 border-b border-tab-border flex items-center gap-2"
          style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        >
          <span className="font-medium opacity-70 flex-shrink-0">Secondary:</span>
          {tabs.length > 1 ? (
            <select
              className="text-xs bg-transparent border-none outline-none opacity-70 hover:opacity-100 cursor-pointer truncate"
              style={{ color: 'var(--editor-fg)' }}
              value={secondaryTabId || ''}
              onChange={(e) => {
                e.stopPropagation();
                selectSecondaryTab(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Exclude locked primary tab from secondary options */}
              {tabs.filter(t => t.id !== primaryTabId).map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="opacity-50 truncate">{secondaryTab?.title || 'No file'}</span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {secondaryTab ? (
            <SecondaryEditor key={secondaryTab.id} tabId={secondaryTab.id} />
          ) : (
            <div 
              className="flex items-center justify-center h-full text-sm opacity-50"
              style={{ color: 'var(--editor-fg)', background: 'var(--editor-bg)' }}
            >
              Open another file to view here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Diff mode view component - handles all diff mode logic
function DiffModeView() {
  const { tabs, activeTabId, diffMode, setDiffMode, exitDiffMode, setTabCursor, setTabSelection } = useStore();
  const { diffEditor: diffEditorInstance } = useEditorContext();
  const leftTab = diffMode.leftTabId ? tabs.find(t => t.id === diffMode.leftTabId) : null;
  const rightTab = diffMode.rightTabId ? tabs.find(t => t.id === diffMode.rightTabId) : null;
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  // Helper to persist cursor from modified (right) editor before exiting diff mode
  const persistDiffCursor = useCallback(() => {
    if (!diffEditorInstance || !activeTabId) return;
    
    try {
      const modifiedEditor = diffEditorInstance.getModifiedEditor();
      if (modifiedEditor) {
        const pos = modifiedEditor.getPosition();
        const selection = modifiedEditor.getSelection();
        
        if (pos) {
          setTabCursor(activeTabId, { line: pos.lineNumber, column: pos.column });
        }
        if (selection && !(selection.startLineNumber === selection.endLineNumber && selection.startColumn === selection.endColumn)) {
          setTabSelection(activeTabId, {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
          });
        }
      }
    } catch {
      // Editor might be disposed, ignore errors
    }
  }, [diffEditorInstance, activeTabId, setTabCursor, setTabSelection]);
  
  // Determine content for diff
  const { originalContent, modifiedContent, originalTitle, modifiedTitle } = useMemo(() => {
    if (diffMode.compareWithSaved && activeTab) {
      // Compare active tab with its saved version
      return {
        originalContent: activeTab.savedContent || '',
        modifiedContent: activeTab.content,
        originalTitle: `${activeTab.title} (Saved)`,
        modifiedTitle: `${activeTab.title} (Current)`,
      };
    } else if (leftTab && rightTab) {
      // Compare two tabs
      return {
        originalContent: leftTab.content,
        modifiedContent: rightTab.content,
        originalTitle: leftTab.title,
        modifiedTitle: rightTab.title,
      };
    } else if (activeTab && rightTab) {
      // Compare active tab with right tab
      return {
        originalContent: activeTab.content,
        modifiedContent: rightTab.content,
        originalTitle: activeTab.title,
        modifiedTitle: rightTab.title,
      };
    } else {
      // Fallback
      return {
        originalContent: activeTab?.content || '',
        modifiedContent: activeTab?.content || '',
        originalTitle: activeTab?.title || 'Original',
        modifiedTitle: activeTab?.title || 'Modified',
      };
    }
  }, [diffMode, leftTab, rightTab, activeTab]);
  
  const language = activeTab?.language || 'markdown';
  
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-tab-border flex-shrink-0"
        style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
      >
        <button
          onClick={() => {
            // Persist cursor from modified (right) editor BEFORE exiting diff mode
            persistDiffCursor();
            exitDiffMode();
          }}
          className="p-1 rounded hover:bg-sidebar-hover opacity-70 hover:opacity-100 transition-opacity"
          title="Exit diff view"
        >
          <X size={14} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-medium opacity-70">Diff View</span>
          <select
            className="text-xs bg-transparent border border-tab-border rounded px-2 py-0.5 opacity-70 hover:opacity-100 cursor-pointer"
            style={{ color: 'var(--editor-fg)' }}
          value={diffMode.compareWithSaved ? 'saved' : diffMode.rightTabId || ''}
          onChange={(e) => {
            if (e.target.value === 'saved') {
              if (activeTab?.hasSavedVersion) {
                setDiffMode(true, activeTabId || undefined, undefined, true);
              }
            } else if (e.target.value) {
              setDiffMode(true, activeTabId || undefined, e.target.value, false);
            }
          }}
        >
          <option value="saved" disabled={!activeTab?.hasSavedVersion || !activeTab?.isDirty}>
            Compare with Saved
          </option>
            {tabs.filter(t => t.id !== activeTabId).map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Diff editor */}
      <div className="flex-1 overflow-hidden">
        <SimpleDiffEditor
          originalContent={originalContent}
          modifiedContent={modifiedContent}
          originalTitle={originalTitle}
          modifiedTitle={modifiedTitle}
          language={language}
          editable={true} // Modified editor is always editable
          originalEditable={!diffMode.compareWithSaved} // Original editable for file-to-file, read-only for saved diffs
          viewMode="side-by-side" // Always side-by-side in split view
        />
      </div>
    </div>
  );
}

// Secondary editor component - displays a specific tab
function SecondaryEditor({ tabId }: { tabId: string }) {
  const { tabs } = useStore();
  const tab = tabs.find(t => t.id === tabId);
  
  if (!tab) {
    return (
      <div 
        className="flex items-center justify-center h-full text-sm opacity-50"
        style={{ color: 'var(--editor-fg)', background: 'var(--editor-bg)' }}
      >
        File not found
      </div>
    );
  }
  
  return <Editor tabId={tabId} registerAs="secondary" autoFocus={false} />;
}
