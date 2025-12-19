import type * as monaco from 'monaco-editor';
import { logger } from '@md-crafter/shared';
import { DictionaryService } from './dictionary';
import { getAllSupplementaryWords, getSupplementaryDictionaries, isInSupplementaryDictionary, ensureDictionariesLoaded } from '../data/supplementary-dictionaries';

const SPELLCHECK_DEBOUNCE_MS = 300;

// nspell instance type
interface NSpellInstance {
  correct(word: string): boolean;
  suggest(word: string): string[];
  add(word: string): void;
}

/**
 * Service for managing real-time spellchecking in Monaco Editor
 * 
 * Uses nspell (Hunspell-compatible) for dictionary-based spellchecking.
 * Provides debounced real-time checking with Monaco markers.
 * 
 * Uses singleton pattern to avoid React 18 StrictMode double-initialization issues.
 */
export class SpellcheckService {
  // Singleton instance
  private static instance: SpellcheckService | null = null;
  
  private monaco: typeof monaco | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private spellchecker: NSpellInstance | null = null;
  private dictionaryService: DictionaryService;
  private isInitialized = false;
  private isInitializing = false;
  private isEnabled = false;
  private loadingPromise: Promise<void> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private contentChangeDisposable: monaco.IDisposable | null = null;
  private codeActionDisposable: monaco.IDisposable | null = null;
  private actionDisposables: monaco.IDisposable[] = [];

  constructor() {
    this.dictionaryService = DictionaryService.getInstance();
  }

  /**
   * Get the singleton instance of SpellcheckService
   * This ensures only one instance exists, avoiding React 18 StrictMode issues
   */
  static getInstance(): SpellcheckService {
    if (!SpellcheckService.instance) {
      SpellcheckService.instance = new SpellcheckService();
    }
    return SpellcheckService.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes)
   */
  static resetInstance(): void {
    if (SpellcheckService.instance) {
      SpellcheckService.instance.cleanup();
      SpellcheckService.instance = null;
    }
  }

