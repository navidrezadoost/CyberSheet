/// <reference types="jest" />

/**
 * spreadsheet-engine.test.ts — Execution Kernel Tests
 *
 * Proves that SpreadsheetEngine enforces correct-by-construction execution:
 *   E1. Single execution thread (no concurrent run())
 *   E2. Mutation isolation (mutations only inside run())
 *   E3. Scheduler encapsulation (no external flush())
 *   E4. Event ordering (events AFTER scheduler completes)
 *   E5. Deterministic execution (same input → same output)
 */

import { SpreadsheetEngine, ExecutionError } from '../src/SpreadsheetEngine';
import type { Address } from '../src/types';

// ---------------------------------------------------------------------------
// Invariant E1: Single Execution Thread
// ---------------------------------------------------------------------------

describe('Invariant E1 — Single Execution Thread', () => {
  test('concurrent run() calls are rejected', async () => {
    const engine = new SpreadsheetEngine();

    let run1Finished = false;
    let run2Started = false;

    // Start run1 (make it async so it doesn't complete immediately)
    const run1Promise = engine.run(async (ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 10);
      await new Promise(resolve => setTimeout(resolve, 10)); // simulate work
      run1Finished = true;
    });

    // Try to start run2 while run1 is still executing
    await expect(async () => {
      run2Started = true;
      await engine.run((ws) => {
        ws.setCellValue({ row: 2, col: 1 }, 20);
      });
    }).rejects.toThrow(ExecutionError);

    // Wait for run1 to finish
    await run1Promise;

    expect(run1Finished).toBe(true);
    expect(run2Started).toBe(true); // run2 was attempted
    expect(engine.executionState).toBe('IDLE'); // back to idle after run1
  });

  test('sequential run() calls succeed', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 10);
    });

    // Second run() should succeed (first completed)
    await engine.run((ws) => {
      ws.setCellValue({ row: 2, col: 1 }, 20);
    });

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(10);
    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(20);
  });

  test('execution state transitions correctly', async () => {
    const engine = new SpreadsheetEngine();

    expect(engine.executionState).toBe('IDLE');

    let stateInsideCallback: string | null = null;

    await engine.run((ws) => {
      stateInsideCallback = engine.executionState;
      ws.setCellValue({ row: 1, col: 1 }, 5);
    });

    expect(stateInsideCallback).toBe('MUTATING');
    expect(engine.executionState).toBe('IDLE'); // back to idle after completion
  });
});

// ---------------------------------------------------------------------------
// Invariant E2: Mutation Isolation
// ---------------------------------------------------------------------------

describe('Invariant E2 — Mutation Isolation', () => {
  test('mutations inside run() succeed', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 42);
      ws.setCellValue({ row: 2, col: 1 }, '=A1*2');
    });

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(42);
    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(84); // formula evaluated
  });

  test('transaction rollback on callback error', async () => {
    const engine = new SpreadsheetEngine();

    // Set baseline value
    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 'stable');
    });

    // Run() that throws
    await expect(async () => {
      await engine.run((ws) => {
        ws.setCellValue({ row: 1, col: 1 }, 'corrupted');
        throw new Error('simulated-failure');
      });
    }).rejects.toThrow('simulated-failure');

    // State should be rolled back (still 'stable', not 'corrupted')
    expect(engine.getCellValue({ row: 1, col: 1 })).toBe('stable');
    expect(engine.executionState).toBe('IDLE'); // recovered to IDLE
  });
});

// ---------------------------------------------------------------------------
// Invariant E3: Scheduler Encapsulation
// ---------------------------------------------------------------------------

describe('Invariant E3 — Scheduler Encapsulation', () => {
  test('scheduler is not exposed on engine API', () => {
    const engine = new SpreadsheetEngine();

    // Scheduler should be private — no flush() method exposed
    expect((engine as any).flush).toBeUndefined();
    expect((engine as any)._scheduler).toBeDefined(); // private field exists
  });

  test('formulas are evaluated automatically (scheduler runs internally)', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 100);
      const cell = ws.getCell({ row: 2, col: 1 });
      if (cell) cell.formula = '=A1+1';
    });

    // Formula should have been evaluated by internal scheduler
    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(101);
  });
});

// ---------------------------------------------------------------------------
// Invariant E4: Event Ordering
// ---------------------------------------------------------------------------

