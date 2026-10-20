import React, { useState, useEffect, useRef } from 'react';
import type { CFPreset, PresetCategory } from '@cyber-sheet/cf-ui-core';
import { PresetPickerController } from '@cyber-sheet/cf-ui-core';

/**
 * Props for ConditionalFormattingPresetPicker
 */
export type ConditionalFormattingPresetPickerProps = {
	/** Callback when preset is selected */
	onPresetSelect: (preset: CFPreset) => void;
	/** Callback when apply is clicked */
	onApply?: (preset: CFPreset) => void;
	/** Show popular presets section */
	showPopular?: boolean;
	/** Max width of picker */
	maxWidth?: number;
	/** Enable accessibility features (default: true) */
	enableA11y?: boolean;
};

/**
 * ConditionalFormattingPresetPicker - React Component
 *
 * Preset picker UI with categories, search, and thumbnails
 *
 * This is a THIN ADAPTER around PresetPickerController (framework-agnostic core)
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - ARIA labels, roles, and descriptions
 * - Focus management and visual indicators
 * - Screen reader announcements for state changes
 * - Semantic HTML structure
 */
export const ConditionalFormattingPresetPicker: React.FC<ConditionalFormattingPresetPickerProps> = ({
	onPresetSelect,
	onApply,
	showPopular = true,
	maxWidth = 600,
	enableA11y = true,
}) => {
	const [controller] = useState<PresetPickerController>(() => new PresetPickerController());
	const [state, setState] = useState(controller.getState());
	const [categories, setCategories] = useState(controller.getCategories());
	const [popularPresets, setPopularPresets] = useState(controller.getPopularPresets(6));

	// Refs for accessibility
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const announcerRef = useRef<HTMLDivElement>(null);
	const applyButtonRef = useRef<HTMLButtonElement>(null);

	// Screen reader announcement helper
	const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
		if (!enableA11y || !announcerRef.current) return;

		announcerRef.current.setAttribute('aria-live', priority);
		announcerRef.current.textContent = message;

		// Clear after 1 second to allow re-announcing same message
		setTimeout(() => {
			if (announcerRef.current) {
				announcerRef.current.textContent = '';
			}
		}, 1000);
	};

	// Subscribe to controller events
	useEffect(() => {
		const unsubscribe = controller.on('*', () => {
			const newState = controller.getState();
			setState(newState);

			// Announce filter changes
			if (enableA11y) {
				if (newState.filteredPresets.length === 0) {
					announce('No presets found', 'polite');
				}
			}
		});
		return unsubscribe;
	}, [controller, enableA11y]);

	const handleCategoryChange = (category: PresetCategory | 'all') => {
		controller.selectCategory(category);
		setCategories(controller.getCategories());

		// Announce category change
		const categoryLabel = categories.find((c) => c.id === category)?.label || 'All';
		const count = controller.getState().filteredPresets.length;
		announce(`${categoryLabel} category selected. Showing ${count} presets.`, 'polite');
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		controller.setSearchQuery(e.target.value);

		// Announce search results after a delay (debounced announcement)
		const query = e.target.value;
		setTimeout(() => {
			const count = controller.getState().filteredPresets.length;
			if (query) {
				announce(`${count} presets found for "${query}"`, 'polite');
			}
		}, 500);
	};

	const handlePresetClick = (preset: CFPreset) => {
		controller.selectPreset(preset.id);
		onPresetSelect(preset);

		// Announce selection
		announce(`Selected preset: ${preset.name}`, 'polite');

		// Move focus to apply button if available
		if (onApply && applyButtonRef.current) {
			applyButtonRef.current.focus();
		}
	};

	const handleApplyClick = () => {
		const selectedPreset = controller.getSelectedPreset();
		if (selectedPreset && onApply) {
			onApply(selectedPreset);
			announce(`Applied ${selectedPreset.name} preset`, 'assertive');
		}
	};

	// Keyboard navigation for preset grid
	const handlePresetKeyDown = (e: React.KeyboardEvent, preset: CFPreset, index: number) => {
		if (!enableA11y) return;

		const presets = state.filteredPresets;

		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handlePresetClick(preset);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			const nextIndex = Math.min(index + 2, presets.length - 1); // Move down one row (2 columns)
			const nextElement = containerRef.current?.querySelectorAll('[data-preset-id]')[nextIndex] as HTMLElement;
			nextElement?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prevIndex = Math.max(index - 2, 0); // Move up one row
			const prevElement = containerRef.current?.querySelectorAll('[data-preset-id]')[prevIndex] as HTMLElement;
			prevElement?.focus();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			const nextIndex = Math.min(index + 1, presets.length - 1);
			const nextElement = containerRef.current?.querySelectorAll('[data-preset-id]')[nextIndex] as HTMLElement;
			nextElement?.focus();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			const prevIndex = Math.max(index - 1, 0);
			const prevElement = containerRef.current?.querySelectorAll('[data-preset-id]')[prevIndex] as HTMLElement;
			prevElement?.focus();
		} else if (e.key === 'Home') {
			e.preventDefault();
			const firstElement = containerRef.current?.querySelector('[data-preset-id]') as HTMLElement;
			firstElement?.focus();
		} else if (e.key === 'End') {
			e.preventDefault();
			const elements = containerRef.current?.querySelectorAll('[data-preset-id]');
			const lastElement = elements?.[elements.length - 1] as HTMLElement;
			lastElement?.focus();
		}
	};

	// Keyboard navigation for category buttons
	const handleCategoryKeyDown = (e: React.KeyboardEvent, index: number) => {
		if (!enableA11y) return;

		if (e.key === 'ArrowRight') {
			e.preventDefault();
			const nextIndex = (index + 1) % categories.length;
			const nextButton = containerRef.current?.querySelectorAll('[data-category-id]')[nextIndex] as HTMLElement;
			nextButton?.focus();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			const prevIndex = (index - 1 + categories.length) % categories.length;
			const prevButton = containerRef.current?.querySelectorAll('[data-category-id]')[prevIndex] as HTMLElement;
			prevButton?.focus();
		} else if (e.key === 'Home') {
			e.preventDefault();
			const firstButton = containerRef.current?.querySelector('[data-category-id]') as HTMLElement;
			firstButton?.focus();
		} else if (e.key === 'End') {
			e.preventDefault();
			const buttons = containerRef.current?.querySelectorAll('[data-category-id]');
			const lastButton = buttons?.[buttons.length - 1] as HTMLElement;
			lastButton?.focus();
		}
	};

	return (
		<div
			ref={containerRef}
			className="cf-preset-picker"
			role="region"
			aria-label="Conditional Formatting Preset Picker"
			aria-describedby="picker-description"
			style={{
				maxWidth: `${maxWidth}px`,
				backgroundColor: 'white',
				border: '1px solid #ccc',
				borderRadius: '4px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				padding: '16px',
				fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
			}}
		>
			{/* Screen Reader Announcer (hidden) */}
			{enableA11y && <div
				ref={announcerRef}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				style={{
					position: 'absolute',
					width: '1px',
					height: '1px',
					padding: 0,
					margin: '-1px',
					overflow: 'hidden',
					clip: 'rect(0, 0, 0, 0)',
					whiteSpace: 'nowrap',
					border: 0,
				}}
				></div>}

			{/* Header */}
			<div style={{ marginBottom: '16px' }}>
				<h3
					id="picker-title"
					style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}
				>
					Conditional Formatting Presets
				</h3>
				<p
					id="picker-description"
					style={{ margin: 0, fontSize: '13px', color: '#666' }}
				>
					Choose from 20+ Excel-style presets to quickly format your data
				</p>
				</div>

			{/* Search */}
			<div style={{ marginBottom: '16px' }}>
				<label
					htmlFor="preset-search"
					style={{
						display: 'block',
						fontSize: '12px',
						fontWeight: 600,
						marginBottom: '4px',
						color: '#666',
					}}
				>
					Search Presets
				</label>
				<input
					id="preset-search"
					ref={searchInputRef}
					type="text"
					role="searchbox"
					placeholder="Search by name, category, or tags..."
					tabIndex={0}
					value={state.searchQuery}
					onChange={handleSearchChange}
					aria-label="Search presets by name, category, or tags"
					aria-controls="preset-grid"
					style={{
						width: '100%',
						padding: '8px 12px',
						border: '1px solid #ddd',
						borderRadius: '4px',
						fontSize: '13px',
						boxSizing: 'border-box',
					}}
				/>
			</div>

			{/* Categories */}
			<div
				role="toolbar"
				aria-label="Category filters"
				style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}
			>
				<div role="radiogroup" aria-label="Preset categories" style={{ display: 'contents' }}>
				{categories.map((cat, index) => (
					<button
						key={cat.id}
						data-category-id={cat.id}
						onClick={() => handleCategoryChange(cat.id)}
						onKeyDown={(e) => handleCategoryKeyDown(e, index)}
						role="radio"
						aria-checked={state.selectedCategory === cat.id}
						aria-label={`${cat.label} category (${cat.count} presets)`}
						tabIndex={state.selectedCategory === cat.id ? 0 : -1}
						style={{
							padding: '6px 12px',
							fontSize: '12px',
							border: state.selectedCategory === cat.id ? '2px solid #007acc' : '1px solid #ddd',
							borderRadius: '4px',
							backgroundColor: state.selectedCategory === cat.id ? '#007acc' : 'white',
							color: state.selectedCategory === cat.id ? 'white' : '#333',
							cursor: 'pointer',
							fontWeight: state.selectedCategory === cat.id ? 600 : 400,
							outline: 'none',
						}}
						onFocus={(e) => {
							e.currentTarget.style.outline = '2px solid #007acc';
							e.currentTarget.style.outlineOffset = '2px';
						}}
						onBlur={(e) => {
							e.currentTarget.style.outline = 'none';
						}}
					>
						{cat.label} <span aria-hidden="true">({cat.count})</span>
					</button>
				))}
				</div>
			</div>

			{/* Popular Presets (Quick Access) */}
			{showPopular && state.selectedCategory === 'all' && state.searchQuery === '' && (
				<div
					role="group"
					aria-label="Popular presets"
					style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}
				>
					<h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', margin: '0 0 8px 0', color: '#666' }}>
						<span aria-label="Star icon">⭐</span> Popular Presets
					</h4>
					<div
						role="list"
						style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}
					>
						{popularPresets.map((preset) => (
							<div key={preset.id} role="listitem" aria-label={`${preset.name}: ${preset.description}`}>
							<button
								onClick={() => handlePresetClick(preset)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										handlePresetClick(preset);
									}
								}}
								aria-pressed={state.selectedPresetId === preset.id}
								aria-label={`Select ${preset.name} preset`}
								style={{
									padding: '8px',
									border: state.selectedPresetId === preset.id ? '2px solid #007acc' : '1px solid #ddd',
									borderRadius: '4px',
									cursor: 'pointer',
									backgroundColor: state.selectedPresetId === preset.id ? '#f0f8ff' : 'white',
									textAlign: 'center',
									fontSize: '11px',
									outline: 'none',
								}}
								onFocus={(e) => {
									e.currentTarget.style.outline = '2px solid #007acc';
									e.currentTarget.style.outlineOffset = '2px';
								}}
								onBlur={(e) => {
									e.currentTarget.style.outline = 'none';
								}}
							>
								<div style={{ fontSize: '20px', marginBottom: '4px' }} aria-hidden="true">
									{preset.category === 'data-bars' && '📊'}
									{preset.category === 'color-scales' && '🌈'}
									{preset.category === 'icon-sets' && '🚦'}
									{preset.category === 'top-bottom' && '🏆'}
									{preset.category === 'above-below' && '📈'}
								</div>
								<div style={{ fontWeight: 500, fontSize: '11px' }}>{preset.name}</div>
							</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Preset Grid */}
			<div
				id="preset-grid"
				role="grid"
				aria-label="Available conditional formatting presets"
				aria-rowcount={Math.ceil(state.filteredPresets.length / 2)}
				aria-colcount={2}
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, 1fr)',
					gap: '12px',
					maxHeight: '400px',
					overflowY: 'auto',
					marginBottom: '16px',
				}}
			>
				{Array.from({ length: Math.ceil(state.filteredPresets.length / 2) }, (_, row) => (
					<div key={`row-${row + 1}`} role="row" aria-rowindex={row + 1} style={{ display: 'contents' }}>
					{state.filteredPresets.slice(row * 2, row * 2 + 2).map((preset, column) => {
						const index = row * 2 + column;
						const colIndex = column + 1;
						return (
						<button
							key={preset.id}
							data-preset-id={preset.id}
							role="gridcell"
							aria-colindex={colIndex}
							aria-selected={state.selectedPresetId === preset.id}
							aria-describedby={`preset-${preset.id}-desc`}
							tabIndex={state.selectedPresetId === preset.id ? 0 : -1}
							onClick={() => handlePresetClick(preset)}
							onKeyDown={(e) => handlePresetKeyDown(e, preset, index)}
							style={{
								padding: '12px',
								border: state.selectedPresetId === preset.id ? '2px solid #007acc' : '1px solid #ddd',
								borderRadius: '4px',
								cursor: 'pointer',
								backgroundColor: state.selectedPresetId === preset.id ? '#f0f8ff' : 'white',
								transition: 'all 0.2s',
								textAlign: 'left',
								outline: 'none',
							}}
							onFocus={(e) => {
								e.currentTarget.style.outline = '2px solid #007acc';
								e.currentTarget.style.outlineOffset = '-2px';
								e.currentTarget.style.backgroundColor = state.selectedPresetId === preset.id ? '#f0f8ff' : '#f9f9f9';
							}}
							onBlur={(e) => {
								e.currentTarget.style.outline = 'none';
								e.currentTarget.style.backgroundColor = state.selectedPresetId === preset.id ? '#f0f8ff' : 'white';
							}}
						>
							{/* Preset Icon */}
							<div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }} aria-hidden="true">
								{preset.category === 'data-bars' && '📊'}
								{preset.category === 'color-scales' && '🌈'}
								{preset.category === 'icon-sets' && '🚦'}
								{preset.category === 'top-bottom' && '🏆'}
								{preset.category === 'above-below' && '📈'}
								{preset.category === 'duplicates' && '🔄'}
								{preset.category === 'text' && '📝'}
								{preset.category === 'dates' && '📅'}
							</div>

							{/* Preset Name */}
							<div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', textAlign: 'center' }}>
								{preset.name}
							</div>

							{/* Preset Description */}
							<div
								id={`preset-${preset.id}-desc`}
								style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}
							>
								{preset.description}
							</div>

							{/* Tags */}
							<div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
								{preset.tags.slice(0, 2).map((tag) => (
									<span
										key={tag}
										aria-hidden="true"
										style={{
											padding: '2px 6px',
											fontSize: '10px',
											backgroundColor: '#f0f0f0',
											borderRadius: '3px',
											color: '#666',
										}}
									>
										{tag}
									</span>
								))}
							</div>
						</button>
						);
					})}
					</div>
				))}
			</div>

			{/* No Results */}
			{state.filteredPresets.length === 0 && (
				<div
					role="status"
					aria-live="polite"
					style={{ textAlign: 'center', padding: '32px', color: '#999', fontSize: '13px' }}
				>
					No presets found. Try a different search or category.
				</div>
			)}

			{/* Footer */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div
					id="preset-count"
						role={enableA11y ? 'status' : undefined}
						aria-label={enableA11y ? `${state.filteredPresets.length} presets available` : undefined}
						aria-live={enableA11y ? 'polite' : undefined}
					aria-atomic="true"
					style={{ fontSize: '12px', color: '#666' }}
				>
					{state.filteredPresets.length} preset{state.filteredPresets.length !== 1 ? 's' : ''} available
				</div>
				{onApply && (
					<button
						ref={applyButtonRef}
						onClick={handleApplyClick}
						disabled={!state.selectedPresetId}
						aria-label={
							state.selectedPresetId
								? `Apply preset: ${controller.getSelectedPreset()?.name} to target range`
								: 'Apply preset (select a preset first)'
						}
						aria-describedby="apply-hint"
						style={{
							padding: '8px 16px',
							fontSize: '13px',
							fontWeight: 600,
							color: 'white',
							backgroundColor: state.selectedPresetId ? '#007acc' : '#ccc',
							border: 'none',
							borderRadius: '4px',
							cursor: state.selectedPresetId ? 'pointer' : 'not-allowed',
							outline: 'none',
						}}
						onFocus={(e) => {
							if (state.selectedPresetId) {
								e.currentTarget.style.outline = '2px solid #007acc';
								e.currentTarget.style.outlineOffset = '2px';
								e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 122, 204, 0.2)';
							}
						}}
						onBlur={(e) => {
							e.currentTarget.style.outline = 'none';
							e.currentTarget.style.boxShadow = 'none';
						}}
					>
						Apply Preset
					</button>
				)}
				<span
					id="apply-hint"
					style={{
						position: 'absolute',
						width: '1px',
						height: '1px',
						padding: 0,
						margin: '-1px',
						overflow: 'hidden',
						clip: 'rect(0, 0, 0, 0)',
						whiteSpace: 'nowrap',
						border: 0,
					}}
				>
					Applies the selected preset to your target range
				</span>
			</div>
		</div>
	);
};

export default ConditionalFormattingPresetPicker;
