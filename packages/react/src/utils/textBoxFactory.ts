import type { DrawingLayer, TextBoxObject } from '@cyber-sheet/core';

export type TextBoxInsertTemplate = Omit<TextBoxObject, 'id' | 'position' | 'size' | 'zIndex'>;

export const DEFAULT_TEXT_BOX_SIZE = { width: 150, height: 60 };

export function createTextBoxTemplate(): TextBoxInsertTemplate {
  return {
    type: 'textBox',
    name: 'Text Box',
    text: '',
    rotation: 0,
    locked: false,
    visible: true,
    altText: 'Text Box',
    textStyle: {
      fontFamily: 'Calibri, Segoe UI, sans-serif',
      fontSize: 11,
      color: '#000000',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      valign: 'top',
    },
    fill: { type: 'solid', color: '#FFFFFF', transparency: 0 },
    border: { color: '#000000', width: 1, style: 'solid' },
  };
}

export function createTextBoxFromTemplate(
  template: TextBoxInsertTemplate,
  x: number,
  y: number,
  width: number,
  height: number,
  drawingLayer: DrawingLayer,
): TextBoxObject {
  return {
    ...template,
    id: `textbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    position: { x, y },
    size: { width, height },
    zIndex: drawingLayer.getAllObjects().length + 1,
  };
}
