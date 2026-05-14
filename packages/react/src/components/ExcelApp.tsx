/**
 * ExcelApp.tsx
 * 
 * Complete Excel application shell with title bar, ribbon, formula bar,
 * spreadsheet area, sheet tabs, and status bar.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Workbook } from '@cyber-sheet/core';
import type { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { CommandManager, DrawingLayer, ClipboardService, PasteCommand, ClearCellsCommand, FormulaEngine } from '@cyber-sheet/core';
import { TitleBar } from './TitleBar';
import { RibbonTabs } from './RibbonTabs';
import { Ribbon } from '../components/ribbon/Ribbon';
import { FormulaBar } from '../FormulaBar';
import { CyberSheet } from '../CyberSheet';
import { SheetTabs } from '../SheetTabs';
import { StatusBar } from './StatusBar';
import { DrawingCanvas } from './DrawingCanvas';
import { CellEditOverlay } from './CellEditOverlay';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { MiniToolbar } from './MiniToolbar';
import FormatCellsDialog, { FormattingChanges } from './dialogs/FormatCellsDialog/FormatCellsDialog';
import { debugEdit, debugRender, debugMenu } from '../utils/debug';
import './excel-app.css';

export interface ExcelAppProps {
  workbook: Workbook;
  fileName?: string;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  style?: React.CSSProperties;
}

/**
 * ExcelApp - Complete Excel application shell
 * 
 * Provides the full Excel-like interface with:
 * - Title bar with quick access toolbar
 * - Ribbon with tab navigation
 * - Formula bar
 * - Spreadsheet canvas
 * - Sheet tabs
 * - Status bar with zoom controls
 */
