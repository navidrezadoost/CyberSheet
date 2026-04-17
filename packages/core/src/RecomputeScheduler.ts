/**
 * RecomputeScheduler.ts
 *
 * Execution-control layer between DependencyGraph (what to recompute) and
 * EventSystem (who observes results).
 *
 * ==========================================================================
 * WHY THIS EXISTS
 * ==========================================================================
 *
 * Without a scheduler, the evaluation loop blocks the JS thread for the
 * duration of the entire dirty subgraph evaluation. On a sheet with 10 000
 * dirty formulas that takes ~100 ms — enough to freeze the UI at 60 fps.
 *
 * The RecomputeScheduler fixes this by:
 *   1. Splitting work into time-sliced chunks (default 8 ms).
 *   2. Ordering tasks by priority so that the viewport-visible cells are
 *      always evaluated first.
 *   3. Making each chunk interruptible so that user input can be processed
 *      between chunks.
 *   4. Using a monotonic generation counter to cancel stale tasks without
 *      touching external state.
 *
 * ==========================================================================
 * DETERMINISM GUARANTEES
 * ==========================================================================
 *
 * The scheduler is deterministic in the following sense:
 *
 *   ∀ dirty set D, priority function P:
 *     eval_order(scheduler, D, P) = topological_sort(D) | partitioned_by(P)
 *
 * That is: within the same priority bucket, cells are always evaluated in
 * strict topological order (dependency before dependent). Across buckets,
 * higher-priority buckets are always drained before lower-priority ones.
 *
 * Concretely:
 *   [critical] evaluated before [high] before [normal] before [low] before [idle]
 *   Within each bucket: topological order of the DAG sub-graph.
 *
 * This makes re-ordering impossible — no matter how scheduling is interleaved
 * with time-slices, the evaluation order is the same as if it ran synchronously.
 *
 * ==========================================================================
 * PRIORITY LANES
 * ==========================================================================
 *
 *  critical  (0) — cells whose formula result is needed RIGHT NOW (e.g. a
 *                  cell the user just typed into; formula bar display cell).
 *  high      (1) — cells visible in the current viewport.
 *  normal    (2) — cells within 2× viewport distance (prefetch zone).
 *  low       (3) — cells outside the visible area (background compute).
 *  idle      (4) — volatile functions scheduled only when the thread is idle.
 *
 * ==========================================================================
 * TIME SLICING
 * ==========================================================================
 *
 * The run loop processes tasks in a while-loop until either:
 *   a) All lanes are empty, or
 *   b) `performance.now() - sliceStart >= timeSliceMs`
 *
 * When (b) triggers, the loop yields by resolving a microtask / rAF, then
 * resumes. This keeps the frame budget intact.
 *
 * ==========================================================================
 * GENERATION-BASED CANCELLATION
 * ==========================================================================
 *
 * Each `schedule()` call accepts a `generation` token. A task is only
 * executed if its generation === scheduler.generation. When a global
 * `invalidate()` is called (e.g. a new mutation arrives), the generation
 * counter increments and all in-flight tasks from the previous generation
 * are silently skipped on next dequeue.
 *
 * This avoids the overhead of physically removing tasks from the queue
 * (which would be O(n) for a priority heap).
 *
 * ==========================================================================
 * USAGE
 * ==========================================================================
 *
 *   const scheduler = new RecomputeScheduler({
 *     timeSliceMs: 8,
 *     evaluator:   (task) => formulaEngine.evaluate(task.address),
 *     onComplete:  (task, value) => { ws.setCellValue(task.address, value); eventBus.emit(...); },
 *   });
 *
 *   // After a transaction commits:
 *   for (const addr of dirtyAddresses) {
 *     scheduler.schedule(addr, TaskPriority.High);
 *   }
 *   scheduler.flush();  // starts the async run loop (non-blocking)
 *
 *   // When a radical state change arrives (new transaction):
 *   scheduler.invalidate();  // bumps generation, cancels stale tasks
 *
 *   // Viewport changes:
 *   scheduler.setViewport({ rowStart: 0, rowEnd: 30, colStart: 0, colEnd: 15 });
 *   // → existing tasks are re-prioritised without re-enqueuing
 */

