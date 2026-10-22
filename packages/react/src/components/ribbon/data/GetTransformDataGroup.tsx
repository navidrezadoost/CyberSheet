import {
  GetTransformDataGroupIcon5,
  GetTransformDataGroupIcon4,
  GetTransformDataGroupIcon3,
  GetTransformDataGroupIcon1,
} from "@cyber-sheet/icons/react";
import React, { useState, useCallback } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";
import type { Workbook } from "@cyber-sheet/core";

interface GetTransformDataGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 12px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "Segoe UI, sans-serif",
};

export const GetTransformDataGroup: React.FC<GetTransformDataGroupProps> = ({
  workbook,
  onCommand,
}) => {
  const [showGetDataDropdown, setShowGetDataDropdown] = useState(false);
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false);

  const handleGetDataFrom = useCallback((source: string) => {
    console.log("Get Data From:", source);
    setShowGetDataDropdown(false);
  }, []);

  const handleRefreshAll = useCallback(() => {
    onCommand?.({ type: "refreshAllConnections" });
    console.log("Refresh All Connections");
  }, [workbook, onCommand]);

  const handleQueriesConnections = useCallback(() => {
    console.log("Open Queries & Connections pane");
  }, []);

  const menuStyle = ribbonDropdownChrome({ minWidth: 200, maxHeight: 360 });
  const refreshMenuStyle = ribbonDropdownChrome({ minWidth: 180 });

  const hoverMenuItem = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = "#F0F0F0";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = "transparent";
    },
  };

  return (
    <div className="formulas-group data-get-transform">
      <div className="formulas-group-body data-get-transform-body">
        <RibbonDropdownHost
          open={showGetDataDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {[
                ["file", "From File ▶"],
                ["database", "From Database ▶"],
                ["online", "From Online Services ▶"],
                ["other", "From Other Sources ▶"],
              ].map(([source, label]) => (
                <button
                  key={source}
                  type="button"
                  style={menuItemStyle}
                  onClick={() => handleGetDataFrom(source)}
                  {...hoverMenuItem}
                >
                  {label}
                </button>
              ))}
              <div style={{ height: 1, background: "#E0E0E0", margin: "4px 0" }} />
              <button
                type="button"
                style={menuItemStyle}
                onClick={() => handleGetDataFrom("powerQuery")}
                {...hoverMenuItem}
              >
                Launch Power Query Editor...
              </button>
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large data-get-data-btn"
            onClick={() => setShowGetDataDropdown(!showGetDataDropdown)}
            title="Get Data"
          >
            <GetTransformDataGroupIcon1 />
            <span>Get Data</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <div className="data-get-transform-cols">
          <div className="formulas-menu-stack">
            <div className="formulas-row-btn data-ribbon-row-btn data-refresh-split">
              <button
                type="button"
                className="data-refresh-split-main"
                onClick={handleRefreshAll}
                title="Refresh All"
              >
                <span className="data-ribbon-row-icon" aria-hidden>
                  <GetTransformDataGroupIcon3 />
                </span>
                <span>Refresh All</span>
              </button>
              <RibbonDropdownHost
                open={showRefreshDropdown}
                menuStyle={refreshMenuStyle}
                menu={
                  <>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        handleRefreshAll();
                        setShowRefreshDropdown(false);
                      }}
                      {...hoverMenuItem}
                    >
                      Refresh All
                    </button>
                    <button type="button" style={menuItemStyle} {...hoverMenuItem}>
                      Refresh
                    </button>
                    <button type="button" style={menuItemStyle} {...hoverMenuItem}>
                      Cancel Refresh
                    </button>
                    <div
                      style={{ height: 1, background: "#E0E0E0", margin: "4px 0" }}
                    />
                    <button type="button" style={menuItemStyle} {...hoverMenuItem}>
                      Connection Properties...
                    </button>
                  </>
                }
              >
                <button
                  type="button"
                  className="data-refresh-split-chevron"
                  aria-label="Refresh All options"
                  onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
                >
                  <GetTransformDataGroupIcon4 />
                </button>
              </RibbonDropdownHost>
            </div>
          </div>

          <div className="formulas-menu-stack">
            <button
              type="button"
              className="formulas-row-btn data-ribbon-row-btn"
              onClick={handleQueriesConnections}
              title="Queries & Connections"
            >
              <span className="data-ribbon-row-icon" aria-hidden>
                <GetTransformDataGroupIcon5 />
              </span>
              <span>Queries &amp; Connections</span>
            </button>
          </div>
        </div>
      </div>

      <div className="formulas-group-caption">Get &amp; Transform Data</div>
    </div>
  );
};
