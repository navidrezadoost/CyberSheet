import React from 'react';
import type { Workbook, Address } from '@cyber-sheet/core';
import { GetTransformDataGroup } from './GetTransformDataGroup';
import { SortFilterGroup } from './SortFilterGroup';
import { DataToolsGroup } from './DataToolsGroup';
import { OutlineGroup } from './OutlineGroup';
import '../ribbon.css';

interface DataTabProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const DataTab: React.FC<DataTabProps> = ({ workbook, selectedCells, onCommand }) => {
  return (
    <div className="ribbon-content ribbon-tab-content ribbon-tab-content-spacious">
      {/* Get & Transform Data Group */}
      <GetTransformDataGroup workbook={workbook} onCommand={onCommand} />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Queries & Connections Group (Placeholder - could expand) */}
      <div className="ribbon-tab-shell ribbon-tab-shell-center">
        <button
          onClick={() => console.log('Open Workbook Links')}
          title="Workbook Links"
          className="ribbon-feature-button"
        >
          <svg className="ribbon-feature-icon" width="20" height="16" viewBox="0 0 20 16" fill="none">
            <path d="M6 8 L8 6 C9 5 11 5 12 6 L14 8 M14 8 L12 10 C11 11 9 11 8 10 L6 8" stroke="#0078D4" strokeWidth="1.5" fill="none"/>
            <circle cx="6" cy="8" r="2" fill="#0078D4"/>
            <circle cx="14" cy="8" r="2" fill="#0078D4"/>
          </svg>
          <span>Workbook<br/>Links</span>
        </button>
        <div className="ribbon-tab-shell-title">Queries &amp; Connections</div>
      </div>

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Sort & Filter Group */}
      <SortFilterGroup workbook={workbook} selectedCells={selectedCells} onCommand={onCommand} />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Data Tools Group */}
      <DataToolsGroup workbook={workbook} selectedCells={selectedCells} onCommand={onCommand} />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Outline Group */}
      <OutlineGroup workbook={workbook} selectedCells={selectedCells} onCommand={onCommand} />
    </div>
  );
};
