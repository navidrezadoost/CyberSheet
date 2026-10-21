/**
 * FunctionLibraryGroup.tsx
 *
 * Formulas Tab - Function Library Group
 * Contains: Insert Function, AutoSum, Recently Used, Financial, Logical, Text,
 * Date & Time, Lookup & Reference, Math & Trig, More Functions
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface FunctionLibraryGroupProps {
  onInsertFunction?: () => void;
  onAutoSum?: (
    type: "sum" | "average" | "count" | "max" | "min" | "more",
  ) => void;
  onSelectFunction?: (category: string, functionName: string) => void;
}

export const FunctionLibraryGroup: React.FC<FunctionLibraryGroupProps> = ({
  onInsertFunction,
  onAutoSum,
  onSelectFunction,
}) => {
  const [showAutoSumDropdown, setShowAutoSumDropdown] = useState(false);
  const [showRecentlyUsedDropdown, setShowRecentlyUsedDropdown] =
    useState(false);
  const [showFinancialDropdown, setShowFinancialDropdown] = useState(false);
  const [showLogicalDropdown, setShowLogicalDropdown] = useState(false);
  const [showTextDropdown, setShowTextDropdown] = useState(false);
  const [showDateTimeDropdown, setShowDateTimeDropdown] = useState(false);
  const [showLookupRefDropdown, setShowLookupRefDropdown] = useState(false);
  const [showMathTrigDropdown, setShowMathTrigDropdown] = useState(false);
  const [showMoreFunctionsDropdown, setShowMoreFunctionsDropdown] =
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

  const autoSumOptions = [
    { label: "Sum", value: "sum" },
    { label: "Average", value: "average" },
    { label: "Count Numbers", value: "count" },
    { label: "Max", value: "max" },
    { label: "Min", value: "min" },
    { label: "More Functions...", value: "more" },
  ];

  const recentlyUsedFunctions = [
    "SUM",
    "AVERAGE",
    "IF",
    "VLOOKUP",
    "COUNT",
    "MAX",
    "MIN",
    "ROUND",
    "TODAY",
    "CONCATENATE",
  ];

  const financialFunctions = [
    "PMT",
    "FV",
    "PV",
    "RATE",
    "NPER",
    "NPV",
    "IRR",
    "XNPV",
    "XIRR",
    "MIRR",
    "DB",
    "DDB",
    "SLN",
    "SYD",
  ];

  const logicalFunctions = [
    "IF",
    "AND",
    "OR",
    "NOT",
    "IFERROR",
    "IFNA",
    "IFS",
    "SWITCH",
    "TRUE",
    "FALSE",
    "XOR",
  ];

  const textFunctions = [
    "LEFT",
    "RIGHT",
    "MID",
    "LEN",
    "CONCATENATE",
    "CONCAT",
    "TEXTJOIN",
    "TRIM",
    "UPPER",
    "LOWER",
    "PROPER",
    "SUBSTITUTE",
    "REPLACE",
    "FIND",
    "SEARCH",
  ];

  const dateTimeFunctions = [
    "TODAY",
    "NOW",
    "DATE",
    "TIME",
    "YEAR",
    "MONTH",
    "DAY",
    "HOUR",
    "MINUTE",
    "SECOND",
    "EDATE",
    "EOMONTH",
    "NETWORKDAYS",
    "WORKDAY",
    "DATEDIF",
  ];

  const lookupRefFunctions = [
    "VLOOKUP",
    "HLOOKUP",
    "XLOOKUP",
    "INDEX",
    "MATCH",
    "INDIRECT",
    "OFFSET",
    "CHOOSE",
    "LOOKUP",
    "ADDRESS",
    "ROW",
    "COLUMN",
    "ROWS",
    "COLUMNS",
  ];

  const mathTrigFunctions = [
    "SUM",
    "SUMIF",
    "SUMIFS",
    "SUMPRODUCT",
    "ROUND",
    "ROUNDUP",
    "ROUNDDOWN",
    "CEILING",
    "FLOOR",
    "TRUNC",
    "MOD",
    "ABS",
    "POWER",
    "SQRT",
    "EXP",
    "LN",
    "LOG",
    "LOG10",
    "SIN",
    "COS",
    "TAN",
    "ASIN",
    "ACOS",
    "ATAN",
    "PI",
    "RADIANS",
    "DEGREES",
  ];

  const moreFunctionsCategories = [
    "Statistical",
    "Engineering",
    "Cube",
    "Information",
    "Compatibility",
    "Web",
  ];

  return (
    <div className="formulas-group formulas-fnlib">
      <div className="formulas-group-body formulas-fnlib-row">
        {/* Insert Function (fx) - Large */}
        <button
          type="button"
          className="formulas-btn-large"
          onClick={() => onInsertFunction?.()}
          title="Insert Function"
        >
          <span className="formulas-icon-lg" aria-hidden>
            𝑓ₓ
          </span>
          <span>
            Insert
            <br />
            Function
          </span>
        </button>

        {/* AutoSum - Split button */}
        <RibbonDropdownHost
          open={showAutoSumDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {autoSumOptions.map((option, index) => (
                <div
                  key={option.value}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === autoSumOptions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowAutoSumDropdown(false);
                    onAutoSum?.(option.value as any);
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
            className="formulas-btn-large"
            onClick={() => setShowAutoSumDropdown(!showAutoSumDropdown)}
            title="AutoSum"
          >
            <span className="formulas-icon-lg" aria-hidden>
              Σ
            </span>
            <span>
              AutoSum
              <span className="formulas-inline-chevron"> ▾</span>
            </span>
          </button>
        </RibbonDropdownHost>
        {/* Recently Used */}
        <RibbonDropdownHost
          open={showRecentlyUsedDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {recentlyUsedFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === recentlyUsedFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowRecentlyUsedDropdown(false);
                    onSelectFunction?.("recent", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() =>
              setShowRecentlyUsedDropdown(!showRecentlyUsedDropdown)
            }
          >
            <span className="formulas-icon-md" aria-hidden>
              �
            </span>
            <span>
              Recently
              <br />
              Used
            </span>
          </button>
        </RibbonDropdownHost>

        {/* Financial */}
        <RibbonDropdownHost
          open={showFinancialDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {financialFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === financialFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowFinancialDropdown(false);
                    onSelectFunction?.("financial", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() => setShowFinancialDropdown(!showFinancialDropdown)}
          >
            <span className="formulas-icon-md" aria-hidden>
              💰
            </span>
            <span>Financial</span>
          </button>
        </RibbonDropdownHost>

        {/* Logical */}
        <RibbonDropdownHost
          open={showLogicalDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {logicalFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === logicalFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowLogicalDropdown(false);
                    onSelectFunction?.("logical", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() => setShowLogicalDropdown(!showLogicalDropdown)}
          >
            <span className="formulas-icon-md" aria-hidden>
              🔀
            </span>
            <span>Logical</span>
          </button>
        </RibbonDropdownHost>

        {/* Text */}
        <RibbonDropdownHost
          open={showTextDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {textFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === textFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowTextDropdown(false);
                    onSelectFunction?.("text", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() => setShowTextDropdown(!showTextDropdown)}
          >
            <span className="formulas-icon-md" aria-hidden>
              📝
            </span>
            <span>Text</span>
          </button>
        </RibbonDropdownHost>

        {/* Date & Time */}
        <RibbonDropdownHost
          open={showDateTimeDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {dateTimeFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === dateTimeFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowDateTimeDropdown(false);
                    onSelectFunction?.("datetime", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() => setShowDateTimeDropdown(!showDateTimeDropdown)}
          >
            <span className="formulas-icon-md" aria-hidden>
              📅
            </span>
            <span>
              Date &<br />
              Time
            </span>
          </button>
        </RibbonDropdownHost>

        {/* Lookup & Reference */}
        <RibbonDropdownHost
          open={showLookupRefDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {lookupRefFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === lookupRefFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowLookupRefDropdown(false);
                    onSelectFunction?.("lookup", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() => setShowLookupRefDropdown(!showLookupRefDropdown)}
          >
            <span className="formulas-icon-md" aria-hidden>
              🔍
            </span>
            <span>
              Lookup &<br />
              Reference
            </span>
          </button>
        </RibbonDropdownHost>

        {/* Math & Trig */}
        <RibbonDropdownHost
          open={showMathTrigDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {mathTrigFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === mathTrigFunctions.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowMathTrigDropdown(false);
                    onSelectFunction?.("math", func);
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
                  {func}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() => setShowMathTrigDropdown(!showMathTrigDropdown)}
          >
            <span className="formulas-icon-md" aria-hidden>
              ➕
            </span>
            <span>
              Math &<br />
              Trig
            </span>
          </button>
        </RibbonDropdownHost>

        {/* More Functions */}
        <RibbonDropdownHost
          open={showMoreFunctionsDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {moreFunctionsCategories.map((category, index) => (
                <div
                  key={category}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === moreFunctionsCategories.length - 1
                        ? "none"
                        : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowMoreFunctionsDropdown(false);
                    onSelectFunction?.("more", category);
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
                  {category} ▸
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-category"
            onClick={() =>
              setShowMoreFunctionsDropdown(!showMoreFunctionsDropdown)
            }
          >
            <span className="formulas-icon-md" aria-hidden>
              ⋯
            </span>
            <span>
              More
              <br />
              Functions
            </span>
          </button>
        </RibbonDropdownHost>
      </div>

      <div className="formulas-group-caption">Function Library</div>
    </div>
  );
};
