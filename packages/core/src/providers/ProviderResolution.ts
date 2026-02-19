import { FormulaValue, FormulaContext } from '../types/formula-types';

/**
 * Provider resolution primitives and a small mock BatchResolver used for unit tests
 * PR #1 — foundation for async provider execution model (ProviderResolutionContext)
 */

export type ProviderRef = {
  type: string;   // e.g. 'stock', 'geography'
  id: string;     // provider entity id/symbol/code
  field: string;  // requested field (e.g. 'Price', 'Population')
};

export type ProviderErrorKind =
  | 'NOT_FOUND'
  | 'UNKNOWN_FIELD'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'API_ERROR';

export interface ProviderError {
  kind: ProviderErrorKind;
  message?: string;
  statusCode?: number;
}

export interface BatchResolverOptions {
  concurrency?: number;
  timeoutMs?: number;
  ttlMs?: number | null; // null = provider default
  maxRetries?: number;
}

function makeKey(ref: ProviderRef) {
  return `${ref.type}|${ref.id}|${ref.field}`;
}

/**
 * Tracks pending/resolved/errored provider refs during a single evaluation.
 * Lightweight, serializable snapshot (timestamped) used by orchestrator.
 */
export class ProviderResolutionContext {
  public readonly requestId: string;
  public readonly timestamp: number; // snapshot time for determinism

  // keys are `type|id|field`
  public pending: Set<string> = new Set();
  public resolved: Map<string, { value: FormulaValue; ts: number; ttlMs?: number | null }> = new Map();
  public errors: Map<string, ProviderError> = new Map();

  constructor(requestId?: string) {
    this.requestId = requestId || `pr_${Math.random().toString(36).slice(2, 9)}`;
    this.timestamp = Date.now();
  }

  addPending(ref: ProviderRef) {
    this.pending.add(makeKey(ref));
  }

  addPendingMany(refs: ProviderRef[]) {
    for (const r of refs) this.addPending(r);
  }

  isPending(ref: ProviderRef) {
    return this.pending.has(makeKey(ref));
  }

  markResolved(ref: ProviderRef, value: FormulaValue, ttlMs?: number | null) {
    const k = makeKey(ref);
    this.pending.delete(k);
    this.resolved.set(k, { value, ts: Date.now(), ttlMs: ttlMs ?? null });
  }

  markError(ref: ProviderRef, err: ProviderError) {
    const k = makeKey(ref);
    this.pending.delete(k);
    this.errors.set(k, err);
  }

  getResolved(ref: ProviderRef): FormulaValue | undefined {
    const entry = this.resolved.get(makeKey(ref));
    return entry ? entry.value : undefined;
  }

  getError(ref: ProviderRef): ProviderError | undefined {
    return this.errors.get(makeKey(ref));
  }

  /**
   * Check whether a resolved value is expired according to ttlMs stored at resolution time.
   * If ttlMs is null/undefined the entry is considered non-expiring from the context's perspective.
   */
  isExpired(ref: ProviderRef) {
    const entry = this.resolved.get(makeKey(ref));
    if (!entry) return true;
    if (!entry.ttlMs) return false;
    return Date.now() - entry.ts > entry.ttlMs;
  }

  settledCount() {
    return this.resolved.size + this.errors.size;
  }
}

/**
 * Minimal BatchResolver contract used by orchestrator (PR #1).
 * Implementations may provide batching/prefetch/HTTP adaptors later.
 */
export interface BatchResolver {
  resolve(refs: ProviderRef[], ctx: ProviderResolutionContext, opts?: BatchResolverOptions): Promise<void>;
}

/**
 * MockBatchResolver used for unit tests and early integration.
 * - Deduplicates refs
 * - Resolves from a provided in-memory map
 * - Can simulate errors
 */
export class MockBatchResolver implements BatchResolver {
  private readonly backing: Map<string, FormulaValue | ProviderError>;
  public requestedKeys: string[] = [];
  private readonly defaultTtlMs: number | null;
  private readonly delayMs: number;

  constructor(backing: Record<string, FormulaValue | ProviderError>, opts?: { ttlMs?: number | null; delayMs?: number }) {
    this.backing = new Map(Object.entries(backing));
    this.defaultTtlMs = opts?.ttlMs ?? null;
    this.delayMs = opts?.delayMs ?? 0;
  }

  private async sleep(ms: number) {
    return new Promise<void>(res => setTimeout(res, ms));
  }

  async resolve(refs: ProviderRef[], ctx: ProviderResolutionContext) {
    // Dedupe by key
    const unique = new Map<string, ProviderRef>();
    for (const r of refs) {
      const k = makeKey(r);
      if (!unique.has(k)) unique.set(k, r);
    }

    // Track requested keys for assertions
    this.requestedKeys.push(...Array.from(unique.keys()));

    if (this.delayMs > 0) await this.sleep(this.delayMs);

    // Simulate resolution
    for (const [k, ref] of unique.entries()) {
      const v = this.backing.get(k);
      if (v === undefined) {
        ctx.markError(ref, { kind: 'NOT_FOUND', message: 'mock: not found' });
      } else if (typeof v === 'object' && (v as ProviderError).kind && !(v instanceof Error)) {
        ctx.markError(ref, v as ProviderError);
      } else {
        ctx.markResolved(ref, v as FormulaValue, this.defaultTtlMs);
      }
    }
  }
}
