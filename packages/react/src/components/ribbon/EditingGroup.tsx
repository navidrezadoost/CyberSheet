/**
 * EditingGroup.tsx
 *
 * Editing group for Home ribbon tab
 * Provides AutoSum, Fill, Clear, Sort & Filter, and Find & Select operations
 *
 * Microinteractions:
 * - AutoSum highlights detected range with marching ants (2000ms)
 * - Fill Down/Right cascades with waterfall animation (30ms stagger)
 * - Flash Fill preview shows in light gray before acceptance
 * - Filter arrows drop in from above (200ms)
 * - Sort indicator shows tiny ▲/▼ on sorted column
 * - Find All results populate with staggered reveal (20ms each)
 *
 * Phase 4: Excel 365-Level Editing Operations
 */

import React, { useState, useRef, useEffect } from "react";
import { RibbonPopoverPanel } from "./RibbonPopoverPanel";
import type { Address, Range } from "@cyber-sheet/core";
import type { FormattingController } from "@cyber-sheet/core";

export interface EditingGroupProps {
  formattingController: FormattingController;
  selectedCells: Address[];
  currentRange?: Range;
  onEditOperation?: (operation: string, params?: any) => void;
  onAutoSum?: (functionType: string) => void;
  onFill?: (direction: "down" | "right" | "up" | "left" | "series") => void;
  onClear?: (
    clearType: "all" | "formats" | "contents" | "comments" | "hyperlinks",
  ) => void;
  onSort?: (direction: "asc" | "desc" | "custom") => void;
  onFilter?: (action: "toggle" | "clear" | "reapply") => void;
  onOpenFindReplace?: (tab: "find" | "replace") => void;
}

interface DropdownOption {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  separator?: boolean;
}

/**
 * AutoSum function options
 */
const AUTOSUM_OPTIONS: DropdownOption[] = [
  { id: "sum", label: "Sum", formula: "SUM", shortcut: "Alt+=", icon: "Σ" },
  { id: "average", label: "Average", formula: "AVERAGE" },
  { id: "count", label: "Count Numbers", formula: "COUNT" },
  { id: "max", label: "Max", formula: "MAX" },
  { id: "min", label: "Min", formula: "MIN" },
  { id: "moreFunctions", label: "More Functions...", separator: true },
] as any[];

/**
 * Fill options
 */
const FILL_OPTIONS: DropdownOption[] = [
  { id: "fillDown", label: "Down", shortcut: "Ctrl+D" },
  { id: "fillRight", label: "Right", shortcut: "Ctrl+R" },
  { id: "fillUp", label: "Up" },
  { id: "fillLeft", label: "Left" },
  { id: "separator1", label: "", separator: true },
  { id: "fillSeries", label: "Series..." },
  { id: "fillJustify", label: "Justify" },
  { id: "separator2", label: "", separator: true },
  { id: "flashFill", label: "Flash Fill", shortcut: "Ctrl+E" },
];

/**
 * Clear options
 */
const CLEAR_OPTIONS: DropdownOption[] = [
  { id: "clearAll", label: "Clear All" },
  { id: "clearFormats", label: "Clear Formats" },
  { id: "clearContents", label: "Clear Contents", shortcut: "Delete" },
  { id: "clearComments", label: "Clear Comments" },
  { id: "clearHyperlinks", label: "Clear Hyperlinks" },
  { id: "removeHyperlinks", label: "Remove Hyperlinks" },
];

/**
 * Sort & Filter options
 */
const SORT_FILTER_OPTIONS: DropdownOption[] = [
  { id: "sortAZ", label: "Sort A to Z", icon: "↓A" },
  { id: "sortZA", label: "Sort Z to A", icon: "↑Z" },
  { id: "separator1", label: "", separator: true },
  { id: "customSort", label: "Custom Sort..." },
  { id: "separator2", label: "", separator: true },
  { id: "filter", label: "Filter", shortcut: "Ctrl+Shift+L" },
  { id: "clearFilter", label: "Clear Filter" },
  { id: "reapplyFilter", label: "Reapply" },
];

/**
 * Find & Select options
 */
