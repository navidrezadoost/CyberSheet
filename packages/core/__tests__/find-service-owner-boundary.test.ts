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

  test('former private field names cannot reveal or replace FindService state', () => {
    const worksheet = new Worksheet('Private state source', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    worksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    const decoy = new Worksheet('Shadow source', 4, 4);
    decoy.setCellValue({ row: 1, col: 1 }, 'decoy');
    const service = new FindService(worksheet);
    const results = service.findAll('needle');

    for (const name of ['worksheet', 'lastResults', 'currentIndex', 'lastOptions']) {
      expect(Reflect.get(service, name)).toBeUndefined();
    }
    expect(Reflect.get(service, 'getCellValue')).toBeUndefined();
    expect(Reflect.get(service, 'getCurrentResult')).toBeUndefined();

    const shadowResults = [{ address: { row: 1, col: 2 }, value: 'shadow', match: 'shadow' }];
    Object.assign(service, {
      worksheet: decoy,
      lastResults: shadowResults,
      currentIndex: 1,
      lastOptions: { what: 'decoy', lookIn: 'formulas' },
    });
    shadowResults[0].address.col = 4;
    Reflect.set(service, 'lastResults', [{ address: { row: 1, col: 2 }, value: 'replacement shadow', match: 'replacement shadow' }]);
    Reflect.set(service, 'currentIndex', -1);

    expect(Reflect.get(service, 'worksheet')).toBe(decoy);
    expect(service.getMatchCount()).toBe(2);
    expect(service.getCurrentIndex()).toBe(1);
    expect(service.getCurrentMatch()).toMatchObject({ address: { row: 1, col: 1 }, value: 'needle' });
    expect(results[0].address).toEqual({ row: 1, col: 1 });
    expect(service.replaceCurrent('changed')).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('changed');
    expect(worksheet.getCell({ row: 1, col: 2 })?.value).toBe('needle');
    expect(decoy.getCell({ row: 1, col: 1 })?.value).toBe('decoy');
    expect(service.getMatchCount()).toBe(1);
  });

  test('a retained raw Worksheet rejects formula-sensitive search after internal adoption', () => {
    const worksheet = new CallRecordingWorksheet('Retained', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    const service = new FindService(worksheet);

    const workbookId = 'find-service-retained-owner' as WorkbookId;
    const worksheetId = worksheet.getWorksheetId() as WorksheetId;
    worksheet.calls.length = 0;
    adoptWorksheetByWorkbook(worksheet, workbookId);

    // This helper exercises the internal adoption transition. The public Workbook
    // API currently creates its own sheets and does not adopt caller Worksheets.
    expect(() => service.findAll('777')).toThrow(/cannot use an adopted Worksheet/);
    expect(worksheet.calls).toEqual([]);
    const ownerView = new OwnerBackedWorkbookSheetView(workbookId, worksheetId, () => worksheet);

    expect(() => new FindService(ownerView).findAll('777')).toThrow(/formula cached values could affect matches/);
  });

  test('all retained-result and replacement entrypoints reject before access after adoption', () => {
    const worksheet = new CallRecordingWorksheet('Retained result state', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    let events = 0;
    const dispose = worksheet.on(() => { events += 1; });
    const service = new FindService(worksheet);
    const initialResults = service.findAll('needle');
    const currentMatch = service.getCurrentMatch();
    const matchCount = service.getMatchCount();
    worksheet.calls.length = 0;

    adoptWorksheetByWorkbook(worksheet, 'find-service-retained-state-owner' as WorkbookId);

    expect(() => service.findAll('other')).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.findAll('')).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.findNext()).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.findPrevious()).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.getCurrentMatch()).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.getMatchCount()).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.getCurrentIndex()).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.replaceCurrent('changed')).toThrow(/cannot use an adopted Worksheet/);
    expect(() => service.replaceAllMatches('needle', 'changed')).toThrow(/cannot use an adopted Worksheet/);

    expect(worksheet.calls).toEqual([]);
    expect(events).toBe(0);
    expect(currentMatch).not.toBe(initialResults[0]);
    expect(currentMatch).toEqual(initialResults[0]);
    expect(matchCount).toBe(1);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
    dispose.dispose();
  });

  test('captured ownership predicate defeats a shadowed instance method', () => {
    const worksheet = new CallRecordingWorksheet('Shadowed ownership predicate', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    const service = new FindService(worksheet);
    Object.defineProperty(worksheet, 'isWorkbookOwned', {
      configurable: true,
      value: () => false,
    });
    worksheet.calls.length = 0;

    adoptWorksheetByWorkbook(worksheet, 'find-service-shadowed-owner' as WorkbookId);

    expect(worksheet.isWorkbookOwned()).toBe(false);
    expect(() => service.findAll('777')).toThrow(/cannot use an adopted Worksheet/);
    expect(worksheet.calls).toEqual([]);
  });

  test('WorkbookSheetView owner-backed comment results remain detached and formula-masked', () => {
    const worksheet = new Worksheet('Retained owner view', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    worksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    const workbookId = 'find-service-existing-owner-view' as WorkbookId;
    const worksheetId = worksheet.getWorksheetId() as WorksheetId;
    adoptWorksheetByWorkbook(worksheet, workbookId);
    const view = new OwnerBackedWorkbookSheetView(workbookId, worksheetId, () => worksheet);
    const service = new FindService(view);

    const results = service.findAll('review marker', { lookIn: 'comments' });

    expect(results).toMatchObject([
      {
        address: { row: 1, col: 1 },
        value: '',
        formula: '=700+77',
        match: 'review marker',
      },
    ]);
    expect(results[0].match).not.toContain('777');
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
    expect(service.getCurrentMatch()).not.toBe(currentMatchBefore);
    expect(service.getCurrentMatch()).toEqual(currentMatchBefore);
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

  test('retained raw replacement entrypoints reject before search, reads, or writes', () => {
    const currentWorksheet = new CallRecordingWorksheet('Retained current', 4, 4);
    currentWorksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    const currentService = new FindService(currentWorksheet);
    currentService.findAll('needle');
    const currentMatchBefore = currentService.getCurrentMatch();
    currentWorksheet.calls.length = 0;

    adoptWorksheetByWorkbook(currentWorksheet, 'find-service-retained-current-owner' as WorkbookId);

    expect(() => currentService.replaceCurrent('changed')).toThrow(/cannot use an adopted Worksheet/);
    expect(currentWorksheet.calls).toEqual([]);
    expect(currentWorksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
    // Result access is blocked too; the rejected operation did not erase the cached result.
    expect(currentMatchBefore?.value).toBe('needle');

    const allWorksheet = new CallRecordingWorksheet('Retained all', 4, 4);
    allWorksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    allWorksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    const allService = new FindService(allWorksheet);
    allService.findAll('needle');
    const allCurrentMatchBefore = allService.getCurrentMatch();
    allWorksheet.calls.length = 0;

    adoptWorksheetByWorkbook(allWorksheet, 'find-service-retained-all-owner' as WorkbookId);

    expect(() => allService.replaceAllMatches('needle', 'changed')).toThrow(/cannot use an adopted Worksheet/);
    expect(allWorksheet.calls).toEqual([]);
    expect(allWorksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
    expect(allWorksheet.getCell({ row: 1, col: 2 })?.value).toBe('needle');
    expect(allCurrentMatchBefore?.value).toBe('needle');
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

  test('mutating findAll snapshots cannot change service match count or navigation order', () => {
    const worksheet = new Worksheet('Detached findAll results', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    worksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    const service = new FindService(worksheet);

    const results = service.findAll('needle');
    expect(results).toHaveLength(2);
    results[0].value = 'changed';
    results[0].formula = '=9+9';
    results[0].match = 'changed';
    results[0].address.row = 4;
    results[0].address.col = 4;
    results.reverse();
    results.splice(0, 1);
    results.push({ address: { row: 4, col: 4 }, value: 'injected', match: 'injected' });

    expect(service.getMatchCount()).toBe(2);
    expect(service.getCurrentMatch()).toMatchObject({
      address: { row: 1, col: 1 },
      value: 'needle',
      match: 'needle',
    });
    expect(service.findNext()).toMatchObject({
      address: { row: 1, col: 2 },
      value: 'needle',
      match: 'needle',
    });
    expect(service.findNext()).toMatchObject({
      address: { row: 1, col: 1 },
      value: 'needle',
      match: 'needle',
    });
  });

  test('current and navigation results are detached, including nested addresses', () => {
    const worksheet = new Worksheet('Detached navigation results', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=needle', 123);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=needle+1', 124);
    const service = new FindService(worksheet);
    service.findAll('needle', { lookIn: 'formulas' });

    const current = service.getCurrentMatch();
    expect(current).not.toBe(service.getCurrentMatch());
    if (!current) throw new Error('Expected current match');
    current.value = 'changed';
    current.formula = '=changed';
    current.match = 'changed';
    current.address.col = 4;
    expect(service.getCurrentMatch()).toMatchObject({
      address: { row: 1, col: 1 },
      formula: '=needle',
      match: '=needle',
    });

    const next = service.findNext();
    expect(next).not.toBe(service.getCurrentMatch());
    if (!next) throw new Error('Expected next match');
    next.address.col = 4;
    next.match = 'changed next';
    expect(service.getCurrentMatch()).toMatchObject({
      address: { row: 1, col: 2 },
      formula: '=needle+1',
      match: '=needle+1',
    });

    const previous = service.findPrevious();
    expect(previous).not.toBe(service.getCurrentMatch());
    if (!previous) throw new Error('Expected previous match');
    previous.address.row = 4;
    previous.match = 'changed previous';
    expect(service.getCurrentMatch()).toMatchObject({
      address: { row: 1, col: 1 },
      formula: '=needle',
      match: '=needle',
    });
  });

  test('mutating a returned address cannot redirect standalone replacement', () => {
    const worksheet = new Worksheet('Detached replacement target', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    worksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    const service = new FindService(worksheet);

    const results = service.findAll('needle');
    results[0].address.col = 2;
    results[0].match = 'mutated';

    expect(service.replaceCurrent('changed')).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('changed');
    expect(worksheet.getCell({ row: 1, col: 2 })?.value).toBe('needle');
    expect(service.getMatchCount()).toBe(1);
  });

  test('clear resets only local search state and leaves Worksheet data intact', () => {
    const worksheet = new Worksheet('Clear local FindService state', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'needle');
    worksheet.setCellValue({ row: 1, col: 2 }, 'needle');
    const service = new FindService(worksheet);
    service.findAll('needle');

    service.clear();

    expect(service.getMatchCount()).toBe(0);
    expect(service.getCurrentIndex()).toBe(0);
    expect(service.getCurrentMatch()).toBeNull();
    expect(service.findNext()).toBeNull();
    expect(service.findPrevious()).toBeNull();
    expect(service.replaceCurrent('changed')).toBe(false);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('needle');
    expect(worksheet.getCell({ row: 1, col: 2 })?.value).toBe('needle');

    expect(service.findAll('needle')).toHaveLength(2);
    expect(service.replaceCurrent('changed')).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('changed');
  });

  test('retained raw formula and comment replacements reject before reading their targets', () => {
    const formulaCurrentWorksheet = new CallRecordingWorksheet('Retained formula current', 4, 4);
    formulaCurrentWorksheet.setCellFormula({ row: 1, col: 1 }, '=100+2', 102);
    const formulaCurrentService = new FindService(formulaCurrentWorksheet);
    const formulaOptions = { lookIn: 'formulas' as const };
    formulaCurrentService.findAll('=100+2', formulaOptions);
    const currentFormulaMatch = formulaCurrentService.getCurrentMatch();
    formulaCurrentWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(formulaCurrentWorksheet, 'find-service-formula-current-owner' as WorkbookId);

    expect(() => formulaCurrentService.replaceCurrent('=100+3')).toThrow(/cannot use an adopted Worksheet/);
    expect(formulaCurrentWorksheet.calls).toEqual([]);
    expect(formulaCurrentWorksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 102, formula: '=100+2' });
    expect(() => formulaCurrentService.getMatchCount()).toThrow(/cannot use an adopted Worksheet/);
    expect(currentFormulaMatch).toMatchObject({ address: { row: 1, col: 1 }, formula: '=100+2' });

    const formulaAllWorksheet = new CallRecordingWorksheet('Retained formula all', 4, 4);
    formulaAllWorksheet.setCellFormula({ row: 1, col: 1 }, '=100+2', 102);
    const formulaAllService = new FindService(formulaAllWorksheet);
    formulaAllService.findAll('=100+2', formulaOptions);
    const allFormulaMatch = formulaAllService.getCurrentMatch();
    formulaAllWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(formulaAllWorksheet, 'find-service-formula-all-owner' as WorkbookId);

    expect(() => formulaAllService.replaceAllMatches('=100+2', '=100+3', formulaOptions)).toThrow(/cannot use an adopted Worksheet/);
    expect(formulaAllWorksheet.calls).toEqual([]);
    expect(formulaAllWorksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 102, formula: '=100+2' });
    expect(allFormulaMatch).toMatchObject({ address: { row: 1, col: 1 }, formula: '=100+2' });
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

    expect(() => currentService.replaceCurrent('changed marker')).toThrow(/cannot use an adopted Worksheet/);
    expect(currentWorksheet.calls).toEqual([]);
    expect(currentWorksheet.getCell({ row: 1, col: 1 })?.comments?.[0].text).toBe('review marker');
    expect(currentMatch).toMatchObject({ address: { row: 1, col: 1 }, match: 'review marker' });

    const allWorksheet = new CallRecordingWorksheet('Retained comment all', 4, 4);
    allWorksheet.addComment({ row: 1, col: 1 }, { text: 'review marker', author: 'Reviewer' });
    const allService = new FindService(allWorksheet);
    allService.findAll('review marker', commentOptions);
    const allMatch = allService.getCurrentMatch();
    allWorksheet.calls.length = 0;
    adoptWorksheetByWorkbook(allWorksheet, 'find-service-comment-all-owner' as WorkbookId);

    expect(() => allService.replaceAllMatches('review marker', 'changed marker', commentOptions)).toThrow(/cannot use an adopted Worksheet/);
    expect(allWorksheet.calls).toEqual([]);
    expect(allWorksheet.getCell({ row: 1, col: 1 })?.comments?.[0].text).toBe('review marker');
    expect(allMatch).toMatchObject({ address: { row: 1, col: 1 }, match: 'review marker' });
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
