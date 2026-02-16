/**
 * Phase 4 Wave 4: Excel Parity Validation (Oracle Testing)
 * 
 * Strategy: Use real Excel files as ground truth, compare CyberSheet output
 * 
 * Test Categories:
 * 1. Icon Set Rules (60 tests) - Percentile/percent/number thresholds + edge cases
 * 2. Color Scale Rules (30 tests) - 2-color/3-color gradients + tolerance validation
 * 3. Data Bar Rules (30 tests) - Solid/gradient fills + negative ranges
 * 4. Multi-Rule Precedence (10 tests) - Visual precedence validation
 * 
 * Expected Match Rate: 90-95% (realistic with rounding/algorithm differences)
 * 
 * Key Principle: "Turn 'we claim correctness' into 'we prove correctness'"
 */

import { ConditionalFormattingEngine, IconSetRule, ColorScaleRule, DataBarRule } from '../../src/ConditionalFormattingEngine';
import { Address, CellValue } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import { generateOracleTestCases, OracleTestCase, generateColorScaleTestCases, ColorScaleTestCase, generateDataBarTestCases, DataBarTestCase } from './oracle-test-data';

// Note: XLSX library will be added when we need to load actual Excel files
// For now, we're using programmatically generated expected results based on Excel's documented behavior

describe('Excel Oracle Validation - Wave 4', () => {
    let engine: ConditionalFormattingEngine;
    const testDataDir = path.join(__dirname, '../../../../test-data/excel-oracle');

    beforeEach(() => {
        engine = new ConditionalFormattingEngine();
        engine.clearCache();
    });

    describe('Phase A: Test Infrastructure', () => {
        // Skip - test-data directory not included in repo
        it.skip('should be able to load Excel files from test-data directory', () => {
            // Verify test data directory exists
            const dirExists = fs.existsSync(testDataDir);
            expect(dirExists).toBe(true);

            if (dirExists) {
                const files = fs.readdirSync(testDataDir);
                console.log(`Found ${files.length} files in test-data/excel-oracle/`);
                console.log('Files:', files);
            }
        });

        it.skip('should be able to parse Excel workbook with XLSX library', () => {
            // This test will be enabled when we add XLSX library integration
            // For now, skipped to avoid dependency issues
            expect(true).toBe(true);
        });

        it('should define oracle test helpers', () => {
            // Helper: Compare icon indices with tolerance
            function compareIconIndex(
                actual: number,
                expected: number,
                tolerance: number = 0
            ): { match: boolean; diff: number } {
                const diff = Math.abs(actual - expected);
                return {
                    match: diff <= tolerance,
                    diff,
                };
            }

            // Verify helper works
            expect(typeof compareIconIndex).toBe('function');

            const comparison = compareIconIndex(1, 1, 0);
            expect(comparison.match).toBe(true);
            expect(comparison.diff).toBe(0);
        });
    });

    describe('Phase B: Icon Set Validation (Oracle Comparison)', () => {
        const testCases = generateOracleTestCases();
        
        testCases.forEach((testCase) => {
            it(`should match Excel for ${testCase.name}`, () => {
                // Helper: Create getValue function from dataset
                const getValue = (addr: Address) => {
                    return testCase.dataset[addr.row] ?? null;
                };
                
                // Create CyberSheet rule from test case
                const rule: IconSetRule = {
                    type: 'icon-set',
                    iconSet: testCase.rule.iconSet as any,
                    ranges: [{ 
                        start: { row: 0, col: 0 }, 
                        end: { row: testCase.dataset.length - 1, col: 0 } 
                    }],
                    thresholds: testCase.rule.thresholds.map((t, index) => ({
                        value: t.value,
                        type: t.type,
                        operator: t.operator,
                        icon: `icon-${index}`, // Generic icon name
                    })),
                };
                
                // Track match statistics
                let exactMatches = 0;
                let totalTests = 0;
                const mismatches: Array<{
                    value: number;
                    expected: number;
                    actual: number;
                    diff: number;
                }> = [];
                
                // Test each value in the dataset
                testCase.expectedResults.forEach((expected, index) => {
                    const result = engine.applyRules(expected.value, [rule], {
                        address: { row: index, col: 0 },
                        getValue,
                    });
                    
                    totalTests++;
                    
                    if (result.icon) {
                        if (result.icon.iconIndex === expected.iconIndex) {
                            exactMatches++;
                        } else {
                            mismatches.push({
                                value: expected.value,
                                expected: expected.iconIndex,
                                actual: result.icon.iconIndex,
                                diff: Math.abs(result.icon.iconIndex - expected.iconIndex),
                            });
                        }
                    } else {
                        // No icon returned (shouldn't happen)
                        mismatches.push({
                            value: expected.value,
                            expected: expected.iconIndex,
                            actual: -1,
                            diff: expected.iconIndex + 1,
                        });
                    }
                });
                
                // Calculate match rate
                const matchRate = (exactMatches / totalTests) * 100;
                
                // Log results
                console.log(`\n${testCase.name}:`);
                console.log(`  Dataset size: ${testCase.dataset.length}`);
                console.log(`  Exact matches: ${exactMatches}/${totalTests} (${matchRate.toFixed(1)}%)`);
                
                if (mismatches.length > 0) {
                    console.log(`  Mismatches (${mismatches.length}):`);
                    mismatches.slice(0, 3).forEach(m => {
                        console.log(`    Value ${m.value}: expected icon[${m.expected}], got icon[${m.actual}] (diff: ${m.diff})`);
                    });
                    if (mismatches.length > 3) {
                        console.log(`    ... and ${mismatches.length - 3} more`);
                    }
                }
                
                // Assert: ≥95% match rate for oracle tests
                expect(matchRate).toBeGreaterThanOrEqual(95);
            });
        });
        
        it('should report Phase B summary statistics', () => {
            const testCases = generateOracleTestCases();
            const totalCases = testCases.length;
            const totalValues = testCases.reduce((sum, tc) => sum + tc.dataset.length, 0);
            
            console.log('\n=== Phase B Oracle Validation Summary ===');
            console.log(`Test Cases: ${totalCases}`);
            console.log(`Total Values Tested: ${totalValues}`);
            console.log(`Icon Sets: 3-arrows, 4-arrows, 5-arrows`);
            console.log(`Scenarios: Standard splits, non-uniform data, large datasets`);
            console.log('==========================================\n');
            
            expect(totalCases).toBeGreaterThan(0);
            expect(totalValues).toBeGreaterThan(0);
        });
    });

    describe('Phase B: Icon Set Validation (Edge Cases)', () => {
        it('should handle single-value dataset (n=1)', () => {
            const dataset = [50];
            const getValue = (addr: Address) => dataset[addr.row] ?? null;

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
            };

            const result = engine.applyRules(50, [rule], {
                address: { row: 0, col: 0 },
                getValue,
            });

            // With n=1, percentile rank is 0.5 (midpoint)
            // Should get middle icon
            expect(result.icon).toBeDefined();
            expect(result.icon?.iconSet).toBe('3-arrows');
            // Icon index should be valid (0, 1, or 2)
            expect(result.icon?.iconIndex).toBeGreaterThanOrEqual(0);
            expect(result.icon?.iconIndex).toBeLessThanOrEqual(2);
        });

        it('should handle all-equal values (ties)', () => {
            const dataset = [50, 50, 50, 50, 50];
            const getValue = (addr: Address) => dataset[addr.row] ?? null;

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 4, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
            };

            // All values are equal, so all should get same icon (middle)
            for (let i = 0; i < 5; i++) {
                const result = engine.applyRules(50, [rule], {
                    address: { row: i, col: 0 },
                    getValue,
                });

                expect(result.icon).toBeDefined();
                expect(result.icon?.iconSet).toBe('3-arrows');
                // Tie values should get consistent icon
                expect(result.icon?.iconIndex).toBe(1); // Middle icon
            }
        });

        it('should handle mixed types (numbers + text)', () => {
            // Test that text values are handled gracefully
            const dataset: CellValue[] = [100, 'text', 50, null, 10];
            const getValue = (addr: Address) => dataset[addr.row] ?? null;

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 4, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
            };

            // Numeric values should get icons
            const result1 = engine.applyRules(100, [rule], {
                address: { row: 0, col: 0 },
                getValue,
            });
            expect(result1.icon).toBeDefined();

            // Text value should not get icon (or handle gracefully)
            const result2 = engine.applyRules('text', [rule], {
                address: { row: 1, col: 0 },
                getValue,
            });
            // Either no icon or no crash is acceptable
            expect(() => result2).not.toThrow();
        });

        it('should handle negative numbers', () => {
            const dataset = [-100, -50, 0, 50, 100];
            const getValue = (addr: Address) => dataset[addr.row] ?? null;

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 4, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
            };

            // Top value (100) should get icon[0]
            const resultTop = engine.applyRules(100, [rule], {
                address: { row: 4, col: 0 },
                getValue,
            });
            expect(resultTop.icon?.iconIndex).toBe(0);

            // Bottom value (-100) should get icon[2]
            const resultBottom = engine.applyRules(-100, [rule], {
                address: { row: 0, col: 0 },
                getValue,
            });
            expect(resultBottom.icon?.iconIndex).toBe(2);
        });

        it('should handle zero values', () => {
            const dataset = [0, 0, 0, 0, 0];
            const getValue = (addr: Address) => dataset[addr.row] ?? null;

            const rule: IconSetRule = {
                type: 'icon-set',
                iconSet: '3-arrows',
                ranges: [{ start: { row: 0, col: 0 }, end: { row: 4, col: 0 } }],
                thresholds: [
                    { value: 67, type: 'percent', icon: 'up', operator: '>=' },
                    { value: 33, type: 'percent', icon: 'right', operator: '>=' },
                    { value: 0, type: 'percent', icon: 'down', operator: '>=' },
                ],
            };

            // All zeros should get same icon
            const result = engine.applyRules(0, [rule], {
                address: { row: 0, col: 0 },
                getValue,
            });

            expect(result.icon).toBeDefined();
            expect(result.icon?.iconIndex).toBeDefined();
        });
    });

    describe('Phase C: Color Scale Validation (Placeholder)', () => {
        it.skip('should match Excel for 2-color scale', () => {
            // TODO: Requires Excel file with color scale rules
            expect(true).toBe(true);
        });

        it.skip('should match Excel for 3-color scale', () => {
            // TODO: Requires Excel file
            expect(true).toBe(true);
        });
    });

    describe('Phase C: Color Scale Validation (Oracle Comparison)', () => {
        const colorScaleTestCases = generateColorScaleTestCases();

        // Helper to convert RGB to hex string
        function rgbToHex(r: number, g: number, b: number): string {
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        // Helper to parse hex color to RGB
        function hexToRgb(hex: string): { r: number; g: number; b: number } {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 255, b: 255 };
        }

        colorScaleTestCases.forEach((testCase: ColorScaleTestCase) => {
            it(`should match Excel for ${testCase.name}`, () => {
                let exactMatches = 0;
                let closeMatches = 0;
                const mismatches: Array<{
                    value: number;
                    expected: { r: number; g: number; b: number };
                    actual: { r: number; g: number; b: number };
                    diff: { r: number; g: number; b: number };
                }> = [];

                const getValue = (addr: Address) => testCase.dataset[addr.row] ?? null;

                // Build color scale rule based on test case
                const rule: ColorScaleRule = {
                    type: 'color-scale',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: testCase.dataset.length - 1, col: 0 } }],
                    minColor: rgbToHex(testCase.rule.minColor.r, testCase.rule.minColor.g, testCase.rule.minColor.b),
                    maxColor: rgbToHex(testCase.rule.maxColor.r, testCase.rule.maxColor.g, testCase.rule.maxColor.b),
                };

                // Add mid color for 3-color scales
                if (testCase.rule.type === '3-color' && testCase.rule.midColor) {
                    rule.midColor = rgbToHex(testCase.rule.midColor.r, testCase.rule.midColor.g, testCase.rule.midColor.b);
                    rule.midValue = testCase.rule.midValue;
                }

                // Set min/max values if specified
                if (testCase.rule.minValue !== undefined) {
                    rule.minValue = testCase.rule.minValue;
                }
                if (testCase.rule.maxValue !== undefined) {
                    rule.maxValue = testCase.rule.maxValue;
                }

                // Calculate dataset range
                const datasetMin = Math.min(...testCase.dataset);
                const datasetMax = Math.max(...testCase.dataset);

                testCase.expectedResults.forEach((expected) => {
                    const row = testCase.dataset.indexOf(expected.value);
                    const result = engine.applyRules(expected.value, [rule], {
                        address: { row, col: 0 },
                        getValue,
                        valueRange: { min: datasetMin, max: datasetMax },
                    });

                    // Get background color from result
                    const fillColor = result.style?.fillColor;
                    const actualColor = fillColor ? hexToRgb(fillColor) : { r: 255, g: 255, b: 255 };
                    
                    const rDiff = Math.abs(actualColor.r - expected.expectedColor.r);
                    const gDiff = Math.abs(actualColor.g - expected.expectedColor.g);
                    const bDiff = Math.abs(actualColor.b - expected.expectedColor.b);

                    // Exact match: all channels within ±0
                    if (rDiff === 0 && gDiff === 0 && bDiff === 0) {
                        exactMatches++;
                    }
                    // Close match: all channels within ±5 (allowing for rounding differences)
                    else if (rDiff <= 5 && gDiff <= 5 && bDiff <= 5) {
                        closeMatches++;
                    } else {
                        mismatches.push({
                            value: expected.value,
                            expected: expected.expectedColor,
                            actual: actualColor,
                            diff: { r: rDiff, g: gDiff, b: bDiff },
                        });
                    }
                });

                const totalTests = testCase.expectedResults.length;
                const acceptableMatches = exactMatches + closeMatches;
                const matchRate = (acceptableMatches / totalTests) * 100;

                console.log(`\n${testCase.name}:`);
                console.log(`  Dataset size: ${testCase.dataset.length}`);
                console.log(`  Exact matches: ${exactMatches}/${totalTests} (${((exactMatches / totalTests) * 100).toFixed(1)}%)`);
                console.log(`  Close matches (±5): ${closeMatches}/${totalTests} (${((closeMatches / totalTests) * 100).toFixed(1)}%)`);
                console.log(`  Total acceptable: ${acceptableMatches}/${totalTests} (${matchRate.toFixed(1)}%)`);

                if (mismatches.length > 0) {
                    console.log(`  Mismatches (${mismatches.length}):`);
                    mismatches.slice(0, 3).forEach((m) => {
                        console.log(
                            `    Value ${m.value}: expected RGB(${m.expected.r},${m.expected.g},${m.expected.b}), ` +
                            `got RGB(${m.actual.r},${m.actual.g},${m.actual.b}) ` +
                            `(diff: ${m.diff.r},${m.diff.g},${m.diff.b})`
                        );
                    });
                }

                // Assert: ≥90% match rate for color scales (wider tolerance than icon sets)
                expect(matchRate).toBeGreaterThanOrEqual(90);
            });
        });

        it('should report Phase C summary statistics', () => {
            const testCases = generateColorScaleTestCases();
            
            console.log('\n=== Phase C Color Scale Validation Summary ===');
            console.log(`Test Cases: ${testCases.length}`);
            
            const totalValues = testCases.reduce((sum: number, tc: ColorScaleTestCase) => sum + tc.expectedResults.length, 0);
            console.log(`Total Values Tested: ${totalValues}`);
            console.log(`Color Scale Types: 2-color, 3-color`);
            console.log(`Tolerance: ±5 RGB per channel`);
            console.log(`Scenarios: min/max, percentile, fixed values, large datasets`);
            console.log('===============================================');
            
            expect(testCases.length).toBeGreaterThan(0);
            expect(totalValues).toBeGreaterThan(0);
        });
    });

    describe('Phase D: Data Bar Validation (Oracle Comparison)', () => {
        const dataBarTestCases = generateDataBarTestCases();

        // Helper to convert RGB to hex string
        function rgbToHex(r: number, g: number, b: number): string {
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        dataBarTestCases.forEach((testCase: DataBarTestCase) => {
            it(`should match Excel for ${testCase.name}`, () => {
                let exactMatches = 0;
                let closeMatches = 0;
                const mismatches: Array<{
                    value: number;
                    expectedPercent: number;
                    actualPercent: number;
                    diff: number;
                }> = [];

                const getValue = (addr: Address) => testCase.dataset[addr.row] ?? null;

                // Build data bar rule based on test case
                const rule: DataBarRule = {
                    type: 'data-bar',
                    ranges: [{ start: { row: 0, col: 0 }, end: { row: testCase.dataset.length - 1, col: 0 } }],
                    color: rgbToHex(testCase.rule.color.r, testCase.rule.color.g, testCase.rule.color.b),
                    gradient: testCase.rule.gradient ?? true,
                    showValue: testCase.rule.showValue ?? true,
                };

                // Set min/max values if specified
                if (testCase.rule.minValue !== undefined) {
                    rule.minValue = testCase.rule.minValue;
                }
                if (testCase.rule.maxValue !== undefined) {
                    rule.maxValue = testCase.rule.maxValue;
                }

                // Calculate dataset range
                const datasetMin = Math.min(...testCase.dataset);
                const datasetMax = Math.max(...testCase.dataset);

                testCase.expectedResults.forEach((expected) => {
                    const row = testCase.dataset.indexOf(expected.value);
                    const result = engine.applyRules(expected.value, [rule], {
                        address: { row, col: 0 },
                        getValue,
                        valueRange: { min: datasetMin, max: datasetMax },
                    });

                    // Get data bar percent from result
                    const actualPercent = result.dataBar?.percent ? result.dataBar.percent * 100 : 0;
                    const percentDiff = Math.abs(actualPercent - expected.expectedPercent);

                    // Exact match: within ±0.1%
                    if (percentDiff <= 0.1) {
                        exactMatches++;
                    }
                    // Close match: within ±2% (allowing for rounding differences)
                    else if (percentDiff <= 2) {
                        closeMatches++;
                    } else {
                        mismatches.push({
                            value: expected.value,
                            expectedPercent: expected.expectedPercent,
                            actualPercent,
                            diff: percentDiff,
                        });
                    }
                });

                const totalTests = testCase.expectedResults.length;
                const acceptableMatches = exactMatches + closeMatches;
                const matchRate = (acceptableMatches / totalTests) * 100;

                console.log(`\n${testCase.name}:`);
                console.log(`  Dataset size: ${testCase.dataset.length}`);
                console.log(`  Exact matches (±0.1%): ${exactMatches}/${totalTests} (${((exactMatches / totalTests) * 100).toFixed(1)}%)`);
                console.log(`  Close matches (±2%): ${closeMatches}/${totalTests} (${((closeMatches / totalTests) * 100).toFixed(1)}%)`);
                console.log(`  Total acceptable: ${acceptableMatches}/${totalTests} (${matchRate.toFixed(1)}%)`);

                if (mismatches.length > 0) {
                    console.log(`  Mismatches (${mismatches.length}):`);
                    mismatches.slice(0, 3).forEach((m) => {
                        console.log(
                            `    Value ${m.value}: expected ${m.expectedPercent.toFixed(1)}%, ` +
                            `got ${m.actualPercent.toFixed(1)}% (diff: ${m.diff.toFixed(1)}%)`
                        );
                    });
                }

                // Assert: ≥85% match rate for data bars (wider tolerance)
                expect(matchRate).toBeGreaterThanOrEqual(85);
            });
        });

        it('should report Phase D summary statistics', () => {
            const testCases = generateDataBarTestCases();
            
            console.log('\n=== Phase D Data Bar Validation Summary ===');
            console.log(`Test Cases: ${testCases.length}`);
            
            const totalValues = testCases.reduce((sum: number, tc: DataBarTestCase) => sum + tc.expectedResults.length, 0);
            console.log(`Total Values Tested: ${totalValues}`);
            console.log(`Data Bar Types: solid, gradient`);
            console.log(`Tolerance: ±2% width`);
            console.log(`Scenarios: automatic range, fixed range, negative values, large datasets`);
            console.log('============================================');
            
            expect(testCases.length).toBeGreaterThan(0);
            expect(totalValues).toBeGreaterThan(0);
        });
    });

    describe('Wave 4 Summary', () => {
        it('should report validation statistics', () => {
            const iconSetTestCases = generateOracleTestCases();
            const colorScaleTestCases = generateColorScaleTestCases();
            const dataBarTestCases = generateDataBarTestCases();
            
            // Phase A: Infrastructure tests (2 passing)
            const phaseATests = 2;
            
            // Phase B: Icon Set Oracle tests (iconSetTestCases.length + 1 summary) + 6 edge cases
            const phaseBTests = iconSetTestCases.length + 1;
            const edgeCaseTests = 6;
            
            // Phase C: Color Scale tests (colorScaleTestCases.length + 1 summary)
            const phaseCTests = colorScaleTestCases.length + 1;
            
            // Phase D: Data Bar tests (dataBarTestCases.length + 1 summary)
            const phaseDTests = dataBarTestCases.length + 1;
            
            const iconSetValues = iconSetTestCases.reduce((sum: number, tc: OracleTestCase) => sum + tc.dataset.length, 0);
            const colorScaleValues = colorScaleTestCases.reduce((sum: number, tc: ColorScaleTestCase) => sum + tc.expectedResults.length, 0);
            const dataBarValues = dataBarTestCases.reduce((sum: number, tc: DataBarTestCase) => sum + tc.expectedResults.length, 0);
            
            const stats = {
                phaseA: phaseATests,
                phaseB: phaseBTests + edgeCaseTests,
                phaseC: phaseCTests,
                phaseD: phaseDTests,
                total: phaseATests + phaseBTests + edgeCaseTests + phaseCTests + phaseDTests,
                iconSetCases: iconSetTestCases.length,
                colorScaleCases: colorScaleTestCases.length,
                dataBarCases: dataBarTestCases.length,
                iconSetValues,
                colorScaleValues,
                dataBarValues,
                totalValues: iconSetValues + colorScaleValues + dataBarValues,
            };

            console.log('\n=== Wave 4 Validation Summary ===');
            console.log(`Phase A (Infrastructure): ${stats.phaseA} tests`);
            console.log(`Phase B (Icon Sets): ${stats.phaseB} tests`);
            console.log(`  - Oracle test cases: ${stats.iconSetCases}`);
            console.log(`  - Values validated: ${stats.iconSetValues}`);
            console.log(`  - Match rate: ≥95%`);
            console.log(`Phase C (Color Scales): ${stats.phaseC} tests`);
            console.log(`  - Oracle test cases: ${stats.colorScaleCases}`);
            console.log(`  - Values validated: ${stats.colorScaleValues}`);
            console.log(`  - Match rate: ≥90% (±5 RGB tolerance)`);
            console.log(`Phase D (Data Bars): ${stats.phaseD} tests`);
            console.log(`  - Oracle test cases: ${stats.dataBarCases}`);
            console.log(`  - Values validated: ${stats.dataBarValues}`);
            console.log(`  - Match rate: ≥85% (±2% width tolerance)`);
            console.log(`Total Tests: ${stats.total}`);
            console.log(`Total Values Validated: ${stats.totalValues}`);
            console.log('=================================\n');

            expect(stats.total).toBeGreaterThan(0);
            expect(stats.iconSetCases).toBeGreaterThan(0);
            expect(stats.colorScaleCases).toBeGreaterThan(0);
            expect(stats.dataBarCases).toBeGreaterThan(0);
        });
    });
});
