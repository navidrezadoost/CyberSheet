/**
 * FunctionLibraryGroup.tsx
 *
 * Formulas Tab - Function Library Group
 * Contains: Insert Function, AutoSum, Recently Used, Financial, Logical, Text,
 * Date & Time, Lookup & Reference, Math & Trig, More Functions
 */

import React, { useState } from 'react';

export interface FunctionLibraryGroupProps {
  onInsertFunction?: () => void;
  onAutoSum?: (type: 'sum' | 'average' | 'count' | 'max' | 'min' | 'more') => void;
  onSelectFunction?: (category: string, functionName: string) => void;
}

export const FunctionLibraryGroup: React.FC<FunctionLibraryGroupProps> = ({
  onInsertFunction,
  onAutoSum,
  onSelectFunction,
}) => {
  const [showAutoSumDropdown, setShowAutoSumDropdown] = useState(false);
  const [showRecentlyUsedDropdown, setShowRecentlyUsedDropdown] = useState(false);
  const [showFinancialDropdown, setShowFinancialDropdown] = useState(false);
  const [showLogicalDropdown, setShowLogicalDropdown] = useState(false);
  const [showTextDropdown, setShowTextDropdown] = useState(false);
  const [showDateTimeDropdown, setShowDateTimeDropdown] = useState(false);
  const [showLookupRefDropdown, setShowLookupRefDropdown] = useState(false);
  const [showMathTrigDropdown, setShowMathTrigDropdown] = useState(false);
  const [showMoreFunctionsDropdown, setShowMoreFunctionsDropdown] = useState(false);

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '4px 8px',
    position: 'relative',
  };

  const topRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  };

  const bottomRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '4px 8px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 3,
    fontSize: 10,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    color: '#333',
    minWidth: 45,
  };

  const largeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    flexDirection: 'column',
    padding: '6px 10px',
    minWidth: 60,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 20,
  };

  const largeIconStyle: React.CSSProperties = {
    fontSize: 28,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Segoe UI, Arial, sans-serif',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    background: '#FFFFFF',
    border: '1px solid #D1D1D1',
    borderRadius: 3,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: 180,
    maxHeight: 400,
    overflowY: 'auto',
    marginTop: 2,
  };

  const dropdownItemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    borderBottom: '1px solid #F0F0F0',
  };

  const autoSumOptions = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count Numbers', value: 'count' },
    { label: 'Max', value: 'max' },
    { label: 'Min', value: 'min' },
    { label: 'More Functions...', value: 'more' },
  ];

  const recentlyUsedFunctions = ['SUM', 'AVERAGE', 'IF', 'VLOOKUP', 'COUNT', 'MAX', 'MIN', 'ROUND', 'TODAY', 'CONCATENATE'];
  
  const financialFunctions = ['PMT', 'FV', 'PV', 'RATE', 'NPER', 'NPV', 'IRR', 'XNPV', 'XIRR', 'MIRR', 'DB', 'DDB', 'SLN', 'SYD'];
  
  const logicalFunctions = ['IF', 'AND', 'OR', 'NOT', 'IFERROR', 'IFNA', 'IFS', 'SWITCH', 'TRUE', 'FALSE', 'XOR'];
  
  const textFunctions = ['LEFT', 'RIGHT', 'MID', 'LEN', 'CONCATENATE', 'CONCAT', 'TEXTJOIN', 'TRIM', 'UPPER', 'LOWER', 'PROPER', 'SUBSTITUTE', 'REPLACE', 'FIND', 'SEARCH'];
  
  const dateTimeFunctions = ['TODAY', 'NOW', 'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'EDATE', 'EOMONTH', 'NETWORKDAYS', 'WORKDAY', 'DATEDIF'];
  
  const lookupRefFunctions = ['VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'INDEX', 'MATCH', 'INDIRECT', 'OFFSET', 'CHOOSE', 'LOOKUP', 'ADDRESS', 'ROW', 'COLUMN', 'ROWS', 'COLUMNS'];
  
  const mathTrigFunctions = ['SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR', 'TRUNC', 'MOD', 'ABS', 'POWER', 'SQRT', 'EXP', 'LN', 'LOG', 'LOG10', 'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'PI', 'RADIANS', 'DEGREES'];
  
  const moreFunctionsCategories = ['Statistical', 'Engineering', 'Cube', 'Information', 'Compatibility', 'Web'];

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean): void => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (isEnter) {
      btn.style.background = '#E8E8E8';
      btn.style.borderColor = '#D1D1D1';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'transparent';
    }
  };

  return (
    <div style={groupStyle}>
      <div style={topRowStyle}>
        {/* Insert Function (fx) - Large */}
        <button
          style={largeButtonStyle}
          onClick={() => onInsertFunction?.()}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          title="Insert Function"
        >
          <span style={largeIconStyle}>𝑓ₓ</span>
          <span>Insert<br/>Function</span>
        </button>

        {/* AutoSum - Split button */}
        <div style={{ position: 'relative' }}>
          <button
            style={largeButtonStyle}
            onClick={() => setShowAutoSumDropdown(!showAutoSumDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
            title="AutoSum"
          >
            <span style={largeIconStyle}>Σ</span>
            <span>AutoSum ▾</span>
          </button>

          {showAutoSumDropdown && (
            <div style={dropdownStyle}>
              {autoSumOptions.map((option, index) => (
                <div
                  key={option.value}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === autoSumOptions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowAutoSumDropdown(false);
                    onAutoSum?.(option.value as any);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={bottomRowStyle}>
        {/* Recently Used */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowRecentlyUsedDropdown(!showRecentlyUsedDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>�</span>
            <span>Recently<br/>Used</span>
          </button>

          {showRecentlyUsedDropdown && (
            <div style={dropdownStyle}>
              {recentlyUsedFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === recentlyUsedFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowRecentlyUsedDropdown(false);
                    onSelectFunction?.('recent', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowFinancialDropdown(!showFinancialDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>💰</span>
            <span>Financial</span>
          </button>

          {showFinancialDropdown && (
            <div style={dropdownStyle}>
              {financialFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === financialFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowFinancialDropdown(false);
                    onSelectFunction?.('financial', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logical */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowLogicalDropdown(!showLogicalDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>🔀</span>
            <span>Logical</span>
          </button>

          {showLogicalDropdown && (
            <div style={dropdownStyle}>
              {logicalFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === logicalFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowLogicalDropdown(false);
                    onSelectFunction?.('logical', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Text */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowTextDropdown(!showTextDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>📝</span>
            <span>Text</span>
          </button>

          {showTextDropdown && (
            <div style={dropdownStyle}>
              {textFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === textFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowTextDropdown(false);
                    onSelectFunction?.('text', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowDateTimeDropdown(!showDateTimeDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>📅</span>
            <span>Date &<br/>Time</span>
          </button>

          {showDateTimeDropdown && (
            <div style={dropdownStyle}>
              {dateTimeFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === dateTimeFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowDateTimeDropdown(false);
                    onSelectFunction?.('datetime', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lookup & Reference */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowLookupRefDropdown(!showLookupRefDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>🔍</span>
            <span>Lookup &<br/>Reference</span>
          </button>

          {showLookupRefDropdown && (
            <div style={dropdownStyle}>
              {lookupRefFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === lookupRefFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowLookupRefDropdown(false);
                    onSelectFunction?.('lookup', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Math & Trig */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowMathTrigDropdown(!showMathTrigDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>➕</span>
            <span>Math &<br/>Trig</span>
          </button>

          {showMathTrigDropdown && (
            <div style={dropdownStyle}>
              {mathTrigFunctions.map((func, index) => (
                <div
                  key={func}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === mathTrigFunctions.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowMathTrigDropdown(false);
                    onSelectFunction?.('math', func);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {func}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* More Functions */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => setShowMoreFunctionsDropdown(!showMoreFunctionsDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>⋯</span>
            <span>More<br/>Functions</span>
          </button>

          {showMoreFunctionsDropdown && (
            <div style={dropdownStyle}>
              {moreFunctionsCategories.map((category, index) => (
                <div
                  key={category}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === moreFunctionsCategories.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowMoreFunctionsDropdown(false);
                    onSelectFunction?.('more', category);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {category} ▸
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={labelStyle}>Function Library</div>
    </div>
  );
};
