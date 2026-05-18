/**
 * DataValidationEngine.ts
 * 
 * Excel-compatible data validation system.
 * Enforces user-defined constraints on cell values with type checking,
 * custom formula evaluation, and dropdown lists.
 * 
 * Phase 4: Data Quality & Input Control
 * 
 * Features:
 * - 7 validation types: list, whole number, decimal, date, time, text length, custom
 * - Error alert styles: Stop, Warning, Information
 * - Input message tooltips
 * - Dropdown rendering for list validation
 * - Formula-based validation via DAG integration
 * 
 * Architecture:
 * ```
 * DataValidationEngine
 *   ├── ValidationRule storage per range
 *   ├── validateCellValue() → ValidationResult
 *   ├── getDropdownItems() → string[] for lists
 *   └── Integration with FormulaEngine for custom validation
 * ```
 */

import type { Address, Range } from './types';
import type { FormulaEngine } from './FormulaEngine';

/**
 * Validation type matching Excel's Data → Data Validation → Allow dropdown
 */
export type DataValidationType =
  | 'any'           // No validation
  | 'list'          // Dropdown list
  | 'whole'         // Whole number
  | 'decimal'       // Decimal number
  | 'date'          // Date
  | 'time'          // Time
  | 'textLength'    // Text length constraint
  | 'custom';       // Custom formula

/**
 * Validation operator for number/date/time/textLength
 */
export type ValidationOperator =
  | 'between'       // Between min and max
  | 'notBetween'    // Not between min and max
  | 'equal'         // Equal to value
  | 'notEqual'      // Not equal to value
  | 'greaterThan'   // Greater than value
  | 'lessThan'      // Less than value
  | 'greaterOrEqual' // Greater than or equal to value
  | 'lessOrEqual';  // Less than or equal to value

/**
 * Error alert style (Excel: Error Alert tab → Style dropdown)
 */
export type ErrorAlertStyle =
  | 'stop'          // Red X icon, prevents invalid input
  | 'warning'       // Yellow ! icon, warns but allows
  | 'information';  // Blue i icon, informational only

/**
 * Validation rule definition
 */
export interface DataValidationRule {
  /** Unique rule ID */
  id: string;
  
  /** Range this rule applies to */
  range: Range;
  
  /** Validation type */
  type: DataValidationType;
  
  /** Operator for comparison (number/date/time/textLength) */
  operator?: ValidationOperator;
  
  /** Formula or value 1 (min for between, value for comparison) */
  formula1?: string;
  
  /** Formula or value 2 (max for between) */
  formula2?: string;
  
  /** Allow blank cells */
  allowBlank?: boolean;
  
  /** Ignore blank cells in validation */
  ignoreBlank?: boolean;
  
  /** Show dropdown arrow for list validation */
  showDropdown?: boolean;
  
  /** Show input message */
  showInputMessage?: boolean;
  
  /** Input message title */
  inputTitle?: string;
  
  /** Input message body */
  inputMessage?: string;
  
  /** Show error alert */
  showErrorAlert?: boolean;
  
  /** Error alert style */
  errorStyle?: ErrorAlertStyle;
  
  /** Error alert title */
  errorTitle?: string;
  
  /** Error alert message */
  errorMessage?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Is value valid? */
  valid: boolean;
  
  /** Error message if invalid */
  errorMessage?: string;
  
  /** Error title if invalid */
  errorTitle?: string;
  
  /** Error style */
  errorStyle?: ErrorAlertStyle;
  
  /** Should show dropdown? */
  showDropdown?: boolean;
  
  /** Dropdown items for list validation */
  dropdownItems?: string[];
}

/**
 * Data Validation Engine
 * 
 * Manages validation rules and evaluates cell values against constraints.
 */
export class DataValidationEngine {
  /** Rules indexed by range + sheet */
  private rules: Map<string, DataValidationRule> = new Map();
  
  /** Formula engine for custom validation */
  private formulaEngine?: FormulaEngine;
  
  constructor(formulaEngine?: FormulaEngine) {
    this.formulaEngine = formulaEngine;
  }
  
  /**
   * Add or update a validation rule
   */
  public setRule(rule: DataValidationRule): void {
    const key = this.getRangeKey(rule.range);
    this.rules.set(key, rule);
  }
  
  /**
   * Remove validation rule for a range
   */
  public removeRule(range: Range): void {
    const key = this.getRangeKey(range);
    this.rules.delete(key);
  }
  
  /**
   * Get validation rule for a cell
   */
  public getRule(address: Address): DataValidationRule | null {
    for (const [_, rule] of this.rules) {
      if (this.isInRange(address, rule.range)) {
        return rule;
      }
    }
    return null;
  }
  
