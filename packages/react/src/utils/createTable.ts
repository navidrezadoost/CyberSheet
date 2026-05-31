import type { CommandManager, FormattingController, Range, Worksheet } from '@cyber-sheet/core';
import { BatchCommand, ToggleAutoFilterCommand } from '@cyber-sheet/core';

export interface TableStylePreset {
  name: string;
  headerRowColor: string;
  firstRowStripedColor: string;
  secondRowStripedColor: string;
}

export const DEFAULT_INSERT_TABLE_STYLE: TableStylePreset = {
  name: 'Table Style Medium 2',
  headerRowColor: '#ED7D31',
  firstRowStripedColor: '#FCE4D6',
  secondRowStripedColor: '#FFFFFF',
};

export function applyTableFormat(
  formattingController: FormattingController,
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
  hasHeaders: boolean,
  style: TableStylePreset = DEFAULT_INSERT_TABLE_STYLE,
): void {
  const commands = [
    formattingController.createTableStyleCommand(range, {
      headerRowColor: style.headerRowColor,
      firstRowStripedColor: style.firstRowStripedColor,
      secondRowStripedColor: style.secondRowStripedColor,
      borderColor: '#BFBFBF',
    }),
  ];

  if (hasHeaders) {
    commands.push(new ToggleAutoFilterCommand(worksheet, range, true));
  }

  commandManager.execute(
    commands.length === 1
      ? commands[0]!
      : new BatchCommand(commands, 'Create Table'),
  );
}
