/**
 * Available theme definitions
 */
export interface Theme {
  id: string;
  name: string;
}

export const THEMES: Theme[] = [
  { id: 'dark', name: 'Dark+ (Default)' },
  { id: 'light', name: 'Light+' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'nord', name: 'Nord' },
];

