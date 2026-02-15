/**
 * StyleCache: Workbook-level immutable style interning
 * 
 * Enterprise-Grade Formatting Foundation
 * - Structural equality → Reference equality
 * - O(1) lookup with collision resolution
 * - Workbook-level deduplication (cross-sheet)
 * - Reference counting for automatic GC
 * 
 * Performance Contract:
 * - Hit rate: ≥90% (typical), ≥80% (designer)
 * - Intern time: <0.1ms avg
 * - Memory: <1MB overhead (5k unique styles)
 * - Collisions: <5%
 * 
 * Gate: ALL benchmarks must pass before Layout Layer.
 */

import type { CellStyle } from './types';

/**
 * Symbol to mark interned styles (dev mode safeguard).
 * 
 * Purpose: Prevents accidental non-interned style usage at render boundaries.
 * Protects against ecosystem integration drift (React, XLSX, toolbar mutations).
 * 
 * Rule: UI layer must NEVER construct full style objects.
 * Only StyleCache.intern() may create canonical styles.
 */
const INTERNED_SYMBOL = Symbol.for('__cyber_sheet_interned__');

/**
 * Check if a style has been interned through StyleCache.
 * 
 * Used at render boundaries to enforce canonical identity.
 * Only enabled in development mode (zero runtime cost in production).
 * 
 * @param style Style to check
 * @returns true if style was interned
 */
export function isInternedStyle(style: CellStyle | undefined): boolean {
  if (!style) return true; // undefined/null are valid
  return !!(style as any)[INTERNED_SYMBOL];
}

/**
 * Assert that a style is interned (dev mode only).
 * 
 * Throws if non-interned style detected.
 * Guards against UI layer bypassing StyleCache.
 * 
 * @param style Style to validate
 * @param context Context for error message (e.g., 'CanvasRenderer.render')
 */
export function assertInternedStyle(style: CellStyle | undefined, context: string): void {
  // Only enforce in development
  // @ts-ignore - process.env is available in Node.js and bundlers (Vite/Webpack)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  
  if (style && !isInternedStyle(style)) {
    throw new Error(
      `[StyleCache] Non-interned style detected at ${context}. ` +
      `All styles must pass through StyleCache.intern() before rendering. ` +
      `This prevents identity fragmentation and ensures canonical references.`
    );
  }
}

/**
 * Hash function for CellStyle objects.
 * 
 * Strategy:
 * 1. Bitmask for boolean flags (8 bits, single XOR)
 * 2. Prime multiplication for numeric properties
 * 3. djb2 hash for string properties
 * 4. XOR mixing for collision resistance
 * 
 * Critical: Hash quality determines collision rate.
 * Target: <5% collisions for 5k unique styles.
 * 
 * @internal Exported for benchmarking only
 */
