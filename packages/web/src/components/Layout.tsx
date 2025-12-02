import { useRef, useCallback, useState } from 'react';
import { useStore } from '../store';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Editor } from './Editor';
import { StatusBar } from './StatusBar';
import { MarkdownPreview } from './MarkdownPreview';

export function Layout() {
  const { showSidebar, showPreview, sidebarWidth, activeTabId, tabs, setSidebarWidth, zenMode, splitMode } = useStore();
  const [previewRatio, setPreviewRatio] = useState(0.4); // 40% for preview
  const [splitRatio, setSplitRatio] = useState(0.5); // 50/50 split
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isMarkdown = activeTab?.language === 'markdown' || activeTab?.title.endsWith('.md');
  const isMdx = activeTab?.language === 'mdx' || activeTab?.title.endsWith('.mdx');
  const showPreviewPane = showPreview && (isMarkdown || isMdx);

  // Sidebar resize handler
  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, setSidebarWidth]);

  // Preview resize handler
  const handlePreviewResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const container = editorContainerRef.current;
    if (!container) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newRatio = 1 - (relativeX / rect.width);
      setPreviewRatio(Math.max(0.2, Math.min(0.6, newRatio)));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

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
              onMouseDown={handleSidebarResize}
            />
          </>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <TabBar />

          {/* Editor and preview */}
          <div ref={editorContainerRef} className="flex-1 flex overflow-hidden">
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
                  onMouseDown={handlePreviewResize}
                />
                <div 
                  className="min-w-0 h-full overflow-hidden"
                  style={{ flex: `0 0 ${previewRatio * 100}%` }}
                >
                  <MarkdownPreview content={activeTab?.content || ''} isMdx={isMdx} />
                </div>
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

