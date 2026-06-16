import { FormulaWorkerHost } from '../src/worker/FormulaWorkerHost';
import { FormulaWorkerProxy } from '../src/worker/FormulaWorkerProxy';
import type { FormulaWorkerRequest, FormulaWorkerResult } from '../src/worker/FormulaWorkerProtocol';
import type { IWorkerLike } from '../src/worker/WorkerEngineProxy';

class MockFormulaWorker implements IWorkerLike {
  private listeners = new Set<(ev: MessageEvent) => void>();

  constructor(private readonly host: FormulaWorkerHost) {}

  postMessage(data: unknown): void {
    const { response } = this.host.handleMessage(data as FormulaWorkerRequest);
    const event = { data: response } as MessageEvent;
    for (const listener of this.listeners) listener(event);
  }

  addEventListener(_event: 'message', handler: (ev: MessageEvent) => void): void {
    this.listeners.add(handler);
  }

  removeEventListener(_event: 'message', handler: (ev: MessageEvent) => void): void {
    this.listeners.delete(handler);
  }

  terminate(): void {
    this.listeners.clear();
  }
}

class ErrorFormulaWorker implements IWorkerLike {
  private listeners = new Set<(ev: MessageEvent) => void>();

  postMessage(data: unknown): void {
    const req = data as FormulaWorkerRequest;
    const event = {
      data: { id: req.id, type: req.type, ok: false, error: 'boom' },
    } as MessageEvent;
    for (const listener of this.listeners) listener(event);
  }

  addEventListener(_event: 'message', handler: (ev: MessageEvent) => void): void {
    this.listeners.add(handler);
  }

  removeEventListener(_event: 'message', handler: (ev: MessageEvent) => void): void {
    this.listeners.delete(handler);
  }

  terminate(): void {
    this.listeners.clear();
  }
}

describe('FormulaWorkerHost', () => {
  it('evaluates a visible batch and returns a transferable Float64Array buffer', () => {
    const host = new FormulaWorkerHost('FormulaHost');

    host.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 1, col: 1, value: 5 } });
    host.handleMessage({ id: 2, type: 'setCellFormula', payload: { row: 1, col: 2, formula: '=A1*2' } });
    host.handleMessage({
      id: 3,
      type: 'registerDeps',
      payload: { row: 1, col: 2, deps: [{ row: 1, col: 1 }] },
    });

    const { response, transferList } = host.handleMessage({
      id: 4,
      type: 'evaluateBatch',
      payload: { addresses: [{ row: 1, col: 2 }] },
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    const result = response.result as FormulaWorkerResult<'evaluateBatch'>;
    expect(result.evaluated).toBeGreaterThanOrEqual(1);
    expect(transferList).toEqual([result.values]);
    expect(new Float64Array(result.values)[0]).toBe(10);
  });

  it('encodes non-numeric results as NaN in the numeric transfer buffer', () => {
    const host = new FormulaWorkerHost('FormulaHost');

    host.handleMessage({ id: 1, type: 'setCellFormula', payload: { row: 1, col: 1, formula: '=\"text\"' } });

    const { response } = host.handleMessage({
      id: 2,
      type: 'evaluateBatch',
      payload: { addresses: [{ row: 1, col: 1 }] },
    });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    const result = response.result as FormulaWorkerResult<'evaluateBatch'>;
    expect(Number.isNaN(new Float64Array(result.values)[0])).toBe(true);
  });
});

describe('FormulaWorkerProxy', () => {
  it('round-trips formula batch evaluation through the worker protocol', async () => {
    const proxy = new FormulaWorkerProxy(new MockFormulaWorker(new FormulaWorkerHost('FormulaProxy')));

    await expect(proxy.ping()).resolves.toBe('pong');
    await proxy.setCellValue(1, 1, 7);
    await proxy.setCellFormula(1, 2, '=A1+3');
    await proxy.registerDeps(1, 2, [{ row: 1, col: 1 }]);

    const result = await proxy.evaluateBatch([{ row: 1, col: 2 }]);

    expect(result.evaluated).toBeGreaterThanOrEqual(1);
    expect(result.hasCycles).toBe(false);
    expect(result.values).toBeInstanceOf(Float64Array);
    expect(result.values[0]).toBe(10);

    proxy.terminate();
  });

  it('reports dependency cycles from the worker batch result', async () => {
    const proxy = new FormulaWorkerProxy(new MockFormulaWorker(new FormulaWorkerHost('FormulaProxy')));

    await expect(proxy.setCellFormula(1, 1, '=A1')).resolves.toBeUndefined();
    await expect(proxy.registerDeps(1, 1, [{ row: 1, col: 1 }])).resolves.toBeUndefined();
    await expect(proxy.evaluateBatch([{ row: 1, col: 1 }])).resolves.toMatchObject({ hasCycles: true });

    proxy.terminate();
  });

  it('rejects worker errors with operation context', async () => {
    const proxy = new FormulaWorkerProxy(new ErrorFormulaWorker());

    await expect(proxy.ping()).rejects.toThrow('[FormulaWorker:ping] boom');

    proxy.terminate();
  });
});
