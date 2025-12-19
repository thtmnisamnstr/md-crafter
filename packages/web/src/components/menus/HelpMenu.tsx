import { useStore } from '../../store';
import {
  HelpCircle,
  Keyboard,
  Info,
} from 'lucide-react';
import type { MenuItem } from './FileMenu';

/**
 * Generates menu items for the Help menu
 * 
 * @returns Array of Help menu items
 */
export function getHelpMenuItems(): MenuItem[] {
  const {
    setShowAbout,
    setShowShortcuts,
  } = useStore.getState();

  return [
    {
      id: 'docs',
      label: 'Documentation',
      icon: <HelpCircle size={14} />,
      action: () => window.open('https://github.com/thtmnisamnstr/md-crafter#readme', '_blank'),
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      shortcut: '⌘K ⌘S',
      icon: <Keyboard size={14} />,
      action: () => setShowShortcuts(true),
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'about',
      label: 'About md-crafter',
      icon: <Info size={14} />,
      action: () => setShowAbout(true),
    },
  ];
}

