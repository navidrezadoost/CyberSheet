/**
 * PageSetupGroup.tsx — Page Layout: Page Setup group (layout only)
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface PageSetupGroupProps {
  onMarginsChange?: (margins: string) => void;
  onOrientationChange?: (orientation: "portrait" | "landscape") => void;
  onSizeChange?: (size: string) => void;
  onPrintAreaSet?: () => void;
  onBreaksInsert?: (breakType: "page" | "remove") => void;
  onBackgroundSet?: () => void;
  onPrintTitlesSet?: () => void;
}

export const PageSetupGroup: React.FC<PageSetupGroupProps> = ({
  onMarginsChange,
  onOrientationChange,
  onSizeChange,
  onPrintAreaSet,
  onBreaksInsert,
  onBackgroundSet,
  onPrintTitlesSet,
}) => {
  const [showMarginsDropdown, setShowMarginsDropdown] = useState(false);
  const [showOrientationDropdown, setShowOrientationDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showPrintAreaDropdown, setShowPrintAreaDropdown] = useState(false);
  const [showBreaksDropdown, setShowBreaksDropdown] = useState(false);

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

  const marginPresets = ["Normal", "Wide", "Narrow", "Custom Margins..."];
  const pageSizes = [
    'Letter (8.5" x 11")',
    'Legal (8.5" x 14")',
    'Executive (7.25" x 10.5")',
    "A4",
    "A3",
    "B5",
    "Custom...",
  ];
  const breakOptions = ["Insert Page Break", "Remove Page Break"];
  const printAreaOptions = ["Set Print Area", "Clear Print Area"];

  const menuItems = (
    items: string[],
    onPick: (item: string, index: number) => void,
  ) =>
    items.map((item, index) => (
      <div
        key={item}
        style={{
          ...dropdownItemStyle,
          borderBottom:
            index === items.length - 1 ? "none" : "1px solid #F0F0F0",
        }}
        onClick={() => onPick(item, index)}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLDivElement).style.background = "#E8F4FD";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}
      >
        {item}
      </div>
    ));

  return (
    <div className="formulas-group pagelayout-pagesetup">
      <div className="formulas-group-body pagelayout-pagesetup-row">
        <RibbonDropdownHost
          open={showMarginsDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {menuItems(marginPresets, (margin) => {
                setShowMarginsDropdown(false);
                onMarginsChange?.(margin);
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-setup-btn"
            onClick={() => setShowMarginsDropdown(!showMarginsDropdown)}
            title="Margins"
          >
            <span className="formulas-icon-lg" aria-hidden>
              📐
            </span>
            <span>Margins</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showOrientationDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {menuItems(["Portrait", "Landscape"], (_, index) => {
                setShowOrientationDropdown(false);
                onOrientationChange?.(index === 0 ? "portrait" : "landscape");
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-setup-btn"
            onClick={() => setShowOrientationDropdown(!showOrientationDropdown)}
            title="Orientation"
          >
            <span className="formulas-icon-lg" aria-hidden>
              📄
            </span>
            <span>Orientation</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showSizeDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {menuItems(pageSizes, (size) => {
                setShowSizeDropdown(false);
                onSizeChange?.(size);
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-setup-btn"
            onClick={() => setShowSizeDropdown(!showSizeDropdown)}
            title="Size"
          >
            <span className="formulas-icon-lg" aria-hidden>
              📏
            </span>
            <span>Size</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showPrintAreaDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {menuItems(printAreaOptions, (_, index) => {
                setShowPrintAreaDropdown(false);
                if (index === 0) onPrintAreaSet?.();
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-setup-btn"
            onClick={() => setShowPrintAreaDropdown(!showPrintAreaDropdown)}
            title="Print Area"
          >
            <span className="formulas-icon-lg" aria-hidden>
              🖨️
            </span>
            <span>
              Print
              <br />
              Area
            </span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showBreaksDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {menuItems(breakOptions, (_, index) => {
                setShowBreaksDropdown(false);
                onBreaksInsert?.(index === 0 ? "page" : "remove");
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-setup-btn"
            onClick={() => setShowBreaksDropdown(!showBreaksDropdown)}
            title="Breaks"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ✂️
            </span>
            <span>Breaks</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <button
          type="button"
          className="formulas-btn-large pagelayout-setup-btn"
          onClick={() => onBackgroundSet?.()}
          title="Background"
        >
          <span className="formulas-icon-lg" aria-hidden>
            🖼️
          </span>
          <span>Background</span>
        </button>

        <button
          type="button"
          className="formulas-btn-large pagelayout-setup-btn"
          onClick={() => onPrintTitlesSet?.()}
          title="Print Titles"
        >
          <span className="formulas-icon-lg" aria-hidden>
            📌
          </span>
          <span>
            Print
            <br />
            Titles
          </span>
        </button>
      </div>

      <div className="pagelayout-group-footer">
        <div className="formulas-group-caption">Page Setup</div>
        <button
          type="button"
          className="pagelayout-dialog-launcher"
          title="Page Setup dialog"
          aria-label="Page Setup dialog"
        />
      </div>
    </div>
  );
};
