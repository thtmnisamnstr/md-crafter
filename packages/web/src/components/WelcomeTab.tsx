import { 
  FileText, 
  Command, 
  Keyboard, 
  Cloud, 
  Download, 
  Upload,
  Layout as LayoutIcon,
  Moon,
  Palette,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../store';

interface ShortcutProps {
  keys: string[];
  description: string;
}

const Shortcut = ({ keys, description }: ShortcutProps) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm opacity-70">{description}</span>
    <div className="flex gap-1">
      {keys.map((key, i) => (
        <kbd 
          key={i}
          className="px-2 py-1 text-xs rounded"
          style={{ 
            background: 'var(--sidebar-hover)',
            border: '1px solid var(--tab-border)'
          }}
        >
          {key}
        </kbd>
      ))}
    </div>
  </div>
);

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  action, 
  actionLabel 
}: FeatureCardProps) => (
  <div 
    className="p-4 rounded-lg transition-all"
    style={{ 
      background: 'var(--sidebar-bg)',
      border: '1px solid var(--tab-border)'
    }}
  >
    <div className="flex items-start gap-3">
      <div 
        className="p-2 rounded"
        style={{ background: 'var(--sidebar-hover)' }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-sm mb-1">{title}</h3>
        <p className="text-xs opacity-60">{description}</p>
        {action && actionLabel && (
          <button
            onClick={action}
            className="mt-2 text-xs px-3 py-1 rounded transition-colors"
            style={{ 
              background: 'var(--editor-accent)',
              color: 'white'
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  </div>
);

export const WelcomeTab = () => {
  const { 
    setShowSettings, 
    setShowAuth, 
    setShowCommandPalette,
    openTab 
  } = useStore();

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '\u2318' : 'Ctrl';

  const createNewDocument = () => {
    openTab({
      title: 'Untitled.md',
      content: '',
      language: 'markdown',
    });
  };

  return (
    <div 
      className="h-full w-full flex-1 overflow-auto p-8"
      style={{ background: 'var(--editor-bg)', color: 'var(--editor-fg)' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to <span style={{ color: 'var(--editor-accent)' }}>md-crafter</span>
          </h1>
          <p className="opacity-60">
            A modern, cloud-synced markdown editor with MDX support
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<FileText size={20} style={{ color: 'var(--editor-accent)' }} />}
              title="New Document"
              description="Create a new markdown document and start writing"
              action={createNewDocument}
              actionLabel="Create"
            />
            <FeatureCard
              icon={<Command size={20} style={{ color: 'var(--editor-accent)' }} />}
              title="Command Palette"
              description="Access all commands quickly with keyboard"
              action={() => setShowCommandPalette(true)}
              actionLabel={`${modKey}+Shift+P`}
            />
            <FeatureCard
              icon={<Cloud size={20} style={{ color: 'var(--editor-accent)' }} />}
              title="Cloud Sync"
              description="Connect to sync documents across devices"
              action={() => setShowAuth(true)}
              actionLabel="Connect"
            />
            <FeatureCard
              icon={<Palette size={20} style={{ color: 'var(--editor-accent)' }} />}
              title="Customize"
              description="Change themes, fonts, and editor settings"
              action={() => setShowSettings(true)}
              actionLabel="Settings"
            />
          </div>
        </div>

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--sidebar-bg)' }}>
              <LayoutIcon size={16} style={{ color: 'var(--editor-accent)' }} />
              <span className="text-sm">Split Editor View</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--sidebar-bg)' }}>
              <Moon size={16} style={{ color: 'var(--editor-accent)' }} />
              <span className="text-sm">Multiple Themes</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--sidebar-bg)' }}>
              <Download size={16} style={{ color: 'var(--editor-accent)' }} />
              <span className="text-sm">Export to PDF/Word</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--sidebar-bg)' }}>
              <Upload size={16} style={{ color: 'var(--editor-accent)' }} />
              <span className="text-sm">Import from Word</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--sidebar-bg)' }}>
              <Cloud size={16} style={{ color: 'var(--editor-accent)' }} />
              <span className="text-sm">Cloud Sync</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--sidebar-bg)' }}>
              <FileText size={16} style={{ color: 'var(--editor-accent)' }} />
              <span className="text-sm">MDX Support</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Keyboard size={18} />
            Keyboard Shortcuts
          </h2>
          <div 
            className="rounded-lg p-4 divide-y"
            style={{ 
              background: 'var(--sidebar-bg)',
              border: '1px solid var(--tab-border)'
            }}
          >
            <Shortcut keys={[modKey, 'Shift', 'P']} description="Command Palette" />
            <Shortcut keys={[modKey, 'O']} description="Open File(s)" />
            <Shortcut keys={[modKey, 'P']} description="Print / Export PDF" />
            <Shortcut keys={[modKey, 'S']} description="Save" />
            <Shortcut keys={[modKey, 'B']} description="Toggle Sidebar / Bold" />
            <Shortcut keys={[modKey, '\\']} description="Split View" />
            <Shortcut keys={[modKey, 'Shift', 'F']} description="Format Document" />
            <Shortcut keys={[modKey, ',']} description="Settings" />
            <Shortcut keys={[modKey, 'K', 'Z']} description="Zen Mode" />
          </div>
        </div>

        {/* Documentation Links */}
        <div className="text-center opacity-60">
          <p className="text-sm mb-2">Need help?</p>
          <div className="flex justify-center gap-4 text-sm">
            <a 
              href="https://github.com/thtmnisamnstr/md-crafter"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
              style={{ color: 'var(--editor-accent)' }}
            >
              Documentation <ExternalLink size={12} />
            </a>
            <a 
              href="https://github.com/thtmnisamnstr/md-crafter/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
              style={{ color: 'var(--editor-accent)' }}
            >
              Report Issue <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

