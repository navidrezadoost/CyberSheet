/**
 * CyberSheetService.ts
 * 
 * Angular service for Cyber Sheet management
 */

import { Injectable } from '@angular/core';
import {
  WorkbookSheetView,
  CollaborationEngine,
  FormulaEngine
} from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

@Injectable({
  providedIn: 'root'
})
export class CyberSheetService {
  private isLoaded = false;

  async createRenderer(
    container: HTMLElement,
    options: {
      data?: any[][];
      enableFormulas?: boolean;
      enableCollaboration?: boolean;
      collaborationUrl?: string;
    } = {}
  ): Promise<{
    worksheet: WorkbookSheetView;
    renderer: CanvasRenderer;
    formulaEngine?: FormulaEngine;
    collaboration?: CollaborationEngine;
  }> {
    const { Workbook } = await import('@cyber-sheet/core');
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

    const result: any = { worksheet, renderer };

    // Enable formulas
    if (options.enableFormulas) {
      const formulaEngine = new FormulaEngine();
      result.formulaEngine = formulaEngine;
    }

    return result;
  }
}