  /**
   * Get all validation rules
   */
  public getAllRules(): DataValidationRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Validate a cell value
   */
  public validateCell(address: Address, value: any): ValidationResult {
    const rule = this.getRule(address);
    
    if (!rule || rule.type === 'any') {
      return { valid: true };
    }
    
    // Check if blank is allowed
    if ((value === null || value === undefined || value === '') && rule.allowBlank) {
      return { valid: true };
    }
    
    // Validate based on type
    switch (rule.type) {
      case 'list':
        return this.validateList(value, rule);
      case 'whole':
        return this.validateWholeNumber(value, rule);
      case 'decimal':
        return this.validateDecimal(value, rule);
      case 'date':
        return this.validateDate(value, rule);
      case 'time':
        return this.validateTime(value, rule);
      case 'textLength':
        return this.validateTextLength(value, rule);
      case 'custom':
        return this.validateCustom(address, value, rule);
      default:
        return { valid: true };
    }
  }
  
  /**
   * Get dropdown items for list validation
   */
  public getDropdownItems(address: Address): string[] | null {
    const rule = this.getRule(address);
    
    if (!rule || rule.type !== 'list' || !rule.formula1) {
      return null;
    }
    
    // Parse comma-separated list
    // Excel format: "Item1,Item2,Item3" or reference like "=A1:A10"
    const formula = rule.formula1.trim();
    
    if (formula.startsWith('=')) {
      // Range reference - would need to evaluate via formula engine
      // For now, return empty array (enhancement for later)
      return [];
    }
    
    // Comma-separated list
    return formula.split(',').map(item => item.trim());
  }
  
  /**
   * Check if cell should show dropdown arrow
   */
  public shouldShowDropdown(address: Address): boolean {
    const rule = this.getRule(address);
    return !!(rule && rule.type === 'list' && rule.showDropdown !== false);
  }
  
  // ==================== Private Validation Methods ====================
  
  private validateList(value: any, rule: DataValidationRule): ValidationResult {
    const items = this.getDropdownItemsFromRule(rule);
    const strValue = String(value);
    
    if (!items.includes(strValue)) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Value',
        errorMessage: rule.errorMessage || `Value must be one of: ${items.join(', ')}`,
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return {
      valid: true,
      showDropdown: rule.showDropdown !== false,
      dropdownItems: items,
    };
  }
  
  private validateWholeNumber(value: any, rule: DataValidationRule): ValidationResult {
    const num = Number(value);
    
    if (isNaN(num) || !Number.isInteger(num)) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Number',
        errorMessage: rule.errorMessage || 'Value must be a whole number.',
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return this.validateNumberOperator(num, rule);
  }
  
  private validateDecimal(value: any, rule: DataValidationRule): ValidationResult {
    const num = Number(value);
    
    if (isNaN(num)) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Number',
        errorMessage: rule.errorMessage || 'Value must be a number.',
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return this.validateNumberOperator(num, rule);
  }
  
  private validateDate(value: any, rule: DataValidationRule): ValidationResult {
    const date = this.parseDate(value);
    
    if (!date) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Date',
        errorMessage: rule.errorMessage || 'Value must be a valid date.',
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return this.validateDateOperator(date, rule);
  }
  
  private validateTime(value: any, rule: DataValidationRule): ValidationResult {
    const time = this.parseTime(value);
    
    if (time === null) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Time',
        errorMessage: rule.errorMessage || 'Value must be a valid time.',
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return this.validateTimeOperator(time, rule);
  }
  
  private validateTextLength(value: any, rule: DataValidationRule): ValidationResult {
    const text = String(value);
    const length = text.length;
    
    return this.validateNumberOperator(length, rule, 'text length');
  }
  
  private validateCustom(address: Address, value: any, rule: DataValidationRule): ValidationResult {
    if (!rule.formula1 || !this.formulaEngine) {
      return { valid: true };
    }
    
    // TODO: Implement custom formula validation
    // Requires worksheet context to evaluate formulas properly
    // For now, custom formulas always pass validation
    return { valid: true };
  }
  
  private validateNumberOperator(
    num: number,
    rule: DataValidationRule,
    context: string = 'value'
  ): ValidationResult {
    const val1 = Number(rule.formula1);
    const val2 = Number(rule.formula2);
    
    let isValid = true;
    let constraint = '';
    
    switch (rule.operator) {
      case 'between':
        isValid = num >= val1 && num <= val2;
        constraint = `between ${val1} and ${val2}`;
        break;
      case 'notBetween':
        isValid = num < val1 || num > val2;
        constraint = `not between ${val1} and ${val2}`;
        break;
      case 'equal':
        isValid = num === val1;
        constraint = `equal to ${val1}`;
        break;
      case 'notEqual':
        isValid = num !== val1;
        constraint = `not equal to ${val1}`;
        break;
      case 'greaterThan':
        isValid = num > val1;
        constraint = `greater than ${val1}`;
        break;
      case 'lessThan':
        isValid = num < val1;
        constraint = `less than ${val1}`;
        break;
      case 'greaterOrEqual':
        isValid = num >= val1;
        constraint = `greater than or equal to ${val1}`;
        break;
      case 'lessOrEqual':
        isValid = num <= val1;
        constraint = `less than or equal to ${val1}`;
        break;
    }
    
    if (!isValid) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Value',
        errorMessage: rule.errorMessage || `The ${context} must be ${constraint}.`,
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return { valid: true };
  }
  
