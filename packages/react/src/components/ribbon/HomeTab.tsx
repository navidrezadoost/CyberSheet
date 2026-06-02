import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import type { Address, Range, Worksheet } from '@cyber-sheet/core';
import {
  ArrowUndoRegular,
  ArrowRedoRegular,
  TextBoldRegular,
  TextItalicRegular,
  TextUnderlineRegular,
} from '@fluentui/react-icons';
import { ClearCellsCommand, ClipboardService, FormattingController, type InsertCellsMode, type DeleteCellsMode } from '@cyber-sheet/core';
import {
  executeInsertCells,
  executeDeleteCells,
} from '../../utils/insertDeleteCells';
import {
  executeMultiSortSelection,
  executeSortSelection,
  normalizeRange,
  resolveSortRange,
} from '../../utils/sortFilterCommands';
import { CustomSortDialog } from '../dialogs/CustomSortDialog';
import {
  autoFitColumnWidths,
  autoFitRowHeights,
  hideColumnsInRange,
  hideRowsInRange,
  setCellsLocked,
  setColumnWidthsInRange,
  setRowHeightsInRange,
  unhideColumnsNearRange,
  unhideRowsNearRange,
} from '../../utils/formatOperations';
import { RibbonGroup } from './RibbonGroup';
import { RibbonButton } from './RibbonButton';
import { RibbonSelect } from './RibbonSelect';
import { RibbonRow } from './RibbonRow';
import { FontColorButton } from './FontColorButton';
import { FillColorButton } from './FillColorButton';
import { BorderButton } from './BorderButton';
import { NumberFormatButton } from './NumberFormatButton';
import { AlignmentGroup } from './AlignmentGroup';
import { ClipboardGroup } from './ClipboardGroup';
import { StylesGroup } from './StylesGroup';
import { CellsGroup } from './CellsGroup';
import { EditingGroup } from './EditingGroup';
import { useCyberSheetConfig, useCyberSheetAppConfig } from '../../config/CyberSheetConfigContext';
import { isHomeGroupEnabled } from '../../config/appConfig';
import type { SelectionState, CommandManager, StyleState, ColorValue } from './types';
import type { Fill } from './fillTypes';
import { NO_FILL, solidFill } from './fillTypes';
import type { BorderPayload } from './borderTypes';
import type { NumberFormatValue } from './numberFormatTypes';
import './ribbon.css';

export interface HomeTabProps {
  // Command manager for undo/redo operations
  commandManager: CommandManager;
  
  // Current selection state
  selection: SelectionState;

  worksheet?: Worksheet | null;
  clipboardService?: ClipboardService;
  onAfterCommand?: () => void;
  historyVersion?: number;
  onOpenFindReplace?: (tab: 'find' | 'replace') => void;
  onInsertSheet?: () => void;
  onDeleteSheet?: () => void;
  onRequestRenameSheet?: () => void;
  onFilter?: (action: 'toggle' | 'clear' | 'reapply') => void;
  formattingController?: FormattingController | null;
  onAutoSum?: (functionType: string) => void;
}

/**
 * HomeTab - Excel Home Tab Ribbon Implementation (Phase 1: Undo/Redo + Font)
 * 
 * This component implements Week 1 of Phase 1 from the roadmap:
 * ✅ Undo/Redo buttons (connected to CommandManager)
 * ✅ Font Family dropdown (searchable in future enhancement)
 * ✅ Font Size dropdown
 * ✅ Bold/Italic/Underline buttons with active states
 * ✅ Font Color picker with theme colors, standard colors, recent colors
 * ✅ Fill Color picker with patterns and gradients (Phase 1 extension)
 * 
 * Backend Integration:
 * - Uses existing UndoManager (100% complete)
 * - Uses existing CellStyle interface (100% complete)
 * - Command Pattern integration for all style changes
 * 
 * Future Enhancements (Week 1+ completion):
 * - Font preview in dropdown
 * - Grow/Shrink font buttons
 * - Fill Color picker (same system + patterns + gradients)
 * - More font families
 * 
 * @example
 * <HomeTab 
 *   commandManager={workbook.commandManager} 
 *   selection={getCurrentSelection()} 
 * />
 */
