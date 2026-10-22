import { DataTabIcon1 } from "@cyber-sheet/icons/react";
import React from "react";
import type { Workbook, Address } from "@cyber-sheet/core";
import { GetTransformDataGroup } from "./GetTransformDataGroup";
import { SortFilterGroup } from "./SortFilterGroup";
import { DataToolsGroup } from "./DataToolsGroup";
import { OutlineGroup } from "./OutlineGroup";
import "../ribbon.css";

interface DataTabProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const DataTab: React.FC<DataTabProps> = ({
  workbook,
  selectedCells,
  onCommand,
}) => {
  return (
    <div className="ribbon-content ribbon-tab-content ribbon-tab-content-spacious ribbon-data-2013">
      {/* Get & Transform Data Group */}
      <GetTransformDataGroup workbook={workbook} onCommand={onCommand} />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Queries & Connections Group (Placeholder - could expand) */}
      <div className="ribbon-tab-shell ribbon-tab-shell-center">
        <button
          onClick={() => console.log("Open Workbook Links")}
          title="Workbook Links"
          className="ribbon-feature-button"
        >
          <DataTabIcon1 />
          <span>
            Workbook
            <br />
            Links
          </span>
        </button>
        <div className="ribbon-tab-shell-title">Queries &amp; Connections</div>
      </div>

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Sort & Filter Group */}
      <SortFilterGroup
        workbook={workbook}
        selectedCells={selectedCells}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Data Tools Group */}
      <DataToolsGroup
        workbook={workbook}
        selectedCells={selectedCells}
        onCommand={onCommand}
      />

      {/* Divider */}
      <div className="ribbon-tab-divider ribbon-tab-divider-tall" />

      {/* Outline Group */}
      <OutlineGroup
        workbook={workbook}
        selectedCells={selectedCells}
        onCommand={onCommand}
      />
    </div>
  );
};
