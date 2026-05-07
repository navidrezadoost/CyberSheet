/**
 * BackstageSidebar.tsx
 * 
 * Left sidebar navigation for backstage file menu
 * Shows all available panels with active state indicator
 * 
 * Features:
 * - Visual active state (blue highlight + left border)
 * - Hover states
 * - Keyboard navigation support
 * - Separators between logical groups
 * 
 * Phase 6: File Backstage Menu
 */

import React from 'react';
import type { BackstagePanel } from './BackstageContainer';

interface SidebarItem {
  id: BackstagePanel;
  label: string;
  icon: string; // Emoji or icon component reference
  separatorAfter?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'new', label: 'New', icon: '📄' },
  { id: 'open', label: 'Open', icon: '📂' },
  { id: 'share', label: 'Share', icon: '👥', separatorAfter: true },
  { id: 'createCopy', label: 'Create a Copy', icon: '📋' },
  { id: 'export', label: 'Export', icon: '📥' },
  { id: 'rename', label: 'Rename', icon: '✏️' },
  { id: 'moveFile', label: 'Move File', icon: '📁' },
  { id: 'versionHistory', label: 'Version History', icon: '🕐', separatorAfter: true },
  { id: 'info', label: 'Info', icon: 'ℹ️' },
  { id: 'options', label: 'Options', icon: '⚙️' },
];

export interface BackstageSidebarProps {
  activePanel: BackstagePanel;
  onPanelChange: (panel: BackstagePanel) => void;
}

export const BackstageSidebar: React.FC<BackstageSidebarProps> = ({
  activePanel,
  onPanelChange,
}) => {
  const sidebarStyle: React.CSSProperties = {
    width: 200,
    backgroundColor: '#F5F5F5',
    borderRight: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 8,
    paddingBottom: 8,
    overflowY: 'auto',
    flexShrink: 0,
  };

  const itemStyle = (isActive: boolean, isSeparator: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#0078D4' : '#333333',
    backgroundColor: isActive ? '#E8F0FE' : 'transparent',
    borderLeft: isActive ? '3px solid #0078D4' : '3px solid transparent',
    transition: 'all 150ms ease-out',
    marginBottom: isSeparator ? 12 : 0,
    position: 'relative',
  });

  const separatorStyle: React.CSSProperties = {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 16,
    marginRight: 16,
  };

  return (
    <nav style={sidebarStyle} role="navigation" aria-label="File menu">
      {SIDEBAR_ITEMS.map((item) => (
        <div key={item.id}>
          <div
            style={itemStyle(activePanel === item.id, !!item.separatorAfter)}
            onClick={() => onPanelChange(item.id)}
            onMouseEnter={(e: any) => {
              if (activePanel !== item.id) {
                e.currentTarget.style.backgroundColor = '#EBEBEB';
              }
            }}
            onMouseLeave={(e: any) => {
              if (activePanel !== item.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            role="menuitem"
            tabIndex={0}
            aria-current={activePanel === item.id ? 'page' : undefined}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPanelChange(item.id);
              }
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            
            {/* Active indicator dot */}
            {activePanel === item.id && (
              <span
                style={{
                  position: 'absolute',
                  left: -1,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 24,
                  backgroundColor: '#0078D4',
                  borderRadius: '0 2px 2px 0',
                }}
              />
            )}
          </div>
          
          {item.separatorAfter && <div style={separatorStyle} />}
        </div>
      ))}
    </nav>
  );
};
