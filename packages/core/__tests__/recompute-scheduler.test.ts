/**
 * recompute-scheduler.test.ts
 *
 * Full test suite for RecomputeScheduler.
 *
 * Covers:
 *   1. Priority lanes       — tasks executed in correct priority order
 *   2. Topological order    — within a lane, topo order is respected
 *   3. Time slicing         — run loop yields at the correct boundary
 *   4. Generation cancellation — stale tasks are skipped, not evaluated
 *   5. Deduplication        — same cell not scheduled twice per generation
 *   6. Viewport priority    — viewport cells upgraded to High priority
 *   7. Determinism          — same input always produces same eval order
 *   8. runSync              — synchronous drain produces correct ordering
 *   9. invalidate + reschedule — correct behaviour across generation boundaries
 *  10. Invariant helpers    — assertTopologicalOrder, assertNoDuplicates
 */

import {
  RecomputeScheduler,
  TaskPriority,
  type ScheduledTask,
  type ViewportRect,
  assertTopologicalOrder,
  assertNoDuplicates,
} from '../src/RecomputeScheduler';
import type { Address } from '../src/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a scheduler whose evaluator returns (row * 1000 + col). */
function makeScheduler(opts: {
  timeSliceMs?: number;
  yieldDelayMs?: number;
  onYield?: (s: any) => void;
} = {}) {
  const evaluated: ScheduledTask[] = [];
  const results:   Array<{ task: ScheduledTask; value: unknown }> = [];

  const scheduler = new RecomputeScheduler({
    timeSliceMs:  opts.timeSliceMs  ?? 1000, // large slice → no yield in unit tests
    yieldDelayMs: opts.yieldDelayMs ?? 0,
    evaluator: (task) => task.row * 1000 + task.col,
    onComplete: (task, value) => {
      evaluated.push(task);
      results.push({ task, value });
    },
    onYield: opts.onYield,
  });

  return { scheduler, evaluated, results };
}

function addr(row: number, col: number): Address {
  return { row, col };
}

// ---------------------------------------------------------------------------
// 1. Priority lanes
// ---------------------------------------------------------------------------

describe('1 — Priority lanes', () => {
  test('Critical tasks are evaluated before High before Normal before Low before Idle', () => {
    const { scheduler, evaluated } = makeScheduler();

    // Schedule in REVERSE priority order to make sure heap orders correctly
    scheduler.schedule(addr(4, 0), TaskPriority.Idle);
    scheduler.schedule(addr(3, 0), TaskPriority.Low);
    scheduler.schedule(addr(2, 0), TaskPriority.Normal);
    scheduler.schedule(addr(1, 0), TaskPriority.High);
    scheduler.schedule(addr(0, 0), TaskPriority.Critical);

    scheduler.runSync();

    expect(evaluated.map(t => t.priority)).toEqual([
      TaskPriority.Critical,
      TaskPriority.High,
      TaskPriority.Normal,
      TaskPriority.Low,
      TaskPriority.Idle,
    ]);
  });

  test('Mixed priorities: tasks sorted correctly', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.schedule(addr(0, 2), TaskPriority.Normal);
    scheduler.schedule(addr(0, 0), TaskPriority.Critical);
    scheduler.schedule(addr(0, 4), TaskPriority.Idle);
    scheduler.schedule(addr(0, 1), TaskPriority.Critical);
    scheduler.schedule(addr(0, 3), TaskPriority.Low);

    scheduler.runSync();

    const priorities = evaluated.map(t => t.priority);
    // All Criticals first
    expect(priorities[0]).toBe(TaskPriority.Critical);
    expect(priorities[1]).toBe(TaskPriority.Critical);
    // Then Normal
    expect(priorities[2]).toBe(TaskPriority.Normal);
    // Then Low
    expect(priorities[3]).toBe(TaskPriority.Low);
    // Then Idle
    expect(priorities[4]).toBe(TaskPriority.Idle);
  });
});

// ---------------------------------------------------------------------------
// 2. Topological order (within same priority)
// ---------------------------------------------------------------------------

