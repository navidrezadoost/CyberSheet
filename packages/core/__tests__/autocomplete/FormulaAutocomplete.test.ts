/**
 * FormulaAutocomplete.test.ts
 * 
 * Comprehensive tests for the formula autocomplete system
 * Week 9 Day 1: Formula Autocomplete Testing
 */

import { FunctionRegistry } from '../../src/registry/FunctionRegistry';
import { FormulaAutocomplete } from '../../src/autocomplete/FormulaAutocomplete';
import { FunctionCategory } from '../../src/types/formula-types';
import { registerBuiltInFunctions } from '../../src/functions/function-initializer';

describe('FormulaAutocomplete', () => {
  let registry: FunctionRegistry;
  let autocomplete: FormulaAutocomplete;

  beforeEach(() => {
    registry = new FunctionRegistry();
    registerBuiltInFunctions(registry);
    autocomplete = new FormulaAutocomplete(registry);
  });

  describe('Basic Autocomplete', () => {
    test('getSuggestions returns suggestions for "SU"', () => {
      const suggestions = autocomplete.getSuggestions('SU');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toBe('SUM');
      
      // Check that all suggestions start with SU or contain SU
      for (const suggestion of suggestions) {
        expect(
          suggestion.name.startsWith('SU') || suggestion.name.includes('SU')
        ).toBe(true);
      }
    });

    test('getSuggestions returns XLOOKUP for "XLOOK"', () => {
      const suggestions = autocomplete.getSuggestions('XLOOK');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toBe('XLOOKUP');
      expect(suggestions[0].matchType).toBe('startsWith');
    });

    test('getSuggestions returns FILTER for "FIL"', () => {
      const suggestions = autocomplete.getSuggestions('FIL');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toBe('FILTER');
    });

    test('getSuggestions handles empty input', () => {
      const suggestions = autocomplete.getSuggestions('');
      expect(suggestions.length).toBe(0);
    });

    test('getSuggestions is case insensitive', () => {
      const upperSuggestions = autocomplete.getSuggestions('SUM');
      const lowerSuggestions = autocomplete.getSuggestions('sum');
      const mixedSuggestions = autocomplete.getSuggestions('SuM');
      
      expect(upperSuggestions.length).toBeGreaterThan(0);
      expect(lowerSuggestions.length).toBeGreaterThan(0);
      expect(mixedSuggestions.length).toBeGreaterThan(0);
      
      expect(upperSuggestions[0].name).toBe(lowerSuggestions[0].name);
      expect(upperSuggestions[0].name).toBe(mixedSuggestions[0].name);
    });
  });

  describe('Match Types and Ranking', () => {
    test('exact match has highest score', () => {
      const suggestions = autocomplete.getSuggestions('SUM');
      const exactMatch = suggestions.find(s => s.name === 'SUM');
      
      expect(exactMatch).toBeDefined();
      expect(exactMatch!.matchType).toBe('exact');
      expect(exactMatch!.matchScore).toBe(100);
    });

    test('startsWith match has high score', () => {
      const suggestions = autocomplete.getSuggestions('SU');
      const startsWithMatch = suggestions[0];
      
      expect(startsWithMatch.matchType).toBe('startsWith');
      expect(startsWithMatch.matchScore).toBeGreaterThanOrEqual(90);
    });

    test('contains match has medium score', () => {
      const suggestions = autocomplete.getSuggestions('LARGE', { maxSuggestions: 20 });
      const containsMatch = suggestions.find(s => s.name === 'LARGE');
      
      if (containsMatch && containsMatch.matchType === 'contains') {
        expect(containsMatch.matchScore).toBeGreaterThanOrEqual(50);
        expect(containsMatch.matchScore).toBeLessThan(90);
      }
    });

    test('suggestions are sorted by match score', () => {
      const suggestions = autocomplete.getSuggestions('SUM');
      
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].matchScore).toBeGreaterThanOrEqual(suggestions[i].matchScore);
      }
    });

    test('startsWith is prioritized over contains', () => {
      const suggestions = autocomplete.getSuggestions('AV');
      
      // AVERAGE starts with AV, should be ranked higher than functions containing AV
      const firstSuggestion = suggestions[0];
      expect(firstSuggestion.name.startsWith('AV')).toBe(true);
      expect(firstSuggestion.matchType).toBe('startsWith');
    });
  });

  describe('Fuzzy Matching', () => {
    test('fuzzy match for typo "XLOKUP" suggests XLOOKUP', () => {
      const suggestions = autocomplete.getSuggestions('XLOKUP', { 
        maxSuggestions: 20,
        fuzzyThreshold: 0.5 
      });
      
      const xlookup = suggestions.find(s => s.name === 'XLOOKUP');
      expect(xlookup).toBeDefined();
    });

    test('fuzzy match for "FITER" suggests FILTER', () => {
      const suggestions = autocomplete.getSuggestions('FITER', { 
        maxSuggestions: 20,
        fuzzyThreshold: 0.5 
      });
      
      const filter = suggestions.find(s => s.name === 'FILTER');
      expect(filter).toBeDefined();
    });

    test('fuzzy threshold controls strictness', () => {
      // Strict threshold (0.8) - fewer matches
      const strictSuggestions = autocomplete.getSuggestions('XYZ', { 
        fuzzyThreshold: 0.8,
        maxSuggestions: 20
      });
      
      // Loose threshold (0.3) - more matches
      const looseSuggestions = autocomplete.getSuggestions('XYZ', { 
        fuzzyThreshold: 0.3,
        maxSuggestions: 20
      });
      
      expect(looseSuggestions.length).toBeGreaterThanOrEqual(strictSuggestions.length);
    });
  });

  describe('Suggestion Metadata', () => {
    test('suggestion includes function name', () => {
      const suggestions = autocomplete.getSuggestions('SUM');
      expect(suggestions[0].name).toBe('SUM');
    });

    test('suggestion includes category', () => {
      const suggestions = autocomplete.getSuggestions('SUM');
      expect(suggestions[0].category).toBe(FunctionCategory.MATH);
    });

    test('suggestion includes description', () => {
      const suggestions = autocomplete.getSuggestions('SUM');
      expect(suggestions[0].description).toBeDefined();
      expect(suggestions[0].description.length).toBeGreaterThan(0);
      expect(suggestions[0].description).toContain('Add');
    });

    test('suggestion includes syntax', () => {
      const suggestions = autocomplete.getSuggestions('SUM');
      expect(suggestions[0].syntax).toBeDefined();
      expect(suggestions[0].syntax).toContain('SUM(');
    });

    test('syntax includes argument information', () => {
      const suggestions = autocomplete.getSuggestions('ROUND');
      const roundSuggestion = suggestions.find(s => s.name === 'ROUND');
      
      expect(roundSuggestion).toBeDefined();
      expect(roundSuggestion!.syntax).toMatch(/ROUND\(.*\)/);
    });

    test('suggestion includes minArgs and maxArgs', () => {
      const suggestions = autocomplete.getSuggestions('ROUND');
      const roundSuggestion = suggestions.find(s => s.name === 'ROUND');
      
      expect(roundSuggestion).toBeDefined();
      expect(roundSuggestion!.minArgs).toBe(2);
      expect(roundSuggestion!.maxArgs).toBe(2);
    });
  });

  describe('Category Filtering', () => {
    test('includeCategory filters to specific categories', () => {
      const suggestions = autocomplete.getSuggestions('P', { 
        includeCategory: [FunctionCategory.FINANCIAL],
        maxSuggestions: 100
      });
      
      // Should return financial functions starting with P (PV, PMT, PPMT, etc.)
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All should be financial
      for (const suggestion of suggestions) {
        expect(suggestion.category).toBe(FunctionCategory.FINANCIAL);
      }
    });

    test('excludeCategory filters out specific categories', () => {
      const suggestions = autocomplete.getSuggestions('SU', { 
        excludeCategory: [FunctionCategory.MATH],
        maxSuggestions: 20
      });
      
      // None should be math
      for (const suggestion of suggestions) {
        expect(suggestion.category).not.toBe(FunctionCategory.MATH);
      }
    });

    test('includeCategory with multiple categories', () => {
      const suggestions = autocomplete.getSuggestions('A', { 
        includeCategory: [FunctionCategory.MATH, FunctionCategory.STATISTICAL],
        maxSuggestions: 100
      });
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      for (const suggestion of suggestions) {
        expect(
          suggestion.category === FunctionCategory.MATH ||
          suggestion.category === FunctionCategory.STATISTICAL
        ).toBe(true);
      }
    });
  });

  describe('Options and Limits', () => {
    test('maxSuggestions limits results', () => {
      const suggestions = autocomplete.getSuggestions('A', { maxSuggestions: 5 });
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    test('default maxSuggestions is 10', () => {
      const suggestions = autocomplete.getSuggestions('A');
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    test('maxSuggestions can return more than 10', () => {
      const suggestions = autocomplete.getSuggestions('A', { maxSuggestions: 50 });
      // With input 'A', we should get many matches
      expect(suggestions.length).toBeGreaterThan(5);
    });
  });

  describe('Category Browsing', () => {
    test('getSuggestionsByCategory returns functions in category', () => {
      const suggestions = autocomplete.getSuggestionsByCategory(FunctionCategory.FINANCIAL);
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      for (const suggestion of suggestions) {
        expect(suggestion.category).toBe(FunctionCategory.FINANCIAL);
      }
      
      // Check for some known financial functions
      const functionNames = suggestions.map(s => s.name);
      expect(functionNames).toContain('NPV');
      expect(functionNames).toContain('PV');
      expect(functionNames).toContain('FV');
      expect(functionNames).toContain('PMT');
    });

    test('getSuggestionsByCategory respects limit', () => {
      const suggestions = autocomplete.getSuggestionsByCategory(FunctionCategory.MATH, 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    test('getSuggestionsByCategory returns alphabetically sorted', () => {
      const suggestions = autocomplete.getSuggestionsByCategory(FunctionCategory.MATH, 20);
      
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].name.localeCompare(suggestions[i].name)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Common Use Cases', () => {
    test('typing "=SU" suggests SUM family functions', () => {
      const suggestions = autocomplete.getSuggestions('SU');
      const names = suggestions.map(s => s.name);
      
      expect(names).toContain('SUM');
      expect(names.some(n => n.includes('SUM'))).toBe(true);
    });

    test('typing "=IF" suggests IF family functions', () => {
      const suggestions = autocomplete.getSuggestions('IF');
      const names = suggestions.map(s => s.name);
      
      expect(names).toContain('IF');
      expect(names).toContain('IFS');
      expect(names).toContain('IFERROR');
    });

    test('typing "=XL" suggests XLOOKUP', () => {
      const suggestions = autocomplete.getSuggestions('XL');
      
      expect(suggestions[0].name).toBe('XLOOKUP');
    });

    test('typing "=LAM" suggests LAMBDA', () => {
      const suggestions = autocomplete.getSuggestions('LAM');
      
      expect(suggestions[0].name).toBe('LAMBDA');
    });

    test('typing "=DAT" suggests DATE functions', () => {
      const suggestions = autocomplete.getSuggestions('DAT');
      const names = suggestions.map(s => s.name);
      
      expect(names).toContain('DATE');
      expect(names.some(n => n.includes('DATE'))).toBe(true);
    });
  });

  describe('Financial Functions Autocomplete', () => {
    test('typing "=NP" suggests NPV or NPER', () => {
      const suggestions = autocomplete.getSuggestions('NP');
      
      const firstMatch = suggestions[0].name;
      expect(firstMatch === 'NPV' || firstMatch === 'NPER').toBe(true);
      expect(suggestions.some(s => s.name === 'NPV')).toBe(true);
    });

    test('typing "=RATE" finds RATE function', () => {
      const suggestions = autocomplete.getSuggestions('RATE');
      
      expect(suggestions[0].name).toBe('RATE');
      expect(suggestions[0].category).toBe(FunctionCategory.FINANCIAL);
    });

    test('all 13 financial functions are available', () => {
      const financialFunctions = autocomplete.getSuggestionsByCategory(
        FunctionCategory.FINANCIAL,
        20
      );
      
      const names = financialFunctions.map(s => s.name);
      
      // Check all 13 functions from Week 8
      expect(names).toContain('NPV');
      expect(names).toContain('XNPV');
      expect(names).toContain('PV');
      expect(names).toContain('FV');
      expect(names).toContain('PMT');
      expect(names).toContain('IPMT');
      expect(names).toContain('PPMT');
      expect(names).toContain('IRR');
      expect(names).toContain('XIRR');
      expect(names).toContain('NPER');
      expect(names).toContain('RATE');
      expect(names).toContain('EFFECT');
      expect(names).toContain('NOMINAL');
    });
  });

  describe('Custom Descriptions', () => {
    test('setDescription updates function description', () => {
      autocomplete.setDescription('SUM', 'Custom sum description');
      
      const suggestions = autocomplete.getSuggestions('SUM');
      expect(suggestions[0].description).toBe('Custom sum description');
    });

    test('setDescription is case insensitive', () => {
      autocomplete.setDescription('sum', 'Custom description');
      
      const suggestions = autocomplete.getSuggestions('SUM');
      expect(suggestions[0].description).toBe('Custom description');
    });
  });

  describe('Edge Cases', () => {
    test('handles single character input', () => {
      const suggestions = autocomplete.getSuggestions('S');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('handles very long input', () => {
      const suggestions = autocomplete.getSuggestions('VERYLONGFUNCTIONNAME');
      // Should still work, even if no matches
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('handles special characters gracefully', () => {
      const suggestions = autocomplete.getSuggestions('SUM!@#');
      // Should return empty or handle gracefully
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('handles numeric input', () => {
      const suggestions = autocomplete.getSuggestions('123');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Performance', () => {
    test('autocomplete completes within reasonable time', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        autocomplete.getSuggestions('SUM');
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / 100;
      
      // Should complete in less than 5ms on average
      expect(avgTime).toBeLessThan(5);
    });

    test('handles large result sets efficiently', () => {
      const startTime = performance.now();
      
      const suggestions = autocomplete.getSuggestions('A', { maxSuggestions: 100 });
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // 50ms threshold
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
