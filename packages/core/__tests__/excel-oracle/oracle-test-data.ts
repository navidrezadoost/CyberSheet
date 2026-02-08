/**
 * Phase B: Generate Test Data for Icon Set Oracle Validation
 * 
 * Since creating actual Excel files with CF rules is complex,
 * we'll generate expected results data based on Excel's documented behavior.
 * 
 * This simulates what Excel would output for various datasets and rules.
 */

export interface OracleExpectedResult {
    value: number;
    iconSet: string;
    iconIndex: number;
    percentileRank?: number;
}

export interface OracleTestCase {
    name: string;
    description: string;
    dataset: number[];
    rule: {
        iconSet: string;
        thresholds: Array<{
            value: number;
            type: 'percent' | 'percentile' | 'number';
            operator: '>=' | '>' | '<=' | '<' | '=';
        }>;
    };
    expectedResults: OracleExpectedResult[];
}

/**
 * Excel's percentile calculation (PERCENTILE.INC method)
 * Formula: rank = (position - 1) / (n - 1)
 * For midpoint of tied values: use average of first and last occurrence
 */
function calculateExcelPercentileRank(value: number, sortedDataset: number[]): number {
    const n = sortedDataset.length;
    
    if (n === 1) {
        return 0.5; // Single value: midpoint
    }
    
    // Find first occurrence
    const firstIndex = sortedDataset.findIndex(v => v >= value);
    if (firstIndex === -1) {
        return value > sortedDataset[n - 1] ? 1.0 : 0.0;
    }
    
    // Find last occurrence of same value
    let lastIndex = firstIndex;
    for (let i = firstIndex + 1; i < n; i++) {
        if (sortedDataset[i] === value) {
            lastIndex = i;
        } else {
            break;
        }
    }
    
    // Use midpoint for ties
    const midpoint = (firstIndex + lastIndex) / 2;
    return midpoint / (n - 1);
}

/**
 * Determine icon index based on percentile rank and thresholds
 * Excel logic: First matching threshold (top to bottom)
 */
function getIconIndex(percentileRank: number, thresholds: number[]): number {
    const percentValue = percentileRank * 100;
    
    for (let i = 0; i < thresholds.length; i++) {
        if (percentValue >= thresholds[i]) {
            return i;
        }
    }
    
    return thresholds.length - 1;
}

/**
 * Generate Oracle Test Cases
 * These represent what Excel SHOULD output for various scenarios
 */
