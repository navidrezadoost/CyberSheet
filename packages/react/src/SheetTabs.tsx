/**
 * SheetTabs.tsx
 *
 * Cybersheet sheet tabs for navigating between worksheets
 */

import React, { useState, useEffect } from "react";
import { CybersheetDialog } from "./components/dialogs/CybersheetDialog";

export interface SheetTabsProps {
  sheets: string[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  onAddSheet?: () => void;
  /** Return an error message on failure, or null/undefined on success */
  onRenameSheet?: (
    oldName: string,
    newName: string,
  ) => string | null | undefined;
  onDeleteSheet?: (sheetName: string) => void;
  /** Increment to open rename dialog for the active sheet */
  renameActiveSheetTrigger?: number;
  style?: React.CSSProperties;
}

const TrashIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path
      d="M6 2h4l.5 1H13v1H3V3h2.5L6 2zM4 5h8l-.7 8.1c-.1.9-.9 1.6-1.8 1.6H6.5c-.9 0-1.7-.7-1.8-1.6L4 5z"
      fill={color}
    />
    <path
      d="M6.5 6.5v5M9.5 6.5v5"
      stroke="#fff"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheet,
  onSheetChange,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  renameActiveSheetTrigger = 0,
  style,
}) => {
  const [hoveredSheet, setHoveredSheet] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const canDelete = sheets.length > 1;

  const openRenameDialog = (sheetName: string) => {
    setRenameTarget(sheetName);
  };

  useEffect(() => {
    if (renameActiveSheetTrigger > 0 && activeSheet) {
      openRenameDialog(activeSheet);
    }
  }, [renameActiveSheetTrigger, activeSheet]);

  const handleRenameConfirm = (newName: string) => {
    if (!renameTarget) return;

    const trimmed = newName.trim();
    if (!trimmed || trimmed === renameTarget) {
      setRenameTarget(null);
      return;
    }

    const error = onRenameSheet?.(renameTarget, trimmed);
    if (error) {
      setAlertMessage(error);
      return;
    }

    setRenameTarget(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget && onDeleteSheet) {
      onDeleteSheet(deleteTarget);
    }
    setDeleteTarget(null);
  };

  const handleDoubleClick = (e: React.MouseEvent, sheetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    openRenameDialog(sheetName);
  };

  const handleDeleteClick = (e: React.MouseEvent, sheetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canDelete || !onDeleteSheet) return;
    setDeleteTarget(sheetName);
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    sheetName: string,
  ) => {
    e.preventDefault();
    if (canDelete && onDeleteSheet) {
      setDeleteTarget(sheetName);
    }
  };

  return (
    <>
      <div
        className="cybersheet-sheet-tabs excel-sheet-tabs-bar"
        style={{
          userSelect: "none",
          ...style,
        }}
      >
        <div className="excel-sheet-tab-nav">
          {["◄", "►"].map((label, index) => (
            <button
              key={`${label}-${index}`}
              type="button"
              className="excel-sheet-scroll-btn"
              title="Scroll sheets"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="excel-sheet-tab-strip">
          {sheets.map((sheetName) => {
            const isActive = sheetName === activeSheet;
            const isHovered = hoveredSheet === sheetName;
            const showDelete =
              canDelete && onDeleteSheet && (isHovered || isActive);

            return (
              <div
                key={sheetName}
                className={`excel-sheet-tab${isActive ? " active" : ""}`}
                onClick={() => onSheetChange(sheetName)}
                onDoubleClick={(e) => handleDoubleClick(e, sheetName)}
                onContextMenu={(e) => handleContextMenu(e, sheetName)}
                onMouseEnter={() => setHoveredSheet(sheetName)}
                onMouseLeave={() => setHoveredSheet(null)}
                title={`${sheetName} — double-click to rename`}
              >
                <span>{sheetName}</span>

                {showDelete && (
                  <button
                    type="button"
                    className="excel-sheet-tab-delete"
                    aria-label={`Delete sheet ${sheetName}`}
                    title={`Delete ${sheetName}`}
                    onClick={(e) => handleDeleteClick(e, sheetName)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <TrashIcon color="#c0392b" />
                  </button>
                )}
              </div>
            );
          })}

          {onAddSheet && (
            <button
              type="button"
              className="excel-sheet-tab-add"
              onClick={onAddSheet}
              title="Insert worksheet"
            >
              +
            </button>
          )}
        </div>
      </div>

      {deleteTarget && (
        <CybersheetDialog
          variant="confirm"
          title="Delete Sheet"
          message={`Delete sheet "${deleteTarget}"?\n\nThis action cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {renameTarget && (
        <CybersheetDialog
          variant="prompt"
          title="Rename Sheet"
          label="Sheet name:"
          value={renameTarget}
          maxLength={31}
          confirmLabel="Rename"
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      {alertMessage && (
        <CybersheetDialog
          variant="alert"
          title="Rename Sheet"
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
    </>
  );
};
