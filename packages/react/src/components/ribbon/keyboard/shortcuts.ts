/**
 * Standard Excel Keyboard Shortcuts
 * 
 * SCOPE: Minimal validation set (Option A)
 * 
 * This is NOT feature completion - it's architecture validation:
 * 1. Context switching (grid vs editing vs ribbon)
 * 2. Conflict resolution (same key, different contexts)
 * 3. Command Pattern integration (strict, no bypasses)
 * 4. Surgical preventDefault (not global)
 * 
 * Shortcuts included (8 total):
 * - Formatting: Ctrl+B, Ctrl+I, Ctrl+U (Command Pattern validation)
 * - History: Ctrl+Z, Ctrl+Y (global command validation)
 * - Editing: Enter, Escape, F2 (context switching validation)
 */

import type { ShortcutDefinition, ShortcutContext } from './types';

/**
 * Formatting shortcuts (validate Command Pattern integration)
 * 
 * Context: grid only (NOT in cell-edit or formula-bar)
 * preventDefault: Always (override browser default)
 */

export const BOLD_SHORTCUT: ShortcutDefinition = {
  id: 'format.bold',
  label: 'Toggle Bold',
  keys: 'Ctrl+B',
  contexts: ['grid', 'ribbon'],
  priority: 10,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // TODO: Import ToggleBoldCommand from @cyber-sheet/core
    // ctx.commandManager.execute(new ToggleBoldCommand(), ctx.selection);
    console.log('[Shortcut] Toggle Bold', ctx.selection);
    
    // TEMPORARY: Direct state update (will be replaced with command)
    // This violates architecture but validates the shortcut system works
  },
};

export const ITALIC_SHORTCUT: ShortcutDefinition = {
  id: 'format.italic',
  label: 'Toggle Italic',
  keys: 'Ctrl+I',
  contexts: ['grid', 'ribbon'],
  priority: 10,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // TODO: Import ToggleItalicCommand from @cyber-sheet/core
    // ctx.commandManager.execute(new ToggleItalicCommand(), ctx.selection);
    console.log('[Shortcut] Toggle Italic', ctx.selection);
  },
};

export const UNDERLINE_SHORTCUT: ShortcutDefinition = {
  id: 'format.underline',
  label: 'Toggle Underline',
  keys: 'Ctrl+U',
  contexts: ['grid', 'ribbon'],
  priority: 10,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // TODO: Import ToggleUnderlineCommand from @cyber-sheet/core
    // ctx.commandManager.execute(new ToggleUnderlineCommand(), ctx.selection);
    console.log('[Shortcut] Toggle Underline', ctx.selection);
  },
};

/**
 * History shortcuts (validate global command integration)
 * 
 * Context: grid, ribbon (NOT during editing)
 * preventDefault: Always (override browser undo/redo)
 */

export const UNDO_SHORTCUT: ShortcutDefinition = {
  id: 'history.undo',
  label: 'Undo',
  keys: 'Ctrl+Z',
  contexts: ['grid', 'ribbon'],
  priority: 10,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    if (ctx.commandManager.canUndo()) {
      ctx.commandManager.undo();
      console.log('[Shortcut] Undo');
    }
  },
  condition: (ctx: ShortcutContext) => ctx.commandManager.canUndo(),
};

const redoHandler = (ctx: ShortcutContext) => {
  if (ctx.commandManager.canRedo()) {
    ctx.commandManager.redo();
    console.log('[Shortcut] Redo');
  }
};

export const REDO_SHORTCUT: ShortcutDefinition = {
  id: 'history.redo',
  label: 'Redo',
  keys: 'Ctrl+Y',
  contexts: ['grid', 'ribbon'],
  priority: 10,
  preventDefault: true,
  handler: redoHandler,
  condition: (ctx: ShortcutContext) => ctx.commandManager.canRedo(),
};

export const REDO_SHIFT_Z_SHORTCUT: ShortcutDefinition = {
  id: 'history.redo.shiftZ',
  label: 'Redo',
  keys: 'Ctrl+Shift+Z',
  contexts: ['grid', 'ribbon'],
  priority: 10,
  preventDefault: true,
  handler: redoHandler,
  condition: (ctx: ShortcutContext) => ctx.commandManager.canRedo(),
};

/**
 * Editing shortcuts (validate context switching)
 * 
 * CRITICAL TEST: These shortcuts behave differently based on context
 */

