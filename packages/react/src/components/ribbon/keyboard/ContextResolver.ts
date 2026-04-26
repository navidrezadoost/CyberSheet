/**
 * ContextResolver - Real-time Interaction Context Detection
 * 
 * CRITICAL: This determines which shortcuts are active
 * 
 * Detection strategy (PRODUCTION-GRADE):
 * 1. Locked context (for deterministic transitions)
 * 2. Explicit data-context attribute (NEW - prevents misclassification)
 * 3. Custom detectors (modal/dialog components)
 * 4. Cell editing (contenteditable or input focused)
 * 5. Formula bar editing
 * 6. Ribbon focus (dropdown, button, input)
 * 7. Default to grid (cell selection)
 * 
 * ⚠️ MUST be real-time (not cached) - user can switch context mid-keystroke
 */

import type { InteractionContext, IContextResolver } from './types';

/**
 * Custom context detector function
 */
type ContextDetector = () => InteractionContext | null;

/**
 * ContextResolver implementation
 */
export class ContextResolver implements IContextResolver {
  /**
   * Custom detectors (registered by components)
   * 
   * Example: Dialog component registers detector when mounted
   */
  private detectors: Map<string, ContextDetector> = new Map();
  
  /**
   * Locked context (prevents flickering during transitions)
   * 
   * CRITICAL: Always pair lock() with unlock()
   */
  private lockedContext: InteractionContext | null = null;
  
  /**
   * Lock context to prevent flickering during mode transitions
   * 
   * Example:
   * ```ts
   * // When opening dialog
   * contextResolver.lock('dialog');
   * // ... render dialog ...
   * // When closing dialog
   * contextResolver.unlock();
   * ```
   */
  lock(context: InteractionContext): void {
    this.lockedContext = context;
  }
  
  /**
   * Unlock context (return to auto-detection)
   */
  unlock(): void {
    this.lockedContext = null;
  }

  /**
   * Get current interaction context (real-time)
   * 
   * Priority order (first match wins):
   * 1. Locked context (deterministic transitions)
   * 2. Explicit data-context attribute (PRODUCTION-GRADE)
   * 3. Custom detectors (dialog, modal)
   * 4. Cell editing (contenteditable, input in grid)
   * 5. Formula bar editing
   * 6. Ribbon focus (dropdown, button)
   * 7. Grid (default)
   */
  getCurrentContext(): InteractionContext {
    // 1. Check locked context (highest priority)
    if (this.lockedContext) {
      return this.lockedContext;
    }
    
    // 2. Check explicit context boundaries (CRITICAL for production)
    // Components should set data-context="dialog", etc.
    const activeElement = document.activeElement;
    if (activeElement) {
      // Walk up DOM tree looking for explicit context boundary
      let element: Element | null = activeElement;
      let depth = 0;
      while (element && element !== document.body && depth < 10) {
        const explicitContext = element.getAttribute('data-context');
        if (explicitContext) {
          return explicitContext as InteractionContext;
        }
        element = element.parentElement;
        depth++;
      }
    }
    
    // 3. Check custom detectors
    for (const detector of this.detectors.values()) {
      const context = detector();
      if (context !== null) {
        return context;
      }
    }

    // 4. Check for editing context
    if (!activeElement) {
      return 'grid';
    }

    // Check if element is contenteditable (inline cell editing)
    if (
      activeElement.hasAttribute('contenteditable') ||
      (activeElement as HTMLElement).isContentEditable
    ) {
      // Determine if it's cell edit or formula bar
      if (this.isFormulaBar(activeElement)) {
        return 'formula-bar';
      }
      return 'cell-edit';
    }

    // Check if element is input/textarea
    if (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA'
    ) {
      // Check if it's in formula bar
      if (this.isFormulaBar(activeElement)) {
        return 'formula-bar';
      }

      // Check if it's in ribbon (search, dropdowns)
      if (this.isRibbonControl(activeElement)) {
        return 'ribbon';
      }

      // Otherwise, assume it's grid-related input
      return 'cell-edit';
    }

    // 3. Check for ribbon focus (buttons, dropdowns)
    if (this.isRibbonControl(activeElement)) {
      return 'ribbon';
    }

    // 4. Default to grid
    return 'grid';
  }

  /**
   * Check if user is currently editing
   */
  isEditing(): boolean {
    const context = this.getCurrentContext();
    return context === 'cell-edit' || context === 'formula-bar';
  }

  /**
   * Register custom context detector
   * 
   * Example:
   * ```ts
   * contextResolver.registerDetector('myDialog', () => {
   *   return isMyDialogOpen ? 'dialog' : null;
   * });
   * ```
   */
  registerDetector(name: string, detector: ContextDetector): void {
    this.detectors.set(name, detector);

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[ContextResolver] Registered detector: ${name}`);
    }
  }

  /**
   * Unregister custom detector
   */
  unregisterDetector(name: string): void {
    this.detectors.delete(name);
  }

  /**
   * Check if element is in formula bar
   * 
   * Uses heuristics:
   * - Has data-formula-bar attribute
   * - Has class containing 'formula-bar'
   * - Parent has formula-bar markers
   */
  private isFormulaBar(element: Element): boolean {
    // Check element itself
    if (
      element.hasAttribute('data-formula-bar') ||
      element.classList.contains('formula-bar') ||
      element.classList.contains('cs-formula-bar')
    ) {
      return true;
    }

    // Check parents (up to 5 levels)
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      if (
        parent.hasAttribute('data-formula-bar') ||
        parent.classList.contains('formula-bar') ||
        parent.classList.contains('cs-formula-bar')
      ) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  /**
   * Check if element is a ribbon control
   * 
   * Heuristics:
   * - Has data-ribbon-* attribute
   * - Has class containing 'ribbon'
   * - Has role="button", "combobox", etc.
   * - Parent is ribbon
   */
  private isRibbonControl(element: Element): boolean {
    // Check for ribbon-specific attributes
    const attributes = Array.from(element.attributes);
    if (attributes.some(attr => attr.name.startsWith('data-ribbon-'))) {
      return true;
    }

    // Check classes
    const classes = Array.from(element.classList);
    if (
      classes.some(cls =>
        cls.includes('ribbon') ||
        cls.startsWith('cs-ribbon-') ||
        cls.includes('dropdown')
      )
    ) {
      return true;
    }

    // Check role (buttons, comboboxes)
    const role = element.getAttribute('role');
    if (
      role === 'button' ||
      role === 'combobox' ||
      role === 'listbox' ||
      role === 'option'
    ) {
      // If it has role and is in ribbon area, consider it ribbon
      if (this.isInRibbonArea(element)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if element is within ribbon area
   */
  private isInRibbonArea(element: Element): boolean {
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (
        parent.classList.contains('ribbon') ||
        parent.classList.contains('cs-ribbon') ||
        parent.hasAttribute('data-ribbon')
      ) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }
    return false;
  }

  /**
   * Clear all detectors
   */
  clear(): void {
    this.detectors.clear();
  }
}

/**
 * Global singleton instance
 */
export const contextResolver = new ContextResolver();
