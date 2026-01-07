import { useState, useEffect } from 'react';
import { isElectron, isMacOS } from '../utils/platform';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

/**
 * Custom title bar for desktop (Electron) app
 * 
 * - Provides a draggable region for window movement
 * - On macOS: Just a drag region (traffic lights are inset by Electron)
 * - On Windows/Linux: Drag region + custom window controls (min/max/close)
 * 
 * Uses -webkit-app-region: drag CSS for native window dragging
 */
export function DesktopTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  // Only render in Electron
  if (!isElectron()) {
    return null;
  }

  const isMac = isMacOS();

  // Update maximized state when window state changes
  useEffect(() => {
    if (!window.api?.isMaximized) return;

    const checkMaximized = async () => {
      const maximized = await window.api!.isMaximized();
      setIsMaximized(maximized);
    };

    // Check initial state
    checkMaximized();

    // Listen for maximize/unmaximize events
    const cleanup = window.api.onWindowStateChange?.((maximized: boolean) => {
      setIsMaximized(maximized);
    });

    return () => {
      cleanup?.();
    };
  }, []);

  const handleMinimize = () => {
    window.api?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    window.api?.maximizeWindow?.();
  };

  const handleClose = () => {
    window.api?.closeWindow?.();
  };

  return (
    <div
      className="flex items-center justify-between select-none"
      style={{
        // Make the entire bar draggable
        WebkitAppRegion: 'drag',
        height: isMac ? '28px' : '32px',
        background: 'var(--sidebar-bg, #252526)',
        borderBottom: '1px solid var(--tab-border, #3c3c3c)',
      } as React.CSSProperties}
    >
      {/* Left spacer - accounts for traffic lights on macOS */}
      <div style={{ width: isMac ? '70px' : '8px' }} />

      {/* Center - could show app title or leave empty */}
      <div 
        className="flex-1 text-center text-xs opacity-60"
        style={{ color: 'var(--editor-fg, #d4d4d4)' }}
      >
        {/* Optional: Could show document title here */}
      </div>

      {/* Right side - Window controls (Windows/Linux only) */}
      {!isMac && (
        <div
          className="flex items-center h-full"
          style={{
            // Exclude buttons from drag region
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          {/* Minimize button */}
          <button
            onClick={handleMinimize}
            className="h-full px-4 flex items-center justify-center hover:bg-white/10 transition-colors"
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus size={14} style={{ color: 'var(--editor-fg, #d4d4d4)' }} />
          </button>

          {/* Maximize/Restore button */}
          <button
            onClick={handleMaximize}
            className="h-full px-4 flex items-center justify-center hover:bg-white/10 transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          >
            {isMaximized ? (
              <Maximize2 size={12} style={{ color: 'var(--editor-fg, #d4d4d4)' }} />
            ) : (
              <Square size={12} style={{ color: 'var(--editor-fg, #d4d4d4)' }} />
            )}
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="h-full px-4 flex items-center justify-center hover:bg-red-600 transition-colors"
            title="Close"
            aria-label="Close window"
          >
            <X size={14} style={{ color: 'var(--editor-fg, #d4d4d4)' }} />
          </button>
        </div>
      )}

      {/* Right spacer for macOS (balance with left side) */}
      {isMac && <div style={{ width: '8px' }} />}
    </div>
  );
}
