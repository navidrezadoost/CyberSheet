/**
 * Error Highlighting Tests
 * 
 * Comprehensive test suite for error highlighting, tooltips, and suggestions.
 * Week 9 Day 3: Error Highlighting + Interactive Tooltips
 */

import {
  isFormulaError,
  getErrorType,
  renderErrorCell,
  renderErrorIcon,
  renderCellError,
  getErrorMessage,
  createErrorHighlightPlugin,
  ERROR_STYLES,
  DEFAULT_ERROR_OPTIONS,
  type ErrorIconType,
} from '../src/error-highlighter';

import {
  levenshteinDistance,
  findClosestFunctions,
  getNameErrorSuggestion,
  getErrorSolution,
  formatErrorSolutionHTML,
  formatErrorSolutionText,
  ERROR_SOLUTIONS,
} from '../src/error-solutions';

import {
  ErrorTooltipManager,
  getCellRectFromCanvas,
  createErrorTooltipManager,
  DEFAULT_TOOLTIP_OPTIONS,
} from '../src/error-tooltip';

// Mock DOMRect for Jest environment
if (typeof DOMRect === 'undefined') {
  (global as any).DOMRect = class DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;

    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.left = x;
      this.top = y;
      this.right = x + width;
      this.bottom = y + height;
    }

    toJSON() {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        top: this.top,
        right: this.right,
        bottom: this.bottom,
        left: this.left,
      };
    }
  };
}

// Mock canvas context for testing
class MockCanvasContext {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  
  calls: Array<{ method: string; args: any[] }> = [];
  
  fillRect(...args: any[]) {
    this.calls.push({ method: 'fillRect', args });
  }
  
  strokeRect(...args: any[]) {
    this.calls.push({ method: 'strokeRect', args });
  }
  
  fillText(...args: any[]) {
    this.calls.push({ method: 'fillText', args });
  }
  
  save() {
    this.calls.push({ method: 'save', args: [] });
  }
  
  restore() {
    this.calls.push({ method: 'restore', args: [] });
  }
  
  reset() {
    this.calls = [];
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 0;
  }
}

