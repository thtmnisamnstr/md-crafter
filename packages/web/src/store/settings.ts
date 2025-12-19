import { StateCreator } from 'zustand';
import { Settings, AppState } from './types';

const DEFAULT_SETTINGS: Settings = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  autoSync: true,
  syncInterval: 2000,
  spellCheck: true,
};

export interface SettingsSlice {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => {
  return {
  settings: DEFAULT_SETTINGS,
  
  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },
  };
};

