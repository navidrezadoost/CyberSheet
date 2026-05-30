import React, { useState, useEffect } from 'react';
import type { InsertCellsMode, DeleteCellsMode } from '@cyber-sheet/core';

export type InsertDeleteDialogType = 'insert' | 'delete';

interface InsertDeleteCellsDialogProps {
  type: InsertDeleteDialogType;
  onConfirm: (mode: InsertCellsMode | DeleteCellsMode) => void;
  onCancel: () => void;
}

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10003,
};

const dialogStyles: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: '4px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  width: '320px',
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: '13px',
  color: '#333',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e0e0e0',
  fontWeight: 600,
};

const bodyStyles: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '12px 16px',
  borderTop: '1px solid #e0e0e0',
};

const radioLabelStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const primaryButtonStyles: React.CSSProperties = {
  padding: '6px 20px',
  border: '1px solid #0078d4',
  background: '#0078d4',
  color: '#fff',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '13px',
};

const secondaryButtonStyles: React.CSSProperties = {
  padding: '6px 20px',
  border: '1px solid #d0d0d0',
  background: '#fff',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '13px',
};

export const InsertDeleteCellsDialog: React.FC<InsertDeleteCellsDialogProps> = ({
  type,
  onConfirm,
  onCancel,
}) => {
  const [insertMode, setInsertMode] = useState<InsertCellsMode>('down');
  const [deleteMode, setDeleteMode] = useState<DeleteCellsMode>('up');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(type === 'insert' ? insertMode : deleteMode);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [type, insertMode, deleteMode, onConfirm, onCancel]);

  const title = type === 'insert' ? 'Insert' : 'Delete';

  return (
    <div style={overlayStyles} onMouseDown={(e) => e.stopPropagation()}>
      <div
        style={dialogStyles}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={headerStyles}>
          <span>{title}</span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        <div style={bodyStyles}>
          {type === 'insert' ? (
            <>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="insertMode"
                  checked={insertMode === 'right'}
                  onChange={() => setInsertMode('right')}
                  style={{ marginRight: '8px' }}
                />
                Shift cells right
              </label>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="insertMode"
                  checked={insertMode === 'down'}
                  onChange={() => setInsertMode('down')}
                  style={{ marginRight: '8px' }}
                />
                Shift cells down
              </label>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="insertMode"
                  checked={insertMode === 'row'}
                  onChange={() => setInsertMode('row')}
                  style={{ marginRight: '8px' }}
                />
                Entire row
              </label>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="insertMode"
                  checked={insertMode === 'column'}
                  onChange={() => setInsertMode('column')}
                  style={{ marginRight: '8px' }}
                />
                Entire column
              </label>
            </>
          ) : (
            <>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'left'}
                  onChange={() => setDeleteMode('left')}
                  style={{ marginRight: '8px' }}
                />
                Shift cells left
              </label>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'up'}
                  onChange={() => setDeleteMode('up')}
                  style={{ marginRight: '8px' }}
                />
                Shift cells up
              </label>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'row'}
                  onChange={() => setDeleteMode('row')}
                  style={{ marginRight: '8px' }}
                />
                Entire row
              </label>
              <label style={radioLabelStyles}>
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'column'}
                  onChange={() => setDeleteMode('column')}
                  style={{ marginRight: '8px' }}
                />
                Entire column
              </label>
            </>
          )}
        </div>

        <div style={footerStyles}>
          <button
            type="button"
            onClick={() => onConfirm(type === 'insert' ? insertMode : deleteMode)}
            style={primaryButtonStyles}
          >
            OK
          </button>
          <button type="button" onClick={onCancel} style={secondaryButtonStyles}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
