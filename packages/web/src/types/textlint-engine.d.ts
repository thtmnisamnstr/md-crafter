/**
 * Type definitions for textlint engine
 * 
 * Minimal types for textlint TextLintEngine.
 * textlint doesn't provide official TypeScript types.
 */

import type { TextlintResults } from './textlint';

export interface TextlintConfig {
  rules?: Record<string, boolean | Record<string, unknown>>;
  filters?: Record<string, boolean>;
}

export interface TextlintEngine {
  executeOnText(text: string, filePath: string): Promise<TextlintResults>;
}
