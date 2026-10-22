import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import type {
  Address,
  AddressRange,
  Range,
  Worksheet,
  CommandManager,
} from "@cyber-sheet/core";
import {
  TextBoldRegular,
  TextItalicRegular,
  TextUnderlineRegular,
} from "@fluentui/react-icons";
import {
  ClearCellsCommand,
  ClipboardService,
  FormattingController,
  type InsertCellsMode,
  type DeleteCellsMode,
} from "@cyber-sheet/core";
import {
  executeInsertCells,
  executeDeleteCells,
} from "../../utils/insertDeleteCells";
import {
  executeMultiSortSelection,
  executeSortSelection,
  normalizeRange,
  resolveSortRange,
} from "../../utils/sortFilterCommands";
import { CustomSortDialog } from "../dialogs/CustomSortDialog";
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
} from "../../utils/formatOperations";
import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { RibbonSelect } from "./RibbonSelect";
import { FontColorButton } from "./FontColorButton";
import { FillColorButton } from "./FillColorButton";
import { BorderButton } from "./BorderButton";
import { NumberFormatGroup } from "./NumberFormatGroup";
import { AlignmentGroup } from "./AlignmentGroup";
import { ClipboardGroup } from "./ClipboardGroup";
import { StylesGroup } from "./StylesGroup";
import { CellsGroup } from "./CellsGroup";
import { EditingGroup } from "./EditingGroup";
import {
  useCyberSheetConfig,
  useCyberSheetAppConfig,
} from "../../config/CyberSheetConfigContext";
import {
  getLegacySelectionAddresses,
  getFormattableSelection,
} from "../../utils/selectionAddressing";
import { isHomeGroupEnabled } from "../../config/appConfig";
import type { SelectionState, StyleState, ColorValue } from "./types";
import type { Fill } from "./fillTypes";
import { NO_FILL, solidFill } from "./fillTypes";
import type { BorderPayload } from "./borderTypes";
import type { SheetAccess } from "../../utils/workbookSheetAccess";
import { requireStandaloneWorksheet } from "../../utils/workbookSheetAccess";
import "./ribbon.css";

export interface HomeTabProps {
  // Command manager for undo/redo operations
  commandManager: CommandManager;

  // Current selection state
  selection: SelectionState;

  worksheet?: SheetAccess | null;
  clipboardService?: ClipboardService;
  onAfterCommand?: () => void;
  historyVersion?: number;
  onOpenFindReplace?: (tab: "find" | "replace") => void;
  onInsertSheet?: () => void;
  onDeleteSheet?: () => void;
  onRequestRenameSheet?: () => void;
  onFilter?: (action: "toggle" | "clear" | "reapply") => void;
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

  const formattableSelection = useMemo(
    () => getFormattableSelection(range),
    [range],
  );

  const selectedRanges = formattableSelection.ranges;

  const selectedAddresses = useMemo(
    () => getLegacySelectionAddresses(range),
    [range],
  );

  const formattingController = useMemo(() => {
    if (formattingControllerProp) return formattingControllerProp;
    if (!worksheet) return null;
    if ("workbookId" in worksheet) return null;
    return new FormattingController(worksheet, commandManager as any);
  }, [formattingControllerProp, worksheet, commandManager]);

  // A selection is a rectangle, so its bounds identify it. (Joining + sorting a string
  // per cell made every selection change O(N log N) for large selections like Ctrl+A.)
  const selectionKey = useMemo(
    () =>
      range
        ? `${range.start.row},${range.start.col}:${range.end.row},${range.end.col}`
        : "",
    [range],
  );

  const handleFormatPainterActivate = useCallback(
    (active: boolean) => {
      setFormatPainterActive(active);
      if (active) {
        formatPainterSourceRef.current = selectionKey;
      } else {
        formatPainterSourceRef.current = null;
        document.body.classList.remove("format-painter-active");
      }
    },
    [selectionKey],
  );

