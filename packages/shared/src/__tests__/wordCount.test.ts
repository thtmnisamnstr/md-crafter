import { describe, it, expect } from 'vitest';
import { countWords, countCharacters, getTextStats } from '../utils/wordCount.js';

describe('countWords', () => {
  it('should count words in simple text', () => {
    expect(countWords('Hello world')).toBe(2);
  });

  it('should handle multiple spaces', () => {
    expect(countWords('Hello   world')).toBe(2);
  });

  it('should return 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('should return 0 for whitespace only', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('should handle single word', () => {
    expect(countWords('Hello')).toBe(1);
  });

  it('should handle text with newlines', () => {
    expect(countWords('Hello\nworld\ntest')).toBe(3);
  });

  it('should handle text with tabs', () => {
    expect(countWords('Hello\tworld')).toBe(2);
  });

  it('should handle mixed whitespace', () => {
    expect(countWords('Hello  \n  world')).toBe(2);
  });

  it('should handle punctuation', () => {
    expect(countWords('Hello, world!')).toBe(2);
  });

  it('should handle numbers', () => {
    expect(countWords('123 456')).toBe(2);
  });

  it('should handle unicode characters', () => {
    expect(countWords('Hello 世界')).toBe(2);
  });

  it('should handle text with leading/trailing whitespace', () => {
    expect(countWords('  Hello world  ')).toBe(2);
  });

  it('should handle multiple consecutive newlines', () => {
    expect(countWords('Hello\n\n\nworld')).toBe(2);
  });
});

describe('countCharacters', () => {
  it('should count characters in basic text', () => {
    expect(countCharacters('Hello')).toBe(5);
  });

  it('should count characters with spaces', () => {
    expect(countCharacters('Hello world')).toBe(11);
  });

  it('should return 0 for empty string', () => {
    expect(countCharacters('')).toBe(0);
  });

  it('should include whitespace by default', () => {
    expect(countCharacters('Hello world')).toBe(11);
  });

  it('should exclude whitespace when includeWhitespace is false', () => {
    expect(countCharacters('Hello world', false)).toBe(10);
  });

  it('should handle unicode characters', () => {
    expect(countCharacters('Hello 世界')).toBe(8);
    expect(countCharacters('Hello 世界', false)).toBe(7);
  });

  it('should handle newlines', () => {
    expect(countCharacters('Hello\nworld')).toBe(11);
    expect(countCharacters('Hello\nworld', false)).toBe(10);
  });

  it('should handle tabs', () => {
    expect(countCharacters('Hello\tworld')).toBe(11);
    expect(countCharacters('Hello\tworld', false)).toBe(10);
  });

  it('should handle mixed whitespace', () => {
    expect(countCharacters('Hello  \n  world')).toBe(15);
    expect(countCharacters('Hello  \n  world', false)).toBe(10);
  });

  it('should handle punctuation', () => {
    expect(countCharacters('Hello, world!')).toBe(13);
    expect(countCharacters('Hello, world!', false)).toBe(12);
  });
});

describe('getTextStats', () => {
  it('should return both wordCount and charCount', () => {
    const stats = getTextStats('Hello world');
    expect(stats).toHaveProperty('wordCount');
    expect(stats).toHaveProperty('charCount');
    expect(stats.wordCount).toBe(2);
    expect(stats.charCount).toBe(11);
  });

  it('should handle empty strings', () => {
    const stats = getTextStats('');
    expect(stats.wordCount).toBe(0);
    expect(stats.charCount).toBe(0);
  });

  it('should respect includeWhitespace parameter', () => {
    const statsWithWhitespace = getTextStats('Hello world', true);
    const statsWithoutWhitespace = getTextStats('Hello world', false);
    
    expect(statsWithWhitespace.charCount).toBe(11);
    expect(statsWithoutWhitespace.charCount).toBe(10);
    expect(statsWithWhitespace.wordCount).toBe(2);
    expect(statsWithoutWhitespace.wordCount).toBe(2);
  });

  it('should handle unicode text', () => {
    const stats = getTextStats('Hello 世界');
    expect(stats.wordCount).toBe(2);
    expect(stats.charCount).toBe(8);
  });

  it('should handle multiline text', () => {
    const stats = getTextStats('Hello\nworld\ntest');
    expect(stats.wordCount).toBe(3);
    expect(stats.charCount).toBe(16); // 5 + 1 + 5 + 1 + 4 = 16
  });
});

