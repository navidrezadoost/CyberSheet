/**
 * PageLayoutTab.tsx
 *
 * Page Layout Tab - Main Component
 * Assembles all Page Layout groups: Themes, Page Setup, Scale to Fit, Sheet Options
 */

import React from 'react';
import { ThemesGroup } from './ThemesGroup';
import { PageSetupGroup } from './PageSetupGroup';
import { ArrangeGroup } from './ArrangeGroup';
import { ScaleToFitGroup } from './ScaleToFitGroup';
import { SheetOptionsGroup } from './SheetOptionsGroup';
import '../ribbon.css';

export interface PageLayoutTabProps {
  // Themes Group
  onThemeChange?: (theme: string) => void;
  onColorsChange?: (colors: string) => void;
  onFontsChange?: () => void;
  onEffectsChange?: () => void;

  // Page Setup Group
  onMarginsChange?: (margins: string) => void;
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
  onSizeChange?: (size: string) => void;
  onPrintAreaSet?: () => void;
  onBreaksInsert?: (breakType: 'page' | 'remove') => void;
  onBackgroundSet?: () => void;
  onPrintTitlesSet?: () => void;

  // Arrange Group
  onBringForward?: (step: 'front' | 'forward') => void;
  onSendBackward?: (step: 'back' | 'backward') => void;
  onSelectionPane?: () => void;
  onAlign?: (alignment: string) => void;
  onGroup?: (action: 'group' | 'ungroup' | 'regroup') => void;
  onRotate?: (rotation: string) => void;

  // Scale to Fit Group
  onWidthChange?: (width: number | 'auto') => void;
  onHeightChange?: (height: number | 'auto') => void;
  onScaleChange?: (scale: number) => void;

  // Sheet Options Group
  onGridlinesViewChange?: (visible: boolean) => void;
  onGridlinesPrintChange?: (print: boolean) => void;
  onHeadingsViewChange?: (visible: boolean) => void;
  onHeadingsPrintChange?: (print: boolean) => void;
}

export const PageLayoutTab: React.FC<PageLayoutTabProps> = (props) => {
  return (
    <div className="ribbon-content ribbon-tab-content">
      {/* Themes Group */}
      <ThemesGroup
        onThemeChange={props.onThemeChange}
        onColorsChange={props.onColorsChange}
        onFontsChange={props.onFontsChange}
        onEffectsChange={props.onEffectsChange}
      />

      <div className="ribbon-tab-divider" />

      {/* Page Setup Group */}
      <PageSetupGroup
        onMarginsChange={props.onMarginsChange}
        onOrientationChange={props.onOrientationChange}
        onSizeChange={props.onSizeChange}
        onPrintAreaSet={props.onPrintAreaSet}
        onBreaksInsert={props.onBreaksInsert}
        onBackgroundSet={props.onBackgroundSet}
        onPrintTitlesSet={props.onPrintTitlesSet}
      />

      <div className="ribbon-tab-divider" />

      {/* Arrange Group */}
      <ArrangeGroup
        onBringForward={props.onBringForward}
        onSendBackward={props.onSendBackward}
        onSelectionPane={props.onSelectionPane}
        onAlign={props.onAlign}
        onGroup={props.onGroup}
        onRotate={props.onRotate}
      />

      <div className="ribbon-tab-divider" />

      {/* Scale to Fit Group */}
      <ScaleToFitGroup
        onWidthChange={props.onWidthChange}
        onHeightChange={props.onHeightChange}
        onScaleChange={props.onScaleChange}
      />

      <div className="ribbon-tab-divider" />

      {/* Sheet Options Group */}
      <SheetOptionsGroup
        onGridlinesViewChange={props.onGridlinesViewChange}
        onGridlinesPrintChange={props.onGridlinesPrintChange}
        onHeadingsViewChange={props.onHeadingsViewChange}
        onHeadingsPrintChange={props.onHeadingsPrintChange}
      />
    </div>
  );
};
