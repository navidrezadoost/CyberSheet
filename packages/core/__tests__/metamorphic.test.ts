/**
 * Metamorphic Testing — Mathematical Property Validation
 * 
 * Tests RELATIONSHIPS, not outputs.
 * Catches bugs even when ALL implementations are wrong.
 * 
 * Philosophy:
 * - Differential testing: "Does optimized == oracle?"
 * - Metamorphic testing: "Do mathematical laws hold?"
 * 
 * If metamorphic tests fail, EVERY implementation is suspect.
 * This is how SQLite, compilers, and databases validate correctness.
 */

import { SpreadsheetEngine } from '../src/SpreadsheetEngine';
import { Address } from '../src/types';

describe('Metamorphic Properties — Arithmetic Identity', () => {
  
  test('M1: Adding then subtracting same value is identity', async () => {
    const engine = new SpreadsheetEngine('M1');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 100);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1+50');
      ws.setCellFormula({ row: 2, col: 0 }, '=A2-50');
    });
    
    const a1 = engine.getCellValue({ row: 0, col: 0 });
    const a3 = engine.getCellValue({ row: 2, col: 0 });
    
    expect(a3).toBe(a1); // A3 = (A1 + 50) - 50 should equal A1
  });

  test('M2: Multiplying then dividing by same value is identity', async () => {
    const engine = new SpreadsheetEngine('M2');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 42);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1*7');
      ws.setCellFormula({ row: 2, col: 0 }, '=A2/7');
    });
    
    const a1 = engine.getCellValue({ row: 0, col: 0 });
    const a3 = engine.getCellValue({ row: 2, col: 0 });
    
    expect(a3).toBe(a1);
  });

  test('M3: Adding zero is identity', async () => {
    const engine = new SpreadsheetEngine('M3');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 123);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1+0');
    });
    
    const a1 = engine.getCellValue({ row: 0, col: 0 });
    const a2 = engine.getCellValue({ row: 1, col: 0 });
    
    expect(a2).toBe(a1);
  });

  test('M4: Multiplying by one is identity', async () => {
    const engine = new SpreadsheetEngine('M4');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 456);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1*1');
    });
    
    const a1 = engine.getCellValue({ row: 0, col: 0 });
    const a2 = engine.getCellValue({ row: 1, col: 0 });
    
    expect(a2).toBe(a1);
  });
});

describe('Metamorphic Properties — Commutativity', () => {
  
  test('M5: Addition is commutative: A+B = B+A', async () => {
    const engine = new SpreadsheetEngine('M5');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 10);
      ws.setCellValue({ row: 0, col: 1 }, 20);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1+B1'); // 10 + 20
      ws.setCellFormula({ row: 1, col: 1 }, '=B1+A1'); // 20 + 10
    });
    
    const leftToRight = engine.getCellValue({ row: 1, col: 0 });
    const rightToLeft = engine.getCellValue({ row: 1, col: 1 });
    
    expect(leftToRight).toBe(rightToLeft);
  });

  test('M6: Multiplication is commutative: A*B = B*A', async () => {
    const engine = new SpreadsheetEngine('M6');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 7);
      ws.setCellValue({ row: 0, col: 1 }, 8);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1*B1');
      ws.setCellFormula({ row: 1, col: 1 }, '=B1*A1');
    });
    
    const leftToRight = engine.getCellValue({ row: 1, col: 0 });
    const rightToLeft = engine.getCellValue({ row: 1, col: 1 });
    
    expect(leftToRight).toBe(rightToLeft);
  });
});

describe('Metamorphic Properties — Associativity', () => {
  
  test('M7: Addition is associative: (A+B)+C = A+(B+C)', async () => {
    const engine = new SpreadsheetEngine('M7');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 5);
      ws.setCellValue({ row: 0, col: 1 }, 10);
      ws.setCellValue({ row: 0, col: 2 }, 15);
      
      // Left associative: (A1+B1)+C1
      ws.setCellFormula({ row: 1, col: 0 }, '=A1+B1');
      ws.setCellFormula({ row: 2, col: 0 }, '=A2+C1');
      
      // Right associative: A1+(B1+C1)
      ws.setCellFormula({ row: 1, col: 1 }, '=B1+C1');
      ws.setCellFormula({ row: 2, col: 1 }, '=A1+B2');
    });
    
    const leftAssoc = engine.getCellValue({ row: 2, col: 0 });
    const rightAssoc = engine.getCellValue({ row: 2, col: 1 });
    
    expect(leftAssoc).toBe(rightAssoc);
  });

  test('M8: Multiplication is associative: (A*B)*C = A*(B*C)', async () => {
    const engine = new SpreadsheetEngine('M8');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 2);
      ws.setCellValue({ row: 0, col: 1 }, 3);
      ws.setCellValue({ row: 0, col: 2 }, 4);
      
      ws.setCellFormula({ row: 1, col: 0 }, '=A1*B1');
      ws.setCellFormula({ row: 2, col: 0 }, '=A2*C1');
      
      ws.setCellFormula({ row: 1, col: 1 }, '=B1*C1');
      ws.setCellFormula({ row: 2, col: 1 }, '=A1*B2');
    });
    
    const leftAssoc = engine.getCellValue({ row: 2, col: 0 });
    const rightAssoc = engine.getCellValue({ row: 2, col: 1 });
    
    expect(leftAssoc).toBe(rightAssoc);
  });
});