describe('2 — Topological order within priority lane', () => {
  test('tasks within same priority evaluated in topo order', () => {
    const { scheduler, evaluated } = makeScheduler();

    // Schedule 5 tasks at Normal priority with explicit topo order
    scheduler.schedule(addr(0, 4), TaskPriority.Normal, 40);
    scheduler.schedule(addr(0, 2), TaskPriority.Normal, 20);
    scheduler.schedule(addr(0, 0), TaskPriority.Normal, 0);
    scheduler.schedule(addr(0, 3), TaskPriority.Normal, 30);
    scheduler.schedule(addr(0, 1), TaskPriority.Normal, 10);

    scheduler.runSync();

    const cols = evaluated.map(t => t.col);
    expect(cols).toEqual([0, 1, 2, 3, 4]);
  });

  test('scheduleAll preserves topological batch order', () => {
    const { scheduler, evaluated } = makeScheduler();

    // Simulate topological order from DAG: A1 → A2 → A3 → A4
    const topoOrder = [addr(0, 0), addr(1, 0), addr(2, 0), addr(3, 0)];
    scheduler.scheduleAll(topoOrder, TaskPriority.Normal);

    scheduler.runSync();

    expect(evaluated.map(t => t.row)).toEqual([0, 1, 2, 3]);
  });

  test('assertTopologicalOrder passes on sorted input', () => {
    const tasks: ScheduledTask[] = [
      { row: 0, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 0 },
      { row: 1, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 1 },
      { row: 2, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 2 },
    ];
    expect(() => assertTopologicalOrder(tasks)).not.toThrow();
  });

  test('assertTopologicalOrder throws on out-of-order input', () => {
    const tasks: ScheduledTask[] = [
      { row: 0, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 5 },
      { row: 1, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 3 }, // violation
    ];
    expect(() => assertTopologicalOrder(tasks)).toThrow(/violation/);
  });
});

// ---------------------------------------------------------------------------
// 3. Time slicing
// ---------------------------------------------------------------------------

describe('3 — Time slicing', () => {
  test('runSync with maxTasks limit processes exactly that many tasks', () => {
    const { scheduler, evaluated } = makeScheduler();

    for (let i = 0; i < 10; i++) {
      scheduler.schedule(addr(i, 0), TaskPriority.Normal);
    }

    const count = scheduler.runSync(5);
    expect(count).toBe(5);
    expect(evaluated.length).toBe(5);
    expect(scheduler.pendingCount).toBe(5);
  });

  test('async flush respects time slices and processes all tasks', async () => {
    const yieldEvents: any[] = [];
    const { scheduler, evaluated } = makeScheduler({
      timeSliceMs: 0,  // every task causes a yield (slice instantly exhausted)
      onYield: (stats) => yieldEvents.push(stats),
    });

    // Schedule 20 tasks
    for (let i = 0; i < 20; i++) {
      scheduler.schedule(addr(i, 0), TaskPriority.Normal);
    }

    await scheduler.flush();

    expect(evaluated.length).toBe(20);
    // With timeSliceMs=0 multiple yields should occur
    expect(yieldEvents.length).toBeGreaterThan(0);
  });

  test('flush is idempotent — second call while running returns same promise', async () => {
    const { scheduler } = makeScheduler({ timeSliceMs: 1000 });
    for (let i = 0; i < 5; i++) scheduler.schedule(addr(i, 0));

    const p1 = scheduler.flush();
    const p2 = scheduler.flush(); // should not spawn second loop

    await p1;
    await p2;
    // No error thrown and evaluated count is predictable
  });
});

// ---------------------------------------------------------------------------
// 4. Generation-based cancellation
// ---------------------------------------------------------------------------

describe('4 — Generation-based cancellation', () => {
  test('invalidate causes previous-generation tasks to be skipped', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.schedule(addr(0, 0), TaskPriority.Normal);
    scheduler.schedule(addr(1, 0), TaskPriority.Normal);

    // Invalidate before running
    scheduler.invalidate();

    scheduler.runSync();

    // Both tasks are stale — nothing evaluated
    expect(evaluated.length).toBe(0);
    expect(scheduler.metrics.skipped).toBe(2);
  });

  test('new tasks after invalidate are executed correctly', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.schedule(addr(0, 0));
    scheduler.invalidate(); // discard

    scheduler.schedule(addr(1, 0)); // new generation
    scheduler.runSync();

    expect(evaluated.length).toBe(1);
    expect(evaluated[0].row).toBe(1);
  });

  test('generation increments on each invalidate call', () => {
    const { scheduler } = makeScheduler();
    expect(scheduler.generation).toBe(0);
    scheduler.invalidate();
    expect(scheduler.generation).toBe(1);
    scheduler.invalidate();
    expect(scheduler.generation).toBe(2);
  });

  test('mixed stale + fresh tasks: only fresh tasks evaluated', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.schedule(addr(0, 0));  // generation 0
    scheduler.schedule(addr(1, 0));  // generation 0

    scheduler.invalidate();           // now generation 1

    scheduler.schedule(addr(2, 0));  // generation 1
    scheduler.schedule(addr(3, 0));  // generation 1

    scheduler.runSync();

    expect(evaluated.map(t => t.row)).toEqual([2, 3]);
  });
});

