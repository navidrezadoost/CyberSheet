import {
  SortFilterGroupIcon5,
  SortFilterGroupIcon4,
  SortFilterGroupIcon3,
  SortFilterGroupIcon2,
  SortFilterGroupIcon1,
} from "@cyber-sheet/icons/react";
import React, { useState, useCallback } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";
import type { Workbook, Address, Range } from "@cyber-sheet/core";
import {
  normalizeRange,
  resolveSortRange,
} from "../../../utils/sortFilterCommands";
import { CustomSortDialog } from "../../dialogs/CustomSortDialog";

interface SortFilterGroupProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const SortFilterGroup: React.FC<SortFilterGroupProps> = ({
  workbook,
  selectedCells,
  onCommand,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);

  const sheet = workbook.activeSheet;
  const filterActive = Boolean(sheet?.getAutoFilterRange());

  const getSelectionRange = useCallback((): Range | null => {
    if (selectedCells.length === 0) return null;
    return normalizeRange({
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    });
  }, [selectedCells]);

  const handleSortAscending = useCallback(() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return;

    const sortRange = resolveSortRange(sheet, selection);
    onCommand?.({
      type: "sort",
      range: sortRange,
      sortBy: [{ columnIndex: selection.start.col, ascending: true }],
      hasHeaders: sortRange.end.row > sortRange.start.row,
    });
  }, [sheet, getSelectionRange, onCommand]);

  const handleSortDescending = useCallback(() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return;

    const sortRange = resolveSortRange(sheet, selection);
    onCommand?.({
      type: "sort",
      range: sortRange,
      sortBy: [{ columnIndex: selection.start.col, ascending: false }],
      hasHeaders: sortRange.end.row > sortRange.start.row,
    });
  }, [sheet, getSelectionRange, onCommand]);

  const handleCustomSort = useCallback(() => {
    setShowSortDialog(true);
  }, []);

  const handleToggleFilter = useCallback(() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return;

    onCommand?.({
      type: "toggleAutoFilter",
      range: selection,
      enabled: !filterActive,
    });
  }, [sheet, getSelectionRange, filterActive, onCommand]);

  const handleClearFilter = useCallback(() => {
    onCommand?.({ type: "clearFilter" });
  }, [onCommand]);

  const handleReapplyFilter = useCallback(() => {
    onCommand?.({ type: "reapplyFilter" });
  }, [onCommand]);

  const customSortRange = (() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return null;
    return resolveSortRange(sheet, selection);
  })();

  const filterMainClass = filterActive
    ? "formulas-btn-large data-filter-main-btn formulas-row-btn-active"
    : "formulas-btn-large data-filter-main-btn";

  return (
    <div className="formulas-group data-sort-filter">
      <div className="formulas-group-body data-sort-filter-body">
        <div className="data-sort-quick-col">
          <button
            type="button"
            className="data-sort-quick-btn"
            onClick={handleSortAscending}
            title="Sort A to Z (Ascending)"
          >
            <SortFilterGroupIcon1 />
          </button>
          <button
            type="button"
            className="data-sort-quick-btn"
            onClick={handleSortDescending}
            title="Sort Z to A (Descending)"
          >
            <SortFilterGroupIcon2 />
          </button>
        </div>

        <button
          type="button"
          className="formulas-btn-large data-sort-main-btn"
          onClick={handleCustomSort}
          title="Sort"
        >
          <SortFilterGroupIcon3 />
          <span>Sort</span>
        </button>

        <div className="data-ribbon-sep" aria-hidden />

        <div className="data-filter-cluster">
          <button
            type="button"
            className={filterMainClass}
            onClick={handleToggleFilter}
            title="Filter"
          >
            <SortFilterGroupIcon4 />
            <span>Filter</span>
          </button>

          <div className="formulas-menu-stack data-filter-actions">
            <button
              type="button"
              className="formulas-row-btn data-ribbon-row-btn"
              onClick={handleClearFilter}
              title="Clear"
            >
              <span className="data-ribbon-row-icon" aria-hidden>
                <SortFilterGroupIcon4 />
              </span>
              <span>Clear</span>
            </button>
            <button
              type="button"
              className="formulas-row-btn data-ribbon-row-btn"
              onClick={handleReapplyFilter}
              title="Reapply"
            >
              <span className="data-ribbon-row-icon" aria-hidden>
                <SortFilterGroupIcon5 />
              </span>
              <span>Reapply</span>
            </button>
            <RibbonDropdownHost
              open={showFilterDropdown}
              menuStyle={ribbonDropdownChrome({ minWidth: 160 })}
              menu={
                <>
                  <button
                    type="button"
                    className="cs-ribbon-popover-item"
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Segoe UI, sans-serif",
                    }}
                    onClick={() => {
                      handleClearFilter();
                      setShowFilterDropdown(false);
                    }}
                  >
                    Clear Filter
                  </button>
                  <button
                    type="button"
                    className="cs-ribbon-popover-item"
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Segoe UI, sans-serif",
                    }}
                    onClick={() => {
                      handleReapplyFilter();
                      setShowFilterDropdown(false);
                    }}
                  >
                    Reapply Filter
                  </button>
                  <div
                    style={{ height: 1, background: "#E0E0E0", margin: "4px 0" }}
                  />
                  <button
                    type="button"
                    className="cs-ribbon-popover-item"
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Segoe UI, sans-serif",
                      color: "#888",
                    }}
                  >
                    Filter by Color...
                  </button>
                  <button
                    type="button"
                    className="cs-ribbon-popover-item"
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Segoe UI, sans-serif",
                      color: "#888",
                    }}
                  >
                    Text Filters ▶
                  </button>
                  <button
                    type="button"
                    className="cs-ribbon-popover-item"
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Segoe UI, sans-serif",
                      color: "#888",
                    }}
                  >
                    Number Filters ▶
                  </button>
                </>
              }
            >
              <button
                type="button"
                className="formulas-row-btn data-ribbon-row-btn"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                title="Advanced"
              >
                <span className="data-ribbon-row-icon" aria-hidden>
                  <SortFilterGroupIcon5 />
                </span>
                <span>Advanced</span>
              </button>
            </RibbonDropdownHost>
          </div>
        </div>
      </div>

      <div className="formulas-group-caption">Sort &amp; Filter</div>

      {/* Custom Sort Dialog */}
      {showSortDialog && customSortRange && (
        <CustomSortDialog
          sortRange={customSortRange}
          onClose={() => setShowSortDialog(false)}
          onSort={(levels, hasHeaders) => {
            if (!sheet) return;
            const sortLevels = levels.map((level) => ({
              columnIndex: customSortRange.start.col + level.columnIndex,
              ascending: level.ascending,
            }));
            onCommand?.({
              type: "sort",
              range: customSortRange,
              sortBy: sortLevels,
              hasHeaders,
            });
            setShowSortDialog(false);
          }}
        />
      )}
    </div>
  );
};
