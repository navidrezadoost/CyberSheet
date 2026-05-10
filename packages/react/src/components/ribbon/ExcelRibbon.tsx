/**
 * ExcelRibbon.tsx
 *
 * Complete Excel 365-style Ribbon Bar
 * - Tab bar: Home, Insert, Page Layout, Formulas, Data, Review, View
 * - Home tab: Clipboard | Font | Alignment | Number | Styles | Cells | Editing
 * - Exact Excel 365 color tokens and microinteraction specs
 * - Self-contained service instantiation (FormattingController, ClipboardService)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  FormattingController,
  ClipboardService,
  DrawingLayer,
  PageLayoutController,
  NameManager,
  CalculationController,
  SortCommand,
  ToggleAutoFilterCommand,
  ClearFilterCommand,
  SetDataValidationCommand,
  ClearDataValidationCommand,
  RemoveDuplicatesCommand,
  TextToColumnsCommand,
  GroupOutlineCommand,
  UngroupOutlineCommand,
  FreezePanesCommand,
  SplitWindowCommand,
  SetZoomCommand,
  ZoomToSelectionCommand,
  SetViewModeCommand,
  ToggleShowOptionCommand,
  HideWindowCommand,
  NewWindowCommand,
  ArrangeWindowsCommand,
  AddCommentCommand,
  DeleteCommentCommand,
  ToggleCommentsVisibilityCommand,
  ProtectSheetCommand,
  UnprotectSheetCommand,
  ProtectWorkbookCommand,
  UnprotectWorkbookCommand,
  SpellCheckCommand,
  ToggleTrackChangesCommand,
} from '@cyber-sheet/core';
import type {
  Address,
  Worksheet,
  SelectionStyleSummary,
} from '@cyber-sheet/core';

import { ClipboardGroup } from './ClipboardGroup';
import { FontGroup } from './FontGroup';
import { AlignmentGroupV2 } from './AlignmentGroupV2';
import { NumberFormatGroup } from './NumberFormatGroup';
import { StylesGroup } from './StylesGroup';
import { CellsGroup } from './CellsGroup';
import { EditingGroup } from './EditingGroup';
import { InsertTab } from './insert/InsertTab';
import { PageLayoutTab } from './pagelayout/PageLayoutTab';
import { FormulasTab } from './formulas/FormulasTab';
import { DataTab } from './data/DataTab';
import { ViewTab } from './view/ViewTab';
import { ReviewTab } from './review/ReviewTab';
import './ribbon.css';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CommandManager {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  execute(command: any): void;
}

export interface ExcelRibbonProps {
  worksheet?: Worksheet;
  workbook?: any;
  commandManager?: CommandManager;
  selectedCell?: Address;
  selectedCells?: Address[];
  onFileClick?: () => void;
  onStructureChange?: () => void;
  onStyleChange?: () => void;
}

type RibbonTab = 'home' | 'insert' | 'pageLayout' | 'formulas' | 'data' | 'review' | 'view';

const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'home',       label: 'Home' },
  { id: 'insert',     label: 'Insert' },
  { id: 'pageLayout', label: 'Page Layout' },
  { id: 'formulas',   label: 'Formulas' },
  { id: 'data',       label: 'Data' },
  { id: 'review',     label: 'Review' },
  { id: 'view',       label: 'View' },
];

// ─── Empty style summary fallback ─────────────────────────────────────────

const EMPTY_STYLE: SelectionStyleSummary = {
  fontFamily: { value: 'Calibri', isMixed: false },
  fontSize:   { value: 11,        isMixed: false },
  bold:       { value: false,     isMixed: false },
  italic:     { value: false,     isMixed: false },
  underline:  { value: false,     isMixed: false },
  strikethrough: { value: false,  isMixed: false },
  color:      { value: '#000000', isMixed: false },
  align:      { value: 'left',    isMixed: false },
  valign:     { value: 'bottom',  isMixed: false },
  wrap:       { value: false,     isMixed: false },
  fill:       { value: undefined, isMixed: false },
  border:     { value: undefined, isMixed: false },
  numberFormat: { value: 'General', isMixed: false },
};

// ─── Noop CommandManager ───────────────────────────────────────────────────

const NOOP_COMMAND_MANAGER: CommandManager = {
  undo: () => {},
  redo: () => {},
  canUndo: () => false,
  canRedo: () => false,
  execute: () => {},
};

// ─── Component ─────────────────────────────────────────────────────────────

export const ExcelRibbon: React.FC<ExcelRibbonProps> = ({
  worksheet,
  workbook,
  commandManager = NOOP_COMMAND_MANAGER,
  selectedCell = { row: 1, col: 1 },
  selectedCells,
  onFileClick,
  onStructureChange,
  onStyleChange,
}) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');

  // Drawing layer for Insert tab
  const drawingLayer = useMemo(() => new DrawingLayer(), []);

  // Page layout controller for Page Layout tab
  const pageLayoutController = useMemo(() => new PageLayoutController(), []);

  // Name manager for Formulas tab
  const nameManager = useMemo(() => new NameManager(), []);

  // Calculation controller for Formulas tab
  const calculationController = useMemo(() => new CalculationController(), []);

  // Show formulas state
  const [showFormulas, setShowFormulas] = useState(false);

  // Derive selected cells list
  const cells = useMemo(
    () => (selectedCells || [selectedCell]) as Address[],
    [selectedCells, selectedCell]
  );

  // ── Services ──────────────────────────────────────────────────────────────

  const formattingController = useMemo(() => {
    if (!worksheet) return null;
    return new FormattingController(worksheet, commandManager as any) as FormattingController | null;
  }, [worksheet, commandManager]);

  const clipboardService = useMemo(() => new ClipboardService(), []);

  // ── Style summary ─────────────────────────────────────────────────────────

  const selectionStyle = useMemo(() => {
    if (!worksheet || cells.length === 0) return EMPTY_STYLE;
    try {
      const cell = worksheet.getCell(selectedCell);
      const style = (cell as any)?.style;
      if (!style) return EMPTY_STYLE;
      return {
        fontFamily:   { value: style.font?.name       ?? 'Calibri',   isMixed: false },
        fontSize:     { value: style.font?.size        ?? 11,          isMixed: false },
        bold:         { value: style.font?.bold        ?? false,       isMixed: false },
        italic:       { value: style.font?.italic      ?? false,       isMixed: false },
        underline:    { value: style.font?.underline   ?? false,       isMixed: false },
        strikethrough:{ value: style.font?.strikethrough ?? false,     isMixed: false },
        color:        { value: style.font?.color       ?? '#000000',   isMixed: false },
        align:        { value: style.alignment?.horizontal ?? 'left',  isMixed: false },
        valign:       { value: style.alignment?.vertical   ?? 'bottom',isMixed: false },
        wrap:         { value: style.alignment?.wrapText   ?? false,   isMixed: false },
        fill:         { value: style.fill,                             isMixed: false },
        border:       { value: style.border,                           isMixed: false },
        numberFormat: { value: style.numFmt ?? 'General',             isMixed: false },
      } as SelectionStyleSummary;
    } catch {
      return EMPTY_STYLE;
    }
  }, [worksheet, selectedCell, cells]);

  // ── Style/Structure change callbacks ──────────────────────────────────────
  const handleStyleChange  = useCallback(() => onStyleChange?.(),    [onStyleChange]);
  const handleStructureCh  = useCallback(() => onStructureChange?.(), [onStructureChange]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const ribbonContainerStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderBottom: '1px solid #D9D9D9',
    userSelect: 'none',
    flexShrink: 0,
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    background: '#F0F0F0',
    borderBottom: '1px solid #D9D9D9',
    height: 30,
    paddingLeft: 4,
    gap: 0,
  };

  const getTabStyle = (tab: RibbonTab): React.CSSProperties => ({
    padding: '0 14px',
    border: 'none',
    background: activeTab === tab ? '#FFFFFF' : 'transparent',
    color: activeTab === tab ? '#000000' : '#444444',
    fontSize: 11,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontWeight: activeTab === tab ? 600 : 400,
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid #0078D4' : '2px solid transparent',
    borderTop: '2px solid transparent',
    borderLeft: 'none',
    borderRight: 'none',
    whiteSpace: 'nowrap',
    transition: 'background 80ms, color 80ms',
    marginBottom: -1,
    flexShrink: 0,
  });

  const contentAreaStyle: React.CSSProperties = {
    background: '#F0F0F0',
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    minHeight: 66,
    overflowX: 'auto',
  };

  const placeholderStyle: React.CSSProperties = {
    padding: '12px 24px',
    color: '#888',
    fontSize: 12,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontStyle: 'italic',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={ribbonContainerStyle}>
      {/* ── Tab Bar ── */}
      <div style={tabBarStyle}>
        {/* File button - green, opens backstage */}
        {onFileClick && (
          <button
            style={{
              padding: '0 14px',
              border: 'none',
              background: '#217346',
              color: '#FFFFFF',
              fontSize: 11,
              fontFamily: 'Segoe UI, Arial, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: '2px solid transparent',
              borderTop: '2px solid transparent',
              flexShrink: 0,
              marginBottom: -1,
            }}
            onClick={onFileClick}
          >
            File
          </button>
        )}

        {RIBBON_TABS.map(({ id, label }) => (
          <button
            key={id}
            style={getTabStyle(id)}
            onClick={() => setActiveTab(id)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLButtonElement).style.background = '#E8E8E8';
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (activeTab !== id) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {activeTab === 'home' ? (
        <div style={contentAreaStyle}>
          {/* 1. Clipboard */}
          {formattingController && worksheet ? (
            <ClipboardGroup
              worksheet={worksheet}
              clipboardService={clipboardService}
              formattingController={formattingController}
              commandManager={commandManager as any}
              selectedCells={cells}
              onCut={handleStyleChange}
              onCopy={handleStyleChange}
              onPaste={handleStyleChange}
            />
          ) : (
            <ClipboardPlaceholder />
          )}

          <GroupDivider />

          {/* 2. Font */}
          {formattingController ? (
            <FontGroup
              formattingController={formattingController}
              selectedCells={cells}
              selectionStyle={selectionStyle}
              onStyleChange={handleStyleChange}
            />
          ) : (
            <FontPlaceholder />
          )}

          <GroupDivider />

          {/* 3. Alignment */}
          {formattingController ? (
            <AlignmentGroupV2
              formattingController={formattingController}
              selectedCells={cells}
              selectionStyle={selectionStyle}
              onStyleChange={handleStyleChange}
            />
          ) : null}

          <GroupDivider />

          {/* 4. Number */}
          {formattingController ? (
            <NumberFormatGroup
              formattingController={formattingController}
              selectedCells={cells}
              selectionStyle={selectionStyle}
              onStyleChange={handleStyleChange}
            />
          ) : null}

          <GroupDivider />

          {/* 5. Styles */}
          {formattingController ? (
            <StylesGroup
              formattingController={formattingController}
              selectedCells={cells}
              onStyleChange={handleStyleChange}
            />
          ) : null}

          <GroupDivider />

          {/* 6. Cells */}
          {formattingController ? (
            <CellsGroup
              formattingController={formattingController}
              selectedCells={cells}
              onStructureChange={handleStructureCh}
            />
          ) : null}

          <GroupDivider />

          {/* 7. Editing */}
          {formattingController ? (
            <EditingGroup
              formattingController={formattingController}
              selectedCells={cells}
              onEditOperation={(op, params) => {
                console.log('Edit operation:', op, params);
                handleStyleChange();
              }}
            />
          ) : null}
        </div>
      ) : activeTab === 'insert' ? (
        <InsertTab
          worksheet={worksheet}
          drawingLayer={drawingLayer}
          onInsertTable={() => console.log('Insert Table')}
          onInsertPivotTable={() => console.log('Insert PivotTable')}
          onInsertPicture={() => console.log('Insert Picture')}
          onInsertShape={(type) => console.log('Insert Shape:', type)}
          onInsertIcon={() => console.log('Insert Icon')}
          onInsertControl={(type) => console.log('Insert Control:', type)}
          onInsertTextBox={() => console.log('Insert Text Box')}
          onInsertHeaderFooter={() => console.log('Insert Header/Footer')}
          onInsertWordArt={() => console.log('Insert WordArt')}
          onInsertChart={(type) => console.log('Insert Chart:', type)}
          onInsertSparkline={(type) => console.log('Insert Sparkline:', type)}
          onInsertHyperlink={() => console.log('Insert Hyperlink')}
          onInsertEquation={() => console.log('Insert Equation')}
          onInsertSymbol={() => console.log('Insert Symbol')}
          onDrawingChange={handleStyleChange}
        />
      ) : activeTab === 'pageLayout' ? (
        <PageLayoutTab
          onThemeChange={(theme) => {
            pageLayoutController.setTheme(theme);
            console.log('Theme changed:', theme);
          }}
          onColorsChange={(colors) => {
            pageLayoutController.setColorTheme(colors);
            console.log('Colors changed:', colors);
          }}
          onFontsChange={() => console.log('Fonts clicked')}
          onEffectsChange={() => console.log('Effects clicked')}
          onMarginsChange={(margins) => {
            if (margins === 'Normal' || margins === 'Wide' || margins === 'Narrow') {
              pageLayoutController.setMarginPreset(margins);
            }
            console.log('Margins changed:', margins);
          }}
          onOrientationChange={(orientation) => {
            pageLayoutController.setOrientation(orientation);
            console.log('Orientation changed:', orientation);
          }}
          onSizeChange={(size) => {
            pageLayoutController.setPaperSize(size);
            console.log('Size changed:', size);
          }}
          onPrintAreaSet={() => console.log('Print Area set')}
          onBreaksInsert={(breakType) => {
            if (breakType === 'page') {
              pageLayoutController.insertPageBreak();
            } else {
              pageLayoutController.removeAllPageBreaks();
            }
            console.log('Break:', breakType);
          }}
          onBackgroundSet={() => console.log('Background set')}
          onPrintTitlesSet={() => console.log('Print Titles set')}
          onWidthChange={(width) => {
            pageLayoutController.setFitToWidth(width);
            console.log('Width changed:', width);
          }}
          onHeightChange={(height) => {
            pageLayoutController.setFitToHeight(height);
            console.log('Height changed:', height);
          }}
          onScaleChange={(scale) => {
            pageLayoutController.setScale(scale);
            console.log('Scale changed:', scale);
          }}
          onGridlinesViewChange={(visible) => {
            const current = pageLayoutController.getPageSetup();
            pageLayoutController.setGridlines(visible, current.gridlines.print);
            console.log('Gridlines view:', visible);
          }}
          onGridlinesPrintChange={(print) => {
            const current = pageLayoutController.getPageSetup();
            pageLayoutController.setGridlines(current.gridlines.view, print);
            console.log('Gridlines print:', print);
          }}
          onHeadingsViewChange={(visible) => {
            const current = pageLayoutController.getPageSetup();
            pageLayoutController.setHeadings(visible, current.headings.print);
            console.log('Headings view:', visible);
          }}
          onHeadingsPrintChange={(print) => {
            const current = pageLayoutController.getPageSetup();
            pageLayoutController.setHeadings(current.headings.view, print);
            console.log('Headings print:', print);
          }}
        />
      ) : activeTab === 'formulas' ? (
        <FormulasTab
          // Function Library
          onInsertFunction={() => console.log('Insert Function dialog')}
          onAutoSum={(type) => console.log('AutoSum:', type)}
          onSelectFunction={(category, func) => {
            console.log('Select function:', category, func);
          }}
          // Defined Names
          onNameManager={() => console.log('Name Manager dialog')}
          onDefineName={() => console.log('Define Name dialog')}
          onApplyNames={() => console.log('Apply Names dialog')}
          onUseInFormula={(name) => {
            console.log('Use in formula:', name);
          }}
          onCreateFromSelection={() => console.log('Create from Selection dialog')}
          definedNames={nameManager.getAllNames().map((n: any) => n.name)}
          // Formula Auditing
          onTracePrecedents={() => console.log('Trace Precedents')}
          onTraceDependents={() => console.log('Trace Dependents')}
          onRemoveArrows={(type) => console.log('Remove Arrows:', type)}
          onShowFormulas={(show) => {
            setShowFormulas(show);
            console.log('Show Formulas:', show);
          }}
          onErrorChecking={() => console.log('Error Checking dialog')}
          onTraceError={() => console.log('Trace Error')}
          onCircularReferences={() => console.log('Circular References')}
          onEvaluateFormula={() => console.log('Evaluate Formula dialog')}
          onWatchWindow={() => console.log('Watch Window')}
          showFormulas={showFormulas}
          // Calculation
          onCalculationModeChange={(mode) => {
            calculationController.setMode(mode);
            console.log('Calculation mode:', mode);
          }}
          onCalculateNow={() => {
            calculationController.calculateNow();
            console.log('Calculate Now (F9)');
          }}
          onCalculateSheet={() => {
            calculationController.calculateSheet();
            console.log('Calculate Sheet (Shift+F9)');
          }}
          calculationMode={calculationController.getMode()}
        />
      ) : activeTab === 'data' ? (
        <DataTab
          workbook={workbook}
          selectedCells={cells}
          onCommand={(command) => {
            console.log('Data tab command:', command);
            
            const sheet = worksheet || workbook?.activeSheet;
            if (!sheet || !commandManager) return;

            try {
              switch (command.type) {
                case 'sort':
                  commandManager.execute(
                    new SortCommand(sheet, command.range, command.sortBy, command.hasHeaders)
                  );
                  break;
                
                case 'toggleAutoFilter':
                  commandManager.execute(
                    new ToggleAutoFilterCommand(sheet, command.range, command.enabled ?? true)
                  );
                  break;
                
                case 'clearFilter':
                  commandManager.execute(
                    new ClearFilterCommand(sheet)
                  );
                  break;
                
                case 'setDataValidation':
                  commandManager.execute(
                    new SetDataValidationCommand(sheet, command.range, command.rule)
                  );
                  break;
                
                case 'clearDataValidation':
                  commandManager.execute(
                    new ClearDataValidationCommand(sheet, command.range)
                  );
                  break;
                
                case 'removeDuplicates':
                  commandManager.execute(
                    new RemoveDuplicatesCommand(sheet, command.range, command.compareColumns, command.hasHeaders)
                  );
                  break;
                
                case 'textToColumns':
                  commandManager.execute(
                    new TextToColumnsCommand(sheet, command.range, command.delimiter, command.dataType)
                  );
                  break;
                
                case 'group':
                  commandManager.execute(
                    new GroupOutlineCommand(sheet, command.range, command.axis)
                  );
                  break;
                
                case 'ungroup':
                  commandManager.execute(
                    new UngroupOutlineCommand(sheet, command.range, command.axis)
                  );
                  break;
                
                default:
                  console.warn('Unknown Data command:', command.type);
              }
              
              onStructureChange?.();
            } catch (error) {
              console.error('Data command error:', error);
            }
          }}
        />
      ) : activeTab === 'review' ? (
        <ReviewTab
          workbook={workbook}
          selectedCells={cells}
          onCommand={(command) => {
            console.log('Review tab command:', command);
            
            const sheet = worksheet || workbook?.activeSheet;
            if (!commandManager) return;

            try {
              switch (command.type) {
                case 'newComment':
                case 'addComment':
                  if (sheet && command.cell && command.text) {
                    commandManager.execute(
                      new AddCommentCommand(sheet, command.cell, command.text, command.author)
                    );
                  }
                  break;
                
                case 'deleteComment':
                  if (sheet && command.cell) {
                    commandManager.execute(
                      new DeleteCommentCommand(sheet, command.cell)
                    );
                  }
                  break;
                
                case 'toggleComments':
                  if (sheet && command.option) {
                    commandManager.execute(
                      new ToggleCommentsVisibilityCommand(sheet, command.option)
                    );
                  }
                  break;
                
                case 'protectSheet':
                  if (sheet && command.options) {
                    commandManager.execute(
                      new ProtectSheetCommand(sheet, command.options)
                    );
                  }
                  break;
                
                case 'unprotectSheet':
                  if (sheet) {
                    commandManager.execute(
                      new UnprotectSheetCommand(sheet, command.password)
                    );
                  }
                  break;
                
                case 'protectWorkbook':
                  if (workbook && command.options) {
                    commandManager.execute(
                      new ProtectWorkbookCommand(workbook, command.options)
                    );
                  }
                  break;
                
                case 'unprotectWorkbook':
                  if (workbook) {
                    commandManager.execute(
                      new UnprotectWorkbookCommand(workbook, command.password)
                    );
                  }
                  break;
                
                case 'checkSpelling':
                  if (sheet && command.corrections && command.corrections.length > 0) {
                    commandManager.execute(
                      new SpellCheckCommand(sheet, command.corrections)
                    );
                  }
                  break;
                
                case 'trackChanges':
                  if (workbook && typeof command.enabled === 'boolean') {
                    commandManager.execute(
                      new ToggleTrackChangesCommand(workbook, command.enabled)
                    );
                  }
                  break;
                
                default:
                  console.warn('Unknown Review command:', command.type);
              }
              
              onStructureChange?.();
            } catch (error) {
              console.error('Review command error:', error);
            }
          }}
        />
      ) : activeTab === 'view' ? (
        <ViewTab
          workbook={workbook}
          selectedCells={cells}
          currentView="normal"
          currentZoom={100}
          showRuler={false}
          showGridlines={true}
          showFormulaBar={true}
          showHeadings={true}
          onViewChange={(view) => {
            const sheet = worksheet || workbook?.activeSheet;
            if (sheet && commandManager) {
              commandManager.execute(
                new SetViewModeCommand(workbook, view as 'normal' | 'pageBreak' | 'pageLayout')
              );
            }
          }}
          onZoomChange={(zoom) => {
            const sheet = worksheet || workbook?.activeSheet;
            if (sheet && commandManager) {
              commandManager.execute(
                new SetZoomCommand(workbook, zoom)
              );
            }
          }}
          onToggleShow={(option, value) => {
            if (workbook && commandManager) {
              commandManager.execute(
                new ToggleShowOptionCommand(workbook, option, value)
              );
            }
          }}
          onZoomToSelection={() => {
            const sheet = worksheet || workbook?.activeSheet;
            if (sheet && commandManager && cells.length > 0) {
              const selectionRange = {
                start: cells[0],
                end: cells[cells.length - 1] || cells[0],
              };
              commandManager.execute(
                new ZoomToSelectionCommand(workbook, selectionRange)
              );
            }
          }}
          onCustomViews={() => {
            console.log('Custom Views dialog');
            // TODO: Open custom views manager dialog
          }}
          onCommand={(command) => {
            console.log('View tab command:', command);
            
            if (!workbook || !commandManager) return;

            try {
              switch (command.type) {
                case 'freezePanes':
                  commandManager.execute(
                    new FreezePanesCommand(workbook, command.freezeType, command.cell)
                  );
                  break;
                
                case 'splitWindow':
                  commandManager.execute(
                    new SplitWindowCommand(workbook, command.cell)
                  );
                  break;
                
                case 'hideWindow':
                  commandManager.execute(
                    new HideWindowCommand(workbook)
                  );
                  break;
                
                case 'newWindow':
                  commandManager.execute(
                    new NewWindowCommand(workbook)
                  );
                  break;
                
                case 'arrangeWindows':
                  commandManager.execute(
                    new ArrangeWindowsCommand(workbook, command.layout)
                  );
                  break;
                
                default:
                  console.warn('Unknown View command:', command.type);
              }
              
              onStructureChange?.();
            } catch (error) {
              console.error('View command error:', error);
            }
          }}
        />
      ) : (
        <div style={placeholderStyle}>
          {RIBBON_TABS.find(t => t.id === activeTab)?.label} tab — coming soon
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────

const GroupDivider: React.FC = () => (
  <div style={{
    width: 1,
    background: '#D9D9D9',
    margin: '4px 6px',
    alignSelf: 'stretch',
    flexShrink: 0,
  }} />
);

/** Lightweight clipboard placeholder when core services aren't available */
const ClipboardPlaceholder: React.FC = () => {
  const btnStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 2, padding: '4px 8px', border: '1px solid transparent',
    background: 'transparent', cursor: 'pointer', borderRadius: 2,
    fontSize: 10, color: '#333', fontFamily: 'Segoe UI, sans-serif',
    minWidth: 44,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px' }}>
      <div style={{ display: 'flex', gap: 2 }}>
        <button style={{ ...btnStyle, minWidth: 56, fontSize: 11 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span>Paste</span>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>
        {['✂️ Cut', '📄 Copy', '🖌 Format'].map(label => (
          <button key={label} style={btnStyle}>
            <span style={{ fontSize: 13 }}>{label.split(' ')[0]}</span>
            <span>{label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 9, color: '#888', textAlign: 'center', marginTop: 1 }}>Clipboard</div>
    </div>
  );
};

/** Lightweight font placeholder */
const FontPlaceholder: React.FC = () => {
  const selStyle: React.CSSProperties = {
    height: 22, border: '1px solid #BFBFBF', background: '#fff',
    fontSize: 11, padding: '0 4px', borderRadius: 2, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  };
  const btnStyle: React.CSSProperties = {
    width: 24, height: 22, border: '1px solid transparent',
    background: 'transparent', cursor: 'pointer', borderRadius: 2,
    fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 4px' }}>
      <div style={{ display: 'flex', gap: 2 }}>
        <select style={{ ...selStyle, width: 110 }}>
          <option>Calibri</option>
        </select>
        <select style={{ ...selStyle, width: 42 }}>
          <option>11</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>
        {[
          { label: <b>B</b>, title: 'Bold' },
          { label: <i>I</i>, title: 'Italic' },
          { label: <u>U</u>, title: 'Underline' },
          { label: '🎨', title: 'Font Color' },
          { label: '🪣', title: 'Fill Color' },
        ].map(({ label, title }) => (
          <button key={title} title={title} style={btnStyle}>{label}</button>
        ))}
      </div>
      <div style={{ fontSize: 9, color: '#888', textAlign: 'center', marginTop: 1 }}>Font</div>
    </div>
  );
};

export default ExcelRibbon;
