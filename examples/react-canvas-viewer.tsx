import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { loadXlsxFromUrl } from '../packages/io-xlsx/src';
import { CyberSheet } from '../packages/react/src';
import { FormulaBar } from '../packages/react/src/FormulaBar';
import { SheetTabs } from '../packages/react/src/SheetTabs';
import { useFormulaController } from '../packages/react/src/useFormulaController';
import type { Address } from '../packages/core/src/types';

const DEFAULT_URL = '/api/uploads/APRIL%202025%20END%20EDIT%2011-02-1404_3e5401bdea354b0784b4968da3caed23.xlsx';

export const ReactCanvasViewer = ({ url = DEFAULT_URL }: { url?: string }) => {
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetName, setSheetName] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState('Ready');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fontFamily, setFontFamily] = useState<string>('Segoe UI, Arial, sans-serif');
  const [fontSize, setFontSize] = useState<number>(11);
  const [filterMenu, setFilterMenu] = useState<{ col: number; x: number; y: number; values: Array<{ value: string; count: number }>; apply: (sel: string[]) => void; clear: () => void } | null>(null);
  const [filterSel, setFilterSel] = useState<Set<string>>(new Set());
  const [filterSearch, setFilterSearch] = useState('');
  const rendererRef = useRef<any>(null);
  const [scroll, setScroll] = useState({ x: 0, y: 0, maxX: 0, maxY: 0 });
  const [headerIcons, setHeaderIcons] = useState<Array<{ col: number; x: number; w: number }>>([]);
  
  // Formula editing state
  const [selectedCell, setSelectedCell] = useState<Address | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [, forceUpdate] = useState({});

  // Get active worksheet for formula controller
  const activeSheet = sheetName && workbook ? workbook.getSheet(sheetName) : undefined;
  
  // Use formula controller hook - MUST be called before any conditional returns
  const formulaController = useFormulaController({
    worksheet: activeSheet,
    selectedCell: selectedCell || { row: 1, col: 1 },
  });

  // Reset scroll when sheet changes to prevent duplicate scrollbars
  useEffect(() => {
    console.log('🔄 Sheet changed to:', sheetName);
    if (rendererRef.current) {
      // Reset scroll position and state when switching sheets
      rendererRef.current.setScroll?.(0, 0);
      setScroll({ x: 0, y: 0, maxX: 0, maxY: 0 });
      
      // Force recalculation after a brief delay to let renderer update
      setTimeout(() => {
        if (rendererRef.current) {
          const { x, y } = rendererRef.current.getScroll?.() ?? { x: 0, y: 0 };
          const max = rendererRef.current.getMaxScroll?.() ?? { x: 0, y: 0 };
          setScroll({ x, y, maxX: max.x, maxY: max.y });
        }
      }, 50);
    }
  }, [sheetName]);

  // Memoize scrollbar calculations to prevent blinking
  // MUST be at top level before any conditional returns (Rules of Hooks)
  const verticalScrollbarStyle = useMemo(() => {
    const track = rendererRef.current?.canvas?.parentElement as HTMLElement;
    const trackH = track ? (track.clientHeight - 24 - 16) : 200;
    const vpH = rendererRef.current?.getViewportSize?.().height || 0;
    const contentH = scroll.maxY + vpH;
    const thumbH = Math.max(24, contentH > 0 ? (vpH / contentH) * trackH : trackH);
    const topPx = contentH > 0 && scroll.maxY > 0 ? (scroll.y / scroll.maxY) * (trackH - thumbH) : 0;
    return { 
      position: 'absolute' as const, 
      left: 1, 
      width: 8, 
      borderRadius: 4, 
      background: 'rgba(0,0,0,0.25)', 
      height: thumbH + 'px', 
      top: Math.max(0, topPx) + 'px' 
    };
  }, [scroll.y, scroll.maxY]);

  const horizontalScrollbarStyle = useMemo(() => {
    const track = rendererRef.current?.canvas?.parentElement as HTMLElement;
    const trackW = track ? (track.clientWidth - 48 - 16) : 300;
    const vpW = rendererRef.current?.getViewportSize?.().width || 0;
    const contentW = scroll.maxX + vpW;
    const thumbW = Math.max(24, contentW > 0 ? (vpW / contentW) * trackW : trackW);
    const leftPx = contentW > 0 && scroll.maxX > 0 ? (scroll.x / scroll.maxX) * (trackW - thumbW) : 0;
    return { 
      position: 'absolute' as const, 
      top: 1, 
      height: 8, 
      borderRadius: 4, 
      background: 'rgba(0,0,0,0.25)', 
      width: thumbW + 'px', 
      left: Math.max(0, leftPx) + 'px' 
    };
  }, [scroll.x, scroll.maxX]);

  const recomputeHeaderIcons = () => {
    const r = rendererRef.current;
    if (!r) return;
    try {
      const opts = r.optionsReadonly ?? { headerWidth: 48, headerHeight: 24 };
      const headerWidth = opts.headerWidth;
      const headerHeight = opts.headerHeight;
      const vp = r.getViewportSize?.() || { width: 0, height: 0 };
      const { x: sx } = r.getScroll();
      const sheet = r.sheetReadonly;
      const zoom = typeof r.getZoom === 'function' ? r.getZoom() : 1;
      const icons: Array<{ col: number; x: number; w: number }> = [];
      let col = 1;
      let x = headerWidth - sx;
      // Skip off-screen columns to the left
      while (col <= sheet.colCount) {
        const cw = sheet.getColumnWidth(col) * zoom;
        if (x + cw > headerWidth) break;
        x += cw; col++;
      }
      const limit = headerWidth + vp.width;
      while (col <= sheet.colCount && x < limit) {
        const cw = sheet.getColumnWidth(col) * zoom;
        icons.push({ col, x, w: cw });
        x += cw; col++;
      }
      setHeaderIcons(icons);
    } catch {}
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('Loading Excel file...');
      setLoadError(null);
      setLoadAttempted(true);
      
      try {
        const wb = await loadXlsxFromUrl(url);
        if (cancelled) return;
        
        setWorkbook(wb);
        const names = wb.getSheetNames ? wb.getSheetNames() : [];
        setSheetName(names[0]);
        setStatus('Ready');
      } catch (err) {
        if (!cancelled) {
          setStatus('Error loading file');
          setLoadError(err instanceof Error ? err.message : 'Failed to load Excel file');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Close filter menu when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!filterMenu) return;
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setFilterMenu(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [filterMenu]);

  if (loadError) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
        <h2 style={{ color: '#d32f2f', marginBottom: 16 }}>❌ Failed to Load Excel File</h2>
        <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', padding: 16, borderRadius: 4, marginBottom: 16 }}>
          <strong>File:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>{url}</code>
        </div>
        <div style={{ background: '#ffebee', border: '1px solid #ef5350', padding: 16, borderRadius: 4, marginBottom: 16 }}>
          <strong>Error:</strong> {loadError}
        </div>
        
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Troubleshooting:</h3>
          <ol style={{ marginBottom: 8, paddingLeft: 20, lineHeight: 1.6 }}>
            <li>Check if backend server is running: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>http://192.168.100.60:4008</code></li>
            <li>Verify the file exists at the upload path</li>
            <li>Check browser console for network errors (F12)</li>
            <li>Or copy your Excel file to <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>public/</code> folder and update URL</li>
          </ol>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              background: '#1976d2', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: 4, 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            🔄 Retry
          </button>
          <button 
            onClick={() => window.location.href = '/examples/test-colors.html'} 
            style={{ 
              background: '#4caf50', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: 4, 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            ✅ View Working Test Page
          </button>
        </div>
      </div>
    );
  }

  if (!workbook) {
    return (
      <div style={{ padding: 16, textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 18, marginBottom: 8 }}>⏳ {status}</div>
        {loadAttempted && <div style={{ fontSize: 14, color: '#666' }}>Fetching Excel file from server...</div>}
      </div>
    );
  }

  // Handle formula submission
  const handleFormulaSubmit = (formula: string) => {
    if (!selectedCell || !activeSheet) return;

    if (!formula.trim()) {
      activeSheet.setCellValue(selectedCell, null);
      setValidationError(undefined);
      return;
    }

    if (!formula.startsWith('=')) {
      const num = parseFloat(formula);
      activeSheet.setCellValue(selectedCell, !isNaN(num) ? num : formula);
      setValidationError(undefined);
      return;
    }

    if (formulaController) {
      const validation = formulaController.validateFormula(formula);
      if (!validation.isValid) {
        setValidationError(validation.error);
        return;
      }

      const result = formulaController.setFormula(formula);
      if (result.success) {
        setValidationError(undefined);
        // Force canvas to redraw to display the calculated value
        if (rendererRef.current) {
          rendererRef.current.redraw();
        }
        const updatedValue = activeSheet.getCellValue(selectedCell);
        console.log('Formula submitted:', formula);
        console.log('Selected cell:', selectedCell);
        console.log('Calculated value:', updatedValue);
        
        // Also log the values from the referenced cells for debugging
        const cellsInFormula = formula.match(/[A-Z]+\d+/g) || [];
        cellsInFormula.forEach(cellRef => {
          const addr = parseCellRef(cellRef);
          const val = activeSheet.getCellValue(addr);
          console.log(`Cell ${cellRef} (${addr.row},${addr.col}):`, val);
        });
      } else {
        setValidationError(result.error);
      }
    }
  };

  // Helper to parse cell references like "A5" -> {row: 5, col: 1}
  const parseCellRef = (ref: string): Address => {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return { row: 1, col: 1 };
    const colStr = match[1].toUpperCase();
    const rowStr = match[2];
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
    }
    const row = parseInt(rowStr, 10);
    return { row, col };
  };

  // Sheet management handlers
  const handleAddSheet = () => {
    if (!workbook) return;
    const names = workbook.getSheetNames ? workbook.getSheetNames() : [];
    let counter = 1;
    let newName = `Sheet${counter}`;
    while (names.includes(newName)) {
      counter++;
      newName = `Sheet${counter}`;
    }
    workbook.addSheet(newName);
    setSheetName(newName);
    forceUpdate({});
  };

  const handleRenameSheet = (oldName: string, newName: string) => {
    if (!workbook || !newName || oldName === newName) return;
    const names = workbook.getSheetNames ? workbook.getSheetNames() : [];
    if (names.includes(newName)) {
      alert(`A sheet named "${newName}" already exists.`);
      return;
    }
    // If workbook has renameSheet method, use it
    if (typeof workbook.renameSheet === 'function') {
      workbook.renameSheet(oldName, newName);
    } else {
      // Fallback: recreate sheet with new name (lose data for now)
      console.warn('Workbook.renameSheet not implemented, skipping rename');
    }
    setSheetName(newName);
    forceUpdate({});
  };

  const handleDeleteSheet = (name: string) => {
    if (!workbook) return;
    const names = workbook.getSheetNames ? workbook.getSheetNames() : [];
    if (names.length <= 1) {
      alert('Cannot delete the last sheet.');
      return;
    }
    // If workbook has deleteSheet method, use it
    if (typeof workbook.deleteSheet === 'function') {
      workbook.deleteSheet(name);
      // Switch to first remaining sheet
      const remaining = workbook.getSheetNames();
      setSheetName(remaining[0]);
      forceUpdate({});
    } else {
      console.warn('Workbook.deleteSheet not implemented, skipping delete');
    }
  };

  return (
    <div className="container">
      <div className="title-bar">
        <span>{sheetName || 'Workbook'} - Excel</span>
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
        <div className="menu-item">Data</div>
        <div className="menu-item">Review</div>
        <div className="menu-item">View</div>
      </div>
      
      {/* Formula Bar Component */}
      {activeSheet && (
        <FormulaBar
          selectedCell={selectedCell}
          cellValue={formulaController?.currentValue ?? null}
          cellFormula={formulaController?.currentFormula}
          onFormulaSubmit={handleFormulaSubmit}
          isEditing={isEditMode}
          onEditModeChange={setIsEditMode}
          validationError={validationError}
        />
      )}
      
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <CyberSheet
          workbook={workbook}
          sheetName={sheetName}
          zoom={zoom}
          fontFamily={fontFamily}
          fontSize={fontSize}
          onRendererReady={(r) => {
            rendererRef.current = r;
            console.log('✅ Renderer ready');
            
            // Subscribe to scroll events from core renderer (event-driven, not polling)
            const scrollDisposable = r.onScrollChange?.((scroll) => {
              console.log('🔄 Scroll event from core:', scroll);
              setScroll(scroll);
              recomputeHeaderIcons();
            });
            
            // Initial state
            const initialScroll = r.getScroll();
            const maxScroll = r.getMaxScroll?.() ?? { x: 0, y: 0 };
            setScroll({ ...initialScroll, maxX: maxScroll.x, maxY: maxScroll.y });
            
            // Listen for cell selection events to update formula bar
            const handleCellEvent = (event: any) => {
              if (event.type === 'cell-click' || event.type === 'cell-double-click') {
                const address = event.event?.address;
                if (address && typeof address.row === 'number' && typeof address.col === 'number') {
                  setSelectedCell(address);
                  if (event.type === 'cell-double-click') {
                    setIsEditMode(true);
                  }
                }
              }
            };
            
            // Subscribe to cell events
            const sheet = r.sheetReadonly;
            let cellDisposable: { dispose(): void } | null = null;
            if (sheet && typeof sheet.on === 'function') {
              cellDisposable = sheet.on(handleCellEvent);
            }
            
            // Save cleanup on the instance for unmount
            (rendererRef.current as any).__sbCleanup = () => { 
              try { 
                scrollDisposable?.dispose();
                cellDisposable?.dispose();
              } catch {}
            };
          }}
          rendererOptions={{
            autoSizeColumns: { mode: 'visible', includeHeader: true, padding: 14, minWidth: 48 },
            onRequestColumnFilterMenu: ({ col, anchor, values, apply, clear }: { col: number; anchor: { x: number; y: number }; values: Array<{ value: string; count: number }>; apply: (s: string[]) => void; clear: () => void; }) => {
              // Preselect based on existing filter, if any
              const r = rendererRef.current;
              const existing = r?.sheetReadonly?.getColumnFilter?.(col);
              const allValues = values.map((v: { value: string; count: number }) => v.value);
              let selected: Set<string>;
              if (existing && existing.type === 'in' && Array.isArray(existing.value)) {
                selected = new Set((existing.value as any[]).map(String));
              } else {
                // Preselect only values present in currently visible rows (respecting other filters)
                const present = new Set<string>();
                try {
                  const visibleRows: number[] = r.sheetReadonly.getVisibleRowIndices();
                  for (const rr of visibleRows) {
                    const v = r.sheetReadonly.getCellValue({ row: rr, col });
                    present.add(v == null ? '' : String(v));
                  }
                } catch {}
                selected = present.size ? present : new Set(allValues);
              }
              setFilterSel(selected);
              setFilterMenu({ col, x: anchor.x, y: anchor.y, values,
                apply: (sel) => {
                  const allValues = values.map(v => v.value);
                  if (sel.length === allValues.length) {
                    clear();
                  } else {
                    apply(sel);
                  }
                  setFilterMenu(null);
                },
                clear: () => { clear(); setFilterMenu(null); }
              });
            }
          } as any}
          style={{ width: '100%', height: 'calc(100vh - 140px)', overflow: 'hidden' }}
        />
        {/* Custom Scrollbars */}
        {/* Vertical */}
        <div 
          key={`vscroll-${sheetName}`}
          style={{ position: 'absolute', right: 2, top: 24, bottom: 16, width: 10, background: 'rgba(0,0,0,0.04)', borderRadius: 5 }}
          onWheel={(e) => { e.preventDefault(); const r = rendererRef.current; if (!r) return; r.scrollBy(0, e.deltaY); }}
        >
          {scroll.maxY > 0 && (
            <div
              key={`vthumb-${sheetName}`}
              style={verticalScrollbarStyle}
              onMouseDown={(e) => {
                e.preventDefault();
                const track = (e.currentTarget.parentElement as HTMLElement);
                const startY = e.clientY; const startScroll = scroll.y; const trackH = track.clientHeight;
                const onMove = (ev: MouseEvent) => {
                  const dy = ev.clientY - startY; const ratio = dy / Math.max(1, trackH); const r = rendererRef.current;
                  if (!r) return; const next = Math.min(scroll.maxY, Math.max(0, startScroll + ratio * scroll.maxY)); r.setScroll(scroll.x, next);
                };
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
              }}
            />
          )}
        </div>
        {/* Horizontal */}
        <div 
          key={`hscroll-${sheetName}`}
          style={{ position: 'absolute', left: 48, right: 16, bottom: 2, height: 10, background: 'rgba(0,0,0,0.04)', borderRadius: 5 }}
          onWheel={(e) => { e.preventDefault(); const r = rendererRef.current; if (!r) return; r.scrollBy(e.deltaX, 0); }}
        >
          {scroll.maxX > 0 && (
            <div
              key={`hthumb-${sheetName}`}
              style={horizontalScrollbarStyle}
              onMouseDown={(e) => {
                e.preventDefault();
                const track = (e.currentTarget.parentElement as HTMLElement);
                const startX = e.clientX; const startScroll = scroll.x; const trackW = track.clientWidth;
                const onMove = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX; const ratio = dx / Math.max(1, trackW); const r = rendererRef.current;
                  if (!r) return; const next = Math.min(scroll.maxX, Math.max(0, startScroll + ratio * scroll.maxX)); r.setScroll(next, scroll.y);
                };
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
              }}
            />
          )}
        </div>
        {filterMenu && (
          <div className="filter-dropdown visible" style={{ position: 'absolute', left: filterMenu.x, top: filterMenu.y, zIndex: 1000 }}>
            <div className="filter-header">Filter - Column {filterMenu.col}</div>
            <div style={{ padding: '4px 8px' }}>
              <input
                type="text"
                placeholder="Search..."
                value={filterSearch}
                onKeyUp={(e) => setFilterSearch((e.target as HTMLInputElement).value)}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div className="filter-options">
              {(() => {
                const allValues = filterMenu.values.map(v => v.value);
                const isAllSelected = filterSel.size === allValues.length;
                const toggleSelectAll = () => {
                  setFilterSel(isAllSelected ? new Set() : new Set(allValues));
                };
                return (
                  <div className="filter-option" onClick={toggleSelectAll}>
                    <input
                      className="filter-checkbox"
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                    />
                    (Select All)
                  </div>
                );
              })()}
              {filterMenu.values
                .filter(item => !filterSearch || item.value.toLowerCase().includes(filterSearch.toLowerCase()))
                .map(item => (
                <div key={item.value} className="filter-option" onClick={() => {
                  setFilterSel(prev => { const next = new Set(prev); if (next.has(item.value)) next.delete(item.value); else next.add(item.value); return next; });
                }}>
                  <input className="filter-checkbox" type="checkbox" checked={filterSel.has(item.value)} readOnly /> {item.value} <span style={{ color: '#999' }}>({item.count})</span>
                </div>
              ))}
            </div>
            <div className="filter-actions">
              <button className="filter-btn" onClick={() => {
                // Reset: show all values (select all) but keep dialog open for confirmation
                const allValues = filterMenu.values.map(v => v.value);
                setFilterSel(new Set(allValues));
              }}>Reset</button>
              <button className="filter-btn" onClick={() => { filterMenu.clear(); }}>Clear</button>
              <button className="filter-btn primary" onClick={() => { filterMenu.apply(Array.from(filterSel)); }}>OK</button>
            </div>
          </div>
        )}
        {/* Header filter icons overlay */}
        {headerIcons.map(h => {
          const r = rendererRef.current;
          const opts = r?.optionsReadonly ?? { headerHeight: 24 };
          const iconLeft = Math.round(h.x + h.w - 14);
          const iconTop = Math.round((opts.headerHeight / 2) - 6);
          return (
            <div
              key={h.col}
              className={`filter-icon ${rendererRef.current?.sheetReadonly?.getColumnFilter?.(h.col) ? 'active' : ''}`}
              style={{ position: 'absolute', left: iconLeft, top: iconTop, zIndex: 500 }}
              onClick={(e) => {
                e.stopPropagation();
                const r = rendererRef.current; if (!r) return;
                // Ask renderer to compute values via its callback machinery
                const rect = { x: iconLeft, y: opts.headerHeight };
                // Reuse renderer's contextmenu handler path by directly invoking the menu callback
                // Build distinct values list here (same logic as in renderer)
                const rows = (r.sheetReadonly as any).getVisibleRowIndicesExcluding?.(h.col) || [];
                const seen = new Map<string, number>();
                for (const rr of rows) {
                  const v = r.sheetReadonly.getCellValue({ row: rr, col: h.col });
                  const key = v == null ? '' : String(v);
                  seen.set(key, (seen.get(key) || 0) + 1);
                }
                const values = Array.from(seen.entries()).map(([value, count]) => ({ value, count })).sort((a,b)=>a.value.localeCompare(b.value));
                const existing = r?.sheetReadonly?.getColumnFilter?.(h.col);
                const allValues = values.map(v => v.value);
                let selected: Set<string>;
                if (existing && existing.type === 'in' && Array.isArray(existing.value)) {
                  selected = new Set((existing.value as any[]).map(String));
                } else {
                  const present = new Set<string>();
                  try {
                    const visibleRows: number[] = r.sheetReadonly.getVisibleRowIndices();
                    for (const rr of visibleRows) {
                      const v = r.sheetReadonly.getCellValue({ row: rr, col: h.col });
                      present.add(v == null ? '' : String(v));
                    }
                  } catch {}
                  selected = present.size ? present : new Set(allValues);
                }
                setFilterMenu({ col: h.col, x: iconLeft, y: opts.headerHeight, values,
                  apply: (sel) => {
                    const allValues = values.map(v => v.value);
                    if (sel.length === allValues.length) {
                      r.sheetReadonly.clearColumnFilter(h.col);
                    } else {
                      r.sheetReadonly.setColumnFilter(h.col, { type: 'in', value: sel });
                    }
                    r.redraw?.(); setFilterMenu(null);
                  },
                  clear: () => { r.sheetReadonly.clearColumnFilter(h.col); r.redraw?.(); setFilterMenu(null); }
                });
                setFilterSel(selected);
              }}
              title={`Filter column ${h.col}`}
            >
              ▼
            </div>
          );
        })}
      </div>
      
      {/* Sheet Tabs - Excel-style navigation at bottom */}
      {workbook && (
        <SheetTabs
          sheets={workbook.getSheetNames ? workbook.getSheetNames() : []}
          activeSheet={sheetName || ''}
          onSheetChange={setSheetName}
          onAddSheet={handleAddSheet}
          onRenameSheet={handleRenameSheet}
          onDeleteSheet={handleDeleteSheet}
        />
      )}
      
      <div className="status-bar">
        <div className="status-left">
          <span>{status}</span>
        </div>
        <div className="status-right">
          <label style={{ marginRight: '8px' }}>Font</label>
          <select 
            value={fontFamily} 
            onChange={e => setFontFamily(e.target.value)}
            style={{ 
              padding: '2px 6px', 
              marginRight: '12px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '11px'
            }}
          >
            <option value="Segoe UI, Arial, sans-serif">Segoe UI</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Calibri, sans-serif">Calibri</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
          </select>
          <label style={{ marginRight: '8px' }}>Size</label>
          <input 
            type="number" 
            min={8} 
            max={24} 
            value={fontSize} 
            onChange={e => setFontSize(parseInt(e.target.value, 10))}
            style={{ 
              width: '50px', 
              padding: '2px 6px',
              marginRight: '12px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '11px'
            }}
          />
          <label>Zoom</label>
          <input className="zoom-slider" type="range" min={50} max={200} value={Math.round(zoom * 100)} onChange={e => setZoom(parseInt(e.target.value, 10) / 100)} />
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

const mountNode = document.getElementById('root');
if (mountNode) {
  const root = createRoot(mountNode);
  root.render(<ReactCanvasViewer />);
}
