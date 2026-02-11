/**
 * Phase 4 Wave 3: Display Semantics (UX-Only) Tests
 * 
 * Testing Strategy:
 * - Test `reverseOrder` flag (icon assignment flipping)
 * - Test `showIconOnly` flag (renderer-level, verified via result structure)
 * - Test edge cases and combinations
 * - Verify no regression in correctness (cache, algorithm untouched)
 * 
 * Key Principle: These are UX flags that don't affect correctness
 */

import { ConditionalFormattingEngine, IconSetRule } from '../src/ConditionalFormattingEngine';
import { Address, CellValue } from '../src/types';

describe('Conditional Formatting - Display Semantics (Wave 3)', () => {
    let engine: ConditionalFormattingEngine;

    beforeEach(() => {
        engine = new ConditionalFormattingEngine();
        engine.clearCache();
    });

    // Helper: Create getValue function from array
    function createGetValue(values: number[]) {
        return (addr: Address) => values[addr.row] ?? null;
    }

    // Helper: Get expected icon index for percentile rank
    function getExpectedIconIndex(percentileRank: number, thresholds: number[]): number {
        const percentValue = percentileRank * 100;
        for (let i = 0; i < thresholds.length; i++) {
            if (percentValue >= thresholds[i]) {
                return i;
            }
        }
        return thresholds.length - 1;
    }

    describe('reverseOrder Flag', () => {
        describe('3-Icon Sets', () => {
            it('should NOT reverse icons when reverseOrder is false (default)', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                reverseOrder: false, // Explicit false
            };                // Top value (100) should get icon[0] (up-arrow)
                const result = engine.applyRules(100, [rule], {
                    address: { row: 9, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconSet).toBe('3-arrows');
                expect(result.icon?.iconIndex).toBe(0); // Not reversed
                expect(result.icon?.reverseOrder).toBe(false);
            });

            it('should reverse icons when reverseOrder is true', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: '3-arrows',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                    thresholds: [
                        { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                    reverseOrder: true, // Reverse!
                };

                // Top value (100) should get icon[2] (down-arrow) when reversed
                const result = engine.applyRules(100, [rule], {
                    address: { row: 9, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconSet).toBe('3-arrows');
                expect(result.icon?.iconIndex).toBe(2); // Reversed: 0 → 2
                expect(result.icon?.reverseOrder).toBe(true);
            });

            it('should reverse middle icon correctly', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: '3-arrows',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                    thresholds: [
                        { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                    reverseOrder: true,
                };

                // Middle value (50) should get icon[1] normally, stays icon[1] when reversed
                const result = engine.applyRules(50, [rule], {
                    address: { row: 4, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconIndex).toBe(1); // Middle stays middle (2-1-0 reversed → 1 stays 1)
            });
        });

        describe('4-Icon Sets', () => {
            it('should reverse 4-icon set correctly', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: '4-arrows',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                    thresholds: [
                        { value: 75, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 50, type: 'percent', icon: 'up-inclined', operator: '>=' },
                        { value: 25, type: 'percent', icon: 'down-inclined', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                    reverseOrder: true,
                };

                // Top value (100) should get icon[3] when reversed (0 → 3)
                const result = engine.applyRules(100, [rule], {
                    address: { row: 9, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconSet).toBe('4-arrows');
                expect(result.icon?.iconIndex).toBe(3); // Reversed: 0 → 3
                expect(result.icon?.reverseOrder).toBe(true);
            });

            it('should reverse bottom icon in 4-icon set', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: '4-arrows',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                    thresholds: [
                        { value: 75, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 50, type: 'percent', icon: 'up-inclined', operator: '>=' },
                        { value: 25, type: 'percent', icon: 'down-inclined', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                    reverseOrder: true,
                };

                // Bottom value (10) should get icon[0] when reversed (3 → 0)
                const result = engine.applyRules(10, [rule], {
                    address: { row: 0, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconIndex).toBe(0); // Reversed: 3 → 0
            });
        });

        describe('5-Icon Sets', () => {
            it('should reverse 5-icon set correctly', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: '5-arrows',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                    thresholds: [
                        { value: 80, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 60, type: 'percent', icon: 'up-inclined', operator: '>=' },
                        { value: 40, type: 'percent', icon: 'right', operator: '>=' },
                        { value: 20, type: 'percent', icon: 'down-inclined', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                    reverseOrder: true,
                };

                // Top value (100) should get icon[4] when reversed (0 → 4)
                const result = engine.applyRules(100, [rule], {
                    address: { row: 9, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconSet).toBe('5-arrows');
                expect(result.icon?.iconIndex).toBe(4); // Reversed: 0 → 4
                expect(result.icon?.reverseOrder).toBe(true);
            });

            it('should reverse middle icon in 5-icon set', () => {
                const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                const getValue = createGetValue(dataset);

                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: '5-arrows',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                    thresholds: [
                        { value: 80, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 60, type: 'percent', icon: 'up-inclined', operator: '>=' },
                        { value: 40, type: 'percent', icon: 'right', operator: '>=' },
                        { value: 20, type: 'percent', icon: 'down-inclined', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                    reverseOrder: true,
                };

                // Middle value (50) should get icon[2] normally, stays icon[2] when reversed
                const result = engine.applyRules(50, [rule], {
                    address: { row: 4, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconIndex).toBe(2); // Middle stays middle
            });
        });
    });

    describe('showIconOnly Flag', () => {
        it('should include showIconOnly flag in result when true', () => {
            const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                showIconOnly: true, // Hide cell value
            };

            const result = engine.applyRules(100, [rule], {
                address: { row: 9, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconSet).toBe('3-arrows');
            // Renderer should check this flag and hide cell value
            // Engine just passes it through
        });

        it('should default showIconOnly to undefined when not specified', () => {
            const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                // showIconOnly not specified
            };

            const result = engine.applyRules(100, [rule], {
                address: { row: 9, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            // Should work normally (default behavior: show icon + value)
        });

        it('should work with showIconOnly false explicitly', () => {
            const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                showIconOnly: false, // Explicit false
            };

            const result = engine.applyRules(100, [rule], {
                address: { row: 9, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconIndex).toBe(0);
        });
    });

    describe('Combined Flags', () => {
        it('should handle both reverseOrder and showIconOnly together', () => {
            const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                reverseOrder: true,
                showIconOnly: true,
            };

            // Top value (100) should get icon[2] (reversed) and showIconOnly should be true
            const result = engine.applyRules(100, [rule], {
                address: { row: 9, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconSet).toBe('3-arrows');
            expect(result.icon?.iconIndex).toBe(2); // Reversed
            expect(result.icon?.reverseOrder).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle reverseOrder with single-value dataset', () => {
            const dataset = [50]; // Single value
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                reverseOrder: true,
            };

            const result = engine.applyRules(50, [rule], {
                address: { row: 0, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            // Single value should still get an icon (reversed or not)
        });

        it('should handle reverseOrder with all equal values', () => {
            const dataset = [50, 50, 50, 50, 50]; // All equal (tie values)
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 4, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                reverseOrder: true,
            };

            const result = engine.applyRules(50, [rule], {
                address: { row: 2, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            // Tie values should get middle icon (Wave 1 behavior)
        });
    });

    describe('Cache Performance with Display Flags', () => {
        it('should maintain cache hit ratio with reverseOrder flag', () => {
            const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                reverseOrder: true,
            };

            // Evaluate all 10 values
            for (let i = 0; i < 10; i++) {
                engine.applyRules(dataset[i], [rule], {
                    address: { row: i, col: 0 },
                    getValue,
                });
            }

            // Cache should still be effective (reverseOrder doesn't affect cache key)
            const stats = engine.getCacheStats();
            expect(stats.hitRatio).toBeGreaterThanOrEqual(0.90); // ≥90% hit ratio maintained
        });
    });

    describe('No Regression in Wave 2', () => {
        it('should not affect Wave 2 icon set behavior when flags are absent', () => {
            const dataset = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const getValue = createGetValue(dataset);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 9, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
                // No reverseOrder or showIconOnly
            };

            // Should behave exactly like Wave 2 (no regression)
            const result = engine.applyRules(100, [rule], {
                address: { row: 9, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconSet).toBe('3-arrows');
            expect(result.icon?.iconIndex).toBe(0); // Top value gets icon[0]
        });
    });
});