export const HomeTab: React.FC<HomeTabProps> = ({
  commandManager,
  selection,
  worksheet,
  clipboardService,
  onAfterCommand,
  historyVersion = 0,
  onOpenFindReplace,
  onInsertSheet,
  onDeleteSheet,
  onRequestRenameSheet,
  onFilter,
  formattingController: formattingControllerProp,
  onAutoSum,
}) => {
  const [showCustomSortDialog, setShowCustomSortDialog] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const formatPainterSourceRef = useRef<string | null>(null);
  const cyberSheetConfig = useCyberSheetConfig();
  const appConfig = useCyberSheetAppConfig();

  useEffect(() => {
    setStyleVersion((version) => version + 1);
  }, [historyVersion]);
  const fontFamilies = cyberSheetConfig.fonts.families;
  const fontSizes = cyberSheetConfig.fonts.sizes;

  const range = useMemo<Range | null>(() => {
    const sel = selection as any;
    if (!sel?.start || !sel?.end) return null;
    return {
      start: {
        row: Math.min(sel.start.row, sel.end.row),
        col: Math.min(sel.start.col, sel.end.col),
      },
      end: {
        row: Math.max(sel.start.row, sel.end.row),
        col: Math.max(sel.start.col, sel.end.col),
      },
    };
  }, [selection]);

  const selectedAddresses = useMemo<Address[]>(() => {
    if (!range) return [];
    const addresses: Address[] = [];
    for (let row = range.start.row; row <= range.end.row; row++) {
      for (let col = range.start.col; col <= range.end.col; col++) {
        addresses.push({ row, col });
      }
    }
    return addresses;
  }, [range]);

  const formattingController = useMemo(() => {
    if (formattingControllerProp) return formattingControllerProp;
    if (!worksheet) return null;
    return new FormattingController(worksheet, commandManager as any);
  }, [formattingControllerProp, worksheet, commandManager]);

  const selectionKey = useMemo(
    () => selectedAddresses.map((addr) => `${addr.row},${addr.col}`).sort().join('|'),
    [selectedAddresses],
  );

  const handleFormatPainterActivate = useCallback((active: boolean) => {
    setFormatPainterActive(active);
    if (active) {
      formatPainterSourceRef.current = selectionKey;
    } else {
      formatPainterSourceRef.current = null;
      document.body.classList.remove('format-painter-active');
    }
  }, [selectionKey]);

  useEffect(() => {
    if (!formattingController?.isFormatPainterActive()) {
      if (formatPainterActive) {
        setFormatPainterActive(false);
        document.body.classList.remove('format-painter-active');
      }
      return;
    }

    if (selectedAddresses.length === 0) return;

    const sourceKey = formatPainterSourceRef.current;
    if (!sourceKey || selectionKey === sourceKey) return;

    formattingController.applyFormat(selectedAddresses);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();

    if (!formattingController.isFormatPainterActive()) {
      setFormatPainterActive(false);
      formatPainterSourceRef.current = null;
      document.body.classList.remove('format-painter-active');
    }
  }, [
    selectionKey,
    selectedAddresses,
    formattingController,
    formatPainterActive,
    onAfterCommand,
  ]);

  const activeStyle = useMemo(() => {
    if (!worksheet || !range) return {};
    return worksheet.getCellStyle(range.start) ?? {};
  }, [worksheet, range, styleVersion]);

  const selectionBold = useMemo(() => {
    if (!worksheet || selectedAddresses.length === 0) return false;
    const boldStates = selectedAddresses.map((addr) => worksheet.getCellStyle(addr)?.bold === true);
    if (boldStates.every(Boolean)) return true;
    if (boldStates.some(Boolean)) return undefined;
    return false;
  }, [worksheet, selectedAddresses, styleVersion]);

  const selectionStyle = useMemo<SelectionState>(() => {
    const fill = activeStyle.fill;
    const fillColor: StyleState<Fill> =
      typeof fill === 'string'
        ? solidFill(fill)
        : undefined;

    return {
      ...(selection || {}),
      fontFamily: activeStyle.fontFamily ?? selection?.fontFamily ?? cyberSheetConfig.fonts.defaultFamily,
      fontSize: activeStyle.fontSize ?? selection?.fontSize ?? cyberSheetConfig.fonts.defaultSize,
      bold: selectionBold ?? selection?.bold,
      italic: activeStyle.italic ?? selection?.italic,
      underline: activeStyle.underline ?? selection?.underline,
      fontColor: (activeStyle.color as string | undefined) ?? selection?.fontColor,
      fillColor: fillColor ?? selection?.fillColor,
      border: selection?.border,
      numberFormat: activeStyle.numberFormat
        ? { formatString: activeStyle.numberFormat }
        : selection?.numberFormat,
      horizontalAlign: (activeStyle.align as any) ?? selection?.horizontalAlign,
      verticalAlign: (activeStyle.valign as any) ?? selection?.verticalAlign,
      wrapText: activeStyle.wrap ?? selection?.wrapText,
    };
  }, [activeStyle, selection, cyberSheetConfig, selectionBold]);

  const runFormatting = useCallback((operation: () => void) => {
    if (!formattingController || selectedAddresses.length === 0) return;
    operation();
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [formattingController, selectedAddresses.length, onAfterCommand]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (commandManager.undo()) {
      setStyleVersion((version) => version + 1);
      onAfterCommand?.();
    }
  }, [commandManager, onAfterCommand]);

  const handleRedo = useCallback(() => {
    if (commandManager.redo()) {
      setStyleVersion((version) => version + 1);
      onAfterCommand?.();
    }
  }, [commandManager, onAfterCommand]);

  // Font family change handler
  const handleFontFamilyChange = useCallback(
    (fontFamily: string) => {
      runFormatting(() => formattingController?.setFontFamily(selectedAddresses, fontFamily));
    },
    [formattingController, runFormatting, selectedAddresses]
  );

  // Font size change handler
  const handleFontSizeChange = useCallback(
    (fontSize: string) => {
      const size = Number(fontSize);
      if (!Number.isFinite(size)) return;
      runFormatting(() => formattingController?.setFontSize(selectedAddresses, size));
    },
    [formattingController, runFormatting, selectedAddresses]
  );

  // Bold toggle handler
  const handleBoldToggle = useCallback(() => {
    runFormatting(() => formattingController?.toggleBold(selectedAddresses));
  }, [formattingController, runFormatting, selectedAddresses]);

  // Italic toggle handler
  const handleItalicToggle = useCallback(() => {
    runFormatting(() => formattingController?.toggleItalic(selectedAddresses));
  }, [formattingController, runFormatting, selectedAddresses]);

  // Underline toggle handler
  const handleUnderlineToggle = useCallback(() => {
    runFormatting(() => formattingController?.toggleUnderline(selectedAddresses));
  }, [formattingController, runFormatting, selectedAddresses]);

  // Font color command (range-aware)
  const fontColorCommand = useMemo(
    () => ({
      execute: (color: ColorValue, sel: any) => {
        runFormatting(() => formattingController?.setFontColor(selectedAddresses, color));
      },
    }),
    [formattingController, runFormatting, selectedAddresses]
  );

  // Fill color command (range-aware, works with Fill objects)
  const fillColorCommand = useMemo(
    () => ({
      execute: (fill: Fill, sel: any) => {
        runFormatting(() => {
          if (!formattingController) return;
          if (fill === NO_FILL || (fill.type === 'solid' && fill.color === 'transparent')) {
            formattingController.removeFill(selectedAddresses);
          } else if (fill.type === 'solid') {
            formattingController.setFill(selectedAddresses, fill.color);
          } else if (fill.type === 'pattern') {
            formattingController.setFill(selectedAddresses, fill.background);
          } else {
            formattingController.setFill(selectedAddresses, fill.stops[0]?.color ?? '#FFFFFF');
          }
        });
      },
    }),
    [formattingController, runFormatting, selectedAddresses]
  );

  // Border command handler (range-aware, works with BorderPayload arrays)
  const handleBorderApply = useCallback(
    (payloads: BorderPayload[]) => {
      runFormatting(() => {
        if (!formattingController) return;

        const border: Record<string, { color: string; style: string }> = {};
        const makeEdge = (payload: BorderPayload) => ({
          color: payload.color || '#000000',
          style: payload.style === 'hair' ? 'hairline' : payload.style,
        });
        for (const payload of payloads) {
          if (payload.position === 'clear' || payload.style === 'none') {
            formattingController.removeBorders(selectedAddresses);
            return;
          }

          const edge = makeEdge(payload);
          switch (payload.position) {
            case 'all':
            case 'outer':
              border.top = edge;
              border.right = edge;
              border.bottom = edge;
              border.left = edge;
              break;
            case 'horizontal':
              border.top = edge;
              border.bottom = edge;
              break;
            case 'vertical':
              border.left = edge;
              border.right = edge;
              break;
            case 'inner':
              border.top = edge;
              border.right = edge;
              border.bottom = edge;
              border.left = edge;
              break;
            default:
              border[payload.position] = edge;
          }
        }

        formattingController.setBorder(selectedAddresses, border as any);
      });
    },
    [formattingController, runFormatting, selectedAddresses]
  );

  // Number format command handler (semantic state, NOT visual)
  const handleNumberFormatApply = useCallback(
    (format: NumberFormatValue) => {
      runFormatting(() => formattingController?.setNumberFormat(selectedAddresses, format.formatString));
    },
    [formattingController, runFormatting, selectedAddresses]
  );

  // Alignment handlers (compound state: horizontal × vertical × wrap)
  const handleHorizontalAlignChange = useCallback(
    (align: "left" | "center" | "right" | "justify") => {
      runFormatting(() => formattingController?.setHorizontalAlign(selectedAddresses, align));
    },
    [formattingController, runFormatting, selectedAddresses]
  );

  const handleVerticalAlignChange = useCallback(
    (align: "top" | "middle" | "bottom") => {
      runFormatting(() => formattingController?.setVerticalAlign(selectedAddresses, align));
    },
    [formattingController, runFormatting, selectedAddresses]
  );

  const handleWrapTextToggle = useCallback(() => {
    runFormatting(() => formattingController?.toggleWrapText(selectedAddresses));
  }, [formattingController, runFormatting, selectedAddresses]);

  const handleMergeClick = useCallback(() => {
    if (!formattingController || !range) return;
    if (range.start.row === range.end.row && range.start.col === range.end.col) return;
    formattingController.mergeAndCenter(range);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [formattingController, range, onAfterCommand]);

  const handleMergeCellsClick = useCallback(() => {
    if (!formattingController || !range) return;
    if (range.start.row === range.end.row && range.start.col === range.end.col) return;
    formattingController.mergeCells(range);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [formattingController, range, onAfterCommand]);

  const handleUnmergeClick = useCallback(() => {
    if (!formattingController || !range) return;
    formattingController.unmergeCells(range);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [formattingController, range, onAfterCommand]);

  const canMerge = useMemo(() => {
    if (!range) return false;
    return !(range.start.row === range.end.row && range.start.col === range.end.col);
  }, [range]);

  const handleClear = useCallback((type: 'all' | 'formats' | 'contents' | 'comments' | 'hyperlinks') => {
    if (!worksheet || !range) return;
    if (type === 'formats') {
      runFormatting(() => formattingController?.clearFormat(selectedAddresses));
      return;
    }
    if (type === 'contents' || type === 'all') {
      commandManager.execute(new ClearCellsCommand(worksheet, range));
      if (type === 'all') {
        formattingController?.clearFormat(selectedAddresses);
      }
      setStyleVersion((version) => version + 1);
      onAfterCommand?.();
    }
  }, [worksheet, range, runFormatting, formattingController, selectedAddresses, commandManager, onAfterCommand]);

  const handleFormatOperation = useCallback((operation: string, value?: any) => {
    if (operation === 'insertSheet') {
      onInsertSheet?.();
      onAfterCommand?.();
      return;
    }
    if (operation === 'deleteSheet') {
      onDeleteSheet?.();
      onAfterCommand?.();
      return;
    }
    if (operation === 'renameSheet') {
      onRequestRenameSheet?.();
      return;
    }

    if (!worksheet || !range) return;

    switch (operation) {
      case 'rowHeight': {
        const px = Number(value) * (4 / 3);
        if (!Number.isFinite(px) || px <= 0) return;
        setRowHeightsInRange(commandManager, worksheet, range, px);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      }
      case 'columnWidth': {
        const px = Math.max(12, Number(value) * 8);
        if (!Number.isFinite(px) || px <= 0) return;
        setColumnWidthsInRange(commandManager, worksheet, range, px);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      }
      case 'autoFitColumnWidth':
        autoFitColumnWidths(commandManager, worksheet, range);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      case 'autoFitRowHeight':
        autoFitRowHeights(commandManager, worksheet, range);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      case 'hideRows':
        hideRowsInRange(commandManager, worksheet, range);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      case 'unhideRows':
        unhideRowsNearRange(commandManager, worksheet, range);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      case 'hideColumns':
        hideColumnsInRange(commandManager, worksheet, range);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      case 'unhideColumns':
        unhideColumnsNearRange(commandManager, worksheet, range);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      case 'lockCell':
        setCellsLocked(commandManager, worksheet, selectedAddresses, true);
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
        break;
      default:
        console.warn(`Unknown Home tab format operation: ${operation}`);
    }
  }, [worksheet, range, selectedAddresses, commandManager, onAfterCommand, onInsertSheet, onDeleteSheet, onRequestRenameSheet]);

  const handleInsertCells = useCallback((mode: InsertCellsMode) => {
    if (!worksheet || !range) return;
    executeInsertCells(worksheet, commandManager, range, mode);
    onAfterCommand?.();
  }, [worksheet, range, commandManager, onAfterCommand]);

  const handleDeleteCells = useCallback((mode: DeleteCellsMode) => {
    if (!worksheet || !range) return;
    executeDeleteCells(worksheet, commandManager, range, mode);
    onAfterCommand?.();
  }, [worksheet, range, commandManager, onAfterCommand]);

  const handleSort = useCallback((direction: 'asc' | 'desc' | 'custom') => {
    if (!worksheet || !range) return;
    if (direction === 'custom') {
      setShowCustomSortDialog(true);
      return;
    }
    executeSortSelection(commandManager, worksheet, range, direction);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [worksheet, range, commandManager, onAfterCommand]);

  const handleCustomSortApply = useCallback((
    levels: Array<{ columnIndex: number; ascending: boolean }>,
    hasHeaders: boolean,
  ) => {
    if (!worksheet || !range) return;
    executeMultiSortSelection(commandManager, worksheet, range, levels, hasHeaders);
    setShowCustomSortDialog(false);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [worksheet, range, commandManager, onAfterCommand]);

  const customSortRange = useMemo(() => {
    if (!range) return null;
    return worksheet ? resolveSortRange(worksheet, range) : normalizeRange(range);
  }, [worksheet, range]);

  return (
    <div className="ribbon-content">
      {isHomeGroupEnabled(appConfig, 'clipboard') && (
      <>
      {/* ==================== Clipboard Group ==================== */}
      <ClipboardGroup
        worksheet={worksheet as any}
        clipboardService={(clipboardService ?? new ClipboardService()) as any}
        formattingController={formattingController as any}
        commandManager={commandManager}
        selectedCells={selectedAddresses}
        currentRange={range ?? undefined}
        onAfterClipboard={onAfterCommand}
        formatPainterActive={formatPainterActive}
        onFormatPainterActivate={handleFormatPainterActivate}
      />

      {/* ==================== Undo/Redo Group ==================== */}
      <RibbonGroup title="Undo" className="compact">
        <RibbonRow gap={2}>
          <RibbonButton
            icon={<ArrowUndoRegular />}
            tooltip="Undo (Ctrl+Z)"
            onClick={handleUndo}
            disabled={!commandManager.canUndo()}
            size="medium"
          />
          <RibbonButton
            icon={<ArrowRedoRegular />}
            tooltip="Redo (Ctrl+Y)"
            onClick={handleRedo}
            disabled={!commandManager.canRedo()}
            size="medium"
          />
        </RibbonRow>
      </RibbonGroup>
      </>
      )}

      {(isHomeGroupEnabled(appConfig, 'font') || isHomeGroupEnabled(appConfig, 'number')) && (
      <RibbonGroup title="Font" showDialogLauncher onDialogLauncherClick={() => console.log('Font dialog')}>
        <div className="font-group-content">
          {isHomeGroupEnabled(appConfig, 'font') && (
          <>
          {/* Column 1: Font dropdowns */}
          <div className="font-dropdowns-column">
            <RibbonSelect
              value={selectionStyle?.fontFamily || 'Calibri'}
              options={fontFamilies}
              onChange={handleFontFamilyChange}
              width={120}
              className="font-family-select"
              ariaLabel="Font family"
            />
            <RibbonSelect
              value={selectionStyle?.fontSize || 11}
              options={fontSizes}
              onChange={handleFontSizeChange}
              width={60}
              className="font-size-select"
              ariaLabel="Font size"
            />
          </div>
          
          {/* Column 2: Font style buttons */}
          <div className="small-btns-column">
            <div className="font-row">
              <RibbonButton
                icon={<TextBoldRegular />}
                tooltip="Bold (Ctrl+B)"
                active={selectionStyle?.bold || false}
                onClick={handleBoldToggle}
                size="small"
              />
              <RibbonButton
                icon={<TextItalicRegular />}
                tooltip="Italic (Ctrl+I)"
                active={selectionStyle?.italic || false}
                onClick={handleItalicToggle}
                size="small"
              />
              <RibbonButton
                icon={<TextUnderlineRegular />}
                tooltip="Underline (Ctrl+U)"
                active={selectionStyle?.underline || false}
                onClick={handleUnderlineToggle}
                size="small"
              />
            </div>
            <div className="font-row">
              {/* Font Color Picker */}
              <FontColorButton
                command={fontColorCommand}
                selectionColor={selectionStyle?.fontColor}
              />
              
              {/* Fill Color Picker */}
              <FillColorButton
                command={fillColorCommand}
                selectionFill={selectionStyle?.fillColor}
              />
              
              {/* Border Picker */}
              <BorderButton
                selectionBorder={selectionStyle?.border}
                onApply={handleBorderApply}
              />
            </div>
          </div>
          </>
          )}
          
          {/* Column 3: Number format */}
          {isHomeGroupEnabled(appConfig, 'number') && (
          <NumberFormatButton
            numberFormat={selectionStyle?.numberFormat}
            onApply={handleNumberFormatApply}
          />
          )}
        </div>
      </RibbonGroup>
      )}

      {isHomeGroupEnabled(appConfig, 'alignment') && (
      <RibbonGroup title="Alignment">
        <AlignmentGroup
          horizontalAlign={selectionStyle?.horizontalAlign}
          verticalAlign={selectionStyle?.verticalAlign}
          wrapText={selectionStyle?.wrapText}
          onHorizontalAlignChange={handleHorizontalAlignChange}
          onVerticalAlignChange={handleVerticalAlignChange}
          onWrapTextToggle={handleWrapTextToggle}
          onMergeClick={handleMergeClick}
          onMergeCellsClick={handleMergeCellsClick}
          onUnmergeClick={handleUnmergeClick}
          canMerge={canMerge}
        />
      </RibbonGroup>
      )}

      {isHomeGroupEnabled(appConfig, 'styles') && (
      <StylesGroup
        formattingController={formattingController as any}
        worksheet={worksheet ?? undefined}
        commandManager={commandManager}
        selectedCells={selectedAddresses}
        currentRange={range ?? undefined}
        onStyleChange={onAfterCommand}
      />
      )}

      {isHomeGroupEnabled(appConfig, 'cells') && (
      <CellsGroup
        formattingController={formattingController as any}
        selectedCells={selectedAddresses}
        currentRange={range ?? undefined}
        onInsertCells={handleInsertCells}
        onDeleteCells={handleDeleteCells}
        onFormatOperation={handleFormatOperation}
        onStructureChange={onAfterCommand}
      />
      )}

      {isHomeGroupEnabled(appConfig, 'editing') && (
      <EditingGroup
        formattingController={formattingController as any}
        selectedCells={selectedAddresses}
        currentRange={range ?? undefined}
        onAutoSum={onAutoSum}
        onFill={(dir) => console.log('Fill:', dir)}
        onClear={handleClear}
        onSort={handleSort}
        onFilter={onFilter}
        onOpenFindReplace={onOpenFindReplace}
      />
      )}

      {showCustomSortDialog && customSortRange && (
        <CustomSortDialog
          sortRange={customSortRange}
          onClose={() => setShowCustomSortDialog(false)}
          onSort={handleCustomSortApply}
        />
      )}
    </div>
  );
};
