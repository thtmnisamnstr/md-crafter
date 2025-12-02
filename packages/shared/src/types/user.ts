export interface User {
  id: string;
  email?: string;
  apiToken: string;
  createdAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  theme: string;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  defaultCloudSave: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  autoSync: true,
  syncInterval: 2000,
  defaultCloudSave: false,
};

export interface AuthRequest {
  email?: string;
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

