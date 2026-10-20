import { Workbook } from '../src/workbook';
import { assertWorkbookCapability, createWorkbookCapability, revokeWorkbookCapability } from '../src/workbookCapability';

describe('R1 private workbook capabilities', () => {
  test('tokens are owner-bound and revoked tokens cannot be reused', () => {
    const a = Workbook.create({ sheets: [{ name: 'A' }] });
    const b = Workbook.create({ sheets: [{ name: 'B' }] });
    const transaction = Object.freeze({});
    const token = createWorkbookCapability(a.workbookId, transaction);
    expect(Object.getPrototypeOf(token)).toBeNull();
    expect(() => assertWorkbookCapability(token, a.workbookId, transaction)).not.toThrow();
    expect(() => assertWorkbookCapability(token, b.workbookId, transaction)).toThrow(/active owner capability/);
    expect(() => assertWorkbookCapability(token, a.workbookId, Object.freeze({}))).toThrow(/active owner capability/);
    revokeWorkbookCapability(token);
    expect(() => assertWorkbookCapability(token, a.workbookId, transaction)).toThrow(/active owner capability/);
  });

  test('forged and transaction-unrelated tokens are rejected', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'A' }] });
    const transaction = Object.freeze({});
    expect(() => assertWorkbookCapability(Object.freeze({}), workbook.workbookId, transaction)).toThrow(/active owner capability/);
    const token = createWorkbookCapability(workbook.workbookId, transaction);
    revokeWorkbookCapability(token);
    expect(() => assertWorkbookCapability(token, workbook.workbookId, transaction)).toThrow(/active owner capability/);
  });

  test('a callback that outlives the transaction cannot use its escaped capability', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'A' }] });
    const transaction = Object.freeze({});
    const token = createWorkbookCapability(workbook.workbookId, transaction);
    const delayed = Promise.resolve().then(() => assertWorkbookCapability(token, workbook.workbookId, transaction));
    revokeWorkbookCapability(token);
    await expect(delayed).rejects.toThrow(/active owner capability/);
  });
});
