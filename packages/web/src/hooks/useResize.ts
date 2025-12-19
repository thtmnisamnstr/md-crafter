import { useState, useCallback, useRef, useEffect } from 'react';

export type ResizeMode = 'delta' | 'ratio';
export type ResizeDirection = 'horizontal' | 'vertical';

interface UseResizeDeltaOptions {
  mode: 'delta';
  direction: ResizeDirection;
  onResize: (delta: number) => void;
  onResizeStart?: (e: React.MouseEvent) => void;
  onResizeEnd?: () => void;
  min?: number;
  max?: number;
  initialValue: number;
}

interface UseResizeRatioOptions {
  mode: 'ratio';
  direction: ResizeDirection;
  onResize: (ratio: number) => void;
  onResizeStart?: (e: React.MouseEvent) => void;
  onResizeEnd?: () => void;
  min?: number;
  max?: number;
  containerRef: React.RefObject<HTMLElement>;
}

export type UseResizeOptions = UseResizeDeltaOptions | UseResizeRatioOptions;

/**
 * Hook for handling resize operations with mouse drag
 * 
 * Supports two modes:
 * - 'delta': Resize based on pixel delta from start position (e.g., sidebar width)
 * - 'ratio': Resize based on ratio within container (e.g., split ratio, preview ratio)
 * 
 * @param options - Resize configuration options
 * @returns Object with isResizing state and handleResizeStart callback
 */
export function useResize(options: UseResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startValue?: number;
    containerRect?: DOMRect;
  } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (options.mode === 'ratio') {
      const container = options.containerRef.current;
      if (!container) return;
      
      resizeStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        containerRect: container.getBoundingClientRect(),
      };
    } else {
      resizeStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startValue: options.initialValue,
      };
    }
    
    setIsResizing(true);
    options.onResizeStart?.(e);
  }, [options]);

  useEffect(() => {
    if (!isResizing || !resizeStartRef.current) return;

    const start = resizeStartRef.current;
    const isHorizontal = options.direction === 'horizontal';

    const handleMouseMove = (e: MouseEvent) => {
      if (options.mode === 'delta') {
        const delta = isHorizontal 
          ? e.clientX - start.startX 
          : e.clientY - start.startY;
        
        const newValue = (start.startValue || 0) + delta;
        const constrainedValue = options.min !== undefined && options.max !== undefined
          ? Math.max(options.min, Math.min(options.max, newValue))
          : newValue;
        
        options.onResize(constrainedValue);
      } else {
        // Ratio mode
        const container = options.containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const relativePos = isHorizontal
          ? e.clientX - rect.left
          : e.clientY - rect.top;
        
        const newRatio = isHorizontal
          ? relativePos / rect.width
          : relativePos / rect.height;
        
        const constrainedRatio = options.min !== undefined && options.max !== undefined
          ? Math.max(options.min, Math.min(options.max, newRatio))
          : newRatio;
        
        options.onResize(constrainedRatio);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      options.onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, options]);

  return {
    isResizing,
    handleResizeStart,
  };
}

