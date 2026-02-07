import { Address, CellValue, Range, CellStyle } from './types';
import { CF_COLOR_SCALES, hexToRgb, rgbToHex } from './ExcelColor';
import { StatisticalCacheManager } from './StatisticalCacheManager';

export type ValueOperator = '>' | '>=' | '<' | '<=' | '=' | '!=' | 'between' | 'notBetween' | 'contains' | 'notContains' | 'startsWith' | 'endsWith';

export type ConditionalFormattingRule =
	| ColorScaleRule
	| DataBarRule
	| IconSetRule
	| FormulaRule
	| ValueRule
	| TopBottomRule
	| AboveAverageRule
	| DuplicateUniqueRule
	| DateOccurringRule
	| TextRule
	| ErrorsBlankRule;

export type ConditionalStyle = Partial<CellStyle> & {
	/** override fill color (background) */
	fillColor?: string;
	/** override font color */
	fontColor?: string;
};

export type ConditionalFormattingResult = {
	style?: ConditionalStyle;
	/** data bar overlay information for renderers */
	dataBar?: DataBarRender;
	/** icon overlay information for renderers */
	icon?: IconRender;
	appliedRuleIds: string[];
};

export type ConditionalFormattingContext = {
	address?: Address;
	getValue?: (address: Address) => CellValue;
	valueRange?: { min: number; max: number };
};

export type RuleBase = {
	id?: string;
	priority?: number; // higher runs first
	ranges?: Range[];
	stopIfTrue?: boolean;
	description?: string;
};

export type ColorScaleRule = RuleBase & {
	type: 'color-scale';
	minColor?: string;
	midColor?: string;
	maxColor?: string;
	/** optional preset key from CF_COLOR_SCALES */
	preset?: keyof typeof CF_COLOR_SCALES;
	minValue?: number;
	midValue?: number;
	maxValue?: number;
};

export type DataBarRule = RuleBase & {
	type: 'data-bar';
	color: string;
	gradient?: boolean;
	showValue?: boolean;
	minValue?: number;
	maxValue?: number;
};

export type IconSetRule = RuleBase & {
	type: 'icon-set';
	iconSet: 'arrows' | 'traffic-lights' | 'flags' | 'stars';
	thresholds: number[]; // ascending values
	reverseOrder?: boolean;
};

export type FormulaRule = RuleBase & {
	type: 'formula';
	expression: string; // e.g. "AND(A1>10,B1<5)" evaluated via provided evaluator
	style?: ConditionalStyle;
};

export type ValueRule = RuleBase & {
	type: 'value';
	operator: ValueOperator;
	value: number | string;
	value2?: number | string; // used for between/notBetween
	style?: ConditionalStyle;
};

export type TopBottomRule = RuleBase & {
	type: 'top-bottom';
	mode: 'top' | 'bottom'; // top N or bottom N
	rankType: 'number' | 'percent'; // N items or N%
	rank: number; // e.g., 10 for top 10, or 20 for top 20%
	style?: ConditionalStyle;
};

export type AboveAverageRule = RuleBase & {
	type: 'above-average';
	mode: 'above' | 'below' | 'equal-or-above' | 'equal-or-below'; // comparison to average
	standardDeviations?: number; // optional: e.g., 1 std dev above average
	style?: ConditionalStyle;
};

export type DuplicateUniqueRule = RuleBase & {
	type: 'duplicate-unique';
	mode: 'duplicate' | 'unique';
	caseSensitive?: boolean; // default false for Excel parity
	style?: ConditionalStyle;
};

export type DateOccurringRule = RuleBase & {
	type: 'date-occurring';
	timePeriod: 'today' | 'yesterday' | 'tomorrow' | 'last-7-days' | 'last-week' | 'this-week' | 'next-week' | 'last-month' | 'this-month' | 'next-month';
	style?: ConditionalStyle;
};

export type TextRule = RuleBase & {
	type: 'text';
	mode: 'contains' | 'not-contains' | 'begins-with' | 'ends-with';
	text: string;
	caseSensitive?: boolean; // default false
	useWildcards?: boolean; // Excel-style wildcards: * (any chars), ? (single char)
	style?: ConditionalStyle;
};

