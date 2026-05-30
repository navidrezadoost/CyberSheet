/**
 * SheetTabs.tsx
 *
 * Cybersheet sheet tabs for navigating between worksheets
 */

import React, { useState, useEffect } from 'react';
import { CybersheetDialog } from './components/dialogs/CybersheetDialog';

export interface SheetTabsProps {
  sheets: string[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  onAddSheet?: () => void;
  /** Return an error message on failure, or null/undefined on success */
  onRenameSheet?: (oldName: string, newName: string) => string | null | undefined;
  onDeleteSheet?: (sheetName: string) => void;
  /** Increment to open rename dialog for the active sheet */
  renameActiveSheetTrigger?: number;
  style?: React.CSSProperties;
}

const TrashIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    style={{ display: 'block' }}
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

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, sheetName: string) => {
    e.preventDefault();
    if (canDelete && onDeleteSheet) {
      setDeleteTarget(sheetName);
    }
  };

  return (
    <>
      <div
        className="cybersheet-sheet-tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          backgroundColor: '#e7e7e7',
          backgroundImage: 'linear-gradient(to bottom, #e7e7e7, #d8d8d8)',
          borderTop: '2px solid #c0c0c0',
          boxShadow: '0 -2px 5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
          overflow: 'auto',
          userSelect: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: '12px',
          ...style,
        }}
      >
        <div
          style={{
            display: 'flex',
            borderRight: '1px solid #d1d1d1',
            padding: '0 6px',
            gap: '2px',
          }}
        >
          {['◄◄', '◄', '►', '►►'].map((label, index) => (
            <button
              key={`${label}-${index}`}
              type="button"
              style={{
                background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
                border: '1px solid #d1d1d1',
                borderRadius: '3px',
                cursor: 'pointer',
                padding: '3px 6px',
                color: '#555',
                fontSize: '11px',
              }}
              title="Scroll sheets"
            >
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'auto',
            alignItems: 'flex-end',
            padding: '0 8px',
            gap: '2px',
          }}
        >
          {sheets.map((sheetName) => {
            const isActive = sheetName === activeSheet;
            const isHovered = hoveredSheet === sheetName;
            const showDelete = canDelete && onDeleteSheet && (isHovered || isActive);

            return (
              <div
                key={sheetName}
                onClick={() => onSheetChange(sheetName)}
                onDoubleClick={(e) => handleDoubleClick(e, sheetName)}
                onContextMenu={(e) => handleContextMenu(e, sheetName)}
                onMouseEnter={() => setHoveredSheet(sheetName)}
                onMouseLeave={() => setHoveredSheet(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px 5px 14px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#ffffff' : (isHovered ? '#f8f8f8' : '#ececec'),
                  backgroundImage: isActive
                    ? 'linear-gradient(to bottom, #ffffff, #fafafa)'
                    : (isHovered
                      ? 'linear-gradient(to bottom, #f8f8f8, #f0f0f0)'
                      : 'linear-gradient(to bottom, #ececec, #e0e0e0)'),
                  border: isActive ? '1px solid #b0b0b0' : '1px solid #c8c8c8',
                  borderBottom: isActive ? '3px solid #217346' : '1px solid #c8c8c8',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#217346' : '#2c2c2c',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  bottom: '0',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive
                    ? '0 -3px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)'
                    : (isHovered
                      ? '0 -1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)'
                      : '0 -1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)'),
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                }}
                title={`${sheetName} — double-click to rename`}
              >
                <span>{sheetName}</span>

                {showDelete && (
                  <button
                    type="button"
                    aria-label={`Delete sheet ${sheetName}`}
                    title={`Delete ${sheetName}`}
                    onClick={(e) => handleDeleteClick(e, sheetName)}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      padding: 0,
                      border: 'none',
                      borderRadius: '3px',
                      background: isHovered ? 'rgba(192, 57, 43, 0.12)' : 'transparent',
                      color: '#a94442',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 120ms ease, transform 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(192, 57, 43, 0.18)';
                      e.currentTarget.style.transform = 'scale(1.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isHovered ? 'rgba(192, 57, 43, 0.12)' : 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
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
              onClick={onAddSheet}
              style={{
                background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
                border: '1px solid #d1d1d1',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '4px 10px',
                color: '#217346',
                fontSize: '16px',
                fontWeight: 'bold',
                marginLeft: '4px',
              }}
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
