import {
  adoptWorksheetByWorkbook,
  Worksheet,
  WORKSHEET_OWNED_MUTATOR_METHODS,
} from '../src/worksheet';
import type { FormulaRule } from '../src/ConditionalFormattingEngine';

describe('conditional-formatting rule adoption alias characterization', () => {
  function createRule() {
    const worksheet = new Worksheet('CF alias seam', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'covered');

    const retainedStyle = { fillColor: '#ff0000', fontColor: '#660000' };
    const retainedRanges = [
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
    ];
    const retainedRule: FormulaRule = {
      id: 'retained-cf-rule',
      type: 'formula',
      expression: '=A1>0',
      ranges: retainedRanges,
      style: retainedStyle,
    };

    return { worksheet, retainedStyle, retainedRanges, retainedRule };
  }

  test('characterizes legacy standalone nested rule identity', () => {
    const { worksheet, retainedStyle, retainedRanges, retainedRule } = createRule();
    worksheet.setConditionalFormattingRules([retainedRule]);

    const preAdoptionRead = worksheet.getConditionalFormattingRules();
    expect(preAdoptionRead).not.toBe(worksheet.getConditionalFormattingRules());
    expect(preAdoptionRead[0]).toBe(retainedRule);
    const preAdoptionFormulaRule = preAdoptionRead[0];
    if (preAdoptionFormulaRule?.type !== 'formula') {
      throw new Error('Expected the retained conditional-formatting rule to be a formula rule');
    }
    expect(preAdoptionFormulaRule.style).toBe(retainedStyle);
    expect(preAdoptionFormulaRule.ranges).toBe(retainedRanges);
    expect(worksheet.getSpecialCells({ type: 'conditionalFormats' })).toEqual([
      { row: 1, col: 1 },
    ]);
  });

  test('retained nested rule metadata cannot mutate adopted owner state without the guarded setter', () => {
    const { worksheet, retainedStyle, retainedRanges, retainedRule } = createRule();
    worksheet.setConditionalFormattingRules([retainedRule]);

    const events: string[] = [];
    const subscription = worksheet.on((event) => events.push(event.type));
    try {
      // Internal adoption seam only: this is not a supported first-party dialog route.
      adoptWorksheetByWorkbook(worksheet, 'cf-alias-internal-seam-owner');

      expect(WORKSHEET_OWNED_MUTATOR_METHODS).toContain('setConditionalFormattingRules');
      expect(() => worksheet.setConditionalFormattingRules([retainedRule])).toThrow(/unavailable/);

      // These retained standalone references must no longer reach the owner's rule graph.
      retainedStyle.fillColor = '#00ff00';
      retainedRanges[0]!.start.col = 2;
      retainedRanges[0]!.end.col = 2;

      const adoptedRead = worksheet.getConditionalFormattingRules();
      const affectedCells = worksheet.getSpecialCells({ type: 'conditionalFormats' });
      const adoptedFormulaRule = adoptedRead[0];
      if (adoptedFormulaRule?.type !== 'formula') {
        throw new Error('Expected the adopted conditional-formatting rule to be a formula rule');
      }
      expect(events).toEqual([]);
      expect({
        fillColor: adoptedFormulaRule.style?.fillColor,
        rangeStartCol: adoptedFormulaRule.ranges?.[0]?.start.col,
        affectedCells,
      }).toEqual({
        fillColor: '#ff0000',
        rangeStartCol: 1,
        affectedCells: [{ row: 1, col: 1 }],
      });
    } finally {
      subscription.dispose();
    }
  });

  test('rejects uncloneable conditional-formatting metadata before committing adoption', () => {
    const worksheet = new Worksheet('CF adoption atomicity', 4, 4);
    let getterCalls = 0;
    const retainedStyle: NonNullable<FormulaRule['style']> = {};
    Object.defineProperty(retainedStyle, 'fillColor', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return '#ff0000';
      },
    });
    const retainedRule: FormulaRule = {
      id: 'accessor-cf-rule',
      type: 'formula',
      expression: '=A1>0',
      ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } }],
      style: retainedStyle,
    };
    worksheet.setConditionalFormattingRules([retainedRule]);
    const retainedDrawingLayer = worksheet.getDrawingLayer();

    expect(() => adoptWorksheetByWorkbook(worksheet, 'cf-alias-atomicity-owner'))
      .toThrow(/Conditional-formatting rules cannot be isolated.*accessors/);
    expect(getterCalls).toBe(0);
    expect(worksheet.isWorkbookOwned()).toBe(false);
    expect(worksheet.getDrawingLayer()).toBe(retainedDrawingLayer);
    const stillStandaloneRule = worksheet.getConditionalFormattingRules()[0];
    expect(stillStandaloneRule).toBe(retainedRule);
    if (stillStandaloneRule?.type !== 'formula') {
      throw new Error('Expected the standalone conditional-formatting rule to remain available');
    }
    expect(stillStandaloneRule.style).toBe(retainedStyle);

    worksheet.setCellValue({ row: 1, col: 1 }, 'still standalone');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('still standalone');
  });
});
