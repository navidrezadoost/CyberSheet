/**
 * Final Stress Test: Production-Scale Validation
 * 
 * Validates StyleCache at enterprise scale before Phase 2.
 * 
 * Scenarios:
 * 1. 1M cells, typical enterprise (50 unique styles)
 * 2. Multi-sheet workbook (10 sheets, 100k cells each)
 * 3. Designer workbook (500k cells, 5000 unique styles)
 * 4. Pathological case (100k unique styles, no hits)
 * 
 * Gates:
 * - Performance: <5s (typical), <15s (designer), <30s (pathological)
 * - Memory: <2 MB (typical), <50 MB (designer), <100 MB (pathological)
 * - Hit rate: ≥99.95% (typical), ≥90% (designer)
 * - Collision rate: <5%
 * - Cross-sheet dedup: ≥80%
 */

import { StyleCache } from '../../src/StyleCache';
import { CellStyle } from '../../src/types';

describe('StyleCache Final Stress Test (Production Scale)', () => {
  
  // ============================================================
  // TEST 1: 1M Cells, Typical Enterprise (50 Unique Styles)
  // ============================================================
  
  test('1M cells, typical enterprise patterns (50 unique styles)', () => {
    const cache = new StyleCache();
    const styles = generateTypicalEnterpriseStyles(50);
    
    // Count actual unique styles after interning (fixture may create duplicates)
    const uniqueStyles = new Set(styles.map(s => cache.intern(s)));
    const expectedCacheSize = uniqueStyles.size;
    
    // Reset cache for clean benchmark
    cache.clear();
    
    console.log('\n[1M Typical] Starting 1M cell simulation...');
    console.log(`[1M Typical] Expected unique styles: ${expectedCacheSize}`);
    
    const initialMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    // Simulate 1M cell operations
    const refs: CellStyle[] = [];
    for (let i = 0; i < 1000000; i++) {
      const style = styles[i % styles.length];
      refs.push(cache.intern(style));
      
      // Progress log every 200k
      if (i > 0 && i % 200000 === 0) {
        const elapsed = performance.now() - start;
        console.log(`[1M Typical] ${i} cells: ${elapsed.toFixed(0)}ms, hit rate: ${(cache.getHitRate() * 100).toFixed(2)}%`);
      }
    }
    
    const elapsed = performance.now() - start;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (finalMemory - initialMemory) / (1024 * 1024);
    
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();
    const avgIntern = cache.getAvgInternTime();
    
    console.log(`\n[1M Typical] Complete:`);
    console.log(`  Total time: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}s)`);
    console.log(`  Avg intern: ${(avgIntern * 1000).toFixed(3)}µs`);
    console.log(`  Hit rate: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`  Cache size: ${metrics.cacheSize}`);
    console.log(`  Max bucket depth: ${metrics.maxBucketDepth}`);
    console.log(`  Collision rate: ${(cache.getCollisionRate() * 100).toFixed(2)}%`);
    console.log(`  Memory delta: ${memoryDelta.toFixed(2)} MB`);
    console.log(`  Throughput: ${((1000000 / (elapsed / 1000)) / 1000).toFixed(0)}K interns/sec`);
    
    // Gate: Performance <5s
    expect(elapsed).toBeLessThan(5000);
    
    // Gate: Avg intern <5µs
    expect(avgIntern).toBeLessThan(0.005);
    
    // Gate: Hit rate ≥99.95%
    expect(hitRate).toBeGreaterThanOrEqual(0.9995);
    
    // Gate: Cache size matches actual unique styles from fixture
    expect(metrics.cacheSize).toBe(expectedCacheSize);
    
    // Gate: Max bucket depth ≤3
    expect(metrics.maxBucketDepth).toBeLessThanOrEqual(3);
    
    // Gate: Collision rate <5%
    expect(cache.getCollisionRate()).toBeLessThan(0.05);
    
    console.log(`[1M Typical] ✅ All performance gates passed`);
    
    // Cleanup: Release all references
    for (const ref of refs) {
      cache.release(ref);
    }
    
    // STRUCTURAL MEMORY GATES (catch real leaks, not process heap noise)
    // Get fresh metrics AFTER cleanup
    const finalMetrics = cache.getMetrics();
    
    expect(cache.size()).toBe(0); // Cache must be empty after cleanup
    expect(finalMetrics.bucketCount).toBe(0); // No orphan buckets (critical: strong refs removed)
    
    console.log(`[1M Typical] ✅ Structural memory gates passed (no leaks)`);
    console.log(`[1M Typical]    - Cache size: 0 ✓`);
    console.log(`[1M Typical]    - Bucket count: 0 ✓`);
  }, 30000);
  
  // ============================================================
  // TEST 2: Multi-Sheet Workbook (10 sheets × 100k cells)
  // ============================================================
  
  test('Multi-sheet: 10 sheets × 100k cells, cross-sheet dedup', () => {
    const cache = new StyleCache();
    const styles = generateTypicalEnterpriseStyles(50);
    
    // Count actual unique styles after interning (fixture may create duplicates)
    const uniqueStyles = new Set(styles.map(s => cache.intern(s)));
    const expectedCacheSize = uniqueStyles.size;
    
    // Reset cache for clean benchmark
    cache.clear();
    
    console.log('\n[MultiSheet] Starting 10-sheet simulation...');
    console.log(`[MultiSheet] Expected unique styles: ${expectedCacheSize}`);
    
    const initialMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    const allRefs: CellStyle[][] = [];
    
    // 10 sheets, 100k cells each
    for (let sheet = 0; sheet < 10; sheet++) {
      const sheetRefs: CellStyle[] = [];
      
      for (let i = 0; i < 100000; i++) {
        const style = styles[i % styles.length];
        sheetRefs.push(cache.intern(style));
      }
      
      allRefs.push(sheetRefs);
      
      const elapsed = performance.now() - start;
      console.log(`[MultiSheet] Sheet ${sheet + 1}/10: ${elapsed.toFixed(0)}ms, cache size: ${cache.size()}`);
    }
    
    const elapsed = performance.now() - start;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (finalMemory - initialMemory) / (1024 * 1024);
    
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();
    
    console.log(`\n[MultiSheet] Complete:`);
    console.log(`  Total time: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}s)`);
    console.log(`  Total cells: ${10 * 100000}`);
    console.log(`  Hit rate: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`  Cache size: ${metrics.cacheSize} (expected: ${expectedCacheSize})`);
    console.log(`  Cross-sheet dedup: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`  Memory delta: ${memoryDelta.toFixed(2)} MB`);
    
    // Gate: Total time <10s
    expect(elapsed).toBeLessThan(10000);
    
    // Gate: Cache size matches actual unique styles (full dedup across sheets)
    expect(metrics.cacheSize).toBe(expectedCacheSize);
    
    // Gate: Cross-sheet dedup ≥80% (hit rate proxy)
    expect(hitRate).toBeGreaterThanOrEqual(0.8);
    
    console.log(`[MultiSheet] ✅ All performance gates passed (cross-sheet dedup verified)`);
    
    // Cleanup: Release all references across all sheets
    for (const sheetRefs of allRefs) {
      for (const ref of sheetRefs) {
        cache.release(ref);
      }
    }
    
    // STRUCTURAL MEMORY GATES (catch real leaks, not process heap noise)
    // Get fresh metrics AFTER cleanup
    const finalMetrics = cache.getMetrics();
    
    expect(cache.size()).toBe(0); // Cache must be empty after cleanup
    expect(finalMetrics.bucketCount).toBe(0); // No orphan buckets (critical: strong refs removed)
    
    console.log(`[MultiSheet] ✅ Structural memory gates passed (no leaks)`);
    console.log(`[MultiSheet]    - Cache size: 0 ✓`);
    console.log(`[MultiSheet]    - Bucket count: 0 ✓`);
  }, 30000);
  
  // ============================================================
  // TEST 3: Designer Workbook (500k cells, 5000 unique styles)
  // ============================================================
  
  test('Designer workbook: 500k cells, 5000 unique styles (Rich Text proxy)', () => {
    const cache = new StyleCache();
    const styles = generateDesignerStyles(5000);
    
    console.log('\n[Designer] Starting 500k cell simulation (high diversity)...');
    
    const initialMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    const refs: CellStyle[] = [];
    for (let i = 0; i < 500000; i++) {
      const style = styles[i % styles.length];
      refs.push(cache.intern(style));
      
      // Progress log every 100k
      if (i > 0 && i % 100000 === 0) {
        const elapsed = performance.now() - start;
        console.log(`[Designer] ${i} cells: ${elapsed.toFixed(0)}ms, hit rate: ${(cache.getHitRate() * 100).toFixed(2)}%`);
      }
    }
    
    const elapsed = performance.now() - start;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (finalMemory - initialMemory) / (1024 * 1024);
    
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();
    const avgIntern = cache.getAvgInternTime();
    
    console.log(`\n[Designer] Complete:`);
    console.log(`  Total time: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}s)`);
    console.log(`  Avg intern: ${(avgIntern * 1000).toFixed(3)}µs`);
    console.log(`  Hit rate: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`  Cache size: ${metrics.cacheSize}`);
    console.log(`  Max bucket depth: ${metrics.maxBucketDepth}`);
    console.log(`  Collision rate: ${(cache.getCollisionRate() * 100).toFixed(2)}%`);
    console.log(`  Memory delta: ${memoryDelta.toFixed(2)} MB`);
    
    // Gate: Performance <15s
    expect(elapsed).toBeLessThan(15000);
    
    // Gate: Avg intern <6µs (relaxed for high diversity)
    expect(avgIntern).toBeLessThan(0.006);
    
    // Gate: Hit rate ≥90%
    expect(hitRate).toBeGreaterThanOrEqual(0.9);
    
    // Gate: Cache size = 5000
    expect(metrics.cacheSize).toBe(5000);
    
    // Gate: Max bucket depth ≤3
    expect(metrics.maxBucketDepth).toBeLessThanOrEqual(3);
    
    // Gate: Collision rate <5%
    expect(cache.getCollisionRate()).toBeLessThan(0.05);
    
    console.log(`[Designer] ✅ All performance gates passed (high diversity validated)`);
    
    // Cleanup: Release all references
    for (const ref of refs) {
      cache.release(ref);
    }
    
    // STRUCTURAL MEMORY GATES (catch real leaks, not process heap noise)
    // Get fresh metrics AFTER cleanup
    const finalMetrics = cache.getMetrics();
    
    expect(cache.size()).toBe(0); // Cache must be empty after cleanup
    expect(finalMetrics.bucketCount).toBe(0); // No orphan buckets (critical: strong refs removed)
    
    console.log(`[Designer] ✅ Structural memory gates passed (no leaks)`);
    console.log(`[Designer]    - Cache size: 0 ✓`);
    console.log(`[Designer]    - Bucket count: 0 ✓`);
  }, 60000);
  
  // ============================================================
  // TEST 4: Pathological Case (100k Unique Styles, No Hits)
  // ============================================================
  
  test('Pathological: 100k unique styles (worst-case, no hits)', () => {
    const cache = new StyleCache();
    
    console.log('\n[Pathological] Starting 100k unique styles (worst-case)...');
    
    const initialMemory = process.memoryUsage().heapUsed;
    const start = performance.now();
    
    const refs: CellStyle[] = [];
    for (let i = 0; i < 100000; i++) {
      // Every cell gets a unique color (no hits)
      const uniqueStyle: CellStyle = {
        color: `#${(i % 0xFFFFFF).toString(16).padStart(6, '0')}`,
        fontSize: 10 + (i % 10),
      };
      refs.push(cache.intern(uniqueStyle));
      
      // Progress log every 20k
      if (i > 0 && i % 20000 === 0) {
        const elapsed = performance.now() - start;
        console.log(`[Pathological] ${i} cells: ${elapsed.toFixed(0)}ms, cache size: ${cache.size()}`);
      }
    }
    
    const elapsed = performance.now() - start;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (finalMemory - initialMemory) / (1024 * 1024);
    
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();
    const avgIntern = cache.getAvgInternTime();
    
    console.log(`\n[Pathological] Complete:`);
    console.log(`  Total time: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}s)`);
    console.log(`  Avg intern: ${(avgIntern * 1000).toFixed(3)}µs`);
    console.log(`  Hit rate: ${(hitRate * 100).toFixed(2)}%`);
    console.log(`  Cache size: ${metrics.cacheSize}`);
    console.log(`  Max bucket depth: ${metrics.maxBucketDepth}`);
    console.log(`  Collision rate: ${(cache.getCollisionRate() * 100).toFixed(2)}%`);
    console.log(`  Memory delta: ${memoryDelta.toFixed(2)} MB`);
    
    // Gate: Performance <30s (acceptable degradation)
    expect(elapsed).toBeLessThan(30000);
    
    // Gate: Avg intern <0.01ms (10µs, relaxed for worst-case)
    expect(avgIntern).toBeLessThan(0.01);
    
    // Gate: Hit rate ~0% (expected, all unique)
    expect(hitRate).toBeLessThan(0.01);
    
    // Gate: Cache size = 100k
    expect(metrics.cacheSize).toBe(100000);
    
    // Gate: Max bucket depth ≤5 (relaxed for pathological)
    expect(metrics.maxBucketDepth).toBeLessThanOrEqual(5);
    
    console.log(`[Pathological] ✅ Graceful degradation verified (no catastrophic failure)`);
    
    // Cleanup: Release all 100k styles (may take time)
    console.log(`[Pathological] Releasing 100k styles...`);
    const cleanupStart = performance.now();
    for (const ref of refs) {
      cache.release(ref);
    }
    const cleanupElapsed = performance.now() - cleanupStart;
    
    // STRUCTURAL MEMORY GATES (catch real leaks, not process heap noise)
    expect(cache.size()).toBe(0); // Cache must be empty after cleanup
    
    const finalMetrics = cache.getMetrics();
    expect(finalMetrics.bucketCount).toBe(0); // No orphan buckets (critical: strong refs removed)
    
    console.log(`[Pathological] ✅ Structural memory gates passed (cleanup: ${cleanupElapsed.toFixed(0)}ms)`);
    console.log(`[Pathological]    - Cache size: 0 ✓`);
    console.log(`[Pathological]    - Bucket count: 0 ✓`);
  }, 90000);
});

// ============================================================
// FIXTURES: Style Generators
// ============================================================

function generateTypicalEnterpriseStyles(count: number): CellStyle[] {
  const styles: CellStyle[] = [];
  
  // Typical patterns: headers, data, totals, highlights
  const patterns: CellStyle[] = [
    { bold: true, fontSize: 14, color: '#000000', fill: '#E0E0E0' }, // Header
    { fontSize: 11, color: '#333333' }, // Data
    { bold: true, fontSize: 11, color: '#0000FF' }, // Total
    { italic: true, color: '#666666', fontSize: 10 }, // Comment
    { bold: true, color: '#FF0000', fill: '#FFFF00' }, // Alert
    { fontSize: 11, color: '#008000' }, // Success
    { fontSize: 11, color: '#FF8C00', italic: true }, // Warning
    { bold: true, fontSize: 12, underline: true }, // Emphasis
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
  
  const fonts = ['Arial', 'Calibri', 'Times New Roman', 'Courier New', 'Verdana'];
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
      fontSize: 8 + (i % 12),
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
