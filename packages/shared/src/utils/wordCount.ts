/**
 * Word and character counting utilities
 * 
 * Provides functions to count words and characters in text strings,
 * with support for various edge cases and formatting options.
 */

/**
 * Count words in a text string
 * 
 * A word is defined as a sequence of one or more non-whitespace characters.
 * Multiple consecutive spaces/tabs/newlines are treated as a single word separator.
 * 
 * @param text - The text to count words in
 * @returns The number of words
 * 
 * @example
 * countWords("Hello world") // 2
 * countWords("  Hello   world  ") // 2
 * countWords("") // 0
 * countWords("   ") // 0
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  
  // Split by whitespace and filter out empty strings
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Count characters in a text string
 * 
 * @param text - The text to count characters in
 * @param includeWhitespace - Whether to include whitespace in count (default: true)
 * @returns The number of characters
 * 
 * @example
 * countCharacters("Hello") // 5
 * countCharacters("Hello world") // 11
 * countCharacters("Hello world", false) // 10 (excludes space)
 */
export function countCharacters(text: string, includeWhitespace: boolean = true): number {
  if (!text) {
    return 0;
  }
  
  if (!includeWhitespace) {
    return text.replace(/\s/g, '').length;
  }
  
  return text.length;
}

/**
 * Get word and character counts for a text string
 * 
 * @param text - The text to analyze
 * @param includeWhitespace - Whether to include whitespace in character count (default: true)
 * @returns Object with wordCount and charCount
 */
export function getTextStats(text: string, includeWhitespace: boolean = true): {
  wordCount: number;
  charCount: number;
} {
  return {
    wordCount: countWords(text),
    charCount: countCharacters(text, includeWhitespace),
  };
}

