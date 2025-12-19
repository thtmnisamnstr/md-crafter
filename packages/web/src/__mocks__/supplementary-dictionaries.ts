/**
 * Mock for supplementary dictionaries in tests
 */

export interface DictionarySource {
  id: string;
  name: string;
  description: string;
  words: string[];
  wordCount: number;
}

// Mock dictionary data
const mockDictionaries: DictionarySource[] = [
  {
    id: 'software-terms',
    name: 'Software Terms',
    description: 'General software and programming terms',
    words: ['api', 'sdk', 'backend', 'frontend', 'typescript', 'javascript'],
    wordCount: 6,
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Git commands and terminology',
    words: ['commit', 'push', 'pull', 'branch', 'merge', 'rebase'],
    wordCount: 6,
  },
];

const allWords = new Set<string>();
mockDictionaries.forEach(d => d.words.forEach(w => allWords.add(w)));

export function getSupplementaryDictionaries(): DictionarySource[] {
  return mockDictionaries;
}

export function getAllSupplementaryWords(): string[] {
  return [...allWords];
}

export function isInSupplementaryDictionary(word: string): boolean {
  return allWords.has(word.toLowerCase());
}

export async function ensureDictionariesLoaded(): Promise<void> {
  return Promise.resolve();
}

export function getDictionarySourcesMeta(): Array<{ id: string; name: string; description: string }> {
  return mockDictionaries.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
  }));
}

export function getDictionaryById(id: string): DictionarySource | undefined {
  return mockDictionaries.find(d => d.id === id);
}

export function clearDictionaryCache(): void {
  // No-op in mock
}

export function getTotalWordCount(): number {
  return allWords.size;
}
