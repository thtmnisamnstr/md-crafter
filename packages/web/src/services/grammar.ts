import type * as monaco from 'monaco-editor';
import { logger } from '@md-crafter/shared';
import type { TextlintResults } from '../types/textlint';

interface GrammarWorkerRequest {
  type: 'check';
  requestId: number;
  text: string;
  filePath: string;
}

interface GrammarWorkerResponse {
  type: 'result';
  requestId: number;
  success: boolean;
  issues?: TextlintResults;
  error?: string;
}

/**
 * Worker-backed grammar checking service.
 *
 * This preserves the existing UI contract:
 * - issues are exposed in textlint-like shape for the review modal
 * - Monaco markers and quick-fixes are registered on the active model
 */
export class GrammarService {
  private monaco: typeof monaco | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private worker: Worker | null = null;
  private isInitialized = false;
  private markers: monaco.editor.IMarkerData[] = [];
  private codeActionProviders: monaco.IDisposable[] = [];
  private onCompleteCallback: ((issueCount: number) => void) | null = null;
  private onResultsCallback: ((issues: TextlintResults) => void) | null = null;
  private onErrorCallback: ((message: string) => void) | null = null;
  private issues: TextlintResults = [];
  private latestRequestId = 0;

  async initialize(
    monacoInstance: typeof monaco,
    editorInstance: monaco.editor.IStandaloneCodeEditor
  ): Promise<void> {
    this.monaco = monacoInstance;
    this.editor = editorInstance;

    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.worker = new Worker(new URL('../workers/grammar.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = (event: MessageEvent<GrammarWorkerResponse>) => {
        this.handleWorkerMessage(event.data);
      };
      this.worker.onerror = (error) => {
        logger.error('Grammar worker error', error);
        if (this.onErrorCallback) {
          this.onErrorCallback('Grammar worker failed to run');
          this.onErrorCallback = null;
        }
      };

      this.registerCodeActionProviders();
      this.isInitialized = true;
      logger.info('Grammar service initialized');
    } catch (error) {
      logger.error('Failed to initialize grammar service', error);
      throw error;
    }
  }

  async checkGrammar(
    text: string,
    filePath: string = 'document.md',
    onComplete?: (issueCount: number) => void,
    onResults?: (issues: TextlintResults) => void,
    onError?: (message: string) => void
  ): Promise<void> {
    if (!this.isInitialized || !this.worker || !this.monaco || !this.editor) {
      logger.warn('Grammar service not initialized');
      if (onComplete) onComplete(0);
      if (onResults) onResults([]);
      if (onError) onError('Grammar service not initialized');
      return;
    }

    const model = this.editor.getModel();
    if (!model) {
      if (onComplete) onComplete(0);
      if (onResults) onResults([]);
      if (onError) onError('No active editor model');
      return;
    }

    this.monaco.editor.setModelMarkers(model, 'grammar', []);
    this.onCompleteCallback = onComplete || null;
    this.onResultsCallback = onResults || null;
    this.onErrorCallback = onError || null;

    const requestId = ++this.latestRequestId;
    const payload: GrammarWorkerRequest = {
      type: 'check',
      requestId,
      text,
      filePath,
    };
    this.worker.postMessage(payload);
  }

