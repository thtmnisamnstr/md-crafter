import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResize } from '../useResize';
import { createRef } from 'react';

describe('useResize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    document.removeEventListener('mousemove', vi.fn());
    document.removeEventListener('mouseup', vi.fn());
  });

  describe('Delta mode', () => {
    it('should initialize with isResizing false', () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'horizontal',
          initialValue: 100,
          onResize,
        })
      );

      expect(result.current.isResizing).toBe(false);
      expect(typeof result.current.handleResizeStart).toBe('function');
    });

    it('should handle horizontal delta resize', () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'horizontal',
          initialValue: 100,
          min: 50,
          max: 200,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 50,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      expect(result.current.isResizing).toBe(true);

      // Simulate mouse move
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150, // +50 delta
          clientY: 50,
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(150); // 100 + 50

      // Simulate mouse up
      act(() => {
        const upEvent = new MouseEvent('mouseup', {
          bubbles: true,
        });
        document.dispatchEvent(upEvent);
      });

      expect(result.current.isResizing).toBe(false);
    });

    it('should respect min constraint in delta mode', () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'horizontal',
          initialValue: 100,
          min: 50,
          max: 200,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 50,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Move mouse far left (negative delta)
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 0, // -100 delta, would be 0, but min is 50
          clientY: 50,
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(50); // Clamped to min
    });

    it('should respect max constraint in delta mode', () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'horizontal',
          initialValue: 100,
          min: 50,
          max: 200,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 50,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Move mouse far right (large positive delta)
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 300, // +200 delta, would be 300, but max is 200
          clientY: 50,
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(200); // Clamped to max
    });

    it('should handle vertical delta resize', () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'vertical',
          initialValue: 100,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Simulate mouse move down
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 100,
          clientY: 150, // +50 delta
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(150); // 100 + 50
    });
  });

  describe('Ratio mode', () => {
    it('should handle horizontal ratio resize', () => {
      const containerRef = createRef<HTMLDivElement>();
      const container = document.createElement('div');
      container.style.width = '1000px';
      container.style.height = '500px';
      container.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      })) as any;
      containerRef.current = container;

      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'ratio',
          direction: 'horizontal',
          containerRef,
          min: 0.2,
          max: 0.8,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Move mouse to middle of container
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 500, // Middle of 1000px container = 0.5 ratio
          clientY: 0,
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(0.5);
    });

    it('should handle vertical ratio resize', () => {
      const containerRef = createRef<HTMLDivElement>();
      const container = document.createElement('div');
      container.style.width = '1000px';
      container.style.height = '500px';
      container.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      })) as any;
      containerRef.current = container;

      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'ratio',
          direction: 'vertical',
          containerRef,
          min: 0.2,
          max: 0.8,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Move mouse to middle of container vertically
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 0,
          clientY: 250, // Middle of 500px container = 0.5 ratio
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(0.5);
    });

    it('should respect min constraint in ratio mode', () => {
      const containerRef = createRef<HTMLDivElement>();
      const container = document.createElement('div');
      container.style.width = '1000px';
      container.style.height = '500px';
      container.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      })) as any;
      containerRef.current = container;

      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'ratio',
          direction: 'horizontal',
          containerRef,
          min: 0.2,
          max: 0.8,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Move mouse to very left (would be 0 ratio, but min is 0.2)
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(0.2); // Clamped to min
    });

    it('should respect max constraint in ratio mode', () => {
      const containerRef = createRef<HTMLDivElement>();
      const container = document.createElement('div');
      container.style.width = '1000px';
      container.style.height = '500px';
      container.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      })) as any;
      containerRef.current = container;

      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'ratio',
          direction: 'horizontal',
          containerRef,
          min: 0.2,
          max: 0.8,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Move mouse to very right (would be 1.0 ratio, but max is 0.8)
      act(() => {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 1000,
          clientY: 0,
          bubbles: true,
        });
        document.dispatchEvent(moveEvent);
      });

      expect(onResize).toHaveBeenCalledWith(0.8); // Clamped to max
    });

    it('should call onResizeStart callback', () => {
      const onResize = vi.fn();
      const onResizeStart = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'horizontal',
          initialValue: 100,
          onResize,
          onResizeStart,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 50,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      expect(onResizeStart).toHaveBeenCalled();
    });

    it('should call onResizeEnd callback', () => {
      const onResize = vi.fn();
      const onResizeEnd = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'delta',
          direction: 'horizontal',
          initialValue: 100,
          onResize,
          onResizeEnd,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 50,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      act(() => {
        const upEvent = new MouseEvent('mouseup', {
          bubbles: true,
        });
        document.dispatchEvent(upEvent);
      });

      expect(onResizeEnd).toHaveBeenCalled();
    });

    it('should not resize if container ref is null in ratio mode', () => {
      const containerRef = createRef<HTMLDivElement>();
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useResize({
          mode: 'ratio',
          direction: 'horizontal',
          containerRef,
          onResize,
        })
      );

      act(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
          cancelable: true,
        });
        result.current.handleResizeStart(mouseEvent as any);
      });

      // Should not start resizing if container is null
      expect(result.current.isResizing).toBe(false);
    });
  });
});

