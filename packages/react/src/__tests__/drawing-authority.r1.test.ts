import { DrawingLayer, type FormControlObject } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook, Worksheet } from '../../../core/src/worksheet';
import { afterFormatControlApplied } from '../utils/formatControlApply';
import { selectOptionButtonInGroup } from '../utils/optionButtonGroup';

function optionButton(id: string, checked: boolean): FormControlObject {
  return {
    id,
    type: 'formControl',
    name: id,
    controlType: 'optionButton',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 20 },
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible: true,
    altText: '',
    controlProperties: { enabled: true, printObject: true, checked },
  };
}

describe('R1 drawing authority boundaries', () => {
  test('option selection rejects before changing drawing objects for an adopted worksheet', () => {
    const worksheet = new Worksheet('Owned', 4, 4);
    adoptWorksheetByWorkbook(worksheet, 'test-owner');
    const drawingLayer = new DrawingLayer();
    const first = optionButton('first', false);
    const second = optionButton('second', true);
    drawingLayer.addObject(first);
    drawingLayer.addObject(second);
    drawingLayer.selectObject('second');
    const selectedBefore = drawingLayer.getSelectedIds();
    const events: string[] = [];
    drawingLayer.on('changed', () => events.push('changed'));
    drawingLayer.on('selectionChanged', () => events.push('selectionChanged'));

    expect(() => selectOptionButtonInGroup(first, drawingLayer, worksheet)).toThrow(/Workbook-owned drawing mutations/);
    expect(first.controlProperties.checked).toBe(false);
    expect(second.controlProperties.checked).toBe(true);
    expect(drawingLayer.getSelectedIds()).toEqual(selectedBefore);
    expect(events).toEqual([]);
  });

  test('form-control post-apply helper rejects before reading or changing drawing state', () => {
    const worksheet = new Worksheet('Owned', 4, 4);
    adoptWorksheetByWorkbook(worksheet, 'test-owner');
    const drawingLayer = new DrawingLayer();
    const control = optionButton('control', false);
    drawingLayer.addObject(control);
    drawingLayer.selectObject('control');
    const selectedBefore = drawingLayer.getSelectedIds();
    const events: string[] = [];
    drawingLayer.on('changed', () => events.push('changed'));
    drawingLayer.on('selectionChanged', () => events.push('selectionChanged'));
    const draft = {
      value: 'checked' as const,
      optionIndex: 2,
      cellLink: '',
      threeDShading: true,
      width: 100,
      height: 20,
      lockAspectRatio: false,
      locked: false,
      lockText: false,
      positioning: 'moveNoSize' as const,
      printObject: true,
      altTitle: 'control',
      altDescription: '',
    };

    expect(() => afterFormatControlApplied('control', draft, drawingLayer, worksheet)).toThrow(/Workbook-owned drawing mutations/);
    expect(control.controlProperties.checked).toBe(false);
    expect(drawingLayer.getSelectedIds()).toEqual(selectedBefore);
    expect(events).toEqual([]);
  });

  test('option selection remains available for standalone worksheets', () => {
    const worksheet = new Worksheet('Standalone', 4, 4);
    const drawingLayer = new DrawingLayer();
    const first = optionButton('first', false);
    const second = optionButton('second', true);
    first.linkedCell = 'A1';
    second.linkedCell = 'A2';
    drawingLayer.addObject(first);
    drawingLayer.addObject(second);
    drawingLayer.selectObject('second');
    const selectedBefore = drawingLayer.getSelectedIds();
    let changedEvents = 0;
    drawingLayer.on('changed', () => { changedEvents += 1; });

    selectOptionButtonInGroup(first, drawingLayer, worksheet);

    expect(first.controlProperties.checked).toBe(true);
    expect(second.controlProperties.checked).toBe(false);
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(1);
    expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(false);
    expect(drawingLayer.getSelectedIds()).toEqual(selectedBefore);
    expect(changedEvents).toBe(2);
  });
});
