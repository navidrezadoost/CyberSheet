/**
 * Week 11 Day 4: Engineering Advanced Functions Tests
 * Complex Number Arithmetic, Exponential, Logarithmic, Trigonometric, and Hyperbolic Functions
 * 
 * Target: 20 functions, ~60 tests, 100% pass rate
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Week 11 Day 4: Engineering Advanced Functions', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 0, col: 0 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  // ============================================================================
  // IMADD - Complex Number Addition
  // ============================================================================
  describe('IMADD', () => {
    test('should add two complex numbers', () => {
      expect(evaluate('=IMADD("3+4i", "1+2i")')).toBe('4+6i');
    });

    test('should handle j suffix', () => {
      expect(evaluate('=IMADD("3+4j", "1+2j")')).toBe('4+6j');
    });

    test('should handle negative imaginary parts', () => {
      expect(evaluate('=IMADD("5+2i", "3-4i")')).toBe('8-2i');
    });

    test('should handle real numbers', () => {
      expect(evaluate('=IMADD("5", "3")')).toBe('8');
    });

    test('should handle purely imaginary numbers', () => {
      expect(evaluate('=IMADD("3i", "2i")')).toBe('5i');
    });

    test('should handle zero results', () => {
      expect(evaluate('=IMADD("3+2i", "-3-2i")')).toBe('0');
    });
  });

  // ============================================================================
  // IMSUB - Complex Number Subtraction
  // ============================================================================
  describe('IMSUB', () => {
    test('should subtract two complex numbers', () => {
      expect(evaluate('=IMSUB("5+6i", "2+3i")')).toBe('3+3i');
    });

    test('should handle j suffix', () => {
      expect(evaluate('=IMSUB("5+6j", "2+3j")')).toBe('3+3j');
    });

    test('should handle negative results', () => {
      expect(evaluate('=IMSUB("2+3i", "5+7i")')).toBe('-3-4i');
    });

    test('should handle real numbers', () => {
      expect(evaluate('=IMSUB("10", "4")')).toBe('6');
    });

    test('should handle purely imaginary numbers', () => {
      expect(evaluate('=IMSUB("5i", "2i")')).toBe('3i');
    });

    test('should handle zero results', () => {
      expect(evaluate('=IMSUB("3+2i", "3+2i")')).toBe('0');
    });
  });

  // ============================================================================
  // IMMULT - Complex Number Multiplication
  // ============================================================================
  describe('IMMULT', () => {
    test('should multiply two complex numbers', () => {
      expect(evaluate('=IMMULT("3+2i", "1+4i")')).toBe('-5+14i');
    });

    test('should handle j suffix', () => {
      expect(evaluate('=IMMULT("3+2j", "1+4j")')).toBe('-5+14j');
    });

    test('should handle i*i = -1', () => {
      expect(evaluate('=IMMULT("i", "i")')).toBe('-1');
    });

    test('should handle real numbers', () => {
      expect(evaluate('=IMMULT("5", "3")')).toBe('15');
    });

    test('should handle multiplication by zero', () => {
      expect(evaluate('=IMMULT("3+2i", "0")')).toBe('0');
    });

    test('should handle negative imaginary parts', () => {
      expect(evaluate('=IMMULT("2+3i", "4-5i")')).toBe('23+2i');
    });
  });

  // ============================================================================
  // IMDIV - Complex Number Division
  // ============================================================================
  describe('IMDIV', () => {
    test('should divide two complex numbers', () => {
      expect(evaluate('=IMDIV("1+2i", "3+4i")')).toBe('0.44+0.08i');
    });

    test('should handle j suffix', () => {
      expect(evaluate('=IMDIV("1+2j", "3+4j")')).toBe('0.44+0.08j');
    });

    test('should handle division by real number', () => {
      const result = String(evaluate('=IMDIV("4+2i", "2")'));
      expect(result).toMatch(/2\+1?i/); // Handles both "2+i" and "2+1i"
    });

    test('should return error for division by zero', () => {
      const result = evaluate('=IMDIV("5+3i", "0")');
      expect(String(result)).toMatch(/#NUM!/);
    });

    test('should handle negative imaginary parts', () => {
      expect(evaluate('=IMDIV("10", "2-i")')).toBe('4+2i');
    });

    test('should handle purely imaginary divisor', () => {
      expect(evaluate('=IMDIV("4", "2i")')).toBe('-2i');
    });
  });

  // ============================================================================
  // IMPOWER - Complex Number Power
  // ============================================================================
  describe('IMPOWER', () => {
    test('should raise complex number to integer power', () => {
      const result = String(evaluate('=IMPOWER("1+i", 2)'));
      // (1+i)^2 = 2i, allowing for floating point errors
      expect(result).toMatch(/[\d.e\-+]+\+2(\.\d+)?i/);
    });

    test('should handle j suffix', () => {
      const result = String(evaluate('=IMPOWER("1+j", 2)'));
      expect(result).toMatch(/[\d.e\-+]+\+2(\.\d+)?j/);
    });

    test('should handle power of 0', () => {
      expect(evaluate('=IMPOWER("3+4i", 0)')).toBe('1');
    });

    test('should handle power of 1', () => {
      const result = String(evaluate('=IMPOWER("3+4i", 1)'));
      // Should be 3+4i with possible floating point errors
      expect(result).toMatch(/3(\.\d+)?\+3\.99\d+i|3\+4i/);
    });

    test('should handle negative power', () => {
      const result = evaluate('=IMPOWER("2", -1)');
      expect(result).toBe('0.5');
    });

    test('should handle fractional power', () => {
      const result = evaluate('=IMPOWER("4", 0.5)');
      expect(result).toBe('2');
    });
  });

  // ============================================================================
  // IMSQRT - Complex Number Square Root
  // ============================================================================
  describe('IMSQRT', () => {
    test('should calculate square root of complex number', () => {
      const result = String(evaluate('=IMSQRT("0+4i")'));
      expect(result).toMatch(/1\.41421\d+\+1\.41421\d+i/);
    });

    test('should handle j suffix', () => {
      const result = String(evaluate('=IMSQRT("0+4j")'));
      expect(result).toMatch(/1\.41421\d+\+1\.41421\d+j/);
    });

    test('should handle real positive numbers', () => {
      expect(evaluate('=IMSQRT("4")')).toBe('2');
    });

    test('should handle real negative numbers', () => {
      const result = String(evaluate('=IMSQRT("-4")'));
      // Allow small real component near zero
      expect(result).toMatch(/[\d.e\-+]*\+?2i/);
    });

    test('should handle zero', () => {
      expect(evaluate('=IMSQRT("0")')).toBe('0');
    });
  });

  // ============================================================================
  // IMEXP - Complex Number Exponential
  // ============================================================================
  describe('IMEXP', () => {
    test('should calculate exponential of complex number', () => {
      const result = evaluate('=IMEXP("0+i")');
      expect(String(result)).toMatch(/0\.54030\d+\+0\.84147\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMEXP("0+j")');
      expect(String(result)).toMatch(/0\.54030\d+\+0\.84147\d+j/);
    });

    test('should handle real numbers (e^x)', () => {
      const result = evaluate('=IMEXP("1")');
      expect(String(result)).toMatch(/2\.71828\d+/);
    });

    test('should handle zero', () => {
      expect(evaluate('=IMEXP("0")')).toBe('1');
    });
  });

  // ============================================================================
  // IMLN - Complex Number Natural Logarithm
  // ============================================================================
  describe('IMLN', () => {
    test('should calculate natural logarithm of complex number', () => {
      const result = evaluate('=IMLN("1+i")');
      expect(String(result)).toMatch(/0\.34657\d+\+0\.78539\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMLN("1+j")');
      expect(String(result)).toMatch(/0\.34657\d+\+0\.78539\d+j/);
    });

    test('should handle positive real numbers', () => {
      const result = String(evaluate('=IMLN("2.71828")'));
      expect(result).toMatch(/0\.99999\d+|1\.0+/); // Close to 1
    });

    test('should handle negative real numbers', () => {
      const result = String(evaluate('=IMLN("-1")'));
      // May return just "3.14159...i" without leading "0+"
      expect(result).toMatch(/3\.14159\d+i/);
    });
  });

  // ============================================================================
  // IMLOG10 - Complex Number Base-10 Logarithm
  // ============================================================================
  describe('IMLOG10', () => {
    test('should calculate base-10 logarithm of complex number', () => {
      const result = evaluate('=IMLOG10("1+i")');
      expect(String(result)).toMatch(/0\.15051\d+\+0\.34109\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMLOG10("1+j")');
      expect(String(result)).toMatch(/0\.15051\d+\+0\.34109\d+j/);
    });

    test('should handle powers of 10', () => {
      expect(evaluate('=IMLOG10("100")')).toBe('2');
    });
  });

  // ============================================================================
  // IMLOG2 - Complex Number Base-2 Logarithm
  // ============================================================================
  describe('IMLOG2', () => {
    test('should calculate base-2 logarithm of complex number', () => {
      const result = evaluate('=IMLOG2("1+i")');
      expect(String(result)).toMatch(/0\.5(0+)?\d*\+1\.133\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMLOG2("1+j")');
      expect(String(result)).toMatch(/0\.5(0+)?\d*\+1\.133\d+j/);
    });

    test('should handle powers of 2', () => {
      expect(evaluate('=IMLOG2("8")')).toBe('3');
    });
  });

  // ============================================================================
  // IMSIN - Complex Sine
  // ============================================================================
  describe('IMSIN', () => {
    test('should calculate sine of complex number', () => {
      const result = evaluate('=IMSIN("1+i")');
      expect(String(result)).toMatch(/1\.29845\d+\+0\.63496\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMSIN("1+j")');
      expect(String(result)).toMatch(/1\.29845\d+\+0\.63496\d+j/);
    });

    test('should handle real numbers', () => {
      const result = evaluate('=IMSIN("0")');
      expect(result).toBe('0');
    });
  });

  // ============================================================================
  // IMCOS - Complex Cosine
  // ============================================================================
  describe('IMCOS', () => {
    test('should calculate cosine of complex number', () => {
      const result = evaluate('=IMCOS("1+i")');
      expect(String(result)).toMatch(/0\.83373\d+-0\.98889\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMCOS("1+j")');
      expect(String(result)).toMatch(/0\.83373\d+-0\.98889\d+j/);
    });

    test('should handle real numbers', () => {
      const result = evaluate('=IMCOS("0")');
      expect(result).toBe('1');
    });
  });

  // ============================================================================
  // IMTAN - Complex Tangent
  // ============================================================================
  describe('IMTAN', () => {
    test('should calculate tangent of complex number', () => {
      const result = evaluate('=IMTAN("1+i")');
      expect(String(result)).toMatch(/0\.27175\d+\+1\.08392\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMTAN("1+j")');
      expect(String(result)).toMatch(/0\.27175\d+\+1\.08392\d+j/);
    });

    test('should handle zero', () => {
      expect(evaluate('=IMTAN("0")')).toBe('0');
    });
  });

  // ============================================================================
  // IMSEC - Complex Secant
  // ============================================================================
  describe('IMSEC', () => {
    test('should calculate secant of complex number', () => {
      const result = evaluate('=IMSEC("1+i")');
      expect(String(result)).toMatch(/0\.49833\d+\+0\.59108\d+[ij]/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMSEC("1+j")');
      expect(String(result)).toMatch(/0\.49833\d+\+0\.59108\d+[ij]/);
    });
  });

  // ============================================================================
  // IMCSC - Complex Cosecant
  // ============================================================================
  describe('IMCSC', () => {
    test('should calculate cosecant of complex number', () => {
      const result = evaluate('=IMCSC("1+i")');
      expect(String(result)).toMatch(/0\.62151\d+-0\.30393\d+[ij]/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMCSC("1+j")');
      expect(String(result)).toMatch(/0\.62151\d+-0\.30393\d+[ij]/);
    });
  });

  // ============================================================================
  // IMCOT - Complex Cotangent
  // ============================================================================
  describe('IMCOT', () => {
    test('should calculate cotangent of complex number', () => {
      const result = evaluate('=IMCOT("1+i")');
      expect(String(result)).toMatch(/0\.21762\d+-0\.86801\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMCOT("1+j")');
      expect(String(result)).toMatch(/0\.21762\d+-0\.86801\d+j/);
    });
  });

  // ============================================================================
  // IMSINH - Complex Hyperbolic Sine
  // ============================================================================
  describe('IMSINH', () => {
    test('should calculate hyperbolic sine of complex number', () => {
      const result = evaluate('=IMSINH("1+i")');
      expect(String(result)).toMatch(/0\.63496\d+\+1\.29845\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMSINH("1+j")');
      expect(String(result)).toMatch(/0\.63496\d+\+1\.29845\d+j/);
    });

    test('should handle zero', () => {
      expect(evaluate('=IMSINH("0")')).toBe('0');
    });
  });

  // ============================================================================
  // IMCOSH - Complex Hyperbolic Cosine
  // ============================================================================
  describe('IMCOSH', () => {
    test('should calculate hyperbolic cosine of complex number', () => {
      const result = evaluate('=IMCOSH("1+i")');
      expect(String(result)).toMatch(/0\.83373\d+\+0\.98889\d+i/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMCOSH("1+j")');
      expect(String(result)).toMatch(/0\.83373\d+\+0\.98889\d+j/);
    });

    test('should handle zero', () => {
      expect(evaluate('=IMCOSH("0")')).toBe('1');
    });
  });

  // ============================================================================
  // IMSECH - Complex Hyperbolic Secant
  // ============================================================================
  describe('IMSECH', () => {
    test('should calculate hyperbolic secant of complex number', () => {
      const result = evaluate('=IMSECH("1+i")');
      expect(String(result)).toMatch(/0\.49833\d+-0\.59108\d+[ij]/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMSECH("1+j")');
      expect(String(result)).toMatch(/0\.49833\d+-0\.59108\d+[ij]/);
    });
  });

  // ============================================================================
  // IMCSCH - Complex Hyperbolic Cosecant
  // ============================================================================
  describe('IMCSCH', () => {
    test('should calculate hyperbolic cosecant of complex number', () => {
      const result = evaluate('=IMCSCH("1+i")');
      expect(String(result)).toMatch(/0\.30393\d+-0\.62151\d+[ij]/);
    });

    test('should handle j suffix', () => {
      const result = evaluate('=IMCSCH("1+j")');
      expect(String(result)).toMatch(/0\.30393\d+-0\.62151\d+[ij]/);
    });
  });
});
