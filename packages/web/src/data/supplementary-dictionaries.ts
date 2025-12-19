/**
 * Supplementary dictionaries from CSpell packages
 * 
 * Loads domain-specific word lists for tech terms, acronyms, etc.
 * These augment the base English dictionary for better coverage.
 * 
 * Uses explicit static imports with Vite's ?raw suffix for plain text files,
 * and ?url suffix with pako for gzipped files.
 */

import { logger } from '@md-crafter/shared';
import pako from 'pako';

// Static imports for plain text dictionary files
// These are bundled at build time by Vite
import softwareTerms from '@cspell/dict-software-terms/dict/softwareTerms.txt?raw';
import softwareTools from '@cspell/dict-software-terms/dict/software-tools.txt?raw';
import codingCompoundTerms from '@cspell/dict-software-terms/dict/coding-compound-terms.txt?raw';
import computingAcronyms from '@cspell/dict-software-terms/dict/computing-acronyms.txt?raw';
import networkingTerms from '@cspell/dict-software-terms/dict/networkingTerms.txt?raw';
import webServices from '@cspell/dict-software-terms/dict/webServices.txt?raw';
import fullstack from '@cspell/dict-fullstack/dict/fullstack.txt?raw';
import aws from '@cspell/dict-aws/dict/aws.txt?raw';
import google from '@cspell/dict-google/dict/google.txt?raw';
import k8s from '@cspell/dict-k8s/dict/k8s.txt?raw';
import companies from '@cspell/dict-companies/dict/companies.txt?raw';
import gamingTerms from '@cspell/dict-gaming-terms/dict/gaming-terms.txt?raw';
import gameDevelopment from '@cspell/dict-gaming-terms/dict/game-development.txt?raw';

// URL imports for gzipped dictionary files (loaded at runtime)
import filetypesUrl from '@cspell/dict-filetypes/filetypes.txt.gz?url';
import markdownUrl from '@cspell/dict-markdown/markdown.txt.gz?url';

// Git dictionary words (embedded in JSON config, not a separate file)
const gitWords = [
  'add', 'am', 'applypatch', 'autocrlf', 'bare', 'bisect', 'blame', 'branch',
  'bundle', 'checkout', 'cherry-pick', 'citool', 'clean', 'clone', 'commit',
  'commit-ish', 'commitish', 'cygwin', 'describe', 'diff', 'EDITMSG', 'fetch',
  'filemode', 'format-patch', 'fsmonitor', 'gc', 'GIT_AUTHOR_IDENT', 'gitk',
  'grep', 'gui', 'helper', 'hook', 'ignorecase', 'init', 'instaweb', 'log',
  'logallrefupdates', 'merge', 'msg', 'mv', 'notes', 'precommit',
  'precomposeunicode', 'prepare', 'pull', 'push', 'rebase',
  'repositoryformatversion', 'reset', 'rev', 'revert', 'rm', 'shortlog',
  'show', 'stash', 'status', 'submodule', 'tag', 'watchman', 'whatchanged'
];

// Dictionary source definitions
export interface DictionarySource {
  id: string;
  name: string;
  description: string;
  words: string[];
  wordCount: number;
}

// Cache for processed dictionaries
let processedDictionaries: DictionarySource[] | null = null;
let allWords: Set<string> | null = null;
let loadingPromise: Promise<void> | null = null;

/**
 * Parse a dictionary text file into an array of words
 * CSpell dictionaries have one word per line, with optional comments starting with #
 */
function parseDictionaryFile(content: string): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(word => word.toLowerCase());
}

/**
 * Load and decompress a gzipped dictionary file from URL
 */
async function loadGzippedDictionary(url: string): Promise<string[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const decompressed = pako.inflate(new Uint8Array(buffer), { to: 'string' });
    return parseDictionaryFile(decompressed);
  } catch (error) {
    logger.debug('Failed to load gzipped dictionary', { url, error });
    return [];
  }
}

/**
 * Load and process all supplementary dictionaries
 */
