/**
 * canvas-cache.test.ts
 * Week 12 Day 7: Canvas Cache Tests
 */

import { CanvasCache, globalCanvasCache } from '../src/CanvasCache';

// Mock canvas creation
const createMockCanvas = (width = 100, height = 100): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const mockContext = {
    fillStyle: '',
    fillRect: jest.fn(),
    drawImage: jest.fn()
  };
  
  Object.defineProperty(canvas, 'getContext', {
    value: jest.fn(() => mockContext),
    writable: true,
    configurable: true
  });
  
  return canvas;
};

describe('CanvasCache', () => {
  let cache: CanvasCache;

  beforeEach(() => {
    cache = new CanvasCache({
      maxEntries: 10,
      maxSize: 1024 * 1024, // 1MB
      ttl: 1000, // 1 second
      autoCleanup: false
    });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve canvas', () => {
      const canvas = createMockCanvas();
      const key = 'test-key';
      
      cache.set(key, canvas);
      const retrieved = cache.get(key);
      
      expect(retrieved).toBe(canvas);
    });

    it('should return null for non-existent key', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should check if key exists', () => {
      const canvas = createMockCanvas();
      cache.set('test-key', canvas);
      
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('other-key')).toBe(false);
    });

    it('should delete entry', () => {
      const canvas = createMockCanvas();
      cache.set('test-key', canvas);
      
      const deleted = cache.delete('test-key');
      
      expect(deleted).toBe(true);
      expect(cache.has('test-key')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', createMockCanvas());
      cache.set('key2', createMockCanvas());
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits', () => {
      const canvas = createMockCanvas();
      cache.set('key1', canvas);
      
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2/3);
    });

    it('should track cache size', () => {
      const canvas1 = createMockCanvas(100, 100);
      const canvas2 = createMockCanvas(200, 200);
      
      cache.set('key1', canvas1);
      cache.set('key2', canvas2);
      
      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should track evictions', () => {
      // Fill cache beyond maxEntries
      for (let i = 0; i < 12; i++) {
        cache.set(`key${i}`, createMockCanvas());
      }
      
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('Eviction', () => {
    it('should evict least recently used entry', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, createMockCanvas());
      }
      
      // Access key9 to make it most recently used
      cache.get('key9');
      
      // Add new entry, should evict one of the unaccessed keys
      cache.set('key10', createMockCanvas());
      
      // key9 should still be there (most recently accessed)
      expect(cache.has('key9')).toBe(true);
      // key10 should be there (just added)
      expect(cache.has('key10')).toBe(true);
      // Total should be at capacity (10 entries)
      expect(cache.size()).toBe(10);
    });

    it('should evict when cache size exceeds limit', () => {
      const smallCache = new CanvasCache({
        maxEntries: 100,
        maxSize: 100 * 100 * 4 * 2, // Space for 2 canvases
        autoCleanup: false
      });
      
      smallCache.set('key1', createMockCanvas(100, 100));
      smallCache.set('key2', createMockCanvas(100, 100));
      smallCache.set('key3', createMockCanvas(100, 100));
      
      const stats = smallCache.getStats();
      expect(stats.entries).toBeLessThan(3);
    });
  });

  describe('Expiration', () => {
    it('should return null for expired entries', (done) => {
      const shortCache = new CanvasCache({
        maxEntries: 10,
        ttl: 50, // 50ms
        autoCleanup: false
      });
      
      shortCache.set('key1', createMockCanvas());
      
      setTimeout(() => {
        const retrieved = shortCache.get('key1');
        expect(retrieved).toBeNull();
        done();
      }, 60);
    });

    it('should clean up expired entries', (done) => {
      const shortCache = new CanvasCache({
        maxEntries: 10,
        ttl: 50,
        autoCleanup: false
      });
      
      shortCache.set('key1', createMockCanvas());
      shortCache.set('key2', createMockCanvas());
      
      setTimeout(() => {
        shortCache.cleanup();
        expect(shortCache.size()).toBe(0);
        done();
      }, 60);
    });
  });

  describe('Key Management', () => {
    it('should list all keys', () => {
      cache.set('key1', createMockCanvas());
      cache.set('key2', createMockCanvas());
      cache.set('key3', createMockCanvas());
      
      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should generate cache key from parameters', () => {
      const key1 = CanvasCache.generateKey('chart', 'line', { width: 800 });
      const key2 = CanvasCache.generateKey('chart', 'line', { width: 800 });
      const key3 = CanvasCache.generateKey('chart', 'bar', { width: 800 });
      
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('Entry Details', () => {
    it('should get entry details', () => {
      const canvas = createMockCanvas();
      cache.set('key1', canvas);
      cache.get('key1'); // Access once
      
      const details = cache.getEntryDetails('key1');
      
      expect(details.exists).toBe(true);
      expect(details.size).toBeGreaterThan(0);
      expect(details.age).toBeGreaterThanOrEqual(0);
      expect(details.accessCount).toBe(1);
    });

    it('should return not exists for missing key', () => {
      const details = cache.getEntryDetails('non-existent');
      expect(details.exists).toBe(false);
    });
  });

  describe('Clone', () => {
    it('should clone cached canvas', () => {
      const canvas = createMockCanvas();
      cache.set('key1', canvas);
      
      const clone = cache.clone('key1');
      
      expect(clone).not.toBeNull();
      expect(clone).not.toBe(canvas);
      expect(clone?.width).toBe(canvas.width);
      expect(clone?.height).toBe(canvas.height);
    });

    it('should return null for non-existent key', () => {
      const clone = cache.clone('non-existent');
      expect(clone).toBeNull();
    });
  });

  describe('Preload', () => {
    it('should preload cache with rendered elements', async () => {
      const renderFn = jest.fn((key: string) => {
        return createMockCanvas();
      });
      
      await cache.preload(['key1', 'key2', 'key3'], renderFn);
      
      expect(renderFn).toHaveBeenCalledTimes(3);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
    });

    it('should not re-render existing entries', async () => {
      cache.set('key1', createMockCanvas());
      
      const renderFn = jest.fn(() => createMockCanvas());
      
      await cache.preload(['key1', 'key2'], renderFn);
      
      expect(renderFn).toHaveBeenCalledTimes(1); // Only key2
    });
  });

  describe('Global Cache', () => {
    it('should provide global cache instance', () => {
      expect(globalCanvasCache).toBeInstanceOf(CanvasCache);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large canvas', () => {
      const largeCanvas = createMockCanvas(2000, 2000);
      cache.set('large', largeCanvas);
      
      expect(cache.has('large')).toBe(true);
    });

    it('should handle rapid sequential access', () => {
      const canvas = createMockCanvas();
      cache.set('key1', canvas);
      
      for (let i = 0; i < 100; i++) {
        cache.get('key1');
      }
      
      const details = cache.getEntryDetails('key1');
      expect(details.accessCount).toBe(100);
    });

    it('should handle many entries', () => {
      const manyCache = new CanvasCache({
        maxEntries: 1000,
        autoCleanup: false
      });
      
      for (let i = 0; i < 500; i++) {
        manyCache.set(`key${i}`, createMockCanvas(10, 10));
      }
      
      expect(manyCache.size()).toBe(500);
    });
  });
});
