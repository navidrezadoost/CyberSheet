/**
 * StylesGroup.tsx
 * 
 * Styles group for Home ribbon tab
 * Provides conditional formatting, Format as Table, and Cell Styles
 * 
 * Microinteractions:
 * - Format gallery hover highlights
 * - Data bars animate on application
 * - Color scales pulse on first application
 * - Icon sets animate in sequence
 * 
 * Phase 3: Excel 365-Level Styles Controls
 */

import { StylesGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useRef, useEffect } from 'react';
import type { Address, Range } from '@cyber-sheet/core';
import type { FormattingController } from '@cyber-sheet/core';
import { getCellStyle } from '@cyber-sheet/core';
import { CellStylesGallery } from '../CellStylesGallery';

export interface StylesGroupProps {
  formattingController: FormattingController;
  selectedCells: Address[];
  currentRange?: Range;
  onStyleChange?: () => void;
}

/**
 * Conditional formatting rule type
 */
export interface ConditionalFormatRule {
  id: string;
  type: 'highlightCells' | 'topBottom' | 'dataBars' | 'colorScales' | 'iconSets';
  condition: string;
  format: any;
  priority: number;
  stopIfTrue: boolean;
}

/**
 * Table style definition
 */
export interface TableStyle {
  id: string;
  name: string;
  category: 'Light' | 'Medium' | 'Dark';
  headerRowColor: string;
  firstRowStripedColor: string;
  secondRowStripedColor: string;
  lastRowColor?: string;
  firstColumnColor?: string;
  lastColumnColor?: string;
}

/**
 * Cell style preset
 */
export interface CellStylePreset {
  id: string;
  name: string;
  category: 'Good/Bad/Neutral' | 'Data & Model' | 'Titles & Headings' | 'Themed Cell Styles' | 'Number Format';
  style: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    backgroundColor?: string;
    border?: any;
    numberFormat?: string;
  };
}

/**
 * Conditional formatting highlight rules
 */
const CF_HIGHLIGHT_RULES = [
  { id: 'greaterThan', label: 'Greater Than...', icon: '>' },
  { id: 'lessThan', label: 'Less Than...', icon: '<' },
  { id: 'between', label: 'Between...', icon: '⇔' },
  { id: 'equalTo', label: 'Equal To...', icon: '=' },
  { id: 'textContains', label: 'Text that Contains...', icon: 'A' },
  { id: 'dateOccurring', label: 'A Date Occurring...', icon: '📅' },
  { id: 'duplicateValues', label: 'Duplicate Values', icon: '⚬⚬' },
  { id: 'uniqueValues', label: 'Unique Values', icon: '⚬' },
];

/**
 * Top/Bottom rules
 */
const CF_TOP_BOTTOM_RULES = [
  { id: 'top10', label: 'Top 10 Items...', icon: '🔟' },
  { id: 'top10Percent', label: 'Top 10%...', icon: '%' },
  { id: 'bottom10', label: 'Bottom 10 Items...', icon: '🔟' },
  { id: 'bottom10Percent', label: 'Bottom 10%...', icon: '%' },
  { id: 'aboveAverage', label: 'Above Average...', icon: '↑' },
  { id: 'belowAverage', label: 'Below Average...', icon: '↓' },
];

/**
 * Data bar styles
 */
const CF_DATA_BAR_STYLES = [
  { id: 'blueDataBar', label: 'Blue Data Bar', color: '#4472C4' },
  { id: 'greenDataBar', label: 'Green Data Bar', color: '#70AD47' },
  { id: 'redDataBar', label: 'Red Data Bar', color: '#FF0000' },
  { id: 'orangeDataBar', label: 'Orange Data Bar', color: '#ED7D31' },
  { id: 'lightBlueDataBar', label: 'Light Blue Data Bar', color: '#5B9BD5' },
  { id: 'purpleDataBar', label: 'Purple Data Bar', color: '#7030A0' },
];

/**
 * Color scale presets
 */
