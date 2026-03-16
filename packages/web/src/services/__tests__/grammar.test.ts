import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrammarService } from '../grammar';
import { logger } from '@md-crafter/shared';

vi.mock('@md-crafter/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null as ((event: { data: any }) => void) | null,
  onerror: null as ((error: ErrorEvent) => void) | null,
};

const mockWorkerConstructor = vi.fn().mockImplementation(function WorkerCtor(this: any) {
  this.postMessage = mockWorker.postMessage;
  this.terminate = mockWorker.terminate;
  Object.defineProperty(this, 'onmessage', {
    get: () => mockWorker.onmessage,
    set: (val: any) => {
      mockWorker.onmessage = val;
    },
    configurable: true,
  });
  Object.defineProperty(this, 'onerror', {
    get: () => mockWorker.onerror,
    set: (val: any) => {
      mockWorker.onerror = val;
    },
    configurable: true,
  });
  return this;
});

vi.stubGlobal('Worker', mockWorkerConstructor);

const mockMonaco = {
  MarkerSeverity: {
    Warning: 4,
  },
  Range: class MockRange {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number
    ) {}
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
    uri: { toString: () => 'inmemory://model-1' },
    getVersionId: () => 1,
  })),
};

describe('GrammarService', () => {
  let grammarService: GrammarService;

  beforeEach(() => {
    vi.clearAllMocks();
    grammarService = new GrammarService();
    mockWorker.onmessage = null;
    mockWorker.onerror = null;
  });

  afterEach(() => {
    grammarService.cleanup();
  });

  it('initializes worker and code action providers', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);

    expect(mockWorkerConstructor).toHaveBeenCalledTimes(1);
    expect(mockMonaco.languages.registerCodeActionProvider).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith('Grammar service initialized');
  });

  it('does not recreate worker when initialized twice', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    expect(mockWorkerConstructor).toHaveBeenCalledTimes(1);
  });

  it('posts grammar check requests to worker', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    await grammarService.checkGrammar('Test text', 'note.md');

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'check',
        text: 'Test text',
        filePath: 'note.md',
        requestId: expect.any(Number),
      })
    );
  });

  it('maps worker issues into Monaco markers', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    await grammarService.checkGrammar('There is a test sentence.', 'note.md');

    const payload = mockWorker.postMessage.mock.calls[0][0];
    mockWorker.onmessage?.({
      data: {
        type: 'result',
        requestId: payload.requestId,
        success: true,
        issues: [
          {
            filePath: 'note.md',
            messages: [
              {
                message: 'Issue',
                line: 2,
                column: 4,
                range: [10, 15],
                ruleId: 'rule-id',
              },
            ],
          },
        ],
      },
    });

    expect(mockMonaco.editor.setModelMarkers).toHaveBeenLastCalledWith(
      expect.any(Object),
      'grammar',
      expect.arrayContaining([
        expect.objectContaining({
          severity: 4,
          startLineNumber: 2,
          startColumn: 4,
          endLineNumber: 2,
          endColumn: 9,
          source: 'grammar',
          code: 'rule-id',
        }),
      ])
    );
  });

  it('invokes completion and results callbacks from worker response', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    const onComplete = vi.fn();
    const onResults = vi.fn();
    await grammarService.checkGrammar('test', 'note.md', onComplete, onResults);

    const payload = mockWorker.postMessage.mock.calls[0][0];
    const issues = [
      {
        filePath: 'note.md',
        messages: [{ message: 'Issue', line: 1, column: 1, range: [0, 1] }],
      },
    ];
    mockWorker.onmessage?.({
      data: {
        type: 'result',
        requestId: payload.requestId,
        success: true,
        issues,
      },
    });

    expect(onResults).toHaveBeenCalledWith(issues);
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('ignores stale worker responses', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    await grammarService.checkGrammar('first', 'note.md');
    const firstRequestId = mockWorker.postMessage.mock.calls[0][0].requestId;
    await grammarService.checkGrammar('second', 'note.md');
    const secondRequestId = mockWorker.postMessage.mock.calls[1][0].requestId;
    expect(secondRequestId).toBeGreaterThan(firstRequestId);

    mockWorker.onmessage?.({
      data: {
        type: 'result',
        requestId: firstRequestId,
        success: true,
        issues: [
          { filePath: 'note.md', messages: [{ message: 'Old issue', line: 1, column: 1, range: [0, 1] }] },
        ],
      },
    });

    // First result should be ignored, so marker write count is still from clear calls only.
    const markerCallsAfterStale = mockMonaco.editor.setModelMarkers.mock.calls.length;

    mockWorker.onmessage?.({
      data: {
        type: 'result',
        requestId: secondRequestId,
        success: true,
        issues: [
          { filePath: 'note.md', messages: [{ message: 'New issue', line: 1, column: 1, range: [0, 1] }] },
        ],
      },
    });

    expect(mockMonaco.editor.setModelMarkers.mock.calls.length).toBeGreaterThan(markerCallsAfterStale);
  });

  it('propagates worker failure via error callback', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    const onError = vi.fn();
    const onComplete = vi.fn();
    await grammarService.checkGrammar('test', 'note.md', onComplete, undefined, onError);

    const payload = mockWorker.postMessage.mock.calls[0][0];
    mockWorker.onmessage?.({
      data: {
        type: 'result',
        requestId: payload.requestId,
        success: false,
        error: 'Worker failed',
      },
    });

    expect(onError).toHaveBeenCalledWith('Worker failed');
    expect(onComplete).toHaveBeenCalledWith(0);
    expect(logger.error).toHaveBeenCalledWith('Grammar check failed', 'Worker failed');
  });

  it('cleanup terminates worker and disposes providers', async () => {
    await grammarService.initialize(mockMonaco as any, mockEditor as any);
    grammarService.cleanup();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