  private handleWorkerMessage(data: GrammarWorkerResponse): void {
    if (!this.monaco || !this.editor || data.type !== 'result') {
      return;
    }

    // Ignore stale worker responses that arrive out of order.
    if (data.requestId !== this.latestRequestId) {
      return;
    }

    const model = this.editor.getModel();
    if (!model) return;

    if (!data.success) {
      logger.error('Grammar check failed', data.error);
      this.monaco.editor.setModelMarkers(model, 'grammar', []);
      this.markers = [];
      this.issues = [];
      if (this.onResultsCallback) {
        this.onResultsCallback([]);
        this.onResultsCallback = null;
      }
      if (this.onCompleteCallback) {
        this.onCompleteCallback(0);
        this.onCompleteCallback = null;
      }
      if (this.onErrorCallback) {
        this.onErrorCallback(data.error || 'Grammar check failed');
        this.onErrorCallback = null;
      }
      return;
    }

    this.issues = data.issues || [];
    this.markers = this.convertToMarkers(this.issues);
    this.monaco.editor.setModelMarkers(model, 'grammar', this.markers);

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.markers.length);
      this.onCompleteCallback = null;
    }
    if (this.onResultsCallback) {
      this.onResultsCallback(this.issues);
      this.onResultsCallback = null;
    }
    this.onErrorCallback = null;
  }

  getMarkers(): monaco.editor.IMarkerData[] {
    return this.markers;
  }

  private convertToMarkers(results: TextlintResults): monaco.editor.IMarkerData[] {
    const markers: monaco.editor.IMarkerData[] = [];
    for (const result of results) {
      if (!result.messages || !Array.isArray(result.messages)) continue;
      for (const message of result.messages) {
        let span = message.length || 0;
        if (span <= 0 && message.range) {
          const [start, endOrLength] = message.range;
          span = endOrLength > start ? endOrLength - start : endOrLength;
        }
        if (span <= 0) span = 1;
        markers.push({
          severity: this.monaco!.MarkerSeverity.Warning,
          startLineNumber: message.line || 1,
          startColumn: message.column || 1,
          endLineNumber: message.line || 1,
          endColumn: (message.column || 1) + span,
          message: message.message || 'Grammar issue',
          source: 'grammar',
          code: message.ruleId,
        });
      }
    }
    return markers;
  }

  private registerCodeActionProviders(): void {
    if (!this.monaco) return;

    this.codeActionProviders.forEach((d) => d.dispose());
    this.codeActionProviders = [];

    const languages: Array<'markdown' | 'mdx'> = ['markdown', 'mdx'];
    for (const language of languages) {
      this.codeActionProviders.push(
        this.monaco.languages.registerCodeActionProvider(language, {
          provideCodeActions: (model, _range, context) => {
            const actions: monaco.languages.CodeAction[] = [];
            const matchingMarkers = context.markers.filter((marker) => marker.source === 'grammar');
            for (const marker of matchingMarkers) {
              const issue = this.findIssueForMarker(marker);
              if (!issue || !issue.fix) continue;
              actions.push({
                title: `Apply fix: ${marker.message}`,
                kind: 'quickfix',
                diagnostics: [marker],
                edit: {
                  edits: [
                    {
                      resource: model.uri,
                      versionId: model.getVersionId ? model.getVersionId() : undefined,
                      textEdit: {
                        range: new this.monaco!.Range(
                          marker.startLineNumber,
                          marker.startColumn,
                          marker.endLineNumber,
                          marker.endColumn
                        ),
                        text: issue.fix.text,
                      },
                    },
                  ],
                },
                isPreferred: true,
              });
            }
            return {
              actions,
              dispose: () => {},
            };
          },
        })
      );
    }
  }

  private findIssueForMarker(
    marker: monaco.editor.IMarkerData
  ): { fix?: { range: [number, number]; text: string } } | null {
    for (const result of this.issues) {
      for (const message of result.messages) {
        if ((message.line || 1) === marker.startLineNumber && (message.column || 1) === marker.startColumn) {
          return { fix: message.fix };
        }
      }
    }
    return null;
  }

  clearMarkers(): void {
    if (!this.monaco || !this.editor) {
      return;
    }
    const model = this.editor.getModel();
    if (model) {
      this.monaco.editor.setModelMarkers(model, 'grammar', []);
    }
    this.markers = [];
  }

  cleanup(): void {
    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      this.codeActionProviders.forEach((d) => d.dispose());
      this.codeActionProviders = [];
      this.clearMarkers();
      this.issues = [];
      this.isInitialized = false;
      this.monaco = null;
      this.editor = null;
    } catch (error) {
      logger.error('Error during grammar service cleanup', error);
    }
  }
}
