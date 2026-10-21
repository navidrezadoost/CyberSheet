/**
 * DefinedNamesGroup.tsx
 *
 * Formulas Tab - Defined Names Group
 * Contains: Name Manager, Define Name, Use in Formula, Create from Selection
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface DefinedNamesGroupProps {
  onNameManager?: () => void;
  onDefineName?: () => void;
  onApplyNames?: () => void;
  onUseInFormula?: (name: string) => void;
  onCreateFromSelection?: () => void;
  definedNames?: string[];
}

export const DefinedNamesGroup: React.FC<DefinedNamesGroupProps> = ({
  onNameManager,
  onDefineName,
  onApplyNames,
  onUseInFormula,
  onCreateFromSelection,
  definedNames = ["SalesData", "TaxRate", "Quarter1", "Quarter2"],
}) => {
  const [showDefineNameDropdown, setShowDefineNameDropdown] = useState(false);
  const [showUseInFormulaDropdown, setShowUseInFormulaDropdown] =
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

  const defineNameOptions = [
    { label: "Define Name...", value: "define" },
    { label: "Apply Names...", value: "apply" },
  ];

  return (
    <div className="formulas-group formulas-defined-names">
      <div className="formulas-group-body formulas-defined-body">
        <button
          type="button"
          className="formulas-btn-large"
          onClick={() => onNameManager?.()}
          title="Name Manager"
        >
          <span className="formulas-icon-lg" aria-hidden>
            🏷️
          </span>
          <span>
            Name
            <br />
            Manager
          </span>
        </button>

        <div className="formulas-menu-stack">
          <RibbonDropdownHost
            open={showDefineNameDropdown}
            menuStyle={menuStyle}
            menu={
              <>
                {defineNameOptions.map((option, index) => (
                  <div
                    key={option.value}
                    style={{
                      ...dropdownItemStyle,
                      borderBottom:
                        index === defineNameOptions.length - 1
                          ? "none"
                          : "1px solid #F0F0F0",
                    }}
                    onClick={() => {
                      setShowDefineNameDropdown(false);
                      if (option.value === "define") {
                        onDefineName?.();
                      } else {
                        onApplyNames?.();
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
              onClick={() => setShowDefineNameDropdown(!showDefineNameDropdown)}
              title="Define Name"
            >
              <span className="formulas-icon-md" aria-hidden>
                🏷️
              </span>
              <span>Define Name</span>
              <span className="formulas-row-chevron" aria-hidden>
                ▾
              </span>
            </button>
          </RibbonDropdownHost>

          <RibbonDropdownHost
            open={showUseInFormulaDropdown}
            menuStyle={menuStyle}
            menu={
              <>
                {definedNames.length === 0 ? (
                  <div
                    style={{
                      ...dropdownItemStyle,
                      color: "#888",
                      cursor: "default",
                    }}
                  >
                    No defined names
                  </div>
                ) : (
                  definedNames.map((name, index) => (
                    <div
                      key={name}
                      style={{
                        ...dropdownItemStyle,
                        borderBottom:
                          index === definedNames.length - 1
                            ? "none"
                            : "1px solid #F0F0F0",
                      }}
                      onClick={() => {
                        setShowUseInFormulaDropdown(false);
                        onUseInFormula?.(name);
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
                      {name}
                    </div>
                  ))
                )}
              </>
            }
          >
            <button
              type="button"
              className="formulas-row-btn"
              onClick={() =>
                setShowUseInFormulaDropdown(!showUseInFormulaDropdown)
              }
              title="Use in Formula"
            >
              <span className="formulas-icon-md" aria-hidden>
                ⬇️
              </span>
              <span>Use in Formula</span>
              <span className="formulas-row-chevron" aria-hidden>
                ▾
              </span>
            </button>
          </RibbonDropdownHost>

          <button
            type="button"
            className="formulas-row-btn"
            onClick={() => onCreateFromSelection?.()}
            title="Create from Selection"
          >
            <span className="formulas-icon-md" aria-hidden>
              🏷️
            </span>
            <span>Create from Selection</span>
          </button>
        </div>
      </div>

      <div className="formulas-group-caption">Defined Names</div>
    </div>
  );
};
