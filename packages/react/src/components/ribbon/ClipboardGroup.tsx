/**
 * Clipboard group — Excel Home tab (layout matches Office Clipboard group).
 * Icon markup is unchanged; structure and spacing live in ribbon.css.
 */

import React, { useRef, useState } from "react";
import { RibbonPopoverPanel } from "./RibbonPopoverPanel";
import type {
  Address,
  Range,
  Worksheet,
  WorkbookSheetView,
} from "@cyber-sheet/core";
import {
  FormattingController,
  CommandManager,
  ClipboardService,
} from "@cyber-sheet/core";
import {
  performCopy,
  performCut,
  performPasteAsync,
  normalizeSelectionRange,
} from "../../utils/clipboardOperations";

export interface ClipboardGroupProps {
  worksheet: Worksheet | WorkbookSheetView;
  clipboardService: ClipboardService;
  formattingController?: FormattingController | null;
  commandManager: CommandManager;
  selectedCells: Address[];
  currentRange?: Range;
  onAfterClipboard?: () => void;
  onCutComplete?: (range: Range) => void;
  onFormatPainterActivate?: (active: boolean) => void;
  formatPainterActive?: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
}

/** Icon slots — swap SVG/img here without changing layout classes. */
const PasteIcon = () => (
  <span className="home-clipboard-icon home-clipboard-icon--paste" aria-hidden>
    📋
  </span>
);
const CutIcon = () => (
  <span className="home-clipboard-icon home-clipboard-icon--cut" aria-hidden>
    ✂️
  </span>
);
const CopyIcon = () => (
  <span className="home-clipboard-icon home-clipboard-icon--copy" aria-hidden>
    📄
  </span>
);
const FormatPainterIcon = () => (
  <span
    className="home-clipboard-icon home-clipboard-icon--painter"
    aria-hidden
  >
    🖌️
  </span>
);

