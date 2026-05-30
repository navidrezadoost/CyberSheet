/**
 * Spreadsheet-level undo/redo keyboard helpers.
 *
 * Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y apply to the workbook command stack everywhere
 * except native text fields (formula bar, in-cell editor, dialogs, backstage).
 */

import {
  isSpreadsheetRedoShortcut,
  isSpreadsheetUndoShortcut,
} from './keyboardLayout';

export { isSpreadsheetRedoShortcut, isSpreadsheetUndoShortcut };

const NATIVE_TEXT_UNDO_SELECTOR = [
  '[data-native-text-undo]',
  '.find-replace-dialog input',
  '.backstage input',
  '.backstage textarea',
].join(', ');

export function isNativeTextUndoTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(NATIVE_TEXT_UNDO_SELECTOR));
}

export function handleSpreadsheetHistoryShortcut(
  event: KeyboardEvent,
  commandManager: { undo: () => boolean; redo: () => boolean }
): boolean {
  if (isNativeTextUndoTarget(event.target)) {
    return false;
  }

  if (isSpreadsheetUndoShortcut(event)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    commandManager.undo();
    return true;
  }

  if (isSpreadsheetRedoShortcut(event)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    commandManager.redo();
    return true;
  }

  return false;
}
