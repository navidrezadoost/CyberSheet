/**
 * AutomateTab.tsx
 *
 * Automate Tab - Main shell integrating automation-related groups
 * Groups: Macros | Add-ins | XML
 */

import React from 'react';
import type { Workbook, Address } from '@cyber-sheet/core';
import { MacrosGroup } from './MacrosGroup';
import { AddinsGroup } from './AddinsGroup';
import { XMLGroup } from './XMLGroup';
import '../ribbon.css';

interface AutomateTabProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const AutomateTab: React.FC<AutomateTabProps> = ({
  workbook,
  selectedCells,
  onCommand,
}) => {
  return (
    <div className="ribbon-content ribbon-tab-content ribbon-tab-content-spacious">
      {/* Macros Group */}
      <MacrosGroup workbook={workbook} onCommand={onCommand} />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Add-ins Group */}
      <AddinsGroup workbook={workbook} onCommand={onCommand} />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* XML Group */}
      <XMLGroup workbook={workbook} onCommand={onCommand} />
    </div>
  );
};
