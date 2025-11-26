/**
 * MasterDetailManager.ts
 * 
 * Master-detail views with row expansion, nested grids, and cell spanning
 */

import type { Address, CellValue } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core';

export interface DetailRowConfig {
  row: number;
  expanded: boolean;
  height?: number;
  content: DetailContent;
}

export type DetailContent = 
  | { type: 'grid'; worksheet: Worksheet }
  | { type: 'form'; fields: { label: string; value: CellValue }[] }
  | { type: 'custom'; render: (container: HTMLElement) => void };

export interface CellSpan {
  address: Address;
  rowSpan: number;
  colSpan: number;
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action?: (addr: Address) => void;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  disabled?: boolean;
}

export class MasterDetailManager {
  private worksheet: Worksheet;
  private detailRows = new Map<number, DetailRowConfig>();
  private cellSpans = new Map<string, CellSpan>();
  private contextMenuItems: ContextMenuItem[] = [];

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
    this.setupDefaultContextMenu();
  }

  /**
   * Toggle row expansion
   */
  toggleRow(row: number, content?: DetailContent): void {
    const existing = this.detailRows.get(row);
    
    if (existing) {
      // Toggle expansion
      existing.expanded = !existing.expanded;
      this.dispatchEvent('rowToggle', { row, expanded: existing.expanded });
    } else if (content) {
      // Create new detail row
      this.detailRows.set(row, {
        row,
        expanded: true,
        height: 200,
        content
      });
      this.dispatchEvent('rowExpand', { row });
    }
  }

  /**
   * Expand row with detail content
   */
  expandRow(row: number, content: DetailContent, height?: number): void {
    this.detailRows.set(row, {
      row,
      expanded: true,
      height: height ?? 200,
      content
    });
    this.dispatchEvent('rowExpand', { row });
  }

  /**
   * Collapse row
   */
  collapseRow(row: number): void {
    const detail = this.detailRows.get(row);
    if (detail) {
      detail.expanded = false;
      this.dispatchEvent('rowCollapse', { row });
    }
  }

  /**
   * Remove detail row
   */
  removeDetailRow(row: number): void {
    this.detailRows.delete(row);
    this.dispatchEvent('rowRemove', { row });
  }

  /**
   * Get detail row config
   */
  getDetailRow(row: number): DetailRowConfig | undefined {
    return this.detailRows.get(row);
  }

  /**
   * Get all detail rows
   */
  getAllDetailRows(): DetailRowConfig[] {
    return Array.from(this.detailRows.values());
  }

  /**
   * Check if row is expanded
   */
  isRowExpanded(row: number): boolean {
    return this.detailRows.get(row)?.expanded ?? false;
  }

  /**
   * Get total height including detail rows
   */
  getTotalHeight(baseHeight: number, rowHeight: number): number {
    let total = baseHeight;
    
    for (const detail of this.detailRows.values()) {
      if (detail.expanded) {
        total += detail.height ?? 200;
      }
    }
    
    return total;
  }

  /**
   * Add cell span
   */
  addCellSpan(addr: Address, rowSpan: number, colSpan: number): void {
    const key = this.getCellKey(addr);
    this.cellSpans.set(key, { address: addr, rowSpan, colSpan });
    this.dispatchEvent('cellSpan', { addr, rowSpan, colSpan });
  }

  /**
   * Remove cell span
   */
  removeCellSpan(addr: Address): void {
    const key = this.getCellKey(addr);
    this.cellSpans.delete(key);
    this.dispatchEvent('cellSpanRemove', { addr });
  }

  /**
   * Get cell span
   */
  getCellSpan(addr: Address): CellSpan | undefined {
    const key = this.getCellKey(addr);
    return this.cellSpans.get(key);
  }

  /**
   * Check if cell is part of a span
   */
  isSpannedCell(addr: Address): boolean {
    // Check if this cell is the origin of a span
    if (this.getCellSpan(addr)) {
      return true;
    }
    
    // Check if this cell is covered by another span
    for (const span of this.cellSpans.values()) {
      if (
        addr.row >= span.address.row &&
        addr.row < span.address.row + span.rowSpan &&
        addr.col >= span.address.col &&
        addr.col < span.address.col + span.colSpan &&
        (addr.row !== span.address.row || addr.col !== span.address.col)
      ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Auto-merge cells with same value
   */
  autoMerge(column: number, startRow: number, endRow: number): void {
    let mergeStart = startRow;
    let currentValue = this.worksheet.getCell({ row: startRow, col: column })?.value;
    
    for (let row = startRow + 1; row <= endRow + 1; row++) {
      const cellValue = row <= endRow 
        ? this.worksheet.getCell({ row, col: column })?.value 
        : null;
      
      if (cellValue !== currentValue) {
        // End of merge group
        const rowSpan = row - mergeStart;
        if (rowSpan > 1) {
          this.addCellSpan({ row: mergeStart, col: column }, rowSpan, 1);
        }
        
        mergeStart = row;
        currentValue = cellValue;
      }
    }
  }

  /**
   * Setup default context menu
   */
  private setupDefaultContextMenu(): void {
    this.contextMenuItems = [
      {
        label: 'Cut',
        icon: '✂️',
        action: (addr) => {
          document.dispatchEvent(new ClipboardEvent('cut'));
        }
      },
      {
        label: 'Copy',
        icon: '📋',
        action: (addr) => {
          document.dispatchEvent(new ClipboardEvent('copy'));
        }
      },
      {
        label: 'Paste',
        icon: '📄',
        action: (addr) => {
          document.dispatchEvent(new ClipboardEvent('paste'));
        }
      },
      { label: '', separator: true, action: () => {} },
      {
        label: 'Insert',
        icon: '➕',
        submenu: [
          {
            label: 'Insert Row Above',
            action: (addr) => {
              this.dispatchEvent('insertRow', { row: addr.row, position: 'above' });
            }
          },
          {
            label: 'Insert Row Below',
            action: (addr) => {
              this.dispatchEvent('insertRow', { row: addr.row, position: 'below' });
            }
          },
          {
            label: 'Insert Column Left',
            action: (addr) => {
              this.dispatchEvent('insertCol', { col: addr.col, position: 'left' });
            }
          },
          {
            label: 'Insert Column Right',
            action: (addr) => {
              this.dispatchEvent('insertCol', { col: addr.col, position: 'right' });
            }
          }
        ]
      },
      {
        label: 'Delete',
        icon: '🗑️',
        submenu: [
          {
            label: 'Delete Row',
            action: (addr) => {
              this.dispatchEvent('deleteRow', { row: addr.row });
            }
          },
          {
            label: 'Delete Column',
            action: (addr) => {
              this.dispatchEvent('deleteCol', { col: addr.col });
            }
          }
        ]
      },
      { label: '', separator: true, action: () => {} },
      {
        label: 'Expand Row',
        icon: '📊',
        action: (addr) => {
          this.toggleRow(addr.row, {
            type: 'form',
            fields: [
              { label: 'Details', value: 'No details available' }
            ]
          });
        }
      }
    ];
  }

  /**
   * Add context menu item
   */
  addContextMenuItem(item: ContextMenuItem, position?: number): void {
    if (position !== undefined) {
      this.contextMenuItems.splice(position, 0, item);
    } else {
      this.contextMenuItems.push(item);
    }
  }

  /**
   * Remove context menu item
   */
  removeContextMenuItem(label: string): void {
    const index = this.contextMenuItems.findIndex(item => item.label === label);
    if (index !== -1) {
      this.contextMenuItems.splice(index, 1);
    }
  }

  /**
   * Show context menu
   */
  showContextMenu(addr: Address, x: number, y: number): void {
    const menu = this.createContextMenuElement(addr, x, y);
    document.body.appendChild(menu);
    
    // Close on click outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  /**
   * Create context menu DOM element
   */
  private createContextMenuElement(addr: Address, x: number, y: number): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'cyber-sheet-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 4px 0;
      min-width: 180px;
      z-index: 10000;
    `;
    
    for (const item of this.contextMenuItems) {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 0;';
        menu.appendChild(separator);
      } else {
        const menuItem = this.createMenuItem(item, addr, menu);
        menu.appendChild(menuItem);
      }
    }
    
    return menu;
  }

  /**
   * Create menu item element
   */
  private createMenuItem(item: ContextMenuItem, addr: Address, parentMenu: HTMLElement): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cyber-sheet-context-menu-item';
    el.style.cssText = `
      padding: 8px 16px;
      cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
      opacity: ${item.disabled ? '0.5' : '1'};
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    if (item.icon) {
      const icon = document.createElement('span');
      icon.textContent = item.icon;
      el.appendChild(icon);
    }
    
    const label = document.createElement('span');
    label.textContent = item.label;
    el.appendChild(label);
    
    if (item.submenu) {
      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.style.marginLeft = 'auto';
      el.appendChild(arrow);
    }
    
    // Hover effect
    el.addEventListener('mouseenter', () => {
      if (!item.disabled) {
        el.style.background = '#f0f0f0';
      }
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.background = 'transparent';
    });
    
    // Click handler
    if (!item.disabled) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!item.submenu && item.action) {
          item.action(addr);
          parentMenu.remove();
        }
      });
    }
    
    return el;
  }

  /**
   * Get cell key
   */
  private getCellKey(addr: Address): string {
    return `${addr.row}:${addr.col}`;
  }

  /**
   * Dispatch custom event
   */
  private dispatchEvent(type: string, detail: unknown): void {
    const event = new CustomEvent(`cyber-sheet-master-detail-${type}`, { detail });
    document.dispatchEvent(event);
  }
}
