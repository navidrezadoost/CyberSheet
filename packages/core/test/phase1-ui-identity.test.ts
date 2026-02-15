/**
 * Phase 1 UI: Identity Guard Tests
 * 
 * CRITICAL: These tests protect identity at the UI boundary.
 * If any test fails, identity is broken and UI cannot ship.
 * 
 * Test Coverage:
 * 1. Basic identity preservation for new properties
 * 2. False vs undefined collapse (strikethrough)
 * 3. Indent normalization (0 vs undefined)
 * 4. Mutual exclusivity (superscript/subscript)
 */

import { StyleCache } from '../src/StyleCache';
import type { CellStyle } from '../src/types';

describe('Phase 1 UI: Identity Guard Tests', () => {
  let cache: StyleCache;

  beforeEach(() => {
    cache = new StyleCache();
  });

  describe('Basic Identity Preservation', () => {
    it('should preserve identity for strikethrough styles', () => {
      const style1 = cache.intern({ bold: true, strikethrough: true });
      const style2 = cache.intern({ bold: true, strikethrough: true });
      
      // CRITICAL: Must be strict reference equality
      expect(style1 === style2).toBe(true);
      expect(Object.is(style1, style2)).toBe(true);
    });

    it('should preserve identity for superscript styles', () => {
      const style1 = cache.intern({ fontSize: 12, superscript: true });
      const style2 = cache.intern({ fontSize: 12, superscript: true });
      
      expect(style1 === style2).toBe(true);
    });

    it('should preserve identity for subscript styles', () => {
      const style1 = cache.intern({ fontSize: 12, subscript: true });
      const style2 = cache.intern({ fontSize: 12, subscript: true });
      
      expect(style1 === style2).toBe(true);
    });

    it('should preserve identity for indent styles', () => {
      const style1 = cache.intern({ align: 'left', indent: 10 });
      const style2 = cache.intern({ align: 'left', indent: 10 });
      
      expect(style1 === style2).toBe(true);
    });

    it('should preserve identity for mixed new properties', () => {
      const style1 = cache.intern({
        bold: true,
        strikethrough: true,
        superscript: true,
        indent: 5,
      });
      const style2 = cache.intern({
        bold: true,
        strikethrough: true,
        superscript: true,
        indent: 5,
      });
      
      expect(style1 === style2).toBe(true);
    });
  });

  describe('False vs Undefined Collapse', () => {
    it('should treat strikethrough: false as equivalent to undefined', () => {
      const style1 = cache.intern({ strikethrough: false });
      const style2 = cache.intern({});
      
      // CRITICAL: false === undefined for boolean flags
      expect(style1 === style2).toBe(true);
    });

    it('should treat superscript: false as equivalent to undefined', () => {
      const style1 = cache.intern({ superscript: false });
      const style2 = cache.intern({});
      
      expect(style1 === style2).toBe(true);
    });

    it('should treat subscript: false as equivalent to undefined', () => {
      const style1 = cache.intern({ subscript: false });
      const style2 = cache.intern({});
      
      expect(style1 === style2).toBe(true);
    });

    it('should collapse false for all new boolean properties', () => {
      const style1 = cache.intern({
        strikethrough: false,
        superscript: false,
        subscript: false,
      });
      const style2 = cache.intern({});
      
      expect(style1 === style2).toBe(true);
    });

    it('should distinguish true from false/undefined', () => {
      const styleTrue = cache.intern({ strikethrough: true });
      const styleFalse = cache.intern({ strikethrough: false });
      const styleUndefined = cache.intern({});
      
      // true must be different
      expect(styleTrue === styleFalse).toBe(false);
      expect(styleTrue === styleUndefined).toBe(false);
      
      // false and undefined must be same
      expect(styleFalse === styleUndefined).toBe(true);
    });
  });

  describe('Indent Normalization', () => {
    it('should treat indent: 0 as equivalent to undefined', () => {
      const style1 = cache.intern({ indent: 0 });
      const style2 = cache.intern({});
      
      // CRITICAL: 0 === undefined for indent
      expect(style1 === style2).toBe(true);
    });

    it('should distinguish non-zero indent from 0/undefined', () => {
      const style0 = cache.intern({ indent: 0 });
      const styleUndefined = cache.intern({});
      const style1 = cache.intern({ indent: 1 });
      
      // 0 and undefined are same
      expect(style0 === styleUndefined).toBe(true);
      
      // 1 is different
      expect(style1 === style0).toBe(false);
      expect(style1 === styleUndefined).toBe(false);
    });

    it('should normalize indent in complex styles', () => {
      const style1 = cache.intern({ bold: true, indent: 0, align: 'left' });
      const style2 = cache.intern({ bold: true, align: 'left' });
      
      expect(style1 === style2).toBe(true);
    });

    it('should preserve identity for various indent values', () => {
      for (let i = 1; i <= 250; i += 50) {
        const styleA = cache.intern({ indent: i });
        const styleB = cache.intern({ indent: i });
        expect(styleA === styleB).toBe(true);
      }
    });
  });

  describe('Mutual Exclusivity: Superscript/Subscript', () => {
    it('should enforce mutual exclusivity (superscript wins)', () => {
      const style1 = cache.intern({
        superscript: true,
        subscript: true, // Should be ignored
      });
      const style2 = cache.intern({ superscript: true });
      
      // Normalization should make these equivalent
      expect(style1 === style2).toBe(true);
    });

    it('should not confuse superscript and subscript', () => {
      const styleSup = cache.intern({ superscript: true });
      const styleSub = cache.intern({ subscript: true });
      
      // Must be different styles
      expect(styleSup === styleSub).toBe(false);
    });

    it('should handle false values with mutual exclusivity', () => {
      const style1 = cache.intern({
        superscript: true,
        subscript: false, // Redundant, should normalize away
      });
      const style2 = cache.intern({ superscript: true });
      
      expect(style1 === style2).toBe(true);
    });
  });

  describe('Hash Consistency', () => {
    it('should produce consistent hashes for equivalent styles', () => {
      const styles = [
        { strikethrough: true },
        { superscript: true },
        { subscript: true },
        { indent: 10 },
        { strikethrough: true, superscript: true, indent: 5 },
      ];

      for (const styleInput of styles) {
        const style1 = cache.intern(styleInput);
        const style2 = cache.intern(styleInput);
        
        expect(style1 === style2).toBe(true);
      }
    });

    it('should not collide different new property combinations', () => {
      const styles = new Set();
      
      // Create various combinations
      const combinations = [
        { strikethrough: true },
        { superscript: true },
        { subscript: true },
        { indent: 1 },
        { indent: 10 },
        { indent: 100 },
        { strikethrough: true, indent: 5 },
        { superscript: true, indent: 5 },
        { subscript: true, indent: 5 },
      ];

      for (const combo of combinations) {
        const style = cache.intern(combo);
        expect(styles.has(style)).toBe(false);
        styles.add(style);
      }

      // All should be unique
      expect(styles.size).toBe(combinations.length);
    });
  });

  describe('Integration with Existing Properties', () => {
    it('should preserve identity when mixing old and new properties', () => {
      const style1 = cache.intern({
        bold: true,
        fontSize: 12,
        color: '#FF0000',
        strikethrough: true,
        indent: 5,
      });
      const style2 = cache.intern({
        bold: true,
        fontSize: 12,
        color: '#FF0000',
        strikethrough: true,
        indent: 5,
      });
      
      expect(style1 === style2).toBe(true);
    });

    it('should not break existing property identity', () => {
      // Ensure new properties don't fragment existing styles
      const oldStyle1 = cache.intern({ bold: true, fontSize: 12 });
      const oldStyle2 = cache.intern({ bold: true, fontSize: 12 });
      
      expect(oldStyle1 === oldStyle2).toBe(true);
    });

    it('should handle rotation + strikethrough', () => {
      const style1 = cache.intern({ rotation: 45, strikethrough: true });
      const style2 = cache.intern({ rotation: 45, strikethrough: true });
      
      expect(style1 === style2).toBe(true);
    });

    it('should handle wrap + superscript', () => {
      const style1 = cache.intern({ wrap: true, superscript: true });
      const style2 = cache.intern({ wrap: true, superscript: true });
      
      expect(style1 === style2).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative indent (invalid, but should not crash)', () => {
      const style = cache.intern({ indent: -5 });
      expect(style).toBeDefined();
      expect(typeof style).toBe('object');
    });

    it('should handle indent > 250 (Excel limit, but allow)', () => {
      const style = cache.intern({ indent: 300 });
      expect(style).toBeDefined();
    });

    it('should handle all new properties undefined', () => {
      const style1 = cache.intern({
        strikethrough: undefined,
        superscript: undefined,
        subscript: undefined,
        indent: undefined,
      });
      const style2 = cache.intern({});
      
      expect(style1 === style2).toBe(true);
    });

    it('should handle property order independence', () => {
      const style1 = cache.intern({
        strikethrough: true,
        indent: 5,
        superscript: true,
      });
      const style2 = cache.intern({
        indent: 5,
        superscript: true,
        strikethrough: true,
      });
      
      expect(style1 === style2).toBe(true);
    });
  });

  describe('Metrics: Collision Rate', () => {
    it('should maintain low collision rate with new properties', () => {
      const iterations = 1000;
      const styles = new Set<CellStyle>();

      // Generate diverse styles with new properties
      // Avoid generating normalized duplicates
      for (let i = 0; i < iterations; i++) {
        const style = cache.intern({
          fontSize: 10 + (i % 10),
          bold: i % 2 === 0,
          // Only include true values (false normalizes away)
          ...(i % 3 === 0 ? { strikethrough: true } : {}),
          ...(i % 5 === 0 ? { superscript: true } : {}),
          // Skip subscript when superscript is true (mutual exclusivity)
          ...(i % 7 === 0 && i % 5 !== 0 ? { subscript: true } : {}),
          // Only non-zero indent (0 normalizes away)
          ...(i % 20 > 0 ? { indent: i % 20 } : {}),
        });
        styles.add(style);
      }

      // Calculate expected unique count (accounting for normalization)
      const uniqueCount = styles.size;
      
      // We expect many duplicates due to modulo cycling
      // With 10 font sizes × 2 bold states × 3-5 new property combos ≈ 60-100 unique
      // This validates StyleCache isn't fragmenting identity
      expect(uniqueCount).toBeGreaterThan(50);
      expect(uniqueCount).toBeLessThan(200);
      
      // Collision rate calculation for diagnostic purposes
      const collisionRate = 1 - (uniqueCount / iterations);
      console.log(`Generated ${uniqueCount} unique styles from ${iterations} iterations (${(collisionRate * 100).toFixed(1)}% collision rate)`);
    });
  });

  describe('Diagonal Borders Identity', () => {
    it('should intern diagonal borders independently', () => {
      const styleA = cache.intern({ border: { diagonalUp: '#FF0000' } });
      const styleB = cache.intern({ border: { diagonalDown: '#00FF00' } });
      const styleC = cache.intern({ border: { diagonalUp: '#FF0000', diagonalDown: '#00FF00' } });

      expect(Object.isFrozen(styleA)).toBe(true);
      expect(Object.isFrozen(styleB)).toBe(true);
      expect(Object.isFrozen(styleC)).toBe(true);

      // Different diagonal borders = different identity
      expect(styleA).not.toBe(styleB);
      expect(styleA).not.toBe(styleC);
      expect(styleB).not.toBe(styleC);
    });

    it('should deduplicate identical diagonal borders', () => {
      const styleA = cache.intern({ border: { diagonalUp: '#FF0000' } });
      const styleB = cache.intern({ border: { diagonalUp: '#FF0000' } });

      expect(styleA).toBe(styleB);
    });

    it('should handle diagonal borders with regular borders', () => {
      const style1 = cache.intern({
        border: {
          top: '#000000',
          diagonalUp: '#FF0000'
        }
      });

      const style2 = cache.intern({
        border: {
          top: '#000000',
          diagonalDown: '#FF0000'
        }
      });

      const style3 = cache.intern({
        border: {
          top: '#000000'
        }
      });

      // Different diagonal borders = different identity
      expect(style1).not.toBe(style2);
      expect(style1).not.toBe(style3);
      expect(style2).not.toBe(style3);
    });

    it('should handle both diagonal borders simultaneously', () => {
      const style = cache.intern({
        border: {
          diagonalUp: '#FF0000',
          diagonalDown: '#0000FF'
        }
      });

      expect(Object.isFrozen(style)).toBe(true);
      expect(style.border?.diagonalUp).toBe('#FF0000');
      expect(style.border?.diagonalDown).toBe('#0000FF');

      // Re-intern should return same pointer
      const style2 = cache.intern({
        border: {
          diagonalUp: '#FF0000',
          diagonalDown: '#0000FF'
        }
      });

      expect(style2).toBe(style);
    });

    it('should distinguish diagonal borders by color', () => {
      const red = cache.intern({ border: { diagonalUp: '#FF0000' } });
      const blue = cache.intern({ border: { diagonalUp: '#0000FF' } });
      const green = cache.intern({ border: { diagonalUp: '#00FF00' } });

      expect(red).not.toBe(blue);
      expect(red).not.toBe(green);
      expect(blue).not.toBe(green);
    });

    it('should handle diagonal borders with complex styles', () => {
      const style = cache.intern({
        bold: true,
        fontSize: 14,
        color: '#000000',
        border: {
          top: '#CCCCCC',
          right: '#CCCCCC',
          bottom: '#CCCCCC',
          left: '#CCCCCC',
          diagonalUp: '#FF0000',
          diagonalDown: '#FF0000'
        }
      });

      expect(Object.isFrozen(style)).toBe(true);
      expect(Object.isFrozen(style.border)).toBe(true);

      // Same style should return same pointer
      const style2 = cache.intern({
        bold: true,
        fontSize: 14,
        color: '#000000',
        border: {
          top: '#CCCCCC',
          right: '#CCCCCC',
          bottom: '#CCCCCC',
          left: '#CCCCCC',
          diagonalUp: '#FF0000',
          diagonalDown: '#FF0000'
        }
      });

      expect(style2).toBe(style);
    });

    it('should normalize absent diagonal borders', () => {
      const style1 = cache.intern({
        border: {
          top: '#000000'
        }
      });

      const style2 = cache.intern({
        border: {
          top: '#000000'
        }
      });

      // Same style (no diagonals) = same pointer
      expect(style1).toBe(style2);
      expect(style1.border?.diagonalUp).toBeUndefined();
      expect(style1.border?.diagonalDown).toBeUndefined();
    });
  });
});