describe('Metamorphic Properties — Distributivity', () => {
  
  test('M9: Multiplication distributes over addition: A*(B+C) = A*B + A*C', async () => {
    const engine = new SpreadsheetEngine('M9');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 3);
      ws.setCellValue({ row: 0, col: 1 }, 4);
      ws.setCellValue({ row: 0, col: 2 }, 5);
      
      // Left side: A1*(B1+C1)
      ws.setCellFormula({ row: 1, col: 0 }, '=B1+C1');
      ws.setCellFormula({ row: 2, col: 0 }, '=A1*A2');
      
      // Right side: A1*B1 + A1*C1
      ws.setCellFormula({ row: 1, col: 1 }, '=A1*B1');
      ws.setCellFormula({ row: 1, col: 2 }, '=A1*C1');
      ws.setCellFormula({ row: 2, col: 1 }, '=B2+C2');
    });
    
    const leftSide = engine.getCellValue({ row: 2, col: 0 });
    const rightSide = engine.getCellValue({ row: 2, col: 1 });
    
    expect(leftSide).toBe(rightSide);
  });
});

describe('Metamorphic Properties — Formula Equivalence', () => {
  
  test('M10: SUM(A1:A3) = A1 + A2 + A3', async () => {
    const engine = new SpreadsheetEngine('M10');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 10);
      ws.setCellValue({ row: 1, col: 0 }, 20);
      ws.setCellValue({ row: 2, col: 0 }, 30);
      
      ws.setCellFormula({ row: 3, col: 0 }, '=SUM(A1:A3)');
      ws.setCellFormula({ row: 3, col: 1 }, '=A1+A2+A3');
    });
    
    const sumFormula = engine.getCellValue({ row: 3, col: 0 });
    const addFormula = engine.getCellValue({ row: 3, col: 1 });
    
    expect(sumFormula).toBe(addFormula);
  });

  test('M11: AVERAGE(A1:A2) = (A1+A2)/2', async () => {
    const engine = new SpreadsheetEngine('M11');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 100);
      ws.setCellValue({ row: 1, col: 0 }, 200);
      
      ws.setCellFormula({ row: 2, col: 0 }, '=AVERAGE(A1:A2)');
      ws.setCellFormula({ row: 2, col: 1 }, '=(A1+A2)/2');
    });
    
    const avgFormula = engine.getCellValue({ row: 2, col: 0 });
    const manualAvg = engine.getCellValue({ row: 2, col: 1 });
    
    expect(avgFormula).toBe(manualAvg);
  });

  test('M12: MAX(A,B) + MIN(A,B) = A + B', async () => {
    const engine = new SpreadsheetEngine('M12');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 15);
      ws.setCellValue({ row: 0, col: 1 }, 25);
      
      ws.setCellFormula({ row: 1, col: 0 }, '=MAX(A1,B1)');
      ws.setCellFormula({ row: 1, col: 1 }, '=MIN(A1,B1)');
      ws.setCellFormula({ row: 2, col: 0 }, '=A2+B2');
      ws.setCellFormula({ row: 2, col: 1 }, '=A1+B1');
    });
    
    const maxPlusMin = engine.getCellValue({ row: 2, col: 0 });
    const directSum = engine.getCellValue({ row: 2, col: 1 });
    
    expect(maxPlusMin).toBe(directSum);
  });
});

