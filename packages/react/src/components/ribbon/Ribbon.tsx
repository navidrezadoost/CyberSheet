import React from 'react';
import { HomeTab } from './HomeTab';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './ribbon.css';

export interface RibbonProps {
  commandManager: any;
  selection: any;
  activeTab?: string;
}

/**
 * Ribbon - Main Ribbon content container
 * 
 * Renders the active tab content based on the activeTab prop.
 * Currently implements Home tab only. Future tabs:
 * - Insert
 * - Page Layout
 * - Formulas
 * - Data
 * - Review
 * - View
 * 
 * ⚠️ CRITICAL: This component sets up the global keyboard shortcut system
 * Only ONE instance should exist per application
 * 
 * @example
 * <Ribbon 
 *   commandManager={workbook.commandManager} 
 *   selection={getCurrentSelection()}
 *   activeTab="Home"
 * />
 */
export const Ribbon: React.FC<RibbonProps> = ({ commandManager, selection, activeTab = 'Home' }) => {
  // Set up global keyboard shortcuts (single entry point)
  useKeyboardShortcuts({
    commandManager,
    selection,
    registerStandardShortcuts: true,
    enabled: true,
  });

  return (
    <div className="ribbon">
      {/* Active Tab Content */}
      {activeTab === 'Home' && (
        <HomeTab commandManager={commandManager} selection={selection} />
      )}
      
      {/* Future tabs will be added here */}
      {activeTab === 'Insert' && (
        <div className="ribbon-placeholder">
          <p>Insert tab coming soon...</p>
        </div>
      )}
      
      {activeTab === 'Formulas' && (
        <div className="ribbon-placeholder">
          <p>Formulas tab coming soon...</p>
        </div>
      )}
    </div>
  );
};
