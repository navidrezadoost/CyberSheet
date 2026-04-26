/**
 * ShortcutRegistry - Central Keyboard Shortcut Manager
 * 
 * DESIGN PRINCIPLES:
 * 1. ONE global listener (not scattered across components)
 * 2. Priority-based execution (resolve conflicts deterministically)
 * 3. Context-aware (shortcuts only active in specific modes)
 * 4. Surgical preventDefault (override browser selectively, not globally)
 * 5. Zero memory leaks (proper cleanup on unmount)
 */

import type {
  ShortcutDefinition,
  ShortcutContext,
  ParsedShortcut,
  IShortcutRegistry,
  InteractionContext,
} from './types';

/**
 * Parse keyboard event into normalized shortcut representation
 * 
 * Handles:
 * - Browser differences (Cmd vs Ctrl on Mac)
 * - Key name normalization ('esc' → 'Escape')
 * - Modifier key detection
 * - Dead keys (German/French keyboards)
 * 
 * CRITICAL: Caller must check event.isComposing before calling this
 */
export function parseKeyboardEvent(event: KeyboardEvent): ParsedShortcut {
  // Normalize key name
  let key = event.key;

  // Special key mappings (browser differences)
  const keyMappings: Record<string, string> = {
    'Esc': 'Escape',
    'Del': 'Delete',
    ' ': 'Space',
    'Spacebar': 'Space', // Old Safari
  };

  if (keyMappings[key]) {
    key = keyMappings[key];
  }
  
  // EDGE CASE: Dead keys produce multi-char strings (e.g., "Dead")
  // These are composition sequences - ignore them
  if (key.startsWith('Dead')) {
    key = '';
  }

  // For letter keys, normalize to lowercase
  if (key.length === 1) {
    key = key.toLowerCase();
  }
  
  // EDGE CASE: Mac uses Meta (Cmd), Windows uses Ctrl
  // We normalize: treat Cmd as Ctrl for cross-platform shortcuts
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const ctrl = isMac ? event.metaKey : event.ctrlKey;

  return {
    key,
    ctrl,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

/**
 * Convert ParsedShortcut to string key (for matching)
 * 
 * Format: "Ctrl+Shift+B", "F2", "Escape"
 */
export function shortcutToString(parsed: ParsedShortcut): string {
  const parts: string[] = [];

  if (parsed.ctrl) parts.push('Ctrl');
  if (parsed.shift) parts.push('Shift');
  if (parsed.alt) parts.push('Alt');

  // Capitalize first letter of key for consistency
  const keyCapitalized = parsed.key.charAt(0).toUpperCase() + parsed.key.slice(1);
  parts.push(keyCapitalized);

  return parts.join('+');
}

/**
 * Parse shortcut string to ParsedShortcut
 * 
 * Example: "Ctrl+B" → { ctrl: true, key: 'b', ... }
 */
export function parseShortcutString(keys: string): ParsedShortcut {
  const parts = keys.split('+').map(p => p.trim());

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
      // This is the actual key
      parsed.key = part.toLowerCase();
    }
  }

  return parsed;
}

/**
 * Debug configuration for shortcut system
 */
export interface ShortcutDebugConfig {
  enabled: boolean;
  logMatches?: boolean;   // Log successful executions
  logMisses?: boolean;    // Log when no shortcut matches
  logContext?: boolean;   // Log context detection
}

/**
 * ShortcutRegistry implementation
 */
export class ShortcutRegistry implements IShortcutRegistry {
  private shortcuts: Map<string, ShortcutDefinition[]> = new Map();
  private debugConfig: ShortcutDebugConfig = { enabled: false };
  
  /**
   * Enable debug mode for visibility into shortcut execution
   * 
   * CRITICAL: Use this during development to catch context misclassification
   * 
   * Example:
   * ```ts
   * shortcutRegistry.setDebugMode({
   *   enabled: true,
   *   logMatches: true,
   *   logMisses: true,
   *   logContext: true
   * });
   * ```
   */
  setDebugMode(config: ShortcutDebugConfig): void {
    this.debugConfig = config;
  }

