import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { Editor } from './Editor';

interface SplitEditorProps {
  mode: 'horizontal' | 'vertical';
}

export function SplitEditor({ mode }: SplitEditorProps) {
  const { tabs, activeTabId, setActiveTab } = useStore();
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [secondaryTabId, setSecondaryTabId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSide, setActiveSide] = useState<'primary' | 'secondary'>('primary');

  // Determine which tab is shown in each pane
  const primaryTab = tabs.find((t) => t.id === activeTabId);
  const secondaryTab = secondaryTabId 
    ? tabs.find((t) => t.id === secondaryTabId)
    : tabs.find((t) => t.id !== activeTabId);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const isHorizontal = mode === 'horizontal';
      
      if (isHorizontal) {
        const relativeY = e.clientY - rect.top;
        const newRatio = relativeY / rect.height;
        setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
      } else {
        const relativeX = e.clientX - rect.left;
        const newRatio = relativeX / rect.width;
        setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [mode]);

  const handlePrimaryClick = () => {
    setActiveSide('primary');
    if (primaryTab) {
      setActiveTab(primaryTab.id);
    }
  };

  const handleSecondaryClick = () => {
    setActiveSide('secondary');
    if (secondaryTab) {
      setActiveTab(secondaryTab.id);
    }
  };

  const selectSecondaryTab = (tabId: string) => {
    setSecondaryTabId(tabId);
    setActiveSide('secondary');
    setActiveTab(tabId);
  };

  const isHorizontal = mode === 'horizontal';
  const flexDirection = isHorizontal ? 'flex-col' : 'flex-row';
  const resizeHandleClass = isHorizontal 
    ? 'h-1 cursor-row-resize w-full' 
    : 'w-1 cursor-col-resize h-full';

  return (
    <div 
      ref={containerRef}
      className={`flex ${flexDirection} h-full ${isResizing ? 'select-none' : ''}`}
    >
      {/* Primary pane */}
      <div 
        className={`flex flex-col overflow-hidden ${
          activeSide === 'primary' ? 'ring-2 ring-editor-accent/50' : ''
        }`}
        style={{
          [isHorizontal ? 'height' : 'width']: `${splitRatio * 100}%`,
          flexShrink: 0,
        }}
        onClick={handlePrimaryClick}
      >
        <div className="text-xs px-2 py-1 border-b border-tab-border flex items-center justify-between"
          style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        >
          <span className="font-medium opacity-70">Primary</span>
          <span className="opacity-50">{primaryTab?.title || 'No file'}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>
      </div>

      {/* Resize handle */}
      <div
        className={`${resizeHandleClass} bg-tab-border hover:bg-editor-accent/50 transition-colors flex-shrink-0`}
        onMouseDown={handleResizeStart}
      />

      {/* Secondary pane */}
      <div 
        className={`flex flex-col overflow-hidden flex-1 ${
          activeSide === 'secondary' ? 'ring-2 ring-editor-accent/50' : ''
        }`}
        onClick={handleSecondaryClick}
      >
        <div className="text-xs px-2 py-1 border-b border-tab-border flex items-center justify-between"
          style={{ background: 'var(--sidebar-bg)', color: 'var(--editor-fg)' }}
        >
          <span className="font-medium opacity-70">Secondary</span>
          {tabs.length > 1 ? (
            <select
              className="text-xs bg-transparent border-none outline-none opacity-70 hover:opacity-100 cursor-pointer"
              style={{ color: 'var(--editor-fg)' }}
              value={secondaryTabId || secondaryTab?.id || ''}
              onChange={(e) => selectSecondaryTab(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {tabs.filter(t => t.id !== activeTabId || tabs.length === 1).map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="opacity-50">{secondaryTab?.title || 'No file'}</span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {secondaryTab ? (
            <SecondaryEditor />
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

// Secondary editor component - simplified version
function SecondaryEditor() {
  return (
    <Editor 
      // The editor will use the store's active tab, but we could enhance this
      // to support independent editing in each pane
    />
  );
}

