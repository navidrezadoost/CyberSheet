import React from 'react';
import type { ConditionalFormattingRuleDraft } from './types';
import { SmilodonNativeSelect } from '../components/SmilodonNativeSelect';

export type RuleBuilderProps = {
	rule: ConditionalFormattingRuleDraft | null;
	onChange: (next: ConditionalFormattingRuleDraft) => void;
	onSave: () => void;
	onCancel?: () => void;
};

const ruleTypes = [
	{ value: 'value', label: 'Value' },
	{ value: 'formula', label: 'Formula' },
	{ value: 'top-bottom', label: 'Top / Bottom' },
	{ value: 'above-average', label: 'Above / Below Average' },
	{ value: 'duplicate-unique', label: 'Duplicate / Unique' },
	{ value: 'color-scale', label: 'Color Scale' },
	{ value: 'data-bar', label: 'Data Bar' },
	{ value: 'icon-set', label: 'Icon Set' },
];

export const RuleBuilder = ({ rule, onChange, onSave, onCancel }: RuleBuilderProps) => {
	if (!rule) {
		return (
			<div style={{ border: '1px dashed #e5e7eb', borderRadius: 8, padding: 12, color: '#6b7280' }}>
				Select a rule to edit or create a new rule.
			</div>
		);
	}

	return (
		<div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 12 }}>Rule Builder</div>
			<div style={{ display: 'grid', gap: 10 }}>
				<label style={{ display: 'grid', gap: 4 }}>
					<span style={{ fontSize: 12, color: '#6b7280' }}>Rule Type</span>
					<SmilodonNativeSelect
						value={rule.type ?? ''}
						onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
							onChange({ ...rule, type: event.target.value as any })
						}
					>
						<option value="" disabled>
							Select type
						</option>
						{ruleTypes.map(type => (
							<option key={type.value} value={type.value}>
								{type.label}
							</option>
						))}
					</SmilodonNativeSelect>
				</label>

				<label style={{ display: 'grid', gap: 4 }}>
					<span style={{ fontSize: 12, color: '#6b7280' }}>Description</span>
					<input
						type="text"
						value={rule.description ?? ''}
						onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
							onChange({ ...rule, description: event.target.value })
						}
						placeholder="Example: Top 10%"
					/>
				</label>

				<div style={{ display: 'flex', gap: 12 }}>
					<label style={{ display: 'grid', gap: 4, flex: 1 }}>
						<span style={{ fontSize: 12, color: '#6b7280' }}>Priority</span>
						<input
							type="number"
							value={rule.priority ?? 0}
							onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
							onChange({ ...rule, priority: Number(event.target.value) })
						}
						/>
					</label>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<input
							type="checkbox"
							checked={Boolean(rule.stopIfTrue)}
							onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
							onChange({ ...rule, stopIfTrue: event.target.checked })
						}
						/>
						Stop if true
					</label>
				</div>
			</div>

			<div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
				<button type="button" onClick={onSave}>
					Save Rule
				</button>
				{onCancel && (
					<button type="button" onClick={onCancel}>
						Cancel
					</button>
				)}
			</div>
		</div>
	);
};