export function generateOracleTestCases(): OracleTestCase[] {
    const testCases: OracleTestCase[] = [];
    
    // Test Case 1: 3-Arrows with standard 67/33/0 split
    testCases.push({
        name: '3-arrows-percentile-standard',
        description: 'Standard 3-arrow icon set with 67%, 33%, 0% thresholds',
        dataset: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        rule: {
            iconSet: '3-arrows',
            thresholds: [
                { value: 67, type: 'percent', operator: '>=' },
                { value: 33, type: 'percent', operator: '>=' },
                { value: 0, type: 'percent', operator: '>=' },
            ],
        },
        expectedResults: [
            { value: 100, iconSet: '3-arrows', iconIndex: 0 }, // Top 33% → up-arrow
            { value: 90, iconSet: '3-arrows', iconIndex: 0 },
            { value: 80, iconSet: '3-arrows', iconIndex: 0 },
            { value: 70, iconSet: '3-arrows', iconIndex: 1 }, // Middle 33% → right-arrow
            { value: 60, iconSet: '3-arrows', iconIndex: 1 },
            { value: 50, iconSet: '3-arrows', iconIndex: 1 },
            { value: 40, iconSet: '3-arrows', iconIndex: 1 },
            { value: 30, iconSet: '3-arrows', iconIndex: 2 }, // Bottom 33% → down-arrow
            { value: 20, iconSet: '3-arrows', iconIndex: 2 },
            { value: 10, iconSet: '3-arrows', iconIndex: 2 },
        ],
    });
    
    // Test Case 2: 4-Arrows with 75/50/25/0 split
    testCases.push({
        name: '4-arrows-percentile-standard',
        description: 'Standard 4-arrow icon set with 75%, 50%, 25%, 0% thresholds',
        dataset: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        rule: {
            iconSet: '4-arrows',
            thresholds: [
                { value: 75, type: 'percent', operator: '>=' },
                { value: 50, type: 'percent', operator: '>=' },
                { value: 25, type: 'percent', operator: '>=' },
                { value: 0, type: 'percent', operator: '>=' },
            ],
        },
        expectedResults: [
            { value: 100, iconSet: '4-arrows', iconIndex: 0 }, // 100%: ≥75%
            { value: 90, iconSet: '4-arrows', iconIndex: 0 },  // 88.9%: ≥75%
            { value: 80, iconSet: '4-arrows', iconIndex: 0 },  // 77.8%: ≥75%
            { value: 70, iconSet: '4-arrows', iconIndex: 1 },  // 66.7%: ≥50%
            { value: 60, iconSet: '4-arrows', iconIndex: 1 },  // 55.6%: ≥50%
            { value: 50, iconSet: '4-arrows', iconIndex: 2 },  // 44.4%: ≥25%
            { value: 40, iconSet: '4-arrows', iconIndex: 2 },  // 33.3%: ≥25%
            { value: 30, iconSet: '4-arrows', iconIndex: 3 },  // 22.2%: ≥0% (NOT ≥25%)
            { value: 20, iconSet: '4-arrows', iconIndex: 3 },  // 11.1%: ≥0%
            { value: 10, iconSet: '4-arrows', iconIndex: 3 },  // 0%: ≥0%
        ],
    });
    
    // Test Case 3: 5-Arrows with 80/60/40/20/0 split
    testCases.push({
        name: '5-arrows-percentile-standard',
        description: 'Standard 5-arrow icon set with 80%, 60%, 40%, 20%, 0% thresholds',
        dataset: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        rule: {
            iconSet: '5-arrows',
            thresholds: [
                { value: 80, type: 'percent', operator: '>=' },
                { value: 60, type: 'percent', operator: '>=' },
                { value: 40, type: 'percent', operator: '>=' },
                { value: 20, type: 'percent', operator: '>=' },
                { value: 0, type: 'percent', operator: '>=' },
            ],
        },
        expectedResults: [
            { value: 100, iconSet: '5-arrows', iconIndex: 0 }, // Top 20%
            { value: 90, iconSet: '5-arrows', iconIndex: 0 },
            { value: 80, iconSet: '5-arrows', iconIndex: 1 }, // 60-80%
            { value: 70, iconSet: '5-arrows', iconIndex: 1 },
            { value: 60, iconSet: '5-arrows', iconIndex: 2 }, // 40-60%
            { value: 50, iconSet: '5-arrows', iconIndex: 2 },
            { value: 40, iconSet: '5-arrows', iconIndex: 3 }, // 20-40%
            { value: 30, iconSet: '5-arrows', iconIndex: 3 },
            { value: 20, iconSet: '5-arrows', iconIndex: 4 }, // Bottom 20%
            { value: 10, iconSet: '5-arrows', iconIndex: 4 },
        ],
    });
    
    // Test Case 4: Non-uniform dataset (realistic data)
    testCases.push({
        name: '3-arrows-non-uniform',
        description: '3-arrow with non-uniform dataset (realistic scenario)',
        dataset: [5, 12, 18, 25, 45, 67, 89, 92, 98, 100],
        rule: {
            iconSet: '3-arrows',
            thresholds: [
                { value: 67, type: 'percent', operator: '>=' },
                { value: 33, type: 'percent', operator: '>=' },
                { value: 0, type: 'percent', operator: '>=' },
            ],
        },
        expectedResults: [
            { value: 100, iconSet: '3-arrows', iconIndex: 0 },
            { value: 98, iconSet: '3-arrows', iconIndex: 0 },
            { value: 92, iconSet: '3-arrows', iconIndex: 0 },
            { value: 89, iconSet: '3-arrows', iconIndex: 1 },
            { value: 67, iconSet: '3-arrows', iconIndex: 1 },
            { value: 45, iconSet: '3-arrows', iconIndex: 1 },
            { value: 25, iconSet: '3-arrows', iconIndex: 1 },
            { value: 18, iconSet: '3-arrows', iconIndex: 2 },
            { value: 12, iconSet: '3-arrows', iconIndex: 2 },
            { value: 5, iconSet: '3-arrows', iconIndex: 2 },
        ],
    });
    
    // Test Case 5: Large dataset (100 values)
    const largeDataset = Array.from({ length: 100 }, (_, i) => i + 1);
    testCases.push({
        name: '3-arrows-large-dataset',
        description: '3-arrow with large dataset (100 values)',
        dataset: largeDataset,
        rule: {
            iconSet: '3-arrows',
            thresholds: [
                { value: 67, type: 'percent', operator: '>=' },
                { value: 33, type: 'percent', operator: '>=' },
                { value: 0, type: 'percent', operator: '>=' },
            ],
        },
        expectedResults: [
            { value: 100, iconSet: '3-arrows', iconIndex: 0 }, // Top
            { value: 75, iconSet: '3-arrows', iconIndex: 0 },
            { value: 50, iconSet: '3-arrows', iconIndex: 1 }, // Middle
            { value: 25, iconSet: '3-arrows', iconIndex: 2 }, // Bottom
            { value: 1, iconSet: '3-arrows', iconIndex: 2 },
        ],
    });
    
    return testCases;
}

