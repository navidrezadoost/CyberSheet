/**
 * ExcelApp.tsx
 * 
 * Complete Excel application shell with title bar, ribbon, formula bar,
 * spreadsheet area, sheet tabs, and status bar.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Workbook } from '@cyber-sheet/core';
import type { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { CommandManager } from '@cyber-sheet/core';
import { TitleBar } from './TitleBar';
import { RibbonTabs } from './RibbonTabs';
import { Ribbon } from '../components/ribbon/Ribbon';
import { FormulaBar } from '../FormulaBar';
import { CyberSheet } from '../CyberSheet';
import { SheetTabs } from '../SheetTabs';
import { StatusBar } from './StatusBar';
import './excel-app.css';

export interface ExcelAppProps {
  workbook: Workbook;
  fileName?: string;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  style?: React.CSSProperties;
}

/**
 * ExcelApp - Complete Excel application shell
 * 
 * Provides the full Excel-like interface with:
 * - Title bar with quick access toolbar
 * - Ribbon with tab navigation
 * - Formula bar
 * - Spreadsheet canvas
 * - Sheet tabs
 * - Status bar with zoom controls
 */
export const ExcelApp: React.FC<ExcelAppProps> = ({
  workbook,
  fileName = 'Book1',
  onSave,
  onUndo,
  onRedo,
  style,
}) => {
  const [activeTab, setActiveTab] = useState<string>('Home');
  const [activeSheet, setActiveSheet] = useState<string>(workbook.activeSheet?.name || 'Sheet1');
  const [zoom, setZoom] = useState<number>(100);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [cellValue, setCellValue] = useState<any>('');
  const [cellFormula, setCellFormula] = useState<string>('');
  const [isEditingFormula, setIsEditingFormula] = useState<boolean>(false);
  const [selection, setSelection] = useState<any>(null);
  const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);

  // Create a command manager for this workbook
  const commandManager = useMemo(() => {
    const sheet = workbook.activeSheet;
    return new CommandManager(100, sheet);
  }, [workbook]);

  // Get all sheet names
  const sheets = workbook.getSheetNames();

  // Handle sheet change
  const handleSheetChange = useCallback((sheetName: string) => {
    // Set active sheet by setting activeSheetName property
    workbook.activeSheetName = sheetName;
    setActiveSheet(sheetName);
  }, [workbook]);

  // Handle add sheet
  const handleAddSheet = useCallback(() => {
    const newIndex = sheets.length + 1;
    const newName = `Sheet${newIndex}`;
    workbook.addSheet(newName);
    setActiveSheet(newName);
  }, [workbook, sheets]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(10, Math.min(400, newZoom));
    setZoom(clampedZoom);
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((sel: any) => {
    setSelection(sel);
    setSelectedCell({ row: sel.start.row, col: sel.start.col });
    
    // Get cell value and formula
    const sheet = workbook.activeSheet;
    if (sheet) {
      const address = { row: sel.start.row, col: sel.start.col };
      const cell = sheet.getCell(address);
      setCellValue(cell?.value || '');
      setCellFormula(cell?.formula || '');
    }
  }, [workbook]);

  // Handle formula submit
  const handleFormulaSubmit = useCallback((formula: string) => {
    if (!selectedCell) return;
    
    const sheet = workbook.activeSheet;
    if (sheet) {
      const address = { row: selectedCell.row, col: selectedCell.col };
      if (formula.startsWith('=')) {
        sheet.setCellFormula(address, formula);
      } else {
        sheet.setCellValue(address, formula);
      }
    }
    setIsEditingFormula(false);
  }, [workbook, selectedCell]);

  // Handle renderer ready
  const handleRendererReady = useCallback((r: CanvasRenderer) => {
    setRenderer(r);
  }, []);

  return (
    <div className="excel-app" style={style}>
      {/* Title Bar */}
      <TitleBar
        fileName={`${fileName} - Excel`}
        onSave={onSave}
        onUndo={onUndo || (() => commandManager.undo())}
        onRedo={onRedo || (() => commandManager.redo())}
      />

      {/* Ribbon Tabs */}
      <RibbonTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Ribbon Content */}
      <Ribbon
        commandManager={commandManager}
        selection={selection}
        activeTab={activeTab}
      />

      {/* Formula Bar */}
      <FormulaBar
        selectedCell={selectedCell}
        cellValue={cellValue}
        cellFormula={cellFormula}
        onFormulaSubmit={handleFormulaSubmit}
        isEditing={isEditingFormula}
        onEditModeChange={setIsEditingFormula}
      />

      {/* Spreadsheet Area */}
      <div className="spreadsheet-area">
        <CyberSheet
          workbook={workbook}
          sheetName={activeSheet}
          zoom={zoom / 100}
          onRendererReady={handleRendererReady}
          onSelectionChange={handleSelectionChange}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Sheet Tabs */}
      <SheetTabs
        sheets={sheets}
        activeSheet={activeSheet}
        onSheetChange={handleSheetChange}
        onAddSheet={handleAddSheet}
      />

      {/* Status Bar */}
      <StatusBar
        zoom={zoom}
        onZoomChange={handleZoomChange}
        selection={selection}
      />
    </div>
  );
};
