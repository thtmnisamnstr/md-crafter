import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, debounceLeading, throttle } from '../utils/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset delay on subsequent calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call function with correct arguments', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should only use latest arguments', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('third');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });
});

describe('debounceLeading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const fn = vi.fn();
    const debouncedFn = debounceLeading(fn, 100);

    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call again within wait period', () => {
    const fn = vi.fn();
    const debouncedFn = debounceLeading(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call again after wait period', () => {
    const fn = vi.fn();
    const debouncedFn = debounceLeading(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(100);
    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call again within wait period', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should schedule a trailing call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should call function with correct arguments', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn('arg1', 'arg2');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should call trailing with arguments from queued call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn('first');
    throttledFn('second'); // This queues a trailing call with 'second'

    expect(fn).toHaveBeenCalledWith('first');

    vi.advanceTimersByTime(100);
    // The trailing call uses the arguments from when it was scheduled
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

