import type { CellValue } from '../types';

export type FormulaWorkerAddress = { row: number; col: number };

export type FormulaWorkerOpMap = {
  ping: {
    payload: Record<never, never>;
    result: 'pong';
  };
  setCellValue: {
    payload: { row: number; col: number; value: CellValue };
    result: void;
  };
  setCellFormula: {
    payload: { row: number; col: number; formula: string; displayValue?: CellValue };
    result: void;
  };
  registerDeps: {
    payload: { row: number; col: number; deps: FormulaWorkerAddress[] };
    result: void;
  };
  evaluateBatch: {
    payload: { addresses: FormulaWorkerAddress[] };
    result: { values: ArrayBuffer; evaluated: number; hasCycles: boolean };
  };
};

export type FormulaWorkerOpName = keyof FormulaWorkerOpMap;
export type FormulaWorkerPayload<K extends FormulaWorkerOpName> = FormulaWorkerOpMap[K]['payload'];
export type FormulaWorkerResult<K extends FormulaWorkerOpName> = FormulaWorkerOpMap[K]['result'];

export type FormulaWorkerRequest<K extends FormulaWorkerOpName = FormulaWorkerOpName> = {
  id: number;
  type: K;
  payload: FormulaWorkerPayload<K>;
};

export type FormulaWorkerResponse<K extends FormulaWorkerOpName = FormulaWorkerOpName> =
  | { id: number; type: K; ok: true; result: FormulaWorkerResult<K> }
  | { id: number; type: K; ok: false; error: string };

export function getFormulaWorkerResponseTransferList(resp: FormulaWorkerResponse): Transferable[] {
  if (resp.ok && resp.type === 'evaluateBatch') {
    return [(resp.result as FormulaWorkerResult<'evaluateBatch'>).values];
  }
  return [];
}