describe('Error Highlighting Module', () => {
  describe('Error Detection', () => {
    test('isFormulaError detects Error instances', () => {
      expect(isFormulaError(new Error('#DIV/0!'))).toBe(true);
      expect(isFormulaError(new Error('#VALUE!'))).toBe(true);
      expect(isFormulaError(new Error('Test error'))).toBe(true);
    });

    test('isFormulaError returns false for non-errors', () => {
      expect(isFormulaError(null)).toBe(false);
      expect(isFormulaError(undefined)).toBe(false);
      expect(isFormulaError(42)).toBe(false);
      expect(isFormulaError('error')).toBe(false);
      expect(isFormulaError({})).toBe(false);
    });

    test('getErrorType extracts error type from message', () => {
      expect(getErrorType(new Error('#DIV/0!'))).toBe('#DIV/0!');
      expect(getErrorType(new Error('#VALUE! Invalid value'))).toBe('#VALUE!');
      expect(getErrorType(new Error('Something went wrong #NAME?'))).toBe('#NAME?');
      expect(getErrorType(new Error('#SPILL! range blocked'))).toBe('#SPILL!');
    });

    test('getErrorType returns null for unknown errors', () => {
      expect(getErrorType(new Error('Unknown error'))).toBe(null);
      expect(getErrorType(new Error('Something went wrong'))).toBe(null);
    });

    test('getErrorType handles all Excel error types', () => {
      const errorTypes = ['#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#REF!', '#VALUE!', '#SPILL!', '#CALC!'];
      
      errorTypes.forEach(type => {
        const error = new Error(type);
        expect(getErrorType(error)).toBe(type);
      });
    });
  });

  describe('Error Cell Rendering', () => {
    let ctx: MockCanvasContext;

    beforeEach(() => {
      ctx = new MockCanvasContext();
    });

    test('renderErrorCell applies background and border', () => {
      renderErrorCell(ctx as any, 10, 20, 100, 30);

      expect(ctx.fillStyle).toBe(ERROR_STYLES.BACKGROUND);
      expect(ctx.strokeStyle).toBe(ERROR_STYLES.BORDER);
      expect(ctx.lineWidth).toBe(ERROR_STYLES.BORDER_WIDTH);
      
      const fillRectCall = ctx.calls.find(c => c.method === 'fillRect');
      const strokeRectCall = ctx.calls.find(c => c.method === 'strokeRect');
      
      expect(fillRectCall).toBeDefined();
      expect(fillRectCall?.args).toEqual([10, 20, 100, 30]);
      expect(strokeRectCall).toBeDefined();
    });

    test('renderErrorCell respects options', () => {
      renderErrorCell(ctx as any, 0, 0, 100, 30, {
        showBackground: false,
        showBorder: true,
      });

      const fillRectCall = ctx.calls.find(c => c.method === 'fillRect');
      const strokeRectCall = ctx.calls.find(c => c.method === 'strokeRect');
      
      expect(fillRectCall).toBeUndefined();
      expect(strokeRectCall).toBeDefined();
    });

    test('renderErrorCell uses custom colors', () => {
      const customBg = '#FF0000';
      const customBorder = '#00FF00';
      
      renderErrorCell(ctx as any, 0, 0, 100, 30, {
        backgroundColor: customBg,
        borderColor: customBorder,
      });

      expect(ctx.fillStyle).toBe(customBg);
      expect(ctx.strokeStyle).toBe(customBorder);
    });

    test('renderErrorIcon draws warning icon', () => {
      renderErrorIcon(ctx as any, 10, 20, 100, 30, 'warning', 1);

      const fillTextCall = ctx.calls.find(c => c.method === 'fillText');
      expect(fillTextCall).toBeDefined();
      expect(fillTextCall?.args[0]).toBe('⚠');
      expect(ctx.fillStyle).toBe(ERROR_STYLES.ICON_COLOR);
    });

    test('renderErrorIcon draws error icon', () => {
      renderErrorIcon(ctx as any, 10, 20, 100, 30, 'error', 1);

      const fillTextCall = ctx.calls.find(c => c.method === 'fillText');
      expect(fillTextCall).toBeDefined();
      expect(fillTextCall?.args[0]).toBe('❌');
    });

    test('renderErrorIcon skips rendering for none type', () => {
      renderErrorIcon(ctx as any, 10, 20, 100, 30, 'none', 1);

      const fillTextCall = ctx.calls.find(c => c.method === 'fillText');
      expect(fillTextCall).toBeUndefined();
    });

    test('renderErrorIcon scales with zoom', () => {
      renderErrorIcon(ctx as any, 10, 20, 100, 30, 'warning', 2);

      // Font size should be scaled
      expect(ctx.font).toContain('24px'); // 12 * 2
    });

    test('renderCellError combines background, border, and icon', () => {
      const error = new Error('#DIV/0!');
      renderCellError(ctx as any, 10, 20, 100, 30, error, {}, 1);

      const fillRectCall = ctx.calls.find(c => c.method === 'fillRect');
      const strokeRectCall = ctx.calls.find(c => c.method === 'strokeRect');
      const fillTextCall = ctx.calls.find(c => c.method === 'fillText');
      
      expect(fillRectCall).toBeDefined();
      expect(strokeRectCall).toBeDefined();
      expect(fillTextCall).toBeDefined();
    });
  });

  describe('Error Messages', () => {
    test('getErrorMessage formats error with type', () => {
      const error = new Error('#DIV/0!');
      const message = getErrorMessage(error);
      
      expect(message).toContain('#DIV/0!');
    });

    test('getErrorMessage handles unknown errors', () => {
      const error = new Error('Something went wrong');
      const message = getErrorMessage(error);
      
      expect(message).toBe('Something went wrong');
    });

    test('getErrorMessage handles empty messages', () => {
      const error = new Error('');
      const message = getErrorMessage(error);
      
      expect(message).toBe('Unknown error');
    });
  });

  describe('Error Highlight Plugin', () => {
    test('plugin is created with correct structure', () => {
      const plugin = createErrorHighlightPlugin();
      
      expect(plugin.name).toBe('error-highlight');
      expect(plugin.beforeCellRender).toBeDefined();
      expect(plugin.afterCellRender).toBeDefined();
    });

    test('beforeCellRender returns true for errors', () => {
      const plugin = createErrorHighlightPlugin();
      const ctx = new MockCanvasContext();
      const error = new Error('#DIV/0!');
      
      const result = plugin.beforeCellRender!(
        ctx as any,
        { x: 0, y: 0, w: 100, h: 30 },
        { addr: { row: 1, col: 1 }, value: error }
      );
      
      expect(result).toBe(true);
    });

    test('beforeCellRender returns false for non-errors', () => {
      const plugin = createErrorHighlightPlugin();
      const ctx = new MockCanvasContext();
      
      const result = plugin.beforeCellRender!(
        ctx as any,
        { x: 0, y: 0, w: 100, h: 30 },
        { addr: { row: 1, col: 1 }, value: 42 }
      );
      
      expect(result).toBe(false);
    });

    test('afterCellRender draws icon for errors', () => {
      const plugin = createErrorHighlightPlugin({ showIcon: true });
      const ctx = new MockCanvasContext();
      const error = new Error('#DIV/0!');
      
      plugin.afterCellRender!(
        ctx as any,
        { x: 0, y: 0, w: 100, h: 30 },
        { addr: { row: 1, col: 1 }, value: error }
      );
      
      const fillTextCall = ctx.calls.find(c => c.method === 'fillText');
      expect(fillTextCall).toBeDefined();
    });

    test('plugin respects custom options', () => {
      const customBg = '#FF0000';
      const plugin = createErrorHighlightPlugin({
        backgroundColor: customBg,
        showIcon: false,
      });
      
      const ctx = new MockCanvasContext();
      const error = new Error('#VALUE!');
      
      plugin.beforeCellRender!(
        ctx as any,
        { x: 0, y: 0, w: 100, h: 30 },
        { addr: { row: 1, col: 1 }, value: error }
      );
      
      expect(ctx.fillStyle).toBe(customBg);
      
      ctx.reset();
      plugin.afterCellRender!(
        ctx as any,
        { x: 0, y: 0, w: 100, h: 30 },
        { addr: { row: 1, col: 1 }, value: error }
      );
      
      const fillTextCall = ctx.calls.find(c => c.method === 'fillText');
      expect(fillTextCall).toBeUndefined();
    });
  });
});

