import { useState, useRef, useEffect } from 'react';
import { useEditorContext } from '../contexts/EditorContext';
import { getFileMenuItems } from './menus/FileMenu';
import { getEditMenuItems } from './menus/EditMenu';
import { getViewMenuItems } from './menus/ViewMenu';
import { getHelpMenuItems } from './menus/HelpMenu';
import {
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
  customElement?: React.ReactNode; // For custom elements like remove buttons
}

interface MenuProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function Menu({ label, items, isOpen, onOpen, onClose }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmenuOpen(null);
    }
  }, [isOpen]);

  const handleItemClick = (item: MenuItem) => {
    if (item.submenu) {
      setSubmenuOpen(submenuOpen === item.id ? null : item.id);
    } else if (item.action && !item.disabled) {
      item.action();
      onClose();
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={clsx(
          'px-3 py-1 text-sm rounded hover:bg-sidebar-hover transition-colors',
          isOpen && 'bg-sidebar-hover'
        )}
        style={{ color: 'var(--editor-fg, #d4d4d4)' }}
        onClick={() => (isOpen ? onClose() : onOpen())}
        onMouseEnter={() => isOpen && onOpen()}
      >
        {label}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[220px] rounded-md shadow-lg border border-tab-border z-50"
          style={{ background: 'var(--sidebar-bg, #252526)' }}
        >
          {items.map((item, index) =>
            item.separator ? (
              <div
                key={`sep-${index}`}
                className="h-px my-1 mx-2"
                style={{ background: 'var(--tab-border)' }}
              />
            ) : (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => item.submenu && setSubmenuOpen(item.id)}
                onMouseLeave={(e) => {
                  // Only close if mouse is not moving to submenu
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (!relatedTarget?.closest('[data-submenu]')) {
                    setSubmenuOpen(null);
                  }
                }}
              >
                <button
                  className={clsx(
                    'w-full px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-sidebar-hover transition-colors',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{ color: 'var(--editor-fg, #d4d4d4)' }}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs opacity-60 ml-4">{item.shortcut}</span>
                  )}
                  {item.submenu && <ChevronDown size={14} className="-rotate-90" />}
                </button>

                {/* Submenu */}
                {item.submenu && submenuOpen === item.id && (
                  <div
                    data-submenu
                    className={clsx(
                      "absolute left-full top-0 rounded-md shadow-lg border border-tab-border -ml-1",
                      item.id === 'recent' ? 'min-w-[320px]' : 'min-w-[180px]'
                    )}
                    style={{ background: 'var(--sidebar-bg, #252526)' }}
                    onMouseEnter={() => setSubmenuOpen(item.id)}
                    onMouseLeave={() => setSubmenuOpen(null)}
                  >
                    {item.submenu.map((subitem) => (
                      <div
                        key={subitem.id}
                        className="group flex items-center hover:bg-sidebar-hover transition-colors"
                      >
                        <button
                          className={clsx(
                            'flex-1 px-3 py-1.5 text-sm flex items-center gap-2 transition-colors',
                            subitem.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                          style={{ color: 'var(--editor-fg, #d4d4d4)' }}
                          onClick={() => {
                            if (subitem.action && !subitem.disabled) {
                              subitem.action();
                              onClose();
                            }
                          }}
                          disabled={subitem.disabled}
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            {subitem.icon}
                          </span>
                          <span className="flex-1 text-left">{subitem.label}</span>
                        </button>
                        {subitem.customElement && (
                          <div className="pr-2">
                            {subitem.customElement}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { getActiveEditor, primaryMonaco, grammarService } = useEditorContext();

  // Get menu items from sub-components
  const fileMenuItems = getFileMenuItems();
  const editMenuItems = getEditMenuItems({ getActiveEditor, primaryMonaco, grammarService });
  const viewMenuItems = getViewMenuItems();
  const helpMenuItems = getHelpMenuItems();

  return (
    <div
      ref={menuBarRef}
      className="flex items-center h-8 px-2 border-b border-tab-border"
      style={{ background: 'var(--sidebar-bg, #252526)' }}
    >
      <Menu
        label="File"
        items={fileMenuItems}
        isOpen={openMenu === 'file'}
        onOpen={() => setOpenMenu('file')}
        onClose={() => setOpenMenu(null)}
      />
      <Menu
        label="Edit"
        items={editMenuItems}
        isOpen={openMenu === 'edit'}
        onOpen={() => setOpenMenu('edit')}
        onClose={() => setOpenMenu(null)}
      />
      <Menu
        label="View"
        items={viewMenuItems}
        isOpen={openMenu === 'view'}
        onOpen={() => setOpenMenu('view')}
        onClose={() => setOpenMenu(null)}
      />
      <Menu
        label="Help"
        items={helpMenuItems}
        isOpen={openMenu === 'help'}
        onOpen={() => setOpenMenu('help')}
        onClose={() => setOpenMenu(null)}
      />
    </div>
  );
}

