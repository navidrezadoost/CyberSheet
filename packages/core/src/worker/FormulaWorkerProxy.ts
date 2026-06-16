import type { CellValue } from '../types';
import type { IWorkerLike } from './WorkerEngineProxy';
import {
  type FormulaWorkerAddress,
  type FormulaWorkerOpName,
  type FormulaWorkerRequest,
  type FormulaWorkerResponse,
  type FormulaWorkerResult,
} from './FormulaWorkerProtocol';

type Pending<K extends FormulaWorkerOpName = FormulaWorkerOpName> = {
  resolve: (value: FormulaWorkerResult<K>) => void;
  reject: (error: Error) => void;
};

export type FormulaBatchResult = {
  values: Float64Array;
  evaluated: number;
  hasCycles: boolean;
};

export class FormulaWorkerProxy {
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private terminated = false;

  constructor(private readonly worker: IWorkerLike) {
    this.worker.addEventListener('message', this.onMessage);
  }

  ping(): Promise<'pong'> {
    return this.send('ping', {});
  }

  setCellValue(row: number, col: number, value: CellValue): Promise<void> {
    return this.send('setCellValue', { row, col, value });
  }

  setCellFormula(row: number, col: number, formula: string, displayValue?: CellValue): Promise<void> {
    return this.send('setCellFormula', { row, col, formula, displayValue });
  }

  registerDeps(row: number, col: number, deps: FormulaWorkerAddress[]): Promise<void> {
    return this.send('registerDeps', { row, col, deps });
  }

  async evaluateBatch(addresses: FormulaWorkerAddress[]): Promise<FormulaBatchResult> {
    const result = await this.send('evaluateBatch', { addresses });
    return {
      values: new Float64Array(result.values),
      evaluated: result.evaluated,
      hasCycles: result.hasCycles,
    };
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.worker.removeEventListener('message', this.onMessage);
    this.worker.terminate();
    for (const [, pending] of this.pending) {
      pending.reject(new Error('FormulaWorkerProxy: worker terminated before response.'));
    }
    this.pending.clear();
  }

  private send<K extends FormulaWorkerOpName>(
    type: K,
    payload: FormulaWorkerRequest<K>['payload'],
  ): Promise<FormulaWorkerResult<K>> {
    if (this.terminated) {
      return Promise.reject(new Error('FormulaWorkerProxy: worker has been terminated.'));
    }

    const id = this.nextId++;
    const req: FormulaWorkerRequest<K> = { id, type, payload };

    return new Promise<FormulaWorkerResult<K>>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as Pending['resolve'], reject });
      this.worker.postMessage(req);
    });
  }

  private readonly onMessage = (ev: MessageEvent): void => {
    const resp = ev.data as FormulaWorkerResponse;
    const pending = this.pending.get(resp.id);
    if (!pending) return;
    this.pending.delete(resp.id);

    if (resp.ok) {
      pending.resolve(resp.result as FormulaWorkerResult<FormulaWorkerOpName>);
    } else {
      pending.reject(new Error(`[FormulaWorker:${resp.type}] ${resp.error}`));
    }
  };
}
