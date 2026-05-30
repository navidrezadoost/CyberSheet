import {
  PasteCommand,
  ClipboardService,
  type Address,
  type ClipboardCopyMode,
  type ClipboardPayload,
  type CommandManager,
  type Range,
  type Worksheet,
} from '@cyber-sheet/core';

export interface ClipboardRenderer {
  invalidateRange: (r1: number, c1: number, r2: number, c2: number) => void;
  scheduleRedraw?: () => void;
  redraw?: () => void;
}

export interface PasteOptions {
  renderer?: ClipboardRenderer | null;
  onCutComplete?: () => void;
}

export function normalizeSelectionRange(
  range: Range | { start: Address; end: Address } | null | undefined
): Range | null {
  if (!range?.start || !range?.end) return null;
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  };
}

async function writeTextToSystemClipboard(text: string): Promise<void> {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // System clipboard is best-effort; internal clipboard remains authoritative.
  }
}

export async function readSystemClipboardText(): Promise<string | null> {
  if (!navigator.clipboard?.readText) return null;
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export function payloadToPlainText(
  worksheet: Worksheet,
  range: Range
): string {
  const rows: string[] = [];
  for (let row = range.start.row; row <= range.end.row; row++) {
    const cols: string[] = [];
    for (let col = range.start.col; col <= range.end.col; col++) {
      const value = worksheet.getCellValue({ row, col });
      cols.push(value == null ? '' : String(value));
    }
    rows.push(cols.join('\t'));
  }
  return rows.join('\n');
}

export type { ClipboardCopyMode };

export function performCopy(
  worksheet: Worksheet,
  clipboardService: ClipboardService,
  range: Range,
  options?: { writeSystemClipboard?: boolean; mode?: ClipboardCopyMode }
): void {
  const mode = options?.mode ?? 'all';
  clipboardService.copy(worksheet, range, mode);
  if (options?.writeSystemClipboard !== false) {
    void writeTextToSystemClipboard(payloadToPlainText(worksheet, range));
  }
}

export function performCut(
  worksheet: Worksheet,
  clipboardService: ClipboardService,
  range: Range,
  options?: { writeSystemClipboard?: boolean; mode?: ClipboardCopyMode }
): Range {
  const mode = options?.mode ?? 'all';
  clipboardService.cut(worksheet, range, mode);
  if (options?.writeSystemClipboard !== false) {
    void writeTextToSystemClipboard(payloadToPlainText(worksheet, range));
  }
  return range;
}

function applyPastePayload(
  worksheet: Worksheet,
  commandManager: CommandManager,
  payload: ClipboardPayload,
  targetAnchor: Address,
  options?: PasteOptions
): void {
  commandManager.execute(new PasteCommand(worksheet, payload, targetAnchor));

  const endRow = targetAnchor.row + payload.height - 1;
  const endCol = targetAnchor.col + payload.width - 1;
  options?.renderer?.invalidateRange(
    targetAnchor.row,
    targetAnchor.col,
    endRow,
    endCol
  );

  if (payload.isCut) {
    const { start, end } = payload.sourceRange;
    options?.renderer?.invalidateRange(start.row, start.col, end.row, end.col);
    options?.onCutComplete?.();
  }

  options?.renderer?.scheduleRedraw?.() ?? options?.renderer?.redraw?.();
}

export function performPaste(
  worksheet: Worksheet,
  commandManager: CommandManager,
  clipboardService: ClipboardService,
  targetAnchor: Address,
  options?: PasteOptions
): boolean {
  const payload = clipboardService.getPayload();
  if (!payload) return false;

  applyPastePayload(worksheet, commandManager, payload, targetAnchor, options);
  return true;
}

/**
 * Paste from the internal clipboard when available; otherwise read plain text
 * from the system clipboard (external copy) and paste with undo support.
 */
export async function performPasteAsync(
  worksheet: Worksheet,
  commandManager: CommandManager,
  clipboardService: ClipboardService,
  targetAnchor: Address,
  options?: PasteOptions
): Promise<boolean> {
  const internalPayload = clipboardService.getPayload();
  if (internalPayload) {
    applyPastePayload(worksheet, commandManager, internalPayload, targetAnchor, options);
    return true;
  }

  const text = await readSystemClipboardText();
  if (text == null) return false;

  const externalPayload = ClipboardService.createPayloadFromPlainText(text, targetAnchor);
  if (!externalPayload) return false;

  applyPastePayload(worksheet, commandManager, externalPayload, targetAnchor, options);
  return true;
}
