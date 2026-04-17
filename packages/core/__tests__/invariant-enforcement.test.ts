/**
 * invariant-enforcement.test.ts
 *
 * Tests that verify execution kernel invariants (E1-E6) are ENFORCED at runtime.
 *
 * These are negative tests — they ensure illegal operations THROW rather than
 * silently corrupting state.
 *
 * Why this matters:
 * - Tests can be written incorrectly (bypass the API)
 * - Future refactors might create new bypass paths
 * - Runtime guards prevent silent corruption
 *
 * If these tests pass, the system is structurally safe — incorrect usage is
 * impossible, not just discouraged.
 */

import { SpreadsheetEngine, ExecutionError } from '../src/SpreadsheetEngine';
import { Worksheet } from '../src/worksheet';

describe('Execution Kernel Invariant Enforcement', () => {
  
  // ========================================================================
  // E2: Mutation Isolation — mutations only allowed inside engine.run()
  // ========================================================================
  
  describe('E2: Mutation Isolation', () => {
    
    test('setCellValue() throws outside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      // Populate a cell through proper API
      await engine.run((ws) => {
        ws.setCellValue({ row: 0, col: 0 }, 100);
      });
      
      // Try to mutate outside engine.run()
      const ws = (engine as any)._ws as Worksheet;
      
      expect(() => {
        ws.setCellValue({ row: 0, col: 0 }, 200);
      }).toThrow(/E2 INVARIANT VIOLATION/);
    });
    
    test('setCellFormula() throws outside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      await engine.run((ws) => {
        ws.setCellValue({ row: 0, col: 0 }, 100);
      });
      
      const ws = (engine as any)._ws as Worksheet;
      
      expect(() => {
        ws.setCellFormula({ row: 1, col: 0 }, '=A1+50');
      }).toThrow(/E2 INVARIANT VIOLATION/);
    });
    
    test('setSpillSource() throws outside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      const ws = (engine as any)._ws as Worksheet;
      
      expect(() => {
        ws.setSpillSource({ row: 0, col: 0 }, { range: { row: 0, col: 0, rowSpan: 3, colSpan: 1 } });
      }).toThrow(/E2 INVARIANT VIOLATION/);
    });
    
    test('setSpilledFrom() throws outside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      const ws = (engine as any)._ws as Worksheet;
      
      expect(() => {
        ws.setSpilledFrom({ row: 1, col: 0 }, { row: 0, col: 0 });
      }).toThrow(/E2 INVARIANT VIOLATION/);
    });
    
    test('clearSpillSource() throws outside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      // First populate through proper API
      await engine.run((ws) => {
        ws.setSpillSource({ row: 0, col: 0 }, { range: { row: 0, col: 0, rowSpan: 3, colSpan: 1 } });
      });
      
      const ws = (engine as any)._ws as Worksheet;
      
      expect(() => {
        ws.clearSpillSource({ row: 0, col: 0 });
      }).toThrow(/E2 INVARIANT VIOLATION/);
    });
    
    test('clearSpilledFrom() throws outside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      // First populate through proper API
      await engine.run((ws) => {
        ws.setSpilledFrom({ row: 1, col: 0 }, { row: 0, col: 0 });
      });
      
      const ws = (engine as any)._ws as Worksheet;
      
      expect(() => {
        ws.clearSpilledFrom({ row: 1, col: 0 });
      }).toThrow(/E2 INVARIANT VIOLATION/);
    });
    
    test('mutations work correctly inside engine.run()', async () => {
      const engine = new SpreadsheetEngine('E2-Test');
      
      // This should NOT throw — it's inside engine.run()
      await engine.run((ws) => {
        ws.setCellValue({ row: 0, col: 0 }, 100);
        ws.setCellFormula({ row: 1, col: 0 }, '=A1+50');
        ws.setSpillSource({ row: 2, col: 0 }, { range: { row: 2, col: 0, rowSpan: 3, colSpan: 1 } });
        ws.setSpilledFrom({ row: 3, col: 0 }, { row: 2, col: 0 });
      });
      
      // Verify state is correct
      expect(engine.getCellValue({ row: 0, col: 0 })).toBe(100);
      expect(engine.getCellValue({ row: 1, col: 0 })).toBe(150);
    });
  });
  
  // ========================================================================
  // E1: Single Execution Thread — concurrent run() calls throw
  // ========================================================================
  
  describe('E1: Single Execution Thread', () => {
    
    test('concurrent run() calls throw ExecutionError', async () => {
      const engine = new SpreadsheetEngine('E1-Test');
      
      const promise1 = engine.run(async (ws) => {
        ws.setCellValue({ row: 0, col: 0 }, 100);
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // Try to start another run() while first is still executing
      const promise2 = engine.run((ws) => {
        ws.setCellValue({ row: 1, col: 0 }, 200);
      });
      
      await expect(promise2).rejects.toThrow(ExecutionError);
      await expect(promise2).rejects.toThrow(/CONCURRENT_RUN/);
      
      // First should complete successfully
      await promise1;
      expect(engine.getCellValue({ row: 0, col: 0 })).toBe(100);
    });
  });
  
  // ========================================================================
  // E6: Re-entrancy Safety — event handlers cannot call run()
  // ========================================================================
  
  describe('E6: Re-entrancy Safety', () => {
    
    test('event handler cannot call run() (state is COMPUTING)', async () => {
      const engine = new SpreadsheetEngine('E6-Test');
      
      let reentrantCallAttempted = false;
      let reentrantCallError: Error | null = null;
      
      // Subscribe to events
      engine.on('cellsChanged', async () => {
        reentrantCallAttempted = true;
        
        try {
          // This should throw — we're in COMPUTING state
          await engine.run((ws) => {
            ws.setCellValue({ row: 10, col: 10 }, 999);
          });
        } catch (err) {
          reentrantCallError = err as Error;
        }
      });
      
      // Trigger an event
      await engine.run((ws) => {
        ws.setCellValue({ row: 0, col: 0 }, 100);
      });
      
      expect(reentrantCallAttempted).toBe(true);
      expect(reentrantCallError).toBeInstanceOf(ExecutionError);
      expect(reentrantCallError?.message).toMatch(/CONCURRENT_RUN/);
    });
  });
  
  // ========================================================================
  // Integration: Multiple invariants working together
  // ========================================================================
  
  describe('Integration: Invariants Compose Correctly', () => {
    
    test('all invariants enforced in realistic workflow', async () => {
      const engine = new SpreadsheetEngine('Integration');
      
      // 1. Normal operation works
      await engine.run((ws) => {
        ws.setCellValue({ row: 0, col: 0 }, 10);
        ws.setCellValue({ row: 1, col: 0 }, 20);
        ws.setCellFormula({ row: 2, col: 0 }, '=A1+A2');
      });
      
      expect(engine.getCellValue({ row: 2, col: 0 })).toBe(30);
      
      // 2. Direct mutation blocked (E2)
      const ws = (engine as any)._ws as Worksheet;
      expect(() => {
        ws.setCellValue({ row: 3, col: 0 }, 999);
      }).toThrow(/E2 INVARIANT VIOLATION/);
      
      // 3. Concurrent execution blocked (E1)
      const slowRun = engine.run(async (ws) => {
        ws.setCellValue({ row: 4, col: 0 }, 100);
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      await expect(engine.run((ws) => {
        ws.setCellValue({ row: 5, col: 0 }, 200);
      })).rejects.toThrow(ExecutionError);
      
      await slowRun;
      
      // 4. Re-entrancy blocked (E6)
      let caughtReentryError = false;
      
      engine.on('cellsChanged', async () => {
        try {
          await engine.run((ws) => {
            ws.setCellValue({ row: 99, col: 99 }, 999);
          });
        } catch (err) {
          if (err instanceof ExecutionError) {
            caughtReentryError = true;
          }
        }
      });
      
      await engine.run((ws) => {
        ws.setCellValue({ row: 6, col: 0 }, 300);
      });
      
      expect(caughtReentryError).toBe(true);
      
      // Verify final state is consistent
      expect(engine.getCellValue({ row: 0, col: 0 })).toBe(10);
      expect(engine.getCellValue({ row: 1, col: 0 })).toBe(20);
      expect(engine.getCellValue({ row: 2, col: 0 })).toBe(30);
      expect(engine.getCellValue({ row: 4, col: 0 })).toBe(100);
      expect(engine.getCellValue({ row: 6, col: 0 })).toBe(300);
      
      // Cell 5 should not exist (concurrent call was rejected)
      expect(engine.getCellValue({ row: 5, col: 0 })).toBe(null);
      
      // Cell 99 should not exist (reentrant call was rejected)
      expect(engine.getCellValue({ row: 99, col: 99 })).toBe(null);
    });
  });
});
