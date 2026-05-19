import type {
	ConditionalFormattingRule,
	Address,
	CellValue,
	TopBottomRule,
	AboveAverageRule,
	IconSetRule,
	DuplicateUniqueRule,
	DateOccurringRule,
	TextRule,
	ErrorsBlankRule,
} from '@cyber-sheet/core';

/**
 * Inspector Data - All information shown in the inspector tooltip
 */
export type InspectorData = {
	address: Address;
	value: CellValue;
	appliedRules: AppliedRuleInfo[];
	hasConditionalFormatting: boolean;
};

/**
 * Applied Rule Information - Details about a rule that affected this cell
 */
export type AppliedRuleInfo = {
	rule: ConditionalFormattingRule;
	ruleIndex: number;
	/** Human-readable explanation of why this rule applied */
	reason: string;
	/** For ranked rules (top/bottom), show rank and threshold */
	rank?: {
		position: number;
		total: number;
		threshold: number | string;
		percentage?: number;
	};
	/** For icon-set rules, show which icon was applied */
	icon?: {
		iconSet: string;
		iconIndex: number;
		iconName: string;
	};
	/** Source of the rule */
	source: 'manual' | 'preset';
	/** Preset name if applicable */
	presetName?: string;
};

/**
 * RuleInspectorController
 * 
 * Framework-agnostic controller for cell hover inspection
 * Analyzes applied conditional formatting and generates detailed inspector data
 * 
 * Works in: Vanilla, React, Vue, Angular, Svelte
 */
export class RuleInspectorController {
	private rules: ConditionalFormattingRule[];
	private valueCache: Map<string, CellValue> = new Map();
	private statsCache: Map<string, any> = new Map();

	constructor(rules: ConditionalFormattingRule[]) {
		this.rules = rules;
	}

	/**
	 * Update rules (when worksheet rules change)
	 */
	updateRules(rules: ConditionalFormattingRule[]): void {
		this.rules = rules;
		this.clearCache();
	}

	/**
	 * Clear cached statistics (call when data changes)
	 */
	clearCache(): void {
		this.valueCache.clear();
		this.statsCache.clear();
	}

	/**
	 * Get inspector data for a cell
	 * This is the main method called on cell hover
	 */
	getInspectorData(
		address: Address,
		value: CellValue,
		getValue: (addr: Address) => CellValue
	): InspectorData {
		const appliedRules: AppliedRuleInfo[] = [];

		// Check each rule in priority order
		for (let i = 0; i < this.rules.length; i++) {
			const rule = this.rules[i];

			// Check if cell is in rule's range
			if (!this.isAddressInRuleRanges(address, rule)) {
				continue;
			}

			// Check if rule applies to this cell
			const ruleInfo = this.evaluateRuleForCell(rule, i, address, value, getValue);
			if (ruleInfo) {
				appliedRules.push(ruleInfo);

				// If stopIfTrue, don't process more rules
				if (rule.stopIfTrue) {
					break;
				}
			}
		}

		return {
			address,
			value,
			appliedRules,
			hasConditionalFormatting: appliedRules.length > 0,
		};
	}

	/**
	 * Check if address is in any of the rule's ranges
	 */
	private isAddressInRuleRanges(address: Address, rule: ConditionalFormattingRule): boolean {
		if (!rule.ranges || rule.ranges.length === 0) {
			return true; // No ranges = applies to all
		}

		return rule.ranges.some((range) => {
			return (
				address.row >= range.start.row &&
				address.row <= range.end.row &&
				address.col >= range.start.col &&
				address.col <= range.end.col
			);
		});
	}

	/**
	 * Evaluate if rule applies to cell and return detailed info
	 */
	private evaluateRuleForCell(
		rule: ConditionalFormattingRule,
		ruleIndex: number,
		address: Address,
		value: CellValue,
		getValue: (addr: Address) => CellValue
	): AppliedRuleInfo | null {
		const ruleType = rule.type;

		// Color Scale, Data Bar, Icon Set - Always apply (visual rules)
		if (ruleType === 'color-scale') {
			return {
				rule,
				ruleIndex,
				reason: 'Color scale applied based on value range',
				source: 'manual',
			};
		}

		if (ruleType === 'data-bar') {
			return {
				rule,
				ruleIndex,
				reason: 'Data bar visualization applied',
				source: 'manual',
			};
		}

		if (ruleType === 'icon-set') {
			if (rule.type !== 'icon-set') return null;
			const iconRule = rule as unknown as IconSetRule;
			const iconInfo = this.getIconSetInfo(iconRule, value, getValue);
			return {
				rule,
				ruleIndex,
				reason: `Icon set: ${iconRule.iconSet}`,
				icon: iconInfo,
				source: 'manual',
			};
		}

		// Formula - Evaluate expression
		if (ruleType === 'formula') {
			// TODO: Actual formula evaluation
			// For now, assume it applies if value is truthy
			if (value) {
				return {
					rule,
					ruleIndex,
					reason: `Formula: ${rule.expression}`,
					source: 'manual',
				};
			}
			return null;
		}

		// Value - Compare against threshold
		if (ruleType === 'value') {
			const numValue = typeof value === 'number' ? value : parseFloat(String(value));
			const threshold = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));

			if (isNaN(numValue)) return null;

