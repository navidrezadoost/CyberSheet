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
import { shortcutEventRecorder } from './ShortcutEventRecorder';
import {
  parseKeyboardEvent,
  shortcutToString,
  parseShortcutString,
} from '../../../utils/keyboardLayout';

export { parseKeyboardEvent, shortcutToString, parseShortcutString };

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
  private recordingEnabled = false; // NEW: Behavioral validation
  
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
   * Enable event recording (behavioral validation)
   * 
   * CRITICAL: This proves correctness under real usage
   * - Records timing-sensitive context snapshots
   * - Detects race conditions, desync, stale state
   * 
   * Example:
   * ```ts
   * shortcutRegistry.setRecordingEnabled(true);
   * // ... user interacts ...
   * const sequence = shortcutEventRecorder.stopRecording();
   * const analysis = shortcutEventRecorder.analyzeSequence(sequence.id);
   * ```
   */
  setRecordingEnabled(enabled: boolean): void {
    this.recordingEnabled = enabled;
    if (enabled) {
      console.log('[ShortcutRegistry] Recording enabled - all events will be captured');
    }
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
    
    // ALWAYS log for debugging (can be removed after investigation)
    console.log('[ShortcutRegistry] Key event', {
      key: event.key,
      code: event.code,
      parsed,
      keyString,
      mode: context.mode,
      isEditing: context.isEditing,
      ctrl: parsed.ctrl,
      shift: parsed.shift,
      alt: parsed.alt,
    });
    
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
    console.log(`[ShortcutRegistry] Looking for shortcuts matching '${keyString}', found ${candidates?.length || 0} candidates`);
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
    console.log(`[ShortcutRegistry] Executing shortcut: ${shortcut.id} (${shortcut.label})`);

    // Determine if we should preventDefault
    let shouldPrevent = false;
    if (typeof shortcut.preventDefault === 'function') {
      shouldPrevent = shortcut.preventDefault(context);
    } else if (shortcut.preventDefault === true) {
      shouldPrevent = true;
    }

    console.log(`[ShortcutRegistry] preventDefault: ${shouldPrevent}`);

    // Prevent default BEFORE executing handler (avoid browser action)
    if (shouldPrevent) {
      event.preventDefault();
      event.stopPropagation();
      console.log('[ShortcutRegistry] Event prevented and stopped');
    }

    // Execute handler
    const executionStart = performance.now();
    let executionError: Error | null = null;
    
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
      executionError = error as Error;
      console.error(`[ShortcutRegistry] Error executing ${shortcut.id}:`, error);
      return false;
    } finally {
      const executionEnd = performance.now();
      const executionTimeMs = executionEnd - executionStart;
      
      // Record event for behavioral validation
      if (this.recordingEnabled) {
        shortcutEventRecorder.recordEvent(
          keyString,
          { ctrl: parsed.ctrl, shift: parsed.shift, alt: parsed.alt, meta: parsed.meta },
          context,
          shortcut.id,
          shortcut.label,
          true, // executed
          shouldPrevent,
          executionTimeMs,
          false, // TODO: Get actual locked state from contextResolver
          executionError
        );
      }
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
