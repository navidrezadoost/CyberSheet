import { FindService } from '../src/search/FindService';
import { OwnerBackedWorkbookSheetView } from '../src/WorkbookSheetView';
import { adoptWorksheetByWorkbook, Worksheet } from '../src/worksheet';
import type { WorkbookId, WorksheetId } from '../src/workbook-access-types';

class CallRecordingWorksheet extends Worksheet {
  readonly calls: string[] = [];

  override findAll(...args: Parameters<Worksheet['findAll']>): ReturnType<Worksheet['findAll']> {
    this.calls.push('findAll');
    return super.findAll(...args);
  }

  override getCell(...args: Parameters<Worksheet['getCell']>): ReturnType<Worksheet['getCell']> {
    this.calls.push('getCell');
    return super.getCell(...args);
  }

  override setCellFormula(...args: Parameters<Worksheet['setCellFormula']>): ReturnType<Worksheet['setCellFormula']> {
    this.calls.push('setCellFormula');
    return super.setCellFormula(...args);
  }

  override setCellValue(...args: Parameters<Worksheet['setCellValue']>): ReturnType<Worksheet['setCellValue']> {
    this.calls.push('setCellValue');
    return super.setCellValue(...args);
  }

  override updateComment(...args: Parameters<Worksheet['updateComment']>): ReturnType<Worksheet['updateComment']> {
    this.calls.push('updateComment');
    return super.updateComment(...args);
  }
}

