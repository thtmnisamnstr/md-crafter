import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrammarService } from '../grammar';
import { logger } from '@md-crafter/shared';

// Mock logger
vi.mock('@md-crafter/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Worker
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((event: { data: any }) => void) | null,
  onerror: null as ((error: ErrorEvent) => void) | null,
};

function MockWorkerClass(this: any, url: string | URL, options?: WorkerOptions) {
  this.postMessage = mockWorker.postMessage;
  this.terminate = mockWorker.terminate;
  Object.defineProperty(this, 'onmessage', {
    get: () => mockWorker.onmessage,
    set: (val: any) => { mockWorker.onmessage = val; },
    configurable: true,
  });
  Object.defineProperty(this, 'onerror', {
    get: () => mockWorker.onerror,
    set: (val: any) => { mockWorker.onerror = val; },
    configurable: true,
  });
  return this;
}

const mockWorkerConstructor = vi.fn().mockImplementation(function(this: any, url: string | URL, options?: WorkerOptions) {
  return new (MockWorkerClass as any)(url, options);
});

vi.stubGlobal('Worker', mockWorkerConstructor);

// Mock fetch
global.fetch = vi.fn();

// Mock Monaco Editor
const mockMonaco = {
  MarkerSeverity: {
    Warning: 4,
  },
  editor: {
    setModelMarkers: vi.fn(),
  },
  languages: {
    registerCodeActionProvider: vi.fn(() => ({
      dispose: vi.fn(),
    })),
  },
};

const mockEditor = {
  getModel: vi.fn(() => ({
    id: 'model-1',
  })),
};

describe('GrammarService', () => {
  let grammarService: GrammarService;

  beforeEach(() => {
    vi.clearAllMocks();
    grammarService = new GrammarService();
    mockWorker.onmessage = null;
    mockWorker.onerror = null;
    (global.fetch as any).mockResolvedValue({
      ok: false,
    });
  });

  afterEach(() => {
    grammarService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize grammar service', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      
      expect(mockWorkerConstructor).toHaveBeenCalled();
      expect(mockMonaco.languages.registerCodeActionProvider).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Grammar service initialized');
    });

    it('should not initialize twice', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      
      // Should only create worker once
      expect(mockWorkerConstructor).toHaveBeenCalledTimes(1);
    });

    it('should set up worker message handler', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      
      expect(mockWorker.onmessage).toBeTruthy();
    });

    it('should set up worker error handler', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      
      expect(mockWorker.onerror).toBeTruthy();
    });

    it('should handle initialization errors', async () => {
      mockWorkerConstructor.mockImplementationOnce(() => {
        throw new Error('Worker creation failed');
      });
      
      await expect(
        grammarService.initialize(mockMonaco as any, mockEditor as any)
      ).rejects.toThrow('Worker creation failed');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize grammar service',
        expect.any(Error)
      );
    });
  });

  describe('Grammar Checking', () => {
    beforeEach(async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
    });

    it('should check grammar and send text to worker', async () => {
      await grammarService.checkGrammar('Test content', 'test.md');
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        text: 'Test content',
        filePath: 'test.md',
        config: expect.any(Object),
      });
    });

    it('should use default file path if not provided', async () => {
      await grammarService.checkGrammar('Test content');
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: 'document.md',
        })
      );
    });

    it('should load textlint config from server', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rules: { 'test-rule': true } }),
      });
      
      await grammarService.checkGrammar('Test content');
      
      expect(global.fetch).toHaveBeenCalledWith('/.textlintrc.json');
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          config: { rules: { 'test-rule': true } },
        })
      );
    });

    it('should use default config if server config fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });
      
      await grammarService.checkGrammar('Test content');
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            rules: expect.any(Object),
          }),
        })
      );
    });

    it('should call onComplete callback when results arrive', async () => {
      const onComplete = vi.fn();
      await grammarService.checkGrammar('Test content', 'test.md', onComplete);
      
      // Simulate worker response
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            success: true,
            results: [
              {
                messages: [
                  {
                    line: 1,
                    column: 1,
                    message: 'Test issue',
                    range: [0, 5],
                  },
                ],
              },
            ],
          },
        });
      }
      
      expect(onComplete).toHaveBeenCalledWith(1);
    });

    it('should not check grammar if not initialized', async () => {
      const newService = new GrammarService();
      await newService.checkGrammar('Test content');
      
      expect(logger.warn).toHaveBeenCalledWith('Grammar service not initialized');
    });

    it('should handle worker errors gracefully', async () => {
      const onComplete = vi.fn();
      await grammarService.checkGrammar('Test content', 'test.md', onComplete);
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            success: false,
            error: 'Processing failed',
          },
        });
      }
      
      expect(logger.error).toHaveBeenCalledWith('Grammar check failed', 'Processing failed');
      expect(onComplete).toHaveBeenCalledWith(0);
    });
  });

  describe('Marker Conversion', () => {
    beforeEach(async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
    });

    it('should convert textlint results to Monaco markers', async () => {
      await grammarService.checkGrammar('Test content');
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            success: true,
            results: [
              {
                messages: [
                  {
                    line: 2,
                    column: 5,
                    message: 'Grammar issue',
                    range: [10, 15],
                  },
                ],
              },
            ],
          },
        });
      }
      
      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        expect.any(Object),
        'grammar',
        expect.arrayContaining([
          expect.objectContaining({
            severity: 4,
            startLineNumber: 2,
            startColumn: 5,
            endLineNumber: 2,
            endColumn: 20,
            message: 'Grammar issue',
            source: 'textlint',
          }),
        ])
      );
    });

    it('should handle empty results', async () => {
      const onComplete = vi.fn();
      await grammarService.checkGrammar('Test content', 'test.md', onComplete);
      
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            success: true,
            results: [],
          },
        });
      }
      
      expect(onComplete).toHaveBeenCalledWith(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear markers', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      grammarService.clearMarkers();
      
      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        expect.any(Object),
        'grammar',
        []
      );
    });

    it('should cleanup resources', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      grammarService.cleanup();
      
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      await grammarService.initialize(mockMonaco as any, mockEditor as any);
      mockWorker.terminate.mockImplementationOnce(() => {
        throw new Error('Terminate failed');
      });
      
      grammarService.cleanup();
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error during grammar service cleanup',
        expect.any(Error)
      );
    });
  });
});

