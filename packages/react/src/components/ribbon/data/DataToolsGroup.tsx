import {
  DataToolsGroupIcon5,
  DataToolsGroupIcon4,
  DataToolsGroupIcon3,
  DataToolsGroupIcon2,
  DataToolsGroupIcon1,
} from "@cyber-sheet/icons/react";
import React, { useState, useCallback } from "react";
import type { Workbook, Address, Range } from "@cyber-sheet/core";
import { DataValidationDialog } from "@cyber-sheet/react";

interface DataToolsGroupProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const DataToolsGroup: React.FC<DataToolsGroupProps> = ({
  workbook,
  selectedCells,
  onCommand,
}) => {
  const [showDataValidationDropdown, setShowDataValidationDropdown] =
    useState(false);
  const [showDataValidationDialog, setShowDataValidationDialog] =
    useState(false);
  const [showRemoveDuplicatesDialog, setShowRemoveDuplicatesDialog] =
    useState(false);
  const [showTextToColumnsWizard, setShowTextToColumnsWizard] = useState(false);

  const handleDataValidation = useCallback(() => {
    setShowDataValidationDialog(true);
    setShowDataValidationDropdown(false);
  }, []);

  const handleCircleInvalidData = useCallback(() => {
    const command = {
      type: "circleInvalidData",
    };
    onCommand?.(command);
    setShowDataValidationDropdown(false);
    console.log("Circle Invalid Data");
  }, [onCommand]);

  const handleClearValidationCircles = useCallback(() => {
    const command = {
      type: "clearValidationCircles",
    };
    onCommand?.(command);
    setShowDataValidationDropdown(false);
    console.log("Clear Validation Circles");
  }, [onCommand]);

  const handleTextToColumns = useCallback(() => {
    setShowTextToColumnsWizard(true);
  }, []);

  const handleFlashFill = useCallback(() => {
    if (selectedCells.length === 0) {
      console.warn("No column selected for Flash Fill");
      return;
    }

    const selection: Range = {
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    };

    const command = {
      type: "flashFill",
      columnIndex: selection.start.col,
      startRow: selection.start.row,
      endRow: selection.end.row,
    };

    onCommand?.(command);
    console.log("Flash Fill:", selection.start.col);
  }, [selectedCells, onCommand]);

  const handleRemoveDuplicates = useCallback(() => {
    setShowRemoveDuplicatesDialog(true);
  }, []);

  const validationMenuStyle = {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    marginTop: 2,
    background: "#FFFFFF",
    border: "1px solid #D9D9D9",
    borderRadius: 4,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 1000,
    minWidth: 180,
  };

  return (
    <div className="formulas-group data-tools">
      <div className="formulas-group-body data-tools-body">
        <button
          type="button"
          className="formulas-btn-large data-text-to-columns-btn"
          onClick={handleTextToColumns}
          title="Text to Columns"
        >
          <DataToolsGroupIcon3 />
          <span>
            Text to
            <br />
            Columns
          </span>
        </button>

        <div className="formulas-menu-stack">
          <button
            type="button"
            className="formulas-row-btn data-ribbon-row-btn"
            onClick={handleFlashFill}
            title="Flash Fill (Ctrl+E)"
          >
            <span className="data-ribbon-row-icon" aria-hidden>
              <DataToolsGroupIcon4 />
            </span>
            <span>Flash Fill</span>
          </button>

          <button
            type="button"
            className="formulas-row-btn data-ribbon-row-btn"
            onClick={handleRemoveDuplicates}
            title="Remove Duplicates"
          >
            <span className="data-ribbon-row-icon" aria-hidden>
              <DataToolsGroupIcon5 />
            </span>
            <span>Remove Duplicates</span>
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="formulas-row-btn data-ribbon-row-btn"
              onClick={() =>
                setShowDataValidationDropdown(!showDataValidationDropdown)
              }
              title="Data Validation"
            >
              <span className="data-ribbon-row-icon" aria-hidden>
                <DataToolsGroupIcon1 />
              </span>
              <span>Data Validation</span>
              <span className="formulas-row-chevron" aria-hidden>
                <DataToolsGroupIcon2 />
              </span>
            </button>

            {showDataValidationDropdown && (
              <div style={validationMenuStyle}>
                <button
                  type="button"
                  onClick={handleDataValidation}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "Segoe UI, sans-serif",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                    (e.currentTarget.style.background = "#F0F0F0")
                  }
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Data Validation...
                </button>
                <div
                  style={{ height: 1, background: "#E0E0E0", margin: "4px 0" }}
                />
                <button
                  type="button"
                  onClick={handleCircleInvalidData}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "Segoe UI, sans-serif",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                    (e.currentTarget.style.background = "#F0F0F0")
                  }
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Circle Invalid Data
                </button>
                <button
                  type="button"
                  onClick={handleClearValidationCircles}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "Segoe UI, sans-serif",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                    (e.currentTarget.style.background = "#F0F0F0")
                  }
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Clear Validation Circles
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="formulas-group-caption">Data Tools</div>

      {/* Data Validation Dialog */}
      {showDataValidationDialog && selectedCells.length > 0 && (
        <DataValidationDialog
          isOpen={showDataValidationDialog}
          onClose={() => setShowDataValidationDialog(false)}
          onApply={(rule) => {
            const selection: Range = {
              start: selectedCells[0],
              end: selectedCells[selectedCells.length - 1],
            };

            const command = {
              type: "setDataValidation",
              range: selection,
              rule,
            };
            onCommand?.(command);
            setShowDataValidationDialog(false);
          }}
          selectedRange={{
            start: selectedCells[0],
            end: selectedCells[selectedCells.length - 1],
          }}
          existingRule={undefined}
        />
      )}

      {/* Remove Duplicates Dialog */}
      {showRemoveDuplicatesDialog && (
        <RemoveDuplicatesDialog
          workbook={workbook}
          selectedCells={selectedCells}
          onClose={() => setShowRemoveDuplicatesDialog(false)}
          onRemove={(columns) => {
            if (selectedCells.length === 0) return;

            const selection: Range = {
              start: selectedCells[0],
              end: selectedCells[selectedCells.length - 1],
            };

            const command = {
              type: "removeDuplicates",
              range: selection,
              columns,
            };
            onCommand?.(command);
            setShowRemoveDuplicatesDialog(false);
          }}
        />
      )}

      {/* Text to Columns Wizard */}
      {showTextToColumnsWizard && (
        <TextToColumnsWizard
          workbook={workbook}
          selectedCells={selectedCells}
          onClose={() => setShowTextToColumnsWizard(false)}
          onApply={(config) => {
            if (selectedCells.length === 0) return;

            const selection: Range = {
              start: selectedCells[0],
              end: selectedCells[selectedCells.length - 1],
            };

            const command = {
              type: "textToColumns",
              range: selection,
              config,
            };
            onCommand?.(command);
            setShowTextToColumnsWizard(false);
          }}
        />
      )}
    </div>
  );
};

