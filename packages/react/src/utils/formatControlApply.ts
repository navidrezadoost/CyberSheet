import type { FormControlObject, Worksheet } from '@cyber-sheet/core';
import type { FormControlFormatUpdates } from '@cyber-sheet/core';
import { parseA1Reference } from './parseA1Reference';
import { getOptionButtonIndexInGroup, getOptionButtonGroup, selectOptionButtonInGroup } from './optionButtonGroup';
import type { DrawingLayer } from '@cyber-sheet/core';
import { getFormControlDefaultSize } from './formControlFactory';

/** Write the control's current value to its linked cell after format/apply. */
export function syncFormControlLinkedCell(
  control: FormControlObject,
  worksheet: Worksheet,
  drawingLayer?: DrawingLayer,
): void {
  if (!control.linkedCell) return;
  const addr = parseA1Reference(control.linkedCell);
  if (!addr) return;

  const props = control.controlProperties;

  if (control.controlType === 'checkbox') {
    if (props.mixed) return;
    worksheet.setCellValue(addr, !!props.checked);
    return;
  }

  if (control.controlType === 'optionButton') {
    if (props.checked && drawingLayer) {
      worksheet.setCellValue(addr, getOptionButtonIndexInGroup(control, drawingLayer));
    } else {
      worksheet.setCellValue(addr, false);
    }
  }
}

export function buildFormControlFormatUpdates(
  draft: FormControlDialogDraft,
): FormControlFormatUpdates {
  const positioning = draft.positioning;
  const moveWithCells = positioning !== 'none';
  const resizeWithCells = positioning === 'moveAndSize';

  return {
    linkedCell: draft.cellLink.trim() || undefined,
    size: { width: draft.width, height: draft.height },
    locked: draft.locked,
    altText: draft.altDescription || draft.altTitle || '',
    anchor: {
      moveWithCells,
      resizeWithCells,
      colOffset: 0,
      rowOffset: 0,
    },
    controlProperties: {
      checked: draft.value === 'checked',
      mixed: draft.value === 'mixed',
      threeDShading: draft.threeDShading,
      lockText: draft.lockText,
      printObject: draft.printObject,
      altTextTitle: draft.altTitle,
      altTextDescription: draft.altDescription,
      selectedIndex:
        draft.value === 'checked' && draft.optionIndex > 0 ? draft.optionIndex : undefined,
    },
  };
}

export type FormControlPositioning = 'moveAndSize' | 'moveNoSize' | 'none';

export type FormControlValueState = 'unchecked' | 'checked' | 'mixed';

export interface FormControlDialogDraft {
  value: FormControlValueState;
  optionIndex: number;
  cellLink: string;
  threeDShading: boolean;
  width: number;
  height: number;
  lockAspectRatio: boolean;
  locked: boolean;
  lockText: boolean;
  positioning: FormControlPositioning;
  printObject: boolean;
  altTitle: string;
  altDescription: string;
}

export function draftFromFormControl(
  control: FormControlObject,
  defaultSize: { width: number; height: number },
): FormControlDialogDraft {
  const anchor = control.anchor;
  let positioning: FormControlPositioning = 'moveNoSize';
  if (anchor) {
    if (!anchor.moveWithCells && !anchor.resizeWithCells) positioning = 'none';
    else if (anchor.moveWithCells && anchor.resizeWithCells) positioning = 'moveAndSize';
    else positioning = 'moveNoSize';
  }

  let value: FormControlValueState = 'unchecked';
  if (control.controlProperties.mixed) value = 'mixed';
  else if (control.controlProperties.checked) value = 'checked';

  return {
    value,
    optionIndex: control.controlProperties.selectedIndex ?? 1,
    cellLink: control.linkedCell ?? '',
    threeDShading: control.controlProperties.threeDShading ?? true,
    width: control.size.width,
    height: control.size.height,
    lockAspectRatio: false,
    locked: control.locked,
    lockText: control.controlProperties.lockText ?? false,
    positioning,
    printObject: control.controlProperties.printObject ?? true,
    altTitle: control.controlProperties.altTextTitle ?? control.name,
    altDescription: control.controlProperties.altTextDescription ?? control.altText ?? '',
  };
}

export function getDefaultSizeForReset(control: FormControlObject): { width: number; height: number } {
  return getFormControlDefaultSize(control.controlType);
}

/** Apply dialog draft after FormatFormControlCommand — syncs group + linked cells. */
export function afterFormatControlApplied(
  objectId: string,
  draft: FormControlDialogDraft,
  drawingLayer: DrawingLayer,
  worksheet?: Worksheet,
): void {
  const control = drawingLayer.getObject(objectId) as FormControlObject | undefined;
  if (!control || control.type !== 'formControl') return;

  if (control.controlType === 'optionButton') {
    const group = getOptionButtonGroup(control, drawingLayer);
    const target = group[draft.optionIndex - 1] ?? control;
    selectOptionButtonInGroup(target, drawingLayer, worksheet);
    return;
  }

  if (worksheet) {
    syncFormControlLinkedCell(
      drawingLayer.getObject(objectId) as FormControlObject,
      worksheet,
      drawingLayer,
    );
  }
}
