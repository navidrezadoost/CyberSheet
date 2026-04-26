/**
 * Keyboard Shortcut System - Type Definitions
 * 
 * ARCHITECTURAL DECISION: Single global listener, not scattered useEffect hooks
 * 
 * This is the interaction layer that makes the difference between:
 * - "Feature collection" (components with shortcuts)
 * - "Spreadsheet UI engine" (unified interaction model)
 */

import type { SelectionState, CommandManager } from '../types';

/**
 * Interaction context (where is the user's focus?)
 * 
 * CRITICAL: This determines which shortcuts are active
 * 
 * Priority order (highest to lowest):
 * 1. dialog (modal open - limited shortcuts)
 * 2. cell-edit (editing cell inline)
 * 3. formula-bar (editing in formula bar)
 * 4. ribbon (focus in ribbon UI)
 * 5. grid (default - cell selection, navigation)
 */
export type InteractionContext = 
  | 'grid'         // Cell selection, not editing (default context)
  | 'cell-edit'    // Editing cell content inline (typing in cell)
  | 'formula-bar'  // Editing in formula bar (typing above grid)
  | 'ribbon'       // Focus in ribbon controls (dropdown open, button focused)
  | 'dialog';      // Modal dialog open (most shortcuts disabled)

/**
 * Shortcut execution context (passed to handlers)
 * 
 * Handlers must NEVER access global state directly
 * Everything they need is in this context
 */
export interface ShortcutContext {
  /**
   * Current interaction mode
   */
  mode: InteractionContext;

  /**
   * Current selection state (cells, ranges, etc.)
   */
  selection: SelectionState;

  /**
   * Is user currently editing? (cell-edit or formula-bar)
   */
  isEditing: boolean;

  /**
   * Command manager for executing actions
   */
  commandManager: CommandManager;

  /**
   * Original keyboard event (for preventDefault, stopPropagation)
   */
  event: KeyboardEvent;
}

/**
 * Keyboard shortcut definition
 * 
 * DESIGN PRINCIPLES:
 * - Declarative (what, not how)
 * - Context-aware (only active in specific modes)
 * - Priority-based (resolves conflicts)
 * - Command-integrated (no direct DOM manipulation)
 */
export interface ShortcutDefinition {
  /**
   * Unique identifier (for debugging, logging)
   */
  id: string;

  /**
   * Human-readable label (for UI display, tooltips)
   */
  label: string;

  /**
   * Key combination
   * 
   * Format: "Ctrl+B", "Ctrl+Shift+S", "F2", "Enter", "Escape"
   */
  keys: string;

  /**
   * Contexts where shortcut is active
   * 
   * Empty array = active in ALL contexts (dangerous, avoid)
   * 
   * Example: ['grid'] = only in grid mode
   * Example: ['grid', 'ribbon'] = grid or ribbon, NOT during editing
   */
  contexts: InteractionContext[];

  /**
   * Priority (higher = executes first if conflict)
   * 
   * Use for:
   * - Dialog shortcuts (priority 100)
   * - Editing shortcuts (priority 50)
   * - Grid shortcuts (priority 10)
   * - Ribbon shortcuts (priority 5)
   * 
   * Default: 10
   */
  priority?: number;

  /**
   * Should preventDefault() be called?
   * 
   * ⚠️ CRITICAL: Be surgical, not global
   * 
   * true = always prevent (Ctrl+B for bold)
   * false = never prevent (Ctrl+C native copy)
   * function = conditional (prevent only in grid, allow in edit)
   */
  preventDefault?: boolean | ((ctx: ShortcutContext) => boolean);

  /**
   * Shortcut handler
   * 
   * RULES:
   * 1. MUST use commandManager.execute() (no direct state updates)
   * 2. MUST NOT access global state (use context parameter)
   * 3. MUST be synchronous (no async/await - use commands for async)
   * 4. MUST check context.mode before executing (double-check safety)
   */
  handler: (ctx: ShortcutContext) => void;

  /**
   * Optional condition (additional filtering beyond context)
   * 
   * Use for:
   * - Feature flags (isFeatureEnabled('clipboard'))
   * - Permission checks (canEditCell())
   * - State requirements (hasSelection())
   * 
   * Return false = shortcut disabled (skip handler)
   */
  condition?: (ctx: ShortcutContext) => boolean;
}

/**
 * Parsed keyboard event (normalized browser differences)
 */
export interface ParsedShortcut {
  key: string;        // 'b', 'Enter', 'Escape', 'F2'
  ctrl: boolean;      // Ctrl key (Cmd on Mac)
  shift: boolean;     // Shift key
  alt: boolean;       // Alt key
  meta: boolean;      // Meta key (Cmd on Mac, Win on Windows)
}

/**
 * Shortcut registry interface
 */
export interface IShortcutRegistry {
  /**
   * Register a shortcut
   */
  register(shortcut: ShortcutDefinition): void;

  /**
   * Unregister a shortcut by ID
   */
  unregister(id: string): void;

  /**
   * Handle keyboard event (called by global listener)
   * 
   * Returns true if shortcut was handled (prevents default, stops propagation)
   */
  handleKeyDown(event: KeyboardEvent, context: ShortcutContext): boolean;

  /**
   * Get all registered shortcuts (for debugging, UI display)
   */
  getAllShortcuts(): ShortcutDefinition[];

  /**
   * Clear all shortcuts (cleanup)
   */
  clear(): void;
}

/**
 * Context resolver interface
 * 
 * Determines current interaction context based on:
 * - document.activeElement
 * - contentEditable detection
 * - Modal/dialog state
 * - Custom context markers
 */
export interface IContextResolver {
  /**
   * Get current interaction context (real-time, not cached)
   */
  getCurrentContext(): InteractionContext;

  /**
   * Check if user is currently editing
   */
  isEditing(): boolean;

  /**
   * Register custom context detector
   * 
   * Example: Detect when dropdown is open
   */
  registerDetector(name: string, detector: () => InteractionContext | null): void;

  /**
   * Unregister custom detector
   */
  unregisterDetector(name: string): void;

  /**
   * Lock context to prevent flickering during transitions
   * 
   * CRITICAL: Always pair lock() with unlock()
   * 
   * Example:
   * ```ts
   * contextResolver.lock('dialog');
   * // ... dialog open ...
   * contextResolver.unlock();
   * ```
   */
  lock(context: InteractionContext): void;

  /**
   * Unlock context (return to auto-detection)
   */
  unlock(): void;

  /**
   * Clear all detectors (cleanup)
   */
  clear(): void;
}
