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

import React, { useState } from 'react';
import type { Address, Worksheet } from '@cyber-sheet/core';
import { ClipboardService, FormattingController, CommandManager } from '@cyber-sheet/core';

export interface ClipboardGroupProps {
  worksheet: Worksheet;
  clipboardService: ClipboardService;
  formattingController: FormattingController;
  commandManager: CommandManager;
  selectedCells: Address[];
  onFormatPainterActivate?: (active: boolean) => void;
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
  onFormatPainterActivate,
  onCut,
  onCopy,
  onPaste,
}) => {
  const [showPasteMenu, setShowPasteMenu] = useState(false);
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [clipboardHasContent, setClipboardHasContent] = useState(false);

  // === Clipboard Handlers ===

  const handleCut = () => {
    if (selectedCells.length === 0) return;

    // Get selection range
    const range = {
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    };

    // Cut to clipboard
    clipboardService.cut(worksheet, range);
    setClipboardHasContent(true);

    // Visual feedback: marching ants border (would be implemented in renderer)
    onCut?.();

    // Optional: Add pulse animation
    document.body.classList.add('clipboard-action-pulse');
    setTimeout(() => document.body.classList.remove('clipboard-action-pulse'), 300);
  };

  const handleCopy = () => {
    if (selectedCells.length === 0) return;

    const range = {
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    };

    clipboardService.copy(worksheet, range);
    setClipboardHasContent(true);

    onCopy?.();

    // Pulse animation
    document.body.classList.add('clipboard-action-pulse');
    setTimeout(() => document.body.classList.remove('clipboard-action-pulse'), 300);
  };

  const handlePaste = () => {
    // This would integrate with PasteCommand
    onPaste?.();

    // Fade-in animation for pasted cells (handled by renderer)
  };

  const handlePasteSpecial = (option: 'values' | 'formulas' | 'formats' | 'all') => {
    // Paste special implementation
    setShowPasteMenu(false);
    onPaste?.();
  };

  const handleFormatPainter = (persistent: boolean = false) => {
    if (formatPainterActive) {
      // Cancel format painter
      formattingController.clearFormatPainter();
      setFormatPainterActive(false);
      onFormatPainterActivate?.(false);
    } else {
      // Activate format painter
      formattingController.copyFormat(selectedCells, persistent);
      setFormatPainterActive(true);
      onFormatPainterActivate?.(true);
      
      // Cursor changes to paintbrush (CSS class applied)
      document.body.classList.add('format-painter-active');
      
      if (!persistent) {
        // Single-click mode: auto-deactivate after one use
        // This would be handled by the renderer/cell click handler
      }
    }
  };

  // === Styles ===

  const groupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px 8px',
    borderRight: '1px solid #d0d0d0',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '11px',
    color: '#444',
    textAlign: 'center',
    marginTop: '2px',
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
      <div style={labelStyles}>Clipboard</div>
      
      {/* Row 1: Large Paste Button */}
      <div style={{ position: 'relative' }}>
        <button
          style={{
            ...largeButtonStyles,
            ...(clipboardHasContent ? {} : { opacity: 0.5, cursor: 'not-allowed' }),
          }}
          onClick={handlePaste}
          onContextMenu={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setShowPasteMenu(!showPasteMenu);
          }}
          disabled={!clipboardHasContent}
          title="Paste (Ctrl+V)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (clipboardHasContent) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          <span style={iconStyles}>📋</span>
          <span>Paste</span>
          <span style={dropdownArrowStyles}>▼</span>
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
          style={buttonStyles}
          onClick={handleCut}
          disabled={selectedCells.length === 0}
          title="Cut (Ctrl+X)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          <span style={iconStyles}>✂️</span>
          Cut
        </button>
        
        <button
          style={buttonStyles}
          onClick={handleCopy}
          disabled={selectedCells.length === 0}
          title="Copy (Ctrl+C)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          <span style={iconStyles}>📄</span>
          Copy
        </button>
        
        <button
          style={{
            ...buttonStyles,
            backgroundColor: formatPainterActive ? '#e3f2fd' : '#fff',
            borderColor: formatPainterActive ? '#2196f3' : '#ccc',
          }}
          onClick={() => handleFormatPainter(false)}
          onDoubleClick={() => handleFormatPainter(true)}
          disabled={selectedCells.length === 0}
          title="Format Painter - Click once for single use, double-click to stay active"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!formatPainterActive) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!formatPainterActive) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <span style={iconStyles}>🖌️</span>
          Painter
        </button>
      </div>
    </div>
  );
};

export default ClipboardGroup;
