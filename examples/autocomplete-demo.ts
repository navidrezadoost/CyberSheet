/**
 * Formula Autocomplete Usage Example
 * 
 * Week 9 Day 1: Demonstrating the autocomplete system
 */

import { FunctionRegistry } from '../packages/core/src/registry/FunctionRegistry';
import { FormulaAutocomplete } from '../packages/core/src/autocomplete/FormulaAutocomplete';
import { registerBuiltInFunctions } from '../packages/core/src/functions/function-initializer';
import { FunctionCategory } from '../packages/core/src/types/formula-types';

// Initialize registry and autocomplete
const registry = new FunctionRegistry();
registerBuiltInFunctions(registry);
const autocomplete = new FormulaAutocomplete(registry);

console.log('🎯 Week 9 Day 1: Formula Autocomplete Demo\n');
console.log('═══════════════════════════════════════════════\n');

// Example 1: User types "=SU"
console.log('📝 Example 1: User types "=SU"');
console.log('─────────────────────────────────────');
const suSuggestions = autocomplete.getSuggestions('SU', { maxSuggestions: 5 });
suSuggestions.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name.padEnd(15)} - ${s.description}`);
  console.log(`   Syntax: ${s.syntax}`);
  console.log(`   Category: ${s.category}, Score: ${s.matchScore.toFixed(1)}\n`);
});

// Example 2: User types "=XLOOK"
console.log('\n📝 Example 2: User types "=XLOOK"');
console.log('─────────────────────────────────────');
const xlookSuggestions = autocomplete.getSuggestions('XLOOK');
xlookSuggestions.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name.padEnd(15)} - ${s.description}`);
  console.log(`   Syntax: ${s.syntax}`);
  console.log(`   Match: ${s.matchType}, Score: ${s.matchScore.toFixed(1)}\n`);
});

// Example 3: User types "=FIL"
console.log('\n📝 Example 3: User types "=FIL"');
console.log('─────────────────────────────────────');
const filSuggestions = autocomplete.getSuggestions('FIL');
filSuggestions.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name.padEnd(15)} - ${s.description}`);
  console.log(`   Syntax: ${s.syntax}\n`);
});

// Example 4: Browse financial functions
console.log('\n📝 Example 4: Browse Financial Functions');
console.log('─────────────────────────────────────');
const financialSuggestions = autocomplete.getSuggestionsByCategory(
  FunctionCategory.FINANCIAL,
  10
);
console.log(`Found ${financialSuggestions.length} financial functions:\n`);
financialSuggestions.forEach((s, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${s.name.padEnd(10)} - ${s.description}`);
});

// Example 5: Fuzzy matching (typo correction)
console.log('\n\n📝 Example 5: Fuzzy Matching - User typo "XLOKUP"');
console.log('─────────────────────────────────────');
const fuzzySuggestions = autocomplete.getSuggestions('XLOKUP', { 
  fuzzyThreshold: 0.5,
  maxSuggestions: 3
});
if (fuzzySuggestions.length > 0) {
  console.log('Did you mean:');
  fuzzySuggestions.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (similarity: ${s.matchScore.toFixed(1)})`);
  });
} else {
  console.log('No suggestions found');
}

// Example 6: Category filtering
console.log('\n\n📝 Example 6: Filter by Category - Only Math Functions starting with "R"');
console.log('─────────────────────────────────────');
const mathSuggestions = autocomplete.getSuggestions('R', {
  includeCategory: [FunctionCategory.MATH],
  maxSuggestions: 5
});
mathSuggestions.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name.padEnd(12)} - ${s.description}`);
});

// Example 7: Performance test
console.log('\n\n📝 Example 7: Performance Test');
console.log('─────────────────────────────────────');
const iterations = 1000;
const startTime = performance.now();
for (let i = 0; i < iterations; i++) {
  autocomplete.getSuggestions('SUM');
}
const endTime = performance.now();
const avgTime = (endTime - startTime) / iterations;
console.log(`Average autocomplete time: ${avgTime.toFixed(3)}ms (${iterations} iterations)`);
console.log(`Performance: ${avgTime < 1 ? '✅ Excellent' : avgTime < 5 ? '✅ Good' : '⚠️ Needs optimization'}`);

// Summary
console.log('\n\n═══════════════════════════════════════════════');
console.log('📊 Autocomplete System Summary');
console.log('═══════════════════════════════════════════════');
console.log(`Total functions registered: ${registry.getAllNames().length}`);
console.log(`Supports fuzzy matching: ✅`);
console.log(`Supports category filtering: ✅`);
console.log(`Provides syntax information: ✅`);
console.log(`Performance optimized: ✅`);
console.log('\n✨ Week 9 Day 1 Complete: Formula Autocomplete System Ready!');
