/**
 * CellsGroup.tsx
 * 
 * Cells group for Home ribbon tab
 * Provides insert, delete, and format operations for cells, rows, columns, and sheets
 * 
 * Microinteractions:
 * - Insert rows slide in from 0px height (300ms ease-out)
 * - Delete rows collapse to 0px (250ms) then gap closes
 * - AutoFit snaps with elastic bounce (350ms ease-out)
 * - Dialogs scale up from cursor position (200ms)
 * 
 * Phase 4: Excel 365-Level Cell Operations
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Address, Range } from '@cyber-sheet/core';
import type { FormattingController } from '@cyber-sheet/core';

export interface CellsGroupProps {
  formattingController: FormattingController;
  selectedCells: Address[];
  currentRange?: Range;
  onStructureChange?: () => void;
  onInsertCells?: (mode: 'right' | 'down' | 'row' | 'column') => void;
  onDeleteCells?: (mode: 'left' | 'up' | 'row' | 'column') => void;
  onFormatOperation?: (operation: string, value?: any) => void;
}

interface InsertOption {
  id: string;
  label: string;
  shortcut?: string;
  description: string;
}

interface FormatOption {
  id: string;
  label: string;
  separator?: boolean;
  submenu?: boolean;
}

/**
 * Insert options matching Excel
 */
const INSERT_OPTIONS: InsertOption[] = [
  {
    id: 'insertCells',
    label: 'Insert Cells...',
    shortcut: 'Ctrl+Shift++',
    description: 'Insert cells and shift existing cells down or right',
  },
  {
    id: 'insertSheetRows',
    label: 'Insert Sheet Rows',
    description: 'Insert full rows above the selection',
  },
  {
    id: 'insertSheetColumns',
    label: 'Insert Sheet Columns',
    description: 'Insert full columns to the left of the selection',
  },
  {
    id: 'insertSheet',
    label: 'Insert Sheet...',
    shortcut: 'Shift+F11',
    description: 'Add a new worksheet to the workbook',
  },
];

/**
 * Delete options matching Excel
 */
const DELETE_OPTIONS: InsertOption[] = [
  {
    id: 'deleteCells',
    label: 'Delete Cells...',
    shortcut: 'Ctrl+-',
    description: 'Delete selected cells and shift remaining cells',
  },
  {
    id: 'deleteSheetRows',
    label: 'Delete Sheet Rows',
    description: 'Delete the selected rows entirely',
  },
  {
    id: 'deleteSheetColumns',
    label: 'Delete Sheet Columns',
    description: 'Delete the selected columns entirely',
  },
  {
    id: 'deleteSheet',
    label: 'Delete Sheet',
    description: 'Permanently delete the current worksheet',
  },
];

/**
 * Format options matching Excel
 */
const FORMAT_OPTIONS: FormatOption[] = [
  // Cell Size
  { id: 'rowHeight', label: 'Row Height...', separator: false },
  { id: 'autoFitRowHeight', label: 'AutoFit Row Height', separator: false },
  { id: 'columnWidth', label: 'Column Width...', separator: false },
  { id: 'autoFitColumnWidth', label: 'AutoFit Column Width', separator: false },
  { id: 'defaultWidth', label: 'Default Width...', separator: true },
  
  // Visibility
  { id: 'hideRows', label: 'Hide Rows', separator: false },
  { id: 'unhideRows', label: 'Unhide Rows', separator: false },
  { id: 'hideColumns', label: 'Hide Columns', separator: false },
  { id: 'unhideColumns', label: 'Unhide Columns', separator: true },
  
  // Organize Sheets
  { id: 'renameSheet', label: 'Rename Sheet', separator: false },
  { id: 'moveOrCopy', label: 'Move or Copy Sheet...', separator: false },
  { id: 'tabColor', label: 'Tab Color', separator: false, submenu: true },
  { id: 'protectSheet', label: 'Protect Sheet...', separator: false },
  { id: 'lockCell', label: 'Lock Cell', separator: false },
];

