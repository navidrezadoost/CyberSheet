import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadXlsxFromUrl } from '../packages/io-xlsx/src';
import { SheetTabs } from '../packages/react/src/SheetTabs';

type CellAddress = { row: number; col: number };
type Range = { start: CellAddress; end: CellAddress };

type CommentData = { text: string; author: string; date: string };

type WorkbookLike = any;
type WorksheetLike = any;

const DEFAULT_URL = '/api/uploads/APRIL%202025%20END%20EDIT%2011-02-1404_3e5401bdea354b0784b4968da3caed23.xlsx';

function colToLetter(col: number): string {
  let letter = '';
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode(65 + (c % 26)) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

function cellAddress(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`;
}

function keyFromCell(row: number, col: number): string {
  return `${row},${col}`;
}

type FilterState = Map<number, Set<string>>;

type ExcelReactViewerProps = {
  url?: string;
};

export const ExcelReactViewer = ({ url = DEFAULT_URL }: ExcelReactViewerProps) => {
  const [workbook, setWorkbook] = useState(null as any);
  const [activeSheetName, setActiveSheetName] = useState(null as any);
  const [sheet, setSheet] = useState(null as any);
  const [status, setStatus] = useState('Ready' as string);
  const [selectedCell, setSelectedCell] = useState(null as any);
  const [selectedRange, setSelectedRange] = useState(null as any);
  const [clipboard, setClipboard] = useState(null as any);
  const [filterState, setFilterState] = useState(new Map() as FilterState);
  const [activeFilters, setActiveFilters] = useState(new Set() as Set<number>);
  const [isFilterMode, setIsFilterMode] = useState(false as boolean);
  const [comments, setComments] = useState(new Map() as Map<string, CommentData>);
  const [commentTooltip, setCommentTooltip] = useState(null as any);
  const [contextMenu, setContextMenu] = useState(null as any);
  const [filterDropdown, setFilterDropdown] = useState(null as any);
  const [colWidths, setColWidths] = useState<number[]>([]);

  const gridContainerRef = useRef(null as any);

  // Load workbook
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('Loading Excel file...');
        const wb = await loadXlsxFromUrl(url);
        if (cancelled) return;
        setWorkbook(wb);
        const names = wb.getSheetNames ? wb.getSheetNames() : [];
        const first = names[0] ?? null;
        setActiveSheetName(first);
        setSheet(first ? wb.getSheet(first) : wb.activeSheet);
        setStatus('Ready');
      } catch (err) {
        console.error('Error loading Excel file', err);
        if (!cancelled) setStatus('Error loading file');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!workbook) return;
    const next = activeSheetName ? workbook.getSheet(activeSheetName) : workbook.activeSheet;
    setSheet(next);
    setSelectedCell(null);
    setSelectedRange(null);
    setFilterState(new Map());
    setActiveFilters(new Set());
    setComments(new Map());
  }, [workbook, activeSheetName]);

  const rowCount = sheet?.rowCount ?? 50;
  const colCount = sheet?.colCount ?? 26;

  const filteredRows = useMemo(() => {
    if (!sheet) return [] as number[];
    const rows: number[] = [];
    for (let row = 0; row < rowCount; row++) {
      let visible = true;
      for (const col of activeFilters) {
        const allowed = filterState.get(col);
        if (!allowed) continue;
        const cell = sheet.getCell({ row, col });
        const value = cell && cell.value !== undefined ? String(cell.value) : '';
        if (!allowed.has(value)) {
          visible = false;
          break;
        }
      }
      if (visible) rows.push(row);
    }
    return rows;
  }, [sheet, rowCount, activeFilters, filterState]);

  // Auto-size columns: widest between header label and visible cell contents
  useEffect(() => {
    if (!sheet) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Match grid font from CSS
      ctx.font = "11px Calibri, 'Segoe UI', sans-serif";
      const padding = 12; // total left+right padding/border cushion
      const minWidth = 48; // minimum column width in px
      const widths: number[] = new Array(colCount).fill(minWidth);
      for (let c = 0; c < colCount; c++) {
        // include header letter width
        let maxW = ctx.measureText(colToLetter(c)).width;
        for (let i = 0; i < filteredRows.length; i++) {
          const r = filteredRows[i];
          const cell = sheet.getCell({ row: r, col: c });
          const text = cell && cell.value !== undefined ? String(cell.value) : '';
          if (text) {
            const w = ctx.measureText(text).width;
            if (w > maxW) maxW = w;
          }
        }
        widths[c] = Math.max(minWidth, Math.ceil(maxW + padding));
      }
      setColWidths(widths);
    } catch {}
  }, [sheet, colCount, filteredRows]);

  const cellInfoText = useMemo(() => {
    if (!sheet || !selectedRange) return '';
    const { start, end } = selectedRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    let sum = 0;
    let count = 0;
    let numCount = 0;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = sheet.getCell({ row: r, col: c });
        if (cell && cell.value !== undefined) {
          count++;
          const n = parseFloat(String(cell.value));
          if (!isNaN(n)) {
            sum += n;
            numCount++;
          }
        }
      }
    }
    if (count === 0) return '';
    const avg = numCount > 0 ? sum / numCount : 0;
    return `Count: ${count} | Sum: ${sum.toFixed(2)} | Average: ${avg.toFixed(2)}`;
  }, [sheet, selectedRange]);

  const formulaValue = useMemo(() => {
    if (!sheet || !selectedCell) return '';
    const cell = sheet.getCell(selectedCell);
    return cell ? (cell.formula || cell.value || '') : '';
  }, [sheet, selectedCell]);

  const handleSelectCell = (row: number, col: number, shiftKey: boolean) => {
    if (!sheet) return;
    if (shiftKey && selectedCell) {
      setSelectedRange({ start: selectedCell, end: { row, col } });
      setSelectedCell(selectedCell);
    } else {
      setSelectedCell({ row, col });
      setSelectedRange(null);
    }
  };

  const getRangeCells = (start: CellAddress, end: CellAddress): CellAddress[] => {
    const cells: CellAddress[] = [];
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  };

  const setCellValue = (row: number, col: number, value: string) => {
    if (!sheet) return;
    const cell = sheet.getCell({ row, col }) || {};
    if (value.startsWith('=')) {
      cell.formula = value;
      cell.value = value;
    } else {
      cell.value = value;
      delete cell.formula;
    }
    sheet.setCell({ row, col }, cell);
  };

  const applyFormatting = (property: 'bold' | 'italic' | 'underline', value: boolean) => {
    if (!sheet) return;
    if (!selectedCell && !selectedRange) return;
    const targets = selectedRange ? getRangeCells(selectedRange.start, selectedRange.end) : [selectedCell!];
    targets.forEach(addr => {
      const cell = sheet.getCell(addr) || {};
      cell.style = cell.style || {};
      (cell.style as any)[property] = value;
      sheet.setCell(addr, cell);
    });
    setStatus('Formatting applied');
  };

  const copyCells = () => {
    if (!sheet) return;
    if (!selectedCell && !selectedRange) return;
    const cells = selectedRange ? getRangeCells(selectedRange.start, selectedRange.end) : [selectedCell!];
    const minRow = Math.min(...cells.map(c => c.row));
    const maxRow = Math.max(...cells.map(c => c.row));
    const minCol = Math.min(...cells.map(c => c.col));
    const maxCol = Math.max(...cells.map(c => c.col));
    const data: any[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowArr: any[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const cell = sheet.getCell({ row: r, col: c });
        rowArr.push(cell ? { ...cell } : {});
      }
      data.push(rowArr);
    }
    setClipboard(data);
    setStatus(`Copied ${cells.length} cell(s)`);
  };

  const clearCellContents = () => {
    if (!sheet) return;
    if (!selectedCell && !selectedRange) return;
    const cells = selectedRange ? getRangeCells(selectedRange.start, selectedRange.end) : [selectedCell!];
    cells.forEach(addr => {
      sheet.setCell(addr, {});
    });
    setStatus(`Cleared ${cells.length} cell(s)`);
  };

  const pasteCells = () => {
    if (!sheet || !clipboard || !selectedCell) return;
    clipboard.forEach((row: any[], rIdx: number) => {
      row.forEach((cell: any, cIdx: number) => {
        const targetRow = selectedCell.row + rIdx;
        const targetCol = selectedCell.col + cIdx;
        if (cell.value !== undefined || cell.formula !== undefined) {
          sheet.setCell({ row: targetRow, col: targetCol }, { ...cell });
          setCellValue(targetRow, targetCol, cell.formula || cell.value || '');
        }
      });
    });
    setStatus(`Pasted ${clipboard.length} row(s)`);
  };

  const insertComment = () => {
    if (!sheet || !selectedCell) return;
    const text = window.prompt('Enter comment:');
    if (!text) return;
    const comment: CommentData = { text, author: 'User', date: new Date().toISOString() };
    const cell = sheet.getCell(selectedCell) || {};
    (cell as any).comment = comment;
    sheet.setCell(selectedCell, cell);
  setComments((prev: Map<string, CommentData>) => {
      const next = new Map<string, CommentData>(prev);
      next.set(keyFromCell(selectedCell.row, selectedCell.col), comment);
      return next;
    });
    setStatus('Comment added');
  };

  const deleteComment = () => {
    if (!sheet || !selectedCell) return;
    const key = keyFromCell(selectedCell.row, selectedCell.col);
    const cell = sheet.getCell(selectedCell);
    if (cell) {
      delete (cell as any).comment;
      sheet.setCell(selectedCell, cell);
    }
    setComments(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    setStatus('Comment deleted');
  };

  const toggleFilter = () => {
  setIsFilterMode((f: boolean) => !f);
    if (isFilterMode) {
      setFilterState(new Map());
      setActiveFilters(new Set());
    }
  };

  const showFilterForColumn = (col: number, headerEl: HTMLDivElement | null) => {
    if (!sheet || !headerEl) return;
    const rect = headerEl.getBoundingClientRect();
    setFilterDropdown({ visible: true, col, x: rect.left, y: rect.bottom });
  };

  const applyFilterFromDropdown = (col: number, allowed: Set<string>) => {
  setFilterState((prev: FilterState) => {
      const next = new Map(prev);
      next.set(col, allowed);
      return next;
    });
  setActiveFilters((prev: Set<number>) => new Set(prev).add(col));
    setFilterDropdown(null);
    setStatus(`Filter applied to column ${colToLetter(col)}`);
  };

  const clearFilterFromDropdown = (col: number) => {
  setFilterState((prev: FilterState) => {
      const next = new Map(prev);
      next.delete(col);
      return next;
    });
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.delete(col);
      return next;
    });
    setFilterDropdown(null);
    setStatus(`Filter cleared from column ${colToLetter(col)}`);
  };

  const sortByColumn = (col: number, ascending: boolean) => {
    if (!sheet) return;
    const rows: any[] = [];
    for (let row = 1; row < rowCount; row++) {
      const rowData: any = { index: row, cells: [] };
      for (let c = 0; c < colCount; c++) {
        const cell = sheet.getCell({ row, col: c });
        rowData.cells.push(cell);
      }
      rows.push(rowData);
    }
    rows.sort((a, b) => {
      const cellA = a.cells[col];
      const cellB = b.cells[col];
      const valueA = cellA && cellA.value !== undefined ? String(cellA.value) : '';
      const valueB = cellB && cellB.value !== undefined ? String(cellB.value) : '';
      const numA = parseFloat(valueA);
      const numB = parseFloat(valueB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return ascending ? numA - numB : numB - numA;
      }
      return ascending ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });
    rows.forEach((row, newIndex) => {
      for (let c = 0; c < colCount; c++) {
        sheet.setCell({ row: newIndex + 1, col: c }, row.cells[c] || {});
      }
    });
    setStatus(`Sorted column ${colToLetter(col)} ${ascending ? 'A→Z' : 'Z→A'}`);
  };

  const handleContextMenuAction = (action: string) => {
    switch (action) {
      case 'cut':
        copyCells();
        clearCellContents();
        break;
      case 'copy':
        copyCells();
        break;
      case 'paste':
        pasteCells();
        break;
      case 'insert-comment':
        insertComment();
        break;
      case 'delete-comment':
        deleteComment();
        break;
      case 'clear-contents':
        clearCellContents();
        break;
    }
    setContextMenu(null);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!sheet) return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            copyCells();
            break;
          case 'x':
            e.preventDefault();
            copyCells();
            clearCellContents();
            break;
          case 'v':
            e.preventDefault();
            pasteCells();
            break;
          case 'b':
            e.preventDefault();
            applyFormatting('bold', true);
            break;
          case 'i':
            e.preventDefault();
            applyFormatting('italic', true);
            break;
          case 'u':
            e.preventDefault();
            applyFormatting('underline', true);
            break;
        }
      }
      if (e.key === 'Delete') {
        clearCellContents();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sheet, selectedCell, selectedRange, clipboard]);

  const renderFilterDropdown = () => {
    if (!sheet || !filterDropdown || !filterDropdown.visible) return null;
    const col = filterDropdown.col;
    const values = new Set<string>();
    for (let row = 0; row < rowCount; row++) {
      const cell = sheet.getCell({ row, col });
      if (cell && cell.value !== undefined) values.add(String(cell.value));
    }
    const current = filterState.get(col) ?? new Set(values);
    const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(current));
    const allSelected = localSelection.size === values.size;
    const onToggleAll = () => {
      if (allSelected) setLocalSelection(new Set());
      else setLocalSelection(new Set(values));
    };
    const onToggleValue = (value: string) => {
      setLocalSelection(prev => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value); else next.add(value);
        return next;
      });
    };
    return (
      <div
        className="filter-dropdown visible"
        style={{ position: 'fixed', left: filterDropdown.x, top: filterDropdown.y }}
      >
        <div className="filter-header">{`Filter - Column ${colToLetter(col)}`}</div>
        <div className="filter-options">
          <div className="filter-option" onClick={onToggleAll}>
            <input type="checkbox" className="filter-checkbox" checked={allSelected} readOnly />
            <span>(Select All)</span>
          </div>
          {Array.from(values)
            .sort()
            .map(v => (
              <div key={v} className="filter-option" onClick={() => onToggleValue(v)}>
                <input type="checkbox" className="filter-checkbox" checked={localSelection.has(v)} readOnly />
                <span>{v}</span>
              </div>
            ))}
        </div>
        <div className="filter-actions">
          <button className="filter-btn" onClick={() => clearFilterFromDropdown(col)}>Clear</button>
          <button className="filter-btn primary" onClick={() => applyFilterFromDropdown(col, localSelection)}>OK</button>
        </div>
      </div>
    );
  };

  const renderCommentTooltip = () => {
    if (!commentTooltip || !commentTooltip.visible) return null;
    const key = keyFromCell(commentTooltip.row, commentTooltip.col);
    const comment = comments.get(key);
    if (!comment) return null;
    return (
      <div className="comment-tooltip visible" style={{ position: 'fixed', left: commentTooltip.col, top: commentTooltip.row }}>
        <div className="comment-author">{comment.author}:</div>
        <div>{comment.text}</div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu || !contextMenu.visible) return null;
    return (
      <div
        className="context-menu visible"
        style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
      >
        <div className="context-menu-item" onClick={() => handleContextMenuAction('cut')}>✂️ Cut</div>
        <div className="context-menu-item" onClick={() => handleContextMenuAction('copy')}>📋 Copy</div>
        <div className="context-menu-item" onClick={() => handleContextMenuAction('paste')}>📄 Paste</div>
        <div className="context-menu-divider" />
        <div className="context-menu-item" onClick={() => handleContextMenuAction('insert-comment')}>💬 Insert Comment</div>
        <div className="context-menu-item" onClick={() => handleContextMenuAction('delete-comment')}>🗑️ Delete Comment</div>
        <div className="context-menu-divider" />
        <div className="context-menu-item" onClick={() => handleContextMenuAction('clear-contents')}>🗑️ Clear Contents</div>
      </div>
    );
  };

  const sheetNames: string[] = useMemo(
    () => (workbook && workbook.getSheetNames ? workbook.getSheetNames() : []),
    [workbook]
  );

  const handleGridContextMenu: React.MouseEventHandler<HTMLTableElement> = e => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const rowAttr = target.getAttribute('data-row');
    const colAttr = target.getAttribute('data-col');
    if (rowAttr && colAttr) {
      const row = parseInt(rowAttr, 10);
      const col = parseInt(colAttr, 10);
      handleSelectCell(row, col, false);
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    }
  };

  const handleCellMouseOver = (row: number, col: number, ev: React.MouseEvent) => {
    const key = keyFromCell(row, col);
    if (!comments.has(key)) return;
    setCommentTooltip({ visible: true, row: ev.clientY, col: ev.clientX });
  };

  const handleCellMouseOut = () => {
    setCommentTooltip(null);
  };

  if (!sheet) {
    return <div style={{ padding: 16 }}>Loading workbook... ({status})</div>;
  }

  return (
    <div className="container" ref={gridContainerRef}
      onClick={e => {
        const target = e.target as HTMLElement;
        if (!target.closest('.context-menu')) setContextMenu(null);
        if (!target.closest('.filter-dropdown') && !target.closest('.filter-icon')) setFilterDropdown(null);
      }}
    >
      <div className="title-bar">
        <span>{activeSheetName || 'Workbook'} - Excel</span>
        <div className="title-bar-buttons">
          <button className="title-btn">_</button>
          <button className="title-btn">☐</button>
          <button className="title-btn">✕</button>
        </div>
      </div>

      <div className="menu-bar">
        <div className="menu-item">File</div>
        <div className="menu-item">Home</div>
        <div className="menu-item">Insert</div>
        <div className="menu-item">Page Layout</div>
        <div className="menu-item">Formulas</div>
        <div className="menu-item">Data</div>
        <div className="menu-item">Review</div>
        <div className="menu-item">View</div>
      </div>

      <div className="ribbon">
        <div className="ribbon-tabs">
          <button className="ribbon-tab active">Home</button>
          <button className="ribbon-tab">Insert</button>
          <button className="ribbon-tab">Data</button>
        </div>
        <div className="ribbon-content">
          <div className="ribbon-group">
            <div className="ribbon-buttons">
              <button className="ribbon-btn large" onClick={pasteCells}>
                <span className="icon">📋</span>
                <span>Paste</span>
              </button>
            </div>
            <div className="ribbon-group-label">Clipboard</div>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-buttons">
              <button className="ribbon-btn" onClick={() => applyFormatting('bold', true)}>𝐁</button>
              <button className="ribbon-btn" onClick={() => applyFormatting('italic', true)}><i>I</i></button>
              <button className="ribbon-btn" onClick={() => applyFormatting('underline', true)}><u>U</u></button>
            </div>
            <div className="ribbon-group-label">Font</div>
          </div>
          <div className="ribbon-group">
            <div className="ribbon-buttons">
              <button className="ribbon-btn" onClick={toggleFilter}>Filter</button>
              <button className="ribbon-btn" onClick={() => sortByColumn(selectedCell ? selectedCell.col : 0, true)}>Sort A→Z</button>
              <button className="ribbon-btn" onClick={() => sortByColumn(selectedCell ? selectedCell.col : 0, false)}>Sort Z→A</button>
            </div>
            <div className="ribbon-group-label">Data</div>
          </div>
        </div>
      </div>

      <div className="formula-bar-container">
        <div className="name-box">{selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : ''}</div>
        <button className="ribbon-btn" style={{ padding: '2px 6px' }}>ƒₓ</button>
        <div className="formula-input-wrapper">
          <input
            type="text"
            className="formula-input"
            value={formulaValue}
            onChange={e => {
              if (selectedCell) setCellValue(selectedCell.row, selectedCell.col, e.target.value);
            }}
          />
        </div>
      </div>

      <div className="spreadsheet-container">
        <div className="grid-wrapper">
          <div className="grid-container">
            <div className="row-numbers">
              {filteredRows.map(row => (
                <div key={row} className="row-number">{row + 1}</div>
              ))}
            </div>
            <div className="grid-header">
              {Array.from({ length: colCount }).map((_, col) => (
                <div
                  key={col}
                  className="grid-header-cell"
                  data-col={col}
                  style={{ position: 'relative', width: (colWidths[col] ?? 64) + 'px' }}
                  ref={el => {
                    // no-op, used only for filter positioning via event target
                  }}
                >
                  {colToLetter(col)}
                  {isFilterMode && (
                    <span
                      className="filter-icon"
                      onClick={e => {
                        e.stopPropagation();
                        showFilterForColumn(col, e.currentTarget.parentElement as HTMLDivElement);
                      }}
                    >
                      ▼
                    </span>
                  )}
                </div>
              ))}
            </div>
            <table className="grid-table" style={{ tableLayout: 'fixed' }} onContextMenu={handleGridContextMenu}>
              <colgroup>
                {Array.from({ length: colCount }).map((_, col) => (
                  <col key={col} style={{ width: (colWidths[col] ?? 64) + 'px' }} />
                ))}
              </colgroup>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row}>
                    {Array.from({ length: colCount }).map((_, col) => {
                      const cell = sheet.getCell({ row, col });
                      const key = keyFromCell(row, col);
                      const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
                      let inRange = false;
                      if (selectedRange) {
                        const { start, end } = selectedRange;
                        const minRow = Math.min(start.row, end.row);
                        const maxRow = Math.max(start.row, end.row);
                        const minCol = Math.min(start.col, end.col);
                        const maxCol = Math.max(start.col, end.col);
                        inRange = row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
                      }
                      const hasComment = comments.has(key) || cell?.comment;
                      const style: React.CSSProperties = {};
                      if (cell?.style?.bold) style.fontWeight = 'bold';
                      if (cell?.style?.italic) style.fontStyle = 'italic';
                      if (cell?.style?.underline) style.textDecoration = 'underline';
                      if (cell?.style?.color) style.color = cell.style.color;
                      if (cell?.style?.backgroundColor) style.backgroundColor = cell.style.backgroundColor;
                      return (
                        <td
                          key={col}
                          className={`grid-cell${isSelected ? ' selected' : ''}${inRange ? ' in-range' : ''}`}
                          data-row={row}
                          data-col={col}
                          style={style}
                          onClick={e => handleSelectCell(row, col, e.shiftKey)}
                          onMouseOver={e => handleCellMouseOver(row, col, e)}
                          onMouseOut={handleCellMouseOut}
                        >
                          {cell?.value ?? ''}
                          {hasComment && <div className="comment-indicator" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Excel-style sheet tabs */}
      <SheetTabs
        sheets={sheetNames}
        activeSheet={activeSheetName || ''}
        onSheetChange={setActiveSheetName}
        onAddSheet={() => {
          const newName = `Sheet${sheetNames.length + 1}`;
          workbook?.addSheet(newName);
          setActiveSheetName(newName);
        }}
        onRenameSheet={(oldName, newName) => {
          // TODO: Implement rename in core
          console.log('Rename', oldName, 'to', newName);
        }}
        onDeleteSheet={(sheetName) => {
          // TODO: Implement delete in core
          console.log('Delete', sheetName);
        }}
      />

      <div className="status-bar">
        <div className="status-left">
          <span>{status}</span>
        </div>
        <div className="status-right">
          <span>|</span>
          <span>{cellInfoText}</span>
        </div>
      </div>

      {renderFilterDropdown()}
      {renderContextMenu()}
      {renderCommentTooltip()}
    </div>
  );
};

// Simple mount helper so you can run this directly via Vite in /examples
const mountNode = document.getElementById('root');
if (mountNode) {
  const root = createRoot(mountNode);
  root.render(<ExcelReactViewer />);
}
