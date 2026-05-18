/**
 * data-validation.test.ts
 * 
 * Comprehensive test suite for Data Validation Engine.
 * Tests all 7 validation types, operators, and error handling.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataValidationEngine } from '../src/DataValidationEngine';
import type { DataValidationRule, ValidationOperator } from '../src/DataValidationEngine';
import type { Address, Range } from '../src/types';

describe('DataValidationEngine', () => {
  let engine: DataValidationEngine;
  
  beforeEach(() => {
    engine = new DataValidationEngine();
  });
  
  // ==================== Rule Management ====================
  
  describe('Rule Management', () => {
    it('should add and retrieve validation rules', () => {
      const range: Range = { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } };
      const rule: DataValidationRule = {
        id: 'rule1',
        range,
        type: 'whole',
        operator: 'between',
        formula1: '1',
        formula2: '100',
      };
      
      engine.setRule(rule);
      
      const address: Address = { row: 5, col: 0 };
      const retrieved = engine.getRule(address);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('rule1');
      expect(retrieved?.type).toBe('whole');
    });
    
    it('should remove validation rules', () => {
      const range: Range = { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } };
      const rule: DataValidationRule = {
        id: 'rule1',
        range,
        type: 'whole',
      };
      
      engine.setRule(rule);
      engine.removeRule(range);
      
      const address: Address = { row: 5, col: 0 };
      const retrieved = engine.getRule(address);
      
      expect(retrieved).toBeNull();
    });
    
    it('should return null for cells without validation', () => {
      const address: Address = { row: 5, col: 5 };
      const rule = engine.getRule(address);
      expect(rule).toBeNull();
    });
    
    it('should get all validation rules', () => {
      const rule1: DataValidationRule = {
        id: 'rule1',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
      };
      
      const rule2: DataValidationRule = {
        id: 'rule2',
        range: { start: { row: 0, col: 1 }, end: { row: 10, col: 1 } },
        type: 'list',
      };
      
      engine.setRule(rule1);
      engine.setRule(rule2);
      
      const allRules = engine.getAllRules();
      expect(allRules.length).toBe(2);
    });
  });
  
  // ==================== List Validation ====================
  
  describe('List Validation', () => {
    beforeEach(() => {
      const rule: DataValidationRule = {
        id: 'list-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'list',
        formula1: 'Tehran,Shiraz,Mashhad,Isfahan',
        showDropdown: true,
      };
      engine.setRule(rule);
    });
    
    it('should validate values in list', () => {
      const address: Address = { row: 0, col: 0 };
      const result = engine.validateCell(address, 'Tehran');
      
      expect(result.valid).toBe(true);
      expect(result.showDropdown).toBe(true);
    });
    
    it('should reject values not in list', () => {
      const address: Address = { row: 0, col: 0 };
      const result = engine.validateCell(address, 'Paris');
      
      expect(result.valid).toBe(false);
      expect(result.errorTitle).toBeDefined();
      expect(result.errorMessage).toContain('Tehran');
    });
    
    it('should get dropdown items', () => {
      const address: Address = { row: 0, col: 0 };
      const items = engine.getDropdownItems(address);
      
      expect(items).toEqual(['Tehran', 'Shiraz', 'Mashhad', 'Isfahan']);
    });
    
    it('should indicate dropdown should be shown', () => {
      const address: Address = { row: 0, col: 0 };
      const showDropdown = engine.shouldShowDropdown(address);
      
      expect(showDropdown).toBe(true);
    });
  });
  
  // ==================== Whole Number Validation ====================
  
  describe('Whole Number Validation', () => {
    it('should validate whole numbers with "between" operator', () => {
      const rule: DataValidationRule = {
        id: 'whole-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'between',
        formula1: '1',
        formula2: '100',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, 50).valid).toBe(true);
      expect(engine.validateCell(address, 1).valid).toBe(true);
      expect(engine.validateCell(address, 100).valid).toBe(true);
      expect(engine.validateCell(address, 0).valid).toBe(false);
      expect(engine.validateCell(address, 101).valid).toBe(false);
    });
    
    it('should validate whole numbers with "greaterThan" operator', () => {
      const rule: DataValidationRule = {
        id: 'whole-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, 1).valid).toBe(true);
      expect(engine.validateCell(address, 100).valid).toBe(true);
      expect(engine.validateCell(address, 0).valid).toBe(false);
      expect(engine.validateCell(address, -1).valid).toBe(false);
    });
    
    it('should reject decimal numbers for whole number validation', () => {
      const rule: DataValidationRule = {
        id: 'whole-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      const result = engine.validateCell(address, 1.5);
      
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('whole number');
    });
    
    it('should reject non-numeric values', () => {
      const rule: DataValidationRule = {
        id: 'whole-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      const result = engine.validateCell(address, 'abc');
      
      expect(result.valid).toBe(false);
    });
  });
  
  // ==================== Decimal Validation ====================
  
  describe('Decimal Validation', () => {
    it('should validate decimal numbers', () => {
      const rule: DataValidationRule = {
        id: 'decimal-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'decimal',
        operator: 'between',
        formula1: '0',
        formula2: '1',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, 0.5).valid).toBe(true);
      expect(engine.validateCell(address, 0.999).valid).toBe(true);
      expect(engine.validateCell(address, 0).valid).toBe(true);
      expect(engine.validateCell(address, 1).valid).toBe(true);
      expect(engine.validateCell(address, 1.1).valid).toBe(false);
    });
    
    it('should validate decimal numbers with "lessThan" operator', () => {
      const rule: DataValidationRule = {
        id: 'decimal-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'decimal',
        operator: 'lessThan',
        formula1: '100.5',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, 100.4).valid).toBe(true);
      expect(engine.validateCell(address, 100.5).valid).toBe(false);
      expect(engine.validateCell(address, 100.6).valid).toBe(false);
    });
  });
  
  // ==================== Date Validation ====================
  
  describe('Date Validation', () => {
    it('should validate dates with "greaterThan" operator', () => {
      const rule: DataValidationRule = {
        id: 'date-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'date',
        operator: 'greaterThan',
        formula1: '2026-01-01',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, '2026-06-01').valid).toBe(true);
      expect(engine.validateCell(address, '2026-01-02').valid).toBe(true);
      expect(engine.validateCell(address, '2026-01-01').valid).toBe(false);
      expect(engine.validateCell(address, '2025-12-31').valid).toBe(false);
    });
    
    it('should validate dates with "between" operator', () => {
      const rule: DataValidationRule = {
        id: 'date-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'date',
        operator: 'between',
        formula1: '2026-01-01',
        formula2: '2026-12-31',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, '2026-06-15').valid).toBe(true);
      expect(engine.validateCell(address, '2026-01-01').valid).toBe(true);
      expect(engine.validateCell(address, '2026-12-31').valid).toBe(true);
      expect(engine.validateCell(address, '2025-12-31').valid).toBe(false);
      expect(engine.validateCell(address, '2027-01-01').valid).toBe(false);
    });
    
    it('should reject invalid date formats', () => {
      const rule: DataValidationRule = {
        id: 'date-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'date',
        operator: 'greaterThan',
        formula1: '2026-01-01',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      const result = engine.validateCell(address, 'not-a-date');
      
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('date');
    });
  });
  
  // ==================== Time Validation ====================
  
  describe('Time Validation', () => {
    it('should validate time with "between" operator', () => {
      const rule: DataValidationRule = {
        id: 'time-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'time',
        operator: 'between',
        formula1: '09:00',
        formula2: '17:00',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, '12:00').valid).toBe(true);
      expect(engine.validateCell(address, '09:00').valid).toBe(true);
      expect(engine.validateCell(address, '17:00').valid).toBe(true);
      expect(engine.validateCell(address, '08:59').valid).toBe(false);
      expect(engine.validateCell(address, '17:01').valid).toBe(false);
    });
    
    it('should validate time with "greaterThan" operator', () => {
      const rule: DataValidationRule = {
        id: 'time-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'time',
        operator: 'greaterThan',
        formula1: '12:00',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, '13:00').valid).toBe(true);
      expect(engine.validateCell(address, '12:01').valid).toBe(true);
      expect(engine.validateCell(address, '12:00').valid).toBe(false);
      expect(engine.validateCell(address, '11:59').valid).toBe(false);
    });
  });
  
  // ==================== Text Length Validation ====================
  
  describe('Text Length Validation', () => {
    it('should validate text length with "lessThan" operator', () => {
      const rule: DataValidationRule = {
        id: 'length-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'textLength',
        operator: 'lessThan',
        formula1: '50',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, 'Short text').valid).toBe(true);
      expect(engine.validateCell(address, 'A'.repeat(49)).valid).toBe(true);
      expect(engine.validateCell(address, 'A'.repeat(50)).valid).toBe(false);
      expect(engine.validateCell(address, 'A'.repeat(51)).valid).toBe(false);
    });
    
    it('should validate text length with "between" operator', () => {
      const rule: DataValidationRule = {
        id: 'length-rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'textLength',
        operator: 'between',
        formula1: '5',
        formula2: '20',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, 'Hello').valid).toBe(true);
      expect(engine.validateCell(address, 'Medium length text').valid).toBe(true);
      expect(engine.validateCell(address, 'Hi').valid).toBe(false);
      expect(engine.validateCell(address, 'A'.repeat(21)).valid).toBe(false);
    });
  });
  
  // ==================== Allow Blank ====================
  
  describe('Allow Blank', () => {
    it('should allow blank when allowBlank is true', () => {
      const rule: DataValidationRule = {
        id: 'rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
        allowBlank: true,
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, '').valid).toBe(true);
      expect(engine.validateCell(address, null).valid).toBe(true);
      expect(engine.validateCell(address, undefined).valid).toBe(true);
    });
    
    it('should reject blank when allowBlank is false', () => {
      const rule: DataValidationRule = {
        id: 'rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
        allowBlank: false,
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      
      expect(engine.validateCell(address, '').valid).toBe(false);
    });
  });
  
  // ==================== Error Styles ====================
  
  describe('Error Styles', () => {
    it('should return correct error style', () => {
      const rule: DataValidationRule = {
        id: 'rule',
        range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
        errorStyle: 'warning',
        errorTitle: 'Warning',
        errorMessage: 'Please enter a positive number',
      };
      engine.setRule(rule);
      
      const address: Address = { row: 0, col: 0 };
      const result = engine.validateCell(address, -5);
      
      expect(result.valid).toBe(false);
      expect(result.errorStyle).toBe('warning');
      expect(result.errorTitle).toBe('Warning');
      expect(result.errorMessage).toBe('Please enter a positive number');
    });
  });
  
  // ==================== Operators ====================
  
  describe('All Operators', () => {
    const operators: [ValidationOperator, string, number, boolean][] = [
      ['between', '10-20', 15, true],
      ['between', '10-20', 10, true],
      ['between', '10-20', 20, true],
      ['between', '10-20', 9, false],
      ['between', '10-20', 21, false],
      ['notBetween', '10-20', 9, true],
      ['notBetween', '10-20', 21, true],
      ['notBetween', '10-20', 15, false],
      ['equal', '50', 50, true],
      ['equal', '50', 51, false],
      ['notEqual', '50', 51, true],
      ['notEqual', '50', 50, false],
      ['greaterThan', '50', 51, true],
      ['greaterThan', '50', 50, false],
      ['lessThan', '50', 49, true],
      ['lessThan', '50', 50, false],
      ['greaterOrEqual', '50', 50, true],
      ['greaterOrEqual', '50', 51, true],
      ['greaterOrEqual', '50', 49, false],
      ['lessOrEqual', '50', 50, true],
      ['lessOrEqual', '50', 49, true],
      ['lessOrEqual', '50', 51, false],
    ];
    
    operators.forEach(([operator, desc, value, expected]) => {
      it(`should validate "${operator}" operator correctly (${desc}, value=${value})`, () => {
        const [min, max] = desc.includes('-') ? desc.split('-').map(Number) : [desc, undefined];
        
        const rule: DataValidationRule = {
          id: 'rule',
          range: { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } },
          type: 'whole',
          operator,
          formula1: String(min),
          formula2: max !== undefined ? String(max) : undefined,
        };
        engine.setRule(rule);
        
        const address: Address = { row: 0, col: 0 };
        const result = engine.validateCell(address, value);
        
        expect(result.valid).toBe(expected);
      });
    });
  });
});