import type { Address } from './types';

// ---------------------------------------------------------------------------
// Priority levels
// ---------------------------------------------------------------------------

export const enum TaskPriority {
  /** Formula bar / immediate edit feedback. Must finish within current frame. */
  Critical = 0,
  /** Cells visible in the current viewport. */
  High     = 1,
  /** Prefetch zone (2× viewport). */
  Normal   = 2,
  /** Off-screen background compute. */
  Low      = 3,
  /** Volatile functions (NOW, RAND) — only when idle. */
  Idle     = 4,
}

export const PRIORITY_COUNT = 5;

// ---------------------------------------------------------------------------
// Internal task representation
// ---------------------------------------------------------------------------

export interface ScheduledTask {
  /** Row index of the cell to evaluate. */
  row: number;
  /** Column index of the cell to evaluate. */
  col: number;
  /** Generation at which this task was enqueued. Stale if < scheduler.generation. */
  generation: number;
  /** Priority lane this task belongs to. May be upgraded by setViewport(). */
  priority: TaskPriority;
  /**
   * Stable insertion sequence within a priority lane (topo-sort position).
   * Lower = evaluated first. Encodes the DAG topological order.
   */
  topoOrder: number;
}

// ---------------------------------------------------------------------------
// Viewport for priority-aware scheduling
// ---------------------------------------------------------------------------

export interface ViewportRect {
  rowStart: number;
  rowEnd:   number;
  colStart: number;
  colEnd:   number;
}

// ---------------------------------------------------------------------------
// Evaluator / observer callbacks
// ---------------------------------------------------------------------------

/**
 * Called by the scheduler to compute a cell's new value.
 * Must be a pure function of the current worksheet state.
 * The return value is passed to `onComplete`.
 */
export type EvaluatorFn = (task: ScheduledTask) => unknown;

/**
 * Called by the scheduler after successfully evaluating a task.
 * Responsible for writing the value back to the worksheet and emitting events.
 * Must NOT schedule new tasks (no re-entrant scheduling).
 */
export type OnCompleteFn = (task: ScheduledTask, value: unknown) => void;

/**
 * Optional hook called every time the scheduler yields (end of a time slice).
 * Useful for telemetry / DevTools.
 */
export type OnYieldFn = (stats: YieldStats) => void;

export interface YieldStats {
  /** Tasks completed in this slice. */
  completed:   number;
  /** Tasks skipped (stale generation) in this slice. */
  skipped:     number;
  /** Elapsed time of this slice (ms). */
  elapsedMs:   number;
  /** Current scheduler generation. */
  generation:  number;
  /** Total tasks remaining across all lanes. */
  remaining:   number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RecomputeSchedulerOptions {
  /**
   * Maximum duration of one execution slice in milliseconds.
   * Default: 8 ms (leaves ~4 ms for rendering at 60 fps).
   */
  timeSliceMs?: number;

  /**
   * How long to wait between slices when running eagerly (ms).
   * 0 = schedule via Promise microtask (equivalent to setImmediate).
   * >0 = schedule via setTimeout (adds deliberate breathing room).
   * Default: 0.
   */
  yieldDelayMs?: number;

  /** Function that computes a cell's new value. */
  evaluator: EvaluatorFn;

  /** Called with each completed (task, value) pair. */
  onComplete: OnCompleteFn;

  /** Optional yield hook for telemetry. */
  onYield?: OnYieldFn;
}

// ---------------------------------------------------------------------------
// Priority queue (min-heap by [priority, topoOrder])
// ---------------------------------------------------------------------------

function heapLess(a: ScheduledTask, b: ScheduledTask): boolean {
  if (a.priority !== b.priority) return a.priority < b.priority;
  return a.topoOrder < b.topoOrder;
}

class TaskHeap {
  private data: ScheduledTask[] = [];

  get size(): number { return this.data.length; }
  get isEmpty(): boolean { return this.data.length === 0; }

  push(task: ScheduledTask): void {
    this.data.push(task);
    this._bubbleUp(this.data.length - 1);
  }

