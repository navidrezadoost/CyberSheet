/**
 * FormulaBar.tsx
 * 
 * Formula bar component for editing and displaying cell formulas.
 * Provides a controlled interface for formula input with validation.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Address, CellValue } from '@cyber-sheet/core';
import { FormulaSuggestions, Suggestion } from './FormulaSuggestions';

export interface FormulaBarProps {
  /** Current selected cell address */
  selectedCell: Address | null;
  /** Current cell value */
  cellValue: CellValue;
  /** Current cell formula (if any) */
  cellFormula?: string;
  /** Callback when formula is submitted */
  onFormulaSubmit: (formula: string) => void;
  /** Callback when value changes (for controlled input) */
  onValueChange?: (value: string) => void;
  /** Whether the formula bar is in edit mode */
  isEditing: boolean;
  /** Callback to toggle edit mode */
  onEditModeChange: (editing: boolean) => void;
  /** Optional validation error message */
  validationError?: string;
  /** Callback when user navigates to a cell via name box */
  onNavigateToCell?: (address: Address) => void;
  /** Callback when user clicks function insert button */
  onInsertFunction?: () => void;
  /** Named ranges for name box dropdown */
  namedRanges?: Array<{ name: string; address: Address | string }>;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * FormulaBar component for editing cell formulas
 */
