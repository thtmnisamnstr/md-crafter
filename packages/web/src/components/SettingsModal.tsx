import { useState } from 'react';
import { useStore } from '../store';
import { X, Check } from 'lucide-react';

const THEMES = [
  { id: 'dark', name: 'Dark+ (Default)' },
  { id: 'light', name: 'Light+' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'nord', name: 'Nord' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24];

const TAB_SIZES = [2, 4, 8];

export function SettingsModal() {
  const { 
    setShowSettings, 
    settings, 
    updateSettings,
    theme,
    setTheme,
  } = useStore();

  const [localSettings, setLocalSettings] = useState({ ...settings, theme });

  const handleSave = () => {
    updateSettings(localSettings);
    setTheme(localSettings.theme);
    setShowSettings(false);
  };

  return (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Settings
          </h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body max-h-[60vh] overflow-y-auto">
          {/* Theme */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
              Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLocalSettings({ ...localSettings, theme: t.id })}
                  className={`p-3 rounded border text-left flex items-center justify-between ${
                    localSettings.theme === t.id
                      ? 'border-editor-accent bg-sidebar-active'
                      : 'border-tab-border hover:bg-sidebar-hover'
                  }`}
                  style={{ color: 'var(--editor-fg)' }}
                >
                  <span>{t.name}</span>
                  {localSettings.theme === t.id && (
                    <Check size={16} className="text-editor-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
              Font Size
            </label>
            <div className="flex gap-2 flex-wrap">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setLocalSettings({ ...localSettings, fontSize: size })}
                  className={`px-4 py-2 rounded border ${
                    localSettings.fontSize === size
                      ? 'border-editor-accent bg-sidebar-active'
                      : 'border-tab-border hover:bg-sidebar-hover'
                  }`}
                  style={{ color: 'var(--editor-fg)' }}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Tab Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--editor-fg)' }}>
              Tab Size
            </label>
            <div className="flex gap-2">
              {TAB_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setLocalSettings({ ...localSettings, tabSize: size })}
                  className={`px-4 py-2 rounded border ${
                    localSettings.tabSize === size
                      ? 'border-editor-accent bg-sidebar-active'
                      : 'border-tab-border hover:bg-sidebar-hover'
                  }`}
                  style={{ color: 'var(--editor-fg)' }}
                >
                  {size} spaces
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <ToggleSetting
              label="Word Wrap"
              description="Wrap long lines at the viewport edge"
              checked={localSettings.wordWrap}
              onChange={(checked) => setLocalSettings({ ...localSettings, wordWrap: checked })}
            />
            
            <ToggleSetting
              label="Line Numbers"
              description="Show line numbers in the editor"
              checked={localSettings.lineNumbers}
              onChange={(checked) => setLocalSettings({ ...localSettings, lineNumbers: checked })}
            />
            
            <ToggleSetting
              label="Minimap"
              description="Show the minimap navigation"
              checked={localSettings.minimap}
              onChange={(checked) => setLocalSettings({ ...localSettings, minimap: checked })}
            />
            
            <ToggleSetting
              label="Auto Sync"
              description="Automatically sync changes to cloud"
              checked={localSettings.autoSync}
              onChange={(checked) => setLocalSettings({ ...localSettings, autoSync: checked })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={() => setShowSettings(false)}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--editor-fg)' }}>
          {label}
        </div>
        <div className="text-xs opacity-60" style={{ color: 'var(--editor-fg)' }}>
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-editor-accent' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}

