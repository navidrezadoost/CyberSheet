/**
 * ClipboardGroup.tsx
 * 
 * Clipboard group for Home ribbon tab
 * Provides Cut, Copy, Paste, and Format Painter functionality
 * 
 * Microinteractions:
 * - Pulse effect on copy/cut
 * - Marching ants border visual
 * - Format painter cursor change
 * - Paste dropdown with smooth animation
 */

import React, { useRef, useState } from 'react';
import type { Address, Range, Worksheet } from '@cyber-sheet/core';
import { FormattingController, CommandManager, ClipboardService } from '@cyber-sheet/core';
import {
  performCopy,
  performCut,
  performPasteAsync,
  normalizeSelectionRange,
} from '../../utils/clipboardOperations';

export interface ClipboardGroupProps {
  worksheet: Worksheet;
  clipboardService: ClipboardService;
  formattingController: FormattingController;
  commandManager: CommandManager;
  selectedCells: Address[];
  currentRange?: Range;
  onAfterClipboard?: () => void;
  onCutComplete?: (range: Range) => void;
  onFormatPainterActivate?: (active: boolean) => void;
  formatPainterActive?: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
}

export const ClipboardGroup: React.FC<ClipboardGroupProps> = ({
  worksheet,
  clipboardService,
  formattingController,
  commandManager,
  selectedCells,
  currentRange,
  onAfterClipboard,
  onCutComplete,
  onFormatPainterActivate,
  formatPainterActive: formatPainterActiveProp,
  onCut,
  onCopy,
  onPaste,
}) => {
  const [showPasteMenu, setShowPasteMenu] = useState(false);
  const [formatPainterActiveInternal, setFormatPainterActiveInternal] = useState(false);
  const formatPainterClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formatPainterActive = formatPainterActiveProp ?? formatPainterActiveInternal;

  const setFormatPainterActive = (active: boolean) => {
    if (formatPainterActiveProp === undefined) {
      setFormatPainterActiveInternal(active);
    }
    onFormatPainterActivate?.(active);
  };
  const [clipboardHasContent, setClipboardHasContent] = useState(false);

  const getRange = (): Range | null => {
    if (currentRange) return normalizeSelectionRange(currentRange);
    if (selectedCells.length === 0) return null;
    return normalizeSelectionRange({
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    });
  };

  // === Clipboard Handlers ===

  const handleCut = () => {
    const range = getRange();
    if (!range) return;

    performCut(worksheet, clipboardService, range);
    setClipboardHasContent(true);
    onCutComplete?.(range);
    onCut?.();
    onAfterClipboard?.();

    document.body.classList.add('clipboard-action-pulse');
    setTimeout(() => document.body.classList.remove('clipboard-action-pulse'), 300);
  };

  const handleCopy = () => {
    const range = getRange();
    if (!range) return;

    performCopy(worksheet, clipboardService, range);
    setClipboardHasContent(true);
    onCopy?.();
    onAfterClipboard?.();

    document.body.classList.add('clipboard-action-pulse');
    setTimeout(() => document.body.classList.remove('clipboard-action-pulse'), 300);
  };

  const handlePaste = () => {
    const range = getRange();
    if (!range) return;

    void performPasteAsync(worksheet, commandManager, clipboardService, range.start).then(() => {
      onPaste?.();
      onAfterClipboard?.();
    });
  };

  const handlePasteSpecial = (option: 'values' | 'formulas' | 'formats' | 'all') => {
    // Paste special implementation
    setShowPasteMenu(false);
    onPaste?.();
  };

  const deactivateFormatPainter = () => {
    formattingController.clearFormatPainter();
    setFormatPainterActive(false);
    document.body.classList.remove('format-painter-active');
  };

  const handleFormatPainter = (persistent: boolean = false) => {
    if (formatPainterActive) {
      deactivateFormatPainter();
    } else {
      formattingController.copyFormat(selectedCells, persistent);
      setFormatPainterActive(true);
      document.body.classList.add('format-painter-active');
    }
  };

  const handleFormatPainterClick = () => {
    if (formatPainterClickTimerRef.current) {
      clearTimeout(formatPainterClickTimerRef.current);
    }
    formatPainterClickTimerRef.current = setTimeout(() => {
      handleFormatPainter(false);
      formatPainterClickTimerRef.current = null;
    }, 250);
  };

  const handleFormatPainterDoubleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (formatPainterClickTimerRef.current) {
      clearTimeout(formatPainterClickTimerRef.current);
      formatPainterClickTimerRef.current = null;
    }
    formattingController.copyFormat(selectedCells, true);
    setFormatPainterActive(true);
    document.body.classList.add('format-painter-active');
  };

  // === Styles ===

  const groupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '3px 6px 0 6px',
    borderRight: '1px solid #d0d0d0',
    minHeight: '108px',
    maxHeight: '108px',
    boxSizing: 'border-box',
    position: 'relative',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '11px',
    color: '#605e5c',
    textAlign: 'center',
    padding: '2px 4px 0 4px',
    whiteSpace: 'nowrap',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '16px',
    lineHeight: '16px',
  };

  const buttonRowStyles: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.15s ease',
  };

  const largeButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    flexDirection: 'column',
    padding: '8px 12px',
    fontSize: '11px',
    minWidth: '70px',
  };

  const iconStyles: React.CSSProperties = {
    fontSize: '18px',
  };

  const dropdownArrowStyles: React.CSSProperties = {
    fontSize: '8px',
    marginLeft: '4px',
  };

  const pasteMenuStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '2px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: '180px',
    animation: 'fadeIn 0.2s ease',
  };

  const menuItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
  };

  return (
    <div style={groupStyles}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingBottom: '16px' }}>
        {/* Row 1: Large Paste Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="cs-custom-group-button cs-custom-group-button-large"
            onClick={handlePaste}
            onContextMenu={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              setShowPasteMenu(!showPasteMenu);
            }}
            disabled={!clipboardHasContent}
            title="Paste (Ctrl+V)"
          >
            <span style={iconStyles}>📋</span>
            <span>Paste</span>
            <span className="cs-custom-button-dropdown-arrow">▼</span>
          </button>

        {/* Paste Special Menu */}
        {showPasteMenu && (
          <div style={pasteMenuStyles}>
            <div
              style={menuItemStyles}
              onClick={() => handlePasteSpecial('all')}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              Paste All
            </div>
            <div
              style={menuItemStyles}
              onClick={() => handlePasteSpecial('values')}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              Paste Values Only
            </div>
            <div
              style={menuItemStyles}
              onClick={() => handlePasteSpecial('formulas')}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              Paste Formulas
            </div>
            <div
              style={menuItemStyles}
              onClick={() => handlePasteSpecial('formats')}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              Paste Formats Only
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Cut, Copy, Format Painter */}
      <div style={buttonRowStyles}>
        <button
          className="cs-custom-group-button"
          onClick={handleCut}
          disabled={selectedCells.length === 0}
          title="Cut (Ctrl+X)"
        >
          <span style={iconStyles}>✂️</span>
          Cut
        </button>
        
        <button
          className="cs-custom-group-button"
          onClick={handleCopy}
          disabled={selectedCells.length === 0}
          title="Copy (Ctrl+C)"
        >
          <span style={iconStyles}>📄</span>
          Copy
        </button>
        
        <button
          className="cs-custom-group-button"
          style={{
            backgroundColor: formatPainterActive ? '#e3f2fd' : undefined,
            borderColor: formatPainterActive ? '#2196f3' : undefined,
          }}
          onClick={handleFormatPainterClick}
          onDoubleClick={handleFormatPainterDoubleClick}
          disabled={selectedCells.length === 0}
          title="Format Painter - Click once for single use, double-click to stay active"
        >
          <span style={iconStyles}>🖌️</span>
          Painter
        </button>
      </div>
      </div>

      <div style={labelStyles}>Clipboard</div>
    </div>
  );
};

export default ClipboardGroup;
