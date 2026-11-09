/**
 * PKG-06B test-only executable model for deletion before-images.
 * This deliberately does not use Workbook.mutationPort or production hooks.
 */
type ModelComment = {
  id: string;
  parentId?: string;
  text: string;
  metadata?: Record<string, unknown>;
};

type Cell = { value?: unknown; style?: object; comments?: ModelComment[] };
type Address = { row: number; col: number };
type BeforeImage =
  | { present: false }
  | { present: true; comments: ModelComment[] | undefined };
type FaultPhase = 'before-array-replacement' | 'after-array-replacement' | 'during-restore';

const keyOf = ({ row, col }: Address) => `${row}:${col}`;

class ModelFailure extends Error {
  constructor(
    message: string,
    readonly operationError: unknown,
    readonly restorationErrors: unknown[] = [],
  ) {
    super(message);
  }
}

/** Transaction semantics modeled locally from Worksheet.deleteComment's filter-and-replace behavior. */
class CommentDeleteTransactionModel {
  readonly cells = new Map<string, Cell>();
  readonly publishedEvents: Array<{ type: 'comment-deleted'; address: Address; commentId: string }> = [];
  readonly beforeImages = new Map<string, BeforeImage>();
  readonly failurePhases: FaultPhase[] = [];
  #bufferedEvents: Array<{ type: 'comment-deleted'; address: Address; commentId: string }> = [];
  #fault?: (phase: FaultPhase, writeIndex: number) => void;
  #writes = 0;
  #recoveryRequired = false;

  seed(address: Address, cell: Cell): Cell {
    this.cells.set(keyOf(address), cell);
    return cell;
  }

  getCell(address: Address): Cell | undefined {
    return this.cells.get(keyOf(address));
  }