  useEffect(() => {
    if (!formattingController?.isFormatPainterActive()) {
      if (formatPainterActive) {
        setFormatPainterActive(false);
        document.body.classList.remove("format-painter-active");
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
      document.body.classList.remove("format-painter-active");
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
    if (!worksheet || !range) return false;
    return worksheet.getCellStyle(range.start)?.bold === true;
  }, [worksheet, range, styleVersion]);

  const selectionStyle = useMemo<SelectionState>(() => {
    const fill = activeStyle.fill;
    const fillColor: StyleState<Fill> =
      typeof fill === "string" ? solidFill(fill) : undefined;

    return {
      ...(selection || {}),
      fontFamily:
        activeStyle.fontFamily ??
        selection?.fontFamily ??
        cyberSheetConfig.fonts.defaultFamily,
      fontSize:
        activeStyle.fontSize ??
        selection?.fontSize ??
        cyberSheetConfig.fonts.defaultSize,
      bold: selectionBold ?? selection?.bold,
      italic: activeStyle.italic ?? selection?.italic,
      underline: Boolean(activeStyle.underline ?? selection?.underline),
      fontColor:
        (activeStyle.color as string | undefined) ?? selection?.fontColor,
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

  const runFormatting = useCallback(
    (operation: () => void) => {
      if (!formattingController || selectedRanges.length === 0) return;
      operation();
      setStyleVersion((version) => version + 1);
      onAfterCommand?.();
    },
    [formattingController, selectedRanges.length, onAfterCommand],
  );

  // Font family change handler
  const handleFontFamilyChange = useCallback(
    (fontFamily: string) => {
      runFormatting(() =>
        formattingController?.setFontFamilyInRanges(selectedRanges, fontFamily),
      );
    },
    [formattingController, runFormatting, selectedRanges],
  );

  // Font size change handler
  const handleFontSizeChange = useCallback(
    (fontSize: string) => {
      const size = Number(fontSize);
      if (!Number.isFinite(size)) return;
      runFormatting(() =>
        formattingController?.setFontSizeInRanges(selectedRanges, size),
      );
    },
    [formattingController, runFormatting, selectedRanges],
  );

  const handleFontSizeStep = useCallback(
    (direction: 1 | -1) => {
      const current = Number(selectionStyle?.fontSize ?? 11);
      const numericSizes = fontSizes
        .map((s) => Number(s))
        .filter((s) => Number.isFinite(s))
        .sort((a, b) => a - b);
      if (numericSizes.length === 0) return;
      let index = numericSizes.indexOf(current);
      if (index < 0) {
        index = numericSizes.findIndex((s) => s > current);
        if (index < 0) index = numericSizes.length - 1;
        else index = Math.max(0, index - 1);
      }
      const nextIndex = Math.max(
        0,
        Math.min(numericSizes.length - 1, index + direction),
      );
      handleFontSizeChange(String(numericSizes[nextIndex]));
    },
    [fontSizes, handleFontSizeChange, selectionStyle?.fontSize],
  );

  // Bold toggle handler
  const handleBoldToggle = useCallback(() => {
    runFormatting(() =>
      formattingController?.toggleBoldInRanges(selectedRanges),
    );
  }, [formattingController, runFormatting, selectedRanges]);

  // Italic toggle handler
  const handleItalicToggle = useCallback(() => {
    runFormatting(() =>
      formattingController?.toggleItalicInRanges(selectedRanges),
    );
  }, [formattingController, runFormatting, selectedRanges]);

  // Underline toggle handler
  const handleUnderlineToggle = useCallback(() => {
    runFormatting(() =>
      formattingController?.toggleUnderlineInRanges(selectedRanges),
    );
  }, [formattingController, runFormatting, selectedRanges]);

  // Font color command (range-aware)
  const fontColorCommand = useMemo(
    () => ({
      execute: (color: ColorValue, sel: any) => {
        runFormatting(() =>
          formattingController?.setFontColorInRanges(selectedRanges, color),
        );
      },
    }),
    [formattingController, runFormatting, selectedRanges],
  );

  // Fill color command (range-aware, works with Fill objects)
  const fillColorCommand = useMemo(
    () => ({
      execute: (fill: Fill, sel: any) => {
        runFormatting(() => {
          if (!formattingController) return;
          if (
            fill === NO_FILL ||
            (fill.type === "solid" && fill.color === "transparent")
          ) {
            formattingController.removeFillInRanges(selectedRanges);
          } else if (fill.type === "solid") {
            formattingController.setFillInRanges(selectedRanges, fill.color);
          } else if (fill.type === "pattern") {
            formattingController.setFillInRanges(
              selectedRanges,
              fill.background,
            );
          } else {
            formattingController.setFillInRanges(
              selectedRanges,
              fill.stops[0]?.color ?? "#FFFFFF",
            );
          }
        });
      },
    }),
    [formattingController, runFormatting, selectedRanges],
  );

  // Border command handler (range-aware, works with BorderPayload arrays)
  const handleBorderApply = useCallback(
    (payloads: BorderPayload[]) => {
      runFormatting(() => {
        if (!formattingController) return;

        const border: Record<string, { color: string; style: string }> = {};
        const makeEdge = (payload: BorderPayload) => ({
          color: payload.color || "#000000",
          style: payload.style === "hair" ? "hairline" : payload.style,
        });
        for (const payload of payloads) {
          if (payload.position === "clear" || payload.style === "none") {
            formattingController.removeBordersInRanges(selectedRanges);
            return;
          }

          const edge = makeEdge(payload);
          switch (payload.position) {
            case "all":
            case "outer":
              border.top = edge;
              border.right = edge;
              border.bottom = edge;
              border.left = edge;
              break;
            case "horizontal":
              border.top = edge;
              border.bottom = edge;
              break;
            case "vertical":
              border.left = edge;
              border.right = edge;
              break;
            case "inner":
              border.top = edge;
              border.right = edge;
              border.bottom = edge;
              border.left = edge;
              break;
            default:
              border[payload.position] = edge;
          }
        }

        formattingController.setBorderInRanges(selectedRanges, border as any);
      });
    },
    [formattingController, runFormatting, selectedRanges],
  );

  // Alignment handlers (compound state: horizontal × vertical × wrap)
  const handleHorizontalAlignChange = useCallback(
    (align: "left" | "center" | "right" | "justify") => {
      runFormatting(() =>
        formattingController?.setHorizontalAlignInRanges(selectedRanges, align),
      );
    },
    [formattingController, runFormatting, selectedRanges],
  );

  const handleVerticalAlignChange = useCallback(
    (align: "top" | "middle" | "bottom") => {
      runFormatting(() =>
        formattingController?.setVerticalAlignInRanges(selectedRanges, align),
      );
    },
    [formattingController, runFormatting, selectedRanges],
  );

  const handleWrapTextToggle = useCallback(() => {
    runFormatting(() =>
      formattingController?.toggleWrapTextInRanges(selectedRanges),
    );
  }, [formattingController, runFormatting, selectedRanges]);

  const handleMergeClick = useCallback(() => {
    if (!formattingController || !range) return;
    if (range.start.row === range.end.row && range.start.col === range.end.col)
      return;
    formattingController.mergeAndCenter(range);
    setStyleVersion((version) => version + 1);
    onAfterCommand?.();
  }, [formattingController, range, onAfterCommand]);

  const handleMergeCellsClick = useCallback(() => {
    if (!formattingController || !range) return;
    if (range.start.row === range.end.row && range.start.col === range.end.col)
      return;
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

  const handleIncreaseIndent = useCallback(() => {
    if (!formattingController || selectedAddresses.length === 0) return;
    runFormatting(() => formattingController.increaseIndent(selectedAddresses));
  }, [formattingController, runFormatting, selectedAddresses]);

  const handleDecreaseIndent = useCallback(() => {
    if (!formattingController || selectedAddresses.length === 0) return;
    runFormatting(() => formattingController.decreaseIndent(selectedAddresses));
  }, [formattingController, runFormatting, selectedAddresses]);

  const canMerge = useMemo(() => {
    if (!range) return false;
    return !(
      range.start.row === range.end.row && range.start.col === range.end.col
    );
  }, [range]);

  const handleClear = useCallback(
    (type: "all" | "formats" | "contents" | "comments" | "hyperlinks") => {
      if (!worksheet || !range) return;
      if (type === "formats") {
        runFormatting(() =>
          formattingController?.clearFormatInRanges(selectedRanges),
        );
        return;
      }
      if (type === "contents" || type === "all") {
        commandManager.execute(
          new ClearCellsCommand(requireStandaloneWorksheet(worksheet), range),
        );
        if (type === "all") {
          formattingController?.clearFormatInRanges(selectedRanges);
        }
        setStyleVersion((version) => version + 1);
        onAfterCommand?.();
      }
    },
    [
      worksheet,
      range,
      runFormatting,
      formattingController,
      selectedRanges,
      commandManager,
      onAfterCommand,
    ],
  );

  const handleFormatOperation = useCallback(
    (operation: string, value?: any) => {
      if (operation === "insertSheet") {
        onInsertSheet?.();
        onAfterCommand?.();
        return;
      }
      if (operation === "deleteSheet") {
        onDeleteSheet?.();
        onAfterCommand?.();
        return;
      }
      if (operation === "renameSheet") {
        onRequestRenameSheet?.();
        return;
      }

      if (!worksheet || !range) return;
      const standaloneWorksheet = requireStandaloneWorksheet(worksheet);

      switch (operation) {
        case "rowHeight": {
          const px = Number(value) * (4 / 3);
          if (!Number.isFinite(px) || px <= 0) return;
          setRowHeightsInRange(commandManager, standaloneWorksheet, range, px);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        }
        case "columnWidth": {
          const px = Math.max(12, Number(value) * 8);
          if (!Number.isFinite(px) || px <= 0) return;
          setColumnWidthsInRange(
            commandManager,
            standaloneWorksheet,
            range,
            px,
          );
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        }
        case "autoFitColumnWidth":
          autoFitColumnWidths(commandManager, standaloneWorksheet, range);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        case "autoFitRowHeight":
          autoFitRowHeights(commandManager, standaloneWorksheet, range);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        case "hideRows":
          hideRowsInRange(commandManager, standaloneWorksheet, range);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        case "unhideRows":
          unhideRowsNearRange(commandManager, standaloneWorksheet, range);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        case "hideColumns":
          hideColumnsInRange(commandManager, standaloneWorksheet, range);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        case "unhideColumns":
          unhideColumnsNearRange(commandManager, standaloneWorksheet, range);
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        case "lockCell":
          setCellsLocked(
            commandManager,
            standaloneWorksheet,
            selectedAddresses,
            true,
          );
          setStyleVersion((version) => version + 1);
          onAfterCommand?.();
          break;
        default:
          console.warn(`Unknown Home tab format operation: ${operation}`);
      }
    },
    [
      worksheet,
      range,
      selectedAddresses,
      commandManager,
      onAfterCommand,
      onInsertSheet,
      onDeleteSheet,
      onRequestRenameSheet,
    ],
  );

  const handleInsertCells = useCallback(
    (mode: InsertCellsMode) => {
      if (!worksheet || !range) return;
      executeInsertCells(
        requireStandaloneWorksheet(worksheet),
        commandManager,
        range,
        mode,
      );
      onAfterCommand?.();
    },
    [worksheet, range, commandManager, onAfterCommand],
  );

  const handleDeleteCells = useCallback(
    (mode: DeleteCellsMode) => {
      if (!worksheet || !range) return;
      executeDeleteCells(
        requireStandaloneWorksheet(worksheet),
        commandManager,
        range,
        mode,
      );
      onAfterCommand?.();
    },
    [worksheet, range, commandManager, onAfterCommand],
  );

  const handleSort = useCallback(
    (direction: "asc" | "desc" | "custom") => {
      if (!worksheet || !range) return;
      if (direction === "custom") {
        setShowCustomSortDialog(true);
        return;
      }
      executeSortSelection(
        commandManager,
        requireStandaloneWorksheet(worksheet),
        range,
        direction,
      );
      setStyleVersion((version) => version + 1);
      onAfterCommand?.();
    },
    [worksheet, range, commandManager, onAfterCommand],
  );

  const handleCustomSortApply = useCallback(
    (
      levels: Array<{ columnIndex: number; ascending: boolean }>,
      hasHeaders: boolean,
    ) => {
      if (!worksheet || !range) return;
      executeMultiSortSelection(
        commandManager,
        requireStandaloneWorksheet(worksheet),
        range,
        levels,
        hasHeaders,
      );
      setShowCustomSortDialog(false);
      setStyleVersion((version) => version + 1);
      onAfterCommand?.();
    },
    [worksheet, range, commandManager, onAfterCommand],
  );

  const customSortRange = useMemo(() => {
    if (!range) return null;
    return worksheet
      ? resolveSortRange(worksheet, range)
      : normalizeRange(range);
  }, [worksheet, range]);

  const numberSelectionStyle = useMemo(
    () =>
      ({
        numberFormat: {
          value:
            typeof activeStyle.numberFormat === "string"
              ? activeStyle.numberFormat
              : "General",
          isMixed: false,
        },
      }) as Parameters<typeof NumberFormatGroup>[0]["selectionStyle"],
    [activeStyle.numberFormat],
  );

  return (
    <div className="ribbon-content ribbon-tab-content ribbon-home-2013">
      {isHomeGroupEnabled(appConfig, "clipboard") &&
        worksheet &&
        clipboardService && (
          <ClipboardGroup
            worksheet={worksheet}
            clipboardService={clipboardService}
            formattingController={formattingController}
            commandManager={commandManager}
            selectedCells={selectedAddresses}
            currentRange={range ?? undefined}
            onAfterClipboard={onAfterCommand}
            formatPainterActive={formatPainterActive}
            onFormatPainterActivate={handleFormatPainterActivate}
          />
        )}

      {isHomeGroupEnabled(appConfig, "font") && (
        <RibbonGroup
          title="Font"
          className="home-font-ribbon-group"
        >
          <div className="font-group-content home-font-group">
            <div className="home-font-body">
              <div className="home-font-row-top">
                <RibbonSelect
                  value={selectionStyle?.fontFamily || "Calibri"}
                  options={fontFamilies}
                  onChange={handleFontFamilyChange}
                  width={132}
                  className="font-family-select home-font-select"
                  ariaLabel="Font family"
                />
                <RibbonSelect
                  value={selectionStyle?.fontSize || 11}
                  options={fontSizes}
                  onChange={handleFontSizeChange}
                  width={46}
                  className="font-size-select home-font-select"
                  ariaLabel="Font size"
                />
                <div className="home-font-size-steps">
                  <RibbonButton
                    className="home-font-grow home-font-hit"
                    icon={<span className="home-font-step-glyph" aria-hidden />}
                    tooltip="Increase Font Size"
                    onClick={() => handleFontSizeStep(1)}
                    size="small"
                  />
                  <RibbonButton
                    className="home-font-shrink home-font-hit"
                    icon={<span className="home-font-step-glyph" aria-hidden />}
                    tooltip="Decrease Font Size"
                    onClick={() => handleFontSizeStep(-1)}
                    size="small"
                  />
                </div>
              </div>
              <div className="home-font-row-bottom font-row">
                <RibbonButton
                  className="home-font-hit"
                  icon={<TextBoldRegular />}
                  tooltip="Bold (Ctrl+B)"
                  active={selectionStyle?.bold || false}
                  onClick={handleBoldToggle}
                  size="small"
                />
                <RibbonButton
                  className="home-font-hit"
                  icon={<TextItalicRegular />}
                  tooltip="Italic (Ctrl+I)"
                  active={selectionStyle?.italic || false}
                  onClick={handleItalicToggle}
                  size="small"
                />
                <div className="home-font-underline-split">
                  <RibbonButton
                    className="home-font-hit home-font-underline-main"
                    icon={<TextUnderlineRegular />}
                    tooltip="Underline (Ctrl+U)"
                    active={selectionStyle?.underline || false}
                    onClick={handleUnderlineToggle}
                    size="small"
                  />
                  <button
                    type="button"
                    className="home-font-hit home-font-style-chevron"
                    aria-label="Underline options"
                    title="Underline options"
                  >
                    <span className="home-font-chevron" aria-hidden>
                      ▼
                    </span>
                  </button>
                </div>
                <span className="home-font-vsep" aria-hidden />
                <BorderButton
                  selectionBorder={selectionStyle?.border}
                  onApply={handleBorderApply}
                />
                <span className="home-font-vsep" aria-hidden />
                <FillColorButton
                  command={fillColorCommand}
                  selectionFill={selectionStyle?.fillColor}
                />
                <span className="home-font-vsep" aria-hidden />
                <FontColorButton
                  command={fontColorCommand}
                  selectionColor={selectionStyle?.fontColor}
                />
              </div>
            </div>
          </div>
        </RibbonGroup>
      )}

      {isHomeGroupEnabled(appConfig, "number") && formattingController && (
        <RibbonGroup title="Number">
          <NumberFormatGroup
            formattingController={formattingController}
            selectedCells={selectedAddresses}
            selectionStyle={numberSelectionStyle}
            onStyleChange={onAfterCommand}
          />
        </RibbonGroup>
      )}

      {isHomeGroupEnabled(appConfig, "alignment") && (
        <RibbonGroup
          title="Alignment"
          className="home-align-ribbon-group"
        >
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
            onIncreaseIndent={handleIncreaseIndent}
            onDecreaseIndent={handleDecreaseIndent}
            canMerge={canMerge}
          />
        </RibbonGroup>
      )}

      {isHomeGroupEnabled(appConfig, "styles") &&
        formattingController &&
        worksheet &&
        !("workbookId" in worksheet) && (
          <StylesGroup
            formattingController={formattingController}
            worksheet={worksheet}
            commandManager={commandManager}
            selectedRanges={selectedRanges}
            currentRange={range ?? undefined}
            onStyleChange={onAfterCommand}
          />
        )}

      {isHomeGroupEnabled(appConfig, "cells") && formattingController && (
        <CellsGroup
          formattingController={formattingController}
          selectedCells={selectedAddresses}
          currentRange={range ?? undefined}
          onInsertCells={handleInsertCells}
          onDeleteCells={handleDeleteCells}
          onFormatOperation={handleFormatOperation}
          onStructureChange={onAfterCommand}
        />
      )}

      {isHomeGroupEnabled(appConfig, "editing") && formattingController && (
        <EditingGroup
          formattingController={formattingController}
          selectedCells={selectedAddresses}
          currentRange={range ?? undefined}
          onAutoSum={onAutoSum}
          onFill={(dir) => console.log("Fill:", dir)}
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
