/**
 * Layout-independent keyboard helpers.
 *
 * Use KeyboardEvent.code (physical key position) for shortcuts so Ctrl+Z, Ctrl+C,
 * etc. keep working when the OS keyboard layout is Persian, Arabic, French, etc.
 *
 * Use KeyboardEvent.key only when you need the typed character (in-cell editing).
 */

/** True while an IME is composing (Persian, CJK, etc.). */
export function isComposingEvent(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

/** Primary modifier: Ctrl on Windows/Linux, Cmd on Mac. */
export function hasCtrlOrMeta(event: { ctrlKey: boolean; metaKey: boolean }): boolean {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return isMac ? event.metaKey : event.ctrlKey;
}

/** Match a physical key via KeyboardEvent.code. */
export function isPhysicalKey(event: KeyboardEvent, code: string): boolean {
  return event.code === code;
}

export interface ModifierShortcutOptions {
  shift?: boolean;
  alt?: boolean;
}

/**
 * Match Ctrl/Cmd + physical key (KeyA–KeyZ, Digit0–Digit9, etc.).
 * Ignores IME composition events.
 */
export function isCtrlPhysicalKey(
  event: KeyboardEvent,
  code: string,
  options: ModifierShortcutOptions = {}
): boolean {
  if (isComposingEvent(event)) return false;
  if (!hasCtrlOrMeta(event)) return false;
  if (options.shift !== undefined && event.shiftKey !== options.shift) return false;
  if (options.alt !== undefined && event.altKey !== options.alt) return false;
  return event.code === code;
}

/** Physical letter key code from A–Z. */
export function physicalLetterCode(letter: string): string {
  return `Key${letter.toUpperCase()}`;
}

export function isCtrlLetter(
  event: KeyboardEvent,
  letter: string,
  options: ModifierShortcutOptions = {}
): boolean {
  return isCtrlPhysicalKey(event, physicalLetterCode(letter), options);
}

export const isCtrlKeyZ = (event: KeyboardEvent) =>
  isCtrlPhysicalKey(event, 'KeyZ', { shift: false });

export const isCtrlShiftKeyZ = (event: KeyboardEvent) =>
  isCtrlPhysicalKey(event, 'KeyZ', { shift: true });

export const isCtrlKeyY = (event: KeyboardEvent) =>
  isCtrlPhysicalKey(event, 'KeyY');

export function isSpreadsheetUndoShortcut(event: KeyboardEvent): boolean {
  return isCtrlKeyZ(event);
}

export function isSpreadsheetRedoShortcut(event: KeyboardEvent): boolean {
  return isCtrlKeyY(event) || isCtrlShiftKeyZ(event);
}

const ARROW_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function isArrowKey(event: KeyboardEvent): boolean {
  return ARROW_CODES.has(event.code);
}

const NAVIGATION_CODES = new Set([
  'Enter',
  'Escape',
  'Tab',
  'F2',
  'Delete',
  'Backspace',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

export function isNavigationKey(event: KeyboardEvent): boolean {
  return NAVIGATION_CODES.has(event.code) || isArrowKey(event);
}

/**
 * True when the user typed a character to start in-cell editing.
 * Works for Persian/Arabic and other non-Latin layouts (uses event.key).
 */
export function isTypingCharacter(event: KeyboardEvent): boolean {
  if (isComposingEvent(event)) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isNavigationKey(event)) return false;
  if (event.key.startsWith('Dead')) return false;
  return event.key.length === 1;
}

export function getTypedCharacter(event: KeyboardEvent): string | null {
  return isTypingCharacter(event) ? event.key : null;
}

/** Parsed shortcut for registry matching (layout-independent). */
export interface ParsedShortcut {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Parse a keyboard event into a layout-independent shortcut representation.
 * Letter/digit keys use physical code; function/navigation keys use event.code.
 */
export function parseKeyboardEvent(event: KeyboardEvent): ParsedShortcut {
  let key: string;
  const code = event.code;

  if (code.startsWith('Key')) {
    key = code.substring(3).toLowerCase();
  } else if (code.startsWith('Digit')) {
    key = code.substring(5);
  } else if (code.startsWith('F') && /^F\d+$/.test(code)) {
    key = code;
  } else if (code === 'Space') {
    key = 'Space';
  } else if (NAVIGATION_CODES.has(code) || ARROW_CODES.has(code)) {
    key = code;
  } else {
    key = event.key;
    const keyMappings: Record<string, string> = {
      Esc: 'Escape',
      Del: 'Delete',
      ' ': 'Space',
      Spacebar: 'Space',
    };
    if (keyMappings[key]) {
      key = keyMappings[key];
    }
    if (key.startsWith('Dead')) {
      key = '';
    }
    if (key.length === 1) {
      key = key.toLowerCase();
    }
  }

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const ctrl = isMac ? event.metaKey : event.ctrlKey;

  return {
    key,
    ctrl,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

export function shortcutToString(parsed: ParsedShortcut): string {
  const parts: string[] = [];
  if (parsed.ctrl) parts.push('Ctrl');
  if (parsed.shift) parts.push('Shift');
  if (parsed.alt) parts.push('Alt');

  const keyLabel =
    parsed.key.length === 1
      ? parsed.key.toUpperCase()
      : parsed.key.charAt(0).toUpperCase() + parsed.key.slice(1);
  parts.push(keyLabel);

  return parts.join('+');
}

export function parseShortcutString(keys: string): ParsedShortcut {
  const parts = keys.split('+').map((p) => p.trim());
  const parsed: ParsedShortcut = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  };

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'cmd') {
      parsed.ctrl = true;
    } else if (lower === 'shift') {
      parsed.shift = true;
    } else if (lower === 'alt') {
      parsed.alt = true;
    } else {
      parsed.key = part.length === 1 ? part.toLowerCase() : part;
    }
  }

  return parsed;
}
