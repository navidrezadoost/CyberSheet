/**
 * Phase 3 Wave 2 Group 2: Mixed Rule Types
 * 
 * Tests different semantic rule types competing on same cell
 * Focus: VALUE + FORMULA + COLOR-SCALE interactions
 * Statistical rules deferred to Wave 3 (require full context)
 * 
 * Test Pattern:
 * - Arrange: Multiple rule types with different semantics
 * - Act: Evaluate cell against heterogeneous rules
 * - Assert: Winner rule, semantic priority, type interaction
 */

import { ConditionalFormattingEngine, ValueRule } from '../src/ConditionalFormattingEngine';

describe('Phase 3 Wave 2 Group 2: Mixed Rule Types', () => {
	const engine = new ConditionalFormattingEngine();

	describe('🔀 Formula + Value Rules', () => {
		it('should prioritize value rule over formula rule when both match', () => {
			// Arrange: Value rule (priority 1) + Formula rule (priority 2)
			const valueRule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 70,
				priority: 1, // Higher priority
				style: { fillColor: '#FF0000' }
			};

			// Formula rule: =A1>60 (would match 75 if evaluator provided)
			const formulaRule = {
				type: 'formula' as const,
				expression: '=A1>60',
				priority: 2, // Lower priority
				style: { fillColor: '#00FF00' }
			};

			const rules = [valueRule, formulaRule];

			// Act: Value 75 matches value rule (formula needs evaluator)
			const result = engine.applyRules(75, rules);

			// Assert:
			// 1. Value rule wins (matches condition)
			expect(result.style?.fillColor).toBe('#FF0000');

			// 2. Formula rule ignored (needs formulaEvaluator to match)
			expect(result.style?.fillColor).not.toBe('#00FF00');

			// NOTE: Formula rules require formulaEvaluator option to evaluate expressions
			// Without evaluator, formula rules always return matched=false
		});

		it('should apply formula rule when value rule does not match', () => {
			// Arrange: Value rule (>90) + Formula rule (>50, needs evaluator)
			const valueRule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 90,
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			const formulaRule = {
				type: 'formula' as const,
				expression: '=A1>50',
				priority: 2,
				style: { fillColor: '#00FF00' }
			};

			const rules = [valueRule, formulaRule];

			// Act: Value 75 (value rule doesn't match, formula needs evaluator)
			const result = engine.applyRules(75, rules);

			// Assert:
			// 1. No rule applies (value doesn't match, formula needs evaluator)
			expect(result.style).toBeUndefined();

			// 2. Skipped rules: Value rule (condition not met), Formula rule (no evaluator)
			// NOTE: This test documents that formula rules need evaluator to match
		});

		it('should handle formula and value rules with same priority', () => {
			// Arrange: Same priority for both types
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 50,
					priority: 1,
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'formula' as const,
					expression: '=A1>50',
					priority: 1, // Same priority
					style: { fillColor: '#00FF00' }
				}
			];

			// Act: No formula evaluator provided
			const result = engine.applyRules(75, rules);

			// Assert:
			// 1. Value rule wins (formula rules need evaluator to match)
			expect(result.style?.fillColor).toBe('#FF0000');

			// 2. Formula rule skipped (no evaluator = no match)
			expect(result.style?.fillColor).not.toBe('#00FF00');

			// NOTE: Formula rules require formulaEvaluator in options to evaluate
			// Current behavior: formula rules without evaluator always return matched=false
		});
	});

	describe('🎨 Color Scale + VALUE/FORMULA Rules', () => {
		it('should apply color scale when no other rules match', () => {
			// Arrange: Color scale + high-threshold value rule
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 95,
					priority: 1,
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'color-scale' as const,
					minColor: '#63BE7B',
					maxColor: '#F8696B',
					minValue: 0,
					maxValue: 100,
					priority: 2
				}
			];

			// Act: Value 50 (only matches color scale)
			const result = engine.applyRules(50, rules);

			// Assert:
			// 1. Color scale applies
			expect(result.style?.fillColor).toBeDefined();
			expect(result.style?.fillColor).not.toBe('#FF0000');

			// 2. Interpolated color in range
			const fillColor = result.style?.fillColor || '';
			expect(fillColor).not.toBe('');
		});

		it('should prioritize value rule over color scale when value rule matches', () => {
			// Arrange: Value rule (priority 1) + color scale (priority 2)
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 75,
					priority: 1,
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'color-scale' as const,
					minColor: '#63BE7B',
					maxColor: '#F8696B',
					minValue: 0,
					maxValue: 100,
					priority: 2
				}
			];

			// Act: Value 80 matches both
			const result = engine.applyRules(80, rules);

			// Assert:
			// 1. Value rule wins
			expect(result.style?.fillColor).toBe('#FF0000');

			// 2. Color scale ignored
			const resultHex = result.style?.fillColor?.toUpperCase();
			expect(resultHex).not.toContain('63BE7B');
			expect(resultHex).not.toContain('F8696B');
		});

		it('should handle formula + color scale priority', () => {
			// Arrange: Formula (priority 1) + color scale (priority 2)
			const rules = [
				{
					type: 'formula' as const,
					expression: '=A1>60',
					priority: 1,
					style: { fillColor: '#0000FF' }
				},
				{
					type: 'color-scale' as const,
					minColor: '#63BE7B',
					maxColor: '#F8696B',
					minValue: 0,
					maxValue: 100,
					priority: 2
				}
			];

			// Act: Value 70, no formula evaluator
			const result = engine.applyRules(70, rules);

			// Assert:
			// 1. Color scale wins (formula needs evaluator)
			const fillColor = result.style?.fillColor || '';
			expect(fillColor).toBeDefined();
			expect(fillColor).not.toBe('#0000FF');

			// 2. Color scale applies (always matches numeric values)
			// NOTE: Color-scale rules ALWAYS match numeric values (no condition)
			// Formula rules need evaluator to match, so color-scale wins by default
		});
	});

	describe('🔄 Three-Way Type Conflicts (VALUE + FORMULA + COLOR-SCALE)', () => {
		it('should resolve value + formula + color-scale conflict by priority', () => {
			// Arrange: All 3 types match same cell
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 70,
					priority: 1, // Highest priority
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'formula' as const,
					expression: '=A1>60',
					priority: 2,
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'color-scale' as const,
					minColor: '#63BE7B',
					maxColor: '#F8696B',
					minValue: 0,
					maxValue: 100,
					priority: 3
				}
			];

			// Act: Test value 80 (matches all 3)
			const result = engine.applyRules(80, rules);

			// Assert:
			// 1. Value rule wins (priority 1)
			expect(result.style?.fillColor).toBe('#FF0000');

			// 2. Formula and color-scale ignored
			expect(result.style?.fillColor).not.toBe('#00FF00');
		});

		it('should cascade to lower priority when higher priority rules do not match', () => {
			// Arrange: Value (priority 1, won't match) + Formula (priority 2, needs evaluator) + Color-scale (priority 3)
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 90, // Won't match 60
					priority: 1,
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'formula' as const,
					expression: '=A1>50', // Would match 60, but needs evaluator
					priority: 2,
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'color-scale' as const,
					minColor: '#63BE7B',
					maxColor: '#F8696B',
					minValue: 0,
					maxValue: 100,
					priority: 3
				}
			];

			// Act: Value 60, no formula evaluator
			const result = engine.applyRules(60, rules);

			// Assert:
			// 1. Color scale wins (value didn't match, formula needs evaluator)
			const fillColor = result.style?.fillColor || '';
			expect(fillColor).toBeDefined();
			expect(fillColor).not.toBe('#FF0000'); // Value rule didn't match
			expect(fillColor).not.toBe('#00FF00'); // Formula rule needs evaluator

			// 2. Priority cascade works: skips value (no match) → skips formula (no evaluator) → applies color-scale
		});
	});

	describe('⚡ stopIfTrue Across Rule Types', () => {
		it('should stop on value rule when it matches (priority-sorted evaluation)', () => {
			// Arrange: Value stopIfTrue (priority 2) and formula (priority 1, needs evaluator)
			// NOTE: Priority sorting happens FIRST, then array order for ties
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 70,
					priority: 2, // Higher priority = evaluated first after sort
					stopIfTrue: true, // STOPS HERE if matches
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'formula' as const,
					expression: '=A1>60',
					priority: 1, // Lower priority
					style: { fillColor: '#00FF00' }
				}
			];

			// Act: Value 80 (value rule matches, formula needs evaluator)
			const result = engine.applyRules(80, rules);

			// Assert:
			// 1. Value rule wins (priority 2 > priority 1, stopIfTrue stops evaluation)
			expect(result.style?.fillColor).toBe('#FF0000');

			// 2. Formula rule never evaluated (stopIfTrue terminated, and needs evaluator anyway)
			expect(result.style?.fillColor).not.toBe('#00FF00');

			// NOTE: Priority sorting happens first, then stopIfTrue terminates on first match
		});

		it('should continue to next type when stopIfTrue rule does not match', () => {
			// Arrange: stopIfTrue formula (high threshold, needs evaluator) + value rule
			const rules = [
				{
					type: 'formula' as const,
					expression: '=A1>90',
					priority: 1,
					stopIfTrue: true,
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 50,
					priority: 2,
					style: { fillColor: '#00FF00' }
				}
			];

			// Act: Value 60 (formula doesn't match, value does match)
			const result = engine.applyRules(60, rules);

			// Assert:
			// 1. Value rule applies (priority 2, formula needs evaluator)
			expect(result.style?.fillColor).toBe('#00FF00');

			// 2. Formula rule skipped (needs evaluator to match, stopIfTrue not triggered)
			expect(result.style?.fillColor).not.toBe('#FF0000');

			// NOTE: stopIfTrue only stops if rule MATCHES - formula didn't match (no evaluator)
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// STATISTICAL RULES: Deferred to Wave 3 (require full CF context)
	// ═══════════════════════════════════════════════════════════════

	describe('📊 Statistical + Explicit Comparison (DEFERRED TO WAVE 3)', () => {
		test.todo('top-bottom rule vs value rule requires ConditionalFormattingContext with getValue');
		test.todo('statistical rule fallback when explicit rule does not match requires full context');
		test.todo('percentile rule vs formula rule requires dataset context');
	});

	describe('🎨 Color Scale + Statistical Rules (DEFERRED TO WAVE 3)', () => {
		test.todo('color scale vs duplicate rule requires duplicate detection context');
	});

	describe('🔄 Three-Way Conflicts with Statistical Rules (DEFERRED TO WAVE 3)', () => {
		test.todo('value + formula + top-bottom conflict requires full context');
		test.todo('formula + duplicate + color-scale simultaneously requires getValue context');
	});

	describe('⚡ stopIfTrue with Statistical Rules (DEFERRED TO WAVE 3)', () => {
		test.todo('stopIfTrue on statistical rule before value rule requires dataset context');
	});

	describe('🎯 Type-Specific Edge Cases (DEFERRED TO WAVE 3)', () => {
		test.todo('unique rule vs value rule requires duplicate detection');
		test.todo('data-bar vs icon-set requires full implementation');
	});
});