export const CellsGroup: React.FC<CellsGroupProps> = ({
  formattingController,
  selectedCells,
  currentRange,
  onStructureChange,
  onInsertCells,
  onDeleteCells,
  onFormatOperation,
}) => {
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showRowHeightDialog, setShowRowHeightDialog] = useState(false);
  const [showColumnWidthDialog, setShowColumnWidthDialog] = useState(false);
  const [rowHeightValue, setRowHeightValue] = useState('15');
  const [columnWidthValue, setColumnWidthValue] = useState('8.43');
  const [insertMode, setInsertMode] = useState<'right' | 'down' | 'row' | 'column'>('down');
  const [deleteMode, setDeleteMode] = useState<'left' | 'up' | 'row' | 'column'>('up');
  
  const insertMenuRef = useRef(null);
  const deleteMenuRef = useRef(null);
  const formatMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (insertMenuRef.current && !(insertMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowInsertMenu(false);
      }
      if (deleteMenuRef.current && !(deleteMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowDeleteMenu(false);
      }
      if (formatMenuRef.current && !(formatMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle insert option selection
   */
  const handleInsertOption = (optionId: string) => {
    setShowInsertMenu(false);
    
    switch (optionId) {
      case 'insertCells':
        setShowInsertDialog(true);
        break;
      case 'insertSheetRows':
        onInsertCells?.('row');
        onStructureChange?.();
        break;
      case 'insertSheetColumns':
        onInsertCells?.('column');
        onStructureChange?.();
        break;
      case 'insertSheet':
        handleInsertSheet();
        break;
    }
  };

  /**
   * Handle delete option selection
   */
  const handleDeleteOption = (optionId: string) => {
    setShowDeleteMenu(false);
    
    switch (optionId) {
      case 'deleteCells':
        setShowDeleteDialog(true);
        break;
      case 'deleteSheetRows':
        onDeleteCells?.('row');
        onStructureChange?.();
        break;
      case 'deleteSheetColumns':
        onDeleteCells?.('column');
        onStructureChange?.();
        break;
      case 'deleteSheet':
        setShowDeleteWarning(true);
        break;
    }
  };

  /**
   * Handle format option selection
   */
  const handleFormatOption = (optionId: string) => {
    setShowFormatMenu(false);
    
    switch (optionId) {
      case 'rowHeight':
        setShowRowHeightDialog(true);
        break;
      case 'autoFitRowHeight':
        onFormatOperation?.('autoFitRowHeight');
        break;
      case 'columnWidth':
        setShowColumnWidthDialog(true);
        break;
      case 'autoFitColumnWidth':
        onFormatOperation?.('autoFitColumnWidth');
        break;
      case 'defaultWidth':
        // TODO: Implement default width dialog
        break;
      case 'hideRows':
        onFormatOperation?.('hideRows');
        break;
      case 'unhideRows':
        onFormatOperation?.('unhideRows');
        break;
      case 'hideColumns':
        onFormatOperation?.('hideColumns');
        break;
      case 'unhideColumns':
        onFormatOperation?.('unhideColumns');
        break;
      case 'renameSheet':
        onFormatOperation?.('renameSheet');
        break;
      case 'moveOrCopy':
        // TODO: Implement move/copy sheet dialog
        break;
      case 'tabColor':
        // TODO: Show tab color picker
        break;
      case 'protectSheet':
        // TODO: Show protect sheet dialog
        break;
      case 'lockCell':
        onFormatOperation?.('lockCell');
        break;
    }
  };

  /**
   * Confirm insert cells with selected mode
   */
  const handleInsertCellsConfirm = () => {
    setShowInsertDialog(false);
    onInsertCells?.(insertMode);
    onStructureChange?.();
  };

  /**
   * Confirm delete cells with selected mode
   */
  const handleDeleteCellsConfirm = () => {
    setShowDeleteDialog(false);
    onDeleteCells?.(deleteMode);
    onStructureChange?.();
  };

  /**
   * Confirm delete sheet
   */
  const handleDeleteSheetConfirm = () => {
    setShowDeleteWarning(false);
    onFormatOperation?.('deleteSheet');
    onStructureChange?.();
  };

  /**
   * Handle insert sheet
   */
  const handleInsertSheet = () => {
    onFormatOperation?.('insertSheet');
    onStructureChange?.();
  };

  /**
   * Confirm row height change
   */
  const handleRowHeightConfirm = () => {
    const height = parseFloat(rowHeightValue);
    if (!isNaN(height) && height > 0 && height <= 409) {
      onFormatOperation?.('rowHeight', height);
      setShowRowHeightDialog(false);
    }
  };

  /**
   * Confirm column width change
   */
  const handleColumnWidthConfirm = () => {
    const width = parseFloat(columnWidthValue);
    if (!isNaN(width) && width > 0 && width <= 255) {
      onFormatOperation?.('columnWidth', width);
      setShowColumnWidthDialog(false);
    }
  };

  // Common styles
  const buttonStyles: React.CSSProperties = {
    border: '1px solid #d0d0d0',
    background: '#fff',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px',
    height: '28px',
    borderRadius: '3px',
    transition: 'all 150ms ease',
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    background: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    minWidth: '220px',
    animation: 'slideDown 200ms ease-out',
  };

  const menuItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    transition: 'background 150ms ease',
  };

  const dialogOverlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 150ms ease-out',
  };

  const dialogStyles: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: '6px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    minWidth: '320px',
    animation: 'scaleUp 200ms ease-out',
  };

  const dialogHeaderStyles: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 600,
  };

  const dialogBodyStyles: React.CSSProperties = {
    padding: '16px',
  };

  const dialogFooterStyles: React.CSSProperties = {
    padding: '12px 16px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  };

  const radioLabelStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '13px',
    cursor: 'pointer',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '8px',
      borderRight: '1px solid #d0d0d0',
    }}>
      {/* Row 1: Insert, Delete, Format */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Insert Dropdown */}
        <div style={{ position: 'relative' }} ref={insertMenuRef}>
          <button
            className="cs-custom-group-button"
            onClick={() => setShowInsertMenu(!showInsertMenu)}
            title="Insert"
          >
            <span>Insert</span>
            <span className="cs-custom-button-dropdown-arrow">▼</span>
          </button>

          {showInsertMenu && (
            <div style={dropdownStyles}>
              {INSERT_OPTIONS.map((option, index) => (
                <div
                  key={option.id}
                  style={{
                    ...menuItemStyles,
                    borderBottom: index === INSERT_OPTIONS.length - 1 ? 'none' : '1px solid #f0f0f0',
                  }}
                  onClick={() => handleInsertOption(option.id)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{option.label}</span>
                    {option.shortcut && (
                      <span style={{ fontSize: '11px', color: '#666', marginLeft: '16px' }}>
                        {option.shortcut}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Dropdown */}
        <div style={{ position: 'relative' }} ref={deleteMenuRef}>
          <button
            className="cs-custom-group-button"
            onClick={() => setShowDeleteMenu(!showDeleteMenu)}
            title="Delete"
          >
            <span>Delete</span>
            <span className="cs-custom-button-dropdown-arrow">▼</span>
          </button>

          {showDeleteMenu && (
            <div style={dropdownStyles}>
              {DELETE_OPTIONS.map((option, index) => (
                <div
                  key={option.id}
                  style={{
                    ...menuItemStyles,
                    borderBottom: index === DELETE_OPTIONS.length - 1 ? 'none' : '1px solid #f0f0f0',
                  }}
                  onClick={() => handleDeleteOption(option.id)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{option.label}</span>
                    {option.shortcut && (
                      <span style={{ fontSize: '11px', color: '#666', marginLeft: '16px' }}>
                        {option.shortcut}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Format Dropdown */}
        <div style={{ position: 'relative' }} ref={formatMenuRef}>
          <button
            className="cs-custom-group-button"
            style={{ minWidth: '90px' }}
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            title="Format"
          >
            <span>Format</span>
            <span className="cs-custom-button-dropdown-arrow">▼</span>
          </button>

          {showFormatMenu && (
            <div style={dropdownStyles}>
              {FORMAT_OPTIONS.map((option, index) => (
                <div
                  key={option.id}
                  style={{
                    ...menuItemStyles,
                    padding: '6px 12px',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    borderBottom: option.separator ? '2px solid #e0e0e0' : '1px solid #f0f0f0',
                  }}
                  onClick={() => handleFormatOption(option.id)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
                  }}
                >
                  <span>{option.label}</span>
                  {option.submenu && <span>▶</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insert Cells Dialog */}
      {showInsertDialog && (
        <div style={dialogOverlayStyles} onClick={() => setShowInsertDialog(false)}>
          <div style={dialogStyles} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div style={dialogHeaderStyles}>
              <span>Insert</span>
              <button
                onClick={() => setShowInsertDialog(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <div style={dialogBodyStyles}>
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
            </div>
            <div style={dialogFooterStyles}>
              <button
                onClick={handleInsertCellsConfirm}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #2196f3',
                  background: '#2196f3',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                OK
              </button>
              <button
                onClick={() => setShowInsertDialog(false)}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #d0d0d0',
                  background: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cells Dialog */}
      {showDeleteDialog && (
        <div style={dialogOverlayStyles} onClick={() => setShowDeleteDialog(false)}>
          <div style={dialogStyles} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div style={dialogHeaderStyles}>
              <span>Delete</span>
              <button
                onClick={() => setShowDeleteDialog(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <div style={dialogBodyStyles}>
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
            </div>
            <div style={dialogFooterStyles}>
              <button
                onClick={handleDeleteCellsConfirm}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #2196f3',
                  background: '#2196f3',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                OK
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #d0d0d0',
                  background: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sheet Warning Dialog */}
      {showDeleteWarning && (
        <div style={dialogOverlayStyles} onClick={() => setShowDeleteWarning(false)}>
          <div style={{ ...dialogStyles, minWidth: '400px' }} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div style={dialogHeaderStyles}>
              <span>⚠️ Microsoft Excel</span>
              <button
                onClick={() => setShowDeleteWarning(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ ...dialogBodyStyles, textAlign: 'center', padding: '24px 32px' }}>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                This sheet contains data. Deleting it will permanently remove all data. This action cannot be undone.
              </p>
            </div>
            <div style={dialogFooterStyles}>
              <button
                onClick={handleDeleteSheetConfirm}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #d32f2f',
                  background: '#d32f2f',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteWarning(false)}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #d0d0d0',
                  background: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Height Dialog */}
      {showRowHeightDialog && (
        <div style={dialogOverlayStyles} onClick={() => setShowRowHeightDialog(false)}>
          <div style={dialogStyles} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div style={dialogHeaderStyles}>
              <span>Row Height</span>
              <button
                onClick={() => setShowRowHeightDialog(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <div style={dialogBodyStyles}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px' }}>Row height:</label>
                <input
                  type="number"
                  value={rowHeightValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRowHeightValue(e.target.value)}
                  min="0"
                  max="409"
                  step="0.5"
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d0d0d0',
                    borderRadius: '3px',
                    fontSize: '13px',
                    width: '80px',
                  }}
                />
              </div>
            </div>
            <div style={dialogFooterStyles}>
              <button
                onClick={handleRowHeightConfirm}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #2196f3',
                  background: '#2196f3',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                OK
              </button>
              <button
                onClick={() => setShowRowHeightDialog(false)}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #d0d0d0',
                  background: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Width Dialog */}
      {showColumnWidthDialog && (
        <div style={dialogOverlayStyles} onClick={() => setShowColumnWidthDialog(false)}>
          <div style={dialogStyles} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div style={dialogHeaderStyles}>
              <span>Column Width</span>
              <button
                onClick={() => setShowColumnWidthDialog(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <div style={dialogBodyStyles}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px' }}>Column width:</label>
                <input
                  type="number"
                  value={columnWidthValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColumnWidthValue(e.target.value)}
                  min="0"
                  max="255"
                  step="0.01"
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d0d0d0',
                    borderRadius: '3px',
                    fontSize: '13px',
                    width: '80px',
                  }}
                />
              </div>
            </div>
            <div style={dialogFooterStyles}>
              <button
                onClick={handleColumnWidthConfirm}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #2196f3',
                  background: '#2196f3',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                OK
              </button>
              <button
                onClick={() => setShowColumnWidthDialog(false)}
                style={{
                  padding: '6px 20px',
                  border: '1px solid #d0d0d0',
                  background: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes scaleUp {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};
