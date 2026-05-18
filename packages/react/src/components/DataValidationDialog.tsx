/**
 * DataValidationDialog.tsx
 * 
 * Excel-compatible Data Validation dialog.
 * Three-tab interface: Settings, Input Message, Error Alert.
 * 
 * Features:
 * - Settings tab: Validation criteria (type, operator, formulas)
 * - Input Message tab: Tooltip shown when cell is selected
 * - Error Alert tab: Alert shown when invalid value entered
 * - Live preview of validation rule
 * - Apply to selected range
 * 
 * Usage:
 * ```tsx
 * <DataValidationDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onApply={(rule) => validationEngine.setRule(rule)}
 *   selectedRange={{ startRow: 0, startCol: 0, endRow: 10, endCol: 0, sheet: 0 }}
 * />
 * ```
 */

import React, { useState } from 'react';
import type {
  DataValidationRule,
  DataValidationType,
  ValidationOperator,
  ErrorAlertStyle,
} from '@cyber-sheet/core';
import type { Range } from '@cyber-sheet/core';

export interface DataValidationDialogProps {
  /** Dialog open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Apply validation rule */
  onApply: (rule: DataValidationRule) => void;
  /** Selected range */
  selectedRange: Range;
  /** Existing rule (for editing) */
  existingRule?: DataValidationRule;
}

type TabType = 'settings' | 'inputMessage' | 'errorAlert';

/**
 * Data Validation Dialog Component
 */