  private validateDateOperator(date: Date, rule: DataValidationRule): ValidationResult {
    const date1 = this.parseDate(rule.formula1);
    const date2 = this.parseDate(rule.formula2);
    
    if (!date1) {
      return { valid: true };
    }
    
    const time = date.getTime();
    const time1 = date1.getTime();
    const time2 = date2 ? date2.getTime() : 0;
    
    let isValid = true;
    let constraint = '';
    
    switch (rule.operator) {
      case 'between':
        isValid = date2 ? time >= time1 && time <= time2 : true;
        constraint = date2 ? `between ${this.formatDate(date1)} and ${this.formatDate(date2)}` : '';
        break;
      case 'notBetween':
        isValid = date2 ? time < time1 || time > time2 : true;
        constraint = date2 ? `not between ${this.formatDate(date1)} and ${this.formatDate(date2)}` : '';
        break;
      case 'equal':
        isValid = time === time1;
        constraint = `equal to ${this.formatDate(date1)}`;
        break;
      case 'notEqual':
        isValid = time !== time1;
        constraint = `not equal to ${this.formatDate(date1)}`;
        break;
      case 'greaterThan':
        isValid = time > time1;
        constraint = `after ${this.formatDate(date1)}`;
        break;
      case 'lessThan':
        isValid = time < time1;
        constraint = `before ${this.formatDate(date1)}`;
        break;
      case 'greaterOrEqual':
        isValid = time >= time1;
        constraint = `on or after ${this.formatDate(date1)}`;
        break;
      case 'lessOrEqual':
        isValid = time <= time1;
        constraint = `on or before ${this.formatDate(date1)}`;
        break;
    }
    
    if (!isValid) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Date',
        errorMessage: rule.errorMessage || `Date must be ${constraint}.`,
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return { valid: true };
  }
  
  private validateTimeOperator(time: number, rule: DataValidationRule): ValidationResult {
    const time1 = this.parseTime(rule.formula1);
    const time2 = this.parseTime(rule.formula2);
    
    if (time1 === null) {
      return { valid: true };
    }
    
    let isValid = true;
    let constraint = '';
    
    switch (rule.operator) {
      case 'between':
        isValid = time2 !== null ? time >= time1 && time <= time2 : true;
        constraint = time2 !== null ? `between ${this.formatTime(time1)} and ${this.formatTime(time2)}` : '';
        break;
      case 'notBetween':
        isValid = time2 !== null ? time < time1 || time > time2 : true;
        constraint = time2 !== null ? `not between ${this.formatTime(time1)} and ${this.formatTime(time2)}` : '';
        break;
      case 'equal':
        isValid = time === time1;
        constraint = `equal to ${this.formatTime(time1)}`;
        break;
      case 'notEqual':
        isValid = time !== time1;
        constraint = `not equal to ${this.formatTime(time1)}`;
        break;
      case 'greaterThan':
        isValid = time > time1;
        constraint = `after ${this.formatTime(time1)}`;
        break;
      case 'lessThan':
        isValid = time < time1;
        constraint = `before ${this.formatTime(time1)}`;
        break;
      case 'greaterOrEqual':
        isValid = time >= time1;
        constraint = `at or after ${this.formatTime(time1)}`;
        break;
      case 'lessOrEqual':
        isValid = time <= time1;
        constraint = `at or before ${this.formatTime(time1)}`;
        break;
    }
    
    if (!isValid) {
      return {
        valid: false,
        errorTitle: rule.errorTitle || 'Invalid Time',
        errorMessage: rule.errorMessage || `Time must be ${constraint}.`,
        errorStyle: rule.errorStyle || 'stop',
      };
    }
    
    return { valid: true };
  }
  
  // ==================== Helper Methods ====================
  
  private getDropdownItemsFromRule(rule: DataValidationRule): string[] {
    if (!rule.formula1) return [];
    
    const formula = rule.formula1.trim();
    
    if (formula.startsWith('=')) {
      // Range reference - would need formula engine evaluation
      return [];
    }
    
    return formula.split(',').map(item => item.trim());
  }
  
  private getRangeKey(range: Range): string {
    return `${range.start.row},${range.start.col},${range.end.row},${range.end.col}`;
  }
  
  private isInRange(address: Address, range: Range): boolean {
    return (
      address.row >= range.start.row &&
      address.row <= range.end.row &&
      address.col >= range.start.col &&
      address.col <= range.end.col
    );
  }
  
  private parseDate(value: any): Date | null {
    if (!value) return null;
    
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  private parseTime(value: any): number | null {
    if (!value) return null;
    
    // Parse time string like "14:30" or "2:30 PM"
    if (typeof value === 'string') {
      const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = match[3] ? parseInt(match[3], 10) : 0;
        const ampm = match[4];
        
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    // Try parsing as number (Excel serial time)
    const num = Number(value);
    if (!isNaN(num)) {
      return Math.floor(num * 86400) % 86400;
    }
    
    return null;
  }
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
  
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
