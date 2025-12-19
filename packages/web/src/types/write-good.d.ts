declare module 'write-good' {
  interface Suggestion {
    index: number;
    offset: number;
    reason: string;
  }

  interface WriteGoodOptions {
    passive?: boolean;
    weasel?: boolean;
    adverb?: boolean;
    tooWordy?: boolean;
    cliches?: boolean;
    eprime?: boolean;
    whitelist?: string[];
  }

  function writeGood(text: string, options?: WriteGoodOptions): Suggestion[];
  export default writeGood;
}