  /**
   * Register a shortcut
   */
  register(shortcut: ShortcutDefinition): void {
    // Parse shortcut string to get key combination
    const parsed = parseShortcutString(shortcut.keys);
    const keyString = shortcutToString(parsed);

    // Get existing shortcuts for this key combination
    const existing = this.shortcuts.get(keyString) || [];

    // Add new shortcut (sorted by priority, highest first)
    const priority = shortcut.priority ?? 10;
    const withPriority = { ...shortcut, priority };

    existing.push(withPriority);
    existing.sort((a, b) => (b.priority ?? 10) - (a.priority ?? 10));

    this.shortcuts.set(keyString, existing);

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[ShortcutRegistry] Registered: ${shortcut.id} (${keyString}) priority=${priority}`);
    }
  }

  /**
   * Unregister a shortcut by ID
   */
  unregister(id: string): void {
    for (const [key, shortcuts] of this.shortcuts.entries()) {
      const filtered = shortcuts.filter(s => s.id !== id);
      if (filtered.length === 0) {
        this.shortcuts.delete(key);
      } else if (filtered.length !== shortcuts.length) {
        this.shortcuts.set(key, filtered);
      }
    }
  }

  /**
   * Handle keyboard event
   * 
   * Returns true if shortcut was handled
   */
  handleKeyDown(event: KeyboardEvent, context: ShortcutContext): boolean {
    // CRITICAL: IME Composition Guard
    // During IME input (Japanese, Chinese, Korean, Persian with diacritics),
    // we must NOT intercept keys - they're part of character composition
    if (event.isComposing || event.keyCode === 229) {
      if (this.debugConfig.enabled && this.debugConfig.logMisses) {
        console.log('[Shortcut] Ignored - IME composing', { key: event.key });
      }
      return false;
    }
    
    // Parse event
    const parsed = parseKeyboardEvent(event);
    const keyString = shortcutToString(parsed);
    
    if (this.debugConfig.enabled && this.debugConfig.logContext) {
      console.log('[Shortcut] Context', {
        mode: context.mode,
        isEditing: context.isEditing,
        key: keyString,
        parsed,
      });
    }

    // Find matching shortcuts
    const candidates = this.shortcuts.get(keyString);
    if (!candidates || candidates.length === 0) {
      if (this.debugConfig.enabled && this.debugConfig.logMisses) {
        console.log('[Shortcut] No candidates', { key: keyString, parsed });
      }
      return false;
    }

    // Filter by context and condition
    const applicable = candidates.filter(shortcut => {
      // Check context
      if (shortcut.contexts.length > 0 && !shortcut.contexts.includes(context.mode)) {
        return false;
      }

      // Check condition
      if (shortcut.condition && !shortcut.condition(context)) {
        return false;
      }

      return true;
    });

    if (applicable.length === 0) {
      return false;
    }

    // Execute highest priority shortcut
    const shortcut = applicable[0];

    // Determine if we should preventDefault
    let shouldPrevent = false;
    if (typeof shortcut.preventDefault === 'function') {
      shouldPrevent = shortcut.preventDefault(context);
    } else if (shortcut.preventDefault === true) {
      shouldPrevent = true;
    }

    // Prevent default BEFORE executing handler (avoid browser action)
    if (shouldPrevent) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Execute handler
    try {
      if (this.debugConfig.enabled && this.debugConfig.logMatches) {
        console.log('[Shortcut] Executed', {
          id: shortcut.id,
          label: shortcut.label,
          key: keyString,
          context: context.mode,
          prevented: shouldPrevent,
          priority: shortcut.priority,
        });
      }
      
      shortcut.handler(context);

      return true;
    } catch (error) {
      console.error(`[ShortcutRegistry] Error executing ${shortcut.id}:`, error);
      return false;
    }
  }

  /**
   * Get all registered shortcuts
   */
  getAllShortcuts(): ShortcutDefinition[] {
    const all: ShortcutDefinition[] = [];
    for (const shortcuts of this.shortcuts.values()) {
      all.push(...shortcuts);
    }
    return all;
  }

  /**
   * Clear all shortcuts
   */
  clear(): void {
    this.shortcuts.clear();
  }
}

/**
 * Global singleton instance (created on first import)
 * 
 * ⚠️ IMPORTANT: Only ONE instance should exist per application
 */
export const shortcutRegistry = new ShortcutRegistry();