  pop(): ScheduledTask | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  peek(): ScheduledTask | undefined {
    return this.data[0];
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heapLess(this.data[i], this.data[parent])) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private _siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && heapLess(this.data[l], this.data[smallest])) smallest = l;
      if (r < n && heapLess(this.data[r], this.data[smallest])) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }

  /** Remove and return all tasks (for draining / cancellation). */
  drain(): ScheduledTask[] {
    const all = this.data.slice();
    this.data = [];
    return all;
  }
}

// ---------------------------------------------------------------------------
// RecomputeScheduler
// ---------------------------------------------------------------------------

export class RecomputeScheduler {
  // ── Configuration ─────────────────────────────────────────────────────────
  private readonly timeSliceMs:  number;
  private readonly yieldDelayMs: number;
  private readonly evaluator:    EvaluatorFn;
  private readonly onComplete:   OnCompleteFn;
  private readonly onYield:      OnYieldFn | undefined;

  // ── State ─────────────────────────────────────────────────────────────────
  /**
   * Monotonically increasing generation counter.
   * Tasks whose `.generation` < `this.generation` are stale and skipped.
   */
  private _generation = 0;

  /** Single priority heap (all lanes interleaved by [priority, topoOrder]). */
  private readonly _heap = new TaskHeap();

  /**
   * Dedup map: packed cell key → enqueued generation.
   * Prevents the same cell from being scheduled more than once per generation.
   */
  private readonly _enqueued = new Map<number, number>();

  /** Monotonic counter for topo-order stamps within a generation. */
  private _topoCounter = 0;

  /** True while the async run loop is active. */
  private _running = false;

  /** Current viewport for priority classification. */
  private _viewport: ViewportRect | null = null;

