import type * as monaco from 'monaco-editor';
import { logger } from '@md-crafter/shared';
import type { TextlintResults } from '../types/textlint';

/**
 * Service for managing grammar checking using textlint
 * 
 * Uses a web worker to run textlint in a separate thread, avoiding UI blocking.
 * Converts textlint results to Monaco markers and code actions.
 */
export class GrammarService {
  private monaco: typeof monaco | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private worker: Worker | null = null;
  private isInitialized = false;
  private markers: monaco.editor.IMarkerData[] = [];
  private codeActionProvider: monaco.IDisposable | null = null;
  private onCompleteCallback: ((issueCount: number) => void) | null = null;
  private onResultsCallback: ((issues: TextlintResults) => void) | null = null;
  private onErrorCallback: ((message: string) => void) | null = null;
  private issues: TextlintResults = [];

  /**
   * Initialize the grammar service
   */
  async initialize(
    monacoInstance: typeof monaco,
    editorInstance: monaco.editor.IStandaloneCodeEditor
  ): Promise<void> {
    // Allow re-binding to a new editor/monaco if they change
    this.monaco = monacoInstance;
    this.editor = editorInstance;

    try {
      if (this.isInitialized && this.worker) {
        // Already initialized; just update editor refs
        return;
      }
      // Create web worker for textlint
      this.worker = new Worker(
        new URL('../workers/textlint.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        logger.error('Textlint worker error', error);
        if (this.onErrorCallback) {
          this.onErrorCallback('Grammar worker failed to run');
          this.onErrorCallback = null;
        }
      };

      // Register code action provider
      this.registerCodeActionProvider();

      this.isInitialized = true;
      logger.info('Grammar service initialized');
    } catch (error) {
      logger.error('Failed to initialize grammar service', error);
      throw error;
    }
  }

  /**
   * Check grammar of the current document
   * 
   * Sends text to web worker for processing and displays results as Monaco markers.
   * 
   * @param text - Text content to check
   * @param filePath - File path for context (defaults to 'document.md')
   * @param onComplete - Optional callback called with issue count when check completes
   * @returns Promise that resolves when check is initiated
   */
  async checkGrammar(
    text: string, 
    filePath: string = 'document.md',
    onComplete?: (issueCount: number) => void,
    onResults?: (issues: TextlintResults) => void,
    onError?: (message: string) => void
  ): Promise<void> {
    try {
      // Ensure initialized before running
      if (!this.isInitialized || !this.worker || !this.monaco || !this.editor) {
        logger.warn('Grammar service not initialized');
        if (onComplete) onComplete(0);
        if (onResults) onResults([]);
        if (onError) onError('Grammar service not initialized');
        return;
      }
      this.monaco.editor.setModelMarkers(this.editor.getModel()!, 'grammar', []);
      // Store callback for when results arrive
      this.onCompleteCallback = onComplete || null;
      this.onResultsCallback = onResults || null;
      this.onErrorCallback = onError || null;
      
      logger.info('Starting grammar check', { textLength: text.length, filePath });
      
      // Load textlint config
      const config: Record<string, unknown> = await this.loadTextlintConfig();

      // Send text to worker for processing
      this.worker.postMessage({
        text,
        filePath,
        config,
      });
    } catch (error) {
      logger.error('Failed to check grammar', error);
      if (this.onCompleteCallback) {
        this.onCompleteCallback(0);
        this.onCompleteCallback = null;
      }
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error.message : 'Unknown error');
        this.onErrorCallback = null;
      }
    }
  }

  /**
   * Load textlint configuration
   */
  private async loadTextlintConfig(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch('/.textlintrc.json');
      if (response.ok) {
        const config = await response.json();
        return config as Record<string, unknown>;
      }
    } catch (error) {
      logger.warn('Failed to load textlint config, using defaults', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Default config
    return {
      rules: {
        // Spelling rule using nspell
        'spelling': {
          language: 'en',
        },
        'common-misspellings': true,
        'write-good': {
          passive: true,
          weasel: true,
          adverb: true,
          tooWordy: true,
          cliches: true,
          thereIs: true,
          eprime: false, // e-prime can be too aggressive
        },
      },
      filters: {
        comments: true,
      },
    };
  }

  /**
   * Handle message from web worker
   */
  private handleWorkerMessage(data: { success: boolean; results?: TextlintResults; error?: string }): void {
    if (!this.monaco || !this.editor) {
      return;
    }

    if (!data.success) {
      logger.error('Grammar check failed', data.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(data.error || 'Grammar check failed');
        this.onErrorCallback = null;
      }
      if (this.onResultsCallback) {
        this.onResultsCallback([]);
        this.onResultsCallback = null;
      }
      if (this.onCompleteCallback) {
        this.onCompleteCallback(0);
        this.onCompleteCallback = null;
      }
      // Clear markers and signal failure
      const model = this.editor.getModel();
      if (model) {
        this.monaco.editor.setModelMarkers(model, 'grammar', []);
      }
      return;
    }

    if (!data.results) {
      if (this.onCompleteCallback) {
        this.onCompleteCallback(0);
        this.onCompleteCallback = null;
      }
      return;
    }

    // Convert textlint results to Monaco markers
    this.issues = data.results || [];
    this.markers = this.convertToMarkers(this.issues);
    
    logger.info('Grammar check complete', { issueCount: this.markers.length });

    // Set markers in editor
    const model = this.editor.getModel();
    if (model) {
      this.monaco.editor.setModelMarkers(model, 'grammar', this.markers);
    }
    
    // Call completion callback with issue count
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

  /**
   * Convert textlint results to Monaco markers
   */
  private convertToMarkers(results: TextlintResults): monaco.editor.IMarkerData[] {
    const markers: monaco.editor.IMarkerData[] = [];

    for (const result of results) {
      if (!result.messages || !Array.isArray(result.messages)) {
        continue;
      }

      for (const message of result.messages) {
        markers.push({
          severity: this.monaco!.MarkerSeverity.Warning,
          startLineNumber: message.line || 1,
          startColumn: message.column || 1,
          endLineNumber: message.line || 1,
          endColumn: (message.column || 1) + (message.range?.[1] || message.length || 0),
          message: message.message || 'Grammar issue',
          source: 'textlint',
          code: message.ruleId,
        });
      }
    }

    return markers;
  }


  /**
   * Register code action provider for grammar fixes
   */
  private registerCodeActionProvider(): void {
    if (!this.monaco || !this.editor) {
      return;
    }

    this.codeActionProvider = this.monaco.languages.registerCodeActionProvider('markdown', {
      provideCodeActions: (model, _range, context) => {
        const actions: monaco.languages.CodeAction[] = [];

        // Match markers within range
        const matchingMarkers = context.markers.filter((marker) => marker.source === 'textlint');

        for (const marker of matchingMarkers) {
          // Find corresponding issue with fix
          const issue = this.findIssueForMarker(marker);
          if (issue && issue.fix) {
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
        }

        return {
          actions,
          dispose: () => {},
        };
      },
    });
  }

  private findIssueForMarker(marker: monaco.editor.IMarkerData): { fix?: { range: [number, number]; text: string } } | null {
    for (const result of this.issues) {
      for (const message of result.messages) {
        if (
          (message.line || 1) === marker.startLineNumber &&
          (message.column || 1) === marker.startColumn
        ) {
          return { fix: message.fix };
        }
      }
    }
    return null;
  }

  /**
   * Clear all grammar markers from the editor
   * 
   * Removes all grammar-related markers and clears internal marker list.
   */
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

  /**
   * Cleanup and dispose resources
   */
  cleanup(): void {
    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      if (this.codeActionProvider) {
        this.codeActionProvider.dispose();
        this.codeActionProvider = null;
      }

      this.clearMarkers();

      this.isInitialized = false;
      this.monaco = null;
      this.editor = null;
    } catch (error) {
      logger.error('Error during grammar service cleanup', error);
    }
  }
}