/**
 * Calculate expected results for a test case
 * This simulates Excel's behavior
 */
export function calculateExpectedResults(testCase: OracleTestCase): OracleExpectedResult[] {
    const sorted = [...testCase.dataset].sort((a, b) => a - b);
    const results: OracleExpectedResult[] = [];
    
    for (const value of testCase.dataset) {
        const percentileRank = calculateExcelPercentileRank(value, sorted);
        const thresholds = testCase.rule.thresholds.map(t => t.value);
        const iconIndex = getIconIndex(percentileRank, thresholds);
        
        results.push({
            value,
            iconSet: testCase.rule.iconSet,
            iconIndex,
            percentileRank,
        });
    }
    
    return results;
}

// ============================================================================
// Phase C: Color Scale Oracle Test Data
// ============================================================================

export interface ColorScaleExpectedResult {
    value: number;
    expectedColor: {
        r: number;
        g: number;
        b: number;
    };
    percentileRank?: number;
}

export interface ColorScaleTestCase {
    name: string;
    description: string;
    dataset: number[];
    rule: {
        type: '2-color' | '3-color';
        minColor: { r: number; g: number; b: number };
        midColor?: { r: number; g: number; b: number };
        maxColor: { r: number; g: number; b: number };
        minType: 'min' | 'percent' | 'percentile' | 'number';
        midType?: 'percent' | 'percentile' | 'number';
        maxType: 'max' | 'percent' | 'percentile' | 'number';
        minValue?: number;
        midValue?: number;
        maxValue?: number;
    };
    expectedResults: ColorScaleExpectedResult[];
}

/**
 * Linear interpolation between two values
 */
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Interpolate color between min and max (2-color scale)
 */
function interpolate2Color(
    value: number,
    min: number,
    max: number,
    minColor: { r: number; g: number; b: number },
    maxColor: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
    if (max === min) {
        return { ...minColor };
    }
    
    const t = (value - min) / (max - min);
    const clampedT = Math.max(0, Math.min(1, t));
    
    return {
        r: Math.round(lerp(minColor.r, maxColor.r, clampedT)),
        g: Math.round(lerp(minColor.g, maxColor.g, clampedT)),
        b: Math.round(lerp(minColor.b, maxColor.b, clampedT)),
    };
}

/**
 * Interpolate color between min, mid, and max (3-color scale)
 */
function interpolate3Color(
    value: number,
    min: number,
    mid: number,
    max: number,
    minColor: { r: number; g: number; b: number },
    midColor: { r: number; g: number; b: number },
    maxColor: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
    if (value <= mid) {
        return interpolate2Color(value, min, mid, minColor, midColor);
    } else {
        return interpolate2Color(value, mid, max, midColor, maxColor);
    }
}

/**
 * Generate Color Scale Oracle Test Cases
 */
