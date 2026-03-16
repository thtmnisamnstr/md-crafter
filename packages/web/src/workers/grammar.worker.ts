import type { TextlintMessage, TextlintResults } from '../types/textlint';

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

interface RawIssue {
  start: number;
  end: number;
  message: string;
  ruleId: string;
  fixText?: string;
}

const COMMON_MISSPELLINGS: Record<string, string> = {
  alot: 'a lot',
  definately: 'definitely',
  recieve: 'receive',
  seperate: 'separate',
  occured: 'occurred',
  untill: 'until',
  teh: 'the',
};

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

function offsetToLineColumn(offset: number, lineStarts: number[]): { line: number; column: number } {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      if (mid === lineStarts.length - 1 || lineStarts[mid + 1] > offset) {
        return { line: mid + 1, column: offset - lineStarts[mid] + 1 };
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return { line: 1, column: 1 };
}

function collectRepeatedWordIssues(text: string): RawIssue[] {
  const issues: RawIssue[] = [];
  const regex = /\b([A-Za-z]+)\s+\1\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const full = match[0];
    const word = match[1];
    const firstEnd = match.index + word.length;
    const whitespace = full.slice(word.length).match(/^\s+/)?.[0] || ' ';
    const secondStart = firstEnd + whitespace.length;
    const secondEnd = secondStart + word.length;
    issues.push({
      start: secondStart,
      end: secondEnd,
      message: `Repeated word "${word}"`,
      ruleId: 'repeated-word',
      fixText: '',
    });
    if (issues.length > 100) break;
  }
  return issues;
}

function collectMisspellingIssues(text: string): RawIssue[] {
  const issues: RawIssue[] = [];
  for (const [wrong, right] of Object.entries(COMMON_MISSPELLINGS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        start: match.index,
        end: match.index + match[0].length,
        message: `"${match[0]}" may be misspelled`,
        ruleId: 'common-misspelling',
        fixText: right,
      });
      if (issues.length > 100) break;
    }
  }
  return issues;
}

function collectSpacingIssues(text: string): RawIssue[] {
  const issues: RawIssue[] = [];
  const regex = / {2,}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    issues.push({
      start: match.index,
      end: match.index + match[0].length,
      message: 'Multiple consecutive spaces',
      ruleId: 'extra-spacing',
      fixText: ' ',
    });
    if (issues.length > 100) break;
  }
  return issues;
}

function collectPassiveVoiceIssues(text: string): RawIssue[] {
  const issues: RawIssue[] = [];
  const regex = /\b(am|is|are|was|were|be|been|being)\s+[A-Za-z]+ed\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    issues.push({
      start: match.index,
      end: match.index + match[0].length,
      message: 'Possible passive voice',
      ruleId: 'passive-voice',
    });
    if (issues.length > 100) break;
  }
  return issues;
}

function collectThereIsIssues(text: string): RawIssue[] {
  const issues: RawIssue[] = [];
  const regex = /\bThere (is|are|was|were)\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    issues.push({
      start: match.index,
      end: match.index + match[0].length,
      message: 'Consider a stronger sentence opening than "There is/are"',
      ruleId: 'weak-opening',
    });
    if (issues.length > 100) break;
  }
  return issues;
}

function collectLongSentenceIssues(text: string): RawIssue[] {
  const issues: RawIssue[] = [];
  const regex = /[^.!?]+[.!?]?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0];
    const words = sentence.trim().match(/\b[\w'-]+\b/g) || [];
    if (words.length <= 32) continue;
    const start = match.index;
    const end = Math.min(match.index + sentence.length, start + 120);
    issues.push({
      start,
      end,
      message: `Long sentence (${words.length} words). Consider splitting it.`,
      ruleId: 'long-sentence',
    });
    if (issues.length > 50) break;
  }
  return issues;
}

function toTextlintMessages(text: string, rawIssues: RawIssue[]): TextlintMessage[] {
  const lineStarts = computeLineStarts(text);
  const sorted = [...rawIssues].sort((a, b) => a.start - b.start || a.end - b.end);
  const messages: TextlintMessage[] = [];

  for (const issue of sorted) {
    const start = Math.max(0, Math.min(issue.start, text.length));
    const end = Math.max(start + 1, Math.min(issue.end, text.length));
    const { line, column } = offsetToLineColumn(start, lineStarts);
    const message: TextlintMessage = {
      message: issue.message,
      line,
      column,
      range: [start, end],
      length: end - start,
      ruleId: issue.ruleId,
    };
    if (issue.fixText !== undefined) {
      message.fix = {
        range: [start, end],
        text: issue.fixText,
      };
    }
    messages.push(message);
    if (messages.length >= 200) break;
  }

  return messages;
}

function runGrammarChecks(text: string, filePath: string): TextlintResults {
  const issues = [
    ...collectRepeatedWordIssues(text),
    ...collectMisspellingIssues(text),
    ...collectSpacingIssues(text),
    ...collectPassiveVoiceIssues(text),
    ...collectThereIsIssues(text),
    ...collectLongSentenceIssues(text),
  ];

  const messages = toTextlintMessages(text, issues);
  return [
    {
      filePath: filePath || 'document.md',
      messages,
    },
  ];
}

self.onmessage = (event: MessageEvent<GrammarWorkerRequest>) => {
  const { data } = event;
  if (!data || data.type !== 'check') {
    return;
  }

  try {
    const issues = runGrammarChecks(data.text || '', data.filePath || 'document.md');
    const response: GrammarWorkerResponse = {
      type: 'result',
      requestId: data.requestId,
      success: true,
      issues,
    };
    self.postMessage(response);
  } catch (error) {
    const response: GrammarWorkerResponse = {
      type: 'result',
      requestId: data.requestId,
      success: false,
      error: error instanceof Error ? error.message : 'Grammar worker error',
    };
    self.postMessage(response);
  }
};
