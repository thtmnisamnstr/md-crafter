/**
 * Type definitions for textlint results
 * 
 * These are minimal types based on how textlint results are used in the codebase.
 * textlint has its own types, but we define compatible ones for our usage.
 */

export interface TextlintMessage {
  message: string;
  line?: number;
  column?: number;
  range?: readonly [number, number] | [number, number];
  length?: number;
  severity?: number;
  ruleId?: string;
  fix?: {
    range: [number, number];
    text: string;
  };
  position?: {
    line: number;
    column: number;
  };
}

export interface TextlintResult {
  filePath: string;
  messages: TextlintMessage[];
}

export type TextlintResults = TextlintResult[];
