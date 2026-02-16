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
      // availableHeight = 24 - 2 - 4 = 18

      it('should align to top when valign is "top"', () => {
        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(offset).toBe(paddingTop + fontSize);
      });

      it('should align to middle when valign is "middle"', () => {
        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (18 + 12) / 2 = 17
        const availableHeight = cellHeight - paddingTop - paddingBottom;
        const expected = paddingTop + (availableHeight + contentHeight) / 2;
        expect(offset).toBe(expected);
      });

      it('should align to bottom when valign is "bottom"', () => {
        const offset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 24 - 4 = 20
        const expected = cellHeight - paddingBottom;
        expect(offset).toBe(expected);
      });

      it('should default to bottom when valign is undefined', () => {
        const offset = computeVerticalOffset(undefined, cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // default (bottom): cellHeight - paddingBottom = 24 - 4 = 20
        const expected = cellHeight - paddingBottom;
        expect(offset).toBe(expected);
      });
    });

    describe('wrapped text (multi-line)', () => {
      const cellHeight = 48;
      const lineHeight = fontSize + 2;
      const lines = 3;
      const contentHeight = lines * lineHeight; // 42
      // availableHeight = 48 - 2 - 4 = 42

      it('should align to top when valign is "top"', () => {
        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(offset).toBe(paddingTop + fontSize);
      });

      it('should center multi-line content when valign is "middle"', () => {
        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (42 + 42) / 2 = 44
        const availableHeight = cellHeight - paddingTop - paddingBottom;
        const expected = paddingTop + (availableHeight + contentHeight) / 2;
        expect(offset).toBe(expected);
      });

      it('should align to bottom when valign is "bottom"', () => {
        const offset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 48 - 4 = 44
        const expected = cellHeight - paddingBottom;
        expect(offset).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should handle content taller than cell (no negative offset)', () => {
        const cellHeight = 20;
        const contentHeight = 40;
        const availableHeight = cellHeight - paddingTop - paddingBottom; // 14
        
        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(topOffset).toBe(paddingTop + fontSize);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (14 + 40) / 2 = 29
        expect(middleOffset).toBe(paddingTop + (availableHeight + contentHeight) / 2);
        expect(middleOffset).toBeGreaterThan(0);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 20 - 4 = 16, clamp ensures >= paddingTop + fontSize = 14
        expect(bottomOffset).toBe(cellHeight - paddingBottom);
        expect(bottomOffset).toBeGreaterThan(0);
      });

      it('should handle zero cell height', () => {
        const cellHeight = 0;
        const contentHeight = fontSize;

        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(offset).toBe(paddingTop + fontSize);
      });

      it('should handle exact fit (content equals cell minus padding)', () => {
        const cellHeight = 20;
        const contentHeight = 20 - paddingTop - paddingBottom; // 14
        const availableHeight = cellHeight - paddingTop - paddingBottom; // 14

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(topOffset).toBe(paddingTop + fontSize);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 20 - 4 = 16
        expect(bottomOffset).toBe(cellHeight - paddingBottom);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (14 + 14) / 2 = 16
        expect(middleOffset).toBe(paddingTop + (availableHeight + contentHeight) / 2);
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
        const availableHeight = cellHeight - paddingTop - paddingBottom; // 14.25
        
        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(topOffset).toBe(paddingTop + fontSize);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (14.25 + 12) / 2 = 15.125
        expect(middleOffset).toBeCloseTo(paddingTop + (availableHeight + contentHeight) / 2, 2);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 20.25 - 4 = 16.25
        expect(bottomOffset).toBeCloseTo(cellHeight - paddingBottom, 2);
      });

      it('should handle tall cells (e.g., merged or manually resized)', () => {
        const cellHeight = 100;
        const availableHeight = cellHeight - paddingTop - paddingBottom; // 94
        
        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(topOffset).toBe(paddingTop + fontSize);

        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (94 + 12) / 2 = 55
        expect(middleOffset).toBe(paddingTop + (availableHeight + contentHeight) / 2);
        expect(middleOffset).toBeGreaterThan(20);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 100 - 4 = 96
        expect(bottomOffset).toBe(cellHeight - paddingBottom);
        expect(bottomOffset).toBeGreaterThan(80);
      });

      it('should handle small cells', () => {
        const cellHeight = 10;
        const offset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // top: paddingTop + fontSize = 2 + 12 = 14
        expect(offset).toBe(paddingTop + fontSize);
      });
    });

    describe('different font sizes and padding', () => {
      const cellHeight = 40;

      it('should handle large font size', () => {
        const largeFontSize = 24;
        const contentHeight = largeFontSize;
        const availableHeight = cellHeight - paddingTop - paddingBottom; // 34

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, largeFontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (34 + 24) / 2 = 31
        expect(offset).toBe(paddingTop + (availableHeight + contentHeight) / 2);
      });

      it('should handle small font size', () => {
        const smallFontSize = 8;
        const contentHeight = smallFontSize;
        const availableHeight = cellHeight - paddingTop - paddingBottom; // 34

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, smallFontSize, paddingTop, paddingBottom);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (34 + 8) / 2 = 23
        expect(offset).toBe(paddingTop + (availableHeight + contentHeight) / 2);
      });

      it('should respect custom padding values', () => {
        const contentHeight = fontSize;
        const customPaddingTop = 10;
        const customPaddingBottom = 8;

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, customPaddingTop, customPaddingBottom);
        // top: customPaddingTop + fontSize = 10 + 12 = 22
        expect(topOffset).toBe(customPaddingTop + fontSize);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, customPaddingTop, customPaddingBottom);
        // bottom: cellHeight - customPaddingBottom = 40 - 8 = 32
        expect(bottomOffset).toBe(cellHeight - customPaddingBottom);
      });

      it('should handle zero padding', () => {
        const contentHeight = fontSize;

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, 0, 0);
        // top: 0 + fontSize = 12
        expect(topOffset).toBe(fontSize);

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, 0, 0);
        // bottom: cellHeight - 0 = 40, clamped to max(fontSize, 40) = 40
        expect(bottomOffset).toBe(cellHeight);
      });
    });

    describe('Excel compatibility', () => {
      it('should match Excel default alignment (bottom with Excel padding)', () => {
        // Excel default: 20.25px row height, 11pt Calibri (~14.67px), bottom-aligned
        const excelRowHeight = 20.25;
        const excelFontSize = 11 * (4 / 3); // 11pt to px ~14.67
        const contentHeight = excelFontSize;

        const offset = computeVerticalOffset(undefined, excelRowHeight, contentHeight, excelFontSize, 2, 4);
        // bottom: cellHeight - paddingBottom = 20.25 - 4 = 16.25
        // clamp: max(paddingTop + fontSize, 16.25) = max(2 + 14.67, 16.25) = 16.67
        const expected = Math.max(2 + excelFontSize, excelRowHeight - 4);
        expect(offset).toBeCloseTo(expected, 2);
      });

      it('should match Excel middle alignment calculation', () => {
        const cellHeight = 30;
        const contentHeight = 12;
        const availableHeight = cellHeight - 2 - 4; // 24

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, 12, 2, 4);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (24 + 12) / 2 = 20
        expect(offset).toBe(2 + (availableHeight + contentHeight) / 2);
      });
    });

    describe('boundary conditions', () => {
      it('should handle fractional pixel values', () => {
        const cellHeight = 20.75;
        const contentHeight = 12.5;
        const availableHeight = cellHeight - 2 - 4; // 14.75

        const offset = computeVerticalOffset('middle', cellHeight, contentHeight, 12, 2, 4);
        // middle: paddingTop + (availableHeight + contentHeight) / 2 = 2 + (14.75 + 12.5) / 2 = 15.625
        expect(offset).toBeCloseTo(2 + (availableHeight + contentHeight) / 2, 2);
      });

      it('should handle very large cells', () => {
        const cellHeight = 1000;
        const contentHeight = fontSize;

        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        // bottom: cellHeight - paddingBottom = 1000 - 4 = 996
        expect(bottomOffset).toBe(cellHeight - paddingBottom);
        expect(bottomOffset).toBeGreaterThan(900);
      });

      it('should produce consistent relative ordering (top < middle < bottom)', () => {
        const cellHeight = 50;
        const contentHeight = fontSize;
        // availableHeight = 50 - 2 - 4 = 44
        // top: 2 + 12 = 14
        // middle: 2 + (44 + 12) / 2 = 30
        // bottom: 50 - 4 = 46

        const topOffset = computeVerticalOffset('top', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const middleOffset = computeVerticalOffset('middle', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);
        const bottomOffset = computeVerticalOffset('bottom', cellHeight, contentHeight, fontSize, paddingTop, paddingBottom);

        expect(topOffset).toBeLessThan(middleOffset);
        expect(middleOffset).toBeLessThan(bottomOffset);
      });
    });
  });
});