const CF_COLOR_SCALES = [
  { id: 'greenYellowRed', label: 'Green - Yellow - Red', colors: ['#63BE7B', '#FFEB84', '#F8696B'] },
  { id: 'redYellowGreen', label: 'Red - Yellow - Green', colors: ['#F8696B', '#FFEB84', '#63BE7B'] },
  { id: 'greenWhiteRed', label: 'Green - White - Red', colors: ['#63BE7B', '#FFFFFF', '#F8696B'] },
  { id: 'redWhiteGreen', label: 'Red - White - Green', colors: ['#F8696B', '#FFFFFF', '#63BE7B'] },
  { id: 'blueWhiteRed', label: 'Blue - White - Red', colors: ['#5A8AC6', '#FFFFFF', '#F8696B'] },
  { id: 'redWhiteBlue', label: 'Red - White - Blue', colors: ['#F8696B', '#FFFFFF', '#5A8AC6'] },
];

/**
 * Icon set options
 */
const CF_ICON_SETS = [
  { id: 'threeArrows', label: '3 Arrows', icons: ['↑', '→', '↓'] },
  { id: 'threeArrowsGray', label: '3 Arrows (Gray)', icons: ['↑', '→', '↓'] },
  { id: 'threeTriangles', label: '3 Triangles', icons: ['▲', '▶', '▼'] },
  { id: 'threeFlags', label: '3 Flags', icons: ['🚩', '🟨', '⚐'] },
  { id: 'threeTrafficLights', label: '3 Traffic Lights', icons: ['🔴', '🟡', '🟢'] },
  { id: 'threeStars', label: '3 Stars', icons: ['★', '☆', '✩'] },
  { id: 'fourArrows', label: '4 Arrows', icons: ['↑', '↗', '→', '↓'] },
  { id: 'fiveArrows', label: '5 Arrows', icons: ['↑', '↗', '→', '↘', '↓'] },
];

/**
 * Table styles (21 presets)
 */
