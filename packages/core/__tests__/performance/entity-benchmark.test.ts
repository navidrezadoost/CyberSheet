/**
 * Week 2 Phase 2 — Entity Member Access Performance Benchmark
 * 
 * Purpose: Measure structural overhead of entity member access implementation
 * 
 * Tests:
 * 1. Scalar member access baseline
 * 2. Binary operation with member access (operator depth scan cost)
 * 3. Mixed aggregate + entity interaction
 * 4. Entity-heavy sheet simulation
 * 
 * Decision thresholds:
 * - <2%: Structurally healthy
 * - 2-4%: Acceptable, monitor
 * - 4-6%: Warning zone
 * - >6%: Tokenization recommended
 */

import { FormulaEngine } from '../../src/FormulaEngine';
import { createEntityValue } from '../../src/types/entity-types';

describe('Entity Member Access Performance Benchmark', () => {
  // Instrumentation: Track operator-level scan count
  let scanCount = 0;
  
  // Hook for counting (we'll patch the engine if needed)
  const instrumentScanCount = () => {
    scanCount = 0;
  };
  
  const getScanCount = () => scanCount;
  
  // Benchmark infrastructure
  const runBenchmark = (
    name: string,
    setup: () => void,
    operation: () => void,
    iterations: number = 10000
  ): { mean: number; p95: number; max: number; min: number } => {
    setup();
    
    const times: number[] = [];
    
    // Warmup (JIT optimization)
    for (let i = 0; i < 100; i++) {
      operation();
    }
    
    // Actual measurement
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      operation();
      const end = performance.now();
      times.push(end - start);
    }
    
    // Statistics
    times.sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const p95Index = Math.floor(times.length * 0.95);
    const p95 = times[p95Index];
    const max = times[times.length - 1];
    const min = times[0];
    
    return { mean, p95, max, min };
  };
  
  describe('Benchmark 1: Scalar Member Access', () => {
    test('should measure A1.Price baseline performance', () => {
      let engine: FormulaEngine;
      let context: any;
      
      const setup = () => {
        engine = new FormulaEngine();
        
        const product = createEntityValue(
          'Product',
          'Widget ($29.99)',
          {
            ProductID: 101,
            Price: 29.99,
            Name: 'Widget'
          }
        );
        
        context = {
          getCell: (row: number, col: number) => {
            if (row === 1 && col === 1) return { value: product };
            return { value: 0 };
          },
          currentCell: { row: 10, col: 10 }
        };
      };
      
      const operation = () => {
        engine.evaluate('=A1.Price', context);
      };
      
      const results = runBenchmark('Scalar member access', setup, operation);
      
      console.log('\n📊 Benchmark 1: Scalar Member Access (=A1.Price)');
      console.log(`   Mean:  ${results.mean.toFixed(6)} ms`);
      console.log(`   P95:   ${results.p95.toFixed(6)} ms`);
      console.log(`   Max:   ${results.max.toFixed(6)} ms`);
      console.log(`   Min:   ${results.min.toFixed(6)} ms`);
      
      // Sanity check: should complete in reasonable time
      expect(results.mean).toBeLessThan(1.0);
    });
  });
  
  describe('Benchmark 2: Binary Member Access', () => {
    test('should measure A1.Price + A2.Price (operator depth scan)', () => {
      let engine: FormulaEngine;
      let context: any;
      
      const setup = () => {
        engine = new FormulaEngine();
        
        const product1 = createEntityValue(
          'Product',
          '$29.99',
          { Price: 29.99 }
        );
        
        const product2 = createEntityValue(
          'Product',
          '$19.99',
          { Price: 19.99 }
        );
        
        context = {
          getCell: (row: number, col: number) => {
            if (row === 1 && col === 1) return { value: product1 };
            if (row === 2 && col === 1) return { value: product2 };
            return { value: 0 };
          },
          currentCell: { row: 10, col: 10 }
        };
      };
      
      const operation = () => {
        engine.evaluate('=A1.Price + A2.Price', context);
      };
      
      const results = runBenchmark('Binary member access', setup, operation);
      
      console.log('\n📊 Benchmark 2: Binary Member Access (=A1.Price + A2.Price)');
      console.log(`   Mean:  ${results.mean.toFixed(6)} ms`);
      console.log(`   P95:   ${results.p95.toFixed(6)} ms`);
      console.log(`   Max:   ${results.max.toFixed(6)} ms`);
      console.log(`   Min:   ${results.min.toFixed(6)} ms`);
      
      expect(results.mean).toBeLessThan(1.5);
    });
  });
  
  describe('Benchmark 3: Aggregate + Entity Interaction', () => {
    test('should measure SUM(A1:A100) control case', () => {
      let engine: FormulaEngine;
      let context: any;
      
      const setup = () => {
        engine = new FormulaEngine();
        
        context = {
          getCell: (row: number, col: number) => {
            if (row >= 1 && row <= 100 && col === 1) {
              return { value: row };
            }
            return { value: 0 };
          },
          currentCell: { row: 10, col: 10 }
        };
      };
      
      const operation = () => {
        engine.evaluate('=SUM(A1:A100)', context);
      };
      
      const results = runBenchmark('Aggregate control', setup, operation);
      
      console.log('\n📊 Benchmark 3a: Aggregate Control (=SUM(A1:A100))');
      console.log(`   Mean:  ${results.mean.toFixed(6)} ms`);
      console.log(`   P95:   ${results.p95.toFixed(6)} ms`);
      console.log(`   Max:   ${results.max.toFixed(6)} ms`);
      console.log(`   Min:   ${results.min.toFixed(6)} ms`);
      
      expect(results.mean).toBeLessThan(2.0);
    });
    
    test('should measure SUM(A1:A100) + B1.Total (mixed interaction)', () => {
      let engine: FormulaEngine;
      let context: any;
      
      const setup = () => {
        engine = new FormulaEngine();
        
        const summary = createEntityValue(
          'Summary',
          'Total: $1000',
          { Total: 1000 }
        );
        
        context = {
          getCell: (row: number, col: number) => {
            if (row >= 1 && row <= 100 && col === 1) {
              return { value: row };
            }
            if (row === 1 && col === 2) {
              return { value: summary };
            }
            return { value: 0 };
          },
          currentCell: { row: 10, col: 10 }
        };
      };
      
      const operation = () => {
        engine.evaluate('=SUM(A1:A100) + B1.Total', context);
      };
      
      const results = runBenchmark('Mixed aggregate + entity', setup, operation);
      
      console.log('\n📊 Benchmark 3b: Mixed Interaction (=SUM(A1:A100) + B1.Total)');
      console.log(`   Mean:  ${results.mean.toFixed(6)} ms`);
      console.log(`   P95:   ${results.p95.toFixed(6)} ms`);
      console.log(`   Max:   ${results.max.toFixed(6)} ms`);
      console.log(`   Min:   ${results.min.toFixed(6)} ms`);
      
      expect(results.mean).toBeLessThan(2.5);
    });
  });
  
  describe('Benchmark 4: Entity-Heavy Sheet Simulation', () => {
    test('should measure 500 entities × 200 formulas × 100 recompute cycles', () => {
      let engine: FormulaEngine;
      let contexts: any[];
      
      const setup = () => {
        engine = new FormulaEngine();
        
        // Create 500 entity values
        const entities = Array.from({ length: 500 }, (_, i) => 
          createEntityValue(
            'Product',
            `Product ${i + 1}`,
            {
              ID: i + 1,
              Value: Math.random() * 100,
              Price: Math.random() * 50
            }
          )
        );
        
        // Create 100 different evaluation contexts (simulating recompute)
        contexts = Array.from({ length: 100 }, () => ({
          getCell: (row: number, col: number) => {
            if (row >= 1 && row <= 500 && col === 1) {
              return { value: entities[row - 1] };
            }
            return { value: 0 };
          },
          currentCell: { row: 10, col: 10 }
        }));
      };
      
      const operation = () => {
        // Simulate 200 formulas evaluated once
        for (let i = 0; i < 200; i++) {
          const row = (i % 500) + 1;
          const formula = `=A${row}.Value + A${row}.Price`;
          engine.evaluate(formula, contexts[0]);
        }
      };
      
      const results = runBenchmark('Entity-heavy sheet', setup, operation, 100);
      
      console.log('\n📊 Benchmark 4: Entity-Heavy Sheet');
      console.log(`   (500 entities, 200 formulas per iteration)`);
      console.log(`   Mean:  ${results.mean.toFixed(6)} ms`);
      console.log(`   P95:   ${results.p95.toFixed(6)} ms`);
      console.log(`   Max:   ${results.max.toFixed(6)} ms`);
      console.log(`   Min:   ${results.min.toFixed(6)} ms`);
      
      expect(results.mean).toBeLessThan(100);
    });
  });
  
  describe('Benchmark 5: Control Baseline (No Entity)', () => {
    test('should measure simple arithmetic baseline for comparison', () => {
      let engine: FormulaEngine;
      let context: any;
      
      const setup = () => {
        engine = new FormulaEngine();
        
        context = {
          getCell: (row: number, col: number) => {
            if (row === 1 && col === 1) return { value: 29.99 };
            if (row === 2 && col === 1) return { value: 19.99 };
            return { value: 0 };
          },
          currentCell: { row: 10, col: 10 }
        };
      };
      
      const operation = () => {
        engine.evaluate('=A1 + A2', context);
      };
      
      const results = runBenchmark('Control baseline', setup, operation);
      
      console.log('\n📊 Benchmark 5: Control Baseline (=A1 + A2, no entity)');
      console.log(`   Mean:  ${results.mean.toFixed(6)} ms`);
      console.log(`   P95:   ${results.p95.toFixed(6)} ms`);
      console.log(`   Max:   ${results.max.toFixed(6)} ms`);
      console.log(`   Min:   ${results.min.toFixed(6)} ms`);
      
      expect(results.mean).toBeLessThan(0.5);
    });
  });
});
