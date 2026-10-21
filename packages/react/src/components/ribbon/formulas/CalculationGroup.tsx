/**
 * CalculationGroup.tsx
 *
 * Formulas Tab - Calculation Group
 * Contains: Calculation Options, Calculate Now (F9), Calculate Sheet (Shift+F9)
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface CalculationGroupProps {
  onCalculationModeChange?: (
    mode: "automatic" | "automaticExceptTables" | "manual",
  ) => void;
  onCalculateNow?: () => void;
  onCalculateSheet?: () => void;
  calculationMode?: "automatic" | "automaticExceptTables" | "manual";
}

export const CalculationGroup: React.FC<CalculationGroupProps> = ({
  onCalculationModeChange,
  onCalculateNow,
  onCalculateSheet,
  calculationMode = "automatic",
}) => {
  const [showCalculationOptionsDropdown, setShowCalculationOptionsDropdown] =
    useState(false);

  const menuStyle = ribbonDropdownChrome({
    minWidth: 180,
    maxHeight: 400,
    overflowY: "auto",
  });

  const dropdownItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "Segoe UI, Arial, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  const checkmarkStyle: React.CSSProperties = {
    width: 16,
    fontSize: 12,
    color: "#0078D4",
  };

  const calculationOptions = [
    {
      label: "Automatic",
      value: "automatic" as const,
      description: "Recalculate after every change",
    },
    {
      label: "Automatic Except Data Tables",
      value: "automaticExceptTables" as const,
      description: "Recalculate except data tables",
    },
    {
      label: "Manual",
      value: "manual" as const,
      description: "Recalculate only on F9",
    },
  ];

  return (
    <div className="formulas-group formulas-calculation">
      <div className="formulas-group-body formulas-calc-body">
        <RibbonDropdownHost
          open={showCalculationOptionsDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {calculationOptions.map((option, index) => (
                <div
                  key={option.value}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === calculationOptions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowCalculationOptionsDropdown(false);
                    onCalculationModeChange?.(option.value);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "#E8F4FD";
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                  }}
                >
                  <span style={checkmarkStyle}>
                    {calculationMode === option.value ? "✓" : " "}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{option.label}</div>
                    <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                      {option.description}
                    </div>
                  </div>
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large formulas-calc-options-btn"
            onClick={() =>
              setShowCalculationOptionsDropdown(!showCalculationOptionsDropdown)
            }
            title="Calculation Options"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ⚙️
            </span>
            <span>
              Calculation
              <br />
              Options
            </span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <div className="formulas-menu-stack formulas-calc-stack">
          <button
            type="button"
            className="formulas-row-btn"
            onClick={() => onCalculateNow?.()}
            title="Calculate Now (F9)"
          >
            <span className="formulas-icon-md" aria-hidden>
              🔄
            </span>
            <span>Calculate Now</span>
          </button>

          <button
            type="button"
            className="formulas-row-btn"
            onClick={() => onCalculateSheet?.()}
            title="Calculate Sheet (Shift+F9)"
          >
            <span className="formulas-icon-md" aria-hidden>
              📄
            </span>
            <span>Calculate Sheet</span>
          </button>
        </div>
      </div>

      <div className="formulas-group-caption">Calculation</div>
    </div>
  );
};
