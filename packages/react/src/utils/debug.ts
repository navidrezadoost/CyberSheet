/**
 * Debug utility for conditional logging
 * Set to false in production to eliminate console.log overhead
 * and prevent DevTools from retaining object references
 */

export const DEBUG_INPUT = false; // Mouse/keyboard input events
export const DEBUG_RENDER = false; // Renderer lifecycle  
export const DEBUG_EDIT = false; // Cell editing operations
export const DEBUG_MENU = false; // Context menu and toolbar actions

export function debugInput(...args: any[]) {
  if (DEBUG_INPUT) console.log(...args);
}

export function debugRender(...args: any[]) {
  if (DEBUG_RENDER) console.log(...args);
}

export function debugEdit(...args: any[]) {
  if (DEBUG_EDIT) console.log(...args);
}

export function debugMenu(...args: any[]) {
  if (DEBUG_MENU) console.log(...args);
}
