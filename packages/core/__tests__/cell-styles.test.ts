/**
 * cell-styles.test.ts
 * 
 * Comprehensive test suite for Cell Styles Gallery system.
 * Tests presets, utilities, and component behavior.
 */

import { describe, it, expect } from '@jest/globals';
import {
  CELL_STYLE_PRESETS,
  getCellStyle,
  getCellStylesByCategory,
  getCellStyleCategories,
  type CellStylePreset,
  type CellStyleCategory,
} from '../src/cell-styles-presets';

describe('CellStylesPresets', () => {
  describe('CELL_STYLE_PRESETS structure', () => {
    it('should have at least 37 style presets', () => {
      expect(CELL_STYLE_PRESETS.length).toBeGreaterThanOrEqual(37);
    });

    it('should have all required properties for each preset', () => {
      CELL_STYLE_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('category');
        expect(preset).toHaveProperty('style');
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.category).toBe('string');
        expect(typeof preset.style).toBe('object');
      });
    });

    it('should have unique preset IDs', () => {
      const ids = CELL_STYLE_PRESETS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid order property when specified', () => {
      CELL_STYLE_PRESETS.forEach((preset) => {
        if (preset.order !== undefined) {
          expect(typeof preset.order).toBe('number');
          expect(preset.order).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Good/Bad/Neutral category', () => {
    it('should have exactly 3 styles', () => {
      const styles = getCellStylesByCategory('Good/Bad/Neutral');
      expect(styles.length).toBe(3);
    });

    it('should have good, bad, neutral styles', () => {
      const styles = getCellStylesByCategory('Good/Bad/Neutral');
      const ids = styles.map((s) => s.id);
      expect(ids).toContain('good');
      expect(ids).toContain('bad');
      expect(ids).toContain('neutral');
    });

    it('good style should have green background', () => {
      const goodStyle = getCellStyle('good');
      expect(goodStyle).toBeDefined();
      expect(goodStyle?.fill).toBe('#C6EFCE');
      expect(goodStyle?.color).toBe('#006100');
    });

    it('bad style should have red background', () => {
      const badStyle = getCellStyle('bad');
      expect(badStyle).toBeDefined();
      expect(badStyle?.fill).toBe('#FFC7CE');
      expect(badStyle?.color).toBe('#9C0006');
    });

    it('neutral style should have yellow background', () => {
      const neutralStyle = getCellStyle('neutral');
      expect(neutralStyle).toBeDefined();
      expect(neutralStyle?.fill).toBe('#FFEB9C');
      expect(neutralStyle?.color).toBe('#9C6500');
    });
  });

  describe('Data & Model category', () => {
    it('should have at least 7 styles', () => {
      const styles = getCellStylesByCategory('Data & Model');
      expect(styles.length).toBeGreaterThanOrEqual(7);
    });

    it('should have calculation style with orange text', () => {
      const calcStyle = getCellStyle('calculation');
      expect(calcStyle).toBeDefined();
      expect(calcStyle?.color).toBe('#FA7D00');
      expect(calcStyle?.bold).toBe(true);
    });

    it('should have check-cell style with gray background', () => {
      const checkStyle = getCellStyle('check-cell');
      expect(checkStyle).toBeDefined();
      expect(checkStyle?.fill).toBe('#A5A5A5');
      expect(checkStyle?.color).toBe('#FFFFFF');
    });

    it('should have input style', () => {
      const inputStyle = getCellStyle('input');
      expect(inputStyle).toBeDefined();
      expect(inputStyle?.fill).toBeDefined();
    });

    it('should have warning-text style with red color', () => {
      const warningStyle = getCellStyle('warning-text');
      expect(warningStyle).toBeDefined();
      expect(warningStyle?.color).toBe('#FF0000');
    });
  });

  describe('Titles & Headings category', () => {
    it('should have exactly 6 styles', () => {
      const styles = getCellStylesByCategory('Titles & Headings');
      expect(styles.length).toBe(6);
    });

    it('should have heading-1 through heading-4', () => {
      const h1 = getCellStyle('heading-1');
      const h2 = getCellStyle('heading-2');
      const h3 = getCellStyle('heading-3');
      const h4 = getCellStyle('heading-4');
      
      expect(h1).toBeDefined();
      expect(h2).toBeDefined();
      expect(h3).toBeDefined();
      expect(h4).toBeDefined();
    });

    it('headings should have decreasing font sizes', () => {
      const h1 = getCellStyle('heading-1');
      const h2 = getCellStyle('heading-2');
      const h3 = getCellStyle('heading-3');
      
      expect(h1?.fontSize).toBeGreaterThan(h2?.fontSize!);
      expect(h2?.fontSize).toBeGreaterThan(h3?.fontSize!);
    });

    it('title style should be largest', () => {
      const title = getCellStyle('title');
      expect(title?.fontSize).toBe(18);
      expect(title?.bold).toBe(true);
    });

    it('total style should have borders', () => {
      const total = getCellStyle('total');
      expect(total).toBeDefined();
      expect(total?.border).toBeDefined();
      expect(total?.border?.top).toBeDefined();
      expect(total?.border?.bottom).toBeDefined();
    });
  });

  describe('Themed Cell Styles category', () => {
    it('should have at least 15 styles', () => {
      const styles = getCellStylesByCategory('Themed Cell Styles');
      expect(styles.length).toBeGreaterThanOrEqual(15);
    });

    it('should have accent1 through accent6', () => {
      const accent1 = getCellStyle('accent1');
      const accent2 = getCellStyle('accent2');
      const accent3 = getCellStyle('accent3');
      const accent4 = getCellStyle('accent4');
      const accent5 = getCellStyle('accent5');
      const accent6 = getCellStyle('accent6');
      
      expect(accent1).toBeDefined();
      expect(accent2).toBeDefined();
      expect(accent3).toBeDefined();
      expect(accent4).toBeDefined();
      expect(accent5).toBeDefined();
      expect(accent6).toBeDefined();
    });

    it('should have 20% variants for accents', () => {
      const accent1_20 = getCellStyle('accent1-20');
      const accent2_20 = getCellStyle('accent2-20');
      
      expect(accent1_20).toBeDefined();
      expect(accent2_20).toBeDefined();
    });

    it('accent1 should be blue theme', () => {
      const accent1 = getCellStyle('accent1');
      expect(accent1?.fill).toBe('#4472C4');
      expect(accent1?.color).toBe('#FFFFFF');
    });

    it('accent2 should be orange theme', () => {
      const accent2 = getCellStyle('accent2');
      expect(accent2?.fill).toBe('#ED7D31');
      expect(accent2?.color).toBe('#FFFFFF');
    });
  });

  describe('Number Format category', () => {
    it('should have at least 5 styles', () => {
      const styles = getCellStylesByCategory('Number Format');
      expect(styles.length).toBeGreaterThanOrEqual(5);
    });

    it('should have comma style', () => {
      const comma = getCellStyle('comma');
      expect(comma).toBeDefined();
      expect(comma?.numberFormat).toContain('#,##0');
    });

    it('should have currency style', () => {
      const currency = getCellStyle('currency');
      expect(currency).toBeDefined();
      expect(currency?.numberFormat).toContain('$');
      expect(currency?.numberFormat).toContain('.00');
    });

    it('should have currency-0 style without decimals', () => {
      const currency0 = getCellStyle('currency-0');
      expect(currency0).toBeDefined();
      expect(currency0?.numberFormat).toBe('$#,##0');
    });

    it('should have percent style', () => {
      const percent = getCellStyle('percent');
      expect(percent).toBeDefined();
      expect(percent?.numberFormat).toContain('%');
    });
  });

  describe('getCellStyle()', () => {
    it('should return style for valid ID', () => {
      const style = getCellStyle('good');
      expect(style).toBeDefined();
      expect(style?.fill).toBe('#C6EFCE');
    });

    it('should return null for invalid ID', () => {
      const style = getCellStyle('invalid-style-id');
      expect(style).toBeNull();
    });

    it('should return complete style object', () => {
      const style = getCellStyle('heading-1');
      expect(style).toHaveProperty('fontSize');
      expect(style).toHaveProperty('bold');
      expect(style).toHaveProperty('color');
    });
  });

  describe('getCellStylesByCategory()', () => {
    it('should return all styles for valid category', () => {
      const styles = getCellStylesByCategory('Good/Bad/Neutral');
      expect(styles.length).toBeGreaterThan(0);
      expect(styles[0]).toHaveProperty('id');
      expect(styles[0]).toHaveProperty('style');
    });

    it('should return empty array for invalid category', () => {
      const styles = getCellStylesByCategory('Invalid Category' as CellStyleCategory);
      expect(styles).toEqual([]);
    });

    it('should return styles sorted by order property', () => {
      const styles = getCellStylesByCategory('Good/Bad/Neutral');
      
      // Check that order is ascending (if defined)
      for (let i = 0; i < styles.length - 1; i++) {
        if (styles[i].order !== undefined && styles[i + 1].order !== undefined) {
          expect(styles[i].order!).toBeLessThanOrEqual(styles[i + 1].order!);
        }
      }
    });

    it('should only return styles from requested category', () => {
      const dataModelStyles = getCellStylesByCategory('Data & Model');
      
      dataModelStyles.forEach((style) => {
        expect(style.category).toBe('Data & Model');
      });
    });
  });

  describe('getCellStyleCategories()', () => {
    it('should return exactly 5 categories', () => {
      const categories = getCellStyleCategories();
      expect(categories.length).toBe(5);
    });

    it('should return categories in correct order', () => {
      const categories = getCellStyleCategories();
      expect(categories[0]).toBe('Good/Bad/Neutral');
      expect(categories[1]).toBe('Data & Model');
      expect(categories[2]).toBe('Titles & Headings');
      expect(categories[3]).toBe('Themed Cell Styles');
      expect(categories[4]).toBe('Number Format');
    });

    it('all categories should have at least one style', () => {
      const categories = getCellStyleCategories();
      
      categories.forEach((category) => {
        const styles = getCellStylesByCategory(category);
        expect(styles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Excel 365 compatibility', () => {
    it('should use exact Excel color codes for Good/Bad/Neutral', () => {
      // These are the exact hex codes used in Excel 365
      const good = getCellStyle('good');
      const bad = getCellStyle('bad');
      const neutral = getCellStyle('neutral');
      
      expect(good?.fill).toBe('#C6EFCE');
      expect(good?.color).toBe('#006100');
      expect(bad?.fill).toBe('#FFC7CE');
      expect(bad?.color).toBe('#9C0006');
      expect(neutral?.fill).toBe('#FFEB9C');
      expect(neutral?.color).toBe('#9C6500');
    });

    it('should use Excel Office theme colors for accents', () => {
      const accent1 = getCellStyle('accent1');
      const accent2 = getCellStyle('accent2');
      
      // Excel Office theme blue and orange
      expect(accent1?.fill).toBe('#4472C4');
      expect(accent2?.fill).toBe('#ED7D31');
    });

    it('should have Excel-compatible font sizes', () => {
      const title = getCellStyle('title');
      const h1 = getCellStyle('heading-1');
      const h2 = getCellStyle('heading-2');
      
      // Excel default font sizes
      expect(title?.fontSize).toBe(18);
      expect(h1?.fontSize).toBe(15);
      expect(h2?.fontSize).toBe(13);
    });
  });

  describe('Style completeness', () => {
    it('all color properties should be valid hex codes', () => {
      CELL_STYLE_PRESETS.forEach((preset) => {
        // Color can be string or ExcelColorSpec
        if (typeof preset.style.color === 'string') {
          expect(preset.style.color).toMatch(/^#[0-9A-F]{6}$/i);
        }
        // Fill can be string or complex FillSpec
        if (typeof preset.style.fill === 'string') {
          expect(preset.style.fill).toMatch(/^#[0-9A-F]{6}$/i);
        }
      });
    });

    it('all font sizes should be reasonable values', () => {
      CELL_STYLE_PRESETS.forEach((preset) => {
        if (preset.style.fontSize) {
          expect(preset.style.fontSize).toBeGreaterThanOrEqual(8);
          expect(preset.style.fontSize).toBeLessThanOrEqual(72);
        }
      });
    });

    it('all presets should have at least one visual property', () => {
      CELL_STYLE_PRESETS.forEach((preset) => {
        const hasVisual = !!(
          preset.style.fill ||
          preset.style.color ||
          preset.style.bold ||
          preset.style.italic ||
          preset.style.fontSize ||
          preset.style.border ||
          preset.style.numberFormat
        );
        
        expect(hasVisual).toBe(true);
      });
    });
  });
});
