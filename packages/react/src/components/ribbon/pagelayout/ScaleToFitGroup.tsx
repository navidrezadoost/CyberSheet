/**
 * ScaleToFitGroup.tsx — Page Layout: Scale to Fit group (layout only)
 */

import React from "react";

export interface ScaleToFitGroupProps {
  onWidthChange?: (width: number | "auto") => void;
  onHeightChange?: (height: number | "auto") => void;
  onScaleChange?: (scale: number) => void;
}

export const ScaleToFitGroup: React.FC<ScaleToFitGroupProps> = ({
  onWidthChange,
  onHeightChange,
  onScaleChange,
}) => {
  return (
    <div className="formulas-group pagelayout-scale">
      <div className="formulas-group-body pagelayout-scale-body">
        <div className="pagelayout-scale-row">
          <span className="pagelayout-scale-icon" aria-hidden>
            ↔
          </span>
          <span className="pagelayout-scale-label">Width:</span>
          <select
            className="pagelayout-scale-select"
            defaultValue="auto"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const val = e.target.value;
              if (val === "auto") onWidthChange?.("auto");
              else onWidthChange?.(parseInt(val, 10));
            }}
          >
            <option value="auto">Automatic</option>
            <option value="1">1 page</option>
            <option value="2">2 pages</option>
            <option value="3">3 pages</option>
          </select>
        </div>

        <div className="pagelayout-scale-row">
          <span className="pagelayout-scale-icon" aria-hidden>
            ↕
          </span>
          <span className="pagelayout-scale-label">Height:</span>
          <select
            className="pagelayout-scale-select"
            defaultValue="auto"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const val = e.target.value;
              if (val === "auto") onHeightChange?.("auto");
              else onHeightChange?.(parseInt(val, 10));
            }}
          >
            <option value="auto">Automatic</option>
            <option value="1">1 page</option>
            <option value="2">2 pages</option>
            <option value="3">3 pages</option>
          </select>
        </div>

        <div className="pagelayout-scale-row">
          <span className="pagelayout-scale-icon" aria-hidden>
            ⤢
          </span>
          <span className="pagelayout-scale-label">Scale:</span>
          <input
            type="number"
            className="pagelayout-scale-spin"
            defaultValue={100}
            min={10}
            max={400}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const num = parseInt(e.target.value, 10);
              if (!isNaN(num) && num >= 10 && num <= 400) {
                onScaleChange?.(num);
              }
            }}
          />
          <span className="pagelayout-scale-suffix">%</span>
        </div>
      </div>

      <div className="pagelayout-group-footer">
        <div className="formulas-group-caption">Scale to Fit</div>
        <button
          type="button"
          className="pagelayout-dialog-launcher"
          title="Scale to Fit dialog"
          aria-label="Scale to Fit dialog"
        />
      </div>
    </div>
  );
};
