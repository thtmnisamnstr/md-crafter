import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Editor } from './Editor';
import { StatusBar } from './StatusBar';
import { MarkdownPreview } from './MarkdownPreview';
import { SplitEditor } from './SplitEditor';
import { WelcomeTab } from './WelcomeTab';
import { DEFAULT_PREVIEW_RATIO, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from '../constants';
import { useResize } from '../hooks/useResize';
import { useEditorContext } from '../contexts/EditorContext';

export function Layout() {
  const { showSidebar, showPreview, sidebarWidth, activeTabId, tabs, setSidebarWidth, zenMode, splitMode, setSplitMode, diffMode, setDiffMode, exitDiffMode, setTabCursor, setTabSelection } = useStore();
  const { primaryEditor } = useEditorContext();
  const [previewRatio, setPreviewRatio] = useState(DEFAULT_PREVIEW_RATIO);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { setTabPreviewRatio } = useStore();
  
  // Track previous mode state to detect transitions
  const prevSplitModeRef = useRef(splitMode);
  const prevDiffModeRef = useRef(diffMode.enabled);
  
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isMarkdown = activeTab?.language === 'markdown' || activeTab?.title.endsWith('.md');
  const isMdx = activeTab?.language === 'mdx' || activeTab?.title.endsWith('.mdx');
  const tabShowPreview = activeTab?.showPreview ?? showPreview;
  const showPreviewPane = tabShowPreview && (isMarkdown || isMdx) && splitMode === 'none';

  // Sync local preview ratio with per-tab stored value
  useEffect(() => {
    if (activeTab?.previewPaneRatio && activeTab.previewPaneRatio > 0 && activeTab.previewPaneRatio < 1) {
      setPreviewRatio(activeTab.previewPaneRatio);
    } else {
      setPreviewRatio(DEFAULT_PREVIEW_RATIO);
    }
  }, [activeTab?.previewPaneRatio, activeTabId]);

  // Restore per-tab split/diff state when active tab changes
  useEffect(() => {
    if (activeTab) {
      if (activeTab.splitMode && activeTab.splitMode !== splitMode) {
        setSplitMode(activeTab.splitMode);
      }
      if (activeTab.diffMode && activeTab.diffMode.enabled !== diffMode.enabled) {
        if (activeTab.diffMode.enabled) {
          setDiffMode(true, activeTab.diffMode.leftTabId, activeTab.diffMode.rightTabId, activeTab.diffMode.compareWithSaved);
        } else {
          exitDiffMode();
        }
      }
    } else {
      // No active tab: reset split/diff to defaults
      if (splitMode !== 'none') setSplitMode('none');
      if (diffMode.enabled) exitDiffMode();
    }
  }, [activeTabId, activeTab, setSplitMode, splitMode, setDiffMode, diffMode.enabled, exitDiffMode]);

  // Persist cursor when ENTERING split/diff mode (from normal mode)
  // Exit persistence is handled by component cleanup effects (Editor.tsx unmount)
  // We only persist on ENTRY to avoid overwriting cursor from the NEW editor (at 1,1)
  useEffect(() => {
    const enteringSplitOrDiff = 
      (prevSplitModeRef.current === 'none' && splitMode !== 'none') ||
      (!prevDiffModeRef.current && diffMode.enabled);
    
    // Only persist when ENTERING a mode (from normal mode)
    if (enteringSplitOrDiff && primaryEditor && activeTabId) {
      try {
        const pos = primaryEditor.getPosition();
        const selection = primaryEditor.getSelection();
        if (pos) {
          setTabCursor(activeTabId, { line: pos.lineNumber, column: pos.column });
        }
        // Handle selection - clear if collapsed, save if actual selection
        if (selection) {
          const isCollapsed = selection.startLineNumber === selection.endLineNumber && 
                              selection.startColumn === selection.endColumn;
          if (isCollapsed) {
            setTabSelection(activeTabId, null);
          } else {
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
    }
    
    prevSplitModeRef.current = splitMode;
    prevDiffModeRef.current = diffMode.enabled;
  }, [splitMode, diffMode.enabled, primaryEditor, activeTabId, setTabCursor, setTabSelection]);

  // Sidebar resize using delta mode
  const {
    isResizing: isSidebarResizing,
    handleResizeStart: handleSidebarResizeStart,
  } = useResize({
    mode: 'delta',
    direction: 'horizontal',
    initialValue: sidebarWidth,
    min: SIDEBAR_MIN_WIDTH,
    max: SIDEBAR_MAX_WIDTH,
    onResize: (newWidth) => {
      setSidebarWidth(newWidth);
    },
  });

  // Preview resize using ratio mode (inverted - preview is on right)
  const {
    isResizing: isPreviewResizing,
    handleResizeStart: handlePreviewResizeStart,
  } = useResize({
    mode: 'ratio',
    direction: 'horizontal',
    containerRef: editorContainerRef,
    min: 0.2,
    max: 0.6,
    onResize: (ratio) => {
      // Invert ratio since preview is on the right side
      setPreviewRatio(1 - ratio);
      if (activeTabId) {
        setTabPreviewRatio(activeTabId, 1 - ratio);
      }
    },
  });

  const isResizing = isSidebarResizing || isPreviewResizing;

  // Zen mode - hide all UI except editor
  if (zenMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>
        {/* Minimal status in zen mode */}
        <div 
          className="h-6 flex items-center justify-center text-xs opacity-30 hover:opacity-100 transition-opacity cursor-pointer"
          style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
          onClick={() => useStore.getState().toggleZenMode()}
        >
          Press Esc to exit Zen mode
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isResizing ? 'select-none' : ''}`}>
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <div 
              className="flex-shrink-0 border-r border-tab-border"
              style={{ width: sidebarWidth }}
            >
              <Sidebar />
            </div>
            {/* Sidebar resize handle */}
            <div
              className="w-1 cursor-col-resize hover:bg-editor-accent/50 transition-colors"
              onMouseDown={handleSidebarResizeStart}
            />
          </>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <TabBar />

          {/* Editor and preview */}
          <div ref={editorContainerRef} className="flex-1 flex overflow-hidden">
            {/* Welcome screen - show when no active tab */}
            {!activeTab ? (
              <WelcomeTab />
            ) : splitMode !== 'none' ? (
              /* Split Editor mode */
              <SplitEditor mode={splitMode} />
            ) : (
              <>
                {/* Editor */}
                <div 
                  className="min-w-0 h-full"
                  style={{ 
                    flex: showPreviewPane ? `0 0 ${(1 - previewRatio) * 100}%` : '1 1 auto'
                  }}
                >
                  <Editor />
                </div>

                {/* Markdown preview */}
                {showPreviewPane && (
                  <>
                    {/* Preview resize handle */}
                    <div
                      className="w-1 cursor-col-resize hover:bg-editor-accent/50 transition-colors border-l border-tab-border"
                      onMouseDown={handlePreviewResizeStart}
                    />
                    <div 
                      className="min-w-0 h-full overflow-hidden"
                      style={{ flex: `0 0 ${previewRatio * 100}%` }}
                    >
                      <MarkdownPreview content={activeTab?.content || ''} isMdx={isMdx} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