const FIND_SELECT_OPTIONS: DropdownOption[] = [
  { id: "find", label: "Find...", shortcut: "Ctrl+F" },
  { id: "replace", label: "Replace...", shortcut: "Ctrl+H" },
  { id: "separator1", label: "", separator: true },
  { id: "goTo", label: "Go To...", shortcut: "Ctrl+G" },
  { id: "separator2", label: "", separator: true },
  { id: "formulas", label: "Formulas" },
  { id: "comments", label: "Comments" },
  { id: "conditionalFormatting", label: "Conditional Formatting" },
  { id: "constants", label: "Constants" },
  { id: "dataValidation", label: "Data Validation" },
  { id: "separator3", label: "", separator: true },
  { id: "selectObjects", label: "Select Objects" },
  { id: "selectionPane", label: "Selection Pane..." },
];

export const EditingGroup: React.FC<EditingGroupProps> = ({
  formattingController,
  selectedCells,
  currentRange,
  onEditOperation,
  onAutoSum,
  onFill,
  onClear,
  onSort,
  onFilter,
  onOpenFindReplace,
}) => {
  const [showAutoSumMenu, setShowAutoSumMenu] = useState(false);
  const [showFillMenu, setShowFillMenu] = useState(false);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [showSortFilterMenu, setShowSortFilterMenu] = useState(false);
  const [showFindSelectMenu, setShowFindSelectMenu] = useState(false);

  const autoSumMenuRef = useRef(null);
  const fillMenuRef = useRef(null);
  const clearMenuRef = useRef(null);
  const sortFilterMenuRef = useRef(null);
  const findSelectMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autoSumMenuRef.current &&
        !(autoSumMenuRef.current as HTMLElement).contains(e.target as Node)
      ) {
        setShowAutoSumMenu(false);
      }
      if (
        fillMenuRef.current &&
        !(fillMenuRef.current as HTMLElement).contains(e.target as Node)
      ) {
        setShowFillMenu(false);
      }
      if (
        clearMenuRef.current &&
        !(clearMenuRef.current as HTMLElement).contains(e.target as Node)
      ) {
        setShowClearMenu(false);
      }
      if (
        sortFilterMenuRef.current &&
        !(sortFilterMenuRef.current as HTMLElement).contains(e.target as Node)
      ) {
        setShowSortFilterMenu(false);
      }
      if (
        findSelectMenuRef.current &&
        !(findSelectMenuRef.current as HTMLElement).contains(e.target as Node)
      ) {
        setShowFindSelectMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handle AutoSum option selection
   */
  const handleAutoSumOption = (optionId: string) => {
    setShowAutoSumMenu(false);

    if (optionId === "moreFunctions") {
      // TODO: Open Insert Function dialog
      return;
    }

    const option = AUTOSUM_OPTIONS.find((opt) => opt.id === optionId);
    if (option && "formula" in option) {
      onAutoSum?.((option as any).formula);
    }
  };

  /**
   * Handle Fill option selection
   */
  const handleFillOption = (optionId: string) => {
    setShowFillMenu(false);

    switch (optionId) {
      case "fillDown":
        onFill?.("down");
        break;
      case "fillRight":
        onFill?.("right");
        break;
      case "fillUp":
        onFill?.("up");
        break;
      case "fillLeft":
        onFill?.("left");
        break;
      case "fillSeries":
        onFill?.("series");
        break;
      case "fillJustify":
        onEditOperation?.("fillJustify");
        break;
      case "flashFill":
        onEditOperation?.("flashFill");
        break;
    }
  };

  /**
   * Handle Clear option selection
   */
  const handleClearOption = (optionId: string) => {
    setShowClearMenu(false);

    switch (optionId) {
      case "clearAll":
        onClear?.("all");
        break;
      case "clearFormats":
        onClear?.("formats");
        break;
      case "clearContents":
        onClear?.("contents");
        break;
      case "clearComments":
        onClear?.("comments");
        break;
      case "clearHyperlinks":
      case "removeHyperlinks":
        onClear?.("hyperlinks");
        break;
    }
  };

  /**
   * Handle Sort & Filter option selection
   */
  const handleSortFilterOption = (optionId: string) => {
    setShowSortFilterMenu(false);

    switch (optionId) {
      case "sortAZ":
        onSort?.("asc");
        break;
      case "sortZA":
        onSort?.("desc");
        break;
      case "customSort":
        onSort?.("custom");
        break;
      case "filter":
        onFilter?.("toggle");
        break;
      case "clearFilter":
        onFilter?.("clear");
        break;
      case "reapplyFilter":
        onFilter?.("reapply");
        break;
    }
  };

  /**
   * Handle Find & Select option selection
   */
  const handleFindSelectOption = (optionId: string) => {
    setShowFindSelectMenu(false);

    switch (optionId) {
      case "find":
        onOpenFindReplace?.("find");
        break;
      case "replace":
        onOpenFindReplace?.("replace");
        break;
      case "goTo":
        onEditOperation?.("goTo");
        break;
      case "formulas":
        onEditOperation?.("selectFormulas");
        break;
      case "comments":
        onEditOperation?.("selectComments");
        break;
      case "conditionalFormatting":
        onEditOperation?.("selectConditionalFormatting");
        break;
      case "constants":
        onEditOperation?.("selectConstants");
        break;
      case "dataValidation":
        onEditOperation?.("selectDataValidation");
        break;
      case "selectObjects":
        onEditOperation?.("selectObjects");
        break;
      case "selectionPane":
        onEditOperation?.("showSelectionPane");
        break;
    }
  };

  // Common styles
  const buttonStyles: React.CSSProperties = {
    border: "1px solid #d0d0d0",
    background: "#fff",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "80px",
    height: "28px",
    borderRadius: "3px",
    transition: "all 150ms ease",
  };

  const popoverStyle: React.CSSProperties = {
    minWidth: 200,
  };

  return (
    <div
      className="home-ribbon-surface home-editing-group editing-group-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "3px 6px 0 6px",
        borderRight: "1px solid #d0d0d0",
        minHeight: "108px",
        maxHeight: "108px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingBottom: "16px",
        }}
      >
        {/* Row 1: AutoSum, Fill, Clear, Sort & Filter */}
        <div style={{ display: "flex", gap: "2px" }}>
          {/* AutoSum Dropdown */}
          <div
            style={{ position: "relative", display: "flex" }}
            ref={autoSumMenuRef}
          >
            <button
              className="cs-custom-group-button"
              style={{
                minWidth: "68px",
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
              }}
              onClick={() => onAutoSum?.("SUM")}
              title="AutoSum (Alt+=)"
            >
              <span style={{ fontSize: "16px", marginRight: "4px" }}>Σ</span>
              <span>AutoSum</span>
            </button>
            <button
              className="cs-custom-group-button"
              style={{
                minWidth: "18px",
                padding: "0 4px",
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: "1px solid #d0d0d0",
              }}
              onClick={() => setShowAutoSumMenu(!showAutoSumMenu)}
              title="AutoSum options"
              aria-label="AutoSum options"
              aria-expanded={showAutoSumMenu}
            >
              <span className="cs-custom-button-dropdown-arrow">▼</span>
            </button>

            <RibbonPopoverPanel
              open={showAutoSumMenu}
              anchorRef={autoSumMenuRef}
              style={popoverStyle}
            >
              {AUTOSUM_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className="cs-ribbon-popover-item"
                  role="menuitem"
                  onClick={() => handleAutoSumOption(option.id)}
                >
                  <span>{option.label}</span>
                  {option.shortcut && (
                    <span className="cs-ribbon-popover-shortcut">
                      {option.shortcut}
                    </span>
                  )}
                </div>
              ))}
            </RibbonPopoverPanel>
          </div>

          {/* Fill Dropdown */}
          <div style={{ position: "relative" }} ref={fillMenuRef}>
            <button
              className="cs-custom-group-button"
              onClick={() => setShowFillMenu(!showFillMenu)}
              title="Fill"
              aria-expanded={showFillMenu}
            >
              <span>Fill</span>
              <span className="cs-custom-button-dropdown-arrow">▼</span>
            </button>

            <RibbonPopoverPanel
              open={showFillMenu}
              anchorRef={fillMenuRef}
              style={popoverStyle}
            >
              {FILL_OPTIONS.map((option) => {
                if (option.separator) {
                  return (
                    <div
                      key={option.id}
                      role="separator"
                      style={{
                        height: "1px",
                        background: "#e0e0e0",
                        margin: "4px 0",
                      }}
                    />
                  );
                }

                return (
                  <div
                    key={option.id}
                    className="cs-ribbon-popover-item"
                    role="menuitem"
                    onClick={() => handleFillOption(option.id)}
                  >
                    <span>{option.label}</span>
                    {option.shortcut && (
                      <span className="cs-ribbon-popover-shortcut">
                        {option.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </RibbonPopoverPanel>
          </div>

          {/* Clear Dropdown */}
          <div style={{ position: "relative" }} ref={clearMenuRef}>
            <button
              className="cs-custom-group-button"
              onClick={() => setShowClearMenu(!showClearMenu)}
              title="Clear"
              aria-expanded={showClearMenu}
            >
              <span>Clear</span>
              <span className="cs-custom-button-dropdown-arrow">▼</span>
            </button>

            <RibbonPopoverPanel
              open={showClearMenu}
              anchorRef={clearMenuRef}
              style={popoverStyle}
            >
              {CLEAR_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className="cs-ribbon-popover-item"
                  role="menuitem"
                  onClick={() => handleClearOption(option.id)}
                >
                  <span>{option.label}</span>
                  {option.shortcut && (
                    <span className="cs-ribbon-popover-shortcut">
                      {option.shortcut}
                    </span>
                  )}
                </div>
              ))}
            </RibbonPopoverPanel>
          </div>

          {/* Sort & Filter Dropdown */}
          <div style={{ position: "relative" }} ref={sortFilterMenuRef}>
            <button
              className="cs-custom-group-button"
              style={{ minWidth: "100px" }}
              onClick={() => setShowSortFilterMenu(!showSortFilterMenu)}
              title="Sort & Filter"
              aria-expanded={showSortFilterMenu}
            >
              <span>Sort &</span>
              <span>Filter</span>
              <span className="cs-custom-button-dropdown-arrow">▼</span>
            </button>

            <RibbonPopoverPanel
              open={showSortFilterMenu}
              anchorRef={sortFilterMenuRef}
              style={{ minWidth: 220 }}
            >
              {SORT_FILTER_OPTIONS.map((option) => {
                if (option.separator) {
                  return (
                    <div
                      key={option.id}
                      role="separator"
                      style={{
                        height: "1px",
                        background: "#e0e0e0",
                        margin: "4px 0",
                      }}
                    />
                  );
                }

                return (
                  <div
                    key={option.id}
                    className="cs-ribbon-popover-item"
                    role="menuitem"
                    onClick={() => handleSortFilterOption(option.id)}
                  >
                    {option.icon && (
                      <span style={{ marginRight: "8px", fontWeight: 600 }}>
                        {option.icon}
                      </span>
                    )}
                    <span style={{ flex: 1 }}>{option.label}</span>
                    {option.shortcut && (
                      <span className="cs-ribbon-popover-shortcut">
                        {option.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </RibbonPopoverPanel>
          </div>
        </div>

        {/* Row 2: Find & Select */}
        <div style={{ display: "flex", gap: "2px" }}>
          {/* Find & Select Dropdown */}
          <div style={{ position: "relative" }} ref={findSelectMenuRef}>
            <button
              className="cs-custom-group-button"
              style={{ minWidth: "110px" }}
              onClick={() => setShowFindSelectMenu(!showFindSelectMenu)}
              title="Find & Select"
              aria-expanded={showFindSelectMenu}
            >
              <span>Find &</span>
              <span>Select</span>
              <span className="cs-custom-button-dropdown-arrow">▼</span>
            </button>

            <RibbonPopoverPanel
              open={showFindSelectMenu}
              anchorRef={findSelectMenuRef}
              style={{ minWidth: 220 }}
            >
              {FIND_SELECT_OPTIONS.map((option) => {
                if (option.separator) {
                  return (
                    <div
                      key={option.id}
                      role="separator"
                      style={{
                        height: "1px",
                        background: "#e0e0e0",
                        margin: "4px 0",
                      }}
                    />
                  );
                }

                return (
                  <div
                    key={option.id}
                    className="cs-ribbon-popover-item"
                    role="menuitem"
                    onClick={() => handleFindSelectOption(option.id)}
                  >
                    <span>{option.label}</span>
                    {option.shortcut && (
                      <span className="cs-ribbon-popover-shortcut">
                        {option.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </RibbonPopoverPanel>
          </div>
        </div>

        <style>
          {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
        </style>
      </div>

      <div
        className="home-group-caption"
        style={{
          fontSize: "11px",
          color: "#605e5c",
          textAlign: "center",
          padding: "2px 4px 0 4px",
          whiteSpace: "nowrap",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "16px",
          lineHeight: "16px",
        }}
      >
        Editing
      </div>
    </div>
  );
};