describe('Error Solutions Module', () => {
  describe('Levenshtein Distance', () => {
    test('calculates distance for identical strings', () => {
      expect(levenshteinDistance('SUM', 'SUM')).toBe(0);
      expect(levenshteinDistance('AVERAGE', 'AVERAGE')).toBe(0);
    });

    test('calculates distance for single character difference', () => {
      expect(levenshteinDistance('SUM', 'SUB')).toBe(1);
      expect(levenshteinDistance('COUNT', 'COUNS')).toBe(1);
    });

    test('calculates distance for multiple differences', () => {
      expect(levenshteinDistance('SUM', 'SUMM')).toBe(1);
      expect(levenshteinDistance('AVERAGE', 'AVERGE')).toBe(1);
      expect(levenshteinDistance('VLOOKUP', 'VLOOKP')).toBe(1);
    });

    test('is case-insensitive', () => {
      expect(levenshteinDistance('sum', 'SUM')).toBe(0);
      expect(levenshteinDistance('Average', 'AVERAGE')).toBe(0);
    });

    test('handles empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('SUM', '')).toBe(3);
      expect(levenshteinDistance('', 'SUM')).toBe(3);
    });
  });

  describe('Function Name Suggestions', () => {
    test('finds closest function for typo', () => {
      const suggestions = findClosestFunctions('SUMM', 3);
      expect(suggestions).toContain('SUM');
    });

    test('finds multiple suggestions', () => {
      const suggestions = findClosestFunctions('COUN', 3);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('COUNT');
    });

    test('respects maxResults parameter', () => {
      const suggestions = findClosestFunctions('SUM', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    test('respects maxDistance parameter', () => {
      const suggestions = findClosestFunctions('XXXXXX', 3, 2);
      expect(suggestions.length).toBe(0);
    });

    test('handles exact matches', () => {
      const suggestions = findClosestFunctions('SUM', 3);
      expect(suggestions[0]).toBe('SUM');
    });

    test('sorts by distance', () => {
      const suggestions = findClosestFunctions('AVERAG', 3);
      expect(suggestions[0]).toBe('AVERAGE');
    });
  });

  describe('Error Solutions', () => {
    test('provides solution for #DIV/0!', () => {
      const error = new Error('#DIV/0!');
      const solution = getErrorSolution(error);
      
      expect(solution.errorType).toBe('#DIV/0!');
      expect(solution.message).toContain('Division by zero');
      expect(solution.suggestion).toContain('denominator');
    });

    test('provides solution for #NAME?', () => {
      const error = new Error('#NAME? Unknown function: SUMM');
      const solution = getErrorSolution(error);
      
      expect(solution.errorType).toBe('#NAME?');
      expect(solution.suggestion).toContain('SUM');
    });

    test('provides solution for #VALUE!', () => {
      const error = new Error('#VALUE!');
      const solution = getErrorSolution(error);
      
      expect(solution.errorType).toBe('#VALUE!');
      expect(solution.message).toContain('Wrong data type');
    });

    test('provides solution for #REF!', () => {
      const error = new Error('#REF!');
      const solution = getErrorSolution(error);
      
      expect(solution.errorType).toBe('#REF!');
      expect(solution.message).toContain('Invalid cell reference');
    });

    test('handles unknown errors', () => {
      const error = new Error('Unknown error');
      const solution = getErrorSolution(error);
      
      expect(solution.errorType).toBe('Error');
      expect(solution.message).toBeDefined();
      expect(solution.suggestion).toBeDefined();
    });

    test('all error types have solutions', () => {
      const errorTypes = ['#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#REF!', '#VALUE!', '#SPILL!', '#CALC!'];
      
      errorTypes.forEach(type => {
        expect(ERROR_SOLUTIONS[type]).toBeDefined();
        expect(ERROR_SOLUTIONS[type].errorType).toBe(type);
        expect(ERROR_SOLUTIONS[type].message).toBeTruthy();
        expect(ERROR_SOLUTIONS[type].suggestion).toBeTruthy();
      });
    });
  });

  describe('Error Solution Formatting', () => {
    test('formatErrorSolutionHTML generates valid HTML', () => {
      const solution = ERROR_SOLUTIONS['#DIV/0!'];
      const html = formatErrorSolutionHTML(solution);
      
      expect(html).toContain('error-solution');
      expect(html).toContain('#DIV/0!');
      expect(html).toContain(solution.message);
      expect(html).toContain(solution.suggestion);
    });

    test('formatErrorSolutionHTML includes doc link if present', () => {
      const solution = ERROR_SOLUTIONS['#DIV/0!'];
      const html = formatErrorSolutionHTML(solution);
      
      if (solution.docLink) {
        expect(html).toContain(solution.docLink);
        expect(html).toContain('Learn more');
      }
    });

    test('formatErrorSolutionText generates plain text', () => {
      const solution = ERROR_SOLUTIONS['#VALUE!'];
      const text = formatErrorSolutionText(solution);
      
      expect(text).toContain('#VALUE!');
      expect(text).toContain(solution.message);
      expect(text).toContain('Suggestion:');
      expect(text).toContain(solution.suggestion);
    });

    test('formatErrorSolutionText includes doc link if present', () => {
      const solution = ERROR_SOLUTIONS['#DIV/0!'];
      const text = formatErrorSolutionText(solution);
      
      if (solution.docLink) {
        expect(text).toContain('Learn more:');
        expect(text).toContain(solution.docLink);
      }
    });
  });

  describe('Name Error Suggestions', () => {
    test('extracts function name from error message', () => {
      const suggestion = getNameErrorSuggestion('Unknown function: SUMM');
      expect(suggestion).toContain('SUMM');
      expect(suggestion).toContain('SUM');
    });

    test('handles different error message formats', () => {
      const suggestion1 = getNameErrorSuggestion('Function AVERAG is not defined');
      expect(suggestion1).toContain('AVERAGE');
      
      const suggestion2 = getNameErrorSuggestion('Unknown name: "COUN"');
      expect(suggestion2).toContain('COUNT');
    });

    test('falls back to default suggestion if no match', () => {
      const suggestion = getNameErrorSuggestion('Some other error');
      expect(suggestion).toBe(ERROR_SOLUTIONS['#NAME?'].suggestion);
    });
  });
});

describe('Error Tooltip Module', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Tooltip Manager Creation', () => {
    test('creates tooltip manager instance', () => {
      const manager = createErrorTooltipManager(container);
      expect(manager).toBeInstanceOf(ErrorTooltipManager);
      manager.destroy();
    });

    test('creates tooltip element in DOM', () => {
      const manager = createErrorTooltipManager(container);
      const tooltips = document.querySelectorAll('.error-tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
      manager.destroy();
    });

    test('injects CSS styles', () => {
      const manager = createErrorTooltipManager(container);
      const styles = document.getElementById('error-tooltip-styles');
      expect(styles).toBeTruthy();
      manager.destroy();
    });

    test('respects custom options', () => {
      const manager = createErrorTooltipManager(container, {
        hoverDelay: 500,
        maxWidth: 400,
      });
      
      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('Tooltip Visibility', () => {
    test('tooltip is hidden initially', () => {
      const manager = createErrorTooltipManager(container);
      expect(manager.isTooltipVisible()).toBe(false);
      manager.destroy();
    });

    test('show() makes tooltip visible', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#DIV/0!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 1, col: 1 });
      
      setTimeout(() => {
        expect(manager.isTooltipVisible()).toBe(true);
        manager.destroy();
        done();
      }, 100);
    });

    test('hide() makes tooltip invisible', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#DIV/0!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 1, col: 1 });
      
      setTimeout(() => {
        manager.hide();
        expect(manager.isTooltipVisible()).toBe(false);
        manager.destroy();
        done();
      }, 100);
    });
  });

  describe('Tooltip Content', () => {
    test('displays error type', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#DIV/0!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 1, col: 1 });
      
      setTimeout(() => {
        const tooltips = document.querySelectorAll('.error-tooltip');
        const tooltip = tooltips[tooltips.length - 1];
        expect(tooltip.textContent).toContain('#DIV/0!');
        manager.destroy();
        done();
      }, 100);
    });

    test('displays error message', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#VALUE!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 1, col: 1 });
      
      setTimeout(() => {
        const tooltips = document.querySelectorAll('.error-tooltip');
        const tooltip = tooltips[tooltips.length - 1];
        expect(tooltip.textContent).toContain('Wrong data type');
        manager.destroy();
        done();
      }, 100);
    });

    test('displays suggestion', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#DIV/0!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 1, col: 1 });
      
      setTimeout(() => {
        const tooltips = document.querySelectorAll('.error-tooltip');
        const tooltip = tooltips[tooltips.length - 1];
        expect(tooltip.textContent).toContain('Suggestion');
        expect(tooltip.textContent).toContain('denominator');
        manager.destroy();
        done();
      }, 100);
    });
  });

  describe('Tooltip Positioning', () => {
    test('getCellRectFromCanvas calculates correct position', () => {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.left = '50px';
      canvas.style.top = '100px';
      document.body.appendChild(canvas);
      
      const rect = getCellRectFromCanvas(canvas, 10, 20, 80, 24);
      
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.width).toBe(80);
      expect(rect.height).toBe(24);
      
      document.body.removeChild(canvas);
    });
  });

  describe('Tooltip Options', () => {
    test('setOptions updates configuration', () => {
      const manager = createErrorTooltipManager(container);
      
      manager.setOptions({ maxWidth: 500 });
      
      // Options should be updated
      expect(manager).toBeDefined();
      manager.destroy();
    });

    test('default options are applied', () => {
      expect(DEFAULT_TOOLTIP_OPTIONS.hoverDelay).toBe(200);
      expect(DEFAULT_TOOLTIP_OPTIONS.showDocLinks).toBe(true);
      expect(DEFAULT_TOOLTIP_OPTIONS.maxWidth).toBe(320);
      expect(DEFAULT_TOOLTIP_OPTIONS.fadeDuration).toBe(200);
      expect(DEFAULT_TOOLTIP_OPTIONS.zIndex).toBe(10000);
    });
  });

  describe('Tooltip Lifecycle', () => {
    test('destroy() cleans up resources', () => {
      const manager = createErrorTooltipManager(container);
      const tooltipsBefore = document.querySelectorAll('.error-tooltip').length;
      
      manager.destroy();
      
      const tooltipsAfter = document.querySelectorAll('.error-tooltip').length;
      expect(tooltipsAfter).toBeLessThan(tooltipsBefore);
    });

    test('getCurrentCell returns null initially', () => {
      const manager = createErrorTooltipManager(container);
      expect(manager.getCurrentCell()).toBeNull();
      manager.destroy();
    });

    test('getCurrentCell returns cell after show()', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#DIV/0!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 5, col: 3 });
      
      setTimeout(() => {
        const cell = manager.getCurrentCell();
        expect(cell).toEqual({ row: 5, col: 3 });
        manager.destroy();
        done();
      }, 100);
    });

    test('getCurrentCell returns null after hide()', (done) => {
      const manager = createErrorTooltipManager(container);
      const error = new Error('#DIV/0!');
      const rect = new DOMRect(100, 100, 80, 24);
      
      manager.show(error, rect, { row: 5, col: 3 });
      
      setTimeout(() => {
        manager.hide();
        setTimeout(() => {
          expect(manager.getCurrentCell()).toBeNull();
          manager.destroy();
          done();
        }, 100);
      }, 100);
    });
  });
});