export type ErrorsBlankRule = RuleBase & {
	type: 'errors-blank';
	mode: 'errors' | 'no-errors' | 'blanks' | 'no-blanks';
	style?: ConditionalStyle;
};

export type DataBarRender = {
	percent: number; // 0-1
	color: string;
	gradient?: boolean;
	showValue?: boolean;
};

export type IconRender = {
	iconSet: IconSetRule['iconSet'];
	iconIndex: number; // 0-based
	reverseOrder?: boolean;
};

export class ConditionalFormattingEngine {
	private statisticalCache: StatisticalCacheManager;

	constructor() {
		this.statisticalCache = new StatisticalCacheManager();
	}

	/**
	 * Clear statistical cache (call when data changes)
	 */
	clearCache(): void {
		this.statisticalCache.clearCache();
	}

	/**
	 * Get cache statistics for performance monitoring
	 */
	getCacheStats() {
		return this.statisticalCache.getCacheStats();
	}

	applyRules(
		value: CellValue,
		rules: ConditionalFormattingRule[],
		ctx: ConditionalFormattingContext = {},
		options?: { formulaEvaluator?: (expression: string, context: ConditionalFormattingContext & { value: CellValue }) => boolean | number | string | null }
	): ConditionalFormattingResult {
		if (!rules.length) return { appliedRuleIds: [] };

		const applicable = ctx.address
			? rules.filter(r => this.isInRange(ctx.address!, r.ranges))
			: [...rules];

		const sorted = applicable.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
		const result: ConditionalFormattingResult = { appliedRuleIds: [] };

		for (const rule of sorted) {
			const { matched, style, dataBar, icon } = this.applyRule(value, rule, ctx, options);
			if (!matched) continue;

			result.appliedRuleIds.push(rule.id ?? '');

			if (style) {
				result.style = { ...(result.style ?? {}), ...style };
				if (style.fillColor) result.style.fill = style.fillColor;
				if (style.fontColor) result.style.color = style.fontColor;
			}
			if (dataBar) result.dataBar = dataBar;
			if (icon) result.icon = icon;

			if (rule.stopIfTrue) break;
		}

		return result;
	}

