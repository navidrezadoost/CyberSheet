import type { DrawingLayer, FormControlObject, FormControlType } from '@cyber-sheet/core';

export type FormControlInsertTemplate = Omit<FormControlObject, 'id' | 'position' | 'size' | 'zIndex'>;

const DEFAULT_SIZES: Record<FormControlType, { width: number; height: number }> = {
  checkbox: { width: 120, height: 24 },
  button: { width: 80, height: 28 },
  comboBox: { width: 140, height: 24 },
  listBox: { width: 120, height: 80 },
  spinButton: { width: 20, height: 36 },
  scrollBar: { width: 120, height: 20 },
  optionButton: { width: 120, height: 24 },
  groupBox: { width: 160, height: 100 },
  label: { width: 120, height: 24 },
};

let checkboxCounter = 0;
let buttonCounter = 0;

function nextDefaultLabel(type: FormControlType): string {
  if (type === 'checkbox') {
    checkboxCounter += 1;
    return `Check Box ${checkboxCounter}`;
  }
  if (type === 'button') {
    buttonCounter += 1;
    return `Button ${buttonCounter}`;
  }
  if (type === 'optionButton') return 'Option Button 1';
  if (type === 'groupBox') return 'Group Box 1';
  if (type === 'label') return 'Label 1';
  return type;
}

export function createFormControlTemplate(controlType: FormControlType): FormControlInsertTemplate {
  const label = nextDefaultLabel(controlType);

  const base = {
    type: 'formControl' as const,
    name: label,
    controlType,
    rotation: 0,
    locked: false,
    visible: true,
    altText: label,
    linkedCell: undefined,
    controlProperties: {
      enabled: true,
      printObject: true,
      threeDShading: true,
    },
  };

  switch (controlType) {
    case 'checkbox':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, checked: false, label },
      };
    case 'button':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, buttonText: label },
      };
    case 'optionButton':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, checked: false, label },
      };
    case 'groupBox':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, label },
      };
    case 'label':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, label },
      };
    case 'comboBox':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, dropDownLines: 8, selectedIndex: 0 },
      };
    case 'listBox':
      return {
        ...base,
        controlProperties: { ...base.controlProperties, selectedIndex: 0 },
      };
    case 'spinButton':
    case 'scrollBar':
      return {
        ...base,
        controlProperties: {
          ...base.controlProperties,
          minValue: 0,
          maxValue: 100,
          incrementalChange: 1,
          pageChange: 5,
        },
      };
    default:
      return base;
  }
}

export function getFormControlDefaultSize(controlType: FormControlType): { width: number; height: number } {
  return DEFAULT_SIZES[controlType] ?? { width: 96, height: 24 };
}

export function createFormControlFromTemplate(
  template: FormControlInsertTemplate,
  x: number,
  y: number,
  width: number,
  height: number,
  drawingLayer: DrawingLayer,
): FormControlObject {
  return {
    ...template,
    id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    position: { x, y },
    size: { width, height },
    zIndex: drawingLayer.getAllObjects().length + 1,
  };
}
