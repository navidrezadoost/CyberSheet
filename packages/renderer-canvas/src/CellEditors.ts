/**
 * CellEditors.ts
 * 
 * Custom cell editors and validation system
 */

import type { Address, CellValue } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core';

export type ValidationRule = 'required' | 'number' | 'integer' | 'email' | 'url' | 'date' | 'regex' | 'range' | 'list' | 'custom';

export interface ValidationConfig {
  rule: ValidationRule;
  message?: string;
  // For regex rule
  pattern?: RegExp;
  // For range rule
  min?: number;
  max?: number;
  // For list rule
  options?: CellValue[];
  // For custom rule
  validator?: (value: CellValue) => boolean | string;
}

export interface EditorConfig {
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'custom';
  options?: CellValue[];
  customRender?: (container: HTMLElement, value: CellValue, commit: (value: CellValue) => void, cancel: () => void) => void;
  validation?: ValidationConfig[];
}

export abstract class CellEditor {
  protected container: HTMLElement;
  protected value: CellValue;
  protected onCommit: (value: CellValue) => void;
  protected onCancel: () => void;

  constructor(
    container: HTMLElement,
    value: CellValue,
    commit: (value: CellValue) => void,
    cancel: () => void
  ) {
    this.container = container;
    this.value = value;
    this.onCommit = commit;
    this.onCancel = cancel;
  }

  abstract render(): void;
  abstract focus(): void;
  abstract getValue(): CellValue;
  abstract destroy(): void;
}

/**
 * Text editor
 */
export class TextEditor extends CellEditor {
  private input: HTMLInputElement | null = null;

  render(): void {
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.value = String(this.value ?? '');
    this.input.className = 'cyber-sheet-text-editor';
    
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.onCommit(this.getValue());
      } else if (e.key === 'Escape') {
        this.onCancel();
      }
    });

    this.input.addEventListener('blur', () => {
      this.onCommit(this.getValue());
    });

    this.container.appendChild(this.input);
  }

  focus(): void {
    this.input?.focus();
    this.input?.select();
  }

  getValue(): CellValue {
    return this.input?.value ?? null;
  }

  destroy(): void {
    this.input?.remove();
    this.input = null;
  }
}

/**
 * Number editor
 */
export class NumberEditor extends CellEditor {
  private input: HTMLInputElement | null = null;

  render(): void {
    this.input = document.createElement('input');
    this.input.type = 'number';
    this.input.value = String(this.value ?? '');
    this.input.className = 'cyber-sheet-number-editor';
    
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.onCommit(this.getValue());
      } else if (e.key === 'Escape') {
        this.onCancel();
      }
    });

    this.input.addEventListener('blur', () => {
      this.onCommit(this.getValue());
    });

    this.container.appendChild(this.input);
  }

  focus(): void {
    this.input?.focus();
    this.input?.select();
  }

  getValue(): CellValue {
    const val = this.input?.value;
    return val ? parseFloat(val) : null;
  }

  destroy(): void {
    this.input?.remove();
    this.input = null;
  }
}

/**
 * Date editor
 */
export class DateEditor extends CellEditor {
  private input: HTMLInputElement | null = null;

  render(): void {
    this.input = document.createElement('input');
    this.input.type = 'date';
    
    // Convert value to YYYY-MM-DD format
    if (this.value) {
      const date = new Date(String(this.value));
      if (!isNaN(date.getTime())) {
        this.input.value = date.toISOString().split('T')[0];
      }
    }
    
    this.input.className = 'cyber-sheet-date-editor';
    
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.onCommit(this.getValue());
      } else if (e.key === 'Escape') {
        this.onCancel();
      }
    });

    this.input.addEventListener('blur', () => {
      this.onCommit(this.getValue());
    });

    this.container.appendChild(this.input);
  }

  focus(): void {
    this.input?.focus();
  }

  getValue(): CellValue {
    return this.input?.value ?? null;
  }

  destroy(): void {
    this.input?.remove();
    this.input = null;
  }
}

/**
 * Dropdown editor
 */
export class DropdownEditor extends CellEditor {
  private select: HTMLSelectElement | null = null;
  private options: CellValue[];

  constructor(
    container: HTMLElement,
    value: CellValue,
    commit: (value: CellValue) => void,
    cancel: () => void,
    options: CellValue[] = []
  ) {
    super(container, value, commit, cancel);
    this.options = options;
  }

  render(): void {
    this.select = document.createElement('select');
    this.select.className = 'cyber-sheet-dropdown-editor';

    for (const option of this.options) {
      const optionEl = document.createElement('option');
      optionEl.value = String(option);
      optionEl.textContent = String(option);
      optionEl.selected = option === this.value;
      this.select.appendChild(optionEl);
    }

    this.select.addEventListener('change', () => {
      this.onCommit(this.getValue());
    });

    this.select.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.onCancel();
      }
    });

    this.select.addEventListener('blur', () => {
      this.onCommit(this.getValue());
    });

    this.container.appendChild(this.select);
  }

  focus(): void {
    this.select?.focus();
  }

  getValue(): CellValue {
    return this.select?.value ?? null;
  }

  destroy(): void {
    this.select?.remove();
    this.select = null;
  }
}

/**
 * Checkbox editor
 */
export class CheckboxEditor extends CellEditor {
  private input: HTMLInputElement | null = null;

