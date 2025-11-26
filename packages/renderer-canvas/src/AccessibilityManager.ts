/**
 * AccessibilityManager.ts
 * 
 * Provides WCAG 2.1 AA compliant accessibility features for canvas-based rendering.
 * Includes keyboard navigation, screen reader support, focus management, and IME handling.
 */

import type { Worksheet } from '@cyber-sheet/core';

export interface AccessibilityOptions {
  enableKeyboardNavigation?: boolean;
  enableScreenReader?: boolean;
  enableIME?: boolean;
  announceChanges?: boolean;
  highContrast?: boolean;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface FocusState {
  cell: CellPosition;
  isEditing: boolean;
  selection?: {
    start: CellPosition;
    end: CellPosition;
  };
}

/**
 * AccessibilityManager handles all accessibility concerns for canvas-based spreadsheets.
 * 
 * Key Features:
 * - ARIA live regions for screen reader announcements
 * - Keyboard navigation (arrow keys, Tab, Enter, Escape)
 * - Focus management with visual indicators
 * - IME (Input Method Editor) support for international text input
 * - High contrast mode support
 */
export class AccessibilityManager {
  private container: HTMLElement;
  private worksheet: Worksheet;
  private options: Required<AccessibilityOptions>;
  private focusState: FocusState;
  
  // Accessibility overlay elements
  private ariaLiveRegion: HTMLDivElement;
  private focusOverlay: HTMLDivElement;
  private inputElement: HTMLInputElement;
  
  // Event listeners (stored for cleanup)
  private boundHandlers: Map<string, (e: Event) => void> = new Map();

  constructor(
    container: HTMLElement,
    worksheet: Worksheet,
    options: AccessibilityOptions = {}
  ) {
    this.container = container;
    this.worksheet = worksheet;
    this.options = {
      enableKeyboardNavigation: true,
      enableScreenReader: true,
      enableIME: true,
      announceChanges: true,
      highContrast: false,
      ...options,
    };

    this.focusState = {
      cell: { row: 0, col: 0 },
      isEditing: false,
    };

    // Create accessibility infrastructure
    this.ariaLiveRegion = this.createAriaLiveRegion();
    this.focusOverlay = this.createFocusOverlay();
    this.inputElement = this.createHiddenInput();

    // Initialize event handlers
    this.setupEventListeners();
    
    // Set initial focus
    this.updateFocus(this.focusState.cell);
  }

  /**
   * Creates an ARIA live region for screen reader announcements.
   */
  private createAriaLiveRegion(): HTMLDivElement {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'cyber-sheet-aria-live';
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    this.container.appendChild(liveRegion);
    return liveRegion;
  }

