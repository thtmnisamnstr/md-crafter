/**
 * Type definitions for nspell (Hunspell-compatible spellchecker)
 */

declare module 'nspell' {
  interface NSpellInstance {
    /** Check if a word is spelled correctly */
    correct(word: string): boolean;
    /** Get spelling suggestions for a word */
    suggest(word: string): string[];
    /** Add a word to the dictionary */
    add(word: string): void;
    /** Remove a word from the dictionary */
    remove?(word: string): void;
    /** Get all words in the personal dictionary */
    personal?(): string[];
  }

  function nspell(aff: string, dic: string): NSpellInstance;
  
  export = nspell;
}

