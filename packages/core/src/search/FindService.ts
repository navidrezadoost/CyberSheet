/**
 * FindService.ts
 *
 * Service layer for Find & Replace operations.
 * Wraps Worksheet search with a stateful interface for UI components.
 *
 * @module search/FindService
 */

import type { Address } from '../types';
import type { Worksheet } from '../worksheet';
import type { SearchOptions, SearchLookIn, SearchLookAt, SearchOrder } from '../types/search-types';
import { cellValueToString, escapeRegexLiteral } from '../search-engine';

export interface FindResult {
  address: Address;
  value: string;
  formula?: string;
  match: string;
}

export interface FindServiceOptions {
  what: string;
  lookIn: SearchLookIn;
  lookAt: SearchLookAt;
  matchCase: boolean;
  searchOrder: SearchOrder;
  searchWithin?: 'sheet' | 'workbook';
  searchBy?: 'rows' | 'columns';
}

function getCellSourceText(
  cell: { value: unknown; formula?: string } | undefined,
  lookIn: SearchLookIn,
): string | null {
  if (!cell) return null;
  if (lookIn === 'formulas') {
    return cell.formula != null ? cell.formula : cellValueToString(cell.value);
  }
  if (lookIn === 'comments') {
    const comments = (cell as { comments?: Array<{ text: string }> }).comments;
    if (!comments?.length) return null;
    return comments.map((c) => c.text).join(' ');
  }
  return cellValueToString(cell.value);
}

function applyTextReplacement(
  source: string,
  query: string,
  replacement: string,
  lookAt: SearchLookAt,
  matchCase: boolean,
): string {
  if (query === '') return source;
  if (lookAt === 'whole') return replacement;

  const escaped = escapeRegexLiteral(query);
  const flags = matchCase ? 'g' : 'gi';
  return source.replace(new RegExp(escaped, flags), () => replacement);
}

export class FindService {
  private worksheet: Worksheet;
  private lastResults: FindResult[] = [];
  private currentIndex = -1;
  private lastOptions: SearchOptions | null = null;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
  }

  private buildSearchOptions(query: string, options?: Partial<FindServiceOptions>): SearchOptions {
    return {
      what: query,
      lookIn: options?.lookIn ?? 'values',
      lookAt: options?.lookAt ?? 'part',
      matchCase: options?.matchCase ?? false,
      searchOrder: options?.searchOrder ?? 'rows',
    };
  }

  findAll(query: string, options?: Partial<FindServiceOptions>): FindResult[] {
    if (!query) {
      this.lastResults = [];
      this.currentIndex = -1;
      this.lastOptions = null;
      return [];
    }

    const searchOptions = this.buildSearchOptions(query, options);
    this.lastOptions = searchOptions;

    const addresses = this.worksheet.findAll(searchOptions);

    this.lastResults = addresses.map((address) => {
      const cell = this.worksheet.getCell(address);
      const source = getCellSourceText(cell, searchOptions.lookIn ?? 'values') ?? '';
      return {
        address,
        value: this.getCellValue(address),
        formula: cell?.formula,
        match: source,
      };
    });

    this.currentIndex = this.lastResults.length > 0 ? 0 : -1;
    return this.lastResults;
  }

  findNext(): FindResult | null {
    if (this.lastResults.length === 0) return null;

    this.currentIndex = (this.currentIndex + 1) % this.lastResults.length;
    return this.lastResults[this.currentIndex];
  }

  findPrevious(): FindResult | null {
    if (this.lastResults.length === 0) return null;

    this.currentIndex -= 1;
    if (this.currentIndex < 0) {
      this.currentIndex = this.lastResults.length - 1;
    }
    return this.lastResults[this.currentIndex];
  }

  getCurrentMatch(): FindResult | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.lastResults.length) {
      return this.lastResults[this.currentIndex];
    }
    return null;
  }

  getMatchCount(): number {
    return this.lastResults.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex + 1;
  }

  replaceCurrent(replacement: string): boolean {
    const current = this.getCurrentMatch();
    if (!current || !this.lastOptions) return false;

    const cell = this.worksheet.getCell(current.address);
    if (!cell) return false;

    const lookIn = this.lastOptions.lookIn ?? 'values';
    const source = getCellSourceText(cell, lookIn);
    if (source === null) return false;

    const newText = applyTextReplacement(
      source,
      this.lastOptions.what,
      replacement,
      this.lastOptions.lookAt ?? 'part',
      this.lastOptions.matchCase ?? false,
    );

    if (newText === source) return false;

    if (lookIn === 'formulas' && cell.formula != null) {
      this.worksheet.setCellFormula(current.address, newText);
    } else if (lookIn === 'comments') {
      const comments = cell.comments;
      if (!comments?.length) return false;
      const latest = comments[comments.length - 1];
      this.worksheet.updateComment(current.address, latest.id, { text: newText });
    } else {
      this.worksheet.setCellValue(current.address, newText);
    }

    this.lastResults.splice(this.currentIndex, 1);
    if (this.lastResults.length === 0) {
      this.currentIndex = -1;
    } else if (this.currentIndex >= this.lastResults.length) {
      this.currentIndex = this.lastResults.length - 1;
    }

    return true;
  }

  replaceAllMatches(query: string, replacement: string, options?: Partial<FindServiceOptions>): number {
    if (!query) return 0;

    const searchOptions = this.buildSearchOptions(query, options);
    const addresses = this.worksheet.findAll(searchOptions);
    let count = 0;

    for (const address of addresses) {
      const cell = this.worksheet.getCell(address);
      if (!cell) continue;

      const lookIn = searchOptions.lookIn ?? 'values';
      const source = getCellSourceText(cell, lookIn);
      if (source === null) continue;

      const newText = applyTextReplacement(
        source,
        query,
        replacement,
        searchOptions.lookAt ?? 'part',
        searchOptions.matchCase ?? false,
      );

      if (newText === source) continue;

      if (lookIn === 'formulas' && cell.formula != null) {
        this.worksheet.setCellFormula(address, newText);
      } else if (lookIn === 'comments') {
        const comments = cell.comments;
        if (!comments?.length) continue;
        const latest = comments[comments.length - 1];
        this.worksheet.updateComment(address, latest.id, { text: newText });
      } else {
        this.worksheet.setCellValue(address, newText);
      }
      count += 1;
    }

    this.lastResults = [];
    this.currentIndex = -1;
    this.lastOptions = searchOptions;

    return count;
  }

  clear(): void {
    this.lastResults = [];
    this.currentIndex = -1;
    this.lastOptions = null;
  }

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
}