export function DataValidationDialog({
  isOpen,
  onClose,
  onApply,
  selectedRange,
  existingRule,
}: DataValidationDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  
  // Settings tab state
  const [validationType, setValidationType] = useState<DataValidationType>(
    existingRule?.type || 'any'
  );
  const [operator, setOperator] = useState<ValidationOperator>(
    existingRule?.operator || 'between'
  );
  const [formula1, setFormula1] = useState(existingRule?.formula1 || '');
  const [formula2, setFormula2] = useState(existingRule?.formula2 || '');
  const [allowBlank, setAllowBlank] = useState(existingRule?.allowBlank !== false);
  const [showDropdown, setShowDropdown] = useState(existingRule?.showDropdown !== false);
  
  // Input Message tab state
  const [showInputMessage, setShowInputMessage] = useState(existingRule?.showInputMessage || false);
  const [inputTitle, setInputTitle] = useState(existingRule?.inputTitle || '');
  const [inputMessage, setInputMessage] = useState(existingRule?.inputMessage || '');
  
  // Error Alert tab state
  const [showErrorAlert, setShowErrorAlert] = useState(existingRule?.showErrorAlert !== false);
  const [errorStyle, setErrorStyle] = useState<ErrorAlertStyle>(existingRule?.errorStyle || 'stop');
  const [errorTitle, setErrorTitle] = useState(existingRule?.errorTitle || '');
  const [errorMessage, setErrorMessage] = useState(existingRule?.errorMessage || '');
  
  if (!isOpen) return null;
  
  const handleApply = () => {
    const rule: DataValidationRule = {
      id: existingRule?.id || `rule-${Date.now()}`,
      range: selectedRange,
      type: validationType,
      operator,
      formula1,
      formula2,
      allowBlank,
      showDropdown,
      showInputMessage,
      inputTitle,
      inputMessage,
      showErrorAlert,
      errorStyle,
      errorTitle,
      errorMessage,
    };
    
    onApply(rule);
    onClose();
  };
  
  const handleClear = () => {
    setValidationType('any');
    setOperator('between');
    setFormula1('');
    setFormula2('');
    setAllowBlank(true);
    setShowDropdown(true);
    setShowInputMessage(false);
    setInputTitle('');
    setInputMessage('');
    setShowErrorAlert(true);
    setErrorStyle('stop');
    setErrorTitle('');
    setErrorMessage('');
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          width: '550px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          fontFamily: 'Segoe UI, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #d1d1d1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Data Validation</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #d1d1d1',
            padding: '0 20px',
          }}
        >
          {(['settings', 'inputMessage', 'errorAlert'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab ? '2px solid #0078d4' : '2px solid transparent',
                color: activeTab === tab ? '#0078d4' : '#666',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {tab === 'settings' && 'Settings'}
              {tab === 'inputMessage' && 'Input Message'}
              {tab === 'errorAlert' && 'Error Alert'}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'settings' && (
            <SettingsTab
              validationType={validationType}
              setValidationType={setValidationType}
              operator={operator}
              setOperator={setOperator}
              formula1={formula1}
              setFormula1={setFormula1}
              formula2={formula2}
              setFormula2={setFormula2}
              allowBlank={allowBlank}
              setAllowBlank={setAllowBlank}
              showDropdown={showDropdown}
              setShowDropdown={setShowDropdown}
            />
          )}
          
          {activeTab === 'inputMessage' && (
            <InputMessageTab
              showInputMessage={showInputMessage}
              setShowInputMessage={setShowInputMessage}
              inputTitle={inputTitle}
              setInputTitle={setInputTitle}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
            />
          )}
          
          {activeTab === 'errorAlert' && (
            <ErrorAlertTab
              showErrorAlert={showErrorAlert}
              setShowErrorAlert={setShowErrorAlert}
              errorStyle={errorStyle}
              setErrorStyle={setErrorStyle}
              errorTitle={errorTitle}
              setErrorTitle={setErrorTitle}
              errorMessage={errorMessage}
              setErrorMessage={setErrorMessage}
            />
          )}
        </div>
        
        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #d1d1d1',
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleClear}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d1d1',
              background: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d1d1',
              background: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: '#0078d4',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings Tab Component
 */
function SettingsTab({
  validationType,
  setValidationType,
  operator,
  setOperator,
  formula1,
  setFormula1,
  formula2,
  setFormula2,
  allowBlank,
  setAllowBlank,
  showDropdown,
  setShowDropdown,
}: {
  validationType: DataValidationType;
  setValidationType: (type: DataValidationType) => void;
  operator: ValidationOperator;
  setOperator: (op: ValidationOperator) => void;
  formula1: string;
  setFormula1: (val: string) => void;
  formula2: string;
  setFormula2: (val: string) => void;
  allowBlank: boolean;
  setAllowBlank: (val: boolean) => void;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
}) {
  const needsOperator = ['whole', 'decimal', 'date', 'time', 'textLength'].includes(validationType);
  const needsFormula2 = needsOperator && (operator === 'between' || operator === 'notBetween');
  const showDropdownOption = validationType === 'list';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Validation Criteria */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
          Allow:
        </label>
        <select
          value={validationType}
          onChange={(e) => setValidationType(e.target.value as DataValidationType)}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
          }}
        >
          <option value="any">Any value</option>
          <option value="list">List</option>
          <option value="whole">Whole number</option>
          <option value="decimal">Decimal</option>
          <option value="date">Date</option>
          <option value="time">Time</option>
          <option value="textLength">Text length</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      
      {/* Operator (for number/date/time/textLength) */}
      {needsOperator && (
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
            Data:
          </label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as ValidationOperator)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
            }}
          >
            <option value="between">between</option>
            <option value="notBetween">not between</option>
            <option value="equal">equal to</option>
            <option value="notEqual">not equal to</option>
            <option value="greaterThan">greater than</option>
            <option value="lessThan">less than</option>
            <option value="greaterOrEqual">greater than or equal to</option>
            <option value="lessOrEqual">less than or equal to</option>
          </select>
        </div>
      )}
      
      {/* Formula 1 / Source */}
      {validationType !== 'any' && (
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
            {validationType === 'list' ? 'Source:' : 
             validationType === 'custom' ? 'Formula:' : 
             needsFormula2 ? 'Minimum:' : 'Value:'}
          </label>
          <input
            type="text"
            value={formula1}
            onChange={(e) => setFormula1(e.target.value)}
            placeholder={
              validationType === 'list' ? 'Item1,Item2,Item3 or =A1:A10' :
              validationType === 'custom' ? '=AND(A1>0, A1<100)' :
              validationType === 'date' ? '2026-01-01' :
              validationType === 'time' ? '09:00' :
              '0'
            }
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
            }}
          />
          {validationType === 'list' && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
              Enter comma-separated values or a cell range reference
            </div>
          )}
        </div>
      )}
      
      {/* Formula 2 (for between/notBetween) */}
      {needsFormula2 && (
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
            Maximum:
          </label>
          <input
            type="text"
            value={formula2}
            onChange={(e) => setFormula2(e.target.value)}
            placeholder={
              validationType === 'date' ? '2026-12-31' :
              validationType === 'time' ? '17:00' :
              '100'
            }
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '13px',
              border: '1px solid #d1d1d1',
              borderRadius: '3px',
            }}
          />
        </div>
      )}
      
      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={allowBlank}
            onChange={(e) => setAllowBlank(e.target.checked)}
          />
          Ignore blank
        </label>
        
        {showDropdownOption && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={showDropdown}
              onChange={(e) => setShowDropdown(e.target.checked)}
            />
            In-cell dropdown
          </label>
        )}
      </div>
    </div>
  );
}