export function generateColorScaleTestCases(): ColorScaleTestCase[] {
    const testCases: ColorScaleTestCase[] = [];
    
    // Test Case 1: 2-Color Scale (Red to Green, min to max)
    const dataset1 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const min1 = Math.min(...dataset1);
    const max1 = Math.max(...dataset1);
    const minColor1 = { r: 248, g: 105, b: 107 }; // Red
    const maxColor1 = { r: 99, g: 190, b: 123 }; // Green
    
    testCases.push({
        name: '2-color-red-green-min-max',
        description: '2-color scale from red (min) to green (max)',
        dataset: dataset1,
        rule: {
            type: '2-color',
            minColor: minColor1,
            maxColor: maxColor1,
            minType: 'min',
            maxType: 'max',
        },
        expectedResults: dataset1.map(value => ({
            value,
            expectedColor: interpolate2Color(value, min1, max1, minColor1, maxColor1),
        })),
    });
    
    // Test Case 2: 2-Color Scale (Blue to Yellow) 
    const dataset2 = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
    const min2 = Math.min(...dataset2);
    const max2 = Math.max(...dataset2);
    const minColor2 = { r: 99, g: 142, b: 198 }; // Blue
    const maxColor2 = { r: 255, g: 235, b: 132 }; // Yellow
    
    testCases.push({
        name: '2-color-blue-yellow',
        description: '2-color scale from blue (min) to yellow (max)',
        dataset: dataset2,
        rule: {
            type: '2-color',
            minColor: minColor2,
            maxColor: maxColor2,
            minType: 'min',
            maxType: 'max',
        },
        expectedResults: dataset2.map(value => ({
            value,
            expectedColor: interpolate2Color(value, min2, max2, minColor2, maxColor2),
        })),
    });
    
    // Test Case 3: 3-Color Scale (Red to Yellow to Green, min to 50 to max)
    const dataset3 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const min3 = Math.min(...dataset3);
    const max3 = Math.max(...dataset3);
    const mid3 = 50;
    const minColor3 = { r: 248, g: 105, b: 107 }; // Red
    const midColor3 = { r: 255, g: 235, b: 132 }; // Yellow
    const maxColor3 = { r: 99, g: 190, b: 123 }; // Green
    
    testCases.push({
        name: '3-color-red-yellow-green',
        description: '3-color scale from red (min) to yellow (50) to green (max)',
        dataset: dataset3,
        rule: {
            type: '3-color',
            minColor: minColor3,
            midColor: midColor3,
            maxColor: maxColor3,
            minType: 'min',
            midType: 'number',
            maxType: 'max',
            midValue: mid3,
        },
        expectedResults: dataset3.map(value => ({
            value,
            expectedColor: interpolate3Color(value, min3, mid3, max3, minColor3, midColor3, maxColor3),
        })),
    });
    
    // Test Case 4: 3-Color Scale (Blue to White to Red)
    const dataset4 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const min4 = Math.min(...dataset4);
    const max4 = Math.max(...dataset4);
    const mid4 = (min4 + max4) / 2; // Midpoint = 5.5
    const minColor4 = { r: 99, g: 142, b: 198 }; // Blue
    const midColor4 = { r: 255, g: 255, b: 255 }; // White
    const maxColor4 = { r: 248, g: 105, b: 107 }; // Red
    
    testCases.push({
        name: '3-color-blue-white-red',
        description: '3-color scale from blue (min) to white (midpoint) to red (max)',
        dataset: dataset4,
        rule: {
            type: '3-color',
            minColor: minColor4,
            midColor: midColor4,
            maxColor: maxColor4,
            minType: 'min',
            midType: 'number',
            maxType: 'max',
            midValue: mid4,
        },
        expectedResults: dataset4.map(value => ({
            value,
            expectedColor: interpolate3Color(value, min4, mid4, max4, minColor4, midColor4, maxColor4),
        })),
    });
    
    // Test Case 5: 2-Color Scale with large dataset
    const dataset5 = Array.from({ length: 100 }, (_, i) => (i + 1) * 10);
    const min5 = Math.min(...dataset5);
    const max5 = Math.max(...dataset5);
    const minColor5 = { r: 255, g: 0, b: 0 }; // Pure Red
    const maxColor5 = { r: 0, g: 255, b: 0 }; // Pure Green
    
    // Sample 10 values from the dataset
    const sampledValues5 = [dataset5[0], dataset5[10], dataset5[24], dataset5[49], dataset5[74], dataset5[99]];
    
    testCases.push({
        name: '2-color-large-dataset',
        description: '2-color scale with 100 values (sampled validation)',
        dataset: dataset5,
        rule: {
            type: '2-color',
            minColor: minColor5,
            maxColor: maxColor5,
            minType: 'min',
            maxType: 'max',
        },
        expectedResults: sampledValues5.map(value => ({
            value,
            expectedColor: interpolate2Color(value, min5, max5, minColor5, maxColor5),
        })),
    });
    
    return testCases;
}