describe('Invariant E4 — Event Ordering', () => {
  test('cellsChanged event is emitted AFTER formulas are evaluated', async () => {
    const engine = new SpreadsheetEngine();

    const events: Array<{ type: string; a2Value: unknown }> = [];

    engine.on('cellsChanged', () => {
      // Capture A2 value at the time event fires
      events.push({
        type: 'cellsChanged',
        a2Value: engine.getCellValue({ row: 2, col: 1 }),
      });
    });

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 10);
      const cell = ws.getCell({ row: 2, col: 1 });
      if (cell) cell.formula = '=A1*2';
    });

    // Event should have fired
    expect(events).toHaveLength(1);

    // A2 should have its COMPUTED value when event fired (proof event is post-recompute)
    expect(events[0].a2Value).toBe(20); // not null or stale
  });

  test('formulasEvaluated event includes correct count', async () => {
    const engine = new SpreadsheetEngine();

    let evaluatedCount: number | null = null;

    engine.on('formulasEvaluated', (event: any) => {
      evaluatedCount = event.count;
    });

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 5);

      // 3 formulas
      const c2 = ws.getCell({ row: 2, col: 1 });
      const c3 = ws.getCell({ row: 3, col: 1 });
      const c4 = ws.getCell({ row: 4, col: 1 });

      if (c2) c2.formula = '=A1+1';
      if (c3) c3.formula = '=A2+1';
      if (c4) c4.formula = '=A3+1';
    });

    expect(evaluatedCount).toBe(3);
  });

  test('event handlers do not block execution', async () => {
    const engine = new SpreadsheetEngine();

    let handlerExecuted = false;

    engine.on('cellsChanged', () => {
      handlerExecuted = true;
      throw new Error('handler-error'); // should not break engine
    });

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 99);
    });

    // Handler ran (despite throwing)
    expect(handlerExecuted).toBe(true);

    // Engine is still functional
    expect(engine.executionState).toBe('IDLE');
    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Invariant E5: Deterministic Execution
// ---------------------------------------------------------------------------

describe('Invariant E5 — Deterministic Execution', () => {
  test('same mutations produce same final state', async () => {
    const engine1 = new SpreadsheetEngine('Sheet1');
    const engine2 = new SpreadsheetEngine('Sheet2');

    const setup = async (engine: SpreadsheetEngine) => {
      await engine.run((ws) => {
        ws.setCellValue({ row: 1, col: 1 }, 10);
        ws.setCellValue({ row: 2, col: 1 }, 20);

        const c3 = ws.getCell({ row: 3, col: 1 });
        const c4 = ws.getCell({ row: 4, col: 1 });

        if (c3) c3.formula = '=A1+A2';
        if (c4) c4.formula = '=A3*2';
      });
    };

    await setup(engine1);
    await setup(engine2);

    expect(engine1.getCellValue({ row: 3, col: 1 })).toBe(30);
    expect(engine1.getCellValue({ row: 4, col: 1 })).toBe(60);

    expect(engine2.getCellValue({ row: 3, col: 1 })).toBe(30);
    expect(engine2.getCellValue({ row: 4, col: 1 })).toBe(60);
  });

  test('run() is idempotent for read-only operations', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 'value');
    });

    const before = engine.getCellValue({ row: 1, col: 1 });

    // Empty run() (no mutations)
    await engine.run(() => {
      // no-op
    });

    const after = engine.getCellValue({ row: 1, col: 1 });

    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------// Invariant E6: Re-entrancy Safety
// ---------------------------------------------------------------------------

