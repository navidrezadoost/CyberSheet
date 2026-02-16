/**
 * Full Pipeline Performance Benchmark
 * 
 * Measures formatting performance under realistic load
 * Tests: 10k cells, mixed formats, fast scroll simulation
 * 
 * Performance Budget (60fps = 16.67ms/frame):
 * - Formatting: <3.3ms (20% of frame budget)
 * - Target: <1µs per cell average
 * 
 * NOTE: Tests skipped - performance varies by machine/environment
 * TODO: Run these in a dedicated CI performance environment
 */

import { FormatCache } from '../src/FormatCache';

describe.skip('Pipeline Performance: Formatting Stack', () => {
  describe('10k Cell Formatting (Fast Scroll Simulation)', () => {
    it('should format 10,000 mixed cells in <3.3ms (20% frame budget)', () => {
      const formatCache = new FormatCache('en-US');
      
      const formats = [
        '#,##0',          // Integer with grouping
        '#,##0.00',       // Decimal with grouping
        '0%',             // Percent
        '$#,##0.00',      // Currency
        'm/d/yyyy',       // Date
        'h:mm',           // Time
        'General',        // General
        '0',              // Integer no grouping
      ];
      
      // Generate 10,000 test values
      const testCells: Array<{ value: number; format: string }> = [];
      
      for (let i = 0; i < 10000; i++) {
        const formatIdx = i % formats.length;
        const format = formats[formatIdx];
        
        // Generate realistic values based on format
        let value: number;
        if (format.includes('m/d/yyyy')) {
          value = 44927 + Math.floor(Math.random() * 365); // Dates in 2023
        } else if (format.includes('h:mm')) {
          value = Math.random(); // Fractional day (time)
        } else if (format === '0%') {
          value = Math.random(); // 0-1 for percent
        } else {
          value = Math.random() * 10000; // 0-10000 for numbers/currency
        }
        
        testCells.push({ value, format });
      }
      
      // Warm up: format once to initialize caches
      for (let i = 0; i < 100; i++) {
        formatCache.formatValue(testCells[i].value, testCells[i].format);
      }
      
      // Benchmark: Format all 10,000 cells
      const startFormat = performance.now();
      
      for (const cell of testCells) {
        formatCache.formatValue(cell.value, cell.format);
      }
      
      const formatTime = performance.now() - startFormat;
      
      // Validate: Formatting should be <20% of 16.67ms frame budget
      const FRAME_BUDGET_MS = 16.67;
      const FORMAT_BUDGET_MS = FRAME_BUDGET_MS * 0.20; // 20% = 3.33ms
      
      console.log(`\n📊 Formatting Performance (10k cells):`);
      console.log(`   Time: ${formatTime.toFixed(2)}ms`);
      console.log(`   Budget: <${FORMAT_BUDGET_MS.toFixed(2)}ms (20% of ${FRAME_BUDGET_MS}ms frame)`);
      console.log(`   Per cell: ${(formatTime / 10000 * 1000).toFixed(3)}µs`);
      console.log(`   Status: ${formatTime < FORMAT_BUDGET_MS ? '✅ PASS' : '❌ FAIL'}`);
      
      expect(formatTime).toBeLessThan(FORMAT_BUDGET_MS);
    });
    
    it('should maintain <1µs per cell under mixed format load', () => {
      // Stress test: all 16 registered formats + fallback formats
      const formatCache = new FormatCache('en-US');
      
      const registeredFormats = [
        '#,##0',
        '#,##0.00',
        '0',
        '0.00',
        '0%',
        '0.00%',
        '$#,##0.00',
        'm/d/yyyy',
        'd-mmm-yy',
        'h:mm',
        'h:mm:ss',
        'h:mm AM/PM',
        '@', // Text format
        'General',
        'mm/dd/yy',
        '0.0',
      ];
      
      // Add some fallback formats (not in spec map)
      const fallbackFormats = [
        '[Red]#,##0',           // With color
        '£#,##0.00',            // GBP currency
        '[h]:mm:ss',            // Duration
        '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)', // Complex
      ];
      
      const allFormats = [...registeredFormats, ...fallbackFormats];
      
      // Create checkerboard of formats (5000 cells)
      const testCells: Array<{ value: any; format: string }> = [];
      
      for (let i = 0; i < 5000; i++) {
        const formatIdx = i % allFormats.length;
        const format = allFormats[formatIdx];
        
        let value: any;
        if (format === '@') {
          value = `Text-${i}`;
        } else if (format.includes('m/d/yyyy') || format.includes('d-mmm-yy') || format.includes('mm/dd/yy')) {
          value = 44927 + (i % 365);
        } else if (format.includes('h:mm') || format.includes('[h]')) {
          value = (i % 24) / 24; // Fractional day
        } else if (format.includes('%')) {
          value = (i % 100) / 100;
        } else {
          value = i * 1.234567;
        }
        
        testCells.push({ value, format });
      }
      
      // Warm up
      for (let i = 0; i < 50; i++) {
        formatCache.formatValue(testCells[i].value, testCells[i].format);
      }
      
      // Benchmark: Format 5000 cells with maximum format diversity
      const startFormat = performance.now();
      
      for (const cell of testCells) {
        formatCache.formatValue(cell.value, cell.format);
      }
      
      const formatTime = performance.now() - startFormat;
      const perCellTime = (formatTime / 5000) * 1000; // µs per cell
      
      console.log(`\n📊 Mixed Format Performance (5000 cells):`);
      console.log(`   Total: ${formatTime.toFixed(2)}ms`);
      console.log(`   Per cell: ${perCellTime.toFixed(3)}µs`);
      console.log(`   Format types: ${allFormats.length} unique formats`);
      console.log(`   Registered: ${registeredFormats.length} (spec-based)`);
      console.log(`   Fallback: ${fallbackFormats.length} (runtime interpreter)`);
      console.log(`   Status: ${perCellTime < 1.0 ? '✅ PASS' : '❌ FAIL'}`);
      
      // Each cell should format in <1µs on average
      expect(perCellTime).toBeLessThan(1.0);
    });
    
    it('should handle fast scroll simulation (10 frames)', () => {
      // Simulate user scrolling quickly through grid
      // Each frame needs to format ~600 visible cells
      const formatCache = new FormatCache('en-US');
      
      const formats = [
        '#,##0',
        '#,##0.00',
        '0%',
        '$#,##0.00',
        'm/d/yyyy',
        'h:mm',
        'General',
      ];
      
      // Create 10 frames worth of cells (600 cells per frame × 10 frames)
      const framesData: Array<Array<{ value: number; format: string }>> = [];
      
      for (let frame = 0; frame < 10; frame++) {
        const frameData: Array<{ value: number; format: string }> = [];
        
        for (let cellIdx = 0; cellIdx < 600; cellIdx++) {
          const formatIdx = (frame * 600 + cellIdx) % formats.length;
          const format = formats[formatIdx];
          
          let value: number;
          if (format.includes('m/d/yyyy')) {
            value = 44927 + cellIdx;
          } else if (format.includes('h:mm')) {
            value = cellIdx / 1440; // Minutes in a day
          } else if (format === '0%') {
            value = cellIdx / 1000;
          } else {
            value = cellIdx * 10.5;
          }
          
          frameData.push({ value, format });
        }
        
        framesData.push(frameData);
      }
      
      // Warm up
      for (const cell of framesData[0].slice(0, 50)) {
        formatCache.formatValue(cell.value, cell.format);
      }
      
      // Benchmark: 10 frames of formatting
      const frameTimes: number[] = [];
      
      for (const frameData of framesData) {
        const startFrame = performance.now();
        
        for (const cell of frameData) {
          formatCache.formatValue(cell.value, cell.format);
        }
        
        const frameTime = performance.now() - startFrame;
        frameTimes.push(frameTime);
      }
      
      // Calculate statistics
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);
      const minFrameTime = Math.min(...frameTimes);
      
      const FORMAT_BUDGET_MS = 3.33; // 20% of 16.67ms frame budget
      const passCount = frameTimes.filter(t => t < FORMAT_BUDGET_MS).length;
      const passRate = (passCount / frameTimes.length) * 100;
      
      console.log(`\n📊 Fast Scroll Simulation (10 frames × 600 cells):`);
      console.log(`   Avg frame format: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`   Min frame: ${minFrameTime.toFixed(2)}ms`);
      console.log(`   Max frame: ${maxFrameTime.toFixed(2)}ms`);
      console.log(`   Budget: <${FORMAT_BUDGET_MS}ms (20% of frame)`);
      console.log(`   Pass rate: ${passRate.toFixed(0)}% (${passCount}/${frameTimes.length})`);
      console.log(`   Status: ${avgFrameTime < FORMAT_BUDGET_MS ? '✅ PASS' : '❌ FAIL'}`);
      
      // Average should meet budget
      expect(avgFrameTime).toBeLessThan(FORMAT_BUDGET_MS);
      
      // At least 90% of frames should meet budget
      expect(passRate).toBeGreaterThanOrEqual(90);
    });
  });
  
  describe('Performance Regression Detection', () => {
    it('should detect if spec-based formatter degrades to >1µs', () => {
      // This test serves as a canary for performance regressions
      const formatCache = new FormatCache('en-US');
      
      // Use only registered formats (spec-based, should be fastest)
      const registeredFormats = [
        '#,##0',
        '#,##0.00',
        '0%',
        '$#,##0.00',
        'm/d/yyyy',
        'General',
      ];
      
      const testValues: Array<{ value: number; format: string }> = [];
      
      for (let i = 0; i < 1000; i++) {
        const format = registeredFormats[i % registeredFormats.length];
        const value = i * 1.5;
        testValues.push({ value, format });
      }
      
      // Benchmark: 1000 iterations to get stable measurement
      const iterations = 5;
      const times: number[] = [];
      
      for (let iter = 0; iter < iterations; iter++) {
        const start = performance.now();
        
        for (const tv of testValues) {
          formatCache.formatValue(tv.value, tv.format);
        }
        
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const perCellTime = (avgTime / 1000) * 1000; // µs
      
      console.log(`\n📊 Regression Detection (1000 cells × ${iterations} iterations):`);
      console.log(`   Avg iteration: ${avgTime.toFixed(2)}ms`);
      console.log(`   Per cell: ${perCellTime.toFixed(3)}µs`);
      console.log(`   Baseline: ~0.868µs (from NumberFormatter unit tests)`);
      console.log(`   Threshold: <1.0µs`);
      console.log(`   Status: ${perCellTime < 1.0 ? '✅ PASS' : '❌ FAIL - REGRESSION!'}`);
      
      // If this fails, the spec-based formatter has regressed
      expect(perCellTime).toBeLessThan(1.0);
    });
  });
});
