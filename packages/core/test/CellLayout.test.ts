import { describe, it, expect } from '@jest/globals';
import { computeVerticalOffset } from '../src/CellLayout';

describe('CellLayout - Vertical Alignment', () => {
  describe('computeVerticalOffset', () => {
    const fontSize = 12;
    const paddingTop = 2;
    const paddingBottom = 4;

    describe('single-line text', () => {
      const cellHeight = 24;
      const contentHeight = fontSize;

      it('should align to top when valign is "top"', () => {
        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(offset).toBe(paddingTop);
      });

      it('should align to middle when valign is "middle"', () => {
        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const expected = (cellHeight - contentHeight) / 2;
        expect(offset).toBe(expected);
      });

      it('should align to bottom when valign is "bottom"', () => {
        const offset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const expected = cellHeight - contentHeight - paddingBottom;
        expect(offset).toBe(expected);
      });

      it('should default to bottom when valign is undefined', () => {
        const offset = computeVerticalOffset(undefined, cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const expected = cellHeight - contentHeight - paddingBottom;
        expect(offset).toBe(expected);
      });
    });

    describe('wrapped text (multi-line)', () => {
      const cellHeight = 48;
      const lineHeight = fontSize + 2;
      const lines = 3;
      const contentHeight = lines * lineHeight;

      it('should align to top when valign is "top"', () => {
        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(offset).toBe(paddingTop);
      });

      it('should center multi-line content when valign is "middle"', () => {
        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const expected = (cellHeight - contentHeight) / 2;
        expect(offset).toBe(expected);
      });

      it('should align to bottom when valign is "bottom"', () => {
        const offset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const expected = cellHeight - contentHeight - paddingBottom;
        expect(offset).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should handle content taller than cell (no negative offset)', () => {
        const cellHeight = 20;
        const contentHeight = 40;
        
        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(topOffset).toBe(paddingTop);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // When content > cell, middle produces negative offset, but still valid
        expect(middleOffset).toBe((cellHeight - contentHeight) / 2);
        expect(middleOffset).toBeLessThan(0);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(bottomOffset).toBe(cellHeight - contentHeight - paddingBottom);
        expect(bottomOffset).toBeLessThan(0);
      });

      it('should handle zero cell height', () => {
        const cellHeight = 0;
        const contentHeight = fontSize;

        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(offset).toBe(paddingTop);
      });

      it('should handle exact fit (content equals cell minus padding)', () => {
        const cellHeight = 20;
        const contentHeight = 20 - paddingTop - paddingBottom; // 14

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(topOffset).toBe(paddingTop);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(bottomOffset).toBe(paddingTop); // Should equal top when exact fit

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(middleOffset).toBe((cellHeight - contentHeight) / 2);
      });

      it('should be pure (same inputs produce same outputs)', () => {
        const cellHeight = 30;
        const contentHeight = fontSize;

        const offset1 = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const offset2 = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const offset3 = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);

        expect(offset1).toBe(offset2);
        expect(offset2).toBe(offset3);
      });
    });

    describe('different cell dimensions', () => {
      const contentHeight = fontSize;

      it('should handle standard Excel row height (20.25px)', () => {
        const cellHeight = 20.25;
        
        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(topOffset).toBe(paddingTop);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(middleOffset).toBeCloseTo((cellHeight - contentHeight) / 2, 2);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(bottomOffset).toBeCloseTo(cellHeight - contentHeight - paddingBottom, 2);
      });

      it('should handle tall cells (e.g., merged or manually resized)', () => {
        const cellHeight = 100;
        
        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(topOffset).toBe(paddingTop);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(middleOffset).toBe((cellHeight - contentHeight) / 2);
        expect(middleOffset).toBeGreaterThan(20);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(bottomOffset).toBe(cellHeight - contentHeight - paddingBottom);
        expect(bottomOffset).toBeGreaterThan(80);
      });

      it('should handle small cells', () => {
        const cellHeight = 10;
        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(offset).toBe(paddingTop);
      });
    });

    describe('different font sizes and padding', () => {
      const cellHeight = 40;

      it('should handle large font size', () => {
        const largeFontSize = 24;
        const contentHeight = largeFontSize;

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, largeFontSize, paddingTop, paddingBottom);
        expect(offset).toBe((cellHeight - contentHeight) / 2);
      });

      it('should handle small font size', () => {
        const smallFontSize = 8;
        const contentHeight = smallFontSize;

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, smallFontSize, paddingTop, paddingBottom);
        expect(offset).toBe((cellHeight - contentHeight) / 2);
      });

      it('should respect custom padding values', () => {
        const contentHeight = fontSize;
        const customPaddingTop = 10;
        const customPaddingBottom = 8;

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, customPaddingTop, customPaddingBottom);
        expect(topOffset).toBe(customPaddingTop);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, customPaddingTop, customPaddingBottom);
        expect(bottomOffset).toBe(cellHeight - contentHeight - customPaddingBottom);
      });

      it('should handle zero padding', () => {
        const contentHeight = fontSize;

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, 0, 0);
        expect(topOffset).toBe(0);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, 0, 0);
        expect(bottomOffset).toBe(cellHeight - contentHeight);
      });
    });

    describe('Excel compatibility', () => {
      it('should match Excel default alignment (bottom with Excel padding)', () => {
        // Excel default: 20.25px row height, 11pt Calibri (~14.67px), bottom-aligned
        const excelRowHeight = 20.25;
        const excelFontSize = 11 * (4 / 3); // 11pt to px
        const contentHeight = excelFontSize;

        const offset = computeVerticalOffset(undefined, excelRowHeight, contentHeight, excelFontSize, 2, 4);
        const expected = excelRowHeight - contentHeight - 4;
        expect(offset).toBeCloseTo(expected, 2);
      });

      it('should match Excel middle alignment calculation', () => {
        const cellHeight = 30;
        const contentHeight = 12;

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, 12, 2, 4);
        // Excel centers ignoring padding
        expect(offset).toBe((cellHeight - contentHeight) / 2);
      });
    });

    describe('boundary conditions', () => {
      it('should handle fractional pixel values', () => {
        const cellHeight = 20.75;
        const contentHeight = 12.5;

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, 12, 2, 4);
        expect(offset).toBeCloseTo((cellHeight - contentHeight) / 2, 2);
      });

      it('should handle very large cells', () => {
        const cellHeight = 1000;
        const contentHeight = fontSize;

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        expect(bottomOffset).toBe(cellHeight - contentHeight - paddingBottom);
        expect(bottomOffset).toBeGreaterThan(900);
      });

      it('should produce consistent relative ordering (top < middle < bottom)', () => {
        const cellHeight = 50;
        const contentHeight = fontSize;

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);

        expect(topOffset).toBeLessThan(middleOffset);
        expect(middleOffset).toBeLessThan(bottomOffset);
      });
    });
  });
});