export function hashStyle(style: CellStyle): number {
  // Start with a non-zero seed to handle empty objects
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  
  // === Flags Bitmask ===
  // Single operation for all boolean properties
  const flags =
    (style.bold ? 1 << 0 : 0) |
    (style.italic ? 1 << 1 : 0) |
    (style.underline ? 1 << 2 : 0) |
    (style.wrap ? 1 << 3 : 0) |
    (style.shrinkToFit ? 1 << 4 : 0) |
    (style.strikethrough ? 1 << 5 : 0) |
    (style.superscript ? 1 << 6 : 0) |
    (style.subscript ? 1 << 7 : 0);
  
  // Mix flags with FNV prime
  if (flags !== 0) {
    hash ^= flags;
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  
  // === Numeric Properties (Prime Multiplication + Mix) ===
  // Different primes for each property to reduce collisions
  if (style.fontSize !== undefined) {
    hash ^= (style.fontSize * 31) | 0;
    hash = Math.imul(hash, 0x01000193);
  }
  
  if (style.rotation !== undefined) {
    hash ^= (style.rotation * 37) | 0;
    hash = Math.imul(hash, 0x01000193);
  }
  
  // Phase 1 UI: indent (normalized: 0 === undefined, skip if 0)
  if (style.indent !== undefined && style.indent !== 0) {
    hash ^= (style.indent * 41) | 0;
    hash = Math.imul(hash, 0x01000193);
  }
  
  // === String Properties (djb2 Hash with better mixing) ===
  if (style.fontFamily) {
    for (let i = 0; i < style.fontFamily.length; i++) {
      hash ^= style.fontFamily.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  
  // Handle color (string or ExcelColorSpec)
  if (style.color) {
    // Include property name to distinguish from fill
    hash ^= 'color'.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
    
    if (typeof style.color === 'string') {
      for (let i = 0; i < style.color.length; i++) {
        hash ^= style.color.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
    } else {
      // ExcelColorSpec: hash object structure
      hash ^= hashObject(style.color);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  
  // Handle fill (string or ExcelColorSpec)
  if (style.fill) {
    // Include property name to distinguish from color
    hash ^= 'fill'.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
    
    if (typeof style.fill === 'string') {
      for (let i = 0; i < style.fill.length; i++) {
        hash ^= style.fill.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
    } else {
      hash ^= hashObject(style.fill);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  
  // === Alignment (Enum → Number with mixing) ===
  if (style.align) {
    const alignValue = { left: 1, center: 2, right: 3 }[style.align] || 0;
    hash ^= (alignValue * 43) | 0;
    hash = Math.imul(hash, 0x01000193);
  }
  
  if (style.valign) {
    const valignValue = { top: 1, middle: 2, bottom: 3 }[style.valign] || 0;
    hash ^= (valignValue * 47) | 0;
    hash = Math.imul(hash, 0x01000193);
  }
  
  // === Text Overflow ===
  if (style.textOverflow) {
    const overflowValue = { clip: 1, ellipsis: 2, overflow: 3 }[style.textOverflow] || 0;
    hash ^= (overflowValue * 53) | 0;
    hash = Math.imul(hash, 0x01000193);
  }
  
  // === Number Format ===
  if (style.numberFormat) {
    for (let i = 0; i < style.numberFormat.length; i++) {
      hash ^= style.numberFormat.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  
  // === Borders ===
  if (style.border) {
    hash ^= hashObject(style.border);
    hash = Math.imul(hash, 0x01000193);
  }
  
  // === Final Avalanche Mixing ===
  // Improve distribution in lower bits
  hash ^= (hash >>> 16);
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= (hash >>> 13);
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= (hash >>> 16);
  
  // Return unsigned 32-bit integer
  return hash >>> 0;
}

/**
 * Hash a generic object (for nested structures like borders, colors)
 * @internal
 */
function hashObject(obj: any): number {
  let hash = 0x811c9dc5; // FNV offset basis
  
  // Sort keys for stable hashing
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    // Hash key name
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    
    // Hash value
    const value = obj[key];
    if (typeof value === 'string') {
      for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
    } else if (typeof value === 'number') {
      hash ^= (value * 59) | 0;
      hash = Math.imul(hash, 0x01000193);
    } else if (typeof value === 'boolean') {
      hash ^= (value ? 61 : 67) | 0;
      hash = Math.imul(hash, 0x01000193);
    } else if (typeof value === 'object' && value !== null) {
      hash ^= hashObject(value);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  
  return hash;
}

/**
 * Normalize style to canonical form for stable hashing.
 * 
 * Operations:
 * 1. Remove undefined properties
 * 2. Sort object keys (stable property order)
 * 3. Convert default values to explicit (e.g., bold: false)
 * 
 * Benefits:
 * - Stable hash for equivalent styles
 * - Fewer collisions (consistent representation)
 * - Faster deepEquals (same structure)
 * 
 * @internal Exported for benchmarking only
 */
export function normalizeStyle(style: CellStyle): CellStyle {
  // Handle edge case: empty/undefined style
  if (!style || Object.keys(style).length === 0) {
    return {};
  }
  
  const normalized: Partial<CellStyle> = {};
  
  // Phase 1 UI: Enforce mutual exclusivity BEFORE normalization
  // superscript takes precedence over subscript
  const hasSuperscript = style.superscript === true;
  const hasSubscript = style.subscript === true;
  
  // Copy defined properties in canonical order
  const keys = Object.keys(style).sort() as Array<keyof CellStyle>;
  
  for (const key of keys) {
    const value = style[key];
    
    // Skip undefined
    if (value === undefined) {
      continue;
    }
    
    // Phase 1 UI: Normalize boolean flags (false === undefined)
    if (typeof value === 'boolean' && value === false) {
      continue; // Skip false boolean values (same as undefined)
    }
    
    // Phase 1 UI: Normalize indent (0 === undefined)
    if (key === 'indent' && value === 0) {
      continue; // Skip indent: 0 (same as undefined)
    }
    
    // Phase 1 UI: Enforce mutual exclusivity (superscript wins)
    if (key === 'subscript' && hasSuperscript) {
      continue; // Skip subscript if superscript is true
    }
    
    // Border normalization: Remove undefined sides, skip if empty
    if (key === 'border' && typeof value === 'object' && value !== null) {
      const borderObj = value as any;
      const normalizedBorder: Record<string, any> = {};
      
      // Copy only defined border sides
      for (const side of ['top', 'right', 'bottom', 'left', 'diagonalUp', 'diagonalDown']) {
        if (borderObj[side] !== undefined) {
          normalizedBorder[side] = borderObj[side];
        }
      }
      
      // Skip border if empty after removing undefined sides
      if (Object.keys(normalizedBorder).length === 0) {
        continue;
      }
      
      (normalized as any)[key] = normalizedBorder;
      continue;
    }
    
    (normalized as any)[key] = value;
  }
  
  return normalized as CellStyle;
}

/**
 * Deep equality check for CellStyle objects.
 * 
 * Used for collision resolution in StyleCache.
 * Only called when hashes match → performance critical.
 * 
 * Optimization: Assumes normalized styles (stable key order).
 * 
 * @internal Exported for benchmarking only
 */
export function deepEquals(a: CellStyle, b: CellStyle): boolean {
  // Fast path: same reference
  if (a === b) return true;
  
  // Fast path: different key counts
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  // Compare each property
  for (const key of keysA) {
    const valueA = (a as any)[key];
    const valueB = (b as any)[key];
    
    // Phase 1 UI: Normalize indent (0 === undefined)
    if (key === 'indent') {
      const normalizedA = valueA === undefined || valueA === 0 ? 0 : valueA;
      const normalizedB = valueB === undefined || valueB === 0 ? 0 : valueB;
      if (normalizedA !== normalizedB) return false;
      continue;
    }
    
    // Primitive comparison
    if (valueA !== valueB) {
      // Deep comparison for nested objects (e.g., borders, fills)
      if (typeof valueA === 'object' && typeof valueB === 'object') {
        if (!deepEqualsObject(valueA, valueB)) return false;
      } else {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Deep equality for nested objects (borders, fills, etc.)
 * 
 * @internal
 */
function deepEqualsObject(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) {
      if (typeof a[key] === 'object' && typeof b[key] === 'object') {
        if (!deepEqualsObject(a[key], b[key])) return false;
      } else {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * StyleCache Metrics
 * 
 * Tracks performance characteristics for benchmarking.
 */
export interface StyleCacheMetrics {
  hitCount: number;
  missCount: number;
  collisionCount: number;
  totalInternTime: number; // milliseconds
  cacheSize: number; // unique styles
  bucketCount: number;
  maxBucketDepth: number;
}

/**
 * StyleCache: Workbook-level immutable style interning
 * 
 * Implementation Strategy:
 * 1. Hash-based bucketing (Map<hash, CellStyle[]>)
 * 2. Collision resolution via deepEquals()
 * 3. Reference counting for automatic GC
 * 4. Deep Object.freeze() for immutability
 * 
 * Lifecycle:
 * - intern(): Add style to cache, return frozen reference
 * - release(): Decrement ref count, GC if zero
 * - clear(): Remove all styles (workbook close)
 */
export class StyleCache {
  /**
   * Hash buckets: hash → array of styles with that hash
   * 
   * Collision resolution: Linear search within bucket
   * Expected bucket depth: 1-2 styles (<5% collision rate)
   */
  private cache = new Map<number, CellStyle[]>();
  
  /**
   * Reference counting for automatic GC
   * 
   * WeakMap allows styles to be GC'd when no longer referenced.
   * But we still need manual cleanup from buckets.
   */
  private refCount = new WeakMap<CellStyle, number>();
  
  /**
   * Performance metrics (for benchmarking)
   */
  private metrics: StyleCacheMetrics = {
    hitCount: 0,
    missCount: 0,
    collisionCount: 0,
    totalInternTime: 0,
    cacheSize: 0,
    bucketCount: 0,
    maxBucketDepth: 0,
  };
  
  /**
   * Intern a style into the cache.
   * 
   * Returns frozen reference to cached style.
   * If style already exists (structural equality), returns existing reference.
   * 
   * Performance:
   * - Average: O(1) (hash lookup + constant bucket scan)
   * - Worst: O(n) where n = bucket depth (expected <5)
   * 
   * @param style Style to intern (will be normalized)
   * @returns Frozen cached style reference
   */
  intern(style: CellStyle): CellStyle {
    const start = performance.now();
    
    // Normalize for stable hashing
    const normalized = normalizeStyle(style);
    const hash = hashStyle(normalized);
    
    // Get bucket (collision chain)
    let bucket = this.cache.get(hash);
    
    if (bucket) {
      // Search for existing style in bucket
      for (const cached of bucket) {
        if (deepEquals(cached, normalized)) {
          // Cache hit!
          this.metrics.hitCount++;
          this.incrementRef(cached);
          
          const end = performance.now();
          this.metrics.totalInternTime += (end - start);
          
          return cached;
        }
      }
      
      // Collision: hash matches but style differs
      this.metrics.collisionCount++;
    } else {
      // First style with this hash
      bucket = [];
      this.cache.set(hash, bucket);
      this.metrics.bucketCount++;
    }
    
    // Cache miss: freeze and add to bucket
    this.metrics.missCount++;
    
    const frozen = this.freezeStyle(normalized);
    bucket.push(frozen);
    this.refCount.set(frozen, 1);
    this.metrics.cacheSize++;
    
    // Update max bucket depth
    if (bucket.length > this.metrics.maxBucketDepth) {
      this.metrics.maxBucketDepth = bucket.length;
    }
    
    const end = performance.now();
    this.metrics.totalInternTime += (end - start);
    
    return frozen;
  }
  
  /**
   * Clear all cached styles.
   * 
   * Used when workbook is closed.
   */
  clear(): void {
    this.cache.clear();
    // refCount is WeakMap, will GC automatically
    this.metrics = {
      hitCount: 0,
      missCount: 0,
      collisionCount: 0,
      totalInternTime: 0,
      cacheSize: 0,
      bucketCount: 0,
      maxBucketDepth: 0,
    };
  }
  
  /**
   * Get cache metrics (for benchmarking).
   */
  getMetrics(): Readonly<StyleCacheMetrics> {
    return { ...this.metrics };
  }
  
  /**
   * Get cache hit rate.
   * 
   * Target: ≥90% for typical workbooks, ≥80% for designer workbooks.
   */
  getHitRate(): number {
    const total = this.metrics.hitCount + this.metrics.missCount;
    return total > 0 ? this.metrics.hitCount / total : 0;
  }
  
  /**
   * Get collision rate.
   * 
   * Target: <5% (indicates hash quality).
   */
  getCollisionRate(): number {
    return this.metrics.missCount > 0
      ? this.metrics.collisionCount / this.metrics.missCount
      : 0;
  }
  
  /**
   * Get average intern time.
   * 
   * Target: <0.1ms.
   */
  getAvgInternTime(): number {
    const total = this.metrics.hitCount + this.metrics.missCount;
    return total > 0 ? this.metrics.totalInternTime / total : 0;
  }
  
  /**
   * Get cache size (unique styles).
   */
  size(): number {
    return this.metrics.cacheSize;
  }
  
  /**
   * Freeze style deeply (immutability enforcement).
   * 
   * In production: Deep Object.freeze()
   * In development: Add interning marker + mutation proxy
   * 
   * Cost: O(properties) but amortized across all references.
   */
  private freezeStyle(style: CellStyle): CellStyle {
    // Mark as interned (dev mode safeguard)
    // Non-enumerable property prevents it from affecting hashing/equality
    Object.defineProperty(style, INTERNED_SYMBOL, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    
    // Deep freeze
    Object.freeze(style);
    
    // Freeze nested objects (borders, fills, etc.)
    for (const key in style) {
      const value = (style as any)[key];
      if (typeof value === 'object' && value !== null) {
        Object.freeze(value);
        
        // Recursively freeze nested properties
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'object' && item !== null) {
              Object.freeze(item);
            }
          });
        }
      }
    }
    
    return style;
  }
  
  /**
   * Increment reference count.
   */
  private incrementRef(style: CellStyle): void {
    const count = this.refCount.get(style) || 0;
    this.refCount.set(style, count + 1);
  }

  /**
   * Release a style reference. Decrements refCount and removes the style
   * from its bucket when the count reaches zero.
   *
   * This method is correctness-critical: it must not leak strong references
   * inside buckets (which would prevent GC) and must tolerate double-release
   * or releasing styles not present in the cache.
   */
  release(style: CellStyle): void {
    const count = this.refCount.get(style);

    if (count === undefined) {
      // Style not tracked (already removed or never interned). Warn and return.
      // Do not throw — callers may call release defensively.
      // eslint-disable-next-line no-console
      console.warn('StyleCache.release: style not found in refCount');
      return;
    }

    if (count <= 1) {
      // Remove from refCount map and bucket (allow GC)
      this.refCount.delete(style);
      this.removeFromBucket(style);
      if (this.metrics.cacheSize > 0) this.metrics.cacheSize--;
    } else {
      this.refCount.set(style, count - 1);
    }
  }
  
  /**
   * Remove style from bucket (GC cleanup).
   * 
   * CRITICAL: Must remove from bucket array, not just WeakMap.
   * Otherwise memory leak (bucket holds strong reference).
   */
  private removeFromBucket(style: CellStyle): void {
    const hash = hashStyle(style);
    const bucket = this.cache.get(hash);
    
    if (bucket) {
      const index = bucket.indexOf(style);
      if (index >= 0) {
        bucket.splice(index, 1);
        
        // If bucket empty, remove hash key
        if (bucket.length === 0) {
          this.cache.delete(hash);
          this.metrics.bucketCount--;
        }
      }
    }
  }
}