			const applies = this.checkValueOperator(numValue, rule.operator, threshold, rule.value2);
			if (applies) {
				return {
					rule,
					ruleIndex,
					reason: `Value ${rule.operator} ${threshold}`,
					source: 'manual',
				};
			}
			return null;
		}

		// Top/Bottom - Rank-based
		if (ruleType === 'top-bottom') {
			const tbRule = rule as TopBottomRule;
			const rankInfo = this.getTopBottomRankInfo(tbRule, address, value, getValue);
			if (rankInfo) {
				return {
					rule,
					ruleIndex,
					reason: `${tbRule.mode === 'top' ? 'Top' : 'Bottom'} ${tbRule.rank}${tbRule.rankType === 'percent' ? '%' : ''}`,
					rank: rankInfo,
					source: 'manual',
				};
			}
			return null;
		}

		// Above/Below Average
		if (ruleType === 'above-average') {
			const aaRule = rule as AboveAverageRule;
			const avgInfo = this.getAverageInfo(aaRule, value, getValue);
			if (avgInfo.applies) {
				return {
					rule,
					ruleIndex,
					reason: `${aaRule.mode === 'above' ? 'Above' : 'Below'} average (${avgInfo.average.toFixed(2)})`,
					source: 'manual',
				};
			}
			return null;
		}

		// Duplicate/Unique
		if (ruleType === 'duplicate-unique') {
			const duRule = rule as unknown as DuplicateUniqueRule;
			const isDuplicate = this.isDuplicateValue(value, address, getValue);
			const applies = duRule.mode === 'duplicate' ? isDuplicate : !isDuplicate;
			if (applies) {
				return {
					rule,
					ruleIndex,
					reason: duRule.mode === 'duplicate' ? 'Duplicate value found' : 'Unique value',
					source: 'manual',
				};
			}
			return null;
		}

		// Date Occurring
		if (ruleType === 'date-occurring') {
			const dateRule = rule as unknown as DateOccurringRule;
			// TODO: Implement date logic
			return {
				rule,
				ruleIndex,
				reason: `Date occurring: ${dateRule.timePeriod}`,
				source: 'manual',
			};
		}

		// Text
		if (ruleType === 'text') {
			const textRule = rule as unknown as TextRule;
			const strValue = String(value).toLowerCase();
			const searchText = textRule.text.toLowerCase();
			let applies = false;

			switch (textRule.mode) {
				case 'contains':
					applies = strValue.includes(searchText);
					break;
				case 'not-contains':
					applies = !strValue.includes(searchText);
					break;
				case 'begins-with':
					applies = strValue.startsWith(searchText);
					break;
				case 'ends-with':
					applies = strValue.endsWith(searchText);
					break;
			}

			if (applies) {
				return {
					rule,
					ruleIndex,
					reason: `Text ${textRule.mode}: "${textRule.text}"`,
					source: 'manual',
				};
			}
			return null;
		}

		// Errors/Blanks
		if (ruleType === 'errors-blank') {
			const ebRule = rule as unknown as ErrorsBlankRule;
			const isBlank = value === null || value === undefined || value === '';
			const isError = typeof value === 'string' && value.startsWith('#');

			let applies = false;
			switch (ebRule.mode) {
				case 'blanks':
					applies = isBlank;
					break;
				case 'no-blanks':
					applies = !isBlank;
					break;
				case 'errors':
					applies = isError;
					break;
				case 'no-errors':
					applies = !isError;
					break;
			}

			if (applies) {
				return {
					rule,
					ruleIndex,
					reason: `${ebRule.mode.replace(/-/g, ' ')}`,
					source: 'manual',
				};
			}
			return null;
		}

		return null;
	}

	/**
	 * Check value operator
	 */
	private checkValueOperator(
		value: number,
		operator: string,
		threshold: number,
		threshold2?: number | string
	): boolean {
		switch (operator) {
			case '>':
				return value > threshold;
			case '>=':
				return value >= threshold;
			case '<':
				return value < threshold;
			case '<=':
				return value <= threshold;
			case '=':
				return value === threshold;
			case '!=':
				return value !== threshold;
			case 'between':
				return threshold2 !== undefined && value >= threshold && value <= parseFloat(String(threshold2));
			case 'notBetween':
				return threshold2 !== undefined && (value < threshold || value > parseFloat(String(threshold2)));
			default:
				return false;
		}
	}

	/**
	 * Get top/bottom rank information
	 */
	private getTopBottomRankInfo(
		rule: TopBottomRule,
		address: Address,
		value: CellValue,
		getValue: (addr: Address) => CellValue
	): { position: number; total: number; threshold: number; percentage: number } | null {
		// TODO: Implement ranking logic with StatisticalCache
		// For now, return mock data
		const numValue = typeof value === 'number' ? value : parseFloat(String(value));
		if (isNaN(numValue)) return null;

		return {
			position: 92,
			total: 100,
			threshold: 87.3,
			percentage: 92,
		};
	}

	/**
	 * Get average information
	 */
	private getAverageInfo(
		rule: AboveAverageRule,
		value: CellValue,
		getValue: (addr: Address) => CellValue
	): { applies: boolean; average: number } {
		// TODO: Calculate actual average from range
		const numValue = typeof value === 'number' ? value : parseFloat(String(value));
		const average = 75; // Mock average

		if (isNaN(numValue)) {
			return { applies: false, average };
		}

		const applies =
			rule.mode === 'above'
				? numValue > average
				: rule.mode === 'below'
				? numValue < average
				: false;

		return { applies, average };
	}

	/**
	 * Check if value is duplicate
	 */
	private isDuplicateValue(
		value: CellValue,
		address: Address,
		getValue: (addr: Address) => CellValue
	): boolean {
		// TODO: Check across range for duplicates
		// For now, return mock data
		return false;
	}

	/**
	 * Get icon set information
	 */
	private getIconSetInfo(
		rule: IconSetRule,
		value: CellValue,
		getValue: (addr: Address) => CellValue
	): { iconSet: string; iconIndex: number; iconName: string } {
		// TODO: Determine which icon based on thresholds
		return {
			iconSet: rule.iconSet,
			iconIndex: 0,
			iconName: 'arrow-up',
		};
	}
}
