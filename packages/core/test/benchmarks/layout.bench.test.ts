/**
 * Layout Baseline Benchmark
 *
 * Phase 2 Discipline: Measure baseline before adding any optimization
 *
 * Strategy:
 * 1. Measure pure function under stress
 * 2. Determine if layout is expensive enough to require memoization
 * 3. Only add WeakMap cache if profiler screams
 *
 * Gates:
 * - Baseline cost: <10µs per computation = sufficient
 * - If >10µs: measure memo overhead
 * - Only escalate on evidence
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import {
  computeLayout,
  MockTextMeasurer,
  CanvasTextMeasurer,
  type LayoutInput,
  type TextMeasurer,
} from '../../src/CellLayout';
import { StyleCache } from '../../src/StyleCache';
import type { CellStyle } from '../../src/types';

// Skipped: Environment-dependent performance benchmark (timing varies by machine)
describe.skip('Layout Baseline Performance', () => {
  let styleCache: StyleCache;
  let measurer: TextMeasurer;
  
  beforeAll(() => {
    styleCache = new StyleCache();
    
    // Use mock measurer for deterministic benchmarking
    // Switch to CanvasTextMeasurer for production validation
    measurer = new MockTextMeasurer();
  });

  test('Baseline: 100k single-line layouts (typical case)', () => {
    const iterations = 100_000;
    
    // Typical cell: short text, standard styling
    const style = styleCache.intern({ fontSize: 12, bold: false });
    const input: LayoutInput = {
      value: 'Q4 2024',
      style,
      width: 100,
      height: 20,
    };
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      computeLayout(input, measurer);
    }
    
    const elapsed = performance.now() - startTime;
    const avgTime = (elapsed / iterations) * 1000; // µs per layout
    
    console.log(`\n📊 Baseline (100k single-line):`);
    console.log(`  Total: ${elapsed.toFixed(0)}ms`);
    console.log(`  Avg: ${avgTime.toFixed(2)}µs per layout`);
    console.log(`  Throughput: ${(iterations / (elapsed / 1000)).toFixed(0)} layouts/sec`);
    
    // Gate: If avg < 10µs, layout is cheap enough
    // No memoization needed unless rendering forces it
    expect(avgTime).toBeLessThan(50); // Conservative gate
  });

  test('Baseline: 100k varying styles (high diversity)', () => {
    const iterations = 100_000;
    
    // Generate diverse styles (simulates real workbook)
    const styles: CellStyle[] = [];
    for (let i = 0; i < 50; i++) {
      styles.push(styleCache.intern({
        fontSize: 10 + (i % 5),
        bold: i % 2 === 0,
        italic: i % 3 === 0,
      }));
    }
    
    const values = ['Revenue', 'Q1', '$1,234.56', 'Total', 'Notes'];
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const input: LayoutInput = {
        value: values[i % values.length],
        style: styles[i % styles.length],
        width: 100,
        height: 20,
      };
      computeLayout(input, measurer);
    }
    
    const elapsed = performance.now() - startTime;
    const avgTime = (elapsed / iterations) * 1000;
    
    console.log(`\n📊 High Diversity (100k varying styles):`);
    console.log(`  Total: ${elapsed.toFixed(0)}ms`);
    console.log(`  Avg: ${avgTime.toFixed(2)}µs per layout`);
    console.log(`  Throughput: ${(iterations / (elapsed / 1000)).toFixed(0)} layouts/sec`);
    
    expect(avgTime).toBeLessThan(50);
  });

  test('Baseline: 1M layouts under stress', () => {
    const iterations = 1_000_000;
    
    // Standard enterprise cell
    const style = styleCache.intern({ fontSize: 11 });
    const input: LayoutInput = {
      value: 'Data',
      style,
      width: 80,
      height: 20,
    };
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      computeLayout(input, measurer);
    }
    
    const elapsed = performance.now() - startTime;
    const avgTime = (elapsed / iterations) * 1000;
    
    console.log(`\n📊 Stress Test (1M layouts):`);
    console.log(`  Total: ${elapsed.toFixed(0)}ms`);
    console.log(`  Avg: ${avgTime.toFixed(2)}µs per layout`);
    console.log(`  Throughput: ${(iterations / (elapsed / 1000)).toFixed(0)} layouts/sec`);
    
    // Gate: If this stays <10µs avg, we're done
    // No cache, no DAG, no sophistication needed
    expect(avgTime).toBeLessThan(50);
  });

  test('Identity check leverages Phase 1 primitive', () => {
    // This test proves Phase 2 is spending Phase 1's primitive
    
    const style1 = styleCache.intern({ fontSize: 12, bold: true });
    const style2 = styleCache.intern({ fontSize: 12, bold: true });
    const style3 = styleCache.intern({ fontSize: 14, bold: true });
    
    // Phase 1 guarantee: Same structure = same reference
    expect(style1 === style2).toBe(true);
    expect(style1 === style3).toBe(false);
    
    // This means layout invalidation is trivial:
    const input1: LayoutInput = { value: 'Test', style: style1, width: 100, height: 20 };
    const input2: LayoutInput = { value: 'Test', style: style2, width: 100, height: 20 };
    const input3: LayoutInput = { value: 'Test', style: style3, width: 100, height: 20 };
    
    // Can skip recomputation with reference equality:
    const canSkip = input1.style === input2.style; // O(1), no deep compare
    expect(canSkip).toBe(true);
    
    const mustRecompute = input1.style === input3.style;
    expect(mustRecompute).toBe(false);
    
    console.log(`\n✅ Identity check is O(1) - Phase 1 primitive working`);
  });
});

describe('Layout Correctness', () => {
  let measurer: TextMeasurer;
  let styleCache: StyleCache;

  beforeAll(() => {
    measurer = new MockTextMeasurer();
    styleCache = new StyleCache();
  });

  test('returns immutable layout', () => {
    const style = styleCache.intern({ fontSize: 12 });
    const input: LayoutInput = { value: 'Test', style, width: 100, height: 20 };
    
    const layout = computeLayout(input, measurer);
    
    // Try to mutate (should fail in strict mode or be ineffective)
    expect(() => {
      // @ts-expect-error Testing immutability
      layout.textWidth = 999;
    }).toThrow();
  });

  test('handles empty value', () => {
    const style = styleCache.intern({ fontSize: 12 });
    const input: LayoutInput = { value: '', style, width: 100, height: 20 };
    
    const layout = computeLayout(input, measurer);
    
    expect(layout.textWidth).toBe(0);
    expect(layout.lineCount).toBe(1);
    expect(layout.lines).toEqual(['']);
  });

  test('respects frozen style reference', () => {
    const style = styleCache.intern({ fontSize: 12, bold: true });
    
    // Style should be frozen (Phase 1 guarantee)
    expect(Object.isFrozen(style)).toBe(true);
    
    const input: LayoutInput = { value: 'Test', style, width: 100, height: 20 };
    const layout = computeLayout(input, measurer);
    
    expect(layout.textWidth).toBeGreaterThan(0);
  });

  test('detects truncation', () => {
    const style = styleCache.intern({ fontSize: 12 });
    const input: LayoutInput = {
      value: 'Very long text that exceeds width',
      style,
      width: 50, // Too narrow
      height: 20,
    };
    
    const layout = computeLayout(input, measurer);
    
    expect(layout.truncated).toBe(true);
  });
});
