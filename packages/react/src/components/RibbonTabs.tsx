/**
 * RibbonTabs.tsx
 * 
 * Excel-style ribbon tab navigation
 */

import React from 'react';

export interface RibbonTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFileClick?: () => void;
}

/**
 * RibbonTabs - Tab navigation for ribbon
 * 
 * Provides Excel-style tabs for switching between different ribbon views:
 * - Home
 * - Insert
 * - Page Layout
 * - Formulas
 * - Data
 * - Review
 * - View
 * - Automate
 * - Help
 */
export const RibbonTabs: React.FC<RibbonTabsProps> = ({
  activeTab,
  onTabChange,
  onFileClick,
}) => {
  const tabs = [
    'Home',
    'Insert',
    'Page Layout',
    'Formulas',
    'Data',
    'Review',
    'View',
    'Automate',
    'Help',
  ];

  return (
    <nav className="ribbon-tabs" style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* File button - green, opens backstage */}
      {onFileClick && (
        <button
          className="ribbon-tab file-tab"
          onClick={onFileClick}
          style={{
            backgroundColor: '#217346',
            color: '#FFFFFF',
            fontWeight: 600,
            borderBottom: 'none',
          }}
        >
          File
        </button>
      )}
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`ribbon-tab ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};
