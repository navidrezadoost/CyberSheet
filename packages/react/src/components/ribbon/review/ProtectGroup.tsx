/**
 * ProtectGroup.tsx
 *
 * Review Tab - Protect Group
 * Contains: Protect Sheet, Protect Workbook, Allow Edit Ranges
 */

import {
  ProtectGroupIcon3,
  ProtectGroupIcon2,
  ProtectGroupIcon1,
} from "@cyber-sheet/icons/react";
import React, { useState } from "react";
import type { Workbook } from "@cyber-sheet/core";

interface ProtectGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

export const ProtectGroup: React.FC<ProtectGroupProps> = ({
  workbook,
  onCommand,
}) => {
  const [showProtectSheetDialog, setShowProtectSheetDialog] = useState(false);
  const [showProtectWorkbookDialog, setShowProtectWorkbookDialog] =
    useState(false);
  const [showAllowEditRangesDialog, setShowAllowEditRangesDialog] =
    useState(false);

  const handleProtectSheet = () => {
    console.log("Protect Sheet");
    setShowProtectSheetDialog(true);
  };

  const handleProtectWorkbook = () => {
    console.log("Protect Workbook");
    setShowProtectWorkbookDialog(true);
  };

  const handleAllowEditRanges = () => {
    console.log("Allow Edit Ranges");
    setShowAllowEditRangesDialog(true);
  };

  const handleProtectSheetSubmit = (password: string, options: any) => {
    console.log("Protect Sheet submitted", password, options);
    onCommand?.({
      type: "protectSheet",
      password,
      options,
    });
    setShowProtectSheetDialog(false);
  };

  const handleProtectWorkbookSubmit = (password: string, options: any) => {
    console.log("Protect Workbook submitted", password, options);
    onCommand?.({
      type: "protectWorkbook",
      password,
      options,
    });
    setShowProtectWorkbookDialog(false);
  };

  return (
    <div style={groupStyle}>
      <div style={{ display: "flex", gap: 4 }}>
        {/* Protect Sheet Button */}
        <button
          onClick={handleProtectSheet}
          style={buttonStyle}
          title="Protect Sheet"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = "#E8E8E8";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ProtectGroupIcon1 />
          <span style={labelStyle}>Protect</span>
          <span style={labelStyle}>Sheet</span>
        </button>

        {/* Protect Workbook Button */}
        <button
          onClick={handleProtectWorkbook}
          style={buttonStyle}
          title="Protect Workbook"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = "#E8E8E8";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ProtectGroupIcon2 />
          <span style={labelStyle}>Protect</span>
          <span style={labelStyle}>Workbook</span>
        </button>

        {/* Allow Edit Ranges Button */}
        <button
          onClick={handleAllowEditRanges}
          style={buttonStyle}
          title="Allow Edit Ranges"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = "#E8E8E8";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ProtectGroupIcon3 />
          <span style={labelStyle}>Allow Edit</span>
          <span style={labelStyle}>Ranges</span>
        </button>
      </div>

      {/* Protect Sheet Dialog */}
      {showProtectSheetDialog && (
        <ProtectSheetDialog
          onSubmit={handleProtectSheetSubmit}
          onCancel={() => setShowProtectSheetDialog(false)}
        />
      )}

      {/* Protect Workbook Dialog */}
      {showProtectWorkbookDialog && (
        <ProtectWorkbookDialog
          onSubmit={handleProtectWorkbookSubmit}
          onCancel={() => setShowProtectWorkbookDialog(false)}
        />
      )}

      {/* Allow Edit Ranges Dialog (placeholder) */}
      {showAllowEditRangesDialog && (
        <div
          style={dialogBackdropStyle}
          onClick={() => setShowAllowEditRangesDialog(false)}
        >
          <div
            style={dialogStyle}
            onClick={(e: React.MouseEvent<HTMLDivElement>) =>
              e.stopPropagation()
            }
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>
              Allow Users to Edit Ranges
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: 12, color: "#666" }}>
              This feature allows you to specify ranges that users can edit even
              when the sheet is protected.
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                onClick={() => setShowAllowEditRangesDialog(false)}
                style={dialogButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Label */}
      <div style={groupLabelStyle}>Protect</div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────

interface ProtectSheetDialogProps {
  onSubmit: (password: string, options: any) => void;
  onCancel: () => void;
}

const ProtectSheetDialog: React.FC<ProtectSheetDialogProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [options, setOptions] = useState({
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
  });

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    onSubmit(password, options);
  };

  return (
    <div style={dialogBackdropStyle} onClick={onCancel}>
      <div
        style={dialogStyle}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>
          Protect Sheet
        </h3>

        <div style={{ marginBottom: 12 }}>
          <label style={labelInputStyle}>
            Password (optional):
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              style={inputStyle}
              placeholder="Enter password"
            />
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelInputStyle}>
            Confirm password:
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              style={inputStyle}
              placeholder="Re-enter password"
            />
          </label>
        </div>

        <div style={{ marginBottom: 16, fontSize: 11, color: "#333" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Allow all users of this worksheet to:
          </div>
          {Object.entries({
            selectLockedCells: "Select locked cells",
            selectUnlockedCells: "Select unlocked cells",
            formatCells: "Format cells",
            formatColumns: "Format columns",
            formatRows: "Format rows",
            insertColumns: "Insert columns",
            insertRows: "Insert rows",
            deleteColumns: "Delete columns",
            deleteRows: "Delete rows",
          }).map(([key, label]) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 4,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={options[key as keyof typeof options]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setOptions({ ...options, [key]: e.target.checked })
                }
                style={{ marginRight: 6 }}
              />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={dialogButtonStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...dialogButtonStyle,
              background: "#0078D4",
              color: "#FFF",
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProtectWorkbookDialogProps {
  onSubmit: (password: string, options: any) => void;
  onCancel: () => void;
}

const ProtectWorkbookDialog: React.FC<ProtectWorkbookDialogProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [protectStructure, setProtectStructure] = useState(true);
  const [protectWindows, setProtectWindows] = useState(false);

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    onSubmit(password, { protectStructure, protectWindows });
  };

  return (
    <div style={dialogBackdropStyle} onClick={onCancel}>
      <div
        style={{ ...dialogStyle, width: 350 }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>
          Protect Workbook
        </h3>

        <div style={{ marginBottom: 12 }}>
          <label style={labelInputStyle}>
            Password (optional):
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              style={inputStyle}
              placeholder="Enter password"
            />
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelInputStyle}>
            Confirm password:
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              style={inputStyle}
              placeholder="Re-enter password"
            />
          </label>
        </div>

        <div style={{ marginBottom: 16, fontSize: 11, color: "#333" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Protect workbook for:
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 4,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={protectStructure}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProtectStructure(e.target.checked)
              }
              style={{ marginRight: 6 }}
            />
            Structure (prevent moving, deleting, or renaming sheets)
          </label>
          <label
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={protectWindows}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProtectWindows(e.target.checked)
              }
              style={{ marginRight: 6 }}
            />
            Windows (prevent resizing or moving windows)
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={dialogButtonStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...dialogButtonStyle,
              background: "#0078D4",
              color: "#FFF",
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const groupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  position: "relative",
  paddingBottom: 18,
};

const buttonStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 0,
  padding: "4px 6px",
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 2,
  fontSize: 10,
  color: "#333",
  fontFamily: "Segoe UI, sans-serif",
  minWidth: 52,
  height: 56,
  transition: "background 0.1s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#333",
  textAlign: "center",
  lineHeight: "11px",
};

const groupLabelStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 2,
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: 10,
  color: "#666",
  fontFamily: "Segoe UI, sans-serif",
  pointerEvents: "none",
};

const dialogBackdropStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};

const dialogStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 4,
  padding: 20,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
  width: 450,
  maxWidth: "90vw",
  maxHeight: "80vh",
  overflow: "auto",
  fontFamily: "Segoe UI, sans-serif",
};

const labelInputStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#333",
  fontWeight: 600,
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #D9D9D9",
  borderRadius: 2,
  fontSize: 12,
  fontFamily: "Segoe UI, sans-serif",
  marginTop: 4,
};

const dialogButtonStyle: React.CSSProperties = {
  padding: "6px 16px",
  border: "1px solid #D9D9D9",
  borderRadius: 2,
  background: "#FFFFFF",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "Segoe UI, sans-serif",
};
