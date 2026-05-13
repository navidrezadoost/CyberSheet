/**
 * useKeyboardShortcuts - React Hook for Global Keyboard Integration
 * 
 * DESIGN: Single global listener (not per-component)
 * 
 * Usage:
 * ```tsx
 * function Ribbon({ commandManager, selection }: RibbonProps) {
 *   // This sets up global keyboard listener
 *   useKeyboardShortcuts({ commandManager, selection });
 *   
 *   return <div>...</div>;
 * }
 * ```
 * 
 * ⚠️ IMPORTANT: Only call this ONCE per application (typically in Ribbon or App component)
 */

import { useEffect, useRef } from 'react';
import type { SelectionState, CommandManager } from '../types';
import type { ShortcutContext } from '../keyboard/types';
import { shortcutRegistry } from '../keyboard/ShortcutRegistry';
import { contextResolver } from '../keyboard/ContextResolver';
import { registerStandardShortcuts } from '../keyboard/shortcuts';

export interface UseKeyboardShortcutsOptions {
  /**
   * Command manager (from props)
   */
  commandManager: CommandManager;

  /**
   * Current selection state (from props)
   */
  selection: SelectionState;

  /**
   * Whether to register standard shortcuts automatically
   * 
   * Default: true
   */
  registerStandardShortcuts?: boolean;

  /**
   * Whether keyboard shortcuts are enabled
   * 
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Global keyboard shortcut hook
 * 
 * Sets up:
 * 1. Global keydown listener (single entry point)
 * 2. Standard shortcut registration
 * 3. Cleanup on unmount
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    commandManager,
    selection,
    registerStandardShortcuts: shouldRegisterStandard = true,
    enabled = true,
  } = options;

  // Track if we've registered shortcuts (only once)
  const hasRegistered = useRef(false);
  const selectionRef = useRef(selection);
  const commandManagerRef = useRef(commandManager);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    commandManagerRef.current = commandManager;
  }, [commandManager]);

  // Register standard shortcuts (once)
  useEffect(() => {
    if (!shouldRegisterStandard || hasRegistered.current) {
      return;
    }

    registerStandardShortcuts(shortcutRegistry);
    hasRegistered.current = true;

    // Cleanup: unregister on unmount
    return () => {
      shortcutRegistry.clear();
      hasRegistered.current = false;
    };
  }, [shouldRegisterStandard]);

  // Set up global keyboard listener
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Get current context (real-time)
      const mode = contextResolver.getCurrentContext();
      const isEditing = contextResolver.isEditing();

      // Build shortcut context
      const context: ShortcutContext = {
        mode,
        selection: selectionRef.current,
        isEditing,
        commandManager: commandManagerRef.current,
        event,
      };

      // Let registry handle the event
      const handled = shortcutRegistry.handleKeyDown(event, context);

      // If handled, event was already prevented (if needed)
      // No additional action required
    };

    // Attach global listener
    window.addEventListener('keydown', handleKeyDown);

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[useKeyboardShortcuts] Global listener attached');
    }

    // Cleanup: remove listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      if (process.env.NODE_ENV === 'development') {
        console.log('[useKeyboardShortcuts] Global listener removed');
      }
    };
  }, [enabled]);
}

/**
 * Hook to register a custom context detector
 * 
 * Example: Dialog component registers detector when mounted
 * 
 * ```tsx
 * function MyDialog({ isOpen }: DialogProps) {
 *   useContextDetector('myDialog', () => isOpen ? 'dialog' : null);
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useContextDetector(
  name: string,
  detector: () => 'dialog' | 'grid' | 'cell-edit' | 'formula-bar' | 'ribbon' | null
): void {
  useEffect(() => {
    contextResolver.registerDetector(name, detector);

    // Cleanup: unregister on unmount
    return () => {
      contextResolver.unregisterDetector(name);
    };
  }, [name, detector]);
}

/**
 * Hook to temporarily disable a specific shortcut
 * 
 * Example: Disable Ctrl+B when custom formatting panel is open
 * 
 * ```tsx
 * function FormattingPanel() {
 *   useDisableShortcut('format.bold');
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useDisableShortcut(shortcutId: string): void {
  const originalShortcutRef = useRef<any>(null);

  useEffect(() => {
    // Store original shortcut
    const shortcuts = shortcutRegistry.getAllShortcuts();
    originalShortcutRef.current = shortcuts.find(s => s.id === shortcutId);

    // Unregister temporarily
    if (originalShortcutRef.current) {
      shortcutRegistry.unregister(shortcutId);
    }

    // Cleanup: re-register on unmount
    return () => {
      if (originalShortcutRef.current) {
        shortcutRegistry.register(originalShortcutRef.current);
      }
    };
  }, [shortcutId]);
}
