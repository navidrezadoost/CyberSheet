import type { WorkbookId, WorksheetId } from './workbook-access-types';

type CapabilityState = { readonly workbookId: WorkbookId; readonly transactionId: object; active: boolean };
const capabilities = new WeakMap<object, CapabilityState>();

/** @internal Tokens are null-prototype objects registered only in this module. */
export function createWorkbookCapability(workbookId: WorkbookId, transactionId: object): object {
  const token = Object.freeze(Object.create(null)) as object;
  capabilities.set(token, { workbookId, transactionId, active: true });
  return token;
}

export function revokeWorkbookCapability(token: object): void {
  const state = capabilities.get(token);
  if (state) state.active = false;
}

export function assertWorkbookCapability(
  token: object | undefined,
  workbookId: WorkbookId,
  transactionId: object,
  _worksheetId?: WorksheetId,
): void {
  const state = token && capabilities.get(token);
  if (!state || !state.active || state.workbookId !== workbookId || state.transactionId !== transactionId) {
    throw new Error('Workbook-owned mutation requires an active owner capability');
  }
}
