/**
 * cyberSheetStore.ts
 * 
 * Svelte store for Cyber Sheet state management
 */

import { writable, type Writable } from 'svelte/store';
import type { WorkbookSheetView, FormulaEngine, CollaborationEngine } from '@cyber-sheet/core';
import type { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

export interface CyberSheetState {
  worksheet: WorkbookSheetView | null;
  renderer: CanvasRenderer | null;
  formulaEngine: FormulaEngine | null;
  collaboration: CollaborationEngine | null;
}

export function createCyberSheetStore(): Writable<CyberSheetState> {
  const initialState: CyberSheetState = {
    worksheet: null,
    renderer: null,
    formulaEngine: null,
    collaboration: null
  };

  return writable(initialState);
}

export async function initializeCyberSheet(
  container: HTMLElement,
  store: Writable<CyberSheetState>,
  options: {
    data?: any[][];
    enableFormulas?: boolean;
    enableCollaboration?: boolean;
    collaborationUrl?: string;
  } = {}
) {
  const { Workbook, FormulaEngine } = await import('@cyber-sheet/core');
  const { CanvasRenderer } = await import('@cyber-sheet/renderer-canvas');

  if (options.data?.some((row) => row.length > 0)) {
    throw new Error('Initial workbook cell data is unavailable until the R2 journal slice is authorized');
  }
  if (options.enableCollaboration) {
    throw new Error('Workbook collaboration writes are unavailable until their journal slice is authorized');
  }
  const workbook = Workbook.create({ sheets: [{ name: 'Sheet1' }] });
  const worksheet = workbook.getSheet('Sheet1');
  if (!worksheet) throw new Error('Workbook bootstrap failed to create Sheet1');

  const renderer = new CanvasRenderer(container, worksheet, {
    debug: false
  });

  const state: CyberSheetState = {
    worksheet,
    renderer,
    formulaEngine: null,
    collaboration: null
  };

  // Enable formulas
  if (options.enableFormulas) {
    const formulaEngine = new FormulaEngine();
    state.formulaEngine = formulaEngine;
  }

  store.set(state);

  return state;
}
