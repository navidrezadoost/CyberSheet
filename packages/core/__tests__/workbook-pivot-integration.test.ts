/**
 * Phase 28: Workbook Integration Tests
 * 
 * Verifies:
 * - Registry integration with Workbook
 * - Disposal safety
 * - Worksheet ID assignment
 */

import { describe, test, expect } from '@jest/globals';
import { Workbook } from '../src/workbook';
import type { PivotConfig, AggregateValueSpec } from '../src/PivotEngine';

describe('Workbook - Pivot Registry Integration', () => {
  test('workbook has pivot registry', () => {
    const wb = new Workbook();
    
    const registry = wb.getPivotRegistry();
    
    expect(registry).toBeDefined();
    expect(typeof registry.register).toBe('function');
  });

  test('registry persists across worksheet operations', () => {
    const wb = new Workbook();
    const ws1 = wb.addSheet('Sheet1');
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id = wb.getPivotRegistry().register({
      name: 'Test',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws1.getWorksheetId(),
    });
    
    const ws2 = wb.addSheet('Sheet2');
    
    // Registry should still have the pivot after adding another sheet
    expect(wb.getPivotRegistry().has(id)).toBe(true);
  });

  test('dispose clears pivot registry', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('Sheet1');
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id1 = wb.getPivotRegistry().register({
      name: 'P1',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws.getWorksheetId(),
    });
    
    const id2 = wb.getPivotRegistry().register({
      name: 'P2',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws.getWorksheetId(),
    });
    
    expect(wb.getPivotRegistry().list()).toHaveLength(2);
    
    wb.dispose();
    
    expect(wb.getPivotRegistry().list()).toHaveLength(0);
    expect(wb.getPivotRegistry().has(id1)).toBe(false);
    expect(wb.getPivotRegistry().has(id2)).toBe(false);
  });

  test('multiple workbooks have independent registries', () => {
    const wb1 = new Workbook();
    const wb2 = new Workbook();
    
    const ws1 = wb1.addSheet('Sheet1');
    const ws2 = wb2.addSheet('Sheet1');
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id1 = wb1.getPivotRegistry().register({
      name: 'P1',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws1.getWorksheetId(),
    });
    
    const id2 = wb2.getPivotRegistry().register({
      name: 'P2',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws2.getWorksheetId(),
    });
    
    expect(wb1.getPivotRegistry().has(id1)).toBe(true);
    expect(wb1.getPivotRegistry().has(id2)).toBe(false);
    
    expect(wb2.getPivotRegistry().has(id1)).toBe(false);
    expect(wb2.getPivotRegistry().has(id2)).toBe(true);
    
    expect(wb1.getPivotRegistry().list()).toHaveLength(1);
    expect(wb2.getPivotRegistry().list()).toHaveLength(1);
  });

  test('disposing one workbook does not affect others', () => {
    const wb1 = new Workbook();
    const wb2 = new Workbook();
    
    const ws1 = wb1.addSheet('Sheet1');
    const ws2 = wb2.addSheet('Sheet1');
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    wb1.getPivotRegistry().register({
      name: 'P1',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws1.getWorksheetId(),
    });
    
    const id2 = wb2.getPivotRegistry().register({
      name: 'P2',
      config,
      sourceRange: 'A1:A1',
      worksheetId: ws2.getWorksheetId(),
    });
    
    wb1.dispose();
    
    expect(wb1.getPivotRegistry().list()).toHaveLength(0);
    expect(wb2.getPivotRegistry().list()).toHaveLength(1);
    expect(wb2.getPivotRegistry().has(id2)).toBe(true);
  });
});

describe('Worksheet - ID Assignment', () => {
  test('worksheet has unique ID', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('Sheet1');
    
    const id = ws.getWorksheetId();
    
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('different worksheets have different IDs', () => {
    const wb = new Workbook();
    const ws1 = wb.addSheet('Sheet1');
    const ws2 = wb.addSheet('Sheet2');
    
    const id1 = ws1.getWorksheetId();
    const id2 = ws2.getWorksheetId();
    
    expect(id1).not.toBe(id2);
  });

  test('worksheet ID is stable across calls', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('Sheet1');
    
    const id1 = ws.getWorksheetId();
    const id2 = ws.getWorksheetId();
    
    expect(id1).toBe(id2);
  });

  test('worksheet ID includes sheet name', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('CustomSheet');
    
    const id = ws.getWorksheetId();
    
    expect(id).toContain('CustomSheet');
  });
});
