import type { DrawingLayer, FormControlObject, Worksheet } from '@cyber-sheet/core';
import { parseA1Reference } from './parseA1Reference';

function getControlCenter(control: FormControlObject): { x: number; y: number } {
  return {
    x: control.position.x + control.size.width / 2,
    y: control.position.y + control.size.height / 2,
  };
}

function isControlInsideGroupBox(
  control: FormControlObject,
  groupBox: FormControlObject,
): boolean {
  const { x, y } = getControlCenter(control);
  return (
    x >= groupBox.position.x &&
    x <= groupBox.position.x + groupBox.size.width &&
    y >= groupBox.position.y &&
    y <= groupBox.position.y + groupBox.size.height
  );
}

function isOptionButton(obj: unknown): obj is FormControlObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as FormControlObject).type === 'formControl' &&
    (obj as FormControlObject).controlType === 'optionButton'
  );
}

function isGroupBox(obj: unknown): obj is FormControlObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as FormControlObject).type === 'formControl' &&
    (obj as FormControlObject).controlType === 'groupBox'
  );
}

/** Sort top-to-bottom, then left-to-right for stable 1-based indices. */
function sortOptionButtons(buttons: FormControlObject[]): FormControlObject[] {
  return [...buttons].sort((a, b) => {
    const dy = a.position.y - b.position.y;
    if (Math.abs(dy) > 2) return dy;
    return a.position.x - b.position.x;
  });
}

export function findContainingGroupBox(
  control: FormControlObject,
  drawingLayer: DrawingLayer,
): FormControlObject | null {
  const containing = drawingLayer
    .getAllObjects()
    .filter(isGroupBox)
    .filter((groupBox) => isControlInsideGroupBox(control, groupBox));

  if (containing.length === 0) return null;

  return containing.reduce((best, groupBox) => {
    const bestArea = best.size.width * best.size.height;
    const groupArea = groupBox.size.width * groupBox.size.height;
    return groupArea < bestArea ? groupBox : best;
  });
}

/** All option buttons in the same radio group as `control`. */
export function getOptionButtonGroup(
  control: FormControlObject,
  drawingLayer: DrawingLayer,
): FormControlObject[] {
  const allOptionButtons = drawingLayer.getAllObjects().filter(isOptionButton);
  const groupBox = findContainingGroupBox(control, drawingLayer);

  if (groupBox) {
    return sortOptionButtons(
      allOptionButtons.filter((btn) => isControlInsideGroupBox(btn, groupBox)),
    );
  }

  return sortOptionButtons(allOptionButtons);
}

export function getOptionButtonIndexInGroup(
  control: FormControlObject,
  drawingLayer: DrawingLayer,
): number {
  const group = getOptionButtonGroup(control, drawingLayer);
  const index = group.findIndex((btn) => btn.id === control.id);
  return index >= 0 ? index + 1 : 1;
}

/** Select one option button and deselect all siblings in its group. */
export function selectOptionButtonInGroup(
  control: FormControlObject,
  drawingLayer: DrawingLayer,
  worksheet?: Worksheet,
): void {
  const group = getOptionButtonGroup(control, drawingLayer);

  group.forEach((btn, idx) => {
    const index = idx + 1;
    const isSelected = btn.id === control.id;

    drawingLayer.updateObject(btn.id, {
      controlProperties: {
        ...btn.controlProperties,
        checked: isSelected,
        selectedIndex: isSelected ? index : undefined,
      },
    } as Partial<FormControlObject>);

    if (btn.linkedCell && worksheet) {
      const addr = parseA1Reference(btn.linkedCell);
      if (addr) {
        worksheet.setCellValue(addr, isSelected ? index : false);
      }
    }
  });
}

/** Hit-test the radio circle (screen coordinates). */
export function isClickOnOptionButtonCircle(
  obj: FormControlObject,
  mx: number,
  my: number,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
): boolean {
  const x = (obj.position.x - scrollLeft) * zoom;
  const y = (obj.position.y - scrollTop) * zoom;
  const w = obj.size.width * zoom;
  const h = obj.size.height * zoom;
  const radius = Math.min(w, h) * 0.28;
  const cx = x + 2 + radius;
  const cy = y + h / 2;
  const dx = mx - cx;
  const dy = my - cy;
  return dx * dx + dy * dy <= radius * radius;
}