  async transact(work: (tx: this) => void, fault?: (phase: FaultPhase, writeIndex: number) => void): Promise<void> {
    if (this.#recoveryRequired) throw new Error('recovery required');
    this.#fault = fault;
    this.#writes = 0;
    this.beforeImages.clear();
    this.#bufferedEvents = [];
    try {
      work(this);
      this.publishedEvents.push(...this.#bufferedEvents);
    } catch (operationError) {
      this.#bufferedEvents = [];
      const restorationErrors: unknown[] = [];
      for (const [key, before] of [...this.beforeImages].reverse()) {
        try {
          this.#fault?.('during-restore', this.#writes);
          if (!before.present) this.cells.delete(key);
          else {
            const current = this.cells.get(key);
            if (current) current.comments = before.comments;
            else this.cells.set(key, { comments: before.comments });
          }
        } catch (error) {
          restorationErrors.push(error);
        }
      }
      if (restorationErrors.length) this.#recoveryRequired = true;
      throw new ModelFailure('modeled transaction failed', operationError, restorationErrors);
    } finally {
      this.#fault = undefined;
    }
  }

  deleteComment(address: Address, commentId: string): boolean {
    if (this.#recoveryRequired) throw new Error('recovery required');
    const key = keyOf(address);
    const cell = this.cells.get(key);
    const comments = cell?.comments;
    if (!cell || !comments?.length) return false;

    const toDelete = new Set([commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const comment of comments) {
        if (comment.parentId && toDelete.has(comment.parentId) && !toDelete.has(comment.id)) {
          toDelete.add(comment.id);
          changed = true;
        }
      }
    }
    const replacement = comments.filter((comment) => !toDelete.has(comment.id));
    if (replacement.length === comments.length) return false;

    // Capture exactly once, after establishing an effective write and before replacement.
    if (!this.beforeImages.has(key)) this.beforeImages.set(key, { present: true, comments });
    const writeIndex = ++this.#writes;
    this.#fault?.('before-array-replacement', writeIndex);
    this.failurePhases.push('before-array-replacement');
    cell.comments = replacement.length ? replacement : undefined;
    this.#fault?.('after-array-replacement', writeIndex);
    this.failurePhases.push('after-array-replacement');
    this.#bufferedEvents.push({ type: 'comment-deleted', address, commentId });
    return true;
  }

  /** Test-only seam to exercise absent/present capture restoration; deleteComment never allocates a cell. */
  modelUnexpectedAllocationThenFailure(address: Address, error: Error): Promise<void> {
    return this.transact(() => {
      const key = keyOf(address);
      if (!this.beforeImages.has(key)) {
        const current = this.cells.get(key);
        this.beforeImages.set(key, current ? { present: true, comments: current.comments } : { present: false });
      }
      const current = this.cells.get(key);
      if (current) current.comments = [{ id: 'transient', text: 'temporary' }];
      else this.cells.set(key, { comments: [{ id: 'transient', text: 'temporary' }] });
      throw error;
    });
  }

  get recoveryRequired(): boolean {
    return this.#recoveryRequired;
  }
}

describe('PKG-06B isolated comment-delete rollback model (simulation only)', () => {
  const address = { row: 2, col: 3 };

  test('captures the first effective write once across repeated deletes; cascades and duplicate IDs keep survivor order', async () => {
    const model = new CommentDeleteTransactionModel();
    const comments: ModelComment[] = [
      { id: 'dup', text: 'first duplicate' },
      { id: 'child', parentId: 'dup', text: 'reply to duplicate' },
      { id: 'dup', text: 'second duplicate' },
      { id: 'grandchild', parentId: 'child', text: 'nested reply' },
      { id: 'survivor-a', text: 'A' },
      { id: 'survivor-b', text: 'B' },
    ];
    const cell = model.seed(address, { value: 'retained', style: { bold: true }, comments });
    let captured: BeforeImage | undefined;
    await model.transact((tx) => {
      expect(tx.deleteComment(address, 'dup')).toBe(true);
      captured = tx.beforeImages.get(keyOf(address));
      expect(tx.deleteComment(address, 'survivor-a')).toBe(true);
      expect(tx.deleteComment(address, 'survivor-a')).toBe(false);
      expect(tx.beforeImages.get(keyOf(address))).toBe(captured);
      expect(tx.publishedEvents).toEqual([]);
    });

    expect(captured).toEqual({ present: true, comments });
    expect((captured as Extract<BeforeImage, { present: true }>).comments).toBe(comments);
    expect(cell.comments?.map(({ id }) => id)).toEqual(['survivor-b']);
    expect(cell.value).toBe('retained');
    expect(cell.style).toEqual({ bold: true });
    expect(model.publishedEvents.map(({ commentId }) => commentId)).toEqual(['dup', 'survivor-a']);
  });

  test.each([
    ['absent cell', false],
    ['present cell with undefined comments', true],
  ])('%s remains distinct and no-op deletion captures nothing', async (_label, present) => {
    const model = new CommentDeleteTransactionModel();
    const original = present ? model.seed(address, {}) : undefined;
    await model.transact((tx) => {
      expect(tx.deleteComment(address, 'missing')).toBe(false);
    });
    expect(model.beforeImages.size).toBe(0);
    expect(model.getCell(address)).toBe(original);
    expect(model.publishedEvents).toEqual([]);
  });

  test('rollback primitive removes a transient cell when the before-image was absent', async () => {
    const model = new CommentDeleteTransactionModel();
    const failure = new Error('failure after unexpected modeled allocation');
    await expect(model.modelUnexpectedAllocationThenFailure(address, failure)).rejects.toMatchObject({
      operationError: failure,
      restorationErrors: [],
    });
    expect(model.getCell(address)).toBeUndefined();
    expect(model.publishedEvents).toEqual([]);
  });

  test('rollback of a present cell with undefined comments restores the same cell identity', async () => {
    const model = new CommentDeleteTransactionModel();
    const original = model.seed(address, { value: 'keep present' });
    const failure = new Error('failure after modeled comments-field allocation');
    await expect(model.modelUnexpectedAllocationThenFailure(address, failure)).rejects.toMatchObject({
      operationError: failure,
      restorationErrors: [],
    });
    expect(model.getCell(address)).toBe(original);
    expect(original.comments).toBeUndefined();
    expect(original.value).toBe('keep present');
    expect(model.publishedEvents).toEqual([]);
  });

  test('failure before array replacement restores present cell and original reference without events', async () => {
    const model = new CommentDeleteTransactionModel();
    const comments: ModelComment[] = [{ id: 'root', text: 'root' }, { id: 'other', text: 'other' }];
    const cell = model.seed(address, { value: 7, comments });
    const failure = new Error('before replacement');
    await expect(model.transact((tx) => {
      tx.deleteComment(address, 'root');
    }, (phase) => { if (phase === 'before-array-replacement') throw failure; })).rejects.toMatchObject({ operationError: failure });
    expect(model.getCell(address)).toBe(cell);
    expect(cell.comments).toBe(comments);
    expect(cell.value).toBe(7);
    expect(model.publishedEvents).toEqual([]);
  });

  test('failure after replacement restores the exact original array, nodes, aliases, and cycles', async () => {
    const model = new CommentDeleteTransactionModel();
    const shared = { value: 1 };
    const metadata: Record<string, unknown> = { left: shared, right: shared };
    metadata.self = metadata;
    const root: ModelComment = { id: 'root', text: 'root', metadata };
    const child: ModelComment = { id: 'child', parentId: 'root', text: 'child' };
    const survivor: ModelComment = { id: 'survivor', text: 'survivor' };
    const comments = [root, child, survivor];
    const cell = model.seed(address, { comments });
    const failure = new Error('after replacement');
    await expect(model.transact((tx) => {
      tx.deleteComment(address, 'root');
    }, (phase) => { if (phase === 'after-array-replacement') throw failure; })).rejects.toMatchObject({ operationError: failure });

    expect(cell.comments).toBe(comments);
    expect(cell.comments?.[0]).toBe(root);
    expect(cell.comments?.[1]).toBe(child);
    expect(root.metadata?.left).toBe(root.metadata?.right);
    expect(root.metadata?.self).toBe(root.metadata);
    expect(model.publishedEvents).toEqual([]);
  });

  test('restoration failure retains both errors, suppresses events, and marks recovery required', async () => {
    const model = new CommentDeleteTransactionModel();
    const comments: ModelComment[] = [{ id: 'root', text: 'root' }];
    const cell = model.seed(address, { comments });
    const operationError = new Error('operation failed after replacement');
    const restoreError = new Error('restoration failed');
    const failure = await model.transact((tx) => {
      tx.deleteComment(address, 'root');
    }, (phase) => {
      if (phase === 'after-array-replacement') throw operationError;
      if (phase === 'during-restore') throw restoreError;
    }).catch((error) => error as ModelFailure);

    if (!(failure instanceof ModelFailure)) throw failure;
    expect(failure.operationError).toBe(operationError);
    expect(failure.restorationErrors).toContain(restoreError);
    expect(model.recoveryRequired).toBe(true);
    expect(cell.comments).toBeUndefined();
    expect(model.publishedEvents).toEqual([]);
    await expect(model.transact(() => undefined)).rejects.toThrow('recovery required');
  });
});
