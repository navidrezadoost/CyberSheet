import { describe, it, expect } from '@jest/globals';
import { 
  parseFormatString, 
  compileFormat, 
  formatValue,
  getFormatter 
} from '../ExcelFormatGrammar';

describe('ExcelFormatGrammar - Comprehensive Format Engine', () => {
  
  // =========================================================================
  // 1️⃣ BASIC FORMAT PARSING
  // =========================================================================
  
  describe('Format Parser', () => {
    it('should parse single section format', () => {
      const parsed = parseFormatString('#,##0.00');
      expect(parsed.sections).toHaveLength(1);
      expect(parsed.sections[0].pattern).toBe('#,##0.00');
    });
    
    it('should parse two-section format (positive;negative)', () => {
      const parsed = parseFormatString('#,##0.00;-#,##0.00');
      expect(parsed.sections).toHaveLength(2);
      expect(parsed.sections[0].pattern).toBe('#,##0.00');
      expect(parsed.sections[1].pattern).toBe('-#,##0.00');
    });
    
    it('should parse three-section format (positive;negative;zero)', () => {
      const parsed = parseFormatString('#,##0.00;-#,##0.00;0');
      expect(parsed.sections).toHaveLength(3);
      expect(parsed.sections[2].pattern).toBe('0');
    });
    
    it('should parse four-section format (positive;negative;zero;text)', () => {
      const parsed = parseFormatString('#,##0.00;-#,##0.00;0;"N/A"');
      expect(parsed.sections).toHaveLength(4);
      expect(parsed.sections[3].pattern).toBe('"N/A"');
    });
  });
  
  // =========================================================================
  // 2️⃣ COLOR TAGS
  // =========================================================================
  
  describe('Color Tags', () => {
    it('should parse [Red] color tag', () => {
      const parsed = parseFormatString('[Red]#,##0.00');
      expect(parsed.sections[0].color).toBe('#FF0000');
    });
    
    it('should parse [Blue] color tag', () => {
      const parsed = parseFormatString('[Blue]#,##0.00');
      expect(parsed.sections[0].color).toBe('#0000FF');
    });
    
    it('should parse multiple color sections', () => {
      const parsed = parseFormatString('[Green]#,##0;[Red]-#,##0');
      expect(parsed.sections[0].color).toBe('#00FF00');
      expect(parsed.sections[1].color).toBe('#FF0000');
    });
    
    it('should format with color tag', () => {
      const result = formatValue(1234, '[Red]#,##0');
      expect(result.text).toBe('1,234');
      expect(result.color).toBe('#FF0000');
    });
  });
  
  // =========================================================================
  // 3️⃣ CONDITIONAL SECTIONS
  // =========================================================================
  
  describe('Conditional Sections', () => {
    it('should parse [>100] condition', () => {
      const parsed = parseFormatString('[>100][Green]#,##0;[Red]-#,##0');
      expect(parsed.sections[0].condition).toEqual({ operator: '>', value: 100 });
      expect(parsed.sections[0].color).toBe('#00FF00');
    });
    
    it('should apply condition [>1000]', () => {
      const result1 = formatValue(1500, '[>1000][Green]#,##0;[Red]#,##0');
      expect(result1.text).toBe('1,500');
      expect(result1.color).toBe('#00FF00');
      
      const result2 = formatValue(500, '[>1000][Green]#,##0;[Red]#,##0');
      expect(result2.text).toBe('500');
      expect(result2.color).toBe('#FF0000');
    });
    
    it('should handle [<=50] condition', () => {
      const result1 = formatValue(25, '[<=50]"Low";[>50]"High"');
      expect(result1.text).toBe('Low');
      
      const result2 = formatValue(75, '[<=50]"Low";[>50]"High"');
      expect(result2.text).toBe('High');
    });
  });
  
  // =========================================================================
  // 4️⃣ NUMBER FORMATTING
  // =========================================================================
  
  describe('Number Formatting', () => {
    it('should format with thousands separator', () => {
      const result = formatValue(1234567.89, '#,##0.00');
      expect(result.text).toBe('1,234,567.89');
    });
    
    it('should format without grouping', () => {
      const result = formatValue(1234567.89, '0.00');
      expect(result.text).toBe('1234567.89');
    });
    
    it('should handle thousands scaling (one comma)', () => {
      const result = formatValue(1234567, '#,##0,');
      expect(result.text).toBe('1,235');
    });
    
    it('should handle millions scaling (two commas)', () => {
      const result = formatValue(1234567890, '#,##0,,');
      expect(result.text).toBe('1,235');
    });
    
    it('should format currency with $ prefix', () => {
      const result = formatValue(1234.56, '$#,##0.00');
      expect(result.text).toBe('$1,234.56');
    });
    
    it('should handle negative numbers with parentheses', () => {
      const result = formatValue(-1234, '(#,##0);(#,##0)');
      expect(result.text).toBe('(1,234)'); // Commas present in pattern = grouping enabled
    });
  });
  
  // =========================================================================
  // 5️⃣ PERCENTAGE FORMATTING
  // =========================================================================
  
  describe('Percentage Formatting', () => {
    it('should format as percentage', () => {
      const result = formatValue(0.1234, '0.00%');
      expect(result.text).toBe('12.34%');
    });
    
    it('should format percentage with no decimals', () => {
      const result = formatValue(0.8765, '0%');
      expect(result.text).toBe('88%');
    });
    
    it('should handle percentage over 100%', () => {
      const result = formatValue(1.5, '0.0%');
      expect(result.text).toBe('150.0%');
    });
  });
  
  // =========================================================================
  // 6️⃣ FRACTION FORMATTING
  // =========================================================================
  
  describe('Fraction Formatting', () => {
    it('should format as simple fraction', () => {
      const result = formatValue(1.5, '# ?/?');
      expect(result.text).toMatch(/1 \d+\/\d+/);
    });
    
    it('should format fraction for decimal < 1', () => {
      const result = formatValue(0.25, '?/?');
      expect(result.text).toMatch(/\d+\/\d+/);
    });
    
    it('should format mixed number', () => {
      const result = formatValue(2.75, '# ??/??');
      expect(result.text).toMatch(/2 \d+\/\d+/);
    });
  });
  
  // =========================================================================
  // 7️⃣ SCIENTIFIC NOTATION
  // =========================================================================
  
  describe('Scientific Notation', () => {
    it('should format in scientific notation', () => {
      const result = formatValue(1234567, '0.00E+00');
      expect(result.text).toBe('1.23E+6');
    });
    
    it('should handle very small numbers', () => {
      const result = formatValue(0.000123, '0.00E+00');
      expect(result.text).toBe('1.23E-4');
    });
    
    it('should format with more decimal places', () => {
      const result = formatValue(9876543, '0.0000E+00');
      expect(result.text).toBe('9.8765E+6');
    });
  });
  
  // =========================================================================
  // 8️⃣ TEXT PLACEHOLDER
  // =========================================================================
  
  describe('Text Placeholder', () => {
    it('should use @ placeholder for text', () => {
      const result = formatValue('ABC', '"Value: "@');
      expect(result.text).toBe('Value: ABC');
    });
    
    it('should replace @ with cell value', () => {
      const result = formatValue('Test', '@" (annotated)"');
      expect(result.text).toBe('Test (annotated)');
    });
    
    it('should handle multiple @ symbols', () => {
      const result = formatValue('X', '@ - @');
      expect(result.text).toBe('X - X');
    });
  });
  
  // =========================================================================
  // 9️⃣ DATE/TIME FORMATTING
  // =========================================================================
  
  describe('Date/Time Formatting', () => {
    it('should format date as m/d/yyyy', () => {
      const date = new Date('2026-02-17');
      const result = formatValue(date, 'm/d/yyyy');
      expect(result.text).toBe('2/17/2026');
    });
    
    it('should format date as yyyy-mm-dd', () => {
      const date = new Date('2026-02-17');
      const result = formatValue(date, 'yyyy-mm-dd');
      expect(result.text).toBe('2026-02-17');
    });
    
    it('should format with month name', () => {
      const date = new Date('2026-02-17');
      const result = formatValue(date, 'mmm d, yyyy');
      expect(result.text).toBe('Feb 17, 2026');
    });
    
    it('should format time as h:mm', () => {
      const date = new Date('2026-02-17T14:30:00');
      const result = formatValue(date, 'h:mm AM/PM');
      expect(result.text).toMatch(/\d+:30 (AM|PM)/);
    });
    
    it('should format with full month name', () => {
      const date = new Date('2026-02-17');
      const result = formatValue(date, 'mmmm d, yyyy');
      expect(result.text).toBe('February 17, 2026');
    });
  });
  
  // =========================================================================
  // 🔟 ELAPSED TIME
  // =========================================================================
  
  describe('Elapsed Time', () => {
    it('should format elapsed hours [h]:mm', () => {
      const result = formatValue(1.5, '[h]:mm');
      // 1.5 days = 36 hours
      expect(result.text).toBe('36:00');
    });
    
    it('should format hours beyond 24', () => {
      const result = formatValue(2, '[h]:mm:ss');
      // 2 days = 48 hours
      expect(result.text).toBe('48:00:00');
    });
    
    it('should handle fractional hours', () => {
      const result = formatValue(0.5, '[h]:mm');
      // 0.5 days = 12 hours
      expect(result.text).toBe('12:00');
    });
  });
  
  // =========================================================================
  // 1️⃣1️⃣ FORMAT CACHE
  // =========================================================================
  
  describe('Format Cache', () => {
    it('should cache compiled formatters', () => {
      const formatter1 = getFormatter('#,##0.00');
      const formatter2 = getFormatter('#,##0.00');
      expect(formatter1).toBe(formatter2); // Same instance
    });
    
    it('should compile different formatters', () => {
      const formatter1 = getFormatter('#,##0.00');
      const formatter2 = getFormatter('0.00%');
      expect(formatter1).not.toBe(formatter2);
    });
  });
  
  // =========================================================================
  // 1️⃣2️⃣ EXCEL PARITY VALIDATION
  // =========================================================================
  
  describe('Excel Parity Examples', () => {
    it('should match Excel: positive;negative;zero', () => {
      const format = '[Green]#,##0;[Red]-#,##0;"Zero"';
      
      expect(formatValue(1234, format).text).toBe('1,234');
      expect(formatValue(1234, format).color).toBe('#00FF00');
      
      expect(formatValue(-1234, format).text).toBe('-1,234');
      expect(formatValue(-1234, format).color).toBe('#FF0000');
      
      expect(formatValue(0, format).text).toBe('Zero');
    });
    
    it('should match Excel: accounting format', () => {
      const format = '$#,##0.00;($#,##0.00)';
      
      expect(formatValue(1234.56, format).text).toBe('$1,234.56');
      expect(formatValue(-1234.56, format).text).toBe('($1,234.56)');
    });
    
    it('should match Excel: conditional with thresholds', () => {
      const format = '[>=1000][Green]#,##0;[>0][Yellow]#,##0;[Red]#,##0';
      
      const result1 = formatValue(1500, format);
      expect(result1.text).toBe('1,500');
      expect(result1.color).toBe('#00FF00');
      
      const result2 = formatValue(500, format);
      expect(result2.text).toBe('500');
      expect(result2.color).toBe('#FFFF00');
      
      const result3 = formatValue(-100, format);
      expect(result3.text).toBe('-100');
      expect(result3.color).toBe('#FF0000');
    });
    
    it('should match Excel: thousands/millions scaling', () => {
      const format1 = '#,##0,';
      expect(formatValue(1234567, format1).text).toBe('1,235');
      
      const format2 = '#,##0,,';
      expect(formatValue(1234567890, format2).text).toBe('1,235');
    });
  });
});
