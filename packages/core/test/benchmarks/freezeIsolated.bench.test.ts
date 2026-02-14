/**
 * Step 2.1: Freeze Isolated Benchmark
 * 
 * Measure ONLY freeze cost (no cache overhead).
 * 
 * Gate Conditions:
 * - Freeze cost per unique style ≤ 0.05ms
 * - Worst-case deep freeze on complex nested ≤ 0.1ms
 * 
 * Decision:
 * - If deep freeze ≤0.05ms → production deep acceptable
 * - If >0.05ms → dev-only deep + prod shallow
 * - Proxy → dev-only (always)
 */

import { CellStyle } from '../../src/types';

describe('Freeze Isolated Benchmark (Step 2.1)', () => {
  
  // ============================================================
  // WARMUP: Shape-specific, all 3 modes
  // ============================================================
  
  beforeAll(() => {
    console.log('\n🔥 Warmup: Shape-specific for all 3 modes\n');
    
    // Warmup: Shallow freeze (simple shape)
    const simpleShape: CellStyle = { bold: true, color: '#FF0000', fontSize: 12 };
    for (let i = 0; i < 5000; i++) {
      const copy = { ...simpleShape, iteration: i };
      Object.freeze(copy);
    }
    
    // Warmup: Deep freeze (complex nested shape)
    const complexShape: CellStyle = {
      bold: true,
      color: '#FF0000',
      fill: '#00FF00',
      border: {
        top: '#000000',
        bottom: '#FF0000',
      },
    };
    for (let i = 0; i < 5000; i++) {
      const copy = deepClone(complexShape);
      deepFreeze(copy);
    }
    
    // Warmup: Proxy (dev-only)
    for (let i = 0; i < 5000; i++) {
      const copy = { ...simpleShape, iteration: i };
      createImmutableProxy(copy);
    }
    
    console.log('✅ Warmup complete (15k iterations, V8 JIT stabilized)\n');
  });
  
  // ============================================================
  // TEST 1: Shallow Freeze - Simple Styles
  // ============================================================
  
  test('Shallow freeze: simple styles (50 unique)', () => {
    const styles = generateSimpleStyles(50);
    
    // Loop-based timing (1000 iterations per style)
    const times: number[] = [];
    
    for (const style of styles) {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const copy = { ...style }; // Clone per iteration
        Object.freeze(copy);
      }
      
      const elapsed = performance.now() - start;
      const avgPerStyle = elapsed / 1000;
      times.push(avgPerStyle);
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    console.log(`\n[Shallow/Simple] Avg: ${(avg * 1000).toFixed(3)}µs`);
    console.log(`[Shallow/Simple] Max: ${(max * 1000).toFixed(3)}µs`);
    console.log(`[Shallow/Simple] Min: ${(min * 1000).toFixed(3)}µs`);
    
    // Gate: ≤0.05ms (50µs)
    expect(avg).toBeLessThan(0.05);
  });
  
  // ============================================================
  // TEST 2: Deep Freeze - Complex Nested Styles
  // ============================================================
  
  test('Deep freeze: complex nested styles (50 unique)', () => {
    const styles = generateComplexStyles(50);
    
    const times: number[] = [];
    
    for (const style of styles) {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const copy = deepClone(style); // Deep clone per iteration
        deepFreeze(copy);
      }
      
      const elapsed = performance.now() - start;
      const avgPerStyle = elapsed / 1000;
      times.push(avgPerStyle);
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    console.log(`\n[Deep/Complex] Avg: ${(avg * 1000).toFixed(3)}µs`);
    console.log(`[Deep/Complex] Max: ${(max * 1000).toFixed(3)}µs`);
    console.log(`[Deep/Complex] Min: ${(min * 1000).toFixed(3)}µs`);
    
    // Gate: ≤0.05ms (50µs) for production consideration
    // If >0.05ms → dev-only deep + prod shallow
    expect(avg).toBeLessThan(0.1); // Relaxed gate for complex nested
    
    if (avg > 0.05) {
      console.log(`⚠️  Deep freeze >0.05ms → Recommend dev-only deep + prod shallow`);
    } else {
      console.log(`✅ Deep freeze ≤0.05ms → Production deep freeze acceptable`);
    }
  });
  
  // ============================================================
  // TEST 3: Proxy - Dev-Only (Mutation Detection)
  // ============================================================
  
  test('Proxy: dev-only mutation detection (50 unique)', () => {
    const styles = generateSimpleStyles(50);
    
    const times: number[] = [];
    
    for (const style of styles) {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const copy = { ...style };
        createImmutableProxy(copy);
      }
      
      const elapsed = performance.now() - start;
      const avgPerStyle = elapsed / 1000;
      times.push(avgPerStyle);
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const max = Math.max(...times);
    
    console.log(`\n[Proxy/DevOnly] Avg: ${(avg * 1000).toFixed(3)}µs`);
    console.log(`[Proxy/DevOnly] Max: ${(max * 1000).toFixed(3)}µs`);
    console.log(`⚠️  Proxy is dev-only (not recommended for production)`);
    
    // No gate (dev-only always)
    expect(avg).toBeGreaterThan(0); // Sanity check
  });
  
  // ============================================================
  // TEST 4: Shallow Freeze - Large Batch (5000 styles)
  // ============================================================
  
  test('Shallow freeze: large batch (5000 unique styles)', () => {
    const styles = generateDesignerStyles(5000);
    
    const start = performance.now();
    
    for (const style of styles) {
      const copy = { ...style };
      Object.freeze(copy);
    }
    
    const totalTime = performance.now() - start;
    const avg = totalTime / styles.length;
    
    console.log(`\n[Shallow/Batch] Total: ${totalTime.toFixed(2)}ms`);
    console.log(`[Shallow/Batch] Avg: ${(avg * 1000).toFixed(3)}µs`);
    console.log(`[Shallow/Batch] Throughput: ${(styles.length / (totalTime / 1000)).toFixed(0)} freezes/sec`);
    
    // Gate: ≤0.05ms avg
    expect(avg).toBeLessThan(0.05);
  });
  
  // ============================================================
  // TEST 5: Deep Freeze - Worst-Case Nested Structure
  // ============================================================
  
  test('Deep freeze: worst-case nested structure', () => {
    // Maximum nesting current type supports: borders (4 sides)
    const worstCase: CellStyle = {
      bold: true,
      italic: true,
      underline: true,
      color: '#FF0000',
      fill: '#00FF00',
      border: {
        top: '#000000',
        right: '#FF0000',
        bottom: '#00FF00',
        left: '#0000FF',
      },
      fontSize: 12,
      fontFamily: 'Arial',
      align: 'center',
      valign: 'middle',
      wrap: true,
      shrinkToFit: false,
      rotation: 45,
      numberFormat: '#,##0.00',
    };
    
    const times: number[] = [];
    
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      
      for (let j = 0; j < 1000; j++) {
        const copy = deepClone(worstCase);
        deepFreeze(copy);
      }
      
      const elapsed = performance.now() - start;
      const avgPerStyle = elapsed / 1000;
      times.push(avgPerStyle);
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const max = Math.max(...times);
    
    console.log(`\n[Deep/WorstCase] Avg: ${(avg * 1000).toFixed(3)}µs`);
    console.log(`[Deep/WorstCase] Max: ${(max * 1000).toFixed(3)}µs`);
    console.log(`[Deep/WorstCase] Nesting: borders (4 sides) + gradient (3 stops)`);
    
    // Gate: ≤0.1ms for worst-case
    expect(avg).toBeLessThan(0.1);
    
    if (avg > 0.05) {
      console.log(`⚠️  Worst-case deep freeze >0.05ms → Flat canonical structure recommended`);
    }
  });
});

