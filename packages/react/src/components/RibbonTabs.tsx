/**
 * RibbonTabs.tsx
 * 
 * Excel-style ribbon tab navigation
 */

import React from 'react';
import { getVisibleRibbonTabLabels, isTabEnabled } from '../config/appConfig';
import { useCyberSheetAppConfig } from '../config/CyberSheetConfigContext';

export interface RibbonTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFileClick?: () => void;
}

export const RibbonTabs: React.FC<RibbonTabsProps> = ({
  activeTab,
  onTabChange,
  onFileClick,
}) => {
  const appConfig = useCyberSheetAppConfig();
  const tabs = getVisibleRibbonTabLabels(appConfig);

  return (
    <nav className="ribbon-tabs" style={{ display: 'flex', alignItems: 'stretch' }}>
      {appConfig.allowOpen && onFileClick && (
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

export { isTabEnabled };