async function loadDictionaries(): Promise<void> {
  if (processedDictionaries) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const dictionaries: DictionarySource[] = [];
    const allWordsSet = new Set<string>();

    // Process plain text dictionaries (already loaded via static imports)
    const plainTextDictionaries: Array<{
      id: string;
      name: string;
      description: string;
      contents: string[];
    }> = [
      {
        id: 'software-terms',
        name: 'Software Terms',
        description: 'General software and programming terms',
        contents: [softwareTerms, softwareTools, codingCompoundTerms],
      },
      {
        id: 'computing-acronyms',
        name: 'Computing Acronyms',
        description: 'Common tech acronyms (API, REST, SSD, etc.)',
        contents: [computingAcronyms],
      },
      {
        id: 'networking',
        name: 'Networking',
        description: 'Networking and web services terms',
        contents: [networkingTerms, webServices],
      },
      {
        id: 'fullstack',
        name: 'Fullstack Development',
        description: 'Web development terms',
        contents: [fullstack],
      },
      {
        id: 'aws',
        name: 'AWS',
        description: 'Amazon Web Services terms and service names',
        contents: [aws],
      },
      {
        id: 'google',
        name: 'Google Cloud',
        description: 'Google Cloud Platform terms',
        contents: [google],
      },
      {
        id: 'k8s',
        name: 'Kubernetes',
        description: 'Kubernetes and container orchestration terms',
        contents: [k8s],
      },
      {
        id: 'companies',
        name: 'Companies',
        description: 'Popular company and brand names',
        contents: [companies],
      },
      {
        id: 'gaming',
        name: 'Gaming Terms',
        description: 'Gaming and game development terms',
        contents: [gamingTerms, gameDevelopment],
      },
    ];

    // Process plain text dictionaries
    for (const dict of plainTextDictionaries) {
      const words: string[] = [];
      for (const content of dict.contents) {
        words.push(...parseDictionaryFile(content));
      }
      const uniqueWords = [...new Set(words)];
      if (uniqueWords.length > 0) {
        dictionaries.push({
          id: dict.id,
          name: dict.name,
          description: dict.description,
          words: uniqueWords,
          wordCount: uniqueWords.length,
        });
        uniqueWords.forEach(word => allWordsSet.add(word));
      }
    }

    // Add git dictionary (embedded words)
    const gitWordsLower = gitWords.map(w => w.toLowerCase());
    dictionaries.push({
      id: 'git',
      name: 'Git',
      description: 'Git commands and terminology',
      words: gitWordsLower,
      wordCount: gitWordsLower.length,
    });
    gitWordsLower.forEach(word => allWordsSet.add(word));

    // Load gzipped dictionaries asynchronously
    const gzippedDictionaries: Array<{
      id: string;
      name: string;
      description: string;
      url: string;
    }> = [
      {
        id: 'filetypes',
        name: 'File Types',
        description: 'Common file extensions and types',
        url: filetypesUrl,
      },
      {
        id: 'markdown',
        name: 'Markdown',
        description: 'Markdown syntax and terms',
        url: markdownUrl,
      },
    ];

    // Load gzipped dictionaries in parallel
    const gzippedResults = await Promise.all(
      gzippedDictionaries.map(async (dict) => {
        const words = await loadGzippedDictionary(dict.url);
        return { ...dict, words };
      })
    );

    for (const result of gzippedResults) {
      if (result.words.length > 0) {
        dictionaries.push({
          id: result.id,
          name: result.name,
          description: result.description,
          words: result.words,
          wordCount: result.words.length,
        });
        result.words.forEach(word => allWordsSet.add(word));
      }
    }

    processedDictionaries = dictionaries;
    allWords = allWordsSet;
    
    logger.info('Supplementary dictionaries loaded', {
      dictionaryCount: dictionaries.length,
      wordCount: allWordsSet.size,
    });
  })();

  return loadingPromise;
}

/**
 * Get all supplementary dictionaries (loads them if not already loaded)
 */
export function getSupplementaryDictionaries(): DictionarySource[] {
  if (processedDictionaries) {
    return processedDictionaries;
  }
  
  // Trigger async load in background
  loadDictionaries().catch(() => {});
  
  return [];
}

/**
 * Get all words from all supplementary dictionaries as a flat array
 */
export function getAllSupplementaryWords(): string[] {
  if (allWords) {
    return [...allWords];
  }
  
  // Trigger async load in background
  loadDictionaries().catch(() => {});
  
  return [];
}

/**
 * Check if a word exists in any supplementary dictionary
 */
export function isInSupplementaryDictionary(word: string): boolean {
  if (allWords) {
    return allWords.has(word.toLowerCase());
  }
  
  return false;
}

/**
 * Ensure dictionaries are loaded (call this at app startup)
 */
export async function ensureDictionariesLoaded(): Promise<void> {
  return loadDictionaries();
}

/**
 * Get the dictionary sources metadata
 */
export function getDictionarySourcesMeta(): Array<{ id: string; name: string; description: string }> {
  const metas = [
    { id: 'software-terms', name: 'Software Terms', description: 'General software and programming terms' },
    { id: 'computing-acronyms', name: 'Computing Acronyms', description: 'Common tech acronyms (API, REST, SSD, etc.)' },
    { id: 'networking', name: 'Networking', description: 'Networking and web services terms' },
    { id: 'fullstack', name: 'Fullstack Development', description: 'Web development terms' },
    { id: 'aws', name: 'AWS', description: 'Amazon Web Services terms and service names' },
    { id: 'google', name: 'Google Cloud', description: 'Google Cloud Platform terms' },
    { id: 'k8s', name: 'Kubernetes', description: 'Kubernetes and container orchestration terms' },
    { id: 'companies', name: 'Companies', description: 'Popular company and brand names' },
    { id: 'gaming', name: 'Gaming Terms', description: 'Gaming and game development terms' },
    { id: 'git', name: 'Git', description: 'Git commands and terminology' },
    { id: 'filetypes', name: 'File Types', description: 'Common file extensions and types' },
    { id: 'markdown', name: 'Markdown', description: 'Markdown syntax and terms' },
  ];
  return metas;
}

/**
 * Get a specific dictionary by ID
 */
export function getDictionaryById(id: string): DictionarySource | undefined {
  if (!processedDictionaries) {
    return undefined;
  }
  return processedDictionaries.find(d => d.id === id);
}

/**
 * Clear the dictionary cache (for testing)
 */
export function clearDictionaryCache(): void {
  processedDictionaries = null;
  allWords = null;
  loadingPromise = null;
}

/**
 * Get total word count across all dictionaries
 */
export function getTotalWordCount(): number {
  return allWords?.size || 0;
}
