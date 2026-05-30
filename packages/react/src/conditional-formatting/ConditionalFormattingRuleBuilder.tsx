import React, { useState } from 'react';
import type { ConditionalFormattingRule, ValueOperator, ExcelIconSet } from '@cyber-sheet/core';
import type { Range } from '@cyber-sheet/core';
import { SmilodonNativeSelect } from '../components/SmilodonNativeSelect';

type ChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
type CheckboxChangeEvent = React.ChangeEvent<HTMLInputElement>;

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

export type ConditionalFormattingRuleBuilderProps = {
	/** Current rule being edited (null for new rule) */
	rule?: ConditionalFormattingRule | null;
	/** Selected range for the rule */
	selectedRange?: Range | null;
	/** Callback when rule is saved */
	onSave: (rule: ConditionalFormattingRule) => void;
	/** Callback when editing is cancelled */
	onCancel?: () => void;
	/** Enable live preview (triggers onChange on every edit) */
	livePreview?: boolean;
	/** Callback for live preview updates */
	onPreview?: (rule: ConditionalFormattingRule) => void;
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
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

const ICON_SETS: ExcelIconSet[] = [
	'3-arrows',
	'3-arrows-gray',
	'3-triangles',
	'3-traffic-lights',
	'3-traffic-lights-rimmed',
	'3-signs',
	'3-symbols-circled',
	'3-symbols',
	'3-flags',
	'3-stars',
	'4-arrows',
	'4-arrows-gray',
	'4-traffic-lights',
	'4-ratings',
	'5-arrows',
	'5-arrows-gray',
	'5-quarters',
	'5-ratings',
	'5-boxes',
];

const VALUE_OPERATORS: ValueOperator[] = [
	'>',
	'>=',
	'<',
	'<=',
	'=',
	'!=',
	'between',
	'notBetween',
];

/**
 * ConditionalFormattingRuleBuilder
 * 
 * Comprehensive UI for creating/editing all Excel CF rule types.
 * Supports all 11 rule types with Excel-complete options.
 * 
 * Week 1, Day 1-2: Rule Builder UI implementation
 */
export const ConditionalFormattingRuleBuilder: React.FC<ConditionalFormattingRuleBuilderProps> = ({
	rule,
	selectedRange,
	onSave,
	onCancel,
	livePreview = false,
	onPreview,
}) => {
	// Rule type selection
	const [ruleType, setRuleType] = useState<RuleType>(rule?.type || 'color-scale');

	// Color Scale state
	const [use3ColorScale, setUse3ColorScale] = useState(true);
	const [colorScaleMin, setColorScaleMin] = useState('#FF0000');
	const [colorScaleMid, setColorScaleMid] = useState('#FFFF00');
	const [colorScaleMax, setColorScaleMax] = useState('#00FF00');

	// Data Bar state
	const [dataBarColor, setDataBarColor] = useState('#638EC6');
	const [dataBarGradient, setDataBarGradient] = useState(true);
	const [dataBarShowValue, setDataBarShowValue] = useState(true);

	// Icon Set state
	const [iconSet, setIconSet] = useState<ExcelIconSet>('3-arrows');
	const [iconReverseOrder, setIconReverseOrder] = useState(false);
	const [iconShowIconOnly, setIconShowIconOnly] = useState(false);

	// Formula state
	const [formulaExpression, setFormulaExpression] = useState('');
	const [formulaError, setFormulaError] = useState<string | null>(null);

	// Value state
	const [valueOperator, setValueOperator] = useState<ValueOperator>('>');
	const [valueThreshold, setValueThreshold] = useState('');
	const [valueThreshold2, setValueThreshold2] = useState(''); // for between/notBetween

	// Top/Bottom state
	const [topBottomType, setTopBottomType] = useState<'top' | 'bottom'>('top');
	const [topBottomRank, setTopBottomRank] = useState(10);
	const [topBottomPercent, setTopBottomPercent] = useState(false);

	// Above/Below Average state
	const [aboveAverageType, setAboveAverageType] = useState<'above' | 'below'>('above');

	// Duplicate/Unique state
	const [duplicateUniqueType, setDuplicateUniqueType] = useState<'duplicate' | 'unique'>('duplicate');

	// Date Occurring state
	const [dateOccurring, setDateOccurring] = useState<'today' | 'yesterday' | 'tomorrow' | 'last-7-days' | 'this-week' | 'last-week' | 'this-month' | 'last-month'>('today');

	// Text state
	const [textOperator, setTextOperator] = useState<'contains' | 'not-contains' | 'begins-with' | 'ends-with'>('contains');
	const [textValue, setTextValue] = useState('');

	// Errors/Blanks state
	const [errorsBlankType, setErrorsBlankType] = useState<'errors' | 'no-errors' | 'blanks' | 'no-blanks'>('errors');

	// Style (applies to most rules)
	const [fillColor, setFillColor] = useState('#FFEB9C');
	const [fontColor, setFontColor] = useState('#9C6500');

	// Metadata
	const [description, setDescription] = useState('');
	const [priority, setPriority] = useState(1);
	const [stopIfTrue, setStopIfTrue] = useState(false);

	/**
	 * Validate formula expression (basic check)
	 * In production, this would call the formula engine validator
	 */
	const validateFormula = (expr: string): string | null => {
		if (!expr.trim()) return 'Formula cannot be empty';
		if (!expr.startsWith('=')) return 'Formula must start with =';
		// TODO: Call real formula validator from @cyber-sheet/core
		return null;
	};

	/**
	 * Handle formula input with validation
	 */
	const handleFormulaChange = (value: string) => {
		setFormulaExpression(value);
		const error = validateFormula(value);
		setFormulaError(error);
		if (!error && livePreview && onPreview) {
			// Trigger preview if valid
		}
	};

	/**
	 * Build ConditionalFormattingRule from current state
	 */
	const buildRule = (): ConditionalFormattingRule => {
		const baseRule = {
			id: rule?.id || `rule-${Date.now()}`,
			type: ruleType,
			priority,
			stopIfTrue,
			description,
		};

		switch (ruleType) {
			case 'color-scale':
				return {
					...baseRule,
					type: 'color-scale',
					minColor: colorScaleMin,
					midColor: use3ColorScale ? colorScaleMid : undefined,
					maxColor: colorScaleMax,
				};

			case 'data-bar':
				return {
					...baseRule,
					type: 'data-bar',
					color: dataBarColor,
					gradient: dataBarGradient,
					showValue: dataBarShowValue,
				};

			case 'icon-set':
				return {
					...baseRule,
					type: 'icon-set',
					iconSet,
					thresholds: [], // TODO: Add threshold configuration UI in Day 2
					reverseOrder: iconReverseOrder,
					showIconOnly: iconShowIconOnly,
				};

			case 'formula':
				return {
					...baseRule,
					type: 'formula',
					expression: formulaExpression,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'value':
				return {
					...baseRule,
					type: 'value',
					operator: valueOperator,
					value: parseFloat(valueThreshold),
					value2: ['between', 'notBetween'].includes(valueOperator) ? parseFloat(valueThreshold2) : undefined,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'top-bottom':
				return {
					...baseRule,
					type: 'top-bottom',
					mode: topBottomType,
					rankType: topBottomPercent ? 'percent' : 'number',
					rank: topBottomRank,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'above-average':
				return {
					...baseRule,
					type: 'above-average',
					mode: aboveAverageType,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'duplicate-unique':
				return {
					...baseRule,
					type: 'duplicate-unique',
					mode: duplicateUniqueType,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'date-occurring':
				return {
					...baseRule,
					type: 'date-occurring',
					timePeriod: dateOccurring,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'text':
				return {
					...baseRule,
					type: 'text',
					mode: textOperator,
					text: textValue,
					style: {
						fillColor,
						fontColor,
					},
				};

			case 'errors-blank':
				return {
					...baseRule,
					type: 'errors-blank',
					mode: errorsBlankType,
					style: {
						fillColor,
						fontColor,
					},
				};

			default:
				throw new Error(`Unknown rule type: ${ruleType}`);
		}
	};

	/**
	 * Handle save action
	 */
	const handleSave = () => {
		const builtRule = buildRule();
		onSave(builtRule);
	};

	/**
	 * Render type-specific form based on ruleType
	 */
	const renderTypeSpecificForm = () => {
		switch (ruleType) {
			case 'color-scale':
				return (
					<div className="cf-rule-form">
						<h3>Color Scale Settings</h3>
						
						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={use3ColorScale}
									onChange={(e: CheckboxChangeEvent) => setUse3ColorScale(e.target.checked)}
								/>
								Use 3-Color Scale
							</label>
						</div>

						<div className="form-group">
							<label>Minimum Color</label>
							<input
								type="color"
								value={colorScaleMin}
								onChange={(e: ChangeEvent) => setColorScaleMin(e.target.value)}
							/>
						</div>

						{use3ColorScale && (
							<div className="form-group">
								<label>Midpoint Color</label>
								<input
									type="color"
									value={colorScaleMid}
									onChange={(e: ChangeEvent) => setColorScaleMid(e.target.value)}
								/>
							</div>
						)}

						<div className="form-group">
							<label>Maximum Color</label>
							<input
								type="color"
								value={colorScaleMax}
								onChange={(e: ChangeEvent) => setColorScaleMax(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'data-bar':
				return (
					<div className="cf-rule-form">
						<h3>Data Bar Settings</h3>

						<div className="form-group">
							<label>Bar Color</label>
							<input
								type="color"
								value={dataBarColor}
								onChange={(e: ChangeEvent) => setDataBarColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={dataBarGradient}
									onChange={(e: CheckboxChangeEvent) => setDataBarGradient(e.target.checked)}
								/>
								Gradient Fill
							</label>
						</div>

						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={dataBarShowValue}
									onChange={(e: CheckboxChangeEvent) => setDataBarShowValue(e.target.checked)}
								/>
								Show Value
							</label>
						</div>
					</div>
				);

			case 'icon-set':
				return (
					<div className="cf-rule-form">
						<h3>Icon Set Settings</h3>

						<div className="form-group">
							<label>Icon Set</label>
							<SmilodonNativeSelect
								value={iconSet}
								onChange={(e: ChangeEvent) => setIconSet(e.target.value as ExcelIconSet)}
							>
								{ICON_SETS.map((set) => (
									<option key={set} value={set}>
										{set}
									</option>
								))}
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={iconReverseOrder}
									onChange={(e: CheckboxChangeEvent) => setIconReverseOrder(e.target.checked)}
								/>
								Reverse Icon Order
							</label>
						</div>

						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={iconShowIconOnly}
									onChange={(e: CheckboxChangeEvent) => setIconShowIconOnly(e.target.checked)}
								/>
								Show Icon Only
							</label>
						</div>
					</div>
				);

			case 'formula':
				return (
					<div className="cf-rule-form">
						<h3>Formula Settings</h3>

						<div className="form-group">
							<label>Formula Expression</label>
							<textarea
								value={formulaExpression}
								onChange={(e: ChangeEvent) => handleFormulaChange(e.target.value)}
								placeholder="=A1>100"
								rows={3}
								style={{ fontFamily: 'monospace' }}
							/>
							{formulaError && <span className="error">{formulaError}</span>}
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'value':
				return (
					<div className="cf-rule-form">
						<h3>Value Settings</h3>

						<div className="form-group">
							<label>Operator</label>
							<SmilodonNativeSelect
								value={valueOperator}
								onChange={(e: ChangeEvent) => setValueOperator(e.target.value as ValueOperator)}
							>
								{VALUE_OPERATORS.map((op) => (
									<option key={op} value={op}>
										{op.replace(/-/g, ' ')}
									</option>
								))}
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Value</label>
							<input
								type="number"
								value={valueThreshold}
								onChange={(e: ChangeEvent) => setValueThreshold(e.target.value)}
								placeholder="100"
							/>
						</div>

						{['between', 'not-between'].includes(valueOperator) && (
							<div className="form-group">
								<label>Value 2</label>
								<input
									type="number"
									value={valueThreshold2}
									onChange={(e: ChangeEvent) => setValueThreshold2(e.target.value)}
									placeholder="200"
								/>
							</div>
						)}

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'top-bottom':
				return (
					<div className="cf-rule-form">
						<h3>Top/Bottom Settings</h3>

						<div className="form-group">
							<label>Type</label>
							<SmilodonNativeSelect
								value={topBottomType}
								onChange={(e: ChangeEvent) => setTopBottomType(e.target.value as 'top' | 'bottom')}
							>
								<option value="top">Top</option>
								<option value="bottom">Bottom</option>
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Rank</label>
							<input
								type="number"
								value={topBottomRank}
								onChange={(e: ChangeEvent) => setTopBottomRank(parseInt(e.target.value, 10))}
								min={1}
							/>
						</div>

						<div className="form-group">
							<label>
								<input
									type="checkbox"
									checked={topBottomPercent}
									onChange={(e: CheckboxChangeEvent) => setTopBottomPercent(e.target.checked)}
								/>
								Percent
							</label>
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'above-average':
				return (
					<div className="cf-rule-form">
						<h3>Above/Below Average Settings</h3>

						<div className="form-group">
							<label>Type</label>
							<SmilodonNativeSelect
								value={aboveAverageType}
								onChange={(e: ChangeEvent) => setAboveAverageType(e.target.value as 'above' | 'below')}
							>
								<option value="above">Above Average</option>
								<option value="below">Below Average</option>
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'duplicate-unique':
				return (
					<div className="cf-rule-form">
						<h3>Duplicate/Unique Settings</h3>

						<div className="form-group">
							<label>Type</label>
							<SmilodonNativeSelect
								value={duplicateUniqueType}
								onChange={(e: ChangeEvent) => setDuplicateUniqueType(e.target.value as 'duplicate' | 'unique')}
							>
								<option value="duplicate">Duplicate</option>
								<option value="unique">Unique</option>
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'date-occurring':
				return (
					<div className="cf-rule-form">
						<h3>Date Occurring Settings</h3>

						<div className="form-group">
							<label>Date Type</label>
							<SmilodonNativeSelect
								value={dateOccurring}
								onChange={(e: ChangeEvent) => setDateOccurring(e.target.value as any)}
							>
								<option value="today">Today</option>
								<option value="yesterday">Yesterday</option>
								<option value="tomorrow">Tomorrow</option>
								<option value="last-7-days">Last 7 Days</option>
								<option value="this-week">This Week</option>
								<option value="last-week">Last Week</option>
								<option value="this-month">This Month</option>
								<option value="last-month">Last Month</option>
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'text':
				return (
					<div className="cf-rule-form">
						<h3>Text Settings</h3>

						<div className="form-group">
							<label>Operator</label>
							<SmilodonNativeSelect
								value={textOperator}
								onChange={(e: ChangeEvent) => setTextOperator(e.target.value as any)}
							>
								<option value="contains">Contains</option>
								<option value="not-contains">Does Not Contain</option>
								<option value="begins-with">Begins With</option>
								<option value="ends-with">Ends With</option>
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Text Value</label>
							<input
								type="text"
								value={textValue}
								onChange={(e: ChangeEvent) => setTextValue(e.target.value)}
								placeholder="Search text..."
							/>
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			case 'errors-blank':
				return (
					<div className="cf-rule-form">
						<h3>Errors/Blanks Settings</h3>

						<div className="form-group">
							<label>Type</label>
							<SmilodonNativeSelect
								value={errorsBlankType}
								onChange={(e: ChangeEvent) => setErrorsBlankType(e.target.value as any)}
							>
								<option value="errors">Errors</option>
								<option value="no-errors">No Errors</option>
								<option value="blanks">Blanks</option>
								<option value="no-blanks">No Blanks</option>
							</SmilodonNativeSelect>
						</div>

						<div className="form-group">
							<label>Fill Color</label>
							<input
								type="color"
								value={fillColor}
								onChange={(e: ChangeEvent) => setFillColor(e.target.value)}
							/>
						</div>

						<div className="form-group">
							<label>Font Color</label>
							<input
								type="color"
								value={fontColor}
								onChange={(e: ChangeEvent) => setFontColor(e.target.value)}
							/>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="cf-rule-builder">
			<h2>{rule ? 'Edit Rule' : 'New Conditional Formatting Rule'}</h2>

			{/* Rule Type Selection */}
			<div className="form-group">
				<label>Rule Type</label>
				<SmilodonNativeSelect
					value={ruleType}
					onChange={(e: ChangeEvent) => setRuleType(e.target.value as RuleType)}
				>
					{Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</SmilodonNativeSelect>
			</div>

			{/* Type-specific form */}
			{renderTypeSpecificForm()}

			{/* Metadata Section */}
			<div className="cf-metadata">
				<h3>Rule Metadata</h3>

				<div className="form-group">
					<label>Description (optional)</label>
					<input
						type="text"
						value={description}
						onChange={(e: ChangeEvent) => setDescription(e.target.value)}
						placeholder="Describe this rule..."
					/>
				</div>

				<div className="form-group">
					<label>Priority</label>
					<input
						type="number"
						value={priority}
						onChange={(e: ChangeEvent) => setPriority(parseInt(e.target.value, 10))}
						min={1}
					/>
				</div>

				<div className="form-group">
					<label>
						<input
							type="checkbox"
							checked={stopIfTrue}
							onChange={(e: CheckboxChangeEvent) => setStopIfTrue(e.target.checked)}
						/>
						Stop If True
					</label>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="cf-actions">
				<button onClick={handleSave} className="btn-primary">
					{rule ? 'Update Rule' : 'Create Rule'}
				</button>
				{onCancel && (
					<button onClick={onCancel} className="btn-secondary">
						Cancel
					</button>
				)}
			</div>
		</div>
	);
};
