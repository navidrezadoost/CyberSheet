/**
 * ReviewTab.tsx
 *
 * Review Tab - Main shell integrating all review groups
 * Groups: Proofing | Accessibility | Comments | Changes | Protect | Ink
 */

import React from 'react';
import type { Workbook, Address } from '@cyber-sheet/core';
import { ProofingGroup } from './ProofingGroup';
import { AccessibilityGroup } from './AccessibilityGroup';
import { CommentsGroup } from './CommentsGroup';
import { ChangesGroup } from './ChangesGroup';
import { ProtectGroup } from './ProtectGroup';
import { InkGroup } from './InkGroup';
import '../ribbon.css';

interface ReviewTabProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({
  workbook,
  selectedCells,
  onCommand,
}) => {
  return (
    <div className="ribbon-content ribbon-tab-content ribbon-tab-content-spacious">
      {/* Proofing Group */}
      <ProofingGroup
        workbook={workbook}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Accessibility Group */}
      <AccessibilityGroup
        workbook={workbook}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Comments Group */}
      <CommentsGroup
        workbook={workbook}
        selectedCells={selectedCells}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Changes Group */}
      <ChangesGroup
        workbook={workbook}
        selectedCells={selectedCells}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Protect Group */}
      <ProtectGroup
        workbook={workbook}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Ink Group */}
      <InkGroup
        workbook={workbook}
        onCommand={onCommand}
      />
    </div>
  );
};
