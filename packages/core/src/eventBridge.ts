import type { Command } from './CommandManager';
import { EventBus } from './EventBus';
import type { SheetEvents } from './types';
import type { Workbook } from './workbook';
import type { Worksheet } from './worksheet';

export function getCommandEventType(command: Command): string {
  return command.constructor?.name || command.description || 'Command';
}

type EmitFn = (payload: unknown) => void;

type WorksheetBridgeHandler = (event: SheetEvents, emit: EmitFn) => void;

const WORKSHEET_BRIDGE_EVENTS = new Set([
  'cell-value-change',
  'cell-formula-change',
  'cell-style-change',
  'cell-hover',
  'cell-hover-end',
  'cell-mousedown',
  'cell-dblclick',
  'comment-add',
  'comment-edit',
  'comment-delete',
]);

const WORKSHEET_BRIDGE_HANDLERS: Record<string, WorksheetBridgeHandler> = {
  'cell-value-change': (event, emit) => {
    if (event.type !== 'cell-changed') return;
    emit({
      row: event.address.row,
      col: event.address.col,
      oldValue: event.previousValue ?? null,
      newValue: event.cell.value ?? null,
      formula: event.cell.formula,
    });
  },
  'cell-formula-change': (event, emit) => {
    if (event.type !== 'cell-changed' || event.cell.formula == null) return;
    emit({
      row: event.address.row,
      col: event.address.col,
      formula: event.cell.formula,
    });
  },
  'cell-style-change': (event, emit) => {
    if (event.type !== 'style-changed') return;
    emit({
      row: event.address.row,
      col: event.address.col,
      style: event.style,
    });
  },
  'cell-hover': (event, emit) => {
    if (event.type !== 'cell-hover') return;
    emit({
      row: event.event.address.row,
      col: event.event.address.col,
    });
  },
  'cell-hover-end': (event, emit) => {
    if (event.type !== 'cell-hover-end') return;
    emit({
      row: event.address.row,
      col: event.address.col,
    });
  },
  'cell-mousedown': (event, emit) => {
    if (event.type !== 'cell-click') return;
    emit({
      row: event.event.address.row,
      col: event.event.address.col,
    });
  },
  'cell-dblclick': (event, emit) => {
    if (event.type !== 'cell-double-click') return;
    emit({
      row: event.event.address.row,
      col: event.event.address.col,
    });
  },
  'comment-add': (event, emit) => {
    if (event.type !== 'comment-added') return;
    emit({
      row: event.address.row,
      col: event.address.col,
      commentId: event.comment.id,
      author: event.comment.author,
      text: event.comment.text,
    });
  },
  'comment-edit': (event, emit) => {
    if (event.type !== 'comment-updated') return;
    emit({
      row: event.address.row,
      col: event.address.col,
      commentId: event.commentId,
      author: event.comment.author,
      text: event.comment.text,
    });
  },
  'comment-delete': (event, emit) => {
    if (event.type !== 'comment-deleted') return;
    emit({
      row: event.address.row,
      col: event.address.col,
      commentId: event.commentId,
    });
  },
};

export class WorkbookEventBridgeManager {
  private wiring = new Map<string, () => void>();

  constructor(private workbook: Workbook, private eventBus: EventBus) {
    for (const event of WORKSHEET_BRIDGE_EVENTS) {
      const handler = WORKSHEET_BRIDGE_HANDLERS[event];
      if (!handler) continue;

      eventBus.registerBridge(
        event,
        (emit) => {
          this.wiring.set(event, this.wireWorksheets(handler, emit));
        },
        () => {
          this.wiring.get(event)?.();
          this.wiring.delete(event);
        },
      );
    }
  }

  wireSheet(_worksheet: Worksheet): void {
    for (const event of this.eventBus.getActiveBridgeEvents()) {
      if (WORKSHEET_BRIDGE_EVENTS.has(event)) {
        this.eventBus.reactivateBridge(event);
      }
    }
  }

  private wireWorksheets(handler: WorksheetBridgeHandler, emit: EmitFn): () => void {
    const disposables = this.getWorksheets().map((worksheet) =>
      worksheet.on((event) => handler(event, emit)),
    );
    return () => disposables.forEach((disposable) => disposable.dispose());
  }

  private getWorksheets(): Worksheet[] {
    return this.workbook
      .getSheetNames()
      .map((name) => this.workbook.getSheet(name))
      .filter((sheet): sheet is Worksheet => sheet != null);
  }
}

export function setupWorkbookLazyBridges(workbook: Workbook): WorkbookEventBridgeManager {
  return new WorkbookEventBridgeManager(workbook, workbook.eventBus);
}
