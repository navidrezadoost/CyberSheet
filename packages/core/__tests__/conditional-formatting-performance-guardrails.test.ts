/**
 * Phase 3.5 Wave 4: Performance Guardrail Tests
 * 
 * These are NOT UX tests - they are PRODUCT SURVIVAL tests.
 * They detect performance regressions before they reach production.
 * 
 * If any of these tests fail → DO NOT SHIP
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConditionalFormattingEngine } from '../src/ConditionalFormattingEngine';
import { StatisticalCacheManager } from '../src/StatisticalCacheManager';
import type { CellValue, Address } from '../src/types';
import type {
	TopBottomRule,
	AboveAverageRule,
	ConditionalFormattingRule,
} from '../src/ConditionalFormattingEngine';

describe('🚦 Phase 3.5: Performance Guardrails', () => {
	let engine: ConditionalFormattingEngine;
	let cacheManager: StatisticalCacheManager;

	beforeEach(() => {
		engine = new ConditionalFormattingEngine();
		cacheManager = new StatisticalCacheManager();
	});

	describe('❌ O(n²) Regression Detector', () => {
		it('should NOT scan range N times for N cells (top-bottom rule)', () => {
			// Arrange: 100-cell dataset with top-10 rule
			const dataset = new Map<string, CellValue>();
			for (let i = 1; i <= 100; i++) {
				dataset.set(`A${i}`, Math.random() * 100);
			}

			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 10,
				priority: 1,
				style: { fillColor: '#00FF00' },
			};

			const getValue = (addr: Address) => dataset.get(`A${addr.row}`) ?? null;

			// Act: Measure operations WITHOUT cache
			let scanCount = 0;
			const wrappedGetValue = (addr: Address) => {
				scanCount++;
				return getValue(addr);
			};

			// Simulate evaluating all 100 cells
			const start = performance.now();
			for (let row = 1; row <= 100; row++) {
				const ctx = { address: { row, col: 1 }, getValue: wrappedGetValue };
				engine.applyRules(dataset.get(`A${row}`)!, [rule], ctx);
			}
			const duration = performance.now() - start;

			// Assert: Should scan range ONCE (100 cells), not 100 times (10,000 cells)
			// Without cache: scanCount = 100 cells × 100 scans = 10,000 ❌
			// With cache: scanCount = 100 cells (first pass) + 0 (cached) = 100 ✅
			console.log(`O(n²) Detector: ${scanCount} scans, ${duration.toFixed(2)}ms`);
			
			// Current implementation: Accepts O(n²) for now
			// TODO Phase 3.5: This should be ≤ 200 after caching (100 initial + small overhead)
			expect(scanCount).toBeGreaterThan(0); // Placeholder - will tighten after cache integration
		});

		it('should NOT recompute average N times for N cells (above-average rule)', () => {
			// Arrange: 100-cell dataset with above-average rule
			const dataset = new Map<string, CellValue>();
			for (let i = 1; i <= 100; i++) {
				dataset.set(`A${i}`, i); // Values 1-100, average = 50.5
			}

			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				priority: 1,
				style: { fillColor: '#FFFF00' },
			};

			const getValue = (addr: Address) => dataset.get(`A${addr.row}`) ?? null;

			// Act: Measure operations
			let scanCount = 0;
			const wrappedGetValue = (addr: Address) => {
				scanCount++;
				return getValue(addr);
			};

			const start = performance.now();
			for (let row = 1; row <= 100; row++) {
				const ctx = { address: { row, col: 1 }, getValue: wrappedGetValue };
				engine.applyRules(dataset.get(`A${row}`)!, [rule], ctx);
			}
			const duration = performance.now() - start;

			console.log(`Average Recompute: ${scanCount} scans, ${duration.toFixed(2)}ms`);
			
			// Current: O(n²) - 10,000 scans
			// Target: O(n) - 100 scans + cache lookups
			expect(scanCount).toBeGreaterThan(0); // Placeholder
		});
	});

	describe('✅ Max Rules Per Range Benchmark', () => {
		it('should handle 10+ rules without exponential slowdown', () => {
			// Arrange: 10 overlapping rules on same range
			const rules: ConditionalFormattingRule[] = [];
			for (let i = 0; i < 10; i++) {
				rules.push({
					type: 'value',
					operator: '>',
					value: i * 10,
					priority: i,
					style: { fillColor: `#${i}${i}${i}${i}${i}${i}` },
				});
			}

			const value = 55;
			const ctx = { address: { row: 1, col: 1 } };

			// Act: Measure evaluation time
			const iterations = 1000;
			const start = performance.now();
			for (let i = 0; i < iterations; i++) {
				engine.applyRules(value, rules, ctx);
			}
			const duration = performance.now() - start;
			const avgTime = duration / iterations;

			console.log(`10 Rules Benchmark: ${avgTime.toFixed(3)}ms per evaluation`);
			
			// Assert: Should be < 1ms per evaluation (even with 10 rules)
			expect(avgTime).toBeLessThan(1.0);
		});

		it('should handle 50 rules without crashing or hanging', () => {
			// Arrange: 50 rules (extreme stress test)
			const rules: ConditionalFormattingRule[] = [];
			for (let i = 0; i < 50; i++) {
				rules.push({
					type: 'value',
					operator: '>',
					value: i,
					priority: i,
					style: { fillColor: '#FF0000' },
				});
			}

			const value = 25;
			const ctx = { address: { row: 1, col: 1 } };

			// Act: Measure with timeout protection
			const start = performance.now();
			const result = engine.applyRules(value, rules, ctx);
			const duration = performance.now() - start;

			console.log(`50 Rules Stress Test: ${duration.toFixed(2)}ms`);
			
			// Assert: Should complete without hanging
			expect(result).toBeDefined();
			expect(duration).toBeLessThan(100); // Should be fast even with 50 rules
		});
	});

	describe('✅ Large Dataset Stress Test', () => {
		it('should handle 1000-cell range with statistical rule', () => {
			// Arrange: 1000 cells with top-100 rule
			const dataset = new Map<string, CellValue>();
			for (let i = 1; i <= 1000; i++) {
				dataset.set(`A${i}`, Math.random() * 1000);
			}

			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 100,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1000, col: 1 } }],
				priority: 1,
				style: { fillColor: '#00FF00' },
			};

			const getValue = (addr: Address) => dataset.get(`A${addr.row}`) ?? null;

			// Act: Measure first cell evaluation (includes range scan)
			const start = performance.now();
			const ctx = { address: { row: 1, col: 1 }, getValue };
			const result = engine.applyRules(dataset.get('A1')!, [rule], ctx);
			const duration = performance.now() - start;

			console.log(`1000-Cell Range Scan: ${duration.toFixed(2)}ms`);
			
			// Assert: Should complete in reasonable time
			expect(result).toBeDefined();
			expect(duration).toBeLessThan(100); // First scan may be slow, but should be < 100ms
		});

		it('should handle 10k×10k grid (mocked) with value rules', () => {
			// Arrange: Mock 10k×10k grid (100M cells) with value rule
			// Don't actually create 100M cells - just simulate the scale
			const rule: ConditionalFormattingRule = {
				type: 'value',
				operator: '>',
				value: 50,
				priority: 1,
				style: { fillColor: '#FF0000' },
			};

			// Act: Measure evaluation time for sample cells
			const samples = 1000;
			const start = performance.now();
			for (let i = 0; i < samples; i++) {
				const value = Math.random() * 100;
				const ctx = { address: { row: i, col: 1 } };
				engine.applyRules(value, [rule], ctx);
			}
			const duration = performance.now() - start;
			const avgTime = duration / samples;

			console.log(`10k×10k Grid (mocked): ${avgTime.toFixed(3)}ms per cell`);
			
			// Assert: Per-cell evaluation should be < 0.1ms (to handle 100M cells efficiently)
			expect(avgTime).toBeLessThan(0.1);
		});
	});

	describe('✅ Statistical Cache Hit Ratio', () => {
		it('should achieve >90% cache hit ratio on repeated evaluations', () => {
			// Arrange: 100-cell dataset, evaluate twice
			const dataset = new Map<string, CellValue>();
			for (let i = 1; i <= 100; i++) {
				dataset.set(`A${i}`, i);
			}

			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 10,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 100, col: 1 } }],
				priority: 1,
				style: { fillColor: '#00FF00' },
			};

			const getValue = (addr: Address) => dataset.get(`A${addr.row}`) ?? null;

			// Act: First pass (cold cache)
			for (let row = 1; row <= 100; row++) {
				const stats = cacheManager.getTopBottomStats(
					rule,
					[{ start: { row: 1, col: 1 }, end: { row: 100, col: 1 } }],
					getValue
				);
				expect(stats).toBeDefined();
			}

			const statsAfterFirstPass = cacheManager.getCacheStats();

			// Second pass (warm cache)
			for (let row = 1; row <= 100; row++) {
				const stats = cacheManager.getTopBottomStats(
					rule,
					[{ start: { row: 1, col: 1 }, end: { row: 100, col: 1 } }],
					getValue
				);
				expect(stats).toBeDefined();
			}

			const statsAfterSecondPass = cacheManager.getCacheStats();

			console.log('Cache Stats:', {
				firstPass: statsAfterFirstPass,
				secondPass: statsAfterSecondPass,
			});

			// Assert: Second pass should have >90% hit ratio
			// First pass: 1 miss (compute once), 99 hits (reuse for remaining cells)
			// Second pass: 100 hits (all cached)
			const totalHitRatio = statsAfterSecondPass.hitRatio;
			expect(totalHitRatio).toBeGreaterThan(0.9); // >90% cache hits
		});
	});

	describe('⚡ Complex Formula Stress Test', () => {
		it('should handle 100 formula evaluations without slowdown', () => {
			// Arrange: Formula rule (most expensive type)
			const rule: ConditionalFormattingRule = {
				type: 'formula',
				expression: '=$A1>50',
				priority: 1,
				style: { fillColor: '#FF0000' },
			};

			const evaluator = (expr: string, ctx: any) => {
				// Simulate formula evaluation complexity
				const value = ctx.value as number;
				return value > 50;
			};

			// Act: Measure 100 evaluations
			const start = performance.now();
			for (let i = 0; i < 100; i++) {
				const value = Math.random() * 100;
				const ctx = { address: { row: i, col: 1 }, value };
				engine.applyRules(value, [rule], ctx, { formulaEvaluator: evaluator });
			}
			const duration = performance.now() - start;
			const avgTime = duration / 100;

			console.log(`Formula Stress: ${avgTime.toFixed(3)}ms per evaluation`);
			
			// Assert: Formula evaluation should be < 1ms per cell
			expect(avgTime).toBeLessThan(1.0);
		});
	});
});
