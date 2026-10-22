/**
 * FormulaAuditingGroup.tsx
 *
 * Formulas Tab - Formula Auditing Group
 * Contains: Trace Precedents, Trace Dependents, Remove Arrows, Show Formulas,
 * Error Checking, Evaluate Formula, Watch Window
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface FormulaAuditingGroupProps {
  onTracePrecedents?: () => void;
  onTraceDependents?: () => void;
  onRemoveArrows?: (type: "precedents" | "dependents" | "all") => void;
  onShowFormulas?: (show: boolean) => void;
  onErrorChecking?: () => void;
  onTraceError?: () => void;
  onCircularReferences?: () => void;
  onEvaluateFormula?: () => void;
  onWatchWindow?: () => void;
  showFormulas?: boolean;
}

export const FormulaAuditingGroup: React.FC<FormulaAuditingGroupProps> = ({
  onTracePrecedents,
  onTraceDependents,
  onRemoveArrows,
  onShowFormulas,
  onErrorChecking,
  onTraceError,
  onCircularReferences,
  onEvaluateFormula,
  onWatchWindow,
  showFormulas = false,
}) => {
  const [showRemoveArrowsDropdown, setShowRemoveArrowsDropdown] =
    useState(false);
  const [showErrorCheckingDropdown, setShowErrorCheckingDropdown] =
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
  };

  const removeArrowsOptions = [
    { label: "Remove Precedent Arrows", value: "precedents" as const },
    { label: "Remove Dependent Arrows", value: "dependents" as const },
    { label: "Remove All Arrows", value: "all" as const },
  ];

  const errorCheckingOptions = [
    { label: "Error Checking...", value: "checking" },
    { label: "Trace Error", value: "trace" },
    { label: "Circular References", value: "circular" },
  ];

  return (
    <div className="formulas-group formulas-formula-auditing">
      <div className="formulas-group-body formulas-auditing-body">
        <div className="formulas-auditing-cols">
          <div className="formulas-menu-stack">
            <button
              type="button"
              className="formulas-row-btn"
              onClick={() => onTracePrecedents?.()}
              title="Trace Precedents"
            >
              <span className="formulas-icon-md" aria-hidden>
                ⬅️
              </span>
              <span>Trace Precedents</span>
            </button>

            <button
              type="button"
              className="formulas-row-btn"
              onClick={() => onTraceDependents?.()}
              title="Trace Dependents"
            >
              <span className="formulas-icon-md" aria-hidden>
                ➡️
              </span>
              <span>Trace Dependents</span>
            </button>

            <RibbonDropdownHost
              open={showRemoveArrowsDropdown}
              menuStyle={menuStyle}
              menu={
                <>
                  {removeArrowsOptions.map((option, index) => (
                    <div
                      key={option.value}
                      style={{
                        ...dropdownItemStyle,
                        borderBottom:
                          index === removeArrowsOptions.length - 1
                            ? "none"
                            : "1px solid #F0F0F0",
                      }}
                      onClick={() => {
                        setShowRemoveArrowsDropdown(false);
                        onRemoveArrows?.(option.value);
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
                      {option.label}
                    </div>
                  ))}
                </>
              }
            >
              <button
                type="button"
                className="formulas-row-btn"
                onClick={() =>
                  setShowRemoveArrowsDropdown(!showRemoveArrowsDropdown)
                }
                title="Remove Arrows"
              >
                <span className="formulas-icon-md" aria-hidden>
                  ❌
                </span>
                <span>Remove Arrows</span>
                <span className="formulas-row-chevron" aria-hidden>
                  ▾
                </span>
              </button>
            </RibbonDropdownHost>
          </div>

          <div className="formulas-menu-stack">
            <button
              type="button"
              className={
                showFormulas
                  ? "formulas-row-btn formulas-row-btn-active"
                  : "formulas-row-btn"
              }
              onClick={() => onShowFormulas?.(!showFormulas)}
              title="Show Formulas (Ctrl+`)"
            >
              <span className="formulas-icon-md" aria-hidden>
                𝑓ₓ
              </span>
              <span>Show Formulas</span>
            </button>

            <RibbonDropdownHost
              open={showErrorCheckingDropdown}
              menuStyle={menuStyle}
              menu={
                <>
                  {errorCheckingOptions.map((option, index) => (
                    <div
                      key={option.value}
                      style={{
                        ...dropdownItemStyle,
                        borderBottom:
                          index === errorCheckingOptions.length - 1
                            ? "none"
                            : "1px solid #F0F0F0",
                      }}
                      onClick={() => {
                        setShowErrorCheckingDropdown(false);
                        if (option.value === "checking") {
                          onErrorChecking?.();
                        } else if (option.value === "trace") {
                          onTraceError?.();
                        } else {
                          onCircularReferences?.();
                        }
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
                      {option.label}
                    </div>
                  ))}
                </>
              }
            >
              <button
                type="button"
                className="formulas-row-btn"
                onClick={() =>
                  setShowErrorCheckingDropdown(!showErrorCheckingDropdown)
                }
                title="Error Checking"
              >
                <span className="formulas-icon-md" aria-hidden>
                  ⚠️
                </span>
                <span>Error Checking</span>
                <span className="formulas-row-chevron" aria-hidden>
                  ▾
                </span>
              </button>
            </RibbonDropdownHost>

            <button
              type="button"
              className="formulas-row-btn"
              onClick={() => onEvaluateFormula?.()}
              title="Evaluate Formula"
            >
              <span className="formulas-icon-md" aria-hidden>
                🔬
              </span>
              <span>Evaluate Formula</span>
            </button>
          </div>
        </div>

        <div className="formulas-auditing-sep" aria-hidden />

        <button
          type="button"
          className="formulas-btn-large formulas-watch-window-btn"
          onClick={() => onWatchWindow?.()}
          title="Watch Window"
        >
          <span className="formulas-icon-lg" aria-hidden>
            👁️
          </span>
          <span>
            Watch
            <br />
            Window
          </span>
        </button>
      </div>

      <div className="formulas-group-caption">Formula Auditing</div>
    </div>
  );
};