/**
 * Input Message Tab Component
 */
function InputMessageTab({
  showInputMessage,
  setShowInputMessage,
  inputTitle,
  setInputTitle,
  inputMessage,
  setInputMessage,
}: {
  showInputMessage: boolean;
  setShowInputMessage: (val: boolean) => void;
  inputTitle: string;
  setInputTitle: (val: string) => void;
  inputMessage: string;
  setInputMessage: (val: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <input
          type="checkbox"
          checked={showInputMessage}
          onChange={(e) => setShowInputMessage(e.target.checked)}
        />
        Show input message when cell is selected
      </label>
      
      {showInputMessage && (
        <>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Title:
            </label>
            <input
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder="Enter title"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #d1d1d1',
                borderRadius: '3px',
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Input message:
            </label>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Enter message to display"
              rows={4}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #d1d1d1',
                borderRadius: '3px',
                resize: 'vertical',
                fontFamily: 'Segoe UI, sans-serif',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Error Alert Tab Component
 */
function ErrorAlertTab({
  showErrorAlert,
  setShowErrorAlert,
  errorStyle,
  setErrorStyle,
  errorTitle,
  setErrorTitle,
  errorMessage,
  setErrorMessage,
}: {
  showErrorAlert: boolean;
  setShowErrorAlert: (val: boolean) => void;
  errorStyle: ErrorAlertStyle;
  setErrorStyle: (val: ErrorAlertStyle) => void;
  errorTitle: string;
  setErrorTitle: (val: string) => void;
  errorMessage: string;
  setErrorMessage: (val: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <input
          type="checkbox"
          checked={showErrorAlert}
          onChange={(e) => setShowErrorAlert(e.target.checked)}
        />
        Show error alert after invalid data is entered
      </label>
      
      {showErrorAlert && (
        <>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Style:
            </label>
            <select
              value={errorStyle}
              onChange={(e) => setErrorStyle(e.target.value as ErrorAlertStyle)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #d1d1d1',
                borderRadius: '3px',
              }}
            >
              <option value="stop">Stop (prevents invalid input)</option>
              <option value="warning">Warning (warns but allows)</option>
              <option value="information">Information (informational only)</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Title:
            </label>
            <input
              type="text"
              value={errorTitle}
              onChange={(e) => setErrorTitle(e.target.value)}
              placeholder="Enter title"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #d1d1d1',
                borderRadius: '3px',
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
              Error message:
            </label>
            <textarea
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Enter error message"
              rows={4}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #d1d1d1',
                borderRadius: '3px',
                resize: 'vertical',
                fontFamily: 'Segoe UI, sans-serif',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