  render(): void {
    this.input = document.createElement('input');
    this.input.type = 'checkbox';
    this.input.checked = Boolean(this.value);
    this.input.className = 'cyber-sheet-checkbox-editor';

    this.input.addEventListener('change', () => {
      this.onCommit(this.getValue());
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.onCancel();
      }
    });

    this.container.appendChild(this.input);
  }

  focus(): void {
    this.input?.focus();
  }

  getValue(): CellValue {
    return this.input?.checked ?? false;
  }

  destroy(): void {
    this.input?.remove();
    this.input = null;
  }
}

/**
 * Validation system
 */
export class ValidationManager {
  private validators = new Map<string, ValidationConfig[]>();

  /**
   * Add validation rules for a cell
   */
  addValidation(addr: Address, configs: ValidationConfig[]): void {
    const key = this.getKey(addr);
    this.validators.set(key, configs);
  }

  /**
   * Remove validation rules for a cell
   */
  removeValidation(addr: Address): void {
    const key = this.getKey(addr);
    this.validators.delete(key);
  }

  /**
   * Validate a cell value
   */
  validate(addr: Address, value: CellValue): { valid: boolean; message?: string } {
    const key = this.getKey(addr);
    const configs = this.validators.get(key);

    if (!configs) return { valid: true };

    for (const config of configs) {
      const result = this.validateRule(value, config);
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }

  /**
   * Validate a single rule
   */
  private validateRule(value: CellValue, config: ValidationConfig): { valid: boolean; message?: string } {
    switch (config.rule) {
      case 'required':
        if (value == null || String(value).trim() === '') {
          return { valid: false, message: config.message ?? 'This field is required' };
        }
        break;

      case 'number':
        if (value != null && typeof value !== 'number' && isNaN(Number(value))) {
          return { valid: false, message: config.message ?? 'Must be a valid number' };
        }
        break;

      case 'integer':
        if (value != null && !Number.isInteger(Number(value))) {
          return { valid: false, message: config.message ?? 'Must be an integer' };
        }
        break;

      case 'email':
        if (value != null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          return { valid: false, message: config.message ?? 'Must be a valid email' };
        }
        break;

      case 'url':
        try {
          if (value != null) new URL(String(value));
        } catch {
          return { valid: false, message: config.message ?? 'Must be a valid URL' };
        }
        break;

      case 'date':
        if (value != null && isNaN(new Date(String(value)).getTime())) {
          return { valid: false, message: config.message ?? 'Must be a valid date' };
        }
        break;

      case 'regex':
        if (config.pattern && value != null && !config.pattern.test(String(value))) {
          return { valid: false, message: config.message ?? 'Invalid format' };
        }
        break;

      case 'range':
        if (typeof value === 'number') {
          if (config.min != null && value < config.min) {
            return { valid: false, message: config.message ?? `Must be at least ${config.min}` };
          }
          if (config.max != null && value > config.max) {
            return { valid: false, message: config.message ?? `Must be at most ${config.max}` };
          }
        }
        break;

      case 'list':
        if (config.options && value != null && !config.options.includes(value)) {
          return { valid: false, message: config.message ?? 'Must be one of the allowed values' };
        }
        break;

      case 'custom':
        if (config.validator) {
          const result = config.validator(value);
          if (typeof result === 'string') {
            return { valid: false, message: result };
          }
          if (!result) {
            return { valid: false, message: config.message ?? 'Invalid value' };
          }
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Get validation config for a cell
   */
  getValidation(addr: Address): ValidationConfig[] | undefined {
    const key = this.getKey(addr);
    return this.validators.get(key);
  }

  /**
   * Clear all validations
   */
  clearAll(): void {
    this.validators.clear();
  }

  private getKey(addr: Address): string {
    return `${addr.row}:${addr.col}`;
  }
}

/**
 * Editor factory
 */
export class EditorFactory {
  private editors = new Map<string, EditorConfig>();
  private validationManager = new ValidationManager();

  /**
   * Register an editor for a cell
   */
  registerEditor(addr: Address, config: EditorConfig): void {
    const key = this.getKey(addr);
    this.editors.set(key, config);

    if (config.validation) {
      this.validationManager.addValidation(addr, config.validation);
    }
  }

  /**
   * Create an editor for a cell
   */
  createEditor(
    addr: Address,
    container: HTMLElement,
    value: CellValue,
    commit: (value: CellValue) => void,
    cancel: () => void
  ): CellEditor {
    const key = this.getKey(addr);
    const config = this.editors.get(key);

    if (config?.customRender) {
      // Custom editor
      config.customRender(container, value, commit, cancel);
      return new TextEditor(container, value, commit, cancel); // Fallback
    }

    const type = config?.type ?? 'text';

    switch (type) {
      case 'number':
        return new NumberEditor(container, value, commit, cancel);
      case 'date':
        return new DateEditor(container, value, commit, cancel);
      case 'dropdown':
        return new DropdownEditor(container, value, commit, cancel, config?.options ?? []);
      case 'checkbox':
        return new CheckboxEditor(container, value, commit, cancel);
      default:
        return new TextEditor(container, value, commit, cancel);
    }
  }

  /**
   * Validate a cell value
   */
  validate(addr: Address, value: CellValue): { valid: boolean; message?: string } {
    return this.validationManager.validate(addr, value);
  }

  /**
   * Get validation manager
   */
  getValidationManager(): ValidationManager {
    return this.validationManager;
  }

  private getKey(addr: Address): string {
    return `${addr.row}:${addr.col}`;
  }
}
