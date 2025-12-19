import { logger } from '@md-crafter/shared';

const IGNORED_WORDS_KEY = 'md-crafter-spellcheck-ignored';
const CUSTOM_DICT_KEY = 'md-crafter-spellcheck-custom';

/**
 * Shared dictionary management service
 * 
 * Provides centralized management for custom dictionary words and ignored words.
 * Used by both SpellcheckService (real-time) and GrammarService (on-demand).
 */
export class DictionaryService {
  private static instance: DictionaryService | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): DictionaryService {
    if (!DictionaryService.instance) {
      DictionaryService.instance = new DictionaryService();
    }
    return DictionaryService.instance;
  }

  /**
   * Get ignored words from localStorage
   */
  getIgnoredWords(): string[] {
    try {
      const stored = localStorage.getItem(IGNORED_WORDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get custom dictionary from localStorage
   */
  getCustomDictionary(): string[] {
    try {
      const stored = localStorage.getItem(CUSTOM_DICT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Add word to ignore list
   * @param word - Word to ignore (case-insensitive)
   * @returns true if word was added, false if already exists
   */
  addToIgnore(word: string): boolean {
    try {
      const ignored = this.getIgnoredWords();
      const lowerWord = word.toLowerCase();
      
      if (!ignored.includes(lowerWord)) {
        ignored.push(lowerWord);
        localStorage.setItem(IGNORED_WORDS_KEY, JSON.stringify(ignored));
        logger.info('Word added to ignore list', { word: lowerWord });
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Failed to add word to ignore list', { error });
      return false;
    }
  }

  /**
   * Remove word from ignore list
   * @param word - Word to remove (case-insensitive)
   * @returns true if word was removed, false if not found
   */
  removeFromIgnore(word: string): boolean {
    try {
      const ignored = this.getIgnoredWords();
      const lowerWord = word.toLowerCase();
      const index = ignored.indexOf(lowerWord);
      
      if (index !== -1) {
        ignored.splice(index, 1);
        localStorage.setItem(IGNORED_WORDS_KEY, JSON.stringify(ignored));
        logger.info('Word removed from ignore list', { word: lowerWord });
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Failed to remove word from ignore list', { error });
      return false;
    }
  }

  /**
   * Add word to custom dictionary
   * @param word - Word to add (case-insensitive)
   * @returns true if word was added, false if already exists
   */
  addToDictionary(word: string): boolean {
    try {
      const custom = this.getCustomDictionary();
      const lowerWord = word.toLowerCase();
      
      if (!custom.includes(lowerWord)) {
        custom.push(lowerWord);
        localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(custom));
        logger.info('Word added to dictionary', { word: lowerWord });
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Failed to add word to dictionary', { error });
      return false;
    }
  }

  /**
   * Remove word from custom dictionary
   * @param word - Word to remove (case-insensitive)
   * @returns true if word was removed, false if not found
   */
  removeFromDictionary(word: string): boolean {
    try {
      const custom = this.getCustomDictionary();
      const lowerWord = word.toLowerCase();
      const index = custom.indexOf(lowerWord);
      
      if (index !== -1) {
        custom.splice(index, 1);
        localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(custom));
        logger.info('Word removed from dictionary', { word: lowerWord });
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Failed to remove word from dictionary', { error });
      return false;
    }
  }

  /**
   * Check if a word should be ignored (in ignore list or custom dictionary)
   */
  shouldIgnore(word: string): boolean {
    const lowerWord = word.toLowerCase();
    return (
      this.getIgnoredWords().includes(lowerWord) ||
      this.getCustomDictionary().includes(lowerWord)
    );
  }

  /**
   * Clear all ignored words
   */
  clearIgnoredWords(): void {
    try {
      localStorage.removeItem(IGNORED_WORDS_KEY);
      logger.info('Ignored words cleared');
    } catch (error) {
      logger.warn('Failed to clear ignored words', { error });
    }
  }

  /**
   * Clear custom dictionary
   */
  clearCustomDictionary(): void {
    try {
      localStorage.removeItem(CUSTOM_DICT_KEY);
      logger.info('Custom dictionary cleared');
    } catch (error) {
      logger.warn('Failed to clear custom dictionary', { error });
    }
  }

  /**
   * Export dictionary data as JSON
   */
  exportData(): { ignoredWords: string[]; customDictionary: string[] } {
    return {
      ignoredWords: this.getIgnoredWords(),
      customDictionary: this.getCustomDictionary(),
    };
  }

  /**
   * Import dictionary data from JSON
   * @param data - Dictionary data to import
   * @param merge - If true, merges with existing data. If false, replaces.
   */
  importData(
    data: { ignoredWords?: string[]; customDictionary?: string[] },
    merge = true
  ): void {
    try {
      if (data.ignoredWords) {
        const existing = merge ? this.getIgnoredWords() : [];
        const combined = [...new Set([...existing, ...data.ignoredWords.map(w => w.toLowerCase())])];
        localStorage.setItem(IGNORED_WORDS_KEY, JSON.stringify(combined));
      }

      if (data.customDictionary) {
        const existing = merge ? this.getCustomDictionary() : [];
        const combined = [...new Set([...existing, ...data.customDictionary.map(w => w.toLowerCase())])];
        localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(combined));
      }

      logger.info('Dictionary data imported', { merge });
    } catch (error) {
      logger.error('Failed to import dictionary data', error);
      throw new Error('Failed to import dictionary data');
    }
  }
}

// Export singleton getter for convenience
export const getDictionaryService = DictionaryService.getInstance;