describe('FindService Workbook ownership boundary characterization', () => {
  test('comment search returns detached comment text without exposing a formula cached value', () => {
    const worksheet = new Worksheet('Comments', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    worksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });

    const workbookId = 'find-service-comments-owner' as WorkbookId;
    const worksheetId = worksheet.getWorksheetId() as WorksheetId;
    adoptWorksheetByWorkbook(worksheet, workbookId);
    const view = new OwnerBackedWorkbookSheetView(workbookId, worksheetId, () => worksheet);
    const service = new FindService(view);

    const results = service.findAll('review marker', { lookIn: 'comments' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      address: { row: 1, col: 1 },
      value: '',
      formula: '=700+77',
      match: 'review marker',
    });
    expect(results[0].match).not.toContain('777');
    expect(service.findAll('777', { lookIn: 'comments' })).toEqual([]);
  });

  test('a retained standalone Worksheet reference still exposes cached formula values after internal adoption', () => {
    const worksheet = new Worksheet('Retained', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    const service = new FindService(worksheet);

    const workbookId = 'find-service-retained-owner' as WorkbookId;
    const worksheetId = worksheet.getWorksheetId() as WorksheetId;
    adoptWorksheetByWorkbook(worksheet, workbookId);

    // This helper exercises the internal adoption transition. The public Workbook
    // API currently creates its own sheets and does not adopt caller Worksheets.
    const results = service.findAll('777');
    const ownerView = new OwnerBackedWorkbookSheetView(workbookId, worksheetId, () => worksheet);

    expect(results).toMatchObject([
      {
        address: { row: 1, col: 1 },
        value: '777',
        formula: '=700+77',
        match: '777',
      },
    ]);
    expect(() => new FindService(ownerView).findAll('777')).toThrow(/formula cached values could affect matches/);
  });

  test('WorkbookSheetView rejects both replacement entry points before search, read, or write', () => {
    const worksheet = new Worksheet('Owned replacement', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    const workbookId = 'find-service-replacement-owner' as WorkbookId;
    const worksheetId = worksheet.getWorksheetId() as WorksheetId;
    adoptWorksheetByWorkbook(worksheet, workbookId);
    const view = new OwnerBackedWorkbookSheetView(workbookId, worksheetId, () => worksheet);
    const observedCalls: string[] = [];
    const observedView = new Proxy(view, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          observedCalls.push(String(property));
          return Reflect.apply(value, target, args);
        };
      },
    });
    const service = new FindService(observedView);
    service.findAll('needle');
    observedCalls.length = 0;
    const currentMatchBefore = service.getCurrentMatch();
    const currentIndexBefore = service.getCurrentIndex();

    expect(() => service.replaceCurrent('changed')).toThrow(/Workbook-owned replace is unavailable/);
    expect(() => service.replaceAllMatches('needle', 'changed')).toThrow(/Workbook-owned replace is unavailable/);

    expect(observedCalls).toEqual([]);
    expect(service.getMatchCount()).toBe(1);
    expect(service.getCurrentMatch()).toBe(currentMatchBefore);
    expect(service.getCurrentIndex()).toBe(currentIndexBefore);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
  });

  test('WorkbookSheetView rejects formula and comment replacements before invoking view methods', () => {
    const worksheet = new Worksheet('Owned formula and comment replacement', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    worksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    const workbookId = 'find-service-formula-comment-owner' as WorkbookId;
    const worksheetId = worksheet.getWorksheetId() as WorksheetId;
    adoptWorksheetByWorkbook(worksheet, workbookId);
    const view = new OwnerBackedWorkbookSheetView(workbookId, worksheetId, () => worksheet);
    const observedCalls: string[] = [];
    const observedView = new Proxy(view, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          observedCalls.push(String(property));
          return Reflect.apply(value, target, args);
        };
      },
    });

    const formulaService = new FindService(observedView);
    const formulaOptions = { lookIn: 'formulas' as const };
    formulaService.findAll('=700+77', formulaOptions);
    observedCalls.length = 0;
    expect(() => formulaService.replaceCurrent('=700+78')).toThrow(/Workbook-owned replace is unavailable/);
    expect(observedCalls).toEqual([]);
    observedCalls.length = 0;
    expect(() => formulaService.replaceAllMatches('=700+77', '=700+78', formulaOptions)).toThrow(/Workbook-owned replace is unavailable/);
    expect(observedCalls).toEqual([]);

    const commentService = new FindService(observedView);
    const commentOptions = { lookIn: 'comments' as const };
    commentService.findAll('review marker', commentOptions);
    observedCalls.length = 0;
    expect(() => commentService.replaceCurrent('changed marker')).toThrow(/Workbook-owned replace is unavailable/);
    expect(observedCalls).toEqual([]);
    observedCalls.length = 0;
    expect(() => commentService.replaceAllMatches('review marker', 'changed marker', commentOptions)).toThrow(/Workbook-owned replace is unavailable/);
    expect(observedCalls).toEqual([]);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 777, formula: '=700+77' });
    expect(worksheet.getCell({ row: 1, col: 1 })?.comments?.[0].text).toBe('review marker');
  });

  test('a retained raw Worksheet replacement reads or searches before the guarded write rejects', () => {
    const currentWorksheet = new Worksheet('Retained current', 4, 4);
    currentWorksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    const currentService = new FindService(currentWorksheet);
    currentService.findAll('needle');
    const currentMatchBefore = currentService.getCurrentMatch();

    adoptWorksheetByWorkbook(currentWorksheet, 'find-service-retained-current-owner' as WorkbookId);

    expect(() => currentService.replaceCurrent('changed')).toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(currentWorksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
    expect(currentService.getMatchCount()).toBe(1);
    expect(currentService.getCurrentMatch()).toBe(currentMatchBefore);

    const allWorksheet = new Worksheet('Retained all', 4, 4);
    allWorksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    allWorksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    const allService = new FindService(allWorksheet);
    allService.findAll('needle');
    const allCurrentMatchBefore = allService.getCurrentMatch();

    adoptWorksheetByWorkbook(allWorksheet, 'find-service-retained-all-owner' as WorkbookId);

    expect(() => allService.replaceAllMatches('needle', 'changed')).toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(allWorksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
    expect(allWorksheet.getCell({ row: 1, col: 2 })?.value).toBe('needle');
    expect(allService.getMatchCount()).toBe(2);
    expect(allService.getCurrentMatch()).toBe(allCurrentMatchBefore);
  });

  test('standalone Worksheet replacement remains functional for current and all matches', () => {
    const worksheet = new Worksheet('Standalone replacement', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    worksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    worksheet.setCellValue({ row: 1, col: 3 }, 'needle');
    const service = new FindService(worksheet);

    service.findAll('needle');
    expect(service.replaceCurrent('current')).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('current');

    expect(service.replaceAllMatches('needle', 'all')).toBe(2);
    expect(worksheet.getCell({ row: 1, col: 2 })?.value).toBe('all');
    expect(worksheet.getCell({ row: 1, col: 3 })?.value).toBe('all');
    expect(service.getMatchCount()).toBe(0);
  });

  test('retained raw formula and comment replacements read their targets before guarded writes reject', () => {
    const formulaCurrentWorksheet = new CallRecordingWorksheet('Retained formula current', 4, 4);
    formulaCurrentWorksheet.setCellFormula({ row: 1, col: 1 }, '=100+2', 102);
    const formulaCurrentService = new FindService(formulaCurrentWorksheet);
    const formulaOptions = { lookIn: 'formulas' as const };
    formulaCurrentService.findAll('=100+2', formulaOptions);
    const currentFormulaMatch = formulaCurrentService.getCurrentMatch();
    formulaCurrentWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(formulaCurrentWorksheet, 'find-service-formula-current-owner' as WorkbookId);

    expect(() => formulaCurrentService.replaceCurrent('=100+3')).toThrow(/Workbook-owned Worksheet\.setCellFormula is unavailable/);
    expect(formulaCurrentWorksheet.calls).toEqual(['getCell', 'setCellFormula']);
    expect(formulaCurrentWorksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 102, formula: '=100+2' });
    expect(formulaCurrentService.getCurrentMatch()).toBe(currentFormulaMatch);

    const formulaAllWorksheet = new CallRecordingWorksheet('Retained formula all', 4, 4);
    formulaAllWorksheet.setCellFormula({ row: 1, col: 1 }, '=100+2', 102);
    const formulaAllService = new FindService(formulaAllWorksheet);
    formulaAllService.findAll('=100+2', formulaOptions);
    const allFormulaMatch = formulaAllService.getCurrentMatch();
    formulaAllWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(formulaAllWorksheet, 'find-service-formula-all-owner' as WorkbookId);

    expect(() => formulaAllService.replaceAllMatches('=100+2', '=100+3', formulaOptions)).toThrow(/Workbook-owned Worksheet\.setCellFormula is unavailable/);
    expect(formulaAllWorksheet.calls).toEqual(['findAll', 'getCell', 'setCellFormula']);
    expect(formulaAllWorksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 102, formula: '=100+2' });
    expect(formulaAllService.getCurrentMatch()).toBe(allFormulaMatch);
  });

  test('retained raw comment replacements read their targets before guarded updates reject', () => {
    const currentWorksheet = new CallRecordingWorksheet('Retained comment current', 4, 4);
    currentWorksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    const currentService = new FindService(currentWorksheet);
    const commentOptions = { lookIn: 'comments' as const };
    currentService.findAll('review marker', commentOptions);
    const currentMatch = currentService.getCurrentMatch();
    currentWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(currentWorksheet, 'find-service-comment-current-owner' as WorkbookId);

    expect(() => currentService.replaceCurrent('changed marker')).toThrow(/Workbook-owned Worksheet\.updateComment is unavailable/);
    expect(currentWorksheet.calls).toEqual(['getCell', 'updateComment']);
    expect(currentWorksheet.getCell({ row: 1, col: 1 })?.comments?.[0].text).toBe('review marker');
    expect(currentService.getCurrentMatch()).toBe(currentMatch);

    const allWorksheet = new CallRecordingWorksheet('Retained comment all', 4, 4);
    allWorksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    const allService = new FindService(allWorksheet);
    allService.findAll('review marker', commentOptions);
    const allMatch = allService.getCurrentMatch();
    allWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(allWorksheet, 'find-service-comment-all-owner' as WorkbookId);

    expect(() => allService.replaceAllMatches('review marker', 'changed marker', commentOptions)).toThrow(/Workbook-owned Worksheet\.updateComment is unavailable/);
    expect(allWorksheet.calls).toEqual(['findAll', 'getCell', 'updateComment']);
    expect(allWorksheet.getCell({ row: 1, col: 1 })?.comments?.[0].text).toBe('review marker');
    expect(allService.getCurrentMatch()).toBe(allMatch);
  });

  test('standalone formula and comment replacement modes remain functional', () => {
    const formulaWorksheet = new Worksheet('Standalone formula replacement', 4, 4);
    formulaWorksheet.setCellFormula({ row: 1, col: 1 }, '=1+2', 3);
    const formulaService = new FindService(formulaWorksheet);
    const formulaOptions = { lookIn: 'formulas' as const };
    formulaService.findAll('=1+2', formulaOptions);
    expect(formulaService.replaceCurrent('=1+3')).toBe(true);
    expect(formulaWorksheet.getCell({ row: 1, col: 1 })).toMatchObject({ formula: '=1+3', value: 3 });
    formulaWorksheet.setCellFormula({ row: 2, col: 1 }, '=1+2', 3);
    expect(formulaService.replaceAllMatches('=1+2', '=1+4', formulaOptions)).toBe(1);
    expect(formulaWorksheet.getCell({ row: 2, col: 1 })).toMatchObject({ formula: '=1+4', value: 3 });

    const commentWorksheet = new Worksheet('Standalone comment replacement', 4, 4);
    commentWorksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    const commentService = new FindService(commentWorksheet);
    const commentOptions = { lookIn: 'comments' as const };
    commentService.findAll('review marker', commentOptions);
    expect(commentService.replaceCurrent('current marker')).toBe(true);
    expect(commentWorksheet.getCell({ row: 1, col: 1 })?.comments?.[0].text).toBe('current marker');
    commentWorksheet.addComment({ row: 2, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    expect(commentService.replaceAllMatches('review marker', 'all marker', commentOptions)).toBe(1);
    expect(commentWorksheet.getCell({ row: 2, col: 1 })?.comments?.[0].text).toBe('all marker');
  });
});
