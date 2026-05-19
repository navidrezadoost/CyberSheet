import type { ConditionalFormattingRule, ExcelIconSet, ValueOperator } from '@cyber-sheet/core';

/**
 * Rule type union for UI
 */
export type RuleType =
	| 'color-scale'
	| 'data-bar'
	| 'icon-set'
	| 'formula'
	| 'value'
	| 'top-bottom'
	| 'above-average'
	| 'duplicate-unique'
	| 'date-occurring'
	| 'text'
	| 'errors-blank';

/**
 * Rule Builder State
 * Framework-agnostic state for building conditional formatting rules
 */
export type RuleBuilderState = {
	// Core
	ruleType: RuleType;
	
	// Color Scale
	use3ColorScale: boolean;
	colorScaleMin: string;
	colorScaleMid: string;
	colorScaleMax: string;
	
	// Data Bar
	dataBarColor: string;
	dataBarGradient: boolean;
	dataBarShowValue: boolean;
	
	// Icon Set
	iconSet: ExcelIconSet;
	iconReverseOrder: boolean;
	iconShowIconOnly: boolean;
	
	// Formula
	formulaExpression: string;
	formulaError: string | null;
	
	// Value
	valueOperator: ValueOperator;
	valueThreshold: string;
	valueThreshold2: string;
	
	// Top/Bottom
	topBottomType: 'top' | 'bottom';
	topBottomRank: number;
	topBottomPercent: boolean;
	
	// Above/Below Average
	aboveAverageType: 'above' | 'below';
	
	// Duplicate/Unique
	duplicateUniqueType: 'duplicate' | 'unique';
	
	// Date Occurring
	dateOccurring: 'today' | 'yesterday' | 'tomorrow' | 'last-7-days' | 'this-week' | 'last-week' | 'this-month' | 'last-month';
	
	// Text
	textOperator: 'contains' | 'not-contains' | 'begins-with' | 'ends-with';
	textValue: string;
	
	// Errors/Blanks
	errorsBlankType: 'errors' | 'no-errors' | 'blanks' | 'no-blanks';
	
	// Style (applies to most rules)
	fillColor: string;
	fontColor: string;
	
	// Metadata
	description: string;
	priority: number;
	stopIfTrue: boolean;
};

/**
 * Rule Manager State
 */
export type RuleManagerState = {
	rules: ConditionalFormattingRule[];
	enabledRules: Set<string>;
	draggedIndex: number | null;
	draggedOverIndex: number | null;
};

/**
 * Validation Result
 */
export type ValidationResult = {
	valid: boolean;
	error?: string;
};

/**
 * Rule Change Event
 */
export type RuleChangeEvent = {
	type: 'add' | 'update' | 'delete' | 'reorder' | 'toggle-enabled';
	rules: ConditionalFormattingRule[];
	changedRule?: ConditionalFormattingRule;
	changedIndex?: number;
};
