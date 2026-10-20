import { toDisplayValue } from '@cyber-sheet/core';
import type { Worksheet, ConditionalFormattingRule } from '@cyber-sheet/core';
import { ConditionalFormattingBatchEngine } from '@cyber-sheet/core';
import type { RuleInspectionDetail } from './types';

export type SelectionRange = { start: { row: number; col: number }; end: { row: number; col: number } };

export type UseConditionalFormattingInspectorOptions = {
	worksheet: Worksheet | null;
	selection: SelectionRange | null;
};

const getRuleName = (rule: ConditionalFormattingRule): string => {
	return rule.description ?? rule.type;
};

const buildRankDetail = (
	rule: ConditionalFormattingRule,
	value: number | null | undefined,
	values: number[]
): { rank?: number; total?: number } => {
	if (rule.type !== 'top-bottom' || typeof value !== 'number') {
		return {};
	}

	const sorted = [...values].sort((a, b) => (rule.mode === 'top' ? b - a : a - b));
	const rank = sorted.indexOf(value);
	if (rank === -1) return {};
	return { rank: rank + 1, total: sorted.length };
};

const collectValues = (rule: ConditionalFormattingRule, worksheet: Worksheet): number[] => {
	const values: number[] = [];
	for (const range of rule.ranges ?? []) {
		for (let row = range.start.row; row <= range.end.row; row++) {
			for (let col = range.start.col; col <= range.end.col; col++) {
				const cellValue = worksheet.getCellValue({ row, col });
				if (typeof cellValue === 'number') {
					values.push(cellValue);
				}
			}
		}
	}
	return values;
};

export const useConditionalFormattingInspector = ({
	worksheet,
	selection,
}: UseConditionalFormattingInspectorOptions): RuleInspectionDetail | null => {
	if (!worksheet || !selection) return null;

	const rules = worksheet.getConditionalFormattingRules();
	if (!rules.length) return null;

	const engine = new ConditionalFormattingBatchEngine();
	const getValue = (address: { row: number; col: number }) => toDisplayValue(worksheet.getCellValue(address));

	rules.forEach((rule, index) => {
		if (!rule.id) {
			rule.id = `rule-${index + 1}`;
		}
		engine.addRule(rule.id, rule);
	});

	const cell = selection.end;
	engine.markCellDirty(cell);
	const result = engine.evaluateCellCF(cell, { getValue });
	const appliedRuleId = result.appliedRuleIds[0];
	if (!appliedRuleId) return null;

	const appliedRule = rules.find(rule => rule.id === appliedRuleId);
	if (!appliedRule) return null;

	const targetValue = worksheet.getCellValue(cell);
	const numericValues = collectValues(appliedRule, worksheet);
	const rankDetail = buildRankDetail(appliedRule, targetValue as number | null, numericValues);

	return {
		cell,
		ruleId: appliedRuleId,
		ruleName: getRuleName(appliedRule),
		description: appliedRule.description,
		message: appliedRule.description ? `Applied rule: ${appliedRule.description}` : `Applied rule: ${appliedRule.type}`,
		...rankDetail,
	};
};
