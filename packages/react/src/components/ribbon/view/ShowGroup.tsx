/**
 * ShowGroup.tsx
 *
 * View Tab - Show Group
 * Contains: Ruler, Gridlines, Formula Bar, Headings checkboxes
 */

import React, { useState, useCallback } from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface ShowGroupProps {
  workbook: Workbook;
  showRuler?: boolean;
  showGridlines?: boolean;
  showFormulaBar?: boolean;
  showHeadings?: boolean;
  onToggle?: (option: 'ruler' | 'gridlines' | 'formulaBar' | 'headings', value: boolean) => void;
}

export const ShowGroup: React.FC<ShowGroupProps> = ({
  workbook,
  showRuler = false,
  showGridlines = true,
  showFormulaBar = true,
  showHeadings = true,
  onToggle,
}) => {
  const [ruler, setRuler] = useState(showRuler);
  const [gridlines, setGridlines] = useState(showGridlines);
  const [formulaBar, setFormulaBar] = useState(showFormulaBar);
  const [headings, setHeadings] = useState(showHeadings);

  const handleToggle = useCallback((option: 'ruler' | 'gridlines' | 'formulaBar' | 'headings') => {
    let newValue = false;
    
    switch (option) {
      case 'ruler':
        newValue = !ruler;
        setRuler(newValue);
        break;
      case 'gridlines':
        newValue = !gridlines;
        setGridlines(newValue);
        break;
      case 'formulaBar':
        newValue = !formulaBar;
        setFormulaBar(newValue);
        break;
      case 'headings':
        newValue = !headings;
        setHeadings(newValue);
        break;
    }

    onToggle?.(option, newValue);
    console.log(`Toggle ${option}:`, newValue);
  }, [ruler, gridlines, formulaBar, headings, onToggle]);

  const checkboxRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    cursor: 'pointer',
    borderRadius: 2,
    fontSize: 11,
    color: '#333',
    fontFamily: 'Segoe UI, sans-serif',
    transition: 'background 150ms',
  };

  return (
    <div className="formulas-group view-ribbon-group">
      <div className="formulas-group-body view-ribbon-group-body view-ribbon-group-body--column">
      {/* Ruler */}
      <label
        style={checkboxRowStyle}
        onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = '#E8E8E8';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <input
          type="checkbox"
          checked={ruler}
          onChange={() => handleToggle('ruler')}
          style={{ cursor: 'pointer', width: 14, height: 14 }}
        />
        <span>Ruler</span>
      </label>

      {/* Gridlines */}
      <label
        style={checkboxRowStyle}
        onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = '#E8E8E8';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <input
          type="checkbox"
          checked={gridlines}
          onChange={() => handleToggle('gridlines')}
          style={{ cursor: 'pointer', width: 14, height: 14 }}
        />
        <span>Gridlines</span>
      </label>

      {/* Formula Bar */}
      <label
        style={checkboxRowStyle}
        onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = '#E8E8E8';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <input
          type="checkbox"
          checked={formulaBar}
          onChange={() => handleToggle('formulaBar')}
          style={{ cursor: 'pointer', width: 14, height: 14 }}
        />
        <span>Formula Bar</span>
      </label>

      {/* Headings */}
      <label
        style={checkboxRowStyle}
        onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = '#E8E8E8';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <input
          type="checkbox"
          checked={headings}
          onChange={() => handleToggle('headings')}
          style={{ cursor: 'pointer', width: 14, height: 14 }}
        />
        <span>Headings</span>
      </label>
      </div>
      <div className="formulas-group-caption">Show</div>
    </div>
  );
};
