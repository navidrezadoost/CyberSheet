/**
 * data-validation-demo.tsx
 * 
 * Interactive demonstration of Data Validation system with all 7 types.
 * 
 * Showcases:
 * - List validation (dropdown cities)
 * - Whole number validation (age 18-120)
 * - Decimal validation (percentage 0-100)
 * - Date validation (future dates only)
 * - Time validation (business hours 09:00-17:00)
 * - Text length validation (max 50 chars)
 * - Custom formula validation (TODO: requires worksheet context)
 * 
 * Features:
 * - Error alerts with stop/warning/information styles
 * - Input messages shown on cell selection
 * - Real-time validation feedback
 * - Dropdown lists for list validation
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { DataValidationEngine } from '@cyber-sheet/core';
import { DataValidationDialog } from '@cyber-sheet/react';
import type { DataValidationRule } from '@cyber-sheet/core';
import type { Address, Range } from '@cyber-sheet/core';

// Demo instructions overlay
const DemoInstructions: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div style={{
    position: 'fixed',
    top: 20,
    right: 20,
    background: '#fff',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 1000,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h3 style={{ margin: 0, color: '#4CAF50' }}>📋 Data Validation Demo</h3>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '5px',
          color: '#666',
        }}
      >×</button>
    </div>
    
    <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333' }}>
      <p><strong>Try these validation examples:</strong></p>
      <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
        <li><strong>City:</strong> Select from dropdown (List validation)</li>
        <li><strong>Age:</strong> Enter 18-120 (Whole number validation)</li>
        <li><strong>Score:</strong> Enter 0-100 with decimals (Decimal validation)</li>
        <li><strong>Start Date:</strong> Enter future date (Date validation)</li>
        <li><strong>Work Hours:</strong> Enter 09:00-17:00 (Time validation)</li>
        <li><strong>Comments:</strong> Max 50 characters (Text length validation)</li>
        <li><strong>Budget:</strong> Must be > 0 (Number validation)</li>
      </ul>
      
      <p><strong>Error Styles:</strong></p>
      <ul style={{ paddingLeft: '20px', margin: '10px 0', fontSize: '13px' }}>
        <li>🛑 <strong>Stop:</strong> Prevents invalid input</li>
        <li>⚠️ <strong>Warning:</strong> Warns but allows entry</li>
        <li>ℹ️ <strong>Information:</strong> Informational only</li>
      </ul>
    </div>
  </div>
);

// Validation result display component
interface ValidationResultDisplayProps {
  result: {
    valid: boolean;
    errorTitle?: string;
    errorMessage?: string;
    errorStyle?: 'stop' | 'warning' | 'information';
  } | null;
}

const ValidationResultDisplay: React.FC<ValidationResultDisplayProps> = ({ result }) => {
  if (!result || result.valid) return null;
  
  const icons = {
    stop: '🛑',
    warning: '⚠️',
    information: 'ℹ️',
  };
  
  const colors = {
    stop: '#f44336',
    warning: '#ff9800',
    information: '#2196F3',
  };
  
  const style = result.errorStyle || 'stop';
  
  return (
    <div style={{
      background: colors[style] + '20',
      border: `2px solid ${colors[style]}`,
      borderRadius: '6px',
      padding: '12px',
      marginTop: '10px',
      fontSize: '14px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: colors[style] }}>
        {icons[style]} {result.errorTitle}
      </div>
      <div style={{ color: '#666' }}>
        {result.errorMessage}
      </div>
    </div>
  );
};

// Main demo component
const DataValidationDemo: React.FC = () => {
  const [engine] = useState(() => new DataValidationEngine());
  const [showInstructions, setShowInstructions] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [existingRule, setExistingRule] = useState<DataValidationRule | null>(null);
  
  // Form state for testing validation
  const [formData, setFormData] = useState({
    city: '',
    age: '',
    score: '',
    startDate: '',
    workHours: '',
    comments: '',
    budget: '',
  });
  
  const [validationResults, setValidationResults] = useState<{
    [key: string]: { valid: boolean; errorTitle?: string; errorMessage?: string; errorStyle?: any } | null;
  }>({});
  
  // Initialize validation rules
  useEffect(() => {
    // 1. List validation: City dropdown
    engine.setRule({
      id: 'city-rule',
      range: { start: { row: 1, col: 0 }, end: { row: 100, col: 0 } },
      type: 'list',
      formula1: 'Tehran,Shiraz,Isfahan,Mashhad,Tabriz,Karaj',
      showDropdown: true,
      showInputMessage: true,
      inputTitle: 'Select City',
      inputMessage: 'Please select a city from the dropdown list.',
      showErrorAlert: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid City',
      errorMessage: 'You must select a city from the list.',
    });
    
    // 2. Whole number validation: Age 18-120
    engine.setRule({
      id: 'age-rule',
      range: { start: { row: 1, col: 1 }, end: { row: 100, col: 1 } },
      type: 'whole',
      operator: 'between',
      formula1: '18',
      formula2: '120',
      showInputMessage: true,
      inputTitle: 'Enter Age',
      inputMessage: 'Please enter your age (18-120 years).',
      showErrorAlert: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid Age',
      errorMessage: 'Age must be a whole number between 18 and 120.',
    });
    
    // 3. Decimal validation: Score 0-100
    engine.setRule({
      id: 'score-rule',
      range: { start: { row: 1, col: 2 }, end: { row: 100, col: 2 } },
      type: 'decimal',
      operator: 'between',
      formula1: '0',
      formula2: '100',
      showInputMessage: true,
      inputTitle: 'Enter Score',
      inputMessage: 'Please enter a score between 0 and 100.',
      showErrorAlert: true,
      errorStyle: 'warning',
      errorTitle: 'Score Out of Range',
      errorMessage: 'Score should be between 0 and 100. Are you sure?',
    });
    
    // 4. Date validation: Future dates only
    engine.setRule({
      id: 'date-rule',
      range: { start: { row: 1, col: 3 }, end: { row: 100, col: 3 } },
      type: 'date',
      operator: 'greaterThan',
      formula1: '2026-01-01',
      showInputMessage: true,
      inputTitle: 'Enter Start Date',
      inputMessage: 'Please enter a future date (after 2026-01-01).',
      showErrorAlert: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid Date',
      errorMessage: 'Start date must be after 2026-01-01.',
    });
    
    // 5. Time validation: Business hours 09:00-17:00
    engine.setRule({
      id: 'time-rule',
      range: { start: { row: 1, col: 4 }, end: { row: 100, col: 4 } },
      type: 'time',
      operator: 'between',
      formula1: '09:00',
      formula2: '17:00',
      showInputMessage: true,
      inputTitle: 'Enter Work Hours',
      inputMessage: 'Please enter time between 09:00 and 17:00.',
      showErrorAlert: true,
      errorStyle: 'information',
      errorTitle: 'Outside Business Hours',
      errorMessage: 'This time is outside regular business hours (09:00-17:00).',
    });
    
    // 6. Text length validation: Max 50 chars
    engine.setRule({
      id: 'text-length-rule',
      range: { start: { row: 1, col: 5 }, end: { row: 100, col: 5 } },
      type: 'textLength',
      operator: 'lessThan',
      formula1: '50',
      showInputMessage: true,
      inputTitle: 'Enter Comments',
      inputMessage: 'Comments must be less than 50 characters.',
      showErrorAlert: true,
      errorStyle: 'stop',
      errorTitle: 'Text Too Long',
      errorMessage: 'Comments must be less than 50 characters.',
    });
    
    // 7. Number validation: Budget > 0
    engine.setRule({
      id: 'budget-rule',
      range: { start: { row: 1, col: 6 }, end: { row: 100, col: 6 } },
      type: 'decimal',
      operator: 'greaterThan',
      formula1: '0',
      showInputMessage: true,
      inputTitle: 'Enter Budget',
      inputMessage: 'Please enter a budget amount greater than 0.',
      showErrorAlert: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid Budget',
      errorMessage: 'Budget must be greater than 0.',
    });
  }, [engine]);
  
  // Validate field
  const validateField = (fieldName: string, value: any, col: number) => {
    const address: Address = { row: 1, col };
    const result = engine.validateCell(address, value);
    
    setValidationResults(prev => ({
      ...prev,
      [fieldName]: result,
    }));
    
    return result.valid;
  };
  
  // Handle field change
  const handleFieldChange = (fieldName: string, value: string, col: number) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    
    validateField(fieldName, value, col);
  };
  
  // Open validation dialog
  const openDialog = (range: Range) => {
    setSelectedRange(range);
    const address: Address = { row: range.start.row, col: range.start.col };
    const rule = engine.getRule(address);
    setExistingRule(rule);
    setShowDialog(true);
  };
  
  // Apply validation rule from dialog
  const handleApply = (rule: DataValidationRule) => {
    engine.setRule(rule);
    setShowDialog(false);
  };
  
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingTop: '60px',
    }}>
      {showInstructions && <DemoInstructions onClose={() => setShowInstructions(false)} />}
      
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '30px',
        color: 'white',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>
          Data Validation Demo
        </h1>
        <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
          Excel-compatible validation with 7 types: List, Whole, Decimal, Date, Time, Text Length, Custom
        </p>
      </div>
      
      {/* Validation Form */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>Try Validation Examples</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* City (List) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              City (List Validation)
            </label>
            <select
              value={formData.city}
              onChange={(e) => handleFieldChange('city', e.target.value, 0)}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.city?.valid === false ? '#f44336' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="">-- Select City --</option>
              <option value="Tehran">Tehran</option>
              <option value="Shiraz">Shiraz</option>
              <option value="Isfahan">Isfahan</option>
              <option value="Mashhad">Mashhad</option>
              <option value="Tabriz">Tabriz</option>
              <option value="Karaj">Karaj</option>
            </select>
            <ValidationResultDisplay result={validationResults.city} />
          </div>
          
          {/* Age (Whole Number) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              Age (Whole Number: 18-120)
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => handleFieldChange('age', e.target.value, 1)}
              placeholder="Enter age (18-120)"
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.age?.valid === false ? '#f44336' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <ValidationResultDisplay result={validationResults.age} />
          </div>
          
          {/* Score (Decimal) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              Score (Decimal: 0-100)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.score}
              onChange={(e) => handleFieldChange('score', e.target.value, 2)}
              placeholder="Enter score (0-100)"
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.score?.valid === false ? '#ff9800' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <ValidationResultDisplay result={validationResults.score} />
          </div>
          
          {/* Start Date (Date) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              Start Date (After 2026-01-01)
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleFieldChange('startDate', e.target.value, 3)}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.startDate?.valid === false ? '#f44336' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <ValidationResultDisplay result={validationResults.startDate} />
          </div>
          
          {/* Work Hours (Time) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              Work Hours (09:00-17:00)
            </label>
            <input
              type="time"
              value={formData.workHours}
              onChange={(e) => handleFieldChange('workHours', e.target.value, 4)}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.workHours?.valid === false ? '#2196F3' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <ValidationResultDisplay result={validationResults.workHours} />
          </div>
          
          {/* Comments (Text Length) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              Comments (Max 50 chars)
            </label>
            <input
              type="text"
              value={formData.comments}
              onChange={(e) => handleFieldChange('comments', e.target.value, 5)}
              placeholder="Enter comments (max 50 characters)"
              maxLength={100}
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.comments?.valid === false ? '#f44336' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {formData.comments.length} / 50 characters
            </div>
            <ValidationResultDisplay result={validationResults.comments} />
          </div>
          
          {/* Budget (Decimal > 0) */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
              Budget (Greater than 0)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.budget}
              onChange={(e) => handleFieldChange('budget', e.target.value, 6)}
              placeholder="Enter budget amount"
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${validationResults.budget?.valid === false ? '#f44336' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <ValidationResultDisplay result={validationResults.budget} />
          </div>
        </div>
      </div>
      
      {/* Validation Rules Summary */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginTop: '30px',
      }}>
        <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>Active Validation Rules</h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          {engine.getAllRules().map((rule) => (
            <div
              key={rule.id}
              style={{
                background: '#f5f5f5',
                padding: '15px',
                borderRadius: '6px',
                borderLeft: '4px solid #667eea',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                    {rule.type.toUpperCase()} Validation
                    {rule.operator && ` (${rule.operator})`}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {rule.inputMessage || 'No input message'}
                  </div>
                </div>
                <div style={{
                  background: rule.errorStyle === 'stop' ? '#f44336' : rule.errorStyle === 'warning' ? '#ff9800' : '#2196F3',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}>
                  {rule.errorStyle?.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Data Validation Dialog */}
      {showDialog && selectedRange && (
        <DataValidationDialog
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          onApply={handleApply}
          selectedRange={selectedRange}
          existingRule={existingRule}
        />
      )}
    </div>
  );
};

// Mount the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DataValidationDemo />);
} else {
  console.error('Root element not found');
}