  /**
   * Initialize the spellchecker service
   * Safe to call multiple times - will wait if initialization is in progress
   */
  async initialize(
    monacoInstance: typeof monaco,
    editorInstance: monaco.editor.IStandaloneCodeEditor
  ): Promise<void> {
    // Already initialized with this editor
    if (this.isInitialized && this.editor === editorInstance) {
      return;
    }

    // Another initialization in progress - wait for it
    if (this.isInitializing) {
      // Wait for current initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      // Re-check if now initialized with the same editor
      if (this.isInitialized && this.editor === editorInstance) {
        return;
      }
    }

    // If switching to a different editor, dispose old providers first
    // This prevents duplicate providers when exiting diff view or switching editors
    if (this.isInitialized && this.editor !== editorInstance) {
      this.disposeProviders();
      this.disable(); // Detach content listener from old editor
      this.isInitialized = false;
    }

    this.isInitializing = true;
    this.monaco = monacoInstance;
    this.editor = editorInstance;

    try {
      // Load nspell and dictionary
      await this.loadDictionary();

      // Register global commands for spellcheck actions
      this.registerSpellcheckActions();

      // Register code action provider for quick fixes in hover
      this.registerCodeActionProvider();

      // Disable the lightbulb icon (we use hover quick fixes instead)
      this.editor.updateOptions({
        lightbulb: { enabled: false },
      });

      this.isInitialized = true;
      logger.info('Spellchecker initialized with nspell');
    } catch (error) {
      logger.error('Failed to initialize spellchecker', error);
      throw new Error('Spellcheck initialization failed');
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Load dictionary files and initialize nspell
   */
  private async loadDictionary(): Promise<void> {
    if (this.spellchecker) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        // Dynamic import of nspell
        const nspellModule = await import('nspell');
        const nspell = nspellModule.default || nspellModule;

        // Load dictionary files from public directory
        const [affResponse, dicResponse] = await Promise.all([
          fetch('/dictionaries/en_US/en_US.aff'),
          fetch('/dictionaries/en_US/en_US.dic'),
        ]);

        if (!affResponse.ok || !dicResponse.ok) {
          throw new Error('Failed to load dictionary files');
        }

        const affText = await affResponse.text();
        const dicText = await dicResponse.text();

        // Create nspell instance
        this.spellchecker = nspell(affText, dicText) as NSpellInstance;

        // Load supplementary dictionaries (tech terms, acronyms, etc.)
        let supplementaryWordCount = 0;
        try {
          await ensureDictionariesLoaded();
          const supplementaryWords = getAllSupplementaryWords();
          supplementaryWords.forEach((word) => {
            this.spellchecker?.add(word);
          });
          supplementaryWordCount = supplementaryWords.length;
          
          const dictionaries = getSupplementaryDictionaries();
          logger.info('Supplementary dictionaries loaded', {
            dictionaryCount: dictionaries.length,
            wordCount: supplementaryWordCount,
          });
        } catch (error) {
          // Non-fatal - spellcheck will work without supplementary dictionaries
          logger.warn('Failed to load supplementary dictionaries', { error });
        }

        // Add custom dictionary words
        const customWords = this.dictionaryService.getCustomDictionary();
        customWords.forEach((word) => {
          this.spellchecker?.add(word);
        });

        logger.info('Dictionary loaded with nspell', {
          supplementaryWords: supplementaryWordCount,
          customWords: customWords.length,
        });
      } catch (error) {
        logger.error('Failed to load dictionary', error);
        throw error;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Check if a word is spelled correctly
   */
  checkWord(word: string): boolean {
    if (!this.spellchecker) return true;
    
    // Skip if word is in ignored list or custom dictionary
    if (this.dictionaryService.shouldIgnore(word)) {
      return true;
    }

    // Skip numbers, URLs, and code-like tokens
    if (this.shouldSkipWord(word)) {
      return true;
    }

    return this.spellchecker.correct(word);
  }

  /**
   * Get spelling suggestions for a word
   */
  getSuggestions(word: string): string[] {
    if (!this.spellchecker) return [];
    return this.spellchecker.suggest(word) || [];
  }

  /**
   * Check if word should be skipped (numbers, URLs, code, etc.)
   */
  private shouldSkipWord(word: string): boolean {
    // Skip single characters
    if (word.length <= 1) return true;
    
    // Skip numbers
    if (/^\d+$/.test(word)) return true;
    
    // Skip words with numbers (likely code identifiers)
    if (/\d/.test(word)) return true;
    
    // Skip URLs and paths
    if (/^(https?:|\/|\.\/|\.\.\/|@)/.test(word)) return true;
    
    // Skip camelCase and PascalCase (likely code)
    if (/^[a-z]+[A-Z]/.test(word) || /^[A-Z][a-z]+[A-Z]/.test(word)) return true;
    
    // Skip words with underscores (likely code)
    if (word.includes('_')) return true;

    // For ALL_CAPS words, check if they're in our tech dictionary
    // If they are (e.g., API, REST, SSD), don't skip them - let spellcheck validate
    // If they're not, skip them (likely constants like MY_CONSTANT)
    if (/^[A-Z]+$/.test(word) && word.length > 1) {
      // Check if it's a known tech acronym
      if (isInSupplementaryDictionary(word)) {
        return false; // Don't skip - it's a known word, let spellcheck handle it
      }
      return true; // Skip unknown ALL_CAPS
    }

    return false;
  }

  /**
   * Enable spellchecking - starts listening for content changes
   */
  enable(): void {
    if (!this.isInitialized || !this.editor || !this.monaco) {
      logger.warn('Spellchecker not initialized');
      return;
    }

    if (this.isEnabled) {
      return;
    }

    // Listen for content changes
    this.contentChangeDisposable = this.editor.onDidChangeModelContent(() => {
      this.scheduleCheck();
    });

    this.isEnabled = true;
    
    // Run initial check
    this.checkDocument();
    
    logger.info('Spellchecking enabled');
  }

  /**
   * Disable spellchecking - stops listening and clears markers
   */
  disable(): void {
    if (!this.isEnabled) {
      return;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Dispose content change listener
    if (this.contentChangeDisposable) {
      this.contentChangeDisposable.dispose();
      this.contentChangeDisposable = null;
    }

    // Clear markers
    this.clearMarkers();

    this.isEnabled = false;
    logger.info('Spellchecking disabled');
  }

  /**
   * Schedule a debounced spell check
   */
  private scheduleCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.checkDocument();
    }, SPELLCHECK_DEBOUNCE_MS);
  }

  /**
   * Check the entire document for spelling errors
   */
  private checkDocument(): void {
    if (!this.editor || !this.monaco || !this.spellchecker) {
      return;
    }

    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    const text = model.getValue();
    const markers: monaco.editor.IMarkerData[] = [];

    // Extract words and check spelling
    // Match words but skip code blocks
    const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
    const codeBlocks: Array<{ start: number; end: number }> = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({ start: match.index, end: match.index + match[0].length });
    }

    // Word matching regex - captures word boundaries
    const wordRegex = /\b([a-zA-Z']+)\b/g;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      const startOffset = match.index;
      
      // Skip if word is inside a code block
      const inCodeBlock = codeBlocks.some(
        (block) => startOffset >= block.start && startOffset < block.end
      );
      
      if (inCodeBlock) {
        continue;
      }

      // Check spelling
      if (!this.checkWord(word)) {
        const startPos = model.getPositionAt(startOffset);
        const endPos = model.getPositionAt(startOffset + word.length);

        markers.push({
          severity: this.monaco.MarkerSeverity.Hint,
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
          message: `"${word}" may be misspelled`,
          source: 'spellcheck',
          code: word, // Store original word for suggestions
        });
      }
    }

    // Set markers
    this.monaco.editor.setModelMarkers(model, 'spellcheck', markers);
  }

  /**
   * Register global commands that can be invoked from hover command URIs
   * Uses monaco.editor.registerCommand() which registers in the global command registry
   * that Monaco's link opener uses for command:id?args URIs
   */
  private registerSpellcheckActions(): void {
    if (!this.editor || !this.monaco) {
      return;
    }

    // Command to replace a misspelled word with a suggestion
    const replaceCommand = this.monaco.editor.registerCommand(
      'spellcheck.replaceWord',
      (_accessor, replacement: string, startLine: number, startCol: number, endLine: number, endCol: number) => {
        if (!this.editor || !this.monaco) return;
        
        const model = this.editor.getModel();
        if (!model) return;

        const range = new this.monaco.Range(startLine, startCol, endLine, endCol);
        model.pushEditOperations([], [{ range, text: replacement }], () => null);
        
        // Re-check document after replacement
        this.checkDocument();
      }
    );
    this.actionDisposables.push(replaceCommand);

    // Command to add word to dictionary
    const addToDictCommand = this.monaco.editor.registerCommand(
      'spellcheck.addToDictionary',
      (_accessor, word: string) => {
        if (word) {
          this.addToDictionary(word);
          this.checkDocument();
        }
      }
    );
    this.actionDisposables.push(addToDictCommand);

    // Command to ignore word
    const ignoreCommand = this.monaco.editor.registerCommand(
      'spellcheck.ignoreWord',
      (_accessor, word: string) => {
        if (word) {
          this.addToIgnore(word);
          this.checkDocument();
        }
      }
    );
    this.actionDisposables.push(ignoreCommand);
  }

  /**
   * Register code action provider for spelling suggestions (appears in hover quick fixes)
   */
  private registerCodeActionProvider(): void {
    if (!this.monaco) {
      return;
    }

    this.codeActionDisposable = this.monaco.languages.registerCodeActionProvider('markdown', {
      provideCodeActions: (model, _range, context) => {
        const actions: monaco.languages.CodeAction[] = [];

        // Filter for spellcheck markers
        const spellMarkers = context.markers.filter((m) => m.source === 'spellcheck');

        for (const marker of spellMarkers) {
          const word = marker.code as string;
          if (!word) continue;

          // Add replacement suggestions
          const suggestions = this.getSuggestions(word);
          for (const suggestion of suggestions.slice(0, 5)) {
            actions.push({
              title: `Change to "${suggestion}"`,
              kind: 'quickfix',
              diagnostics: [marker],
              edit: {
                edits: [
                  {
                    resource: model.uri,
                    versionId: model.getVersionId?.(),
                    textEdit: {
                      range: new this.monaco!.Range(
                        marker.startLineNumber,
                        marker.startColumn,
                        marker.endLineNumber,
                        marker.endColumn
                      ),
                      text: suggestion,
                    },
                  },
                ],
              },
            });
          }

          // Add "Add to Dictionary" action
          actions.push({
            title: `Add "${word}" to dictionary`,
            kind: 'quickfix',
            diagnostics: [marker],
            command: {
              id: 'spellcheck.addToDictionary',
              title: 'Add to Dictionary',
              arguments: [word],
            },
          });

          // Add "Ignore" action
          actions.push({
            title: `Ignore "${word}"`,
            kind: 'quickfix',
            diagnostics: [marker],
            command: {
              id: 'spellcheck.ignoreWord',
              title: 'Ignore',
              arguments: [word],
            },
          });
        }

        return {
          actions,
          dispose: () => {},
        };
      },
    });
  }

  /**
   * Clear all spellcheck markers
   */
  private clearMarkers(): void {
    if (!this.monaco || !this.editor) {
      return;
    }

    const model = this.editor.getModel();
    if (model) {
      this.monaco.editor.setModelMarkers(model, 'spellcheck', []);
    }
  }

  /**
   * Add word to ignore list (via DictionaryService)
   */
  addToIgnore(word: string): void {
    this.dictionaryService.addToIgnore(word);
  }

  /**
   * Remove word from ignore list (via DictionaryService)
   */
  removeFromIgnore(word: string): void {
    this.dictionaryService.removeFromIgnore(word);
  }

  /**
   * Add word to custom dictionary (via DictionaryService)
   * Note: We don't add to nspell directly because nspell has no remove method.
   * Instead, checkWord() checks shouldIgnore() first, which handles custom dictionary.
   */
  addToDictionary(word: string): void {
    this.dictionaryService.addToDictionary(word);
  }

  /**
   * Remove word from custom dictionary (via DictionaryService)
   * Note: nspell doesn't support removal, so we rely on checkWord() filtering
   */
  removeFromDictionary(word: string): void {
    this.dictionaryService.removeFromDictionary(word);
  }

  /**
   * Refresh spellcheck markers - recheck the entire document
   * Call this after dictionary changes to apply them immediately
   */
  refreshSpellcheck(): void {
    if (this.isEnabled) {
      this.checkDocument();
    }
  }

  /**
   * Get ignored words (via DictionaryService)
   */
  getIgnoredWords(): string[] {
    return this.dictionaryService.getIgnoredWords();
  }

  /**
   * Get custom dictionary (via DictionaryService)
   */
  getCustomDictionary(): string[] {
    return this.dictionaryService.getCustomDictionary();
  }

  /**
   * Dispose all registered providers without full cleanup
   * Used when switching editor instances to prevent duplicate providers
   */
  private disposeProviders(): void {
    // Dispose code action provider
    if (this.codeActionDisposable) {
      this.codeActionDisposable.dispose();
      this.codeActionDisposable = null;
    }

    // Dispose global commands
    this.actionDisposables.forEach((d) => d.dispose());
    this.actionDisposables = [];
  }

  /**
   * Cleanup and dispose all resources
   */
  cleanup(): void {
    try {
      this.disable();
      this.disposeProviders();

      this.spellchecker = null;
      this.isInitialized = false;
      this.monaco = null;
      this.editor = null;
      this.loadingPromise = null;
    } catch (error) {
      logger.error('Error during spellchecker cleanup', error);
    }
  }
}