const TABLE_STYLES: TableStyle[] = [
  // Light styles (7)
  { id: 'light1', name: 'Table Style Light 1', category: 'Light', headerRowColor: '#4472C4', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  { id: 'light2', name: 'Table Style Light 2', category: 'Light', headerRowColor: '#ED7D31', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  { id: 'light3', name: 'Table Style Light 3', category: 'Light', headerRowColor: '#A5A5A5', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  { id: 'light4', name: 'Table Style Light 4', category: 'Light', headerRowColor: '#FFC000', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  { id: 'light5', name: 'Table Style Light 5', category: 'Light', headerRowColor: '#5B9BD5', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  { id: 'light6', name: 'Table Style Light 6', category: 'Light', headerRowColor: '#70AD47', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  { id: 'light7', name: 'Table Style Light 7', category: 'Light', headerRowColor: '#7030A0', firstRowStripedColor: '#FFFFFF', secondRowStripedColor: '#F2F2F2' },
  
  // Medium styles (7)
  { id: 'medium1', name: 'Table Style Medium 1', category: 'Medium', headerRowColor: '#4472C4', firstRowStripedColor: '#D9E2F3', secondRowStripedColor: '#FFFFFF' },
  { id: 'medium2', name: 'Table Style Medium 2', category: 'Medium', headerRowColor: '#ED7D31', firstRowStripedColor: '#FCE4D6', secondRowStripedColor: '#FFFFFF' },
  { id: 'medium3', name: 'Table Style Medium 3', category: 'Medium', headerRowColor: '#A5A5A5', firstRowStripedColor: '#EDEDED', secondRowStripedColor: '#FFFFFF' },
  { id: 'medium4', name: 'Table Style Medium 4', category: 'Medium', headerRowColor: '#FFC000', firstRowStripedColor: '#FFE699', secondRowStripedColor: '#FFFFFF' },
  { id: 'medium5', name: 'Table Style Medium 5', category: 'Medium', headerRowColor: '#5B9BD5', firstRowStripedColor: '#DDEBF7', secondRowStripedColor: '#FFFFFF' },
  { id: 'medium6', name: 'Table Style Medium 6', category: 'Medium', headerRowColor: '#70AD47', firstRowStripedColor: '#E2EFDA', secondRowStripedColor: '#FFFFFF' },
  { id: 'medium7', name: 'Table Style Medium 7', category: 'Medium', headerRowColor: '#7030A0', firstRowStripedColor: '#E4DFEC', secondRowStripedColor: '#FFFFFF' },
  
  // Dark styles (7)
  { id: 'dark1', name: 'Table Style Dark 1', category: 'Dark', headerRowColor: '#2E75B5', firstRowStripedColor: '#4472C4', secondRowStripedColor: '#2E5C8A' },
  { id: 'dark2', name: 'Table Style Dark 2', category: 'Dark', headerRowColor: '#C65911', firstRowStripedColor: '#ED7D31', secondRowStripedColor: '#A64B1F' },
  { id: 'dark3', name: 'Table Style Dark 3', category: 'Dark', headerRowColor: '#7F7F7F', firstRowStripedColor: '#A5A5A5', secondRowStripedColor: '#595959' },
  { id: 'dark4', name: 'Table Style Dark 4', category: 'Dark', headerRowColor: '#BF9000', firstRowStripedColor: '#FFC000', secondRowStripedColor: '#997300' },
  { id: 'dark5', name: 'Table Style Dark 5', category: 'Dark', headerRowColor: '#2E75B5', firstRowStripedColor: '#5B9BD5', secondRowStripedColor: '#1F4E78' },
  { id: 'dark6', name: 'Table Style Dark 6', category: 'Dark', headerRowColor: '#548235', firstRowStripedColor: '#70AD47', secondRowStripedColor: '#3F6826' },
  { id: 'dark7', name: 'Table Style Dark 7', category: 'Dark', headerRowColor: '#5B2C91', firstRowStripedColor: '#7030A0', secondRowStripedColor: '#3D1E61' },
];

/**
 * Cell style presets
 */
const CELL_STYLES: CellStylePreset[] = [
  // Good/Bad/Neutral
  { id: 'good', name: 'Good', category: 'Good/Bad/Neutral', style: { backgroundColor: '#C6EFCE', color: '#006100' } },
  { id: 'bad', name: 'Bad', category: 'Good/Bad/Neutral', style: { backgroundColor: '#FFC7CE', color: '#9C0006' } },
  { id: 'neutral', name: 'Neutral', category: 'Good/Bad/Neutral', style: { backgroundColor: '#FFEB9C', color: '#9C6500' } },
  
  // Data & Model
  { id: 'calculation', name: 'Calculation', category: 'Data & Model', style: { backgroundColor: '#F2F2F2', color: '#FA7D00', bold: true } },
  { id: 'checkCell', name: 'Check Cell', category: 'Data & Model', style: { backgroundColor: '#A5A5A5', color: '#FFFFFF', bold: true } },
  { id: 'input', name: 'Input', category: 'Data & Model', style: { backgroundColor: '#FFCC99', color: '#3F3F76' } },
  { id: 'linkedCell', name: 'Linked Cell', category: 'Data & Model', style: { backgroundColor: '#FFCC99', color: '#FA7D00' } },
  { id: 'note', name: 'Note', category: 'Data & Model', style: { backgroundColor: '#FFFFCC', color: '#000000', border: { top: '1px solid #B2B2B2', bottom: '1px solid #B2B2B2', left: '1px solid #B2B2B2', right: '1px solid #B2B2B2' } } },
  { id: 'output', name: 'Output', category: 'Data & Model', style: { backgroundColor: '#F2F2F2', color: '#3F3F3F', bold: true } },
  { id: 'warningText', name: 'Warning Text', category: 'Data & Model', style: { color: '#FF0000' } },
  
  // Titles & Headings
  { id: 'heading1', name: 'Heading 1', category: 'Titles & Headings', style: { fontSize: 15, bold: true, color: '#4472C4', border: { bottom: '#4472C4' } } },
  { id: 'heading2', name: 'Heading 2', category: 'Titles & Headings', style: { fontSize: 13, bold: true, color: '#4472C4' } },
  { id: 'heading3', name: 'Heading 3', category: 'Titles & Headings', style: { fontSize: 11, bold: true, color: '#4472C4' } },
  { id: 'heading4', name: 'Heading 4', category: 'Titles & Headings', style: { fontSize: 11, bold: true, color: '#000000' } },
  { id: 'title', name: 'Title', category: 'Titles & Headings', style: { fontSize: 18, bold: true, color: '#4472C4' } },
  { id: 'total', name: 'Total', category: 'Titles & Headings', style: { bold: true, color: '#4472C4', border: { top: '#4472C4', bottom: '#4472C4' } } },
];

export const StylesGroup: React.FC<StylesGroupProps> = ({
  formattingController,
  selectedCells,
  currentRange,
  onStyleChange,
}) => {
  const [showCFMenu, setShowCFMenu] = useState(false);
  const [showCFSubmenu, setShowCFSubmenu] = useState<string | null>(null);
  const [showTableStylesMenu, setShowTableStylesMenu] = useState(false);
  const [showCellStylesMenu, setShowCellStylesMenu] = useState(false);
  
  const cfMenuRef = useRef(null);
  const tableStylesMenuRef = useRef(null);
  const cellStylesMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cfMenuRef.current && !(cfMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowCFMenu(false);
        setShowCFSubmenu(null);
      }
      if (tableStylesMenuRef.current && !(tableStylesMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowTableStylesMenu(false);
      }
      if (cellStylesMenuRef.current && !(cellStylesMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowCellStylesMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle conditional formatting rule selection
   */
  const handleCFRule = (category: string, ruleId: string) => {
    // TODO: Open dialog to configure rule parameters
    // For now, just log the selection
    console.log(`Selected CF rule: ${category}/${ruleId}`);
    setShowCFMenu(false);
    setShowCFSubmenu(null);
    onStyleChange?.();
  };

  /**
   * Handle table style selection
   */
  const handleTableStyle = (styleId: string) => {
    // TODO: Apply table style
    console.log(`Selected table style: ${styleId}`);
    setShowTableStylesMenu(false);
    onStyleChange?.();
  };

  /**
   * Handle cell style selection from gallery
   */
  const handleCellStyle = (styleId: string) => {
    const style = getCellStyle(styleId);
    if (!style) return;

    // Apply style properties via FormattingController
    if (style.fill) {
      formattingController.setFill(selectedCells, style.fill);
    }
    if (style.color) {
      formattingController.setFontColor(selectedCells, style.color);
    }
    if (style.bold !== undefined) {
      formattingController.setBold(selectedCells, style.bold);
    }
    if (style.italic !== undefined) {
      formattingController.setItalic(selectedCells, style.italic);
    }
    if (style.fontSize !== undefined) {
      formattingController.setFontSize(selectedCells, style.fontSize);
    }
    if (style.border) {
      formattingController.setBorder(selectedCells, style.border);
    }
    if (style.numberFormat) {
      formattingController.setNumberFormat(selectedCells, style.numberFormat);
    }

    setShowCellStylesMenu(false);
    onStyleChange?.();
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
    minWidth: '90px',
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
    minWidth: '250px',
    maxHeight: '500px',
    overflowY: 'auto',
    animation: 'slideDown 200ms ease-out',
  };

  const menuItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background 150ms ease',
  };

  // Render CF category submenu
  const renderCFSubmenu = (category: string) => {
    let rules: any[] = [];
    let title = '';

    switch (category) {
      case 'highlight':
        rules = CF_HIGHLIGHT_RULES;
        title = 'Highlight Cells Rules';
        break;
      case 'topBottom':
        rules = CF_TOP_BOTTOM_RULES;
        title = 'Top/Bottom Rules';
        break;
      case 'dataBars':
        rules = CF_DATA_BAR_STYLES;
        title = 'Data Bars';
        break;
      case 'colorScales':
        rules = CF_COLOR_SCALES;
        title = 'Color Scales';
        break;
      case 'iconSets':
        rules = CF_ICON_SETS;
        title = 'Icon Sets';
        break;
    }

    return (
      <div style={{
        ...dropdownStyles,
        left: '100%',
        top: 0,
        marginTop: 0,
        marginLeft: '4px',
      }}>
        <div style={{
          padding: '10px 12px',
          fontWeight: 600,
          fontSize: '12px',
          color: '#666',
          borderBottom: '2px solid #e0e0e0',
        }}>
          {title}
        </div>
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            style={{
              ...menuItemStyles,
              borderBottom: index === rules.length - 1 ? 'none' : '1px solid #f0f0f0',
            }}
            onClick={() => handleCFRule(category, rule.id)}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }}
          >
            {category === 'dataBars' && 'color' in rule && (
              <div style={{
                width: '80px',
                height: '14px',
                background: `linear-gradient(to right, ${rule.color} 70%, transparent 70%)`,
                marginRight: '8px',
                border: '1px solid #ddd',
              }} />
            )}
            {category === 'colorScales' && 'colors' in rule && (
              <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
                {rule.colors.map((color: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      width: '24px',
                      height: '14px',
                      backgroundColor: color,
                      border: '1px solid #ddd',
                    }}
                  />
                ))}
              </div>
            )}
            {category === 'iconSets' && 'icons' in rule && (
              <div style={{ display: 'flex', gap: '2px', marginRight: '8px', fontSize: '14px' }}>
                {rule.icons.map((icon: string, i: number) => (
                  <span key={i}>{icon}</span>
                ))}
              </div>
            )}
            <span style={{ flex: 1 }}>{rule.label}</span>
            {('icon' in rule) && (
              <span style={{ marginLeft: '8px', opacity: 0.6 }}>{rule.icon}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '3px 6px 0 6px',
      borderRight: '1px solid #d0d0d0',
      minHeight: '94px',
      maxHeight: '94px',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '16px' }}>
      {/* Row 1: Conditional Formatting */}
      <div style={{ position: 'relative' }} ref={cfMenuRef}>
        <button
          className="cs-custom-group-button"
          onClick={() => setShowCFMenu(!showCFMenu)}
          title="Conditional Formatting"
        >
          <span style={{ fontSize: '11px' }}>Conditional</span>
          <span style={{ fontSize: '11px' }}>Formatting</span>
          <span className="cs-custom-button-dropdown-arrow">▼</span>
        </button>

        {showCFMenu && (
          <div style={dropdownStyles}>
            {/* Highlight Cells Rules */}
            <div
              style={{ ...menuItemStyles, position: 'relative' }}
              onMouseEnter={() => setShowCFSubmenu('highlight')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                const related = e.relatedTarget as HTMLElement;
                if (!related || !related.closest('[data-submenu="highlight"]')) {
                  setShowCFSubmenu(null);
                }
              }}
            >
              <span>Highlight Cells Rules</span>
              <span>▶</span>
              {showCFSubmenu === 'highlight' && (
                <div data-submenu="highlight">
                  {renderCFSubmenu('highlight')}
                </div>
              )}
            </div>

            {/* Top/Bottom Rules */}
            <div
              style={{ ...menuItemStyles, position: 'relative' }}
              onMouseEnter={() => setShowCFSubmenu('topBottom')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                const related = e.relatedTarget as HTMLElement;
                if (!related || !related.closest('[data-submenu="topBottom"]')) {
                  setShowCFSubmenu(null);
                }
              }}
            >
              <span>Top/Bottom Rules</span>
              <span>▶</span>
              {showCFSubmenu === 'topBottom' && (
                <div data-submenu="topBottom">
                  {renderCFSubmenu('topBottom')}
                </div>
              )}
            </div>

            {/* Data Bars */}
            <div
              style={{ ...menuItemStyles, position: 'relative' }}
              onMouseEnter={() => setShowCFSubmenu('dataBars')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                const related = e.relatedTarget as HTMLElement;
                if (!related || !related.closest('[data-submenu="dataBars"]')) {
                  setShowCFSubmenu(null);
                }
              }}
            >
              <span>Data Bars</span>
              <span>▶</span>
              {showCFSubmenu === 'dataBars' && (
                <div data-submenu="dataBars">
                  {renderCFSubmenu('dataBars')}
                </div>
              )}
            </div>

            {/* Color Scales */}
            <div
              style={{ ...menuItemStyles, position: 'relative' }}
              onMouseEnter={() => setShowCFSubmenu('colorScales')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                const related = e.relatedTarget as HTMLElement;
                if (!related || !related.closest('[data-submenu="colorScales"]')) {
                  setShowCFSubmenu(null);
                }
              }}
            >
              <span>Color Scales</span>
              <span>▶</span>
              {showCFSubmenu === 'colorScales' && (
                <div data-submenu="colorScales">
                  {renderCFSubmenu('colorScales')}
                </div>
              )}
            </div>

            {/* Icon Sets */}
            <div
              style={{ ...menuItemStyles, position: 'relative' }}
              onMouseEnter={() => setShowCFSubmenu('iconSets')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                const related = e.relatedTarget as HTMLElement;
                if (!related || !related.closest('[data-submenu="iconSets"]')) {
                  setShowCFSubmenu(null);
                }
              }}
            >
              <span>Icon Sets</span>
              <span>▶</span>
              {showCFSubmenu === 'iconSets' && (
                <div data-submenu="iconSets">
                  {renderCFSubmenu('iconSets')}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: '#e0e0e0', margin: '4px 0' }} />

            {/* Manage Rules */}
            <div
              style={{ ...menuItemStyles, borderBottom: 'none' }}
              onClick={() => {
                console.log('Open Manage Rules dialog');
                setShowCFMenu(false);
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                (e.target as HTMLElement).style.backgroundColor = '#fff';
              }}
            >
              <span>Manage Rules...</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Format as Table */}
      <div style={{ position: 'relative' }} ref={tableStylesMenuRef}>
        <button
          className="cs-custom-group-button"
          onClick={() => setShowTableStylesMenu(!showTableStylesMenu)}
          title="Format as Table"
        >
          <StylesGroupIcon1 />
          <span style={{ fontSize: '11px' }}>Format as</span>
          <span style={{ fontSize: '11px' }}>Table</span>
          <span className="cs-custom-button-dropdown-arrow">▼</span>
        </button>

        {showTableStylesMenu && (
          <div style={{
            ...dropdownStyles,
            minWidth: '400px',
            maxHeight: '450px',
          }}>
            {/* Table Styles Gallery */}
            {['Light', 'Medium', 'Dark'].map(category => (
              <div key={category}>
                <div style={{
                  padding: '8px 12px',
                  fontWeight: 600,
                  fontSize: '11px',
                  color: '#666',
                  background: '#f5f5f5',
                }}>
                  {category}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '12px',
                }}>
                  {TABLE_STYLES.filter(s => s.category === category).map(style => (
                    <div
                      key={style.id}
                      style={{
                        cursor: 'pointer',
                        border: '1px solid #d0d0d0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                      }}
                      onClick={() => handleTableStyle(style.id)}
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                      title={style.name}
                    >
                      {/* Table preview */}
                      <div style={{ height: '60px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '20px', backgroundColor: style.headerRowColor }} />
                        <div style={{ height: '13px', backgroundColor: style.firstRowStripedColor }} />
                        <div style={{ height: '13px', backgroundColor: style.secondRowStripedColor }} />
                        <div style={{ height: '14px', backgroundColor: style.firstRowStripedColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Cell Styles */}
      <div style={{ position: 'relative' }} ref={cellStylesMenuRef}>
        <button
          className="cs-custom-group-button"
          onClick={() => setShowCellStylesMenu(!showCellStylesMenu)}
          title="Cell Styles"
        >
          <span style={{ fontSize: '11px' }}>Cell Styles</span>
          <span className="cs-custom-button-dropdown-arrow">▼</span>
        </button>

        {showCellStylesMenu && (
          <div style={{ ...dropdownStyles }}>
            <CellStylesGallery
              onStyleSelect={handleCellStyle}
              onClose={() => setShowCellStylesMenu(false)}
              hoverPreview={false}
              width="420px"
              maxHeight="500px"
            />
          </div>
        )}
      </div>
      </div>

      <div style={{
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
      }}>Styles</div>

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
        `}
      </style>
    </div>
  );
};
