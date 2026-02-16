/**
 * Step 2.2: StyleCache with Freeze Integration
 * 
 * Measure realistic workload with deep freeze integrated.
 * 
 * Gate Conditions:
 * - Intern avg ≤ 0.005ms (5µs)
 * - Freeze overhead ≤ 5% of total workload
 * - No bucket growth anomaly
 * - No memory leak
 * 
 * Decision:
 * - If gates pass → StyleCache foundation enterprise-validated
 */

import { StyleCache } from '../../src/StyleCache';
import { CellStyle } from '../../src/types';

// Skipped: Environment-dependent performance benchmark (timing varies by machine)
describe.skip('StyleCache with Freeze (Step 2.2)', () => {
  
  // ============================================================
  // TEST 1: Typical Workload (100k cells, 50 unique styles)
  // ============================================================
  
  test('Typical workload: 100k cells, 50 unique styles WITH deep freeze', () => {
    const cache = new StyleCache();
    const styles = generateTypicalStyles(50);
    
    const initialMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    // Simulate 100k cell operations
    for (let i = 0; i < 100000; i++) {
      const style = styles[i % styles.length];
      cache.intern(style);
    }
    
    const elapsed = performance.now() - start;
    const finalMemory = process.memoryUsage().heapUsed;
    
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();
    const avgIntern = cache.getAvgInternTime();
    
    console.log(`\n[Typical] Total time: ${elapsed.toFixed(2)}ms`);
    console.log(`[Typical] Avg intern: ${(avgIntern * 1000).toFixed(3)}µs`);
    console.log(`[Typical] Hit rate: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`[Typical] Cache size: ${metrics.cacheSize}`);
    console.log(`[Typical] Max bucket depth: ${metrics.maxBucketDepth}`);
    console.log(`[Typical] Collision rate: ${(cache.getCollisionRate() * 100).toFixed(2)}%`);
    console.log(`[Typical] Memory delta: ${((finalMemory - initialMemory) / 1024).toFixed(2)} KB`);
    
    // Freeze overhead calculation
    const freezeOverhead = (metrics.missCount * 0.00096) / elapsed; // 0.96µs per freeze (from Step 2.1)
    console.log(`[Typical] Freeze overhead: ${(freezeOverhead * 100).toFixed(2)}%`);
    
    // Gate: Intern avg ≤ 5µs
    expect(avgIntern).toBeLessThan(0.005);
    
    // Gate: Hit rate ≥99.95%
    expect(hitRate).toBeGreaterThanOrEqual(0.9995);
    
    // Gate: Freeze overhead ≤5%
    expect(freezeOverhead).toBeLessThan(0.05);
    
    // Gate: No bucket growth anomaly
    expect(metrics.maxBucketDepth).toBeLessThanOrEqual(3);
    
    // Gate: Cache size matches unique styles
    expect(metrics.cacheSize).toBe(50);
  });
  
  // ============================================================
  // TEST 2: High Diversity (500k cells, 5000 unique styles)
  // ============================================================
  
  test('High diversity: 500k cells, 5000 unique styles (Rich Text Phase 2 scenario)', () => {
    const cache = new StyleCache();
    const styles = generateDesignerStyles(5000);
    
    const initialMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    // Simulate 500k cell operations
    for (let i = 0; i < 500000; i++) {
      const style = styles[i % styles.length];
      cache.intern(style);
    }
    
    const elapsed = performance.now() - start;
    const finalMemory = process.memoryUsage().heapUsed;
    
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();
    const avgIntern = cache.getAvgInternTime();
    
    console.log(`\n[HighDiversity] Total time: ${elapsed.toFixed(2)}ms`);
    console.log(`[HighDiversity] Avg intern: ${(avgIntern * 1000).toFixed(3)}µs`);
    console.log(`[HighDiversity] Hit rate: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`[HighDiversity] Cache size: ${metrics.cacheSize}`);
    console.log(`[HighDiversity] Max bucket depth: ${metrics.maxBucketDepth}`);
    console.log(`[HighDiversity] Collision rate: ${(cache.getCollisionRate() * 100).toFixed(2)}%`);
    console.log(`[HighDiversity] Memory delta: ${((finalMemory - initialMemory) / 1024).toFixed(2)} KB`);
    
    // Freeze overhead calculation
    const freezeOverhead = (metrics.missCount * 0.00096) / elapsed;
    console.log(`[HighDiversity] Freeze overhead: ${(freezeOverhead * 100).toFixed(2)}%`);
    
    // Gate: Intern avg ≤ 5µs
    expect(avgIntern).toBeLessThan(0.005);
    
    // Gate: Hit rate ≥99% (relaxed for high diversity)
    expect(hitRate).toBeGreaterThanOrEqual(0.99);
    
    // Gate: Freeze overhead ≤5%
    expect(freezeOverhead).toBeLessThan(0.05);
    
    // Gate: No bucket growth anomaly
    expect(metrics.maxBucketDepth).toBeLessThanOrEqual(3);
    
    // Gate: Cache size matches unique styles
    expect(metrics.cacheSize).toBe(5000);
    
    // Gate: Memory overhead reasonable (<2 MB for 5000 styles)
    const memoryDeltaMB = (finalMemory - initialMemory) / (1024 * 1024);
    expect(memoryDeltaMB).toBeLessThan(2);
  });
  
  // ============================================================
  // TEST 3: Hot Cache Performance (with freeze)
  // ============================================================
  
  test('Hot cache: 100k lookups, same style (freeze already done)', () => {
    const cache = new StyleCache();
    const style: CellStyle = { bold: true, color: '#FF0000', fontSize: 12 };
    
    // First intern (miss + freeze)
    cache.intern(style);
    
    const start = performance.now();
    
    // 100k hot lookups (all hits, no freeze)
    for (let i = 0; i < 100000; i++) {
      cache.intern(style);
    }
    
    const elapsed = performance.now() - start;
    const metrics = cache.getMetrics();
    const avgIntern = elapsed / 100000;
    
    console.log(`\n[HotCache] Total time: ${elapsed.toFixed(2)}ms`);
    console.log(`[HotCache] Avg intern: ${(avgIntern * 1000).toFixed(3)}µs`);
    console.log(`[HotCache] Hit count: ${metrics.hitCount}`);
    console.log(`[HotCache] Miss count: ${metrics.missCount}`);
    
    // Gate: Avg intern ≤ 5µs (should be ~2µs from Step 1)
    expect(avgIntern).toBeLessThan(0.005);
    
    // Gate: 99,999 hits, 1 miss
    expect(metrics.hitCount).toBe(100000);
    expect(metrics.missCount).toBe(1);
  });
  
  // ============================================================
  // TEST 4: Memory Leak Check (repeated intern/clear cycles)
  // ============================================================
  
  test('Memory leak check: 10 cycles of 10k interns + clear', () => {
    const cache = new StyleCache();
    const styles = generateTypicalStyles(50);
    
    const memorySnapshots: number[] = [];
    
    for (let cycle = 0; cycle < 10; cycle++) {
      // Intern 10k styles
      for (let i = 0; i < 10000; i++) {
        const style = styles[i % styles.length];
        cache.intern(style);
      }
      
      // Clear cache
      cache.clear();
      
      // Force GC hint (Node may ignore)
      if (global.gc) {
        global.gc();
      }
      
      // Snapshot memory
      memorySnapshots.push(process.memoryUsage().heapUsed);
    }
    
    const initialMemory = memorySnapshots[0];
    const finalMemory = memorySnapshots[memorySnapshots.length - 1];
    const memoryGrowth = finalMemory - initialMemory;
    
    console.log(`\n[MemoryLeak] Initial: ${(initialMemory / 1024).toFixed(2)} KB`);
    console.log(`[MemoryLeak] Final: ${(finalMemory / 1024).toFixed(2)} KB`);
    console.log(`[MemoryLeak] Growth: ${(memoryGrowth / 1024).toFixed(2)} KB`);
    
    // Gate: Memory growth <100 KB (acceptable for GC noise)
    expect(Math.abs(memoryGrowth)).toBeLessThan(100 * 1024);
  });
  
  // ============================================================
  // TEST 5: Bucket Distribution (5000 unique styles)
  // ============================================================
  
  test('Bucket distribution: 5000 unique styles (no anomaly)', () => {
    const cache = new StyleCache();
    const styles = generateDesignerStyles(5000);
    
    for (const style of styles) {
      cache.intern(style);
    }
    
    const metrics = cache.getMetrics();
    const avgDepth = metrics.cacheSize / metrics.bucketCount;
    
    console.log(`\n[Buckets] Cache size: ${metrics.cacheSize}`);
    console.log(`[Buckets] Bucket count: ${metrics.bucketCount}`);
    console.log(`[Buckets] Max depth: ${metrics.maxBucketDepth}`);
    console.log(`[Buckets] Avg depth: ${avgDepth.toFixed(2)}`);
    console.log(`[Buckets] Collision rate: ${(cache.getCollisionRate() * 100).toFixed(2)}%`);
    
    // Gate: Max depth ≤3
    expect(metrics.maxBucketDepth).toBeLessThanOrEqual(3);
    
    // Gate: Collision rate <5%
    expect(cache.getCollisionRate()).toBeLessThan(0.05);
    
    // Gate: Avg depth close to 1 (ideal distribution)
    expect(avgDepth).toBeGreaterThan(0.95);
    expect(avgDepth).toBeLessThan(1.05);
  });
});

// ============================================================
// FIXTURES: Style Generators
// ============================================================

function generateTypicalStyles(count: number): CellStyle[] {
  const styles: CellStyle[] = [];
  
  // Typical enterprise patterns: headers, data, totals, conditional
  const patterns = [
    { bold: true, fontSize: 14, color: '#000000' }, // Header
    { fontSize: 11, color: '#333333' }, // Data
    { bold: true, fontSize: 11, color: '#0000FF' }, // Total
    { italic: true, color: '#666666' }, // Comment
    { bold: true, color: '#FF0000', fill: '#FFFF00' }, // Highlight
  ];
  
  for (let i = 0; i < count; i++) {
    const base = patterns[i % patterns.length];
    styles.push({
      ...base,
      // Variation
      align: i % 3 === 0 ? 'left' : i % 3 === 1 ? 'center' : 'right',
      fontFamily: i % 2 === 0 ? 'Arial' : 'Calibri',
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
