/**
 * Week 2: Field Access Test Suite
 * 
 * Behavior Contract for Parser + Evaluator Extension
 * 
 * Test Categories:
 * 1. Basic field access (dot & bracket notation) - Tests 1-8
 * 2. Error matrix (#VALUE!, #REF!, #FIELD!) - Tests 9-15
 * 3. Field value types - Tests 16-18
 * 4. Operator precedence - Tests 19-21
 * 5. Backward compatibility (display semantics) - Tests 22-24
 * 6. Edge cases - Tests 25-26
 * 7. Precedence stress tests - Tests 27-28
 * 8. Additional precedence validation - Tests S1-S11
 * 
 * Total Tests: 39 (28 core + 11 stress)
 * 
 * Locked Constraints:
 * - No dynamic field access (A1[B1]) yet
 * - No nested entities (A1.Stock.Price) yet
 * - No vectorized dereference (A1:A5.Price) yet
 * - Static field names only
 * 
 * Success Criteria:
 * - All 39 tests pass
 * - Zero regressions in existing 2,946 tests
 * - Error matrix enforced strictly
 * - Precedence verified (unary, binary, member, concatenation)
 * - String literal immunity confirmed
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { createEntityValue, STOCK_SCHEMA } from '../src/types/entity-types';

describe('Week 2: Field Access - Basic Dot Notation', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[1/25] Basic field access with dot notation', () => {
    // Entity with numeric field
    const stockEntity = createEntityValue('stock', 150.75, {
      Price: 150.75,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price');

    expect(result).toBe(150.75);
  });

  test('[2/25] Field access with string field', () => {
    const stockEntity = createEntityValue('stock', 150.75, {
      Price: 150.75,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Ticker');

    expect(result).toBe('AAPL');
  });

  test('[3/25] Field access in arithmetic expression', () => {
    const stockEntity = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'TSLA',
      Name: 'Tesla Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price + 50');

    expect(result).toBe(150);
  });

  test('[4/25] Field access in comparison', () => {
    const stockEntity = createEntityValue('stock', 200, {
      Price: 200,
      Ticker: 'GOOGL',
      Name: 'Alphabet Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price > 150');

    expect(result).toBe(true);
  });

  test('[5/25] Multiple field accesses in one formula', () => {
    const stock1 = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    const stock2 = createEntityValue('stock', 200, {
      Price: 200,
      Ticker: 'GOOGL',
      Name: 'Alphabet Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stock1);
    sheet.setCellValue({ row: 2, col: 1 }, stock2);
    const result = evalFormula('=A1.Price + A2.Price');

    expect(result).toBe(300);
  });
});

describe('Week 2: Field Access - Bracket Notation', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[6/25] Bracket notation with simple field name', () => {
    const stockEntity = createEntityValue('stock', 150.75, {
      Price: 150.75,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1["Price"]');

    expect(result).toBe(150.75);
  });

  test('[7/25] Bracket notation with spaces in field name', () => {
    const stockEntity = createEntityValue('stock', 3000000000000, {
      'Market Cap': 3000000000000, // 3 trillion
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1["Market Cap"]');

    expect(result).toBe(3000000000000);
  });

  test('[8/25] Bracket notation equivalent to dot notation', () => {
    const stockEntity = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'MSFT',
      Name: 'Microsoft Corporation',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const dotResult = evalFormula('=A1.Price');
    const bracketResult = evalFormula('=A1["Price"]');

    expect(dotResult).toBe(bracketResult);
  });
});

describe('Week 2: Error Matrix - #VALUE! (Base Not Entity)', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[9/25] #VALUE! when dereferencing number', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 42);
    const result = evalFormula('=A1.Price');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#VALUE!');
  });

  test('[10/25] #VALUE! when dereferencing string', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'Hello');
    const result = evalFormula('=A1.Length');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#VALUE!');
  });

  test('[11/25] #VALUE! when dereferencing boolean', () => {
    sheet.setCellValue({ row: 1, col: 1 }, true);
    const result = evalFormula('=A1.Value');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#VALUE!');
  });
});

describe('Week 2: Error Matrix - #REF! (Null Entity)', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[12/25] #REF! when entity is null', () => {
    // Entity with null as the base (not a field value, but the entity itself)
    sheet.setCellValue({ row: 1, col: 1 }, null);
    const result = evalFormula('=A1.Price');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#REF!');
  });

  test('[13/25] #REF! when cell is empty', () => {
    // A1 not set at all
    const result = evalFormula('=A1.Price');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#REF!');
  });
});

describe('Week 2: Error Matrix - #FIELD! (Invalid Field)', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[14/25] #FIELD! when field does not exist', () => {
    const stockEntity = createEntityValue('stock', 150, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.NonExistentField');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#FIELD!');
  });

  test('[15/25] #FIELD! is distinct from #VALUE!', () => {
    const stockEntity = createEntityValue('stock', 150, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    sheet.setCellValue({ row: 2, col: 1 }, 42);

    const fieldError = evalFormula('=A1.BadField');
    const valueError = evalFormula('=A2.BadField');

    expect((fieldError as Error).message).toContain('#FIELD!');
    expect((valueError as Error).message).toContain('#VALUE!');
  });
});

describe('Week 2: Field Value Types', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[16/25] Field returning null', () => {
    const stockEntity = createEntityValue('stock', 150, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
      'PE Ratio': null, // Explicitly null field
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1["PE Ratio"]');

    // Field exists but value is null → return null (NOT #FIELD!)
    expect(result).toBeNull();
  });

  test('[17/25] Field returning boolean', () => {
    const stockEntity = createEntityValue('stock', 150, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
      'Is Active': true,
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1["Is Active"]');

    expect(result).toBe(true);
  });

  test('[18/25] Field in IF logic', () => {
    const stockEntity = createEntityValue('stock', 200, {
      Price: 200,
      Ticker: 'TSLA',
      Name: 'Tesla Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=IF(A1.Price > 150, "Expensive", "Cheap")');

    expect(result).toBe('Expensive');
  });
});

describe('Week 2: Operator Precedence', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[19/25] Member access binds tighter than addition', () => {
    const stockEntity = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price + 50');

    // Should parse as (A1.Price) + 50, not A1.(Price + 50)
    expect(result).toBe(150);
  });

  test('[20/25] Member access binds tighter than comparison', () => {
    const stockEntity = createEntityValue('stock', 200, {
      Price: 200,
      Ticker: 'GOOGL',
      Name: 'Alphabet Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price > 100');

    // Should parse as (A1.Price) > 100
    expect(result).toBe(true);
  });

  test('[21/25] Member access in complex expression', () => {
    const stock1 = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    const stock2 = createEntityValue('stock', 200, {
      Price: 200,
      Ticker: 'GOOGL',
      Name: 'Alphabet Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stock1);
    sheet.setCellValue({ row: 2, col: 1 }, stock2);
    const result = evalFormula('=A1.Price * 2 + A2.Price / 2');

    // Should parse as ((A1.Price) * 2) + ((A2.Price) / 2)
    // = (100 * 2) + (200 / 2) = 200 + 100 = 300
    expect(result).toBe(300);
  });
});

describe('Week 2: Backward Compatibility - Display Semantics', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[22/25] Entity without field access uses display value', () => {
    const stockEntity = createEntityValue('stock', 999, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    }); // Display value different from Price

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1 + 1');

    // Without field access, should use display value (999), not Price (150)
    expect(result).toBe(1000);
  });

  test('[23/25] Explicit field access overrides display value', () => {
    const stockEntity = createEntityValue('stock', 999, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price + 1');

    // With field access, should use field value (150), not display (999)
    expect(result).toBe(151);
  });

  test('[24/25] Display value in ranges unchanged', () => {
    const stock1 = createEntityValue('stock', 10, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    const stock2 = createEntityValue('stock', 20, {
      Price: 200,
      Ticker: 'GOOGL',
      Name: 'Alphabet Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stock1);
    sheet.setCellValue({ row: 2, col: 1 }, stock2);
    const result = evalFormula('=SUM(A1:A2)');

    // SUM without field access should use display values: 10 + 20 = 30
    expect(result).toBe(30);
  });
});

describe('Week 2: Edge Cases', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[25/28] Nested member access errors predictably', () => {
    const stockEntity = createEntityValue('stock', 150, {
      Price: 150,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);

    // A1.Price.Value - Price is a number, so .Value should error
    const result = evalFormula('=A1.Price.Value');

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain('#VALUE!');
  });

  test('[26/28] String literal with dot not parsed as member', () => {
    const result = evalFormula('="A1.Price"');

    // String literal should be returned as-is, not parsed as member access
    expect(result).toBe('A1.Price');
  });
});

describe('Week 2: Precedence Stress Tests', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[27/28] Unary minus with member access', () => {
    const stockEntity = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=-A1.Price');

    // Should parse as -(A1.Price) = -(100) = -100
    // NOT as (-A1).Price which would error
    expect(result).toBe(-100);
  });

  test('[28/28] Mixed field and display value semantic separation', () => {
    const stockEntity = createEntityValue('stock', 5, {
      Price: 10,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    }); // Display different from Price

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
    const result = evalFormula('=A1.Price + A1');

    // Should parse as (A1.Price) + (A1 using display value)
    // Field access returns 10, display value is 5
    // 10 + 5 = 15
    expect(result).toBe(15);
  });
});

describe('Week 2: Additional Precedence Validation (10 Cases)', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);

    const stockEntity = createEntityValue('stock', 5, {
      Price: 10,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    });

    sheet.setCellValue({ row: 1, col: 1 }, stockEntity);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  test('[S1] Unary plus with member access', () => {
    const result = evalFormula('=+A1.Price');
    expect(result).toBe(10); // +(A1.Price)
  });

  test('[S2] Exponent with member access', () => {
    const result = evalFormula('=A1.Price^2');
    expect(result).toBe(100); // (A1.Price)^2
  });

  test('[S3] Division with member access', () => {
    const result = evalFormula('=A1.Price / 2');
    expect(result).toBe(5); // (A1.Price) / 2
  });

  test('[S4] Multiplication then addition', () => {
    const result = evalFormula('=A1.Price * 2 + A1');
    expect(result).toBe(25); // (10 * 2) + 5
  });

  test('[S5] Comparison greater than', () => {
    const result = evalFormula('=A1.Price > 5');
    expect(result).toBe(true); // (A1.Price) > 5
  });

  test('[S6] Comparison less than or equal', () => {
    const result = evalFormula('=A1.Price <= 10');
    expect(result).toBe(true); // (A1.Price) <= 10
  });

  test('[S7] Nested parentheses with member', () => {
    const result = evalFormula('=((A1.Price))');
    expect(result).toBe(10); // Parens removed, member evaluated
  });

  test('[S8] Member in complex expression', () => {
    const result = evalFormula('=A1.Price * 2 + A1.Price / 2');
    expect(result).toBe(25); // (10*2) + (10/2) = 20 + 5
  });

  test('[S9] String concatenation with member', () => {
    sheet.setCellValue({ row: 1, col: 2 }, 'Price: ');
    const result = evalFormula('=B1 & A1.Price');
    expect(result).toBe('Price: 10'); // "Price: " & 10
  });

  test('[S10] Member in function argument', () => {
    const stock2 = createEntityValue('stock', 20, {
      Price: 20,
      Ticker: 'GOOGL',
      Name: 'Alphabet Inc.',
    });
    sheet.setCellValue({ row: 1, col: 2 }, stock2);

    const result = evalFormula('=SUM(A1.Price, B1.Price)');
    expect(result).toBe(30); // SUM(10, 20)
  });

  test('[S11] String concatenation with member (postfix precedence)', () => {
    sheet.setCellValue({ row: 1, col: 1 }, createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    }));

    const result = evalFormula('=A1.Price&" USD"');
    expect(result).toBe('100 USD'); // Member binds before &
  });
});

/**
 * UNSUPPORTED SCENARIOS (Week 2 Constraints)
 * 
 * These should error or be explicitly rejected:
 * 
 * 1. Dynamic field access:
 *    =A1[B1]  → Parser error or #VALUE!
 * 
 * 2. Vectorized dereference:
 *    =SUM(A1:A5.Price)  → Parser error or #VALUE!
 * 
 * 3. Computed member expressions:
 *    =A1["Price" & "High"]  → Parser error (only string literals)
 * 
 * 4. Nested entities:
 *    =A1.Stock.Price  → #VALUE! (Stock field is not an entity)
 * 
 * If these accidentally work, they should be tested for correct failure mode.
 */
