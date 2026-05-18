/**
 * FindService.ts
 *
 * Service layer for Find & Replace operations.
 * Wraps the low-level search functions with a stateful interface for UI components.
 *
 * @module search/FindService
 */

import type { Address } from '../types';
import type { Worksheet } from '../worksheet';
import type { SearchOptions, SearchLookIn, SearchLookAt, SearchOrder } from '../types/search-types';
import { findAll, replaceAll } from './index';

export interface FindResult {
  address: Address;
  value: string;
  formula?: string;
  match: string; // The matched text
}

export interface FindServiceOptions {
  what: string;
  lookIn: SearchLookIn;
  lookAt: SearchLookAt;
  matchCase: boolean;
  searchOrder: SearchOrder;
  searchWithin?: 'sheet' | 'workbook'; // Default: sheet
  searchBy?: 'rows' | 'columns'; // Default: rows
}

export class FindService {
  private worksheet: Worksheet;
  private lastResults: FindResult[] = [];
  private currentIndex: number = -1;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
  }

  /**
   * Find all matches in the current worksheet
   */
  findAll(query: string, options?: Partial<FindServiceOptions>): FindResult[] {
    const searchOptions: SearchOptions = {
      what: query,
      lookIn: options?.lookIn || 'values',
      lookAt: options?.lookAt || 'part',
      matchCase: options?.matchCase ?? false,
      searchOrder: options?.searchOrder || 'rows',
    };

    // Use the low-level findAll function
    const results = findAll(this.worksheet, searchOptions);

    // Convert to FindResult format
    this.lastResults = results.map(result => ({
      address: result.address,
      value: this.getCellValue(result.address),
      formula: this.getCellFormula(result.address),
      match: result.match,
    }));

    this.currentIndex = this.lastResults.length > 0 ? 0 : -1;
    return this.lastResults;
  }

  /**
   * Find next match (with wrap-around)
   */
  findNext(): FindResult | null {
    if (this.lastResults.length === 0) return null;
    
    this.currentIndex = (this.currentIndex + 1) % this.lastResults.length;
    return this.lastResults[this.currentIndex];
  }

  /**
   * Find previous match (with wrap-around)
   */
  findPrevious(): FindResult | null {
    if (this.lastResults.length === 0) return null;
    
    this.currentIndex = this.currentIndex - 1;
    if (this.currentIndex < 0) {
      this.currentIndex = this.lastResults.length - 1;
    }
    return this.lastResults[this.currentIndex];
  }

  /**
   * Get current match
   */
  getCurrentMatch(): FindResult | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.lastResults.length) {
      return this.lastResults[this.currentIndex];
    }
    return null;
  }

  /**
   * Get total match count
   */
  getMatchCount(): number {
    return this.lastResults.length;
  }

  /**
   * Get current match index (1-based for display)
   */
  getCurrentIndex(): number {
    return this.currentIndex + 1;
  }

  /**
   * Replace current match
   */
  replaceCurrent(replacement: string): boolean {
    const current = this.getCurrentMatch();
    if (!current) return false;

    const cell = this.worksheet.getCell(current.address);
    if (!cell) return false;

    // Replace in formula if searching formulas, otherwise in value
    if (cell.formula) {
      const newFormula = cell.formula.replace(current.match, replacement);
      this.worksheet.setCellFormula(current.address, newFormula);
    } else {
      const currentValue = String(cell.value || '');
      const newValue = currentValue.replace(current.match, replacement);
      this.worksheet.setCell(current.address, newValue);
    }

    // Remove this result from the list
    this.lastResults.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.lastResults.length) {
      this.currentIndex = this.lastResults.length - 1;
    }

    return true;
  }

  /**
   * Replace all matches
   */
  replaceAllMatches(query: string, replacement: string, options?: Partial<FindServiceOptions>): number {
    const searchOptions: SearchOptions = {
      what: query,
      lookIn: options?.lookIn || 'values',
      lookAt: options?.lookAt || 'part',
      matchCase: options?.matchCase ?? false,
      searchOrder: options?.searchOrder || 'rows',
    };

    // Use the low-level replaceAll function
    const count = replaceAll(this.worksheet, query, replacement, searchOptions);

    // Clear results after replace all
    this.lastResults = [];
    this.currentIndex = -1;

    return count;
  }

  /**
   * Clear current search results
   */
  clear(): void {
    this.lastResults = [];
    this.currentIndex = -1;
  }

  /**
   * Helper: Get cell value as string
   */
  private getCellValue(address: Address): string {
    const cell = this.worksheet.getCell(address);
    if (!cell) return '';
    
    const value = cell.value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    return String(value);
  }

  /**
   * Helper: Get cell formula
   */
  private getCellFormula(address: Address): string | undefined {
    const cell = this.worksheet.getCell(address);
    return cell?.formula || undefined;
  }
}