describe('Invariant E6 — Re-entrancy Safety', () => {
  test('event handlers cannot call run() (re-entrancy blocked)', async () => {
    const engine = new SpreadsheetEngine();

    let reentrantCallAttempted = false;
    let reentrantCallThrew = false;

    engine.on('cellsChanged', () => {
      reentrantCallAttempted = true;
      try {
        // Attempt re-entrant run() — should throw
        engine.run((ws) => {
          ws.setCellValue({ row: 2, col: 1 }, 'illegal');
        });
      } catch (err) {
        if (err instanceof ExecutionError && err.code === 'CONCURRENT_RUN') {
          reentrantCallThrew = true;
        }
      }
    });

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 'trigger');
    });

    expect(reentrantCallAttempted).toBe(true);
    expect(reentrantCallThrew).toBe(true);

    // State should be IDLE after successful completion
    expect(engine.executionState).toBe('IDLE');

    // Original mutation succeeded
    expect(engine.getCellValue({ row: 1, col: 1 })).toBe('trigger');

    // Re-entrant mutation did NOT succeed
    expect(engine.getCellValue({ row: 2, col: 1 })).toBeNull();
  });

  test('nested run() from async event handler is blocked', async () => {
    const engine = new SpreadsheetEngine();

    let asyncReentryBlocked = false;

    engine.on('formulasEvaluated', async () => {
      await new Promise(resolve => setTimeout(resolve, 0)); // yield

      try {
        await engine.run((ws) => {
          ws.setCellValue({ row: 3, col: 1 }, 'nested');
        });
      } catch (err) {
        if (err instanceof ExecutionError && err.code === 'CONCURRENT_RUN') {
          asyncReentryBlocked = true;
        }
      }
    });

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 10);
      const cell = ws.getCell({ row: 2, col: 1 });
      if (cell) cell.formula = '=A1*2';
    });

    // Wait for async event handler to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(asyncReentryBlocked).toBe(true);
    expect(engine.getCellValue({ row: 3, col: 1 })).toBeNull();
  });

  test('sequential run() calls after event emission succeed', async () => {
    const engine = new SpreadsheetEngine();

    let secondRunCompleted = false;

    engine.on('cellsChanged', () => {
      // Don't call run() here — wait for event emission to complete
      setTimeout(async () => {
        // THIS is legal: sequential run() after first completes
        await engine.run((ws) => {
          ws.setCellValue({ row: 2, col: 1 }, 'sequential');
        });
        secondRunCompleted = true;
      }, 5);
    });

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 'first');
    });

    // Wait for setTimeout callback
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(secondRunCompleted).toBe(true);
    expect(engine.getCellValue({ row: 1, col: 1 })).toBe('first');
    expect(engine.getCellValue({ row: 2, col: 1 })).toBe('sequential');
  });
});

// ---------------------------------------------------------------------------// Integration: Full Pipeline
// ---------------------------------------------------------------------------

describe('Integration — Full Execution Pipeline', () => {
  test('realistic scenario: mutation → commit → schedule → evaluate → events', async () => {
    const engine = new SpreadsheetEngine();

    const capturedEvents: string[] = [];

    engine.on('cellsChanged', () => {
      capturedEvents.push('cellsChanged');
    });

    engine.on('formulasEvaluated', () => {
      capturedEvents.push('formulasEvaluated');
    });

    await engine.run((ws) => {
      // Setup budget calculation
      ws.setCellValue({ row: 1, col: 1 }, 5000); // salary
      ws.setCellValue({ row: 1, col: 2 }, 1000); // freelance

      const income = ws.getCell({ row: 2, col: 1 });
      if (income) income.formula = '=A1+B1';

      ws.setCellValue({ row: 3, col: 1 }, 2000); // rent
      ws.setCellValue({ row: 3, col: 2 }, 800);  // food

      const expenses = ws.getCell({ row: 4, col: 1 });
      if (expenses) expenses.formula = '=A3+B3';

      const net = ws.getCell({ row: 5, col: 1 });
      if (net) net.formula = '=A2-A4';
    });

    // All formulas computed correctly
    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(6000);  // income
    expect(engine.getCellValue({ row: 4, col: 1 })).toBe(2800);  // expenses
    expect(engine.getCellValue({ row: 5, col: 1 })).toBe(3200);  // net

    // Events fired in correct order
    expect(capturedEvents).toEqual(['cellsChanged', 'formulasEvaluated']);
  });

  test('multiple run() calls maintain consistency', async () => {
    const engine = new SpreadsheetEngine();

    // First run
    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 10);
      const c2 = ws.getCell({ row: 2, col: 1 });
      if (c2) c2.formula = '=A1*2';
    });

    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(20);

    // Second run (mutation triggers recompute)
    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 50); // change source
    });

    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(100); // recomputed
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  test('empty run() succeeds', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run(() => {
      // no-op
    });

    expect(engine.executionState).toBe('IDLE');
  });

  test('run() with only reads succeeds', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 42);
    });

    let observedValue: unknown = null;

    await engine.run((ws) => {
      observedValue = ws.getCellValue({ row: 1, col: 1 });
    });

    expect(observedValue).toBe(42);
  });

  test('async callback is awaited', async () => {
    const engine = new SpreadsheetEngine();

    let asyncCompleted = false;

    await engine.run(async (ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 1);
      await new Promise(resolve => setTimeout(resolve, 5));
      asyncCompleted = true;
      ws.setCellValue({ row: 2, col: 1 }, 2);
    });

    expect(asyncCompleted).toBe(true);
    expect(engine.getCellValue({ row: 2, col: 1 })).toBe(2);
  });
});
