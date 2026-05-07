/**
 * RibbonTabs.tsx
 * 
 * Excel-style ribbon tab navigation
 */

import React from 'react';

export interface RibbonTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
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
}) => {
  const tabs = [
    'File',
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
    <nav className="ribbon-tabs">
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
