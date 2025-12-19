import { describe, it, expect } from 'vitest';
import {
  TOAST_DURATION,
  DEFAULT_PREVIEW_RATIO,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_RECENT_FILES,
  EDITOR_DEBOUNCE_DELAY_MS,
  SYNC_DEBOUNCE_DELAY_MS,
  MONACO_INIT_TIMEOUT_MS,
  API_REQUEST_TIMEOUT_MS,
  E2E_WAIT_TIMEOUT_MS,
} from '../../constants';

describe('constants', () => {
  describe('Toast configuration', () => {
    it('should export TOAST_DURATION', () => {
      expect(TOAST_DURATION).toBe(4000);
    });
  });

  describe('Layout configuration', () => {
    it('should export DEFAULT_PREVIEW_RATIO', () => {
      expect(DEFAULT_PREVIEW_RATIO).toBe(0.4);
    });

    it('should export SIDEBAR_MIN_WIDTH', () => {
      expect(SIDEBAR_MIN_WIDTH).toBe(180);
    });

    it('should export SIDEBAR_MAX_WIDTH', () => {
      expect(SIDEBAR_MAX_WIDTH).toBe(400);
    });

    it('should export DEFAULT_SIDEBAR_WIDTH', () => {
      expect(DEFAULT_SIDEBAR_WIDTH).toBe(260);
    });

    it('should have SIDEBAR_MIN_WIDTH < DEFAULT_SIDEBAR_WIDTH < SIDEBAR_MAX_WIDTH', () => {
      expect(SIDEBAR_MIN_WIDTH).toBeLessThan(DEFAULT_SIDEBAR_WIDTH);
      expect(DEFAULT_SIDEBAR_WIDTH).toBeLessThan(SIDEBAR_MAX_WIDTH);
    });
  });

  describe('Recent files configuration', () => {
    it('should export MAX_RECENT_FILES', () => {
      expect(MAX_RECENT_FILES).toBe(10);
    });
  });

  describe('Timing constants', () => {
    it('should export EDITOR_DEBOUNCE_DELAY_MS', () => {
      expect(EDITOR_DEBOUNCE_DELAY_MS).toBe(300);
    });

    it('should export SYNC_DEBOUNCE_DELAY_MS', () => {
      expect(SYNC_DEBOUNCE_DELAY_MS).toBe(1000);
    });

    it('should export MONACO_INIT_TIMEOUT_MS', () => {
      expect(MONACO_INIT_TIMEOUT_MS).toBe(30000);
    });

    it('should export API_REQUEST_TIMEOUT_MS', () => {
      expect(API_REQUEST_TIMEOUT_MS).toBe(10000);
    });

    it('should export E2E_WAIT_TIMEOUT_MS', () => {
      expect(E2E_WAIT_TIMEOUT_MS).toBe(5000);
    });

    it('should have reasonable timeout values', () => {
      expect(EDITOR_DEBOUNCE_DELAY_MS).toBeGreaterThan(0);
      expect(SYNC_DEBOUNCE_DELAY_MS).toBeGreaterThan(EDITOR_DEBOUNCE_DELAY_MS);
      expect(MONACO_INIT_TIMEOUT_MS).toBeGreaterThan(0);
      expect(API_REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
      expect(E2E_WAIT_TIMEOUT_MS).toBeGreaterThan(0);
    });
  });
});