  /**
   * Creates a visual focus overlay that follows the active cell.
   */
  private createFocusOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'cyber-sheet-focus-overlay';
    overlay.setAttribute('role', 'gridcell');
    overlay.setAttribute('tabindex', '0');
    overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #0066CC;
      box-sizing: border-box;
      z-index: 100;
      outline: none;
    `;
    
    // High contrast mode
    if (this.options.highContrast) {
      overlay.style.border = '3px solid #000000';
      overlay.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
    }
    
    this.container.appendChild(overlay);
    return overlay;
  }

  /**
   * Creates a hidden input element for IME support and text input.
   */
  private createHiddenInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cyber-sheet-ime-input';
    input.setAttribute('aria-hidden', 'true');
    input.style.cssText = `
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 1px;
      height: 1px;
    `;
    this.container.appendChild(input);
    return input;
  }

  /**
   * Sets up all keyboard and focus event listeners.
   */
  private setupEventListeners(): void {
    if (this.options.enableKeyboardNavigation) {
      const keydownHandler = (e: Event) => this.handleKeyDown(e as KeyboardEvent);
      this.focusOverlay.addEventListener('keydown', keydownHandler);
      this.boundHandlers.set('keydown', keydownHandler);
    }

    if (this.options.enableIME) {
      const inputHandler = (e: Event) => this.handleIMEInput(e);
      const compositionStartHandler = (e: Event) => this.handleCompositionStart(e as CompositionEvent);
      const compositionEndHandler = (e: Event) => this.handleCompositionEnd(e as CompositionEvent);
      
      this.inputElement.addEventListener('input', inputHandler);
      this.inputElement.addEventListener('compositionstart', compositionStartHandler);
      this.inputElement.addEventListener('compositionend', compositionEndHandler);
      
      this.boundHandlers.set('input', inputHandler);
      this.boundHandlers.set('compositionstart', compositionStartHandler);
      this.boundHandlers.set('compositionend', compositionEndHandler);
    }

    // Focus management
    const focusHandler = (e: Event) => this.handleFocus(e as FocusEvent);
    const blurHandler = (e: Event) => this.handleBlur(e as FocusEvent);
    
    this.focusOverlay.addEventListener('focus', focusHandler);
    this.focusOverlay.addEventListener('blur', blurHandler);
    
    this.boundHandlers.set('focus', focusHandler);
    this.boundHandlers.set('blur', blurHandler);
  }

  /**
   * Handles keyboard navigation (arrow keys, Tab, Enter, Escape).
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const { key, shiftKey, ctrlKey, metaKey } = event;

    // Navigation keys
    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(0, -1, shiftKey);
        break;
      case 'ArrowDown':
      case 'Enter':
        event.preventDefault();
        this.moveFocus(0, 1, shiftKey && key === 'ArrowDown');
        if (key === 'Enter' && !this.focusState.isEditing) {
          this.startEditing();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveFocus(-1, 0, shiftKey);
        break;
      case 'ArrowRight':
      case 'Tab':
        event.preventDefault();
        this.moveFocus(shiftKey ? -1 : 1, 0, false);
        break;
      case 'Escape':
        if (this.focusState.isEditing) {
          event.preventDefault();
          this.cancelEditing();
        }
        break;
      case 'Home':
        event.preventDefault();
        if (ctrlKey || metaKey) {
          this.moveFocusTo(0, 0);
        } else {
          this.moveFocusTo(0, this.focusState.cell.row);
        }
        break;
      case 'End':
        event.preventDefault();
        if (ctrlKey || metaKey) {
          const lastRow = this.worksheet.rowCount - 1;
          const lastCol = this.worksheet.colCount - 1;
          this.moveFocusTo(lastCol, lastRow);
        } else {
          const lastCol = this.worksheet.colCount - 1;
          this.moveFocusTo(lastCol, this.focusState.cell.row);
        }
        break;
      case 'PageUp':
        event.preventDefault();
        this.moveFocus(0, -10, shiftKey);
        break;
      case 'PageDown':
        event.preventDefault();
        this.moveFocus(0, 10, shiftKey);
        break;
      case 'F2':
        event.preventDefault();
        this.startEditing();
        break;
      case 'Delete':
      case 'Backspace':
        if (!this.focusState.isEditing) {
          event.preventDefault();
          this.clearCell();
        }
        break;
      default:
        // Start editing on printable character
        if (!this.focusState.isEditing && key.length === 1 && !ctrlKey && !metaKey) {
          this.startEditing(key);
        }
        break;
    }
  }

  /**
   * Moves focus by a relative offset.
   */
  private moveFocus(colDelta: number, rowDelta: number, extendSelection: boolean = false): void {
    const newRow = Math.max(0, Math.min(
      this.worksheet.rowCount - 1,
      this.focusState.cell.row + rowDelta
    ));
    const newCol = Math.max(0, Math.min(
      this.worksheet.colCount - 1,
      this.focusState.cell.col + colDelta
    ));

    if (extendSelection) {
      if (!this.focusState.selection) {
        this.focusState.selection = {
          start: { ...this.focusState.cell },
          end: { row: newRow, col: newCol },
        };
      } else {
        this.focusState.selection.end = { row: newRow, col: newCol };
      }
      this.announceSelection();
    } else {
      this.focusState.selection = undefined;
    }

    this.updateFocus({ row: newRow, col: newCol });
  }

  /**
   * Moves focus to an absolute position.
   */
  private moveFocusTo(col: number, row: number): void {
    this.focusState.selection = undefined;
    this.updateFocus({ row, col });
  }

  /**
   * Updates the focus position and announces it to screen readers.
   */
  private updateFocus(position: CellPosition): void {
    this.focusState.cell = position;
    
    // Update focus overlay position (this would be calculated based on cell dimensions)
    // For now, we'll emit an event that the renderer can listen to
    this.container.dispatchEvent(new CustomEvent('cyber-sheet-focus-change', {
      detail: { position, isEditing: this.focusState.isEditing },
    }));

    // Update ARIA attributes
    const cellAddress = this.getCellAddress(position);
    const cellValue = this.getCellValue(position);
    
    this.focusOverlay.setAttribute('aria-label', `Cell ${cellAddress}: ${cellValue}`);
    this.focusOverlay.setAttribute('aria-rowindex', String(position.row + 1));
    this.focusOverlay.setAttribute('aria-colindex', String(position.col + 1));

    // Announce to screen readers
    if (this.options.announceChanges) {
      this.announce(`${cellAddress}: ${cellValue}`);
    }
  }

  /**
   * Starts editing the current cell.
   */
  private startEditing(initialValue?: string): void {
    this.focusState.isEditing = true;
    this.inputElement.style.opacity = '1';
    this.inputElement.style.pointerEvents = 'auto';
    
    const currentValue = initialValue ?? this.getCellValue(this.focusState.cell);
    this.inputElement.value = currentValue;
    this.inputElement.focus();
    this.inputElement.select();

    this.announce(`Editing cell ${this.getCellAddress(this.focusState.cell)}`);
    
    this.container.dispatchEvent(new CustomEvent('cyber-sheet-edit-start', {
      detail: { position: this.focusState.cell, initialValue },
    }));
  }

  /**
   * Commits the current edit and returns to navigation mode.
   */
  private commitEditing(): void {
    if (!this.focusState.isEditing) return;

    const newValue = this.inputElement.value;
    this.focusState.isEditing = false;
    this.inputElement.style.opacity = '0';
    this.inputElement.style.pointerEvents = 'none';
    this.focusOverlay.focus();

    this.container.dispatchEvent(new CustomEvent('cyber-sheet-edit-commit', {
      detail: { position: this.focusState.cell, value: newValue },
    }));

    this.announce(`Cell updated to ${newValue}`);
  }

  /**
   * Cancels the current edit without saving changes.
   */
  private cancelEditing(): void {
    if (!this.focusState.isEditing) return;

    this.focusState.isEditing = false;
    this.inputElement.style.opacity = '0';
    this.inputElement.style.pointerEvents = 'none';
    this.focusOverlay.focus();

    this.announce('Edit cancelled');
  }

  /**
   * Clears the content of the current cell.
   */
  private clearCell(): void {
    this.container.dispatchEvent(new CustomEvent('cyber-sheet-cell-clear', {
      detail: { position: this.focusState.cell },
    }));

    this.announce(`Cell ${this.getCellAddress(this.focusState.cell)} cleared`);
  }

  /**
   * Handles IME input for international text entry.
   */
  private handleIMEInput(event: Event): void {
    // Input is handled, but we wait for composition end to commit
    const target = event.target as HTMLInputElement;
    
    this.container.dispatchEvent(new CustomEvent('cyber-sheet-ime-input', {
      detail: { position: this.focusState.cell, value: target.value },
    }));
  }

  /**
   * Handles the start of IME composition.
   */
  private handleCompositionStart(event: CompositionEvent): void {
    this.announce('Text composition started');
  }

  /**
   * Handles the end of IME composition.
   */
  private handleCompositionEnd(event: CompositionEvent): void {
    this.commitEditing();
  }

  /**
   * Handles focus events on the overlay.
   */
  private handleFocus(event: FocusEvent): void {
    this.container.classList.add('cyber-sheet-focused');
  }

  /**
   * Handles blur events on the overlay.
   */
  private handleBlur(event: FocusEvent): void {
    this.container.classList.remove('cyber-sheet-focused');
    if (this.focusState.isEditing) {
      this.commitEditing();
    }
  }

  /**
   * Announces a message to screen readers via the ARIA live region.
   */
  private announce(message: string): void {
    if (!this.options.enableScreenReader) return;

    // Clear and set text to ensure announcement
    this.ariaLiveRegion.textContent = '';
    setTimeout(() => {
      this.ariaLiveRegion.textContent = message;
    }, 100);
  }

  /**
   * Announces the current selection range to screen readers.
   */
  private announceSelection(): void {
    if (!this.focusState.selection) return;

    const start = this.getCellAddress(this.focusState.selection.start);
    const end = this.getCellAddress(this.focusState.selection.end);
    
    this.announce(`Selection from ${start} to ${end}`);
  }

  /**
   * Converts a cell position to Excel-style address (e.g., A1, B2).
   */
  private getCellAddress(position: CellPosition): string {
    const colLetter = this.columnNumberToLetter(position.col);
    return `${colLetter}${position.row + 1}`;
  }

  /**
   * Converts a column number to Excel-style letter (0 = A, 1 = B, etc.).
   */
  private columnNumberToLetter(col: number): string {
    let letter = '';
    let num = col;
    
    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 65) + letter;
      num = Math.floor(num / 26) - 1;
    }
    
    return letter;
  }

  /**
   * Gets the display value of a cell.
   */
  private getCellValue(position: CellPosition): string {
    const cell = this.worksheet.getCell({ row: position.row, col: position.col });
    if (!cell) return 'Empty';
    
    // Handle different value types
    if (cell.value === null || cell.value === undefined) return 'Empty';
    if (typeof cell.value === 'number') return cell.value.toLocaleString();
    if (typeof cell.value === 'boolean') return cell.value ? 'True' : 'False';
    
    return String(cell.value);
  }

  /**
   * Updates the focus overlay position based on cell dimensions.
   */
  public updateFocusOverlayPosition(rect: { x: number; y: number; width: number; height: number }): void {
    this.focusOverlay.style.left = `${rect.x}px`;
    this.focusOverlay.style.top = `${rect.y}px`;
    this.focusOverlay.style.width = `${rect.width}px`;
    this.focusOverlay.style.height = `${rect.height}px`;
  }

  /**
   * Updates the hidden input position for IME.
   */
  public updateInputPosition(rect: { x: number; y: number }): void {
    this.inputElement.style.left = `${rect.x}px`;
    this.inputElement.style.top = `${rect.y}px`;
  }

  /**
   * Sets high contrast mode.
   */
  public setHighContrast(enabled: boolean): void {
    this.options.highContrast = enabled;
    
    if (enabled) {
      this.focusOverlay.style.border = '3px solid #000000';
      this.focusOverlay.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
    } else {
      this.focusOverlay.style.border = '2px solid #0066CC';
      this.focusOverlay.style.backgroundColor = 'transparent';
    }
  }

  /**
   * Gets the current focus state.
   */
  public getFocusState(): Readonly<FocusState> {
    return { ...this.focusState };
  }

  /**
   * Programmatically sets focus to a specific cell.
   */
  public setFocus(position: CellPosition): void {
    this.moveFocusTo(position.col, position.row);
    this.focusOverlay.focus();
  }

  /**
   * Cleans up event listeners and DOM elements.
   */
  public dispose(): void {
    // Remove event listeners
    this.boundHandlers.forEach((handler, event) => {
      if (event.startsWith('composition') || event === 'input') {
        this.inputElement.removeEventListener(event, handler);
      } else if (event === 'focus' || event === 'blur' || event === 'keydown') {
        this.focusOverlay.removeEventListener(event, handler);
      }
    });
    this.boundHandlers.clear();

    // Remove DOM elements
    this.ariaLiveRegion.remove();
    this.focusOverlay.remove();
    this.inputElement.remove();
  }
}