export const FormulaBar: React.FC<FormulaBarProps> = ({
  selectedCell,
  cellValue,
  cellFormula,
  onFormulaSubmit,
  onValueChange,
  isEditing,
  onEditModeChange,
  validationError,
  onNavigateToCell,
  onInsertFunction,
  namedRanges = [],
  className = '',
  style = {},
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [showNameBoxDropdown, setShowNameBoxDropdown] = useState<boolean>(false);
  const [nameBoxValue, setNameBoxValue] = useState<string>('');
  const inputRef = useRef(null as HTMLInputElement | null);
  const nameBoxRef = useRef(null as HTMLInputElement | null);
  const containerRef = useRef(null as HTMLDivElement | null);

  // Update input when cell selection changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(cellFormula || String(cellValue ?? ''));
    }
    // Update name box with current cell reference
    setNameBoxValue(formatCellReference(selectedCell));
  }, [cellFormula, cellValue, isEditing, selectedCell]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onValueChange?.(value);
    
    // Update cursor position
    setCursorPosition(e.target.selectionStart || 0);
    
    // Show suggestions if typing a formula
    if (value.startsWith('=') && isEditing) {
      setShowSuggestions(true);
      setHighlightedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };
  
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    if (!inputRef.current) return;
    
    const currentValue = inputValue;
    const cursorPos = cursorPosition;
    
    // Find the start of the current token
    let start = cursorPos - 1;
    while (start >= 0 && /[A-Za-z0-9_]/.test(currentValue[start])) {
      start--;
    }
    start++;
    
    // Replace the current token with the suggestion
    const newValue = 
      currentValue.substring(0, start) + 
      suggestion.value +
      (suggestion.type === 'function' ? '(' : '') +
      currentValue.substring(cursorPos);
    
    setInputValue(newValue);
    setShowSuggestions(false);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = start + suggestion.value.length + (suggestion.type === 'function' ? 1 : 0);
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onFormulaSubmit(inputValue);
    }
    onEditModeChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = (highlightedIndex + 1) % 10;
        setHighlightedIndex(newIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = (highlightedIndex - 1 + 10) % 10;
        setHighlightedIndex(newIndex);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Tab should select the highlighted suggestion
        setShowSuggestions(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Enter should close suggestions and submit the formula
        setShowSuggestions(false);
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue(cellFormula || String(cellValue ?? ''));
        onEditModeChange(false);
      }
    }
  };

  const handleInputFocus = () => {
    if (!isEditing) {
      onEditModeChange(true);
    }
    // Show suggestions if it's a formula
    if (inputValue.startsWith('=')) {
      setShowSuggestions(true);
    }
  };

  const handleInputClick = () => {
    // Update cursor position and show suggestions if typing a formula
    if (inputRef.current && inputValue.startsWith('=')) {
      setCursorPosition(inputRef.current.selectionStart || 0);
      setShowSuggestions(true);
      setHighlightedIndex(0);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't blur if clicking on suggestions dropdown
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.formula-suggestions')) {
      return;
    }
    
    // Small delay to allow clicks on suggestions to register
    setTimeout(() => {
      if (isEditing && inputValue !== (cellFormula || String(cellValue ?? ''))) {
        handleSubmit();
      } else {
        onEditModeChange(false);
      }
    }, 200);
  };

  // === Name Box Handlers ===
  
  const handleNameBoxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameBoxValue(e.target.value);
  };
  
  const handleNameBoxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateToNameBoxValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setNameBoxValue(formatCellReference(selectedCell));
      nameBoxRef.current?.blur();
    }
  };
  
  const navigateToNameBoxValue = () => {
    if (!onNavigateToCell) return;
    
    const value = nameBoxValue.trim().toUpperCase();
    
    // Try to parse as cell address (e.g., "A5", "B10")
    const match = value.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colLetters = match[1];
      const rowNum = parseInt(match[2], 10);
      
      // Convert column letters to number
      let col = 0;
      for (let i = 0; i < colLetters.length; i++) {
        col = col * 26 + (colLetters.charCodeAt(i) - 64);
      }
      
      if (col > 0 && rowNum > 0) {
        onNavigateToCell({ row: rowNum, col });
        setShowNameBoxDropdown(false);
        return;
      }
    }
    
    // Try to find in named ranges
    const namedRange = namedRanges.find(nr => nr.name.toUpperCase() === value);
    if (namedRange && typeof namedRange.address !== 'string') {
      onNavigateToCell(namedRange.address);
      setShowNameBoxDropdown(false);
    }
  };
  
  const handleNameBoxDropdownToggle = () => {
    setShowNameBoxDropdown(!showNameBoxDropdown);
  };
  
  const handleNamedRangeSelect = (address: Address) => {
    if (onNavigateToCell) {
      onNavigateToCell(address);
      setShowNameBoxDropdown(false);
    }
  };
  
  // === Function Insert Handler ===
  
  const handleInsertFunction = () => {
    if (onInsertFunction) {
      onInsertFunction();
    } else {
      // Default behavior: start formula with = if not editing
      if (!isEditing) {
        onEditModeChange(true);
        setInputValue('=');
        setShowSuggestions(true);
      }
    }
  };
  
  // === Cancel/Confirm Handlers ===
  
  const handleCancel = () => {
    setInputValue(cellFormula || String(cellValue ?? ''));
    onEditModeChange(false);
    setShowSuggestions(false);
  };
  
  const handleConfirm = () => {
    handleSubmit();
  };

  const formatCellReference = (addr: Address | null): string => {
    if (!addr) return '';
    
    let col = addr.col;
    let letters = '';
    
    while (col > 0) {
      const remainder = (col - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      col = Math.floor((col - 1) / 26);
    }
    
    return `${letters}${addr.row}`;
  };

  const defaultStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    ...style,
  };

  const cellRefStyles: React.CSSProperties = {
    minWidth: '80px',
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontWeight: 600,
    textAlign: 'center',
  };

  const inputStyles: React.CSSProperties = {
    flex: 1,
    padding: '6px 10px',
    border: validationError ? '1px solid #f44336' : '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    outline: 'none',
    backgroundColor: isEditing ? '#fff' : '#fafafa',
  };

  const errorStyles: React.CSSProperties = {
    color: '#f44336',
    fontSize: '12px',
    marginLeft: '8px',
  };
  
  const buttonStyles: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'background-color 0.15s',
  };
  
  const iconButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
  };
  
  const nameBoxContainerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };
  
  const nameBoxInputStyles: React.CSSProperties = {
    minWidth: '100px',
    padding: '4px 24px 4px 8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontWeight: 600,
    textAlign: 'left',
    fontSize: '13px',
    outline: 'none',
  };
  
  const dropdownButtonStyles: React.CSSProperties = {
    position: 'absolute',
    right: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: '10px',
    color: '#666',
  };
  
  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '2px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    minWidth: '150px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
  };
  
  const dropdownItemStyles: React.CSSProperties = {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
  };

  return (
    <div 
      ref={containerRef}
      className={`formula-bar ${className}`} 
      style={{ ...defaultStyles, position: 'relative' }}
    >
      {/* Name Box with Dropdown */}
      <div style={nameBoxContainerStyles}>
        <input
          ref={nameBoxRef}
          type="text"
          value={nameBoxValue}
          onChange={handleNameBoxChange}
          onKeyDown={handleNameBoxKeyDown}
          onFocus={() => nameBoxRef.current?.select()}
          style={nameBoxInputStyles}
          placeholder="A1"
          title="Name Box - Type cell address or select named range"
        />
        <button 
          style={dropdownButtonStyles}
          onClick={handleNameBoxDropdownToggle}
          type="button"
          title="Show named ranges"
        >
          ▼
        </button>
        
        {showNameBoxDropdown && namedRanges.length > 0 && (
          <div style={dropdownStyles}>
            {namedRanges.map((nr, idx) => (
              <div
                key={idx}
                style={dropdownItemStyles}
                onClick={() => {
                  if (typeof nr.address !== 'string') {
                    handleNamedRangeSelect(nr.address);
                  }
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {nr.name}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Function Insert Button */}
      <button
        style={iconButtonStyles}
        onClick={handleInsertFunction}
        type="button"
        title="Insert Function"
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#fff';
        }}
      >
        ƒₓ
      </button>
      
      {/* Cancel Button (shown when editing) */}
      {isEditing && (
        <button
          style={{ ...iconButtonStyles, color: '#d32f2f' }}
          onClick={handleCancel}
          type="button"
          title="Cancel (Esc)"
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#ffebee';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#fff';
          }}
        >
          ✖
        </button>
      )}
      
      {/* Confirm Button (shown when editing) */}
      {isEditing && (
        <button
          style={{ ...iconButtonStyles, color: '#2e7d32' }}
          onClick={handleConfirm}
          type="button"
          title="Confirm (Enter)"
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#e8f5e9';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#fff';
          }}
        >
          ✔
        </button>
      )}
      
      {/* Formula Input */}
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          placeholder="Type = to start a formula (e.g., =SUM(A1:A10), =AVERAGE(B1:B5), =A1+B1*2)"
          style={{ ...inputStyles, width: '100%' }}
        />
        
        <FormulaSuggestions
          input={inputValue}
          cursorPosition={cursorPosition}
          onSelect={handleSuggestionSelect}
          isVisible={showSuggestions}
          highlightedIndex={highlightedIndex}
        />
      </div>
      
      {/* Validation Error */}
      {validationError && (
        <span style={errorStyles}>{validationError}</span>
      )}
    </div>
  );
};

export default FormulaBar;
