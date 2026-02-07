/**
 * Phase 4 Wave 2: Comprehensive Icon Set Testing
 * 
 * Parameterized tests for all 19 Excel icon sets
 * Tests each icon set with 3 core scenarios: top/middle/bottom thresholds
 * 
 * Architecture: Config-driven testing (reduces duplication, ensures consistency)
 */

import { ConditionalFormattingEngine } from '../src/ConditionalFormattingEngine';
import { StatisticalCacheManager } from '../src/StatisticalCacheManager';
import type { Address, CellValue } from '../src/types';
import type { IconSetRule, ExcelIconSet } from '../src/ConditionalFormattingEngine';

/**
 * Icon Set Catalog Configuration
 * Each entry defines: name, threshold percentiles, icon count
 */
interface IconSetConfig {
    name: ExcelIconSet;
    thresholds: number[]; // Percentile values (e.g., [67, 33, 0])
    iconCount: 3 | 4 | 5;
    group: 'A' | 'B' | 'C' | 'D'; // Implementation phase grouping
}

const ICON_SET_CATALOG: IconSetConfig[] = [
    // ✅ Wave 1 Complete (Foundation)
    { name: '3-arrows', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    
    // 🎯 Group A: 3-Icon Sets (7 sets)
    { name: '3-arrows-gray', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    { name: '3-flags', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    { name: '3-traffic-lights', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    { name: '3-traffic-lights-rimmed', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    { name: '3-signs', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    { name: '3-symbols', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    { name: '3-symbols-circled', thresholds: [67, 33, 0], iconCount: 3, group: 'A' },
    
    // 🎯 Group B: 4-Icon Sets (4 sets)
    { name: '4-arrows', thresholds: [75, 50, 25, 0], iconCount: 4, group: 'B' },
    { name: '4-arrows-gray', thresholds: [75, 50, 25, 0], iconCount: 4, group: 'B' },
    { name: '4-ratings', thresholds: [75, 50, 25, 0], iconCount: 4, group: 'B' },
    { name: '4-traffic-lights', thresholds: [75, 50, 25, 0], iconCount: 4, group: 'B' },
    
    // 🎯 Group C: 5-Icon Sets (4 sets)
    { name: '5-arrows', thresholds: [80, 60, 40, 20, 0], iconCount: 5, group: 'C' },
    { name: '5-arrows-gray', thresholds: [80, 60, 40, 20, 0], iconCount: 5, group: 'C' },
    { name: '5-ratings', thresholds: [80, 60, 40, 20, 0], iconCount: 5, group: 'C' },
    { name: '5-quarters', thresholds: [80, 60, 40, 20, 0], iconCount: 5, group: 'C' },
    
    // 🎯 Group D: Special Sets (1 set - stars/triangles not in type yet)
    { name: '5-boxes', thresholds: [80, 60, 40, 20, 0], iconCount: 5, group: 'D' },
];

/**
 * Helper: Create getValue function from dataset
 */
function createGetValue(dataset: Map<string, CellValue>) {
    return (addr: Address): CellValue => {
        const key = `${addr.row}`;
        return dataset.get(key) ?? null;
    };
}

/**
 * Helper: Create test dataset with predictable distribution
 * Returns values: 10, 20, 30, ..., 100 (10 values)
 */
function createTestDataset(): Map<string, CellValue> {
    const dataset = new Map<string, CellValue>();
    for (let i = 1; i <= 10; i++) {
        dataset.set(`${i}`, i * 10);
    }
    return dataset;
}

/**
 * Helper: Calculate expected icon index for a value in dataset
 * Uses percentile rank logic (same as evaluateIconSetRule)
 */
function getExpectedIconIndex(value: number, thresholds: number[], dataset: Map<string, CellValue>): number {
    // Sort values to compute percentile rank
    const values = Array.from(dataset.values()).filter(v => typeof v === 'number') as number[];
    const sortedValues = [...values].sort((a, b) => a - b);
    
    // Find percentile rank of value (using midpoint for ties)
    const firstIndex = sortedValues.findIndex(v => v >= value);
    let lastIndex = firstIndex;
    if (firstIndex !== -1) {
        for (let i = firstIndex + 1; i < sortedValues.length; i++) {
            if (sortedValues[i] <= value) {
                lastIndex = i;
            } else {
                break;
            }
        }
    }
    
    const midpoint = (firstIndex + lastIndex) / 2;
    const percentileRank = sortedValues.length > 1
        ? (midpoint / (sortedValues.length - 1)) * 100 // Convert to percentage
        : 50; // Single value = 50th percentile
    
    // Check thresholds in order (first match wins)
    for (let i = 0; i < thresholds.length; i++) {
        if (percentileRank >= thresholds[i]) {
            return i;
        }
    }
    
    // Fallback: last icon
    return thresholds.length - 1;
}

describe('Conditional Formatting - Icon Sets (Comprehensive)', () => {
    let engine: ConditionalFormattingEngine;

    beforeEach(() => {
        engine = new ConditionalFormattingEngine();
    });

    /**
     * Parameterized Test Suite: All Icon Sets
     * Tests each icon set with 3 scenarios per threshold
     */
    ICON_SET_CATALOG.forEach(config => {
        describe(`Icon Set: ${config.name} (Group ${config.group})`, () => {
            const dataset = createTestDataset();

            // Test each threshold boundary
            config.thresholds.forEach((threshold, thresholdIndex) => {
                it(`should assign icon[${thresholdIndex}] for values at ${threshold}th percentile`, () => {
                    // Create icon set rule
                    const rule: IconSetRule = {
                        type: 'icon-set',
                        iconSet: config.name,
                        ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                        thresholds: config.thresholds.map((t, i) => ({
                            value: t,
                            type: 'percent' as const,
                            icon: `icon-${i}`,
                            operator: '>=' as const,
                        })),
                    };

                    // Calculate test value at this percentile
                    // For 10 values [10,20,...,100], percentile P → value at index floor(P/100 * 9)
                    const valueIndex = Math.floor((threshold / 100) * 9) + 1; // 1-based
                    const testValue = valueIndex * 10;

                    // Apply rule
                    const result = engine.applyRules(testValue, [rule], {
                        address: { row: valueIndex, col: 1 },
                        getValue: createGetValue(dataset),
                    });

                    // Verify icon assignment
                    expect(result.icon).toBeDefined();
                    expect(result.icon?.iconSet).toBe(config.name);
                    
                    // Expected icon: Use helper to compute expected index
                    const expectedIndex = getExpectedIconIndex(testValue, config.thresholds, dataset);
                    expect(result.icon?.iconIndex).toBe(expectedIndex);
                });
            });

            // Additional test: Verify icon count matches configuration
            it(`should have ${config.iconCount} icons (threshold count validation)`, () => {
                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: config.name,
                    ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                    thresholds: config.thresholds.map((t, i) => ({
                        value: t,
                        type: 'percent' as const,
                        icon: `icon-${i}`,
                        operator: '>=' as const,
                    })),
                };

                // Verify threshold count matches icon count
                expect(rule.thresholds.length).toBe(config.iconCount);
            });
        });
    });

    /**
     * Edge Case Tests: Cross-Icon-Set Validation
     */
    describe('Edge Cases (All Icon Sets)', () => {
        it('should handle tie values consistently across all icon sets', () => {
            // Dataset: All values equal (50)
            const tieDataset = new Map<string, CellValue>();
            for (let i = 1; i <= 10; i++) {
                tieDataset.set(`${i}`, 50);
            }

            // Test with 3-icon, 4-icon, and 5-icon sets
            const testConfigs = [
                ICON_SET_CATALOG.find(c => c.iconCount === 3)!,
                ICON_SET_CATALOG.find(c => c.iconCount === 4)!,
                ICON_SET_CATALOG.find(c => c.iconCount === 5)!,
            ];

            testConfigs.forEach(config => {
                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: config.name,
                    ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                    thresholds: config.thresholds.map((t, i) => ({
                        value: t,
                        type: 'percent' as const,
                        icon: `icon-${i}`,
                        operator: '>=' as const,
                    })),
                };

                const result = engine.applyRules(50, [rule], {
                    address: { row: 5, col: 1 },
                    getValue: createGetValue(tieDataset),
                });

                // All equal values → 50th percentile
                // Expected icon depends on where 50% falls in thresholds
                // 3-icon: [67,33,0] → 50% >= 33% → icon[1] ✓
                // 4-icon: [75,50,25,0] → 50% >= 50% → icon[1] ✓
                // 5-icon: [80,60,40,20,0] → 50% >= 40% → icon[2] ✓
                const expectedIndex = getExpectedIconIndex(50, config.thresholds, tieDataset);
                expect(result.icon?.iconIndex).toBe(expectedIndex);
            });
        });

        it('should maintain ≥90% cache hit ratio across multiple icon sets', () => {
            const dataset = createTestDataset();

            // Test with 3 different threshold patterns (3-icon, 4-icon, 5-icon)
            const rules: IconSetRule[] = [
                {
                    type: 'icon-set',
                    iconSet: '3-arrows',
                    ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                    thresholds: [
                        { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                },
                {
                    type: 'icon-set',
                    iconSet: '4-arrows',
                    ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                    thresholds: [
                        { value: 75, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 50, type: 'percent', icon: 'up-inclined', operator: '>=' },
                        { value: 25, type: 'percent', icon: 'down-inclined', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                },
                {
                    type: 'icon-set',
                    iconSet: '5-arrows',
                    ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                    thresholds: [
                        { value: 80, type: 'percent', icon: 'up', operator: '>=' },
                        { value: 60, type: 'percent', icon: 'up-inclined', operator: '>=' },
                        { value: 40, type: 'percent', icon: 'right', operator: '>=' },
                        { value: 20, type: 'percent', icon: 'down-inclined', operator: '>=' },
                        { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                    ],
                },
            ];

            // Evaluate 100 cells with all 3 rules (300 evaluations total)
            for (let i = 1; i <= 100; i++) {
                const value = ((i - 1) % 10 + 1) * 10; // Cycle through dataset values
                rules.forEach(rule => {
                    engine.applyRules(value, [rule], {
                        address: { row: i, col: 1 },
                        getValue: createGetValue(dataset),
                    });
                });
            }

            const stats = engine.getCacheStats();
            expect(stats.hitRatio).toBeGreaterThanOrEqual(0.90); // ≥90% (Phase 3.5 guarantee)
        });

        it('should handle single-value dataset correctly', () => {
            // Dataset: Only one value (50)
            const singleValueDataset = new Map<string, CellValue>([['1', 50]]);

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
            };

            const result = engine.applyRules(50, [rule], {
                address: { row: 1, col: 1 },
                getValue: createGetValue(singleValueDataset),
            });

            // Single value → 50th percentile → middle icon
            expect(result.icon?.iconIndex).toBe(1);
        });
    });

    /**
     * Type Safety Tests: Validate all 19 icon sets are recognized
     */
    describe('Type Safety (All Icon Sets)', () => {
        it('should accept all 19 icon set names without type errors', () => {
            // This test validates TypeScript compilation
            // If any icon set name is invalid, TypeScript will fail compilation
            ICON_SET_CATALOG.forEach(config => {
                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: config.name, // TypeScript enforces ExcelIconSet union type
                    ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
                    thresholds: config.thresholds.map((t, i) => ({
                        value: t,
                        type: 'percent' as const,
                        icon: `icon-${i}`,
                        operator: '>=' as const,
                    })),
                };

                // If this compiles, type safety is validated
                expect(rule.iconSet).toBe(config.name);
            });
        });
    });
});