// Remove Duplicates Dialog
interface RemoveDuplicatesDialogProps {
  workbook: Workbook;
  selectedCells: Address[];
  onClose: () => void;
  onRemove: (columns: number[]) => void;
}

const RemoveDuplicatesDialog: React.FC<RemoveDuplicatesDialogProps> = ({
  workbook,
  selectedCells,
  onClose,
  onRemove,
}) => {
  const sheet = workbook.activeSheet;

  // Calculate column count from selection
  let columnCount = 5; // default
  if (sheet && selectedCells.length > 0) {
    const selection: Range = {
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    };
    columnCount = selection.end.col - selection.start.col + 1;
  }

  const [selectedColumns, setSelectedColumns] = useState<boolean[]>(
    Array(columnCount).fill(true),
  );

  const toggleColumn = (index: number) => {
    const newSelected = [...selectedColumns];
    newSelected[index] = !newSelected[index];
    setSelectedColumns(newSelected);
  };

  const selectAll = () => setSelectedColumns(Array(columnCount).fill(true));
  const deselectAll = () => setSelectedColumns(Array(columnCount).fill(false));

  const handleRemove = () => {
    const columns = selectedColumns
      .map((selected, index) => (selected ? index : -1))
      .filter((i) => i >= 0);
    onRemove(columns);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          width: 400,
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #E0E0E0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            Remove Duplicates
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>
            To delete duplicate values, select one or more columns that contain
            duplicates.
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={selectAll}
              style={{
                padding: "4px 12px",
                border: "1px solid #D9D9D9",
                background: "#F0F0F0",
                borderRadius: 2,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              style={{
                padding: "4px 12px",
                border: "1px solid #D9D9D9",
                background: "#F0F0F0",
                borderRadius: 2,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Unselect All
            </button>
          </div>

          <div
            style={{
              border: "1px solid #D9D9D9",
              borderRadius: 2,
              maxHeight: 200,
              overflow: "auto",
              padding: 8,
            }}
          >
            {Array.from({ length: columnCount }, (_, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  padding: "4px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedColumns[i]}
                  onChange={() => toggleColumn(i)}
                />
                Column {String.fromCharCode(65 + i)}
              </label>
            ))}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              marginTop: 12,
            }}
          >
            <input type="checkbox" defaultChecked />
            My data has headers
          </label>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #E0E0E0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              border: "1px solid #D9D9D9",
              background: "#F0F0F0",
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            style={{
              padding: "6px 16px",
              border: "1px solid #0078D4",
              background: "#0078D4",
              color: "#FFFFFF",
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Text to Columns Wizard (Simplified)
interface TextToColumnsWizardProps {
  workbook: Workbook;
  selectedCells: Address[];
  onClose: () => void;
  onApply: (config: any) => void;
}

const TextToColumnsWizard: React.FC<TextToColumnsWizardProps> = ({
  workbook,
  selectedCells,
  onClose,
  onApply,
}) => {
  const [step, setStep] = useState(1);
  const [dataType, setDataType] = useState<"delimited" | "fixedWidth">(
    "delimited",
  );
  const [delimiters, setDelimiters] = useState({
    tab: true,
    semicolon: false,
    comma: false,
    space: false,
    other: false,
  });
  const [otherDelimiter, setOtherDelimiter] = useState("");

  const handleApply = () => {
    const config = {
      dataType,
      delimiters: Object.entries(delimiters)
        .filter(([key, value]) => value)
        .map(([key]) => (key === "other" ? otherDelimiter : key)),
    };
    onApply(config);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          width: 500,
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #E0E0E0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            Convert Text to Columns Wizard - Step {step} of 3
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, minHeight: 200 }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 11, marginBottom: 12 }}>
                The Text Wizard has determined that your data is{" "}
                {dataType === "delimited" ? "Delimited" : "Fixed Width"}.
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                Original data type:
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                <input
                  type="radio"
                  checked={dataType === "delimited"}
                  onChange={() => setDataType("delimited")}
                />
                Delimited - Characters such as commas or tabs separate each
                field
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <input
                  type="radio"
                  checked={dataType === "fixedWidth"}
                  onChange={() => setDataType("fixedWidth")}
                />
                Fixed width - Fields are aligned in columns with spaces between
                each field
              </label>
            </div>
          )}

          {step === 2 && dataType === "delimited" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                Delimiters:
              </div>
              {Object.entries(delimiters).map(([key, value]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDelimiters({ ...delimiters, [key]: e.target.checked })
                    }
                  />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  {key === "other" && (
                    <input
                      type="text"
                      value={otherDelimiter}
                      onChange={(
                        e: React.ChangeEvent<
                          | HTMLInputElement
                          | HTMLSelectElement
                          | HTMLTextAreaElement
                        >,
                      ) => setOtherDelimiter(e.target.value)}
                      disabled={!delimiters.other}
                      style={{
                        width: 40,
                        padding: "2px 4px",
                        border: "1px solid #D9D9D9",
                        borderRadius: 2,
                        fontSize: 11,
                        marginLeft: 8,
                      }}
                      maxLength={1}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: 11, marginBottom: 12 }}>
                This screen lets you select each column and set the Data Format.
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                Column data format:
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                <input type="radio" defaultChecked />
                General
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                <input type="radio" />
                Text
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <input type="radio" />
                Date: MDY
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #E0E0E0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              border: "1px solid #D9D9D9",
              background: "#F0F0F0",
              borderRadius: 2,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Cancel
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: "6px 16px",
                  border: "1px solid #D9D9D9",
                  background: "#F0F0F0",
                  borderRadius: 2,
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                style={{
                  padding: "6px 16px",
                  border: "1px solid #0078D4",
                  background: "#0078D4",
                  color: "#FFFFFF",
                  borderRadius: 2,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleApply}
                style={{
                  padding: "6px 16px",
                  border: "1px solid #0078D4",
                  background: "#0078D4",
                  color: "#FFFFFF",
                  borderRadius: 2,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
