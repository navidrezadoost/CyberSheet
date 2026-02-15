/**
 * Border Normalization Audit (Feb 15, 2026)
 * 
 * Critical Test: Verify diagonal borders follow exact same normalization
 * contract as regular borders. No semantic asymmetry.
 * 
 * Equivalence classes that MUST produce same canonical pointer:
 * 1. No border property at all
 * 2. Empty border object: { border: {} }
 * 3. Border with undefined sides: { border: { top: undefined } }
 * 4. Border with diagonal undefined: { border: { diagonalUp: undefined } }
 * 
 * If these produce different canonical pointers, we have fragmentation.
 */

import { describe, it, expect } from '@jest/globals';
import { StyleCache } from '../src/StyleCache';

describe('Border Normalization - Semantic Equivalence', () => {
  let cache: StyleCache;

  beforeEach(() => {
    cache = new StyleCache();
  });

  describe('Empty Border Equivalence', () => {
    it('should treat absent border and empty border object as equivalent', () => {
      const styleA = cache.intern({});
      const styleB = cache.intern({ border: {} });

      // CRITICAL: These must be same pointer
      expect(styleA).toBe(styleB);
    });

    it('should treat empty border and border with undefined sides as equivalent', () => {
      const styleA = cache.intern({ border: {} });
      const styleB = cache.intern({ border: { top: undefined, right: undefined } });

      expect(styleA).toBe(styleB);
    });

    it('should treat absent diagonal and undefined diagonal as equivalent', () => {
      const styleA = cache.intern({ border: { top: '#000000' } });
      const styleB = cache.intern({ border: { top: '#000000', diagonalUp: undefined } });

      expect(styleA).toBe(styleB);
    });
  });

  describe('Diagonal vs Regular Border Normalization Parity', () => {
    it('should normalize diagonal borders same as regular borders', () => {
      // All undefined regular borders
      const regular = cache.intern({
        border: {
          top: undefined,
          right: undefined,
          bottom: undefined,
          left: undefined
        }
      });

      // All undefined diagonal borders
      const diagonal = cache.intern({
        border: {
          diagonalUp: undefined,
          diagonalDown: undefined
        }
      });

      // Both should normalize to same empty state
      expect(regular).toBe(diagonal);
    });

    it('should handle mixed undefined regular and diagonal borders', () => {
      const styleA = cache.intern({
        border: {
          top: undefined,
          diagonalUp: undefined
        }
      });

      const styleB = cache.intern({
        border: {}
      });

      expect(styleA).toBe(styleB);
    });
  });

  describe('Diagonal Border with Regular Borders', () => {
    it('should not conflate defined regular with undefined diagonal', () => {
      const styleA = cache.intern({
        border: {
          top: '#000000'
        }
      });

      const styleB = cache.intern({
        border: {
          top: '#000000',
          diagonalUp: undefined
        }
      });

      // Same style (undefined diagonal is omitted)
      expect(styleA).toBe(styleB);
    });

    it('should differentiate when diagonal is defined', () => {
      const styleA = cache.intern({
        border: {
          top: '#000000'
        }
      });

      const styleB = cache.intern({
        border: {
          top: '#000000',
          diagonalUp: '#FF0000'
        }
      });

      // Different styles (diagonal is now present)
      expect(styleA).not.toBe(styleB);
    });
  });

  describe('None vs Undefined Handling', () => {
    it('should handle explicit "none" value if supported', () => {
      // If border sides support 'none' as a value, it should be distinct from undefined
      const styleA = cache.intern({
        border: {
          top: undefined
        }
      });

      // Current implementation: borders are color strings, not style enums
      // So 'none' would be treated as a color string if provided
      // This test documents current behavior
      expect(styleA.border).toBeUndefined();
    });
  });

  describe('Complex Mixed Border Scenarios', () => {
    it('should normalize complex border with all undefined diagonals', () => {
      const styleA = cache.intern({
        bold: true,
        border: {
          top: '#CCCCCC',
          right: '#CCCCCC',
          bottom: '#CCCCCC',
          left: '#CCCCCC',
          diagonalUp: undefined,
          diagonalDown: undefined
        }
      });

      const styleB = cache.intern({
        bold: true,
        border: {
          top: '#CCCCCC',
          right: '#CCCCCC',
          bottom: '#CCCCCC',
          left: '#CCCCCC'
        }
      });

      expect(styleA).toBe(styleB);
    });

    it('should keep only defined border sides', () => {
      const style = cache.intern({
        border: {
          top: undefined,
          right: '#FF0000',
          bottom: undefined,
          left: undefined,
          diagonalUp: '#0000FF',
          diagonalDown: undefined
        }
      });

      // After normalization, only right and diagonalUp should exist
      expect(style.border?.top).toBeUndefined();
      expect(style.border?.right).toBe('#FF0000');
      expect(style.border?.bottom).toBeUndefined();
      expect(style.border?.left).toBeUndefined();
      expect(style.border?.diagonalUp).toBe('#0000FF');
      expect(style.border?.diagonalDown).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle style with only undefined diagonal borders', () => {
      const styleA = cache.intern({
        border: {
          diagonalUp: undefined,
          diagonalDown: undefined
        }
      });

      const styleB = cache.intern({});

      expect(styleA).toBe(styleB);
    });

    it('should handle empty object with nested empty border', () => {
      const styleA = cache.intern({
        border: {},
        fontSize: undefined,
        bold: false
      });

      const styleB = cache.intern({});

      expect(styleA).toBe(styleB);
    });
  });
});
