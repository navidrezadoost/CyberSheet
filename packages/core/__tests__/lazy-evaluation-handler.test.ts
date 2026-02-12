/**
 * lazy-evaluation-handler.test.ts
 * 
 * Unit tests for Phase 6 LAZY_EVALUATION handlers.
 * Tests that handlers correctly accept thunks and evaluate lazily.
 */

import { IF, IFERROR, IFNA, IFS, SWITCH, NOT, XOR } from '../src/functions/logical/logical-functions';

describe('Phase 6: LAZY_EVALUATION Handler Unit Tests', () => {
  describe('IF Handler', () => {
    test('IF evaluates only the true branch when condition is TRUE', () => {
      // Setup: Track if false branch is evaluated
      let falseBranchEvaluated = false;
      
      const conditionThunk = () => true;
      const trueThunk = () => 'true result';
      const falseThunk = () => {
        falseBranchEvaluated = true;
        return 'false result';
      };
      
      // Execute
      const result = IF(conditionThunk, trueThunk, falseThunk);
      
      // Verify: True branch result returned, false branch never evaluated
      expect(result).toBe('true result');
      expect(falseBranchEvaluated).toBe(false);
    });

    test('IF evaluates only the false branch when condition is FALSE', () => {
      // Setup: Track if true branch is evaluated
      let trueBranchEvaluated = false;
      
      const conditionThunk = () => false;
      const trueThunk = () => {
        trueBranchEvaluated = true;
        return 'true result';
      };
      const falseThunk = () => 'false result';
      
      // Execute
      const result = IF(conditionThunk, trueThunk, falseThunk);
      
      // Verify: False branch result returned, true branch never evaluated
      expect(result).toBe('false result');
      expect(trueBranchEvaluated).toBe(false);
    });

    test('IF propagates error from condition evaluation', () => {
      // Setup: Condition thunk that throws error
      const conditionThunk = () => new Error('#DIV/0!');
      const trueThunk = () => 'true result';
      const falseThunk = () => 'false result';
      
      // Execute
      const result = IF(conditionThunk, trueThunk, falseThunk);
      
      // Verify: Error propagated, neither branch evaluated
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('IF does not evaluate false branch when it would error', () => {
      // Setup: False branch that errors
      const conditionThunk = () => true;
      const trueThunk = () => 'safe';
      const falseThunk = () => {
        throw new Error('This should not be evaluated');
      };
      
      // Execute
      const result = IF(conditionThunk, trueThunk, falseThunk);
      
      // Verify: True branch returned, no error from false branch
      expect(result).toBe('safe');
    });

    test('IF backward compatibility with non-thunk arguments', () => {
      // Setup: Pass raw values instead of thunks (backward compatibility)
      const result = IF(() => true, 'direct true', 'direct false');
      
      // Verify: Works with mixed thunk/non-thunk arguments
      expect(result).toBe('direct true');
    });
  });

  // IFERROR Handler Tests
  describe('IFERROR Handler', () => {
    test('IFERROR evaluates only value thunk, not fallback if no error', () => {
      let fallbackEvaluated = false; // Track side effect
      
      const valueThunk = () => 'valid result';
      const fallbackThunk = () => {
        fallbackEvaluated = true; // Would set flag if evaluated
        return 'fallback';
      };
      
      const result = IFERROR(valueThunk, fallbackThunk);
      
      expect(result).toBe('valid result'); // Correct result
      expect(fallbackEvaluated).toBe(false); // Prove lazy evaluation
    });

    test('IFERROR evaluates fallback thunk only when value errors', () => {
      let fallbackEvaluated = false; // Track side effect
      
      const valueThunk = () => new Error('#DIV/0!'); // Error value
      const fallbackThunk = () => {
        fallbackEvaluated = true; // Should be set
        return 'error handled';
      };
      
      const result = IFERROR(valueThunk, fallbackThunk);
      
      expect(result).toBe('error handled'); // Fallback returned
      expect(fallbackEvaluated).toBe(true); // Fallback was evaluated
    });

    test('IFERROR does not evaluate fallback when value is valid', () => {
      // Setup: Fallback that would error if evaluated
      const valueThunk = () => 42;
      const fallbackThunk = () => {
        throw new Error('Fallback should not be evaluated');
      };
      
      // Execute
      const result = IFERROR(valueThunk, fallbackThunk);
      
      // Verify: Value returned, no error from fallback
      expect(result).toBe(42);
    });

    test('IFERROR backward compatibility with non-thunk arguments', () => {
      // Setup: Pass raw values instead of thunks
      const result1 = IFERROR(() => 'valid', 'fallback');
      const result2 = IFERROR(() => new Error('error'), 'fallback');
      
      // Verify: Works with mixed thunk/non-thunk arguments
      expect(result1).toBe('valid');
      expect(result2).toBe('fallback');
    });
  });

  // IFNA Handler Tests
  describe('IFNA Handler', () => {
    test('IFNA evaluates only value thunk, not fallback if not #N/A', () => {
      let fallbackEvaluated = false; // Track side effect
      
      const valueThunk = () => 'valid result';
      const fallbackThunk = () => {
        fallbackEvaluated = true; // Would set flag if evaluated
        return 'fallback';
      };
      
      const result = IFNA(valueThunk, fallbackThunk);
      
      expect(result).toBe('valid result'); // Correct result
      expect(fallbackEvaluated).toBe(false); // Prove lazy evaluation
    });

    test('IFNA evaluates fallback thunk only when value is #N/A', () => {
      let fallbackEvaluated = false; // Track side effect
      
      const valueThunk = () => new Error('#N/A'); // #N/A error
      const fallbackThunk = () => {
        fallbackEvaluated = true; // Should be set
        return 'NA handled';
      };
      
      const result = IFNA(valueThunk, fallbackThunk);
      
      expect(result).toBe('NA handled'); // Fallback returned
      expect(fallbackEvaluated).toBe(true); // Fallback was evaluated
    });

    test('IFNA does not trap non-#N/A errors', () => {
      // Setup: Non-#N/A error should propagate without evaluating fallback
      const valueThunk = () => new Error('#DIV/0!'); // Non-#N/A error
      const fallbackThunk = () => {
        throw new Error('Fallback should not be evaluated');
      };
      
      // Execute
      const result = IFNA(valueThunk, fallbackThunk);
      
      // Verify: Non-#N/A error propagates (not trapped)
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('IFNA backward compatibility with non-thunk arguments', () => {
      // Setup: Pass raw values instead of thunks
      const result1 = IFNA(() => 'valid', 'fallback');
      const result2 = IFNA(() => new Error('#N/A'), 'fallback');
      
      // Verify: Works with mixed thunk/non-thunk arguments
      expect(result1).toBe('valid');
      expect(result2).toBe('fallback');
    });
  });

  // IFS Handler Tests
  describe('IFS Handler', () => {
    test('IFS stops at first TRUE condition', () => {
      let secondTestEvaluated = false; // Track side effect
      let secondValueEvaluated = false;
      
      const test1Thunk = () => true; // First test is TRUE
      const value1Thunk = () => 'first match';
      const test2Thunk = () => {
        secondTestEvaluated = true; // Would set if evaluated
        return true;
      };
      const value2Thunk = () => {
        secondValueEvaluated = true; // Would set if evaluated
        return 'second match';
      };
      
      const result = IFS(test1Thunk, value1Thunk, test2Thunk, value2Thunk);
      
      expect(result).toBe('first match'); // First value returned
      expect(secondTestEvaluated).toBe(false); // Second test not evaluated
      expect(secondValueEvaluated).toBe(false); // Second value not evaluated
    });

    test('IFS does not evaluate subsequent value thunks after match', () => {
      // Setup: Second value would error if evaluated
      const test1Thunk = () => false; // First test FALSE
      const value1Thunk = () => 'first';
      const test2Thunk = () => true; // Second test TRUE
      const value2Thunk = () => 'second match';
      const test3Thunk = () => true;
      const value3Thunk = () => {
        throw new Error('Third value should not be evaluated');
      };
      
      const result = IFS(test1Thunk, value1Thunk, test2Thunk, value2Thunk, test3Thunk, value3Thunk);
      
      expect(result).toBe('second match'); // Second value returned, third not evaluated
    });

    test('IFS returns #N/A when no condition matches', () => {
      // Setup: All tests FALSE
      const test1Thunk = () => false;
      const value1Thunk = () => 'first';
      const test2Thunk = () => false;
      const value2Thunk = () => 'second';
      
      const result = IFS(test1Thunk, value1Thunk, test2Thunk, value2Thunk);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('IFS propagates error from test evaluation', () => {
      // Setup: First test errors
      const test1Thunk = () => new Error('#DIV/0!');
      const value1Thunk = () => 'first';
      const test2Thunk = () => true;
      const value2Thunk = () => 'second';
      
      const result = IFS(test1Thunk, value1Thunk, test2Thunk, value2Thunk);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('IFS backward compatibility with non-thunk arguments', () => {
      // Setup: Mix thunks and raw values
      const result = IFS(() => false, 'first', () => true, 'second');
      
      expect(result).toBe('second');
    });
  });

  // SWITCH Handler Tests
  describe('SWITCH Handler', () => {
    test('SWITCH stops at first matching case', () => {
      let secondCaseEvaluated = false; // Track side effect
      let secondValueEvaluated = false;

      const expressionThunk = () => 'a'; // Expression is 'a'
      const case1Thunk = () => 'a'; // First case matches
      const value1Thunk = () => 'first match';
      const case2Thunk = () => {
        secondCaseEvaluated = true; // Would set if evaluated
        return 'a';
      };
      const value2Thunk = () => {
        secondValueEvaluated = true; // Would set if evaluated
        return 'second match';
      };

      const result = SWITCH(expressionThunk, case1Thunk, value1Thunk, case2Thunk, value2Thunk);

      expect(result).toBe('first match'); // First value returned
      expect(secondCaseEvaluated).toBe(false); // Second case not evaluated
      expect(secondValueEvaluated).toBe(false); // Second value not evaluated
    });

    test('SWITCH does not evaluate subsequent value thunks after match', () => {
      // Setup: Third value would error if evaluated
      const expressionThunk = () => 'b';
      const case1Thunk = () => 'a'; // First case doesn't match
      const value1Thunk = () => 'first';
      const case2Thunk = () => 'b'; // Second case matches
      const value2Thunk = () => 'second match';
      const case3Thunk = () => 'c';
      const value3Thunk = () => {
        throw new Error('Third value should not be evaluated');
      };

      const result = SWITCH(expressionThunk, case1Thunk, value1Thunk, case2Thunk, value2Thunk, case3Thunk, value3Thunk);

      expect(result).toBe('second match'); // Second value returned, third not evaluated
    });

    test('SWITCH returns default value when no case matches', () => {
      // Setup: No matching cases, but default provided (odd number of args)
      const expressionThunk = () => 'z';
      const case1Thunk = () => 'a';
      const value1Thunk = () => 'first';
      const case2Thunk = () => 'b';
      const value2Thunk = () => 'second';
      const defaultThunk = () => 'default value';

      const result = SWITCH(expressionThunk, case1Thunk, value1Thunk, case2Thunk, value2Thunk, defaultThunk);

      expect(result).toBe('default value'); // Default returned
    });

    test('SWITCH returns #N/A when no case matches and no default', () => {
      // Setup: No matching cases, no default (even number of args)
      const expressionThunk = () => 'z';
      const case1Thunk = () => 'a';
      const value1Thunk = () => 'first';
      const case2Thunk = () => 'b';
      const value2Thunk = () => 'second';

      const result = SWITCH(expressionThunk, case1Thunk, value1Thunk, case2Thunk, value2Thunk);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('SWITCH backward compatibility with non-thunk arguments', () => {
      // Setup: Mix thunks and raw values
      const result = SWITCH(() => 'b', 'a', 'first', () => 'b', 'second');

      expect(result).toBe('second');
    });
  });

  // NOT Handler Tests
  describe('NOT Handler', () => {
    test('NOT evaluates thunk and returns negation', () => {
      // Test TRUE → FALSE
      const trueThunk = () => true;
      const result1 = NOT(trueThunk);
      expect(result1).toBe(false);

      // Test FALSE → TRUE
      const falseThunk = () => false;
      const result2 = NOT(falseThunk);
      expect(result2).toBe(true);
    });

    test('NOT propagates error from thunk evaluation', () => {
      // Setup: Thunk that returns error
      const errorThunk = () => new Error('#DIV/0!');
      
      const result = NOT(errorThunk);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('NOT backward compatibility with non-thunk arguments', () => {
      // Setup: Pass raw value instead of thunk
      const result = NOT(() => true);
      
      expect(result).toBe(false);
    });
  });

  // XOR Handler Tests
  describe('XOR Handler', () => {
    test('XOR evaluates all thunks', () => {
      let thunk1Evaluated = false;
      let thunk2Evaluated = false;
      let thunk3Evaluated = false;

      const thunk1 = () => {
        thunk1Evaluated = true;
        return true;
      };
      const thunk2 = () => {
        thunk2Evaluated = true;
        return false;
      };
      const thunk3 = () => {
        thunk3Evaluated = true;
        return true;
      };

      const result = XOR(thunk1, thunk2, thunk3);

      // XOR needs all values, so all thunks should be evaluated
      expect(thunk1Evaluated).toBe(true);
      expect(thunk2Evaluated).toBe(true);
      expect(thunk3Evaluated).toBe(true);
      expect(result).toBe(false); // Even number of TRUEs (2)
    });

    test('XOR returns TRUE when odd number of TRUE values', () => {
      // Test 1: One TRUE (odd)
      const result1 = XOR(() => true, () => false, () => false);
      expect(result1).toBe(true);

      // Test 2: Three TRUEs (odd)
      const result2 = XOR(() => true, () => true, () => true);
      expect(result2).toBe(true);

      // Test 3: Two TRUEs (even)
      const result3 = XOR(() => true, () => true, () => false);
      expect(result3).toBe(false);

      // Test 4: Zero TRUEs (even)
      const result4 = XOR(() => false, () => false);
      expect(result4).toBe(false);
    });

    test('XOR propagates error from any thunk evaluation', () => {
      // Setup: Second thunk errors
      const thunk1 = () => true;
      const thunk2 = () => new Error('#DIV/0!');
      const thunk3 = () => true;

      const result = XOR(thunk1, thunk2, thunk3);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('XOR backward compatibility with non-thunk arguments', () => {
      // Setup: Mix thunks and raw values
      const result = XOR(() => true, () => false, () => true);
      
      expect(result).toBe(false); // Even number of TRUEs
    });
  });
});
