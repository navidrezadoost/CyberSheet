import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConditionalFormattingRuleManager } from '../ConditionalFormattingRuleManager';
import type { ConditionalFormattingRule } from '@cyber-sheet/core';

describe('ConditionalFormattingRuleManager', () => {
	const mockRules: ConditionalFormattingRule[] = [
		{
			id: 'rule-1',
			type: 'color-scale',
			priority: 3,
			minColor: '#FF0000',
			maxColor: '#00FF00',
			description: 'Traffic Light Colors',
		},
		{
			id: 'rule-2',
			type: 'top-bottom',
			priority: 2,
			mode: 'top',
			rank: 10,
			rankType: 'percent',
			style: { fillColor: '#FFEB9C', fontColor: '#9C6500' },
			stopIfTrue: true,
		},
		{
			id: 'rule-3',
			type: 'formula',
			priority: 1,
			expression: '=A1>100',
			style: { fillColor: '#C6EFCE', fontColor: '#006100' },
		},
	];

	it('renders all rules', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
			/>
		);

		expect(screen.getByText(/Traffic Light Colors/i)).toBeInTheDocument();
		expect(screen.getByText(/Top 10%/i)).toBeInTheDocument();
		expect(screen.getByText(/Formula: =A1>100/i)).toBeInTheDocument();
	});

	it('shows stopIfTrue badge for rules with stopIfTrue enabled', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
			/>
		);

		const stopBadges = document.querySelectorAll('.cf-rule-stop-if-true');
		expect(stopBadges).toHaveLength(1); // Only rule-2 has stopIfTrue
	});

	it('calls onEdit when edit button is clicked', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
			/>
		);

		const editButtons = screen.getAllByTitle(/Edit rule/i);
		fireEvent.click(editButtons[0]);

		expect(mockOnEdit).toHaveBeenCalledWith(mockRules[0], 0);
	});

	it('calls onDelete when delete button is clicked', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
			/>
		);

		const deleteButtons = screen.getAllByTitle(/Delete rule/i);
		fireEvent.click(deleteButtons[1]);

		expect(mockOnDelete).toHaveBeenCalledWith('rule-2', 1);
	});

	it('calls onDuplicate when duplicate button is clicked', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
			/>
		);

		const duplicateButtons = screen.getAllByTitle(/Duplicate rule/i);
		fireEvent.click(duplicateButtons[2]);

		expect(mockOnDuplicate).toHaveBeenCalledWith(mockRules[2], 2);
	});

	it('shows empty state when no rules', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();
		const mockOnCreateNew = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={[]}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
				onCreateNew={mockOnCreateNew}
			/>
		);

		expect(screen.getByText(/No conditional formatting rules/i)).toBeInTheDocument();
		expect(screen.getByText(/Create First Rule/i)).toBeInTheDocument();
	});

	it('shows create new button when provided', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();
		const mockOnCreateNew = jest.fn();

		render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
				onCreateNew={mockOnCreateNew}
			/>
		);

		const createButton = screen.getByText(/\+ New Rule/i);
		fireEvent.click(createButton);

		expect(mockOnCreateNew).toHaveBeenCalled();
	});

	it('displays priority numbers correctly', () => {
		const mockOnReorder = jest.fn();
		const mockOnEdit = jest.fn();
		const mockOnDelete = jest.fn();
		const mockOnDuplicate = jest.fn();

		const { container } = render(
			<ConditionalFormattingRuleManager
				rules={mockRules}
				onReorder={mockOnReorder}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onDuplicate={mockOnDuplicate}
			/>
		);

		const priorityBadges = container.querySelectorAll('.cf-rule-priority');
		expect(priorityBadges).toHaveLength(3);
		expect(priorityBadges[0]).toHaveTextContent('3');
		expect(priorityBadges[1]).toHaveTextContent('2');
		expect(priorityBadges[2]).toHaveTextContent('1');
	});
});