describe('Metamorphic Properties — Structural Symmetry', () => {
  
  test.skip('M13: Insert row then delete row is identity (NOT IMPLEMENTED)', async () => {
    const engine = new SpreadsheetEngine('M13');
    
    // Set up initial state
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 10);
      ws.setCellValue({ row: 1, col: 0 }, 20);
      ws.setCellValue({ row: 2, col: 0 }, 30);
    });
    
    // Snapshot initial state
    const stateBefore = snapshotState(engine);
    
    // Insert row 1, then delete row 1
    await engine.run((ws) => ws.insertRow(1));
    await engine.run((ws) => ws.deleteRow(1));
    
    // Snapshot final state
    const stateAfter = snapshotState(engine);
    
    expect(stateAfter).toEqual(stateBefore);
  });

  test.skip('M14: Insert column then delete column is identity (NOT IMPLEMENTED)', async () => {
    const engine = new SpreadsheetEngine('M14');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 1);
      ws.setCellValue({ row: 0, col: 1 }, 2);
      ws.setCellValue({ row: 0, col: 2 }, 3);
    });
    
    const stateBefore = snapshotState(engine);
    
    await engine.run((ws) => ws.insertColumn(1));
    await engine.run((ws) => ws.deleteColumn(1));
    
    const stateAfter = snapshotState(engine);
    
    expect(stateAfter).toEqual(stateBefore);
  });
});

describe('Metamorphic Properties — Dependency Propagation', () => {
  
  test('M15: Changing A1 propagates to all dependents identically', async () => {
    const engine = new SpreadsheetEngine('M15');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 10);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1*2');
      ws.setCellFormula({ row: 2, col: 0 }, '=A1*3');
      ws.setCellFormula({ row: 3, col: 0 }, '=A1*4');
    });
    
    const a2Before = engine.getCellValue({ row: 1, col: 0 });
    const a3Before = engine.getCellValue({ row: 2, col: 0 });
    const a4Before = engine.getCellValue({ row: 3, col: 0 });
    
    // Change A1
    await engine.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 20));
    
    const a2After = engine.getCellValue({ row: 1, col: 0 });
    const a3After = engine.getCellValue({ row: 2, col: 0 });
    const a4After = engine.getCellValue({ row: 3, col: 0 });
    
    // All should have doubled
    expect(a2After).toBe((a2Before as number) * 2);
    expect(a3After).toBe((a3Before as number) * 2);
    expect(a4After).toBe((a4Before as number) * 2);
  });

  test('M16: Transitive dependency A→B→C: changing A updates C', async () => {
    const engine = new SpreadsheetEngine('M16');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 5);
      ws.setCellFormula({ row: 0, col: 1 }, '=A1+10');
      ws.setCellFormula({ row: 0, col: 2 }, '=B1+10');
    });
    
    const cBefore = engine.getCellValue({ row: 0, col: 2 });
    
    await engine.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 15)); // A1: 5→15 (+10)
    
    const cAfter = engine.getCellValue({ row: 0, col: 2 });
    
    expect(cAfter).toBe((cBefore as number) + 10);
  });
});

describe('Metamorphic Properties — Idempotence', () => {
  
  test('M17: Setting same value twice is idempotent', async () => {
    const engine = new SpreadsheetEngine('M17');
    
    await engine.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 100));
    const stateAfterFirst = snapshotState(engine);
    
    await engine.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 100));
    const stateAfterSecond = snapshotState(engine);
    
    expect(stateAfterSecond).toEqual(stateAfterFirst);
  });

  test('M18: Clearing empty cell is idempotent', async () => {
    const engine = new SpreadsheetEngine('M18');
    
    const stateBefore = snapshotState(engine);
    
    await engine.run((ws) => ws.clearCell({ row: 5, col: 5 }));
    const stateAfter1 = snapshotState(engine);
    
    await engine.run((ws) => ws.clearCell({ row: 5, col: 5 }));
    const stateAfter2 = snapshotState(engine);
    
    expect(stateAfter1).toEqual(stateBefore);
    expect(stateAfter2).toEqual(stateBefore);
  });
});

describe('Metamorphic Properties — Substitution', () => {
  
  test('M19: Replacing cell reference with value should give same result', async () => {
    const engine = new SpreadsheetEngine('M19');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 42);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1*2');
    });
    
    const withReference = engine.getCellValue({ row: 1, col: 0 });
    
    await engine.run((ws) => {
      ws.setCellFormula({ row: 1, col: 1 }, '=42*2'); // Direct substitution
    });
    
    const withValue = engine.getCellValue({ row: 1, col: 1 });
    
    expect(withValue).toBe(withReference);
  });

  test('M20: Inlining formula should preserve result', async () => {
    const engine = new SpreadsheetEngine('M20');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 10);
      ws.setCellValue({ row: 0, col: 1 }, 20);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1+B1');
      ws.setCellFormula({ row: 2, col: 0 }, '=A2*2');
    });
    
    const composed = engine.getCellValue({ row: 2, col: 0 });
    
    await engine.run((ws) => {
      ws.setCellFormula({ row: 2, col: 1 }, '=(A1+B1)*2'); // Inlined
    });
    
    const inlined = engine.getCellValue({ row: 2, col: 1 });
    
    expect(inlined).toBe(composed);
  });
});

