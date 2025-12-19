/**
 * Web Worker for running textlint grammar checking
 * 
 * Runs textlint in a separate thread to avoid blocking the main UI thread.
 */

import type { TextlintEngine, TextlintConfig } from '../types/textlint-engine';
import type { TextlintResults } from '../types/textlint';
import { logger } from '@md-crafter/shared';

// Import textlint dynamically
let textlintEngine: TextlintEngine | null = null;
let config: TextlintConfig | null = null;

async function initializeTextlint() {
  if (textlintEngine) {
    return;
  }

  try {
    // Dynamic import of textlint
    // Note: textlint requires Node.js polyfills which are provided by vite-plugin-node-polyfills
    const textlintModule = await import('textlint') as unknown as { 
      TextLintEngine: new (config?: TextlintConfig | object) => {
        executeOnText(text: string, filePath: string): Promise<TextlintResults>;
      }
    };
    
    // TextLintEngine is the main entry point for textlint
    // In browser environment, we need to ensure polyfills are available
    const { TextLintEngine } = textlintModule;

    // Default configuration - can be overridden by customConfig
    config = {
      rules: {
        // Spelling rule using nspell (Hunspell-compatible)
        'spelling': {
          language: 'en',
          // Skip code blocks and inline code
          skipPatterns: [/```[\s\S]*?```/, /`[^`]+`/],
        },
        // Common misspellings rule
        'common-misspellings': true,
        // Write-good rule for style checking
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

    // Create textlint engine with configuration
    textlintEngine = new TextLintEngine(config) as TextlintEngine;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    self.postMessage({
      success: false,
      error: `Failed to initialize textlint: ${errorMessage}. Make sure Node.js polyfills are available.`,
    });
    throw error;
  }
}

self.onmessage = async (event) => {
  const { text, filePath, config: customConfig } = event.data;

  try {
    // Initialize textlint if not already done
    await initializeTextlint();

    if (customConfig) {
      // Merge custom config with defaults
      config = {
        ...config,
        ...customConfig,
        rules: {
          ...config?.rules,
          ...customConfig?.rules,
        },
      };
      // Reinitialize with merged config
      const textlintModule = await import('textlint') as unknown as { 
        TextLintEngine: new (config?: TextlintConfig | object) => {
          executeOnText(text: string, filePath: string): Promise<TextlintResults>;
        }
      };
      const { TextLintEngine } = textlintModule;
      if (config) {
        textlintEngine = new TextLintEngine(config) as TextlintEngine;
      }
    }

    if (!textlintEngine) {
      throw new Error('Textlint engine not initialized');
    }

    // Execute linting
    const results = await textlintEngine.executeOnText(text, filePath || 'document.md');
    
    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      const totalIssues = results.reduce((sum, result) => sum + (result.messages?.length || 0), 0);
      logger.debug('Textlint results', { totalIssues, filePath: filePath || 'document.md' });
      logger.debug(`Textlint found ${totalIssues} issue(s)`);
    }

    self.postMessage({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Textlint error', error);
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