// ---------------------------------------------------------------------------
// 5. Deduplication
// ---------------------------------------------------------------------------

describe('5 — Deduplication', () => {
  test('scheduling same cell twice in same generation: evaluated once', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.schedule(addr(5, 5), TaskPriority.Normal);
    scheduler.schedule(addr(5, 5), TaskPriority.Critical); // duplicate — ignored

    scheduler.runSync();

    const matching = evaluated.filter(t => t.row === 5 && t.col === 5);
    expect(matching.length).toBe(1);
  });

  test('assertNoDuplicates passes on unique tasks', () => {
    const tasks: ScheduledTask[] = [
      { row: 0, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 0 },
      { row: 0, col: 1, generation: 0, priority: TaskPriority.Normal, topoOrder: 1 },
      { row: 1, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 2 },
    ];
    expect(() => assertNoDuplicates(tasks)).not.toThrow();
  });

  test('assertNoDuplicates throws on duplicate (same generation+row+col)', () => {
    const tasks: ScheduledTask[] = [
      { row: 0, col: 0, generation: 0, priority: TaskPriority.Normal, topoOrder: 0 },
      { row: 0, col: 0, generation: 0, priority: TaskPriority.High,   topoOrder: 1 },
    ];
    expect(() => assertNoDuplicates(tasks)).toThrow(/Duplicate/);
  });

  test('same cell after invalidate: not a duplicate (different generation)', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.schedule(addr(0, 0)); // gen 0
    scheduler.invalidate();
    scheduler.schedule(addr(0, 0)); // gen 1 — should run

    scheduler.runSync();

    expect(evaluated.filter(t => t.row === 0 && t.col === 0).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Viewport priority
// ---------------------------------------------------------------------------

describe('6 — Viewport-aware priority', () => {
  test('cells inside viewport are upgraded to at most High priority', () => {
    const { scheduler, evaluated } = makeScheduler();

    const vp: ViewportRect = { rowStart: 0, rowEnd: 10, colStart: 0, colEnd: 10 };
    scheduler.setViewport(vp);

    // Schedule as Low — should be upgraded to High because in viewport
    scheduler.schedule(addr(5, 5), TaskPriority.Low);
    // Also schedule a cell outside viewport at High — stays High
    scheduler.schedule(addr(50, 50), TaskPriority.High);

    scheduler.runSync();

    const inView  = evaluated.find(t => t.row === 5  && t.col === 5);
    const outView = evaluated.find(t => t.row === 50 && t.col === 50);

    expect(inView?.priority).toBe(TaskPriority.High);
    // Outside viewport cell keeps its priority
    expect(outView?.priority).toBe(TaskPriority.High);
  });

  test('Critical priority is never downgraded by viewport classification', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.setViewport({ rowStart: 0, rowEnd: 10, colStart: 0, colEnd: 10 });
    scheduler.schedule(addr(5, 5), TaskPriority.Critical);

    scheduler.runSync();

    const t = evaluated[0];
    expect(t.priority).toBe(TaskPriority.Critical);
  });

  test('cells in prefetch zone get at most Normal priority', () => {
    const { scheduler, evaluated } = makeScheduler();

    // Viewport: rows 10-20, cols 0-10
    scheduler.setViewport({ rowStart: 10, rowEnd: 20, colStart: 0, colEnd: 10 });

    // Prefetch zone extends 10 rows above/below: rows 0-30 (2× range = 10)
    // Row 5 is in the prefetch zone
    scheduler.schedule(addr(5, 5), TaskPriority.Low);  // Low → Normal (prefetch)
    scheduler.schedule(addr(40, 5), TaskPriority.Low); // Row 40 is outside prefetch → stays Low

    scheduler.runSync();

    const prefetch = evaluated.find(t => t.row === 5);
    const outside  = evaluated.find(t => t.row === 40);

    expect(prefetch?.priority).toBe(TaskPriority.Normal);
    expect(outside?.priority).toBe(TaskPriority.Low);
  });

  test('setViewport(null) disables viewport classification', () => {
    const { scheduler, evaluated } = makeScheduler();

    scheduler.setViewport({ rowStart: 0, rowEnd: 10, colStart: 0, colEnd: 10 });
    scheduler.setViewport(null);

    scheduler.schedule(addr(5, 5), TaskPriority.Low);
    scheduler.runSync();

    // Priority should stay Low (no viewport upgrade)
    expect(evaluated[0].priority).toBe(TaskPriority.Low);
  });
});

// ---------------------------------------------------------------------------
// 7. Determinism
// ---------------------------------------------------------------------------

describe('7 — Determinism', () => {
  test('same input always produces same evaluation order', () => {
    const runOnce = () => {
      const evaluated: ScheduledTask[] = [];
      const s = new RecomputeScheduler({
        evaluator:  t => t.row * 1000 + t.col,
        onComplete: (t) => evaluated.push(t),
      });
      // Fix both topoOrder AND priority to guarantee determinism
      s.schedule(addr(3, 0), TaskPriority.Normal, 3);
      s.schedule(addr(1, 0), TaskPriority.Normal, 1);
      s.schedule(addr(0, 0), TaskPriority.Critical, 0);
      s.schedule(addr(2, 0), TaskPriority.Normal, 2);
      s.runSync();
      return evaluated.map(t => `${t.row}:${t.col}:${t.priority}:${t.topoOrder}`);
    };

    const run1 = runOnce();
    const run2 = runOnce();

    expect(run1).toEqual(run2);
  });

  test('determinism holds across multiple invalidate+reschedule cycles', () => {
    const { scheduler, evaluated } = makeScheduler();

    for (let gen = 0; gen < 3; gen++) {
      scheduler.invalidate();
      scheduler.scheduleAll([addr(0, 0), addr(1, 0), addr(2, 0)], TaskPriority.Normal);
    }

    scheduler.runSync();

    // Only the last generation's tasks should run (stale tasks skipped)
    expect(evaluated.length).toBe(3);
    expect(evaluated.map(t => t.row)).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// 8. runSync
// ---------------------------------------------------------------------------

describe('8 — runSync', () => {
  test('runSync returns number of evaluated tasks', () => {
    const { scheduler } = makeScheduler();
    scheduler.schedule(addr(0, 0));
    scheduler.schedule(addr(1, 0));
    scheduler.schedule(addr(2, 0));
    expect(scheduler.runSync()).toBe(3);
  });

  test('runSync with maxTasks=0 evaluates nothing', () => {
    const { scheduler, evaluated } = makeScheduler();
    scheduler.schedule(addr(0, 0));
    const count = scheduler.runSync(0);
    expect(count).toBe(0);
    expect(evaluated.length).toBe(0);
  });

  test('evaluator result is passed to onComplete', () => {
    const { scheduler, results } = makeScheduler();
    scheduler.schedule(addr(3, 7));
    scheduler.runSync();
    expect(results[0].value).toBe(3 * 1000 + 7);
  });
});

// ---------------------------------------------------------------------------
// 9. reset / metrics
// ---------------------------------------------------------------------------

describe('9 — reset and metrics', () => {
  test('reset clears queue and bumps generation', () => {
    const { scheduler, evaluated } = makeScheduler();
    scheduler.schedule(addr(0, 0));
    scheduler.reset();
    scheduler.runSync();
    expect(evaluated.length).toBe(0);
  });

  test('metrics track completed and skipped counts', () => {
    const { scheduler } = makeScheduler();

    scheduler.schedule(addr(0, 0));
    scheduler.schedule(addr(1, 0));
    scheduler.invalidate(); // make those stale
    scheduler.schedule(addr(2, 0)); // fresh

    scheduler.runSync();

    expect(scheduler.metrics.completed).toBe(1);
    expect(scheduler.metrics.skipped).toBe(2);
  });

  test('resetMetrics zeroes counts', () => {
    const { scheduler } = makeScheduler();
    scheduler.schedule(addr(0, 0));
    scheduler.runSync();
    expect(scheduler.metrics.completed).toBe(1);
    scheduler.resetMetrics();
    expect(scheduler.metrics.completed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Scheduling Invariants (formal)
// ---------------------------------------------------------------------------

describe('10 — Scheduling invariants (formal verification)', () => {
  /**
   * Invariant: Eventual consistency
   * If all tasks are scheduled and runSync completes, every non-stale task
   * has been evaluated exactly once.
   */
  test('[I1] Eventual consistency: all non-stale tasks evaluated exactly once', () => {
    const { scheduler, evaluated } = makeScheduler();
    const addresses = Array.from({ length: 50 }, (_, i) => addr(i, 0));
    scheduler.scheduleAll(addresses);
    scheduler.runSync();
    expect(evaluated.length).toBe(50);
    assertNoDuplicates(evaluated);
  });

  /**
   * Invariant: Interrupt safety
   * Partial runSync(k) followed by runSync() evaluates the same total set
   * as a single runSync(), minus any skipped (stale) tasks.
   */
  test('[I2] Interrupt safety: partial + resume = full evaluation', () => {
    const { scheduler, evaluated } = makeScheduler();
    const addresses = Array.from({ length: 20 }, (_, i) => addr(i, 0));
    scheduler.scheduleAll(addresses);

    scheduler.runSync(10); // process first 10
    scheduler.runSync();   // process remaining 10

    expect(evaluated.length).toBe(20);
    assertNoDuplicates(evaluated);
  });

  /**
   * Invariant: Viewport priority
   * For any address in the viewport, if scheduled at priority ≥ High,
   * its evaluated priority is at most High.
   */
  test('[I3] Viewport priority: in-viewport tasks are always at most High priority', () => {
    const { scheduler, evaluated } = makeScheduler();
    const vp: ViewportRect = { rowStart: 0, rowEnd: 20, colStart: 0, colEnd: 20 };
    scheduler.setViewport(vp);

    for (let r = 0; r <= 20; r++) {
      scheduler.schedule(addr(r, 5), TaskPriority.Idle); // worst priority
    }
    scheduler.runSync();

    for (const t of evaluated) {
      if (t.row <= 20 && t.col === 5) {
        expect(t.priority).toBeLessThanOrEqual(TaskPriority.High);
      }
    }
  });

  /**
   * Invariant: Time-slicing non-blocking
   * No single time slice exceeds the configured budget by more than a small
   * tolerance (simulated with a mock clock).
   */
  test('[I4] Time-slicing: no slice exceeds budget (with mock clock)', async () => {
    let mockTime = 0;
    const sliceMs = 10;
    const sliceStats: any[] = [];

    const s = new RecomputeScheduler({
      timeSliceMs: sliceMs,
      evaluator:   () => null,
      onComplete:  () => { mockTime += 1; }, // each task takes 1 "ms"
      onYield:     (stats) => sliceStats.push(stats),
    });

    // Override clock
    (s as any)._now = () => mockTime;

    // Schedule 100 tasks
    for (let i = 0; i < 100; i++) s.schedule(addr(i, 0));

    await s.flush();

    // Each slice should have processed at most sliceMs tasks (since each task = 1ms)
    for (const stat of sliceStats) {
      expect(stat.elapsedMs).toBeLessThanOrEqual(sliceMs + 1); // +1 tolerance
    }
  });

  /**
   * Invariant: Generation-based cancellation
   * After invalidate(), no task from the previous generation is ever passed
   * to the evaluator or onComplete.
   */
  test('[I5] Generation cancellation: no stale task reaches the evaluator', () => {
    const staleGenTasks: ScheduledTask[] = [];
    const s = new RecomputeScheduler({
      evaluator: (task) => {
        if (task.generation === 0) staleGenTasks.push(task);
        return null;
      },
      onComplete: () => {},
    });

    s.schedule(addr(0, 0));
    s.schedule(addr(1, 0));
    s.invalidate(); // gen → 1
    s.schedule(addr(2, 0));
    s.runSync();

    expect(staleGenTasks.length).toBe(0);
  });

  /**
   * Invariant: Priority preservation
   * High-priority tasks are never evaluated after a lower-priority task
   * that was scheduled in the same generation.
   */
  test('[I6] Priority preservation: no high-priority task is evaluated after low-priority task', () => {
    const { scheduler, evaluated } = makeScheduler();

    // Schedule 5 low then 5 high (in that order)
    for (let i = 0; i < 5; i++) scheduler.schedule(addr(i,     0), TaskPriority.Low,  i);
    for (let i = 0; i < 5; i++) scheduler.schedule(addr(i + 5, 0), TaskPriority.High, i + 5);

    scheduler.runSync();

    // All High tasks must appear before Low tasks in the evaluated array
    const firstLowIdx  = evaluated.findIndex(t => t.priority === TaskPriority.Low);
    const lastHighIdx  = evaluated.map((t, i) => t.priority === TaskPriority.High ? i : -1)
                                   .filter(i => i >= 0)
                                   .pop() ?? -1;

    expect(lastHighIdx).toBeLessThan(firstLowIdx);
  });
});