export const ExcelApp: React.FC<ExcelAppProps> = ({
  workbook,
  fileName = 'Book1',
  onSave,
  onUndo,
  onRedo,
  style,
}) => {
  const [activeTab, setActiveTab] = useState<string>('Home');
  const [activeSheet, setActiveSheet] = useState<string>(workbook.activeSheet?.name || 'Sheet1');
  const [zoom, setZoom] = useState<number>(100);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [cellValue, setCellValue] = useState<any>('');
  const [cellFormula, setCellFormula] = useState<string>('');
  const [isEditingFormula, setIsEditingFormula] = useState<boolean>(false);
  const [formulaBarValue, setFormulaBarValue] = useState<string>(''); // Track formula bar input
  const [selection, setSelection] = useState<any>(null);
  const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportWidth, setViewportWidth] = useState<number>(1000);
  const [viewportHeight, setViewportHeight] = useState<number>(600);

  // In-cell editing state
  const [inCellEdit, setInCellEdit] = useState<{
    cell: { row: number; col: number };
    bounds: { x: number; y: number; width: number; height: number };
    initialValue: string;
    currentValue: string; // Track the current value being edited
  } | null>(null);
  
  // Debug: Log when edit mode changes
  useEffect(() => {
    console.log('📊 inCellEdit state changed:', inCellEdit ? `cell (${inCellEdit.cell.row}, ${inCellEdit.cell.col})` : 'null');
  }, [inCellEdit]);

  // Cell reference picking mode (when editing formula)
  const [isPickingReference, setIsPickingReference] = useState<boolean>(false);

  // Context menu and mini toolbar state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [miniToolbar, setMiniToolbar] = useState<{ x: number; y: number } | null>(null);
  
  // Format Cells dialog state
  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState<boolean>(false);
  
  // Recent colors tracking (up to 10 each)
  const [recentFillColors, setRecentFillColors] = useState<string[]>([]);
  const [recentFontColors, setRecentFontColors] = useState<string[]>([]);
  
  // Refs for keyboard handler to avoid re-attaching listeners on every state change
  const selectedCellRef = useRef(selectedCell);
  const selectionRef = useRef(selection);
  const inCellEditRef = useRef(inCellEdit);
  const isEditingFormulaRef = useRef(isEditingFormula);
  const formulaBarValueRef = useRef(formulaBarValue);
  const isPickingReferenceRef = useRef(isPickingReference);
  // Context menu selection: captured at menu open time and frozen until menu closes
  const contextMenuSelectionRef = useRef<any>(null);
  
  // Keep refs in sync with state (but NOT contextMenuSelectionRef - that's set by context menu handler)
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  
  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);
  
  useEffect(() => {
    inCellEditRef.current = inCellEdit;
  }, [inCellEdit]);
  
  useEffect(() => {
    isEditingFormulaRef.current = isEditingFormula;
  }, [isEditingFormula]);

  useEffect(() => {
    formulaBarValueRef.current = formulaBarValue;
  }, [formulaBarValue]);

  useEffect(() => {
    isPickingReferenceRef.current = isPickingReference;
  }, [isPickingReference]);
  
  // Helper to add color to recent list
  const addRecentColor = (color: string, setRecentColors: React.Dispatch<React.SetStateAction<string[]>>) => {
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c !== color);
      return [color, ...filtered].slice(0, 10);
    });
  };

  // Create a command manager for this workbook
  const commandManager = useMemo(() => {
    const sheet = workbook.activeSheet;
    return new CommandManager(100, sheet);
  }, [workbook]);

  // Create formula engine for autocomplete
  const formulaEngine = useMemo(() => new FormulaEngine(), []);

  // Create drawing layer instance
  const drawingLayer = useMemo(() => new DrawingLayer(), []);
  
  // Create clipboard service instance
  const clipboardService = useMemo(() => new ClipboardService(), []);

  // Get all sheet names
  const sheets = workbook.getSheetNames();

  // Handle sheet change
  const handleSheetChange = useCallback((sheetName: string) => {
    // Set active sheet by setting activeSheetName property
    workbook.activeSheetName = sheetName;
    setActiveSheet(sheetName);
  }, [workbook]);

  // Handle add sheet
  const handleAddSheet = useCallback(() => {
    const newIndex = sheets.length + 1;
    const newName = `Sheet${newIndex}`;
    workbook.addSheet(newName);
    setActiveSheet(newName);
  }, [workbook, sheets]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(10, Math.min(400, newZoom));
    setZoom(clampedZoom);
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((sel: any) => {
    console.log('🔄 handleSelectionChange called, sel:', sel, 'inCellEdit:', inCellEdit);
    // If in edit mode and user clicks a different cell, commit the edit first
    if (inCellEdit) {
      const isDifferentCell = sel.start.row !== inCellEdit.cell.row || sel.start.col !== inCellEdit.cell.col;
      console.log('📝 In edit mode, isDifferentCell:', isDifferentCell);
      if (isDifferentCell) {
        console.log('💾 Committing edit before changing selection, value:', inCellEdit.currentValue);
        // Commit the current edit with the actual typed value
        const sheet = workbook.activeSheet;
        if (sheet && renderer) {
          const address = { row: inCellEdit.cell.row, col: inCellEdit.cell.col };
          const value = inCellEdit.currentValue; // Use the current value, not initial
          
          // Update cell value/formula in worksheet
          if (value.startsWith('=')) {
            sheet.setCellFormula(address, value);
          } else {
            sheet.setCellValue(address, value);
          }
          
          // Invalidate the cell
          renderer.invalidateRange(address.row, address.col, address.row, address.col);
          renderer.scheduleRedraw();
        }
        setInCellEdit(null);
        setIsPickingReference(false);
        // Now proceed with selection update below
      } else {
        // Same cell, stay in edit mode
        return;
      }
    }
    
    setSelection(sel);
    setSelectedCell({ row: sel.start.row, col: sel.start.col });
    
    // Only update cell value/formula if NOT editing (to preserve formula being typed)
    if (!isEditingFormula) {
      const sheet = workbook.activeSheet;
      if (sheet) {
        const address = { row: sel.start.row, col: sel.start.col };
        const cell = sheet.getCell(address);
        const value = cell?.value || '';
        const formula = cell?.formula || '';
        setCellValue(value);
        setCellFormula(formula);
        setFormulaBarValue(formula || String(value));
      }
    }
  }, [workbook, isEditingFormula, inCellEdit, renderer]);

  // Handle formula submit
  const handleFormulaSubmit = useCallback((formula: string) => {
    if (!selectedCell) return;
    
    const sheet = workbook.activeSheet;
    if (sheet) {
      const address = { row: selectedCell.row, col: selectedCell.col };
      if (formula.startsWith('=')) {
        sheet.setCellFormula(address, formula);
      } else {
        sheet.setCellValue(address, formula);
      }
    }
    setIsEditingFormula(false);
    setIsPickingReference(false);
  }, [workbook, selectedCell]);

  // Start in-cell editing
  const startInCellEdit = useCallback((cell: { row: number; col: number }, initialValue?: string) => {
    console.log('🚀 [START_IN_CELL_EDIT CALLBACK] called for', cell, 'initialValue:', initialValue);
    console.trace('Call stack:');
    debugEdit('🚀 startInCellEdit called:', cell, 'renderer:', !!renderer);
    if (!renderer) return;
    
    const bounds = renderer.getCellBounds({ row: cell.row, col: cell.col });
    debugEdit('📏 Cell bounds:', bounds);
    if (!bounds) return;

    // Determine the value to edit
    let value: string;
    if (initialValue !== undefined) {
      // If initialValue is explicitly provided (even if empty string), use it
      value = initialValue;
    } else {
      // Otherwise, use existing cell content
      const sheet = workbook.activeSheet;
      const cellData = sheet?.getCell({ row: cell.row, col: cell.col });
      value = cellData?.formula || String(cellData?.value || '');
    }

    // Make sure formula bar is not in edit mode
    setIsEditingFormula(false);

    setInCellEdit({
      cell,
      bounds,
      initialValue: value,
      currentValue: value, // Initialize current value same as initial
    });

    // Enable reference picking if editing a formula
    setIsPickingReference(value.startsWith('='));
  }, [renderer, workbook]);

  // Commit in-cell edit
  const commitInCellEdit = useCallback((value: string) => {
    if (!inCellEdit) return;

    const sheet = workbook.activeSheet;
    if (sheet && renderer) {
      const address = { row: inCellEdit.cell.row, col: inCellEdit.cell.col };
      
      // Update cell value/formula in worksheet
      if (value.startsWith('=')) {
        sheet.setCellFormula(address, value);
      } else {
        sheet.setCellValue(address, value);
      }
      
      // Invalidate only the affected cell region for efficient redraw
      if (typeof renderer.invalidateRange === 'function') {
        renderer.invalidateRange(address.row, address.col, address.row, address.col);
      }
    }
    setInCellEdit(null);
    setIsPickingReference(false);
  }, [inCellEdit, workbook, renderer]);

  // Cancel in-cell edit
  const cancelInCellEdit = useCallback(() => {
    setInCellEdit(null);
    setIsPickingReference(false);
  }, []);

  // Get context menu items
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const sheet = workbook.activeSheet;
    if (!sheet) return [];

    return [
      {
        id: 'cut',
        label: 'Cut',
        icon: '✂️',
        shortcut: 'Ctrl+X',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          console.log('✂️ [ExcelApp] Context menu Cut clicked', {
            frozenSelection: selection,
            selectionDetails: selection ? {
              start: `(${selection.start.row},${selection.start.col})`,
              end: `(${selection.end.row},${selection.end.col})`,
              dimensions: `${Math.abs(selection.end.row - selection.start.row) + 1}x${Math.abs(selection.end.col - selection.start.col) + 1}`
            } : null,
            timestamp: Date.now()
          });
          debugMenu('Cut clicked');
          const sheet = workbook.activeSheet;
          if (selection && sheet) {
            // Copy to clipboard with isCut flag
            const range = {
              start: selection.start,
              end: selection.end,
            };
            console.log('✂️ [ExcelApp] Calling clipboardService.cut with range:', `(${range.start.row},${range.start.col}) to (${range.end.row},${range.end.col})`);
            clipboardService.cut(sheet, range);
            console.log('✅ [ExcelApp] Cut to clipboard completed');
            
            // Clear source cells using command (for undo/redo)
            const clearCmd = new ClearCellsCommand(sheet, range);
            commandManager.execute(clearCmd);
            
            // Invalidate and redraw
            const r1 = Math.min(range.start.row, range.end.row);
            const r2 = Math.max(range.start.row, range.end.row);
            const c1 = Math.min(range.start.col, range.end.col);
            const c2 = Math.max(range.start.col, range.end.col);
            renderer?.invalidateRange(r1, c1, r2, c2);
            renderer?.scheduleRedraw();
          }
        },
      },
      {
        id: 'copy',
        label: 'Copy',
        icon: '📋',
        shortcut: 'Ctrl+C',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          console.log('📋 [ExcelApp] Context menu Copy clicked', {
            frozenSelection: selection,
            selectionDetails: selection ? {
              start: `(${selection.start.row},${selection.start.col})`,
              end: `(${selection.end.row},${selection.end.col})`,
              dimensions: `${Math.abs(selection.end.row - selection.start.row) + 1}x${Math.abs(selection.end.col - selection.start.col) + 1}`
            } : null,
            timestamp: Date.now()
          });
          debugMenu('Copy clicked');
          const sheet = workbook.activeSheet;
          if (selection && sheet) {
            const range = {
              start: selection.start,
              end: selection.end,
            };
            console.log('📋 [ExcelApp] Calling clipboardService.copy with range:', `(${range.start.row},${range.start.col}) to (${range.end.row},${range.end.col})`);
            clipboardService.copy(sheet, range);
            console.log('✅ [ExcelApp] Copy completed');
          } else {
            console.log('❌ [ExcelApp] Cannot copy - missing selection or sheet');
          }
        },
      },
      {
        id: 'paste',
        label: 'Paste',
        icon: '📄',
        shortcut: 'Ctrl+V',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          const payload = clipboardService.getPayload();
          
          console.log('📄 [ExcelApp] Context menu Paste clicked', {
            frozenSelection: selection,
            selectionDetails: selection ? {
              start: `(${selection.start.row},${selection.start.col})`,
              end: `(${selection.end.row},${selection.end.col})`
            } : null,
            hasPayload: !!payload,
            payloadDetails: payload ? {
              dimensions: `${payload.width}x${payload.height}`,
              cellCount: payload.cells.length,
              isCut: payload.isCut
            } : null,
            timestamp: Date.now()
          });
          
          debugMenu('Paste clicked');
          const sheet = workbook.activeSheet;
          
          if (selection && sheet && payload) {
            // Create and execute paste command
            const targetAnchor = selection.start;
            console.log('📄 [ExcelApp] Executing context menu paste with targetAnchor:', `(${targetAnchor.row},${targetAnchor.col})`);
            const pasteCmd = new PasteCommand(sheet, payload, targetAnchor);
            commandManager.execute(pasteCmd);
            console.log('✅ [ExcelApp] Context menu paste completed');
            
            // Invalidate the pasted region
            const r2 = targetAnchor.row + payload.height - 1;
            const c2 = targetAnchor.col + payload.width - 1;
            renderer?.invalidateRange(targetAnchor.row, targetAnchor.col, r2, c2);
            renderer?.scheduleRedraw();
          } else {
            console.log('❌ [ExcelApp] Cannot paste from context menu - selection:', !!selection, 'sheet:', !!sheet, 'payload:', !!payload);
          }
        },
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'insert',
        label: 'Insert...',
        icon: '➕',
        shortcut: 'Ctrl+Shift+=',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          debugMenu('Insert clicked');
        },
      },
      {
        id: 'delete',
        label: 'Delete...',
        icon: '➖',
        shortcut: 'Ctrl+-',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          debugMenu('Delete clicked');
        },
      },
      {
        id: 'clearContents',
        label: 'Clear Contents',
        icon: '🧹',
        shortcut: 'Delete',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          debugMenu('Clear Contents clicked');
          if (selection && sheet) {
            // Clear cells using command (for undo/redo)
            const clearCmd = new ClearCellsCommand(sheet, { start: selection.start, end: selection.end });
            commandManager.execute(clearCmd);
            
            // Invalidate and redraw
            const r1 = Math.min(selection.start.row, selection.end.row);
            const r2 = Math.max(selection.start.row, selection.end.row);
            const c1 = Math.min(selection.start.col, selection.end.col);
            const c2 = Math.max(selection.start.col, selection.end.col);
            renderer?.invalidateRange(r1, c1, r2, c2);
            renderer?.scheduleRedraw();
          }
        },
      },
      { id: 'sep2', label: '', separator: true },
      {
        id: 'sort',
        label: 'Sort',
        icon: '🔤',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          debugMenu('Sort clicked');
        },
      },
      {
        id: 'filter',
        label: 'Filter',
        icon: '🔽',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          debugMenu('Filter clicked');
        },
      },
      { id: 'sep3', label: '', separator: true },
      {
        id: 'formatCells',
        label: 'Format Cells...',
        icon: '⚙️',
        shortcut: 'Ctrl+1',
        onClick: () => {
          const selection = contextMenuSelectionRef.current;
          debugMenu('Format Cells clicked');
          setIsFormatDialogOpen(true);
        },
      },
      {
        id: 'numberFormat',
        label: 'Number Format...',
        icon: '🔢',
        onClick: () => {
          debugMenu('Number Format clicked');
        },
      },
      { id: 'sep4', label: '', separator: true },
      {
        id: 'insertComment',
        label: 'New Comment',
        icon: '💬',
        shortcut: 'Shift+F2',
        onClick: () => {
          debugMenu('New Comment clicked');
        },
      },
    ];
  }, [workbook, selection, renderer, clipboardService, commandManager, setIsFormatDialogOpen]);

  // Handle right-click (context menu)
  useEffect(() => {
    if (!renderer) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // CRITICAL: Capture and freeze selection at the moment context menu is opened
      // This prevents race conditions where selection changes between open and click
      const frozenSelection = selection;
      contextMenuSelectionRef.current = frozenSelection;
      
      console.log('🖱️ [ExcelApp] Context menu opened, frozen selection:', frozenSelection ? `(${frozenSelection.start.row},${frozenSelection.start.col})` : 'null', {
        selection: frozenSelection,
        timestamp: Date.now()
      });
      
      setContextMenu({ x: e.clientX, y: e.clientY });
      // Don't show MiniToolbar on right-click - only show on text selection
      setMiniToolbar(null);
    };

    const canvas = renderer['canvas'];
    if (canvas) {
      canvas.addEventListener('contextmenu', handleContextMenu);
      return () => canvas.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [renderer, selection]); // Include selection in deps so we capture latest

  // Handle renderer ready
  const handleRendererReady = useCallback((r: CanvasRenderer) => {
    debugRender('=== Renderer Ready ===');
    
    // Expose renderer globally for debugging
    (window as any).__renderer = r;
    
    setRenderer(r);
    
    // Initialize viewport size
    const vp = r.getViewportSize();
    setViewportWidth(vp.width);
    setViewportHeight(vp.height);
    
    // Initialize scroll position
    const scroll = r.getScroll();
    setScrollLeft(scroll.x);
    setScrollTop(scroll.y);
  }, []);

  // Subscribe to renderer scroll events
  useEffect(() => {
    if (!renderer) return;
    
    const onScroll = (event: { x: number; y: number }) => {
      setScrollLeft(event.x);
      setScrollTop(event.y);
    };
    
    const unsubscribe = renderer.onScrollChange(onScroll);
    return () => unsubscribe.dispose();
  }, [renderer]);

  // Handle double-click to start in-cell editing
  const isHandlingDoubleClick = useRef(false);
  
  useEffect(() => {
    console.log('🔧 Double-click handler effect running, renderer:', !!renderer, 'workbook:', !!workbook);
    if (!renderer) return;

    const sheet = renderer['sheet'];
    if (!sheet) return;

    const handleCellDoubleClick = (event: any) => {
      // Only handle double-click events (ignore other events)
      if (event.type !== 'cell-double-click') return;
      console.log('🎯 handleCellDoubleClick received event:', event.type);
      
      // Prevent multiple simultaneous handlers
      if (isHandlingDoubleClick.current) {
        console.log('⏭️  Already handling double-click, skipping');
        return;
      }
      
      isHandlingDoubleClick.current = true;
      
      const { address } = event.event;
      console.log('🖱️ Double-click detected on cell:', address);
      
      // Start edit mode
      const bounds = renderer.getCellBounds({ row: address.row, col: address.col });
      if (!bounds) {
        isHandlingDoubleClick.current = false;
        return;
      }

      // Determine the value to edit
      const sheet = workbook.activeSheet;
      const cellData = sheet?.getCell({ row: address.row, col: address.col });
      const value = cellData?.formula || String(cellData?.value || '');

      // Set edit mode directly to avoid callback changes
      setIsEditingFormula(false);
      console.log('✍️ [DOUBLE-CLICK HANDLER] Activating edit mode for cell', address, 'value:', value);
      setInCellEdit({
        cell: { row: address.row, col: address.col },
        bounds,
        initialValue: value,
        currentValue: value,
      });
      setIsPickingReference(value.startsWith('='));
      console.log('✅ Edit mode activated');
      
      // Reset flag after a short delay
      setTimeout(() => {
        isHandlingDoubleClick.current = false;
      }, 100);
    };

    const disposable = sheet.on(handleCellDoubleClick);

    console.log('✅ Double-click listener attached');
    return () => {
      console.log('🧹 Double-click listener cleanup');
      disposable.dispose();
    };
  }, [renderer, workbook]); // Remove startInCellEdit from dependencies

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Log EVERY key event for debugging
      console.log('⌨️ [ExcelApp] Key event', {
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
        target: (e.target as HTMLElement)?.tagName,
        isComposing: e.isComposing,
      });
      
      // Get current values from refs to avoid re-attaching listeners on state changes
      const selectedCell = selectedCellRef.current;
      const selection = selectionRef.current;
      const inCellEdit = inCellEditRef.current;
      const isEditingFormula = isEditingFormulaRef.current;
      
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // ===== SHORTCUTS THAT WORK IN INPUT FIELDS =====
      
      // Ctrl+Z (Undo) - works everywhere
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        if (onUndo) onUndo();
        return;
      }
      
      // Ctrl+Y or Ctrl+Shift+Z (Redo) - works everywhere
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.shiftKey && e.code === 'KeyZ'))) {
        e.preventDefault();
        if (onRedo) onRedo();
        return;
      }
      
      // Escape - cancel in-cell editing
      if (e.key === 'Escape' && inCellEdit) {
        e.preventDefault();
        setInCellEdit(null);
        return;
      }
      
      // Enter - move down (works when not editing)
      if (e.key === 'Enter' && !e.shiftKey && !isEditingFormula && !inCellEdit && selectedCell) {
        e.preventDefault();
        const newRow = Math.min(selectedCell.row + 1, workbook.activeSheet?.rowCount || 1000);
        setSelectedCell({ row: newRow, col: selectedCell.col });
        renderer?.setSelection({ 
          start: { row: newRow, col: selectedCell.col }, 
          end: { row: newRow, col: selectedCell.col } 
        });
        return;
      }
      
      // Shift+Enter - move up (works when not editing)
      if (e.key === 'Enter' && e.shiftKey && !isEditingFormula && !inCellEdit && selectedCell) {
        e.preventDefault();
        const newRow = Math.max(selectedCell.row - 1, 0);
        setSelectedCell({ row: newRow, col: selectedCell.col });
        renderer?.setSelection({ 
          start: { row: newRow, col: selectedCell.col }, 
          end: { row: newRow, col: selectedCell.col } 
        });
        return;
      }
      
      // Tab - move right (works when not editing)
      if (e.key === 'Tab' && !e.shiftKey && !isEditingFormula && !inCellEdit && selectedCell) {
        e.preventDefault();
        const newCol = Math.min(selectedCell.col + 1, workbook.activeSheet?.colCount || 100);
        setSelectedCell({ row: selectedCell.row, col: newCol });
        renderer?.setSelection({ 
          start: { row: selectedCell.row, col: newCol }, 
          end: { row: selectedCell.row, col: newCol } 
        });
        return;
      }
      
      // Shift+Tab - move left (works when not editing)
      if (e.key === 'Tab' && e.shiftKey && !isEditingFormula && !inCellEdit && selectedCell) {
        e.preventDefault();
        const newCol = Math.max(selectedCell.col - 1, 0);
        setSelectedCell({ row: selectedCell.row, col: newCol });
        renderer?.setSelection({ 
          start: { row: selectedCell.row, col: newCol }, 
          end: { row: selectedCell.row, col: newCol } 
        });
        return;
      }
      
      // ===== SHORTCUTS THAT ONLY WORK ON SHEET CANVAS =====
      
      // Skip if editing in formula bar or in input field
      if (isEditingFormula || inCellEdit || isInInput) return;
      
      const sheet = workbook.activeSheet;
      if (!sheet) return;
      
      // --- Clipboard Operations ---
      
      // Ctrl+C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        console.log('📋 [ExcelApp] Ctrl+C detected', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          selection,
        });
        if (selection) {
          const range = { start: selection.start, end: selection.end };
          clipboardService.copy(sheet, range);
          const payload = clipboardService.getPayload();
          console.log('✅ [ExcelApp] Copied to clipboard', {
            payloadCells: payload?.cells.length,
            payloadDimensions: payload ? `${payload.width}x${payload.height}` : 'none',
          });
        } else {
          console.log('❌ [ExcelApp] Cannot copy - no selection');
        }
        return;
      }
      
      // Ctrl+X (Cut)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') {
        e.preventDefault();
        console.log('✂️ [ExcelApp] Ctrl+X detected', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          selection,
        });
        if (selection) {
          const range = { start: selection.start, end: selection.end };
          
          // IMPORTANT: Log cell data BEFORE cutting
          console.log('📊 [ExcelApp] Cell data BEFORE cut:', {
            sourceCell: `(${range.start.row},${range.start.col})`,
            cellValue: sheet.getCellValue(range.start),
            cellFormula: sheet.getCellFormula(range.start),
            cellDisplay: sheet.getCellDisplayValue(range.start),
          });
          
          clipboardService.cut(sheet, range);
          const payload = clipboardService.getPayload();
          console.log('✅ [ExcelApp] Cut to clipboard (source will be cleared after paste)', {
            payloadCells: payload?.cells.length,
            payloadDimensions: payload ? `${payload.width}x${payload.height}` : 'none',
            isCut: payload?.isCut,
            firstCellValue: payload?.cells[0]?.value,
            firstCellFormula: payload?.cells[0]?.formula,
          });
          
          // Note: Source cells are NOT cleared here.
          // PasteCommand will handle clearing the source after paste completes (via isCut flag)
        } else {
          console.log('❌ [ExcelApp] Cannot cut - no selection');
        }
        return;
      }
      
      // Ctrl+V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        const payload = clipboardService.getPayload();
        console.log('📄 [ExcelApp] Ctrl+V detected', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          selection,
          selectionDetails: selection ? {
            start: `(${selection.start.row},${selection.start.col})`,
            end: `(${selection.end.row},${selection.end.col})`,
            dimensions: `${Math.abs(selection.end.row - selection.start.row) + 1}x${Math.abs(selection.end.col - selection.start.col) + 1}`
          } : null,
          hasPayload: !!payload,
          payloadDetails: payload ? {
            dimensions: `${payload.width}x${payload.height}`,
            cellCount: payload.cells.length,
            isCut: payload.isCut,
            sourceRange: `(${payload.sourceRange.start.row},${payload.sourceRange.start.col}) to (${payload.sourceRange.end.row},${payload.sourceRange.end.col})`,
            firstCellValue: payload.cells[0]?.value,
            firstCellFormula: payload.cells[0]?.formula,
          } : null
        });
        if (selection && payload) {
          const targetAnchor = selection.start;
          console.log('▶️ [ExcelApp] Executing PasteCommand with targetAnchor:', `(${targetAnchor.row},${targetAnchor.col})`);
          
          // Log target cell data BEFORE paste
          console.log('📊 [ExcelApp] Target cell BEFORE paste:', {
            targetCell: `(${targetAnchor.row},${targetAnchor.col})`,
            cellValue: sheet.getCellValue(targetAnchor),
            cellFormula: sheet.getCellFormula(targetAnchor),
            cellDisplay: sheet.getCellDisplayValue(targetAnchor),
          });
          
          const pasteCmd = new PasteCommand(sheet, payload, targetAnchor);
          commandManager.execute(pasteCmd);
          
          // Log target cell data AFTER paste
          console.log('📊 [ExcelApp] Target cell AFTER paste:', {
            targetCell: `(${targetAnchor.row},${targetAnchor.col})`,
            cellValue: sheet.getCellValue(targetAnchor),
            cellFormula: sheet.getCellFormula(targetAnchor),
            cellDisplay: sheet.getCellDisplayValue(targetAnchor),
          });
          
          // If it was a cut operation, also check source cell
          if (payload.isCut) {
            const sourceCell = payload.sourceRange.start;
            console.log('📊 [ExcelApp] Source cell AFTER cut/paste:', {
              sourceCell: `(${sourceCell.row},${sourceCell.col})`,
              cellValue: sheet.getCellValue(sourceCell),
              cellFormula: sheet.getCellFormula(sourceCell),
              cellDisplay: sheet.getCellDisplayValue(sourceCell),
              shouldBeEmpty: true,
            });
          }
          
          console.log('✅ [ExcelApp] Paste completed');
          
          const r2 = targetAnchor.row + payload.height - 1;
          const c2 = targetAnchor.col + payload.width - 1;
          renderer?.invalidateRange(targetAnchor.row, targetAnchor.col, r2, c2);
          
          // Also invalidate source range if it was a cut
          if (payload.isCut) {
            const { start, end } = payload.sourceRange;
            renderer?.invalidateRange(start.row, start.col, end.row, end.col);
          }
          
          renderer?.scheduleRedraw();
        } else {
          console.log('❌ [ExcelApp] Cannot paste - selection:', !!selection, 'payload:', !!payload);
        }
        return;
      }
      
      // --- Formatting Operations ---
      
      // Ctrl+B (Bold)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyB') {
        e.preventDefault();
        if (selection) {
          const r1 = Math.min(selection.start.row, selection.end.row);
          const r2 = Math.max(selection.start.row, selection.end.row);
          const c1 = Math.min(selection.start.col, selection.end.col);
          const c2 = Math.max(selection.start.col, selection.end.col);
          
          const firstCellStyle = sheet.getCellStyle(selection.start);
          const newBoldState = !firstCellStyle?.bold;
          
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              const addr = { row: r, col: c };
              const currentStyle = sheet.getCellStyle(addr) || {};
              const newStyle = sheet.internStyle({ ...currentStyle, bold: newBoldState });
              sheet.setCellStyle(addr, newStyle);
            }
          }
          renderer?.scheduleRedraw();
        }
        return;
      }
      
      // Ctrl+I (Italic)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyI') {
        e.preventDefault();
        if (selection) {
          const r1 = Math.min(selection.start.row, selection.end.row);
          const r2 = Math.max(selection.start.row, selection.end.row);
          const c1 = Math.min(selection.start.col, selection.end.col);
          const c2 = Math.max(selection.start.col, selection.end.col);
          
          const firstCellStyle = sheet.getCellStyle(selection.start);
          const newItalicState = !firstCellStyle?.italic;
          
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              const addr = { row: r, col: c };
              const currentStyle = sheet.getCellStyle(addr) || {};
              const newStyle = sheet.internStyle({ ...currentStyle, italic: newItalicState });
              sheet.setCellStyle(addr, newStyle);
            }
          }
          renderer?.scheduleRedraw();
        }
        return;
      }
      
      // Ctrl+U (Underline)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyU') {
        e.preventDefault();
        if (selection) {
          const r1 = Math.min(selection.start.row, selection.end.row);
          const r2 = Math.max(selection.start.row, selection.end.row);
          const c1 = Math.min(selection.start.col, selection.end.col);
          const c2 = Math.max(selection.start.col, selection.end.col);
          
          const firstCellStyle = sheet.getCellStyle(selection.start);
          const newUnderlineState = !firstCellStyle?.underline;
          
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              const addr = { row: r, col: c };
              const currentStyle = sheet.getCellStyle(addr) || {};
              const newStyle = sheet.internStyle({ ...currentStyle, underline: newUnderlineState });
              sheet.setCellStyle(addr, newStyle);
            }
          }
          renderer?.scheduleRedraw();
        }
        return;
      }
      
      // Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }
      
      // Ctrl+1 (Format Cells dialog)
      if ((e.ctrlKey || e.metaKey) && e.code === 'Digit1') {
        e.preventDefault();
        setIsFormatDialogOpen(true);
        return;
      }
      
      // --- Navigation Operations ---
      
      // Ctrl+Home (Jump to A1)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Home') {
        e.preventDefault();
        setSelectedCell({ row: 0, col: 0 });
        renderer?.setSelection({ 
          start: { row: 0, col: 0 }, 
          end: { row: 0, col: 0 } 
        });
        // Scroll to top-left
        renderer?.setScroll(0, 0);
        return;
      }
      
      // Ctrl+End (Jump to last used cell)
      if ((e.ctrlKey || e.metaKey) && e.key === 'End') {
        e.preventDefault();
        // Find last used cell using sparse cell iteration (O(n) not O(rows*cols))
        let lastRow = 0;
        let lastCol = 0;
        sheet.forEachNonEmptyCell((row: number, col: number) => {
          lastRow = Math.max(lastRow, row);
          lastCol = Math.max(lastCol, col);
        });
        setSelectedCell({ row: lastRow, col: lastCol });
        renderer?.setSelection({ 
          start: { row: lastRow, col: lastCol }, 
          end: { row: lastRow, col: lastCol } 
        });
        return;
      }
      
      // Ctrl+A (Select current region or all)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        if (!selectedCell) return;
        
        // Excel behavior: First press selects current region, second press selects all
        const lastRow = sheet.rowCount || 1000;
        const lastCol = sheet.colCount || 100;
        
        // Helper to check if cell is empty
        const isEmpty = (r: number, c: number): boolean => {
          if (r < 0 || c < 0 || r >= lastRow || c >= lastCol) return true;
          const value = sheet.getCellValue({ row: r, col: c });
          return value === null || value === undefined || value === '';
        };
        
        // Find current region bounds (contiguous data around selected cell)
        const startRow = selectedCell.row;
        const startCol = selectedCell.col;
        
        // If starting cell is empty, just select all
        if (isEmpty(startRow, startCol)) {
          setSelection({
            start: { row: 0, col: 0 },
            end: { row: lastRow - 1, col: lastCol - 1 }
          });
          renderer?.setSelection({ 
            start: { row: 0, col: 0 }, 
            end: { row: lastRow - 1, col: lastCol - 1 } 
          });
          return;
        }
        
        // Expand upward to find top boundary
        let topRow = startRow;
        while (topRow > 0 && !isEmpty(topRow - 1, startCol)) {
          topRow--;
        }
        
        // Expand downward to find bottom boundary
        let bottomRow = startRow;
        while (bottomRow < lastRow - 1 && !isEmpty(bottomRow + 1, startCol)) {
          bottomRow++;
        }
        
        // Expand leftward to find left boundary
        let leftCol = startCol;
        while (leftCol > 0 && !isEmpty(startRow, leftCol - 1)) {
          leftCol--;
        }
        
        // Expand rightward to find right boundary
        let rightCol = startCol;
        while (rightCol < lastCol - 1 && !isEmpty(startRow, rightCol + 1)) {
          rightCol++;
        }
        
        // Check if current selection is already the detected region
        const isRegionSelected = selection &&
          selection.start.row === topRow &&
          selection.start.col === leftCol &&
          selection.end.row === bottomRow &&
          selection.end.col === rightCol;
        
        if (isRegionSelected) {
          // Second press: select all
          setSelection({
            start: { row: 0, col: 0 },
            end: { row: lastRow - 1, col: lastCol - 1 }
          });
          renderer?.setSelection({ 
            start: { row: 0, col: 0 }, 
            end: { row: lastRow - 1, col: lastCol - 1 } 
          });
        } else {
          // First press: select current region
          setSelection({
            start: { row: topRow, col: leftCol },
            end: { row: bottomRow, col: rightCol }
          });
          renderer?.setSelection({ 
            start: { row: topRow, col: leftCol }, 
            end: { row: bottomRow, col: rightCol } 
          });
        }
        return;
      }
      
      // Ctrl+Arrow keys (Jump to edge of data region)
      if ((e.ctrlKey || e.metaKey) && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey) {
        e.preventDefault();
        if (!selectedCell) return;
        
        const lastRow = sheet.rowCount || 1000;
        const lastCol = sheet.colCount || 100;
        
        // Helper to check if cell is empty
        const isEmpty = (r: number, c: number): boolean => {
          if (r < 0 || c < 0 || r >= lastRow || c >= lastCol) return true;
          const value = sheet.getCellValue({ row: r, col: c });
          return value === null || value === undefined || value === '';
        };
        
        let newRow = selectedCell.row;
        let newCol = selectedCell.col;
        const currentIsEmpty = isEmpty(newRow, newCol);
        
        switch (e.key) {
          case 'ArrowUp':
            if (currentIsEmpty) {
              // Jump to first non-empty cell above
              while (newRow > 0 && isEmpty(newRow - 1, newCol)) {
                newRow--;
              }
              // Now we're at the last empty cell before data, move into data
              if (newRow > 0) newRow--;
            } else {
              // Jump to top edge of current data region
              while (newRow > 0 && !isEmpty(newRow - 1, newCol)) {
                newRow--;
              }
            }
            break;
            
          case 'ArrowDown':
            if (currentIsEmpty) {
              // Jump to first non-empty cell below
              while (newRow < lastRow - 1 && isEmpty(newRow + 1, newCol)) {
                newRow++;
              }
              // Now we're at the last empty cell before data, move into data
              if (newRow < lastRow - 1) newRow++;
            } else {
              // Jump to bottom edge of current data region
              while (newRow < lastRow - 1 && !isEmpty(newRow + 1, newCol)) {
                newRow++;
              }
            }
            break;
            
          case 'ArrowLeft':
            if (currentIsEmpty) {
              // Jump to first non-empty cell to the left
              while (newCol > 0 && isEmpty(newRow, newCol - 1)) {
                newCol--;
              }
              // Now we're at the last empty cell before data, move into data
              if (newCol > 0) newCol--;
            } else {
              // Jump to left edge of current data region
              while (newCol > 0 && !isEmpty(newRow, newCol - 1)) {
                newCol--;
              }
            }
            break;
            
          case 'ArrowRight':
            if (currentIsEmpty) {
              // Jump to first non-empty cell to the right
              while (newCol < lastCol - 1 && isEmpty(newRow, newCol + 1)) {
                newCol++;
              }
              // Now we're at the last empty cell before data, move into data
              if (newCol < lastCol - 1) newCol++;
            } else {
              // Jump to right edge of current data region
              while (newCol < lastCol - 1 && !isEmpty(newRow, newCol + 1)) {
                newCol++;
              }
            }
            break;
        }
        
        setSelectedCell({ row: newRow, col: newCol });
        renderer?.setSelection({ 
          start: { row: newRow, col: newCol }, 
          end: { row: newRow, col: newCol } 
        });
        return;
      }
      
      // Shift+Arrow keys (Extend selection)
      if (e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (!selection) return;
        
        const currentEnd = selection.end;
        let newRow = currentEnd.row;
        let newCol = currentEnd.col;
        
        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, currentEnd.row - 1);
            break;
          case 'ArrowDown':
            newRow = Math.min((sheet.rowCount || 1000) - 1, currentEnd.row + 1);
            break;
          case 'ArrowLeft':
            newCol = Math.max(0, currentEnd.col - 1);
            break;
          case 'ArrowRight':
            newCol = Math.min((sheet.colCount || 100) - 1, currentEnd.col + 1);
            break;
        }
        
        const newSelection = {
          start: selection.start,
          end: { row: newRow, col: newCol }
        };
        
        setSelection(newSelection);
        renderer?.setSelection(newSelection);
        return;
      }
      
      // --- Editing Operations ---
      
      // F2 to start editing with existing content
      if (e.key === 'F2' && selectedCell && renderer) {
        e.preventDefault();
        
        // Inline edit mode activation
        const bounds = renderer.getCellBounds(selectedCell);
        if (bounds) {
          const cellData = sheet?.getCell(selectedCell);
          const value = cellData?.formula || String(cellData?.value || '');
          
          console.log('✍️ [F2 KEY] Activating edit mode for cell', selectedCell, 'value:', value);
          setIsEditingFormula(false);
          setInCellEdit({
            cell: selectedCell,
            bounds,
            initialValue: value,
            currentValue: value,
          });
          setIsPickingReference(value.startsWith('='));
        }
        return;
      }
      
      // Delete or Backspace to clear cell
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault();
        
        // Clear cells using command (for undo/redo)
        const clearCmd = new ClearCellsCommand(sheet, { start: selection.start, end: selection.end });
        commandManager.execute(clearCmd);
        
        // Invalidate and redraw
        const r1 = Math.min(selection.start.row, selection.end.row);
        const r2 = Math.max(selection.start.row, selection.end.row);
        const c1 = Math.min(selection.start.col, selection.end.col);
        const c2 = Math.max(selection.start.col, selection.end.col);
        renderer?.invalidateRange(r1, c1, r2, c2);
        renderer?.scheduleRedraw();
        return;
      }
      
      // Any printable character starts editing with that character
      // Filter out control characters (including \x00) - only allow visible ASCII characters
      const isPrintableKey = e.key.length === 1 && e.key >= ' ' && e.key <= '~' && !e.ctrlKey && !e.metaKey && !e.altKey;
      
      if (selectedCell && isPrintableKey && renderer) {
        e.preventDefault();
        
        // Inline edit mode activation with initial character
        const bounds = renderer.getCellBounds(selectedCell);
        if (bounds) {
          console.log('✍️ [TYPING KEY] Activating edit mode for cell', selectedCell, 'key:', e.key);
          setIsEditingFormula(false);
          setInCellEdit({
            cell: selectedCell,
            bounds,
            initialValue: e.key,
            currentValue: e.key,
          });
          setIsPickingReference(e.key === '=');
        }
      }
    };

    console.log('🎹 Keyboard handler effect running - attaching listener');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log('🧹 Keyboard handler effect cleanup - removing listener');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [workbook, renderer, clipboardService, commandManager, onSave, onUndo, onRedo]); // Removed state deps - now using refs

  // Handle cell click when in reference picking mode
  useEffect(() => {
    console.log('🎯 [CELL-CLICK HANDLER EFFECT] Running, isPickingReference:', isPickingReference);
    if (!renderer || !isPickingReference) return;

    const sheet = renderer['sheet'];
    if (!sheet || !sheet['events']) return;

    const handleCellClick = (event: any) => {
      console.log('📍 [CELL-CLICK HANDLER] Cell clicked in reference picking mode', event.event?.address);
      const { address } = event.event;
      
      // Convert row/col to Excel-style reference (e.g., A1, B2)
      const colLetter = String.fromCharCode(65 + address.col);
      const rowNumber = address.row + 1;
      const cellRef = `${colLetter}${rowNumber}`;
      
      // Insert cell reference into formula
      if (isEditingFormulaRef.current) {
        // Update formula bar value with appended reference
        setCellFormula(formulaBarValueRef.current + cellRef);
      } else if (inCellEditRef.current) {
        // Insert into in-cell editor by updating the initial value
        const newValue = inCellEditRef.current.initialValue + cellRef;
        setInCellEdit(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            initialValue: newValue,
            currentValue: newValue,
          };
        });
      }
    };

    sheet['events'].on('cell-click', handleCellClick);

    return () => {
      sheet['events'].off('cell-click', handleCellClick);
    };
  }, [renderer, isPickingReference]);

  return (
    <div className="excel-app" style={style}>
      {/* Title Bar */}
      <TitleBar
        fileName={`${fileName} - Excel`}
        onSave={onSave}
        onUndo={onUndo || (() => commandManager.undo())}
        onRedo={onRedo || (() => commandManager.redo())}
      />

      {/* Ribbon Tabs */}
      <RibbonTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Ribbon Content */}
      <Ribbon
        commandManager={commandManager}
        selection={selection}
        activeTab={activeTab}
        drawingLayer={drawingLayer}
      />

      {/* Formula Bar */}
      <FormulaBar
        selectedCell={selectedCell}
        cellValue={cellValue}
        cellFormula={cellFormula}
        onFormulaSubmit={handleFormulaSubmit}
        onValueChange={setFormulaBarValue}
        isEditing={isEditingFormula}
        onEditModeChange={setIsEditingFormula}
        onReferencePickingChange={setIsPickingReference}
        functionRegistry={formulaEngine.functions}
      />

      {/* Spreadsheet Area */}
      <div 
        className="spreadsheet-area" 
        style={{ position: 'relative' }}
      >
        <CyberSheet
          workbook={workbook}
          sheetName={activeSheet}
          zoom={zoom / 100}
          onRendererReady={handleRendererReady}
          onSelectionChange={handleSelectionChange}
          style={{ width: '100%', height: '100%' }}
        />
        <DrawingCanvas
          drawingLayer={drawingLayer}
          canvasWidth={viewportWidth}
          canvasHeight={viewportHeight}
          scrollLeft={scrollLeft}
          scrollTop={scrollTop}
          zoom={zoom / 100}
          commandManager={commandManager}
          onObjectChange={() => {}}
        />

        {/* In-Cell Edit Overlay */}
        {inCellEdit && (
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              // When picking references, allow clicks to pass through to canvas
              // When not picking, catch clicks to commit the edit
              pointerEvents: isPickingReference ? 'none' : 'auto',
              zIndex: 1000,
              background: 'transparent'
            }}
            onMouseDown={(e) => {
              // If clicking outside the input, commit and prevent event propagation
              if (!(e.target as HTMLElement).matches('input')) {
                e.preventDefault();
                e.stopPropagation();
                // Get the current value from the input before committing
                const inputElement = e.currentTarget.querySelector('input');
                const currentValue = inputElement?.value || inCellEdit.initialValue;
                commitInCellEdit(currentValue);
              }
            }}
          >
            <CellEditOverlay
              cell={inCellEdit.cell}
              initialValue={inCellEdit.initialValue}
              bounds={inCellEdit.bounds}
              onCommit={commitInCellEdit}
              onCancel={cancelInCellEdit}
              onValueChange={(newValue) => {
                // Track the current value as user types
                setInCellEdit(prev => prev ? { ...prev, currentValue: newValue } : null);
              }}
              isPickingReference={isPickingReference}
              onReferencePickingChange={setIsPickingReference}
              zoom={zoom / 100}
            />
          </div>
        )}
      </div>

      {/* Sheet Tabs */}
      <SheetTabs
        sheets={sheets}
        activeSheet={activeSheet}
        onSheetChange={handleSheetChange}
        onAddSheet={handleAddSheet}
      />

      {/* Status Bar */}
      <StatusBar
        zoom={zoom}
        onZoomChange={handleZoomChange}
        selection={selection}
      />

      {/* Mini Toolbar */}
      {miniToolbar && (
        <MiniToolbar
          x={miniToolbar.x}
          y={miniToolbar.y}
          onClose={() => setMiniToolbar(null)}
          recentFillColors={recentFillColors}
          recentFontColors={recentFontColors}
          currentFont={selection && workbook.activeSheet ? workbook.activeSheet.getCellStyle(selection.start)?.fontFamily || 'Segoe UI' : 'Segoe UI'}
          currentFontSize={selection && workbook.activeSheet ? workbook.activeSheet.getCellStyle(selection.start)?.fontSize || 11 : 11}
          isBold={selection && workbook.activeSheet ? workbook.activeSheet.getCellStyle(selection.start)?.bold || false : false}
          isItalic={selection && workbook.activeSheet ? workbook.activeSheet.getCellStyle(selection.start)?.italic || false : false}
          isUnderline={selection && workbook.activeSheet ? workbook.activeSheet.getCellStyle(selection.start)?.underline || false : false}
          onFontChange={(font) => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, fontFamily: font });
                }
              }
              renderer?.scheduleRedraw();
            }
          }}
          onFontSizeChange={(size) => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, fontSize: size });
                }
              }
              renderer?.scheduleRedraw();
            }
          }}
          onBoldToggle={() => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              // Get current bold state from first cell
              const firstCellStyle = sheet.getCellStyle(selection.start);
              const newBoldState = !firstCellStyle?.bold;
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, bold: newBoldState });
                }
              }
              renderer?.scheduleRedraw();
            }
          }}
          onItalicToggle={() => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              const firstCellStyle = sheet.getCellStyle(selection.start);
              const newItalicState = !firstCellStyle?.italic;
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, italic: newItalicState });
                }
              }
              renderer?.scheduleRedraw();
            }
          }}
          onUnderlineToggle={() => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              const firstCellStyle = sheet.getCellStyle(selection.start);
              const newUnderlineState = !firstCellStyle?.underline;
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, underline: newUnderlineState });
                }
              }
              renderer?.scheduleRedraw();
            }
          }}
          onFillColor={(color) => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, fill: color });
                }
              }
              renderer?.scheduleRedraw();
              addRecentColor(color, setRecentFillColors);
            }
          }}
          onFontColor={(color) => {
            const sheet = workbook.activeSheet;
            if (selection && sheet) {
              const r1 = Math.min(selection.start.row, selection.end.row);
              const r2 = Math.max(selection.start.row, selection.end.row);
              const c1 = Math.min(selection.start.col, selection.end.col);
              const c2 = Math.max(selection.start.col, selection.end.col);
              
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  const addr = { row: r, col: c };
                  const currentStyle = sheet.getCellStyle(addr) || {};
                  sheet.setCellStyle(addr, { ...currentStyle, color });
                }
              }
              renderer?.scheduleRedraw();
              addRecentColor(color, setRecentFontColors);
            }
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => {
            setContextMenu(null);
            setMiniToolbar(null);
          }}
        />
      )}

      {/* Format Cells Dialog */}
      {isFormatDialogOpen && selection && (
        <FormatCellsDialog
          isOpen={isFormatDialogOpen}
          onClose={() => setIsFormatDialogOpen(false)}
          onApply={(changes: FormattingChanges) => {
            const sheet = workbook.activeSheet;
            if (!sheet) return;
            
            const r1 = Math.min(selection.start.row, selection.end.row);
            const r2 = Math.max(selection.start.row, selection.end.row);
            const c1 = Math.min(selection.start.col, selection.end.col);
            const c2 = Math.max(selection.start.col, selection.end.col);
            
            // Apply formatting changes to all cells in selection
            for (let r = r1; r <= r2; r++) {
              for (let c = c1; c <= c2; c++) {
                const addr = { row: r, col: c };
                const currentStyle = sheet.getCellStyle(addr) || {};
                const newStyle = { ...currentStyle };
                
                // Apply font changes
                if (changes.font) {
                  if (changes.font.fontFamily !== undefined) newStyle.fontFamily = changes.font.fontFamily;
                  if (changes.font.fontSize !== undefined) newStyle.fontSize = changes.font.fontSize;
                  if (changes.font.bold !== undefined) newStyle.bold = changes.font.bold;
                  if (changes.font.italic !== undefined) newStyle.italic = changes.font.italic;
                  if (changes.font.underline !== undefined) newStyle.underline = changes.font.underline !== 'none';
                  if (changes.font.color !== undefined) newStyle.color = changes.font.color;
                }
                
                // Apply fill changes
                if (changes.fill?.backgroundColor !== undefined) {
                  newStyle.fillColor = changes.fill.backgroundColor;
                }
                
                // Apply alignment changes
                if (changes.alignment) {
                  if (changes.alignment.horizontal !== undefined) newStyle.horizontalAlign = changes.alignment.horizontal;
                  if (changes.alignment.vertical !== undefined) newStyle.verticalAlign = changes.alignment.vertical;
                }
                
                // Apply number format changes
                if (changes.number?.numberFormat !== undefined) {
                  sheet.setCellNumberFormat(addr, changes.number.numberFormat);
                }
                
                // Intern and apply style
                const internedStyle = sheet.internStyle(newStyle);
                sheet.setCellStyle(addr, internedStyle);
              }
            }
            
            renderer?.scheduleRedraw();
            setIsFormatDialogOpen(false);
          }}
          selectedCells={[
            { row: selection.start.row, col: selection.start.col }
          ]}
          currentFormatting={(
            workbook.activeSheet?.getCellStyle(
              { row: selection.start.row, col: selection.start.col }
            ) || {}
          )}
        />
      )}
    </div>
  );
};
