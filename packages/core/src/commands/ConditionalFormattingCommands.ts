import type { Command } from '../CommandManager';
import type { ConditionalFormattingRule } from '../ConditionalFormattingEngine';
import type { Worksheet } from '../worksheet';

function cloneRules(rules: ConditionalFormattingRule[]): ConditionalFormattingRule[] {
  return JSON.parse(JSON.stringify(rules)) as ConditionalFormattingRule[];
}

/**
 * Replace the worksheet conditional-formatting rule list in one undo step.
 */
export class SetConditionalFormattingRulesCommand implements Command {
  description: string;
  private worksheet: Worksheet;
  private previousRules: ConditionalFormattingRule[];
  private nextRules: ConditionalFormattingRule[];

  constructor(
    worksheet: Worksheet,
    nextRules: ConditionalFormattingRule[],
    description = 'Conditional Formatting',
  ) {
    this.worksheet = worksheet;
    this.previousRules = cloneRules(worksheet.getConditionalFormattingRules());
    this.nextRules = cloneRules(nextRules);
    this.description = description;
  }

  execute(): void {
    this.worksheet.setConditionalFormattingRules(this.nextRules);
  }

  undo(): void {
    this.worksheet.setConditionalFormattingRules(this.previousRules);
  }
}
