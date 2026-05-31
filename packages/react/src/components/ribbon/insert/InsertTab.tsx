/**
 * InsertTab.tsx
 *
 * Complete Insert Tab implementation
 * Groups: Tables | Illustrations | Forms | Text | Charts | Sparklines | Links | Symbols
 */

import React, { useState } from 'react';
import type { DrawingLayer, Worksheet } from '@cyber-sheet/core';
import { ChartDialog } from '../../ChartDialog';
import type { ChartType, ChartCreateParams } from '@cyber-sheet/core';

import { TablesGroup } from './TablesGroup';
import { IllustrationsGroup } from './IllustrationsGroup';
import { FormsGroup } from './FormsGroup';
import { TextGroup } from './TextGroup';
import { LinksGroup } from './LinksGroup';
import { ChartsGroup } from './ChartsGroup';
import { SparklinesGroup } from './SparklinesGroup';
import { SymbolsGroup } from './SymbolsGroup';
import '../ribbon.css';

export interface InsertTabProps {
  worksheet?: Worksheet;
  drawingLayer?: DrawingLayer;
  onInsertTable?: () => void;
  onInsertPivotTable?: () => void;
  onInsertPicture?: () => void;
  onInsertShape?: (shapeType: string) => void;
  onInsertIcon?: () => void;
  onInsertControl?: (controlType: string) => void;
  onInsertTextBox?: () => void;
  onInsertHeaderFooter?: () => void;
  onInsertWordArt?: () => void;
  onInsertChart?: (chartType: string) => void;
  onInsertSparkline?: (sparklineType: 'line' | 'column' | 'winLoss') => void;
  onInsertHyperlink?: () => void;
  onInsertEquation?: () => void;
  onInsertSymbol?: () => void;
  onDrawingChange?: () => void;
}

export const InsertTab: React.FC<InsertTabProps> = ({
  worksheet,
  drawingLayer,
  onInsertTable,
  onInsertPivotTable,
  onInsertPicture,
  onInsertShape,
  onInsertIcon,
  onInsertControl,
  onInsertTextBox,
  onInsertHeaderFooter,
  onInsertWordArt,
  onInsertChart,
  onInsertSparkline,
  onInsertHyperlink,
  onInsertEquation,
  onInsertSymbol,
  onDrawingChange,
}) => {  // Chart dialog state
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  // Wrap handlers to trigger redraw
  const handleInsertTable = () => {
    onInsertTable?.();
    console.log('Insert Table');
  };

  const handleInsertPivotTable = () => {
    onInsertPivotTable?.();
  };

  const handleInsertPicture = () => {
    onInsertPicture?.();
    console.log('Insert Picture');
  };

  const handleInsertShape = (shapeType: string) => {
    onInsertShape?.(shapeType);
    onDrawingChange?.();
    console.log('Insert Shape:', shapeType);
  };

  const handleInsertIcon = () => {
    onInsertIcon?.();
    console.log('Insert Icon');
  };

  const handleInsertControl = (controlType: string) => {
    onInsertControl?.(controlType);
    onDrawingChange?.();
    console.log('Insert Control:', controlType);
  };

  const handleInsertTextBox = () => {
    onInsertTextBox?.();
    onDrawingChange?.();
    console.log('Insert Text Box');
  };

  const handleInsertChart = (chartType: string) => {
    // Open chart dialog with selected type
    setSelectedChartType(chartType as ChartType);
    setShowChartDialog(true);
  };

  const handleCreateChart = (params: ChartCreateParams) => {
    if (!drawingLayer) {
      console.warn('Cannot create chart: DrawingLayer not available');
      return;
    }

    // Convert ChartCreateParams to DrawingLayer ChartObject
    const chartObject: any = {
      id: `chart-${Date.now()}`,
      type: 'chart' as const,
      name: params.title || `Chart ${Date.now()}`,
      chartType: params.type === 'bar' ? 'column' : params.type,
      dataRange: `${params.dataRange.startRow}:${params.dataRange.startCol}-${params.dataRange.endRow}:${params.dataRange.endCol}`,
      position: params.position,
      size: params.size,
      rotation: 0,
      zIndex: params.zIndex,
      locked: false,
      visible: true,
      altText: params.title || '',
      chartData: {
        ...params,
        dataRange: params.dataRange,
        options: params.options,
        seriesDirection: params.seriesDirection,
        hasHeaderRow: params.hasHeaderRow,
        hasHeaderCol: params.hasHeaderCol,
      },
    };

    drawingLayer.addObject(chartObject);
    onDrawingChange?.();
    console.log('Chart created:', chartObject);
  };

  const handleInsertSparkline = (sparklineType: 'line' | 'column' | 'winLoss') => {
    onInsertSparkline?.(sparklineType);
    console.log('Insert Sparkline:', sparklineType);
  };

  const handleInsertHyperlink = () => {
    onInsertHyperlink?.();
    console.log('Insert Hyperlink');
  };

  const handleInsertEquation = () => {
    onInsertEquation?.();
    console.log('Insert Equation');
  };

  const handleInsertSymbol = () => {
    onInsertSymbol?.();
    console.log('Insert Symbol');
  };

  return (
    <div className="ribbon-content ribbon-tab-content">
      {/* 1. Tables */}
      <TablesGroup
        onInsertTable={handleInsertTable}
        onInsertPivotTable={handleInsertPivotTable}
      />

      <div className="ribbon-tab-divider" />

      {/* 2. Illustrations */}
      <IllustrationsGroup
        drawingLayer={drawingLayer}
        onInsertPicture={handleInsertPicture}
        onInsertShape={handleInsertShape}
        onInsertIcon={handleInsertIcon}
        onObjectChange={onDrawingChange}
      />

      <div className="ribbon-tab-divider" />

      {/* 3. Forms */}
      <FormsGroup
        drawingLayer={drawingLayer}
        onInsertControl={handleInsertControl}
        onObjectChange={onDrawingChange}
      />

      <div className="ribbon-tab-divider" />

      {/* 4. Text */}
      <TextGroup
        drawingLayer={drawingLayer}
        onInsertTextBox={handleInsertTextBox}
        onInsertHeaderFooter={onInsertHeaderFooter}
        onInsertWordArt={onInsertWordArt}
        onObjectChange={onDrawingChange}
      />

      <div className="ribbon-tab-divider" />

      {/* 5. Charts */}
      <ChartsGroup
        drawingLayer={drawingLayer}
        onInsertChart={handleInsertChart}
      />

      <div className="ribbon-tab-divider" />

      {/* 6. Sparklines */}
      <SparklinesGroup
        onInsertSparkline={handleInsertSparkline}
      />

      <div className="ribbon-tab-divider" />

      {/* 7. Links */}
      <LinksGroup
        onInsertHyperlink={handleInsertHyperlink}
      />

      <div className="ribbon-tab-divider" />

      {/* 8. Symbols */}
      <SymbolsGroup
        onInsertEquation={handleInsertEquation}
        onInsertSymbol={handleInsertSymbol}
      />

      {/* Chart Dialog */}
      <ChartDialog
        isOpen={showChartDialog}
        onClose={() => setShowChartDialog(false)}
        onCreate={handleCreateChart}
        initialChartType={selectedChartType}
      />
    </div>
  );
};
