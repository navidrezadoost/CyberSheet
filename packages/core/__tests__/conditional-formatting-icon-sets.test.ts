/**
 * Phase 4 Wave 1: Icon Sets - Excel Parity Tests
 * 
 * Testing Strategy:
 * - Start with 3-arrows (simplest: 3 icons, equal thirds)
 * - Expand to all 19 Excel icon sets
 * - Test percentile-based thresholds
 * - Verify cache integration
 * - Test edge cases (ties, nulls, empty ranges)
 * 
 * Excel Behavior:
 * - Icon sets use percentile-based thresholds by default
 * - Top 33% gets icon 0, middle 33% gets icon 1, bottom 33% gets icon 2 (for 3-icon sets)
 * - Thresholds can be customized (value, percent, percentile, formula)
 * - reverseOrder flips icon assignment
 * - showIconOnly hides cell value (renderer responsibility)
 */

import { ConditionalFormattingEngine, IconSetRule } from '../src/ConditionalFormattingEngine';
import { Address, CellValue } from '../src/types';

describe('Conditional Formatting - Icon Sets (Phase 4)', () => {
    let engine: ConditionalFormattingEngine;

    beforeEach(() => {
        engine = new ConditionalFormattingEngine();
        engine.clearCache(); // Ensure test isolation
    });

    // Helper: Create getValue function from Map
    function createGetValue(dataset: Map<string, CellValue>) {
        return (addr: Address) => dataset.get(`${addr.row}`) ?? null;
    }

    describe('3-Arrows Icon Set (Basic)', () => {
        it('should assign up-arrow to top 33% values', () => {
            // Dataset: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]
            // Top 33% (3-4 values): 100, 90, 80 → up-arrow (icon index 0)
            const dataset = new Map<string, CellValue>([
                ['1', 100],
                ['2', 90],
                ['3', 80],
                ['4', 70],
                ['5', 60],
                ['6', 50],
                ['7', 40],
                ['8', 30],
                ['9', 20],
                ['10', 10],
            ]);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
            };

            // Test top 33%: Should get up-arrow
            const result1 = engine.applyRules(100, [rule], {
                address: { row: 1, col: 1 },
                getValue: createGetValue(dataset),
            });

            expect(result1.icon).toBeDefined();
            expect(result1.icon?.iconSet).toBe('3-arrows');
            expect(result1.icon?.iconIndex).toBe(0); // up-arrow
            expect(result1.appliedRuleIds).toHaveLength(1);
        });

        it('should assign right-arrow to middle 33% values', () => {
            const dataset = new Map<string, CellValue>([
                ['1', 100], ['2', 90], ['3', 80], ['4', 70], ['5', 60],
                ['6', 50], ['7', 40], ['8', 30], ['9', 20], ['10', 10],
            ]);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
            };

            // Test middle 33% (value 50, 40, 30): Should get right-arrow
            const result = engine.applyRules(50, [rule], {
                address: { row: 6, col: 1 },
                getValue: createGetValue(dataset),
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconIndex).toBe(1); // right-arrow
        });

        it('should assign down-arrow to bottom 33% values', () => {
            const dataset = new Map<string, CellValue>([
                ['1', 100], ['2', 90], ['3', 80], ['4', 70], ['5', 60],
                ['6', 50], ['7', 40], ['8', 30], ['9', 20], ['10', 10],
            ]);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
            };

            // Test bottom 33% (value 20, 10): Should get down-arrow
            const result = engine.applyRules(20, [rule], {
                address: { row: 9, col: 1 },
                getValue: createGetValue(dataset),
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconIndex).toBe(2); // down-arrow
        });

        it('should handle tie values consistently', () => {
            // Excel behavior: Ties get the same icon (determined by first occurrence)
            const dataset = new Map<string, CellValue>([
                ['1', 50], ['2', 50], ['3', 50], ['4', 50], ['5', 50],
                ['6', 50], ['7', 50], ['8', 50], ['9', 50], ['10', 50],
            ]);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
            };

            const result = engine.applyRules(50, [rule], {
                address: { row: 5, col: 1 },
                getValue: createGetValue(dataset),
            });

            // All values are equal → all get same icon (right-arrow, middle 50th percentile)
            expect(result.icon).toBeDefined();
            expect(result.icon?.iconIndex).toBe(1); // right-arrow (middle)
        });
    });

    describe('Icon Set Cache Integration', () => {
        it('should use statisticalCache for percentile calculations', () => {
            const dataset = new Map<string, CellValue>([
                ['1', 100], ['2', 90], ['3', 80], ['4', 70], ['5', 60],
                ['6', 50], ['7', 40], ['8', 30], ['9', 20], ['10', 10],
            ]);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
            };

            // First pass: Cache miss (compute percentiles)
            engine.applyRules(100, [rule], {
                address: { row: 1, col: 1 },
                getValue: createGetValue(dataset),
            });

            // Second pass: Cache hit (reuse percentiles)
            engine.applyRules(50, [rule], {
                address: { row: 6, col: 1 },
                getValue: createGetValue(dataset),
            });

            const stats = engine.getCacheStats();
            expect(stats.hits).toBeGreaterThan(0); // Cache was used
            expect(stats.hitRatio).toBeGreaterThanOrEqual(0.5); // At least 50% hit ratio
        });

        it('should maintain 90%+ cache hit ratio over 100 evaluations', () => {
            const dataset = new Map<string, CellValue>();
            for (let i = 1; i <= 100; i++) {
                dataset.set(`A${i}`, i * 10); // Values: 10, 20, 30, ..., 1000
            }

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
            };

            // Evaluate all 100 cells
            for (let i = 1; i <= 100; i++) {
                engine.applyRules(i * 10, [rule], {
                    address: { row: i, col: 1 },
                    getValue: createGetValue(dataset),
                });
            }

            const stats = engine.getCacheStats();
            expect(stats.hitRatio).toBeGreaterThanOrEqual(0.90); // ≥90% (Phase 3.5 guarantee)
        });
    });

    describe('Icon Set Type Validation', () => {
        it('should reject invalid icon set names', () => {
            const rule: any = {
                type: 'icon-set',
                iconSet: 'invalid-icon-set', // Invalid
                thresholds: [],
            };

            expect(() => {
                engine.applyRules(100, [rule], {
                    address: { row: 1, col: 1 },
                    getValue: () => 100,
                });
            }).toThrow(); // Should throw error for invalid icon set
        });

        it('should validate thresholds array is provided', () => {
            const rule: any = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                // Missing thresholds
            };

            expect(() => {
                engine.applyRules(100, [rule], {
                    address: { row: 1, col: 1 },
                    getValue: () => 100,
                });
            }).toThrow(); // Should throw error for missing thresholds
        });
    });

    describe('stopIfTrue with Icon Sets', () => {
        it('should stop evaluation after icon set rule matches with stopIfTrue', () => {
            const dataset = new Map<string, CellValue>([
                ['1', 100], ['2', 50], ['3', 10],
            ]);

            const iconRule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up-arrow', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right-arrow', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down-arrow', operator: '>=' },
                ],
                stopIfTrue: true, // Stop after this rule
            };

            const valueRule: any = {
                type: 'value',
                operator: '>',
                value: 50,
                style: { fillColor: 'red' }, // Should NOT apply (stopIfTrue)
            };

            const result = engine.applyRules(100, [iconRule, valueRule], {
                address: { row: 1, col: 1 },
                getValue: createGetValue(dataset),
            });

            expect(result.icon).toBeDefined(); // Icon applied
            expect(result.style?.fillColor).toBeUndefined(); // Second rule NOT applied
            expect(result.appliedRuleIds).toHaveLength(1); // Only first rule
        });
    });
});
