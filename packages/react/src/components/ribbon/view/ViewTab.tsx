/**
 * ViewTab.tsx
 *
 * View Tab - Main shell integrating all view groups
 * Groups: Workbook Views | Show | Zoom | Window
 */

import React from 'react';
import type { Workbook, Address } from '@cyber-sheet/core';
import { WorkbookViewsGroup } from './WorkbookViewsGroup';
import { ShowGroup } from './ShowGroup';
import { ZoomGroup } from './ZoomGroup';
import { WindowGroup } from './WindowGroup';
import '../ribbon.css';

interface ViewTabProps {
  workbook: Workbook;
  selectedCells: Address[];
  currentView?: 'normal' | 'pageBreak' | 'pageLayout';
  currentZoom?: number;
  showRuler?: boolean;
  showGridlines?: boolean;
  showFormulaBar?: boolean;
  showHeadings?: boolean;
  onViewChange?: (view: 'normal' | 'pageBreak' | 'pageLayout') => void;
  onZoomChange?: (zoom: number) => void;
  onToggleShow?: (option: 'ruler' | 'gridlines' | 'formulaBar' | 'headings', value: boolean) => void;
  onZoomToSelection?: () => void;
  onCustomViews?: () => void;
  onCommand?: (command: any) => void;
}

export const ViewTab: React.FC<ViewTabProps> = ({
  workbook,
  selectedCells,
  currentView = 'normal',
  currentZoom = 100,
  showRuler = false,
  showGridlines = true,
  showFormulaBar = true,
  showHeadings = true,
  onViewChange,
  onZoomChange,
  onToggleShow,
  onZoomToSelection,
  onCustomViews,
  onCommand,
}) => {
  return (
    <div className="ribbon-content ribbon-tab-content ribbon-tab-content-spacious">
      {/* Workbook Views Group */}
      <WorkbookViewsGroup
        workbook={workbook}
        currentView={currentView}
        onViewChange={onViewChange}
        onCustomViews={onCustomViews}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Show Group */}
      <ShowGroup
        workbook={workbook}
        showRuler={showRuler}
        showGridlines={showGridlines}
        showFormulaBar={showFormulaBar}
        showHeadings={showHeadings}
        onToggle={onToggleShow}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Zoom Group */}
      <ZoomGroup
        workbook={workbook}
        currentZoom={currentZoom}
        onZoomChange={onZoomChange}
        onZoomToSelection={onZoomToSelection}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Window Group */}
      <WindowGroup
        workbook={workbook}
        selectedCells={selectedCells}
        onCommand={onCommand}
      />
    </div>
  );
};