describe('Metamorphic Properties — Negation Symmetry', () => {
  
  test('M21: -(-A) = A (double negation)', async () => {
    const engine = new SpreadsheetEngine('M21');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 50);
      ws.setCellFormula({ row: 1, col: 0 }, '=-A1');
      ws.setCellFormula({ row: 2, col: 0 }, '=-A2');
    });
    
    const original = engine.getCellValue({ row: 0, col: 0 });
    const doubleNeg = engine.getCellValue({ row: 2, col: 0 });
    
    expect(doubleNeg).toBe(original);
  });

  test('M22: A - B = -(B - A) (negation symmetry)', async () => {
    const engine = new SpreadsheetEngine('M22');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 100);
      ws.setCellValue({ row: 0, col: 1 }, 30);
      ws.setCellFormula({ row: 1, col: 0 }, '=A1-B1');
      ws.setCellFormula({ row: 1, col: 1 }, '=-(B1-A1)');
    });
    
    const aMinusB = engine.getCellValue({ row: 1, col: 0 });
    const negBMinusA = engine.getCellValue({ row: 1, col: 1 });
    
    expect(aMinusB).toBe(negBMinusA);
  });
});

describe('Metamorphic Properties — Comparison Consistency', () => {
  
  test('M23: If A=B and B=C, then A=C (transitivity)', async () => {
    const engine = new SpreadsheetEngine('M23');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 42);
      ws.setCellValue({ row: 0, col: 1 }, 42);
      ws.setCellValue({ row: 0, col: 2 }, 42);
      
      ws.setCellFormula({ row: 1, col: 0 }, '=A1=B1');
      ws.setCellFormula({ row: 1, col: 1 }, '=B1=C1');
      ws.setCellFormula({ row: 1, col: 2 }, '=A1=C1');
    });
    
    const aEqualsB = engine.getCellValue({ row: 1, col: 0 });
    const bEqualsC = engine.getCellValue({ row: 1, col: 1 });
    const aEqualsC = engine.getCellValue({ row: 1, col: 2 });
    
    expect(aEqualsB).toBe(true);
    expect(bEqualsC).toBe(true);
    expect(aEqualsC).toBe(true);
  });

  test('M24: (A > B) = NOT(A <= B)', async () => {
    const engine = new SpreadsheetEngine('M24');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 50);
      ws.setCellValue({ row: 0, col: 1 }, 30);
      
      ws.setCellFormula({ row: 1, col: 0 }, '=A1>B1');
      ws.setCellFormula({ row: 1, col: 1 }, '=NOT(A1<=B1)');
    });
    
    const greaterThan = engine.getCellValue({ row: 1, col: 0 });
    const notLessOrEqual = engine.getCellValue({ row: 1, col: 1 });
    
    expect(greaterThan).toBe(notLessOrEqual);
  });
});

describe('Metamorphic Properties — Clearing Symmetry', () => {
  
  test('M25: Clear all cells = empty sheet', async () => {
    const engine = new SpreadsheetEngine('M25');
    
    await engine.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 1);
      ws.setCellValue({ row: 1, col: 0 }, 2);
      ws.setCellValue({ row: 2, col: 0 }, 3);
    });
    
    await engine.run((ws) => {
      ws.clearCell({ row: 0, col: 0 });
      ws.clearCell({ row: 1, col: 0 });
      ws.clearCell({ row: 2, col: 0 });
    });
    
    const state = snapshotState(engine);
    
    expect(state.cells.length).toBe(0);
  });

  test('M26: Set then clear is identity (returns to empty)', async () => {
    const engine = new SpreadsheetEngine('M26');
    
    const emptyState = snapshotState(engine);
    
    await engine.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 999));
    await engine.run((ws) => ws.clearCell({ row: 0, col: 0 }));
    
    const finalState = snapshotState(engine);
    
    expect(finalState).toEqual(emptyState);
  });
});

// Helper: Snapshot engine state
function snapshotState(engine: SpreadsheetEngine) {
  const cells: Array<{ row: number; col: number; value: any }> = [];
  
  // Scan a reasonable range for non-null cells
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < 26; col++) {
      const value = engine.getCellValue({ row, col });
      if (value !== null) {
        cells.push({ row, col, value });
      }
    }
  }
  
  return { cells };
}
