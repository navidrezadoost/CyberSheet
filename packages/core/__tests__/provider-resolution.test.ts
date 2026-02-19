import { ProviderResolutionContext, ProviderRef, MockBatchResolver } from '../src/providers';

describe('ProviderResolutionContext & MockBatchResolver (PR #1)', () => {
  test('deduplicates pending refs and exposes keys', () => {
    const ctx = new ProviderResolutionContext('req-1');

    const r1: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
    const r2: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' }; // duplicate
    const r3: ProviderRef = { type: 'geography', id: 'USA', field: 'Capital' };

    ctx.addPending(r1);
    ctx.addPending(r2);
    ctx.addPending(r3);

    // dedup expected
    expect(ctx.pending.size).toBe(2);
    expect(ctx.isPending(r1)).toBe(true);
    expect(ctx.isPending(r3)).toBe(true);
  });

  test('snapshot timestamp is stable', () => {
    const ctx = new ProviderResolutionContext('req-2');
    const ts = ctx.timestamp;

    // small delay
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(ctx.timestamp).toBe(ts);
        resolve();
      }, 5);
    });
  });

  test('pending/resolved/error tracking works', () => {
    const ctx = new ProviderResolutionContext('req-3');
    const ok: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
    const bad: ProviderRef = { type: 'stock', id: 'NOPE', field: 'Price' };

    ctx.addPendingMany([ok, bad]);
    expect(ctx.pending.size).toBe(2);

    ctx.markResolved(ok, 123.45);
    ctx.markError(bad, { kind: 'NOT_FOUND', message: 'no such symbol' });

    expect(ctx.isPending(ok)).toBe(false);
    expect(ctx.getResolved(ok)).toBe(123.45);
    expect(ctx.getError(bad)?.kind).toBe('NOT_FOUND');
    expect(ctx.settledCount()).toBe(2);
  });

  test('MockBatchResolver resolves unique refs and TTL semantics (mocked)', async () => {
    const backing = {
      'stock|AAPL|Price': 178.5,
      'geography|USA|Population': 331000000
    } as any;

    const resolver = new MockBatchResolver(backing, { ttlMs: 50, delayMs: 5 });
    const ctx = new ProviderResolutionContext('req-4');

    const refs = [
      { type: 'stock', id: 'AAPL', field: 'Price' },
      { type: 'stock', id: 'AAPL', field: 'Price' }, // duplicate
      { type: 'geography', id: 'USA', field: 'Population' }
    ];

    ctx.addPendingMany(refs);

    await resolver.resolve(refs, ctx);

    // ensure dedup performed by resolver (only 2 unique requested)
    expect(resolver.requestedKeys.length).toBe(2);

    // resolved values present
    expect(ctx.getResolved(refs[0])).toBe(178.5);
    expect(ctx.getResolved(refs[2])).toBe(331000000);

    // TTL semantics (simulate expiry by mutating timestamp)
    const key = `${refs[0].type}|${refs[0].id}|${refs[0].field}`;
    const entry = (ctx as any).resolved.get(key);
    // fast-forward ts to simulate expiry
    entry.ts = entry.ts - 1000;
    expect(ctx.isExpired(refs[0])).toBe(true);
  });
});
