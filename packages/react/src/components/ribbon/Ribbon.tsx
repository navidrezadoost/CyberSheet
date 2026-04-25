import React, { useState } from 'react';
import { HomeTab } from './HomeTab';
import './ribbon.css';

export interface RibbonProps {
  commandManager: any;
  selection: any;
}

/**
 * Ribbon - Main Ribbon container with tab navigation
 * 
 * Top-level component that manages tab switching and renders the active tab content.
 * Currently implements Home tab only. Future tabs:
 * - Insert
 * - Page Layout
 * - Formulas
 * - Data
 * - Review
 * - View
 * 
 * @example
 * <Ribbon 
 *   commandManager={workbook.commandManager} 
 *   selection={getCurrentSelection()} 
 * />
 */
export const Ribbon: React.FC<RibbonProps> = ({ commandManager, selection }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'formulas'>('home');

  return (
    <div className="ribbon">
      {/* Tab Navigation (future enhancement) */}
      {/* 
      <div className="ribbon-tabs">
        <button 
          className={activeTab === 'home' ? 'active' : ''} 
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button 
          className={activeTab === 'insert' ? 'active' : ''} 
          onClick={() => setActiveTab('insert')}
        >
          Insert
        </button>
        <button 
          className={activeTab === 'formulas' ? 'active' : ''} 
          onClick={() => setActiveTab('formulas')}
        >
          Formulas
        </button>
      </div>
      */}

      {/* Active Tab Content */}
      {activeTab === 'home' && (
        <HomeTab commandManager={commandManager} selection={selection} />
      )}
      
      {/* Future tabs will be added here */}
    </div>
  );
};
