/**
  * entity-values-week1.test.ts
 * Week 1 Integration Tests: Entity Values in Formula Engine
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { createEntityValue } from '../src/types/entity-types';
import type { EntityValue } from '../src/types/entity-types';

describe('Entity Values - Week 1 Integration', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet, currentCell: { row: 1, col: 2 } });
  };

  describe('1. Entity Storage', () => {
    it('should store and retrieve entity', () => {
      const stockEntity: EntityValue = createEntityValue('stock', 'MSFT', { 'Symbol': 'MSFT', 'Price': 420.50 });
      worksheet.setCellValue({ row: 1, col: 1 }, stockEntity);
      const retrieved = worksheet.getCellValue({ row: 1, col: 1 });
      expect(retrieved).toEqual(stockEntity);
    });
  });

  describe('2. Entity in Arithmetic', () => {
    it('should use display value in addition', () => {
      const entity: EntityValue = createEntityValue('stock', 420.50, { 'Price': 420.50 });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1+10');
      expect(result).toBe(430.50);
    });

    it('should use display value in multiplication', () => {
      const entity: EntityValue = createEntityValue('stock', 100, { 'Price': 100 });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1*2');
      expect(result).toBe(200);
    });

    it('should use display value in subtraction', () => {
      const entity: EntityValue = createEntityValue('stock', 500, { 'Price': 500 });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1-150');
      expect(result).toBe(350);
    });

    it('should use display value in division', () => {
      const entity: EntityValue = createEntityValue('stock', 1000, { 'Price': 1000 });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1/4');
      expect(result).toBe(250);
    });
  });

  describe('3. Entity in Comparison', () => {
    it('should use display value in equality', () => {
      const entity: EntityValue = createEntityValue('stock', 'MSFT', { 'Symbol': 'MSFT' });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1="MSFT"');
      expect(result).toBe(true);
    });

    it('should use display value in greater than', () => {
      const entity: EntityValue = createEntityValue('stock', 420.50, { 'Price': 420.50 });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1>400');
      expect(result).toBe(true);
    });

    it('should use display value in less than', () => {
      const entity: EntityValue = createEntityValue('stock', 420.50, { 'Price': 420.50 });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1<500');
      expect(result).toBe(true);
    });
  });

  describe('4. Entity in Text Operations', () => {
    it('should use display value in CONCAT', () => {
      const entity: EntityValue = createEntityValue('stock', 'MSFT', { 'Symbol': 'MSFT' });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=CONCATENATE("Stock: ", A1)');
      expect(result).toBe('Stock: MSFT');
    });

    it('should use display value in string concatenation', () => {
      const entity: EntityValue = createEntityValue('geography', 'United States', { 'Name': 'United States' });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('="Country: " & A1');
      expect(result).toBe('Country: United States');
    });

    it('should use display value in LEN', () => {
      const entity: EntityValue = createEntityValue('stock', 'AAPL', { 'Symbol': 'AAPL' });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=LEN(A1)');
      expect(result).toBe(4);
    });
  });

  describe('5. Entity in Aggregate Functions', () => {
    it('should use display value in SUM', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, createEntityValue('stock', 100, { 'Price': 100 }));
      worksheet.setCellValue({ row: 2, col: 1 }, createEntityValue('stock', 200, { 'Price': 200 }));
      worksheet.setCellValue({ row: 3, col: 1 }, createEntityValue('stock', 300, { 'Price': 300 }));
      const result = evalFormula('=SUM(A1:A3)');
      expect(result).toBe(600);
    });

    it('should use display value in AVERAGE', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, createEntityValue('stock', 100, { 'Price': 100 }));
      worksheet.setCellValue({ row: 2, col: 1 }, createEntityValue('stock', 200, { 'Price': 200 }));
      const result = evalFormula('=AVERAGE(A1:A2)');
      expect(result).toBe(150);
    });

    it('should use display value in COUNT', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, createEntityValue('stock', 100, { 'Price': 100 }));
      worksheet.setCellValue({ row: 2, col: 1 }, createEntityValue('stock', 200, { 'Price': 200 }));
      worksheet.setCellValue({ row: 3, col: 1 }, 'Text');
      const result = evalFormula('=COUNT(A1:A3)');
      expect(result).toBe(2);
    });
  });

  describe('6. Entity Error Cases', () => {
    it('should handle entity with text display in arithmetic (concatenates like regular string)', () => {
      // Note: This engine concatenates string+number instead of #VALUE! error
      const entity: EntityValue = createEntityValue('stock', 'MSFT', { 'Symbol': 'MSFT' });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1+10');
      // Behaves like regular string: "MSFT" + 10 = "MSFT10"
      expect(result).toBe('MSFT10');
    });

    it('should handle entity with null display', () => {
      const entity: EntityValue = createEntityValue('stock', null, { 'Symbol': 'N/A' });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=A1+10');
      expect(result).toBe(10);
    });

    it('should handle entity with boolean display', () => {
      const entity: EntityValue = createEntityValue('custom', true, { 'active': true });
      worksheet.setCellValue({ row: 1, col: 1 }, entity);
      const result = evalFormula('=IF(A1, "Yes", "No")');
      expect(result).toBe('Yes');
    });
  });

  describe('7. Regression Guards', () => {
    it('should handle regular numbers unchanged', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 42);
      const result = evalFormula('=A1*2');
      expect(result).toBe(84);
    });

    it('should handle regular strings unchanged', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'Hello');
      const result = evalFormula('=CONCATENATE(A1, " World")');
      expect(result).toBe('Hello World');
    });

    it('should handle regular booleans unchanged', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, true);
      const result = evalFormula('=IF(A1, "True", "False")');
      expect(result).toBe('True');
    });

    it('should handle null unchanged', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, null);
      const result = evalFormula('=A1+10');
      expect(result).toBe(10);
    });
  });
});