	private applyRule(
		value: CellValue,
		rule: ConditionalFormattingRule,
		ctx: ConditionalFormattingContext,
		options?: { formulaEvaluator?: (expression: string, context: ConditionalFormattingContext & { value: CellValue }) => boolean | number | string | null }
	): { matched: boolean; style?: ConditionalStyle; dataBar?: DataBarRender; icon?: IconRender } {
		switch (rule.type) {
			case 'color-scale': {
				if (typeof value !== 'number') return { matched: false };
				const color = this.resolveColorScale(value, rule, ctx.valueRange);
				return { matched: true, style: { fillColor: color } };
			}
			case 'data-bar': {
				if (typeof value !== 'number') return { matched: false };
				const percent = this.computePercent(value, rule.minValue, rule.maxValue, ctx.valueRange);
				return {
					matched: true,
					dataBar: { percent, color: rule.color, gradient: rule.gradient ?? true, showValue: rule.showValue ?? true },
				};
			}
			case 'icon-set': {
				if (typeof value !== 'number') return { matched: false };
				const idx = this.pickIconIndex(value, rule.thresholds, rule.reverseOrder);
				return { matched: true, icon: { iconSet: rule.iconSet, iconIndex: idx, reverseOrder: rule.reverseOrder } };
			}
			case 'formula': {
				const evaluator = options?.formulaEvaluator;
				
				// Excel: Errors during formula evaluation → no formatting (fail gracefully)
				let res: boolean | number | string | null;
				try {
					res = evaluator?.(rule.expression, { ...ctx, value }) ?? false;
				} catch (error) {
					// Thrown errors (e.g., invalid functions, circular refs) → no match
					return { matched: false };
				}
				
				// Excel error strings are treated as false
				if (this.isExcelError(res)) {
					return { matched: false };
				}
				
				const truthy = typeof res === 'number' ? res !== 0 : !!res;
				return truthy ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'value': {
				const matched = this.evaluateValueRule(value, rule);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'top-bottom': {
				// Range-aware evaluation required - checked in batch context
				const matched = this.evaluateTopBottomRule(value, rule, ctx);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'above-average': {
				// Range-aware evaluation required - checked in batch context
				const matched = this.evaluateAboveAverageRule(value, rule, ctx);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'duplicate-unique': {
				// Range-aware evaluation required - checked in batch context
				const matched = this.evaluateDuplicateUniqueRule(value, rule, ctx);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'date-occurring': {
				const matched = this.evaluateDateOccurringRule(value, rule);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'text': {
				const matched = this.evaluateTextRule(value, rule);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
			case 'errors-blank': {
				const matched = this.evaluateErrorsBlankRule(value, rule);
				return matched ? { matched: true, style: rule.style } : { matched: false };
			}
		}
	}

	private isInRange(address: Address, ranges?: Range[]): boolean {
		if (!ranges || ranges.length === 0) return true;
		return ranges.some(r => address.row >= r.start.row && address.row <= r.end.row && address.col >= r.start.col && address.col <= r.end.col);
	}

	private resolveColorScale(value: number, rule: ColorScaleRule, range?: { min: number; max: number }): string {
		const preset = rule.preset ? (CF_COLOR_SCALES[rule.preset] as { min: string; max: string; mid?: string }) : undefined;
		const minColor = rule.minColor ?? preset?.min ?? '#F8696B';
		const maxColor = rule.maxColor ?? preset?.max ?? '#63BE7B';
		const midColor = rule.midColor ?? preset?.mid;

		const minValue = rule.minValue ?? range?.min ?? value;
		const maxValue = rule.maxValue ?? range?.max ?? value;
		const midValue = rule.midValue ?? (rule.midColor ? (minValue + maxValue) / 2 : undefined) ?? (preset?.mid ? (minValue + maxValue) / 2 : undefined);

		if (midColor != null && midValue != null) {
			if (value <= midValue) {
				const ratio = this.safeRatio(value, minValue, midValue);
				return this.interpolateColor(minColor, midColor, ratio);
			}
			const ratio = this.safeRatio(value, midValue, maxValue);
			return this.interpolateColor(midColor, maxColor, ratio);
		}

		const ratio = this.safeRatio(value, minValue, maxValue);
		return this.interpolateColor(minColor, maxColor, ratio);
	}

	private computePercent(value: number, minValue?: number, maxValue?: number, range?: { min: number; max: number }): number {
		const min = minValue ?? range?.min ?? 0;
		const max = maxValue ?? range?.max ?? 1;
		if (max === min) return 1;
		const percent = (value - min) / (max - min);
		return Math.min(1, Math.max(0, percent));
	}

	private pickIconIndex(value: number, thresholds: number[], reverse?: boolean): number {
		const sorted = [...thresholds].sort((a, b) => a - b);
		let idx = 0;
		for (let i = 0; i < sorted.length; i++) {
			if (value >= sorted[i]) idx = i;
		}
		if (reverse) idx = sorted.length - 1 - idx;
		return idx;
	}

	private evaluateValueRule(value: CellValue, rule: ValueRule): boolean {
		const { operator, value: ruleValue, value2 } = rule;
		
		// Excel-accurate type coercion for comparison operators
		// Key insight: null, undefined, empty string, and false are DISTINCT from 0
		
		// For equality operators, use Excel-accurate comparison
		if (operator === '=' || operator === '!=') {
			// Excel: null, undefined, '', false should NOT equal 0
			// Excel: boolean true should NOT equal string "true"
			// Excel: numeric strings SHOULD equal their numeric value ("0" == 0)
			const exactMatch = this.excelEquals(value, ruleValue);
			return operator === '=' ? exactMatch : !exactMatch;
		}
		
		// For text operators, convert to strings
		if (operator === 'contains' || operator === 'notContains' || operator === 'startsWith' || operator === 'endsWith') {
			if (value === null || value === undefined) return false;
			const valStr = String(value).toLowerCase();
			const targetStr = String(ruleValue).toLowerCase();
			
			switch (operator) {
				case 'contains': return valStr.includes(targetStr);
				case 'notContains': return !valStr.includes(targetStr);
				case 'startsWith': return valStr.startsWith(targetStr);
				case 'endsWith': return valStr.endsWith(targetStr);
			}
		}
		
		// For numeric operators, use Excel-accurate numeric coercion
		const asNumber = this.excelToNumber(value);
		const targetNumber = this.excelToNumber(ruleValue);
		const targetNumber2 = value2 != null ? this.excelToNumber(value2) : undefined;
		
		// If coercion failed (non-numeric values), treat as false
		if (asNumber === null || targetNumber === null) return false;

		switch (operator) {
			case '>': return asNumber > targetNumber;
			case '>=': return asNumber >= targetNumber;
			case '<': return asNumber < targetNumber;
			case '<=': return asNumber <= targetNumber;
			case 'between':
				if (targetNumber2 == null) return false;
				return asNumber >= Math.min(targetNumber, targetNumber2) && asNumber <= Math.max(targetNumber, targetNumber2);
			case 'notBetween':
				if (targetNumber2 == null) return false;
				return asNumber < Math.min(targetNumber, targetNumber2) || asNumber > Math.max(targetNumber, targetNumber2);
			default:
				return false;
		}
	}
	
	/**
	 * Check if value is an Excel error string.
	 * Excel errors: #DIV/0!, #N/A, #NAME?, #NULL!, #NUM!, #REF!, #VALUE!
	 */
	private isExcelError(value: CellValue): boolean {
		if (typeof value !== 'string') return false;
		const errorPatterns = /^#(DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!)$/i;
		return errorPatterns.test(value);
	}
	
	/**
	 * Excel-accurate equality check with numeric string coercion.
	 * null, undefined, '', false are DISTINCT from 0.
	 * boolean true is DISTINCT from string "true".
	 * Numeric strings DO equal their numeric value ("0" == 0).
	 */
	private excelEquals(a: CellValue, b: CellValue): boolean {
		// Handle null/undefined: they equal each other but nothing else
		if (a === null || a === undefined) {
			return b === null || b === undefined;
		}
		if (b === null || b === undefined) {
			return false; // a is not null/undefined, so not equal
		}
		
		// false and '' are DISTINCT from 0
		if (a === false || a === '') {
			return b === false || b === '';
		}
		if (b === false || b === '') {
			return false;
		}
		
		// Booleans only equal other booleans (true !== "true", true !== 1)
		if (typeof a === 'boolean' || typeof b === 'boolean') {
			return typeof a === 'boolean' && typeof b === 'boolean' && a === b;
		}
		
		// Check if both can be coerced to numbers (including numeric strings)
		const aNum = this.tryNumericCoercion(a);
		const bNum = this.tryNumericCoercion(b);
		
		// If both are numeric (or numeric strings), compare as numbers
		if (aNum !== null && bNum !== null) {
			return aNum === bNum;
		}
		
		// Type must match for non-numeric equality
		if (typeof a !== typeof b) {
			return false; // Different types never equal
		}
		
		// Same type comparison
		return a === b;
	}
	
	/**
	 * Try to coerce value to number, including numeric strings.
	 * Returns number if successful, null otherwise.
	 * Used for equality checks where "0" should equal 0.
	 */
	private tryNumericCoercion(value: CellValue): number | null {
		// Already a number
		if (typeof value === 'number') {
			return isNaN(value) ? null : value;
		}
		
		// true → 1 (Excel converts boolean true to 1)
		if (value === true) {
			return 1;
		}
		
		// Numeric strings
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed === '') return null; // Empty string is NOT 0
			const num = Number(trimmed);
			return isNaN(num) ? null : num;
		}
		
		// null, undefined, false, etc. are NOT numbers
		return null;
	}
	
	/**
	 * Excel-accurate strict equality check.
	 * null, undefined, '', false are DISTINCT from 0.
	 * boolean true is DISTINCT from string "true".
	 */
	private excelStrictEquals(a: CellValue, b: CellValue): boolean {
		// Handle null/undefined: they equal each other but nothing else
		if (a === null || a === undefined) {
			return b === null || b === undefined;
		}
		if (b === null || b === undefined) {
			return false; // a is not null/undefined, so not equal
		}
		
		// Type must match for equality
		if (typeof a !== typeof b) {
			return false; // Different types never equal (e.g., true !== "true", 0 !== false)
		}
		
		// Same type comparison
		if (typeof a === 'boolean' && typeof b === 'boolean') {
			return a === b;
		}
		if (typeof a === 'number' && typeof b === 'number') {
			return a === b;
		}
		if (typeof a === 'string' && typeof b === 'string') {
			return a === b;
		}
		
		// Fallback
		return a === b;
	}
	
	/**
	 * Excel-accurate numeric coercion FOR NUMERIC COMPARISONS.
	 * Returns number or null if cannot coerce.
	 * Key differences from JavaScript Number():
	 * - null → null (not 0)
	 * - undefined → null (not NaN → 0)
	 * - false → null (not 0)
	 * - true → 1
	 * - "" → 0 (Excel treats empty string as 0 in numeric comparisons)
	 * - " " → 0 (whitespace-only strings as 0)
	 * - Error strings (#DIV/0!, etc.) → null
	 */
	private excelToNumber(value: CellValue): number | null {
		// null, undefined, false: NOT numbers
		if (value === null || value === undefined || value === false) {
			return null;
		}
		
		// Empty string or whitespace-only → 0 (Excel behavior for numeric comparisons)
		if (value === '' || (typeof value === 'string' && value.trim() === '')) {
			return 0;
		}
		
		// Excel error strings: NOT numbers
		if (this.isExcelError(value)) {
			return null;
		}
		
		// true → 1 (Excel converts boolean true to 1)
		if (value === true) {
			return 1;
		}
		
		// Already a number
		if (typeof value === 'number') {
			return isNaN(value) ? null : value;
		}
		
		// String: try to parse as number
		if (typeof value === 'string') {
			// Trim whitespace
			const trimmed = value.trim();
			if (trimmed === '') return null;
			
			const num = Number(trimmed);
			return isNaN(num) ? null : num;
		}
		
		// Unknown type
		return null;
	}

	private interpolateColor(startColor: string, endColor: string, ratio: number): string {
		const [r1, g1, b1] = hexToRgb(this.normalizeHex(startColor));
		const [r2, g2, b2] = hexToRgb(this.normalizeHex(endColor));
		const r = r1 + (r2 - r1) * ratio;
		const g = g1 + (g2 - g1) * ratio;
		const b = b1 + (b2 - b1) * ratio;
		return rgbToHex(r, g, b);
	}

	private normalizeHex(color: string): string {
		if (color.startsWith('#')) return color;
		if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
		return color; // fallback to css color string
	}

	private safeRatio(value: number, min: number, max: number): number {
		if (max === min) return 1;
		const ratio = (value - min) / (max - min);
		return Math.min(1, Math.max(0, ratio));
	}

	// ============================
	// Phase 1: New Rule Evaluators
	// ============================

	/**
	 * Evaluates Top/Bottom N or Top/Bottom N% rule.
	 * Uses StatisticalCacheManager to eliminate O(n²) bottleneck.
	 * Cache computes statistics once per range, not once per cell.
	 */
	private evaluateTopBottomRule(value: CellValue, rule: TopBottomRule, ctx: ConditionalFormattingContext): boolean {
		if (typeof value !== 'number') return false;
		if (!ctx.getValue) return false;

		// Determine ranges to scan
		const ranges = rule.ranges && rule.ranges.length > 0
			? rule.ranges
			: ctx.address
			? [{ start: { row: 1, col: ctx.address.col }, end: { row: 100, col: ctx.address.col } }]
			: null;
		
		if (!ranges) return false;

		// ✅ Wave 5: Use cache to eliminate O(n²) loop
		// Get or compute statistics (cached for subsequent cells in same range)
		const stats = this.statisticalCache.getTopBottomStats(rule, ranges, ctx.getValue);

		if (stats.sortedValues.length === 0) return false;

		// ✅ Wave 5: Simple threshold comparison (no loops, no sorting)
		if (rule.mode === 'top') {
			return value >= stats.threshold;
		} else {
			return value <= stats.threshold;
		}
	}

	/**
	 * Evaluates Above/Below Average rule.
	 * Uses StatisticalCacheManager to eliminate O(n²) bottleneck.
	 * Cache computes average/stddev once per range, not once per cell.
	 */
	private evaluateAboveAverageRule(value: CellValue, rule: AboveAverageRule, ctx: ConditionalFormattingContext): boolean {
		if (typeof value !== 'number') return false;
		if (!ctx.getValue) return false;

		// Determine ranges to scan
		const ranges = rule.ranges && rule.ranges.length > 0
			? rule.ranges
			: ctx.address
			? [{ start: { row: 1, col: ctx.address.col }, end: { row: 100, col: ctx.address.col } }]
			: null;
		
		if (!ranges) return false;

		// ✅ Wave 5: Use cache to eliminate O(n²) loop
		// Get or compute statistics (cached for subsequent cells in same range)
		const stats = this.statisticalCache.getAboveAverageStats(rule, ranges, ctx.getValue);

		if (stats.values.length === 0) return false;

		// ✅ Wave 5: Simple threshold comparison (no loops, no recomputation)
		const compareValue = (rule.standardDeviations != null && rule.standardDeviations > 0 && stats.adjustedThreshold != null)
			? stats.adjustedThreshold
			: stats.average;
		
		switch (rule.mode) {
			case 'above':
				return value > compareValue;
			case 'below':
				return value < compareValue;
			case 'equal-or-above':
				return value >= compareValue;
			case 'equal-or-below':
				return value <= compareValue;
			default:
				return false;
		}
	}

	/**
	/**
	 * Evaluates Duplicate/Unique Values rule.
	 * Uses StatisticalCacheManager to eliminate O(n²) bottleneck.
	 * Cache scans range once and builds value sets, not scanning per cell.
	 */
	private evaluateDuplicateUniqueRule(value: CellValue, rule: DuplicateUniqueRule, ctx: ConditionalFormattingContext): boolean {
		if (value === null || value === undefined || value === '') return false;
		if (!ctx.getValue) return false;

		// Determine ranges to scan
		const ranges = rule.ranges && rule.ranges.length > 0
			? rule.ranges
			: ctx.address
			? [{ start: { row: 1, col: ctx.address.col }, end: { row: 100, col: ctx.address.col } }]
			: null;
		
		if (!ranges) return false;

		// ✅ Wave 5: Use cache to eliminate O(n²) loop
		// Get or compute statistics (cached for subsequent cells in same range)
		const stats = this.statisticalCache.getDuplicateUniqueStats(rule, ranges, ctx.getValue);

		const caseSensitive = rule.caseSensitive ?? false;

		// Normalize current value for comparison
		const normalizeValue = (val: CellValue): string => {
			if (val === null || val === undefined) return '';
			const str = String(val);
			return caseSensitive ? str : str.toLowerCase();
		};

		const targetNormalized = normalizeValue(value);

		// ✅ Wave 5: Simple set lookup (no loops, no scanning)
		if (rule.mode === 'duplicate') {
			return stats.duplicates.has(targetNormalized);
		} else {
			// Unique = appears in valueSet but NOT in duplicates
			return stats.valueSet.has(targetNormalized) && !stats.duplicates.has(targetNormalized);
		}
	}

	/**
	 * Evaluates Date Occurring rule.
	 * Checks if value (as Date) falls within specified time period.
	 */
	private evaluateDateOccurringRule(value: CellValue, rule: DateOccurringRule): boolean {
		// Try to parse value as Date
		let dateValue: Date;
		if (value && typeof value === 'object' && 'getTime' in value) {
			// Treat as Date object
			dateValue = value as Date;
		} else if (typeof value === 'number') {
			// Excel serial date: days since 1900-01-01 (with 1900 leap year bug)
			dateValue = this.excelSerialToDate(value);
		} else if (typeof value === 'string') {
			dateValue = new Date(value);
			if (isNaN(dateValue.getTime())) return false;
		} else {
			return false;
		}

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const valueDate = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());

		switch (rule.timePeriod) {
			case 'today':
				return valueDate.getTime() === today.getTime();
			case 'yesterday': {
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);
				return valueDate.getTime() === yesterday.getTime();
			}
			case 'tomorrow': {
				const tomorrow = new Date(today);
				tomorrow.setDate(tomorrow.getDate() + 1);
				return valueDate.getTime() === tomorrow.getTime();
			}
			case 'last-7-days': {
				const sevenDaysAgo = new Date(today);
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
				return valueDate >= sevenDaysAgo && valueDate <= today;
			}
			case 'this-week': {
				// Week starts on Sunday (Excel behavior)
				const weekStart = new Date(today);
				weekStart.setDate(today.getDate() - today.getDay());
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 6);
				return valueDate >= weekStart && valueDate <= weekEnd;
			}
			case 'last-week': {
				const lastWeekStart = new Date(today);
				lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
				const lastWeekEnd = new Date(lastWeekStart);
				lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
				return valueDate >= lastWeekStart && valueDate <= lastWeekEnd;
			}
			case 'next-week': {
				const nextWeekStart = new Date(today);
				nextWeekStart.setDate(today.getDate() - today.getDay() + 7);
				const nextWeekEnd = new Date(nextWeekStart);
				nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
				return valueDate >= nextWeekStart && valueDate <= nextWeekEnd;
			}
			case 'this-month': {
				return valueDate.getFullYear() === today.getFullYear() && valueDate.getMonth() === today.getMonth();
			}
			case 'last-month': {
				const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
				return valueDate.getFullYear() === lastMonth.getFullYear() && valueDate.getMonth() === lastMonth.getMonth();
			}
			case 'next-month': {
				const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
				return valueDate.getFullYear() === nextMonth.getFullYear() && valueDate.getMonth() === nextMonth.getMonth();
			}
			default:
				return false;
		}
	}

	/**
	 * Evaluates Text Contains/Begins/Ends rule with Excel-style wildcards.
	 * Wildcards: * = any characters, ? = single character
	 */
	private evaluateTextRule(value: CellValue, rule: TextRule): boolean {
		if (value === null || value === undefined) return false;

		const caseSensitive = rule.caseSensitive ?? false;
		const useWildcards = rule.useWildcards ?? false;

		let valueStr = String(value);
		let targetStr = rule.text;

		if (!caseSensitive) {
			valueStr = valueStr.toLowerCase();
			targetStr = targetStr.toLowerCase();
		}

		if (useWildcards) {
			// Convert Excel wildcards to regex: * → .*, ? → .
			// Escape other regex special chars
			const regexPattern = targetStr
				.replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars except * and ?
				.replace(/\*/g, '.*') // * → .*
				.replace(/\?/g, '.'); // ? → .

			const regex = new RegExp(regexPattern);

			switch (rule.mode) {
				case 'contains':
					return regex.test(valueStr);
				case 'not-contains':
					return !regex.test(valueStr);
				case 'begins-with':
					return new RegExp(`^${regexPattern}`).test(valueStr);
				case 'ends-with':
					return new RegExp(`${regexPattern}$`).test(valueStr);
				default:
					return false;
			}
		} else {
			// Simple string matching
			switch (rule.mode) {
				case 'contains':
					return valueStr.includes(targetStr);
				case 'not-contains':
					return !valueStr.includes(targetStr);
				case 'begins-with':
					return valueStr.startsWith(targetStr);
				case 'ends-with':
					return valueStr.endsWith(targetStr);
				default:
					return false;
			}
		}
	}

	/**
	 * Evaluates Errors/Blanks rule.
	 * Checks if value is error (string starting with #), blank, or not error/blank.
	 */
	private evaluateErrorsBlankRule(value: CellValue, rule: ErrorsBlankRule): boolean {
		const isBlank = value === null || value === undefined || value === '';
		const isError = typeof value === 'string' && value.startsWith('#');

		switch (rule.mode) {
			case 'errors':
				return isError;
			case 'no-errors':
				return !isError;
			case 'blanks':
				return isBlank;
			case 'no-blanks':
				return !isBlank;
			default:
				return false;
		}
	}

	/**
	 * Converts Excel serial date to JavaScript Date.
	 * Excel uses days since 1900-01-01 (with 1900 leap year bug).
	 */
	private excelSerialToDate(serial: number): Date {
		// Excel incorrectly treats 1900 as a leap year
		const baseDate = new Date(1899, 11, 30); // Dec 30, 1899
		const days = serial > 60 ? serial - 1 : serial; // Adjust for 1900 leap year bug
		return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
	}
}
