import type {
	ConditionalFormattingRule,
	TopBottomRule,
	AboveAverageRule,
	DuplicateUniqueRule,
	DateOccurringRule,
	TextRule,
	ErrorsBlankRule,
} from '@cyber-sheet/core';

/**
 * RuleDescriptionFormatter
 * 
 * Pure functions for generating human-readable rule descriptions
 * Framework-agnostic - works in Vanilla, React, Vue, Angular, Svelte
 */

/**
 * Get human-readable description for any rule type
 */
export function getRuleDescription(rule: ConditionalFormattingRule): string {
	if (rule.description) return rule.description;

	const ruleType = rule.type;

	if (ruleType === 'color-scale') {
		return 'Color Scale';
	}
	
	if (ruleType === 'data-bar') {
		return 'Data Bar';
	}
	
	if (ruleType === 'icon-set') {
		return `Icon Set (${rule.iconSet})`;
	}
	
	if (ruleType === 'formula') {
		return `Formula: ${rule.expression}`;
	}
	
	if (ruleType === 'value') {
		return `Value ${rule.operator} ${rule.value}`;
	}
	
	if (ruleType === 'top-bottom') {
		const tbRule = rule as TopBottomRule;
		return `${tbRule.mode === 'top' ? 'Top' : 'Bottom'} ${tbRule.rank}${tbRule.rankType === 'percent' ? '%' : ''}`;
	}
	
	if (ruleType === 'above-average') {
		const aaRule = rule as AboveAverageRule;
		return aaRule.mode === 'above' ? 'Above Average' : 'Below Average';
	}
	
	if (ruleType === 'duplicate-unique') {
		const duRule = rule as DuplicateUniqueRule;
		return duRule.mode === 'duplicate' ? 'Duplicate Values' : 'Unique Values';
	}
	
	if (ruleType === 'date-occurring') {
		const doRule = rule as DateOccurringRule;
		return `Date: ${doRule.timePeriod.replace(/-/g, ' ')}`;
	}
	
	if (ruleType === 'text') {
		const textRule = rule as TextRule;
		return `Text ${textRule.mode}: "${textRule.text}"`;
	}
	
	if (ruleType === 'errors-blank') {
		const ebRule = rule as ErrorsBlankRule;
		return ebRule.mode.replace(/-/g, ' ');
	}

	return 'Unknown Rule';
}

/**
 * Get rule type badge color (for UI styling)
 */
export function getRuleTypeBadgeColor(type: string): string {
	const colors: Record<string, string> = {
		'color-scale': '#4CAF50',
		'data-bar': '#2196F3',
		'icon-set': '#FF9800',
		'formula': '#9C27B0',
		'value': '#F44336',
		'top-bottom': '#E91E63',
		'above-average': '#00BCD4',
		'duplicate-unique': '#8BC34A',
		'date-occurring': '#FFC107',
		'text': '#795548',
		'errors-blank': '#607D8B',
	};
	return colors[type] || '#999';
}

/**
 * Get rule type display label
 */
export function getRuleTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		'color-scale': 'Color Scale',
		'data-bar': 'Data Bar',
		'icon-set': 'Icon Set',
		'formula': 'Formula',
		'value': 'Value',
		'top-bottom': 'Top/Bottom',
		'above-average': 'Above/Below Average',
		'duplicate-unique': 'Duplicate/Unique',
		'date-occurring': 'Date Occurring',
		'text': 'Text',
		'errors-blank': 'Errors/Blanks',
	};
	return labels[type] || type;
}