export const ENTER_SHORTCUT: ShortcutDefinition = {
  id: 'edit.confirm',
  label: 'Confirm Edit',
  keys: 'Enter',
  contexts: ['cell-edit', 'formula-bar'],
  priority: 50,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // TODO: Import ConfirmEditCommand from @cyber-sheet/core
    // ctx.commandManager.execute(new ConfirmEditCommand(), ctx.selection);
    console.log('[Shortcut] Confirm Edit (Enter)', ctx.mode);
    
    // TEMPORARY: Blur active element to exit edit mode
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  },
};

export const ESCAPE_SHORTCUT: ShortcutDefinition = {
  id: 'edit.cancel',
  label: 'Cancel Edit',
  keys: 'Escape',
  contexts: ['cell-edit', 'formula-bar'],
  priority: 50,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // TODO: Import CancelEditCommand from @cyber-sheet/core
    // ctx.commandManager.execute(new CancelEditCommand(), ctx.selection);
    console.log('[Shortcut] Cancel Edit (Escape)', ctx.mode);
    
    // TEMPORARY: Blur active element to exit edit mode
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  },
};

export const ENTER_EDIT_MODE_SHORTCUT: ShortcutDefinition = {
  id: 'edit.start',
  label: 'Enter Edit Mode',
  keys: 'F2',
  contexts: ['grid'],
  priority: 10,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // TODO: Import EnterEditModeCommand from @cyber-sheet/core
    // ctx.commandManager.execute(new EnterEditModeCommand(), ctx.selection);
    console.log('[Shortcut] Enter Edit Mode (F2)', ctx.selection);
    
    // TEMPORARY: Focus grid element (will be replaced with command)
    // Real implementation will focus the active cell and enable contenteditable
  },
};

/**
 * Clipboard shortcuts (integration only, observe but don't override)
 * 
 * IMPORTANT: We preventDefault these to avoid conflicts with browser's native clipboard
 * The actual clipboard operations are handled by ExcelApp's keyboard handler
 */

export const COPY_SHORTCUT: ShortcutDefinition = {
  id: 'clipboard.copy',
  label: 'Copy',
  keys: 'Ctrl+C',
  contexts: ['grid'],
  priority: 5,
  preventDefault: true, // Prevent browser clipboard to avoid conflicts
  handler: (ctx: ShortcutContext) => {
    // Observe only - actual operation handled by ExcelApp
    console.log('[Shortcut] Copy (observed)', ctx.selection);
    
    // TODO: Update UI state (show "Copied" indicator)
  },
};

export const CUT_SHORTCUT: ShortcutDefinition = {
  id: 'clipboard.cut',
  label: 'Cut',
  keys: 'Ctrl+X',
  contexts: ['grid'],
  priority: 5,
  preventDefault: true, // Prevent browser clipboard to avoid conflicts
  handler: (ctx: ShortcutContext) => {
    // Observe only - actual operation handled by ExcelApp
    console.log('[Shortcut] Cut (observed)', ctx.selection);
    
    // TODO: Update UI state (show "Cut" indicator with marching ants)
  },
};

export const PASTE_SHORTCUT: ShortcutDefinition = {
  id: 'clipboard.paste',
  label: 'Paste',
  keys: 'Ctrl+V',
  contexts: ['grid'],
  priority: 5,
  preventDefault: true, // Prevent browser clipboard to avoid conflicts
  handler: (ctx: ShortcutContext) => {
    // Observe only - actual operation handled by ExcelApp
    console.log('[Shortcut] Paste (observed)', ctx.selection);
    
    // TODO: Process clipboard data, execute PasteCommand
  },
};

export const SELECT_ALL_SHORTCUT: ShortcutDefinition = {
  id: 'selection.selectAll',
  label: 'Select All',
  keys: 'Ctrl+A',
  contexts: ['grid'],
  priority: 5,
  preventDefault: true,
  handler: (ctx: ShortcutContext) => {
    // Observe only - actual operation handled by ExcelApp
    console.log('[Shortcut] Select All (observed)', ctx.selection);
  },
};

/**
 * All standard shortcuts (for batch registration)
 */
export const STANDARD_SHORTCUTS: ShortcutDefinition[] = [
  // Formatting and clipboard shortcuts are handled by ExcelApp (needs worksheet/renderer access).
  // Undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) are handled globally by ExcelApp
  // in capture phase so they work from every ribbon tab and tool.

  // Editing
  ENTER_SHORTCUT,
  ESCAPE_SHORTCUT,
  ENTER_EDIT_MODE_SHORTCUT,

  // Selection
  SELECT_ALL_SHORTCUT,
];

/**
 * Register all standard shortcuts with registry
 */
export function registerStandardShortcuts(registry: any): void {
  STANDARD_SHORTCUTS.forEach(shortcut => {
    registry.register(shortcut);
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Shortcuts] Registered ${STANDARD_SHORTCUTS.length} standard shortcuts`);
  }
}
