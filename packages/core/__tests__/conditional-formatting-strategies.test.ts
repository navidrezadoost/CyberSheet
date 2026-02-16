import {
	RangeStatisticsComputer,
	RangeStatisticsCache,
	SortedValueStrategy,
	NumericStatsStrategy,
	FrequencyMapStrategy,
	MinMaxStrategy,
	ErrorBlankStrategy,
	StrategyFactory,
	BatchRangeStatistics,
} from '../src/ConditionalFormattingStrategies';
import { Address, Range } from '../src/types';

describe('ConditionalFormattingStrategies - Step 3: Batch Range Evaluation', () => {
	// ============================
	// 2️⃣ One-Pass Statistics Tests
	// ============================

	describe('2️⃣ One-Pass Statistics', () => {
		it('should compute statistics in ONE PASS', () => {
			// Create test data
			const cellData = new Map<string, any>();
			for (let i = 0; i < 100; i++) {
				cellData.set(`${i},0`, i + 1); // 1-100
			}
			
			const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 99, col: 0 } };
			
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			
			// Verify one-pass collection
			expect(stats.min).toBe(1);
			expect(stats.max).toBe(100);
			expect(stats.sum).toBe(5050); // Sum of 1-100
			expect(stats.count).toBe(100);
			expect(stats.average).toBe(50.5);
			expect(stats.numericValues.length).toBe(100);
			expect(stats.frequencyMap.size).toBe(100); // All unique
		});

		it('should collect frequency map for duplicates', () => {
			const cellData = new Map<string, any>();
			cellData.set('0,0', 10);
			cellData.set('0,1', 20);
			cellData.set('0,2', 10); // duplicate
			cellData.set('0,3', 30);
			cellData.set('0,4', 20); // duplicate
			cellData.set('0,5', 10); // duplicate
			
			const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 0, col: 5 } };
			
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			
			expect(stats.frequencyMap.get(10)).toBe(3);
			expect(stats.frequencyMap.get(20)).toBe(2);
			expect(stats.frequencyMap.get(30)).toBe(1);
		});

		it('should track errors and blanks', () => {
			const cellData = new Map<string, any>();
			cellData.set('0,0', 10);
			cellData.set('0,1', '#DIV/0!');
			cellData.set('0,2', null);
			cellData.set('0,3', 20);
			cellData.set('0,4', '');
			
			const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 0, col: 4 } };
			
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			
			expect(stats.hasErrors).toBe(true);
			expect(stats.hasBlanks).toBe(true);
			expect(stats.errorCount).toBe(1);
			expect(stats.blankCount).toBe(2); // null and ''
			expect(stats.count).toBe(2); // Only numeric values
		});

		it('should compute standard deviation', () => {
			const cellData = new Map<string, any>();
			// Values: 10, 20, 30, 40, 50
			for (let i = 0; i < 5; i++) {
				cellData.set(`${i},0`, (i + 1) * 10);
			}
			
			const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 4, col: 0 } };
			
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			
			expect(stats.average).toBe(30);
			// stdDev for [10,20,30,40,50] = sqrt(200) ≈ 14.14
			expect(stats.stdDev).toBeCloseTo(14.142, 2);
		});
	});

	// ============================
	// 1️⃣ Strategy Tests
	// ============================

	describe('1️⃣ Rule → Strategy Mapping', () => {
		describe('SortedValueStrategy (Top/Bottom N)', () => {
			it('should identify top N values', () => {
				const cellData = new Map<string, any>();
				for (let i = 0; i < 10; i++) {
					cellData.set(`${i},0`, i + 1); // 1-10
				}
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 9, col: 0 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new SortedValueStrategy('top', 'number', 3);
				
				expect(strategy.evaluate(10, { row: 9, col: 0 }, stats)).toBe(true); // Top 1
				expect(strategy.evaluate(9, { row: 8, col: 0 }, stats)).toBe(true);  // Top 2
				expect(strategy.evaluate(8, { row: 7, col: 0 }, stats)).toBe(true);  // Top 3
				expect(strategy.evaluate(7, { row: 6, col: 0 }, stats)).toBe(false); // Not in top 3
			});

			it('should identify top N% values', () => {
				const cellData = new Map<string, any>();
				for (let i = 0; i < 100; i++) {
					cellData.set(`${i},0`, i + 1); // 1-100
				}
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 99, col: 0 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new SortedValueStrategy('top', 'percent', 10); // Top 10%
				
				expect(strategy.evaluate(100, { row: 99, col: 0 }, stats)).toBe(true); // Top value
				expect(strategy.evaluate(91, { row: 90, col: 0 }, stats)).toBe(true);  // In top 10%
				expect(strategy.evaluate(90, { row: 89, col: 0 }, stats)).toBe(false); // Not in top 10%
			});
		});

		describe('NumericStatsStrategy (Above/Below Average)', () => {
			it('should identify above average values', () => {
				const cellData = new Map<string, any>();
				for (let i = 0; i < 10; i++) {
					cellData.set(`${i},0`, i + 1); // 1-10, avg = 5.5
				}
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 9, col: 0 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new NumericStatsStrategy('above');
				
				expect(strategy.evaluate(6, { row: 5, col: 0 }, stats)).toBe(true);  // Above 5.5
				expect(strategy.evaluate(5, { row: 4, col: 0 }, stats)).toBe(false); // Below 5.5
			});

			it('should identify above average + N stdDev', () => {
				const cellData = new Map<string, any>();
				// Values: 10, 20, 30, 40, 50 (avg=30, stdDev≈14.14)
				for (let i = 0; i < 5; i++) {
					cellData.set(`${i},0`, (i + 1) * 10);
				}
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 4, col: 0 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new NumericStatsStrategy('above', 1); // above + 1 stdDev
				
				// Threshold = 30 + 14.14 ≈ 44.14
				expect(strategy.evaluate(50, { row: 4, col: 0 }, stats)).toBe(true);  // 50 > 44.14
				expect(strategy.evaluate(40, { row: 3, col: 0 }, stats)).toBe(false); // 40 < 44.14
			});
		});

		describe('FrequencyMapStrategy (Duplicates/Unique)', () => {
			it('should identify duplicate values', () => {
				const cellData = new Map<string, any>();
				cellData.set('0,0', 10);
				cellData.set('0,1', 20);
				cellData.set('0,2', 10); // duplicate
				cellData.set('0,3', 30);
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 0, col: 3 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new FrequencyMapStrategy('duplicate');
				
				expect(strategy.evaluate(10, { row: 0, col: 0 }, stats)).toBe(true);  // Duplicate
				expect(strategy.evaluate(20, { row: 0, col: 1 }, stats)).toBe(false); // Unique
			});

			it('should identify unique values', () => {
				const cellData = new Map<string, any>();
				cellData.set('0,0', 10);
				cellData.set('0,1', 20);
				cellData.set('0,2', 10); // duplicate
				cellData.set('0,3', 30);
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 0, col: 3 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new FrequencyMapStrategy('unique');
				
				expect(strategy.evaluate(10, { row: 0, col: 0 }, stats)).toBe(false); // Duplicate
				expect(strategy.evaluate(20, { row: 0, col: 1 }, stats)).toBe(true);  // Unique
			});
		});

		describe('MinMaxStrategy (Color Scales)', () => {
			it('should calculate position in range', () => {
				const cellData = new Map<string, any>();
				for (let i = 0; i < 11; i++) {
					cellData.set(`${i},0`, i * 10); // 0, 10, 20, ..., 100
				}
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 10, col: 0 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new MinMaxStrategy();
				
				expect(strategy.calculatePosition(0, stats)).toBe(0);    // Min
				expect(strategy.calculatePosition(50, stats)).toBe(0.5); // Mid
				expect(strategy.calculatePosition(100, stats)).toBe(1);  // Max
			});
		});

		describe('ErrorBlankStrategy', () => {
			it('should identify errors', () => {
				const cellData = new Map<string, any>();
				cellData.set('0,0', 10);
				cellData.set('0,1', '#DIV/0!');
				cellData.set('0,2', null);
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 0, col: 2 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new ErrorBlankStrategy('errors');
				
				expect(strategy.evaluate(10, { row: 0, col: 0 }, stats)).toBe(false);
				expect(strategy.evaluate('#DIV/0!', { row: 0, col: 1 }, stats)).toBe(true);
				expect(strategy.evaluate(null, { row: 0, col: 2 }, stats)).toBe(false);
			});

			it('should identify blanks', () => {
				const cellData = new Map<string, any>();
				cellData.set('0,0', 10);
				cellData.set('0,1', '#DIV/0!');
				cellData.set('0,2', null);
				cellData.set('0,3', '');
				
				const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
				const range: Range = { start: { row: 0, col: 0 }, end: { row: 0, col: 3 } };
				const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
				
				const strategy = new ErrorBlankStrategy('blanks');
				
				expect(strategy.evaluate(10, { row: 0, col: 0 }, stats)).toBe(false);
				expect(strategy.evaluate(null, { row: 0, col: 2 }, stats)).toBe(true);
				expect(strategy.evaluate('', { row: 0, col: 3 }, stats)).toBe(true);
			});
		});
	});

	// ============================
	// 3️⃣ Smart Cache Tests
	// ============================

	describe('3️⃣ Smart Cache (per rule, per range)', () => {
		it('should cache statistics per (rule, range)', () => {
			const cache = new RangeStatisticsCache();
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 9, col: 0 } };
			
			const stats: BatchRangeStatistics = {
				min: 1,
				max: 10,
				sum: 55,
				count: 10,
				average: 5.5,
				stdDev: 2.87,
				frequencyMap: new Map(),
				hasErrors: false,
				hasBlanks: false,
				errorCount: 0,
				blankCount: 0,
				allValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				numericValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				rangeKey: '0,0:9,0',
				timestamp: Date.now(),
			};
			
			cache.set('rule1', range, stats);
			
			const cached = cache.get('rule1', range);
			expect(cached).toBeDefined();
			expect(cached?.min).toBe(1);
			expect(cached?.max).toBe(10);
		});

		it('should invalidate cache for specific (rule, range)', () => {
			const cache = new RangeStatisticsCache();
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 9, col: 0 } };
			
			const stats: BatchRangeStatistics = {
				min: 1,
				max: 10,
				sum: 55,
				count: 10,
				average: 5.5,
				stdDev: 2.87,
				frequencyMap: new Map(),
				hasErrors: false,
				hasBlanks: false,
				errorCount: 0,
				blankCount: 0,
				allValues: [],
				numericValues: [],
				rangeKey: '0,0:9,0',
				timestamp: Date.now(),
			};
			
			cache.set('rule1', range, stats);
			expect(cache.get('rule1', range)).toBeDefined();
			
			cache.invalidate('rule1', range);
			expect(cache.get('rule1', range)).toBeUndefined();
		});

		it('should invalidate cache when cell is dirty', () => {
			const cache = new RangeStatisticsCache();
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 9, col: 0 } };
			
			const stats: BatchRangeStatistics = {
				min: 1,
				max: 10,
				sum: 55,
				count: 10,
				average: 5.5,
				stdDev: 2.87,
				frequencyMap: new Map(),
				hasErrors: false,
				hasBlanks: false,
				errorCount: 0,
				blankCount: 0,
				allValues: [],
				numericValues: [],
				rangeKey: '0,0:9,0',
				timestamp: Date.now(),
			};
			
			cache.set('rule1', range, stats);
			
			// Edit cell in range
			cache.invalidateAddress({ row: 5, col: 0 });
			
			expect(cache.get('rule1', range)).toBeUndefined();
		});

		it('should NOT invalidate cache for unrelated cells', () => {
			const cache = new RangeStatisticsCache();
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 9, col: 0 } };
			
			const stats: BatchRangeStatistics = {
				min: 1,
				max: 10,
				sum: 55,
				count: 10,
				average: 5.5,
				stdDev: 2.87,
				frequencyMap: new Map(),
				hasErrors: false,
				hasBlanks: false,
				errorCount: 0,
				blankCount: 0,
				allValues: [],
				numericValues: [],
				rangeKey: '0,0:9,0',
				timestamp: Date.now(),
			};
			
			cache.set('rule1', range, stats);
			
			// Edit cell OUTSIDE range
			cache.invalidateAddress({ row: 20, col: 0 });
			
			expect(cache.get('rule1', range)).toBeDefined(); // Still cached
		});
	});

	// ============================
	// 4️⃣ REAL Performance Test
	// ============================

	describe('4️⃣ Real Performance Test', () => {
		it.skip('✅ PERFORMANCE: 10,000 cells × 5 rules × 1 edit < 50ms', () => {
			// Setup: 10,000 cells
			const cellData = new Map<string, any>();
			for (let i = 0; i < 10000; i++) {
				cellData.set(`${i},0`, Math.random() * 1000);
			}
			
			const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 9999, col: 0 } };
			
			// 5 different strategies
			const strategies = [
				new SortedValueStrategy('top', 'percent', 10),
				new NumericStatsStrategy('above'),
				new FrequencyMapStrategy('duplicate'),
				new MinMaxStrategy(),
				new ErrorBlankStrategy('errors-or-blanks'),
			];
			
			// ⚡ Start timer
			const startTime = performance.now();
			
			// ONE-PASS statistics computation
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			
			// All 5 strategies evaluate using SAME stats (no re-scanning)
			for (const strategy of strategies) {
				// Evaluate a few sample cells
				for (let i = 0; i < 10; i++) {
					const value = cellData.get(`${i * 1000},0`);
					strategy.evaluate(value, { row: i * 1000, col: 0 }, stats);
				}
			}
			
			// ⚡ End timer
			const endTime = performance.now();
			const elapsed = endTime - startTime;
			
			// ✅ Assert: < 50ms
			expect(elapsed).toBeLessThan(50);
			
			console.log(`\n✅ PERFORMANCE TEST PASSED: ${elapsed.toFixed(2)}ms for 10k cells × 5 rules\n`);
		});

		it('✅ PERFORMANCE: Each range scanned only ONCE', () => {
			let scanCount = 0;
			
			const cellData = new Map<string, any>();
			for (let i = 0; i < 1000; i++) {
				cellData.set(`${i},0`, i + 1);
			}
			
			// Wrap getValue to count scans
			const getValue = (addr: Address) => {
				scanCount++;
				return cellData.get(`${addr.row},${addr.col}`) ?? null;
			};
			
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 999, col: 0 } };
			
			// Compute statistics (ONE scan)
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			
			// Record scan count after first pass
			const scansAfterCompute = scanCount;
			
			// Multiple strategies evaluate using SAME stats
			const strategies = [
				new SortedValueStrategy('top', 'number', 10),
				new NumericStatsStrategy('above'),
				new FrequencyMapStrategy('duplicate'),
			];
			
			// All strategies evaluate WITHOUT re-scanning
			for (const strategy of strategies) {
				for (let i = 0; i < 10; i++) {
					const value = cellData.get(`${i},0`);
					strategy.evaluate(value, { row: i, col: 0 }, stats);
				}
			}
			
			// ✅ Assert: scan count unchanged (no additional scans)
			expect(scanCount).toBe(scansAfterCompute);
			expect(scanCount).toBe(1000); // Only the initial ONE-PASS scan
		});

		it('✅ PERFORMANCE: Cache invalidation is accurate', () => {
			const cache = new RangeStatisticsCache();
			const cellData = new Map<string, any>();
			
			for (let i = 0; i < 100; i++) {
				cellData.set(`${i},0`, i + 1);
			}
			
			const getValue = (addr: Address) => cellData.get(`${addr.row},${addr.col}`) ?? null;
			const range: Range = { start: { row: 0, col: 0 }, end: { row: 99, col: 0 } };
			
			// Compute and cache statistics
			const stats = RangeStatisticsComputer.computeStatistics(range, getValue);
			cache.set('rule1', range, stats);
			
			// Cache should be valid
			expect(cache.get('rule1', range)).toBeDefined();
			
			// Edit cell in range → cache invalidated
			cellData.set('50,0', 999);
			cache.invalidateAddress({ row: 50, col: 0 });
			
			// ✅ Assert: cache invalidated
			expect(cache.get('rule1', range)).toBeUndefined();
			
			// Recompute with new data
			const newStats = RangeStatisticsComputer.computeStatistics(range, getValue);
			cache.set('rule1', range, newStats);
			
			// ✅ Assert: new stats reflect change
			expect(newStats.max).toBe(999); // Changed from 100 to 999
		});
	});

	// ============================
	// Strategy Factory
	// ============================

	describe('Strategy Factory', () => {
		it('should create strategy for top-bottom rule', () => {
			const strategy = StrategyFactory.createStrategy('top-bottom', {
				mode: 'top',
				rankType: 'number',
				rank: 10,
			});
			
			expect(strategy).toBeInstanceOf(SortedValueStrategy);
			expect(strategy?.strategyType).toBe('sorted-value');
		});

		it('should create strategy for above-average rule', () => {
			const strategy = StrategyFactory.createStrategy('above-average', {
				mode: 'above',
			});
			
			expect(strategy).toBeInstanceOf(NumericStatsStrategy);
			expect(strategy?.strategyType).toBe('numeric-stats');
		});

		it('should create strategy for duplicate-unique rule', () => {
			const strategy = StrategyFactory.createStrategy('duplicate-unique', {
				mode: 'duplicate',
			});
			
			expect(strategy).toBeInstanceOf(FrequencyMapStrategy);
			expect(strategy?.strategyType).toBe('frequency-map');
		});

		it('should return null for rules that do not use batch evaluation', () => {
			const strategy = StrategyFactory.createStrategy('formula', {});
			expect(strategy).toBeNull();
		});
	});
});
