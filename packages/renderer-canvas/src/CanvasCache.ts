/**
 * CanvasCache.ts
 * Week 12 Day 7: Performance Optimization
 * 
 * LRU cache for rendered canvas elements to improve performance by:
 * - Preventing redundant re-rendering of static elements
 * - Managing memory with configurable limits
 * - Automatic expiration via TTL
 * - Hit/miss rate tracking
 * 
 * @example Basic usage
 * ```typescript
 * const cache = new CanvasCache({
 *   maxEntries: 50,
 *   maxSize: 50 * 1024 * 1024, // 50MB
 *   ttl: 5 * 60 * 1000          // 5 minutes
 * });
 * 
 * const key = CanvasCache.generateKey('chart', chartType, data);
 * let canvas = cache.get(key);
 * 
 * if (!canvas) {
 *   // Cache miss - render chart
 *   canvas = renderChart(data);
 *   cache.set(key, canvas);
 * }
 * ```
 * 
 * @example Using global cache
 * ```typescript
 * import { globalCanvasCache } from '@cyber-sheet/renderer-canvas';
 * 
 * const key = CanvasCache.generateKey('legend', options);
 * const cached = globalCanvasCache.get(key) || renderLegend(options);
 * globalCanvasCache.set(key, cached);
 * ```
 * 
 * @example Monitoring cache performance
 * ```typescript
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
 * console.log(`Entries: ${stats.entries}, Size: ${stats.size} bytes`);
 * console.log(`Evictions: ${stats.evictions}`);
 * ```
 */

/**
 * Internal cache entry storing canvas and metadata
 * @internal
 */
interface CacheEntry {
  /**
   * Cached canvas
   */
  canvas: HTMLCanvasElement;
  
  /**
   * Creation timestamp
   */
  timestamp: number;
  
  /**
   * Access count
   */
  accessCount: number;
  
  /**
   * Last access timestamp
   */
  lastAccess: number;
  
  /**
   * Cache key
   */
  key: string;
  
  /**
   * Estimated size in bytes
   */
  size: number;
}

/**
 * Configuration options for canvas cache
 * 
 * Controls cache behavior including size limits, expiration, and cleanup.
 * 
 * @example Custom cache configuration
 * ```typescript
 * const config: CacheConfig = {
 *   maxEntries: 100,                    // Max 100 cached canvases
 *   maxSize: 100 * 1024 * 1024,         // 100MB max memory
 *   ttl: 10 * 60 * 1000,                // 10 minute expiration
 *   autoCleanup: true                   // Auto-cleanup every 60s
 * };
 * const cache = new CanvasCache(config);
 * ```
 */
export interface CacheConfig {
  /**
   * Maximum cache entries
   * @default 50
   */
  maxEntries?: number;
  
  /**
   * Maximum cache size in bytes
   * @default 50MB
   */
  maxSize?: number;
  
  /**
   * Time to live in milliseconds
   * @default 5 minutes
   */
  ttl?: number;
  
  /**
   * Enable automatic cleanup
   * @default true
   */
  autoCleanup?: boolean;
}

/**
 * Cache performance statistics
 * 
 * Provides metrics for monitoring cache effectiveness and memory usage.
 * 
 * @example Monitoring cache performance
 * ```typescript
 * const stats = cache.getStats();
 * 
 * console.log('Cache Performance:');
 * console.log(`  Hits: ${stats.hits}`);
 * console.log(`  Misses: ${stats.misses}`);
 * console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
 * console.log(`  Entries: ${stats.entries}`);
 * console.log(`  Memory: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
 * console.log(`  Evictions: ${stats.evictions}`);
 * ```
 */
export interface CacheStats {
  /**
   * Total cache hits
   */
  hits: number;
  
  /**
   * Total cache misses
   */
  misses: number;
  
  /**
   * Hit rate (0-1)
   */
  hitRate: number;
  
  /**
   * Current number of entries
   */
  entries: number;
  
  /**
   * Current cache size in bytes
   */
  size: number;
  
  /**
   * Total evictions
   */
  evictions: number;
}

/**
 * Canvas caching for static elements
 */
export class CanvasCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  
  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 50,
      maxSize: config.maxSize ?? 50 * 1024 * 1024, // 50MB
      ttl: config.ttl ?? 5 * 60 * 1000, // 5 minutes
      autoCleanup: config.autoCleanup ?? true
    };
    
    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }
  
  /**
   * Generate cache key from parameters
   */
  static generateKey(...params: any[]): string {
    return JSON.stringify(params);
  }
  
  /**
   * Get cached canvas
   */
  get(key: string): HTMLCanvasElement | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.canvas;
  }
  
  /**
   * Store canvas in cache
   */
  set(key: string, canvas: HTMLCanvasElement): void {
    const size = this.estimateCanvasSize(canvas);
    
    // Check if we need to evict entries
    this.evictIfNeeded(size);
    
    const entry: CacheEntry = {
      canvas,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      key,
      size
    };
    
    this.cache.set(key, entry);
  }
  
  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Remove entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      entries: this.cache.size,
      size: totalSize,
      evictions: this.stats.evictions
    };
  }
  
  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Estimate canvas memory size
   */
  private estimateCanvasSize(canvas: HTMLCanvasElement): number {
    // 4 bytes per pixel (RGBA)
    return canvas.width * canvas.height * 4;
  }
  
  /**
   * Evict entries if cache is full
   */
  private evictIfNeeded(newEntrySize: number): void {
    // Check entry count
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }
    
    // Check cache size
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    if (totalSize + newEntrySize > this.config.maxSize) {
      this.evictLRU();
    }
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestEntry: CacheEntry | null = null;
    let oldestKey: string | null = null;
    
    for (const [key, entry] of this.cache) {
      if (!oldestEntry || entry.lastAccess < oldestEntry.lastAccess) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
  
  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }
  
  /**
   * Get cache entry details
   */
  getEntryDetails(key: string): {
    exists: boolean;
    size?: number;
    age?: number;
    accessCount?: number;
  } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false };
    }
    
    return {
      exists: true,
      size: entry.size,
      age: Date.now() - entry.timestamp,
      accessCount: entry.accessCount
    };
  }
  
  /**
   * Clone a cached canvas
   */
  clone(key: string): HTMLCanvasElement | null {
    const cached = this.get(key);
    
    if (!cached) {
      return null;
    }
    
    const clone = document.createElement('canvas');
    clone.width = cached.width;
    clone.height = cached.height;
    
    const ctx = clone.getContext('2d');
    if (ctx) {
      ctx.drawImage(cached, 0, 0);
    }
    
    return clone;
  }
  
  /**
   * Preload cache with rendered elements
   */
  async preload(
    keys: string[],
    renderFn: (key: string) => HTMLCanvasElement | Promise<HTMLCanvasElement>
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        const canvas = await renderFn(key);
        this.set(key, canvas);
      }
    });
    
    await Promise.all(promises);
  }
}

/**
 * Global canvas cache instance
 */
export const globalCanvasCache = new CanvasCache();