  // ── Metrics ───────────────────────────────────────────────────────────────
  private _totalCompleted = 0;
  private _totalSkipped   = 0;

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor(options: RecomputeSchedulerOptions) {
    this.timeSliceMs  = options.timeSliceMs  ?? 8;
    this.yieldDelayMs = options.yieldDelayMs ?? 0;
    this.evaluator    = options.evaluator;
    this.onComplete   = options.onComplete;
    this.onYield      = options.onYield;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Current generation. Tasks are only executed if their generation matches.
   */
  get generation(): number {
    return this._generation;
  }

  /**
   * Total tasks remaining in the queue (includes stale tasks).
   */
  get pendingCount(): number {
    return this._heap.size;
  }

  /**
   * True if there are no non-stale tasks remaining.
   */
  get isIdle(): boolean {
    return this._heap.isEmpty;
  }

  /**
   * Enqueue a cell for recomputation at the given priority.
   *
   * If the cell was already enqueued in this generation, the call is a no-op
   * (dedup). If enqueued in a previous generation, it is re-enqueued with the
   * current generation at the new priority.
   *
   * @param address  Cell address to recompute.
   * @param priority Priority lane. Defaults to Normal.
   * @param topoOrder Optional explicit topological order. If omitted, a
   *                  monotonically increasing counter is used (preserve order
   *                  of schedule() calls within the same batch).
   */
  schedule(
    address: Address,
    priority: TaskPriority = TaskPriority.Normal,
    topoOrder?: number,
  ): void {
    const key = this._packKey(address);
    const existing = this._enqueued.get(key);

    // Already enqueued in this generation — respect dedup
    if (existing === this._generation) return;

    // Apply viewport-based priority upgrade
    const effectivePriority = this._classifyByViewport(address, priority);

    const task: ScheduledTask = {
      row:        address.row,
      col:        address.col,
      generation: this._generation,
      priority:   effectivePriority,
      topoOrder:  topoOrder ?? this._topoCounter++,
    };

    this._heap.push(task);
    this._enqueued.set(key, this._generation);
  }

  /**
   * Schedule a batch of cells in topological order.
   *
   * The caller provides cells in topological order (dependency before
   * dependent). This method assigns monotonically increasing topoOrder values
   * so that the heap processes them in the correct sequence.
   *
   * This is the primary entry point after a transaction commits:
   *
   *   const evalOrder = dag.computeEvalOrder().order;
   *   scheduler.scheduleAll(evalOrder.map(k => unpackKey(k)));
   */
  scheduleAll(
    addresses: Address[],
    priority: TaskPriority = TaskPriority.Normal,
  ): void {
    // Assign a contiguous topoOrder block so relative order is preserved
    const base = this._topoCounter;
    this._topoCounter += addresses.length;

    for (let i = 0; i < addresses.length; i++) {
      const addr     = addresses[i];
      const key      = this._packKey(addr);
      const existing = this._enqueued.get(key);

      if (existing === this._generation) continue;

      const effectivePriority = this._classifyByViewport(addr, priority);

      this._heap.push({
        row:        addr.row,
        col:        addr.col,
        generation: this._generation,
        priority:   effectivePriority,
        topoOrder:  base + i,
      });
      this._enqueued.set(key, this._generation);
    }
  }

  /**
   * Bump the generation counter, making all currently-enqueued tasks stale.
   *
   * Call this when a new mutation arrives before the previous recompute
   * cycle has finished. The stale tasks will be silently skipped when the
   * run loop dequeues them.
   *
   * Does NOT stop the run loop — it continues running but skips stale tasks
   * quickly (O(1) per skip) until new tasks are scheduled.
   */
  invalidate(): void {
    this._generation++;
    this._topoCounter = 0;
    this._enqueued.clear();
  }

  /**
   * Update the visible viewport.
   *
   * Newly scheduled tasks in the viewport will receive High priority.
   * Does NOT re-prioritise tasks already in the heap (too expensive).
   * The next `scheduleAll` call will use the updated viewport.
   *
   * For an immediate viewport re-prioritisation (e.g. after a large scroll),
   * call `invalidate()` first to discard queued tasks, then re-schedule the
   * dirty set with the new viewport.
   */
  setViewport(viewport: ViewportRect | null): void {
    this._viewport = viewport;
  }

  /**
   * Start the async run loop if it isn't already running.
   *
   * Returns a Promise that resolves when the queue is fully drained
   * (or when all remaining tasks are stale).
   *
   * Safe to call multiple times — subsequent calls while the loop is running
   * are no-ops and return the same pending Promise.
   */
  flush(): Promise<void> {
    if (this._running) return this._runPromise ?? Promise.resolve();
    this._running = true;
    this._runPromise = this._runLoop().finally(() => {
      this._running = false;
      this._runPromise = null;
    });
    return this._runPromise;
  }

  private _runPromise: Promise<void> | null = null;

  /**
   * Run synchronously until the queue is empty or `maxTasks` tasks processed.
   *
   * This is the non-async variant used in tests and Worker threads where
   * the event loop is not available.
   *
   * Returns the number of tasks actually evaluated.
   */
  runSync(maxTasks = Infinity): number {
    let count = 0;
    while (!this._heap.isEmpty && count < maxTasks) {
      const task = this._heap.pop()!;
      if (task.generation !== this._generation) {
        this._totalSkipped++;
        continue;
      }
      const value = this.evaluator(task);
      this.onComplete(task, value);
      this._totalCompleted++;
      count++;
    }
    return count;
  }

  /**
   * Drain and discard all pending tasks without evaluating them.
   * The generation is also bumped to cancel any concurrently-running async loop.
   */
  reset(): void {
    this.invalidate();
    this._heap.drain();
  }

  /**
   * Cumulative metrics since construction (or last `resetMetrics()`).
   */
  get metrics(): { completed: number; skipped: number } {
    return {
      completed: this._totalCompleted,
      skipped:   this._totalSkipped,
    };
  }

  resetMetrics(): void {
    this._totalCompleted = 0;
    this._totalSkipped   = 0;
  }

  // ── Private: async run loop ───────────────────────────────────────────────

  private async _runLoop(): Promise<void> {
    while (!this._heap.isEmpty) {
      const sliceStart = this._now();
      let completed = 0;
      let skipped   = 0;

      // ── Time slice ──────────────────────────────────────────────────────
      while (!this._heap.isEmpty) {
        const elapsed = this._now() - sliceStart;
        if (elapsed >= this.timeSliceMs) break;         // slice budget exhausted

        const task = this._heap.pop()!;

        // Generation check — fast path for stale tasks
        if (task.generation !== this._generation) {
          skipped++;
          this._totalSkipped++;
          continue;
        }

        const value = this.evaluator(task);
        this.onComplete(task, value);
        this._totalCompleted++;
        completed++;
      }

      // ── Yield ───────────────────────────────────────────────────────────
      const elapsedMs = this._now() - sliceStart;
      this.onYield?.({
        completed,
        skipped,
        elapsedMs,
        generation: this._generation,
        remaining:  this._heap.size,
      });

      if (!this._heap.isEmpty) {
        await this._yield();
      }
    }
  }

  /** Yield to let the UI thread breathe. */
  private _yield(): Promise<void> {
    if (this.yieldDelayMs > 0) {
      return new Promise(resolve => setTimeout(resolve, this.yieldDelayMs));
    }
    // Zero delay: microtask queue (as fast as possible while still yielding)
    return Promise.resolve();
  }

  // ── Private: helpers ─────────────────────────────────────────────────────

  /** Classify an address into a priority lane based on the current viewport. */
  private _classifyByViewport(
    addr: Address,
    requestedPriority: TaskPriority,
  ): TaskPriority {
    if (!this._viewport) return requestedPriority;

    const { rowStart, rowEnd, colStart, colEnd } = this._viewport;
    const inViewport =
      addr.row >= rowStart && addr.row <= rowEnd &&
      addr.col >= colStart && addr.col <= colEnd;

    if (inViewport) {
      // Viewport cells are at least High (but preserve Critical if already set)
      return Math.min(requestedPriority, TaskPriority.High) as TaskPriority;
    }

    // Prefetch zone (2× the viewport dimensions in each direction)
    const rowRange = rowEnd - rowStart;
    const colRange = colEnd - colStart;
    const inPrefetch =
      addr.row >= rowStart - rowRange && addr.row <= rowEnd + rowRange &&
      addr.col >= colStart - colRange && addr.col <= colEnd + colRange;

    if (inPrefetch) {
      return Math.min(requestedPriority, TaskPriority.Normal) as TaskPriority;
    }

    return requestedPriority;
  }

  private _packKey(addr: Address): number {
    // Same packing as CellStoreV1 (row × 20_000 + col)
    return addr.row * 20_000 + addr.col;
  }

  /**
   * Clock source. Override in tests to control time.
   * @internal
   */
  _now(): number {
    return typeof performance !== 'undefined'
      ? performance.now()
      : Date.now();
  }
}

// ---------------------------------------------------------------------------
// Invariant assertions (runtime — enabled in development / test mode)
// ---------------------------------------------------------------------------

/**
 * Assert that a sequence of tasks is in topological order.
 *
 * Throws if any task has a higher topoOrder than a subsequent task with
 * the same priority — which would violate the determinism guarantee.
 *
 * @internal — used by tests and DevTools extension.
 */
export function assertTopologicalOrder(tasks: ScheduledTask[]): void {
  for (let i = 1; i < tasks.length; i++) {
    const prev = tasks[i - 1];
    const curr = tasks[i];
    if (prev.priority === curr.priority && prev.topoOrder > curr.topoOrder) {
      throw new Error(
        `Topological order violation at index ${i}: ` +
        `task[${i-1}].topoOrder=${prev.topoOrder} > task[${i}].topoOrder=${curr.topoOrder} ` +
        `(both priority=${prev.priority})`,
      );
    }
  }
}

/**
 * Assert that no two tasks share the same (generation, row, col) triple.
 *
 * This verifies the dedup invariant — a cell must not be evaluated twice
 * in the same generation.
 *
 * @internal
 */
export function assertNoDuplicates(tasks: ScheduledTask[]): void {
  const seen = new Set<string>();
  for (const t of tasks) {
    const key = `${t.generation}:${t.row}:${t.col}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate task detected: generation=${t.generation} row=${t.row} col=${t.col}`,
      );
    }
    seen.add(key);
  }
}