export const ClipboardGroup: React.FC<ClipboardGroupProps> = ({
  worksheet,
  clipboardService,
  formattingController,
  commandManager,
  selectedCells,
  currentRange,
  onAfterClipboard,
  onCutComplete,
  onFormatPainterActivate,
  formatPainterActive: formatPainterActiveProp,
  onCut,
  onCopy,
  onPaste,
}) => {
  const [showPasteMenu, setShowPasteMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [formatPainterActiveInternal, setFormatPainterActiveInternal] =
    useState(false);
  const formatPainterClickTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pasteMenuRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const formatPainterActive =
    formatPainterActiveProp ?? formatPainterActiveInternal;

  const setFormatPainterActive = (active: boolean) => {
    if (formatPainterActiveProp === undefined) {
      setFormatPainterActiveInternal(active);
    }
    onFormatPainterActivate?.(active);
  };
  const [clipboardHasContent, setClipboardHasContent] = useState(false);

  const getRange = (): Range | null => {
    if (currentRange) return normalizeSelectionRange(currentRange);
    if (selectedCells.length === 0) return null;
    return normalizeSelectionRange({
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    });
  };

  const handleCut = () => {
    const range = getRange();
    if (!range) return;

    performCut(worksheet, clipboardService, range);
    setClipboardHasContent(true);
    onCutComplete?.(range);
    onCut?.();
    onAfterClipboard?.();

    document.body.classList.add("clipboard-action-pulse");
    setTimeout(
      () => document.body.classList.remove("clipboard-action-pulse"),
      300,
    );
  };

  const handleCopy = () => {
    const range = getRange();
    if (!range) return;

    performCopy(worksheet, clipboardService, range);
    setClipboardHasContent(true);
    onCopy?.();
    onAfterClipboard?.();
    setShowCopyMenu(false);

    document.body.classList.add("clipboard-action-pulse");
    setTimeout(
      () => document.body.classList.remove("clipboard-action-pulse"),
      300,
    );
  };

  const handlePaste = () => {
    const range = getRange();
    if (!range) return;

    void performPasteAsync(
      worksheet,
      commandManager,
      clipboardService,
      range.start,
    ).then(() => {
      onPaste?.();
      onAfterClipboard?.();
    });
  };

  const handlePasteSpecial = (
    option: "values" | "formulas" | "formats" | "all",
  ) => {
    setShowPasteMenu(false);
    onPaste?.();
    void option;
  };

  const deactivateFormatPainter = () => {
    if (!formattingController) return;
    formattingController.clearFormatPainter();
    setFormatPainterActive(false);
    document.body.classList.remove("format-painter-active");
  };

  const handleFormatPainter = (persistent: boolean = false) => {
    if (formatPainterActive) {
      deactivateFormatPainter();
    } else {
      if (!formattingController) return;
      formattingController.copyFormat(selectedCells, persistent);
      setFormatPainterActive(true);
      document.body.classList.add("format-painter-active");
    }
  };

  const handleFormatPainterClick = () => {
    if (formatPainterClickTimerRef.current) {
      clearTimeout(formatPainterClickTimerRef.current);
    }
    formatPainterClickTimerRef.current = setTimeout(() => {
      handleFormatPainter(false);
      formatPainterClickTimerRef.current = null;
    }, 250);
  };

  const handleFormatPainterDoubleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    if (!formattingController) return;
    if (formatPainterClickTimerRef.current) {
      clearTimeout(formatPainterClickTimerRef.current);
      formatPainterClickTimerRef.current = null;
    }
    formattingController.copyFormat(selectedCells, true);
    setFormatPainterActive(true);
    document.body.classList.add("format-painter-active");
  };

  return (
    <div className="home-ribbon-surface home-clipboard-group ribbon-group ">
      <div className="home-clipboard-body">
        <div className="home-clipboard-main">
          <div className="home-clipboard-paste-zone" ref={pasteMenuRef}>
            <div className="home-clipboard-paste-split">
              <button
                type="button"
                className="home-clipboard-hit home-clipboard-paste-main"
                onClick={handlePaste}
                disabled={!clipboardHasContent}
                title="Paste (Ctrl+V)"
              >
                <PasteIcon />
                <span className="home-clipboard-label">Paste</span>
              </button>
              <button
                type="button"
                className="home-clipboard-hit home-clipboard-paste-chevron"
                onClick={() => setShowPasteMenu((open) => !open)}
                disabled={!clipboardHasContent}
                aria-expanded={showPasteMenu}
                aria-label="Paste options"
                title="Paste options"
              >
                <span className="home-clipboard-chevron" aria-hidden>
                  ▼
                </span>
              </button>
            </div>

            <RibbonPopoverPanel
              open={showPasteMenu}
              anchorRef={pasteMenuRef}
              style={{ minWidth: 180 }}
            >
              {(["all", "values", "formulas", "formats"] as const).map(
                (option) => (
                  <div
                    key={option}
                    className="cs-ribbon-popover-item"
                    role="menuitem"
                    onClick={() => handlePasteSpecial(option)}
                  >
                    {option === "all" && "Paste All"}
                    {option === "values" && "Paste Values Only"}
                    {option === "formulas" && "Paste Formulas"}
                    {option === "formats" && "Paste Formats Only"}
                  </div>
                ),
              )}
            </RibbonPopoverPanel>
          </div>

          <div className="home-clipboard-stack">
            <button
              type="button"
              className="home-clipboard-hit home-clipboard-icon-btn"
              onClick={handleCut}
              disabled={selectedCells.length === 0}
              title="Cut (Ctrl+X)"
              aria-label="Cut"
            >
              <CutIcon />
            </button>

            <div className="home-clipboard-copy-split" ref={copyMenuRef}>
              <button
                type="button"
                className="home-clipboard-hit home-clipboard-icon-btn home-clipboard-copy-main"
                onClick={handleCopy}
                disabled={selectedCells.length === 0}
                title="Copy (Ctrl+C)"
                aria-label="Copy"
              >
                <CopyIcon />
              </button>
              <button
                type="button"
                className="home-clipboard-hit home-clipboard-copy-chevron"
                onClick={() => setShowCopyMenu((open) => !open)}
                disabled={selectedCells.length === 0}
                aria-expanded={showCopyMenu}
                aria-label="Copy options"
                title="Copy options"
              >
                <span className="home-clipboard-chevron" aria-hidden>
                  ▼
                </span>
              </button>

              <RibbonPopoverPanel
                open={showCopyMenu}
                anchorRef={copyMenuRef}
                style={{ minWidth: 160 }}
              >
                <div
                  className="cs-ribbon-popover-item"
                  role="menuitem"
                  onClick={handleCopy}
                >
                  Copy
                </div>
              </RibbonPopoverPanel>
            </div>

            <button
              type="button"
              className={`home-clipboard-hit home-clipboard-icon-btn${formatPainterActive ? " active" : ""}`}
              onClick={handleFormatPainterClick}
              onDoubleClick={handleFormatPainterDoubleClick}
              disabled={selectedCells.length === 0}
              title="Format Painter"
              aria-label="Format Painter"
            >
              <FormatPainterIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="home-group-caption home-clipboard-caption">
        <span className="home-clipboard-caption-text">Clipboard</span>
      </div>
    </div>
  );
};

export default ClipboardGroup;
