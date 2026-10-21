/**
 * SheetOptionsGroup.tsx — Page Layout: Sheet Options group (layout only)
 */

import React from "react";

export interface SheetOptionsGroupProps {
  onGridlinesViewChange?: (visible: boolean) => void;
  onGridlinesPrintChange?: (print: boolean) => void;
  onHeadingsViewChange?: (visible: boolean) => void;
  onHeadingsPrintChange?: (print: boolean) => void;
}

export const SheetOptionsGroup: React.FC<SheetOptionsGroupProps> = ({
  onGridlinesViewChange,
  onGridlinesPrintChange,
  onHeadingsViewChange,
  onHeadingsPrintChange,
}) => {
  return (
    <div className="formulas-group pagelayout-sheet-options">
      <div className="formulas-group-body pagelayout-sheet-options-body">
        <button
          type="button"
          className="formulas-btn-large pagelayout-sheet-rtl-btn"
          title="Sheet Right-to-Left"
        >
          <span className="formulas-icon-lg" aria-hidden>
            ◀
          </span>
          <span>
            Sheet
            <br />
            Right-to-Left
          </span>
        </button>

        <div className="pagelayout-sheet-check-block">
          <div className="pagelayout-sheet-check-title">Gridlines</div>
          <label className="pagelayout-sheet-check-row">
            <input
              type="checkbox"
              className="pagelayout-sheet-checkbox"
              defaultChecked
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onGridlinesViewChange?.(e.target.checked);
              }}
            />
            <span>View</span>
          </label>
          <label className="pagelayout-sheet-check-row">
            <input
              type="checkbox"
              className="pagelayout-sheet-checkbox"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onGridlinesPrintChange?.(e.target.checked);
              }}
            />
            <span>Print</span>
          </label>
        </div>

        <div className="pagelayout-sheet-check-sep" aria-hidden />

        <div className="pagelayout-sheet-check-block">
          <div className="pagelayout-sheet-check-title">Headings</div>
          <label className="pagelayout-sheet-check-row">
            <input
              type="checkbox"
              className="pagelayout-sheet-checkbox"
              defaultChecked
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onHeadingsViewChange?.(e.target.checked);
              }}
            />
            <span>View</span>
          </label>
          <label className="pagelayout-sheet-check-row">
            <input
              type="checkbox"
              className="pagelayout-sheet-checkbox"
              defaultChecked
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onHeadingsPrintChange?.(e.target.checked);
              }}
            />
            <span>Print</span>
          </label>
        </div>
      </div>

      <div className="pagelayout-group-footer">
        <div className="formulas-group-caption">Sheet Options</div>
        <button
          type="button"
          className="pagelayout-dialog-launcher"
          title="Sheet Options dialog"
          aria-label="Sheet Options dialog"
        />
      </div>
    </div>
  );
};
