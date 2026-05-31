import type { Command } from '@cyber-sheet/core';
import type { CyberSheetAppConfig } from './appConfig';
import { getCommandEventType } from '@cyber-sheet/core';

const VALUE_EDIT_COMMANDS = new Set([
  'SetValueCommand',
  'ClearCellsCommand',
  'PasteCommand',
  'InsertCellsCommand',
  'DeleteCellsCommand',
  'InsertColumnCommand',
  'DeleteColumnCommand',
  'InsertRowCommand',
  'DeleteRowCommand',
  'SortCommand',
  'TextToColumnsCommand',
  'RemoveDuplicatesCommand',
  'SetCellComponentCommand',
  'SetHyperlinkCommand',
  'SetDataValidationCommand',
  'ClearDataValidationCommand',
  'ToggleAutoFilterCommand',
  'ClearFilterCommand',
  'SetConditionalFormattingRulesCommand',
]);

const FORMAT_COMMANDS = new Set([
  'SetStyleCommand',
  'SetRangeStyleCommand',
  'BatchSetStyleCommand',
  'MergeCellsCommand',
  'UnmergeCellsCommand',
]);

function isFormattingDescription(description?: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return lower.includes('format')
    || lower.includes('style')
    || lower.includes('table')
    || lower.includes('border')
    || lower.includes('conditional');
}

export function canExecuteCommand(config: CyberSheetAppConfig, command: Command): boolean {
  const type = getCommandEventType(command);

  if (config.allowEdit === false && VALUE_EDIT_COMMANDS.has(type)) {
    return false;
  }

  if (config.allowFormatting === false) {
    if (FORMAT_COMMANDS.has(type)) return false;
    if (type === 'BatchCommand' && isFormattingDescription(command.description)) return false;
  }

  if (config.enableComments === false && type.includes('Comment')) {
    return false;
  }

  if (config.enableCustomComponents === false && type === 'SetCellComponentCommand') {
    return false;
  }

  return true;
}

export function canUndoRedo(config: CyberSheetAppConfig): boolean {
  return config.allowEdit !== false;
}

export function canStartCellEdit(config: CyberSheetAppConfig): boolean {
  return config.allowEdit !== false;
}

export function canEditCellValue(config: CyberSheetAppConfig, value: string): boolean {
  if (config.allowEdit === false) return false;
  if (value.startsWith('=') && config.allowFormulaEdit === false) return false;
  return true;
}