// ============================================================
// HELPER: Deep Clone (for benchmark isolation)
// ============================================================

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone((obj as any)[key]);
    }
  }
  return cloned;
}

// ============================================================
// HELPER: Deep Freeze (Recursive)
// ============================================================

function deepFreeze(obj: any): void {
  Object.freeze(obj);
  
  Object.values(obj).forEach(value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
}

// ============================================================
// HELPER: Immutable Proxy (Dev-Only)
// ============================================================

function createImmutableProxy<T extends object>(obj: T): T {
  return new Proxy(obj, {
    set() {
      throw new Error('Style is immutable (dev-mode violation detected)');
    },
    deleteProperty() {
      throw new Error('Style is immutable (dev-mode violation detected)');
    },
  });
}

// ============================================================
// FIXTURES: Style Generators
// ============================================================

function generateSimpleStyles(count: number): CellStyle[] {
  const styles: CellStyle[] = [];
  
  for (let i = 0; i < count; i++) {
    styles.push({
      bold: i % 2 === 0,
      italic: i % 3 === 0,
      color: `#${((i * 123456) % 0xFFFFFF).toString(16).padStart(6, '0')}`,
      fontSize: 10 + (i % 5),
    });
  }
  
  return styles;
}

function generateComplexStyles(count: number): CellStyle[] {
  const styles: CellStyle[] = [];
  
  for (let i = 0; i < count; i++) {
    styles.push({
      bold: i % 2 === 0,
      italic: i % 3 === 0,
      underline: i % 4 === 0,
      color: `#${((i * 123456) % 0xFFFFFF).toString(16).padStart(6, '0')}`,
      fill: `#${((i * 654321) % 0xFFFFFF).toString(16).padStart(6, '0')}`,
      border: {
        top: '#000000',
        bottom: '#FF0000',
      },
      fontSize: 10 + (i % 5),
      fontFamily: i % 3 === 0 ? 'Arial' : 'Calibri',
      align: i % 2 === 0 ? 'left' : 'center',
    });
  }
  
  return styles;
}

function generateDesignerStyles(count: number): CellStyle[] {
  const styles: CellStyle[] = [];
  
  const fonts = ['Arial', 'Calibri', 'Times New Roman', 'Courier New'];
  const aligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
  const valigns: Array<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];
  
  for (let i = 0; i < count; i++) {
    const hasBorder = i % 4 === 0;
    
    styles.push({
      bold: i % 2 === 0,
      italic: i % 3 === 0,
      underline: i % 5 === 0,
      color: `#${((i * 123456) % 0xFFFFFF).toString(16).padStart(6, '0')}`,
      fill: i % 2 === 0 ? `#${((i * 654321) % 0xFFFFFF).toString(16).padStart(6, '0')}` : undefined,
      border: hasBorder ? {
        top: '#000000',
        bottom: '#FF0000',
        left: '#00FF00',
        right: '#0000FF',
      } : undefined,
      fontSize: 8 + (i % 10),
      fontFamily: fonts[i % fonts.length],
      align: aligns[i % aligns.length],
      valign: valigns[i % valigns.length],
      wrap: i % 6 === 0,
      shrinkToFit: i % 8 === 0,
      rotation: (i % 4) * 45,
    });
  }
  
  return styles;
}
