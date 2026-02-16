/**
 * exotic-metadata.ts
 * 
 * Strict Metadata for Exotic Functions
 * 
 * Functions: FORMULATEXT, SHEET, SHEETS, GETPIVOTDATA, CUBE* functions
 * These are specialized Excel functions for complete parity.
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata
} from '../../types/formula-types';
import * as ExoticFunctions from '../exotic';

/**
 * Exotic Category: Strict Metadata
 * 
 * Total Functions: 10
 * - FORMULATEXT, SHEET, SHEETS: Worksheet inspection
 * - GETPIVOTDATA: Pivot table queries
 * - CUBE*: OLAP cube functions (stubs)
 */

export const EXOTIC_METADATA: StrictFunctionMetadata[] = [
  // ============================================================================
  // WORKSHEET INSPECTION FUNCTIONS
  // ============================================================================
  
  {
    name: 'FORMULATEXT',
    handler: ExoticFunctions.FORMULATEXT,
    category: FunctionCategory.INFORMATION,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: true,  // Needs worksheet context
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SHEET',
    handler: ExoticFunctions.SHEET,
    category: FunctionCategory.INFORMATION,
    minArgs: 0,
    maxArgs: 1,
    isSpecial: false,
    needsContext: true,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SHEETS',
    handler: ExoticFunctions.SHEETS,
    category: FunctionCategory.INFORMATION,
    minArgs: 0,
    maxArgs: 1,
    isSpecial: false,
    needsContext: true,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // PIVOT TABLE FUNCTIONS
  // ============================================================================
  
  {
    name: 'GETPIVOTDATA',
    handler: ExoticFunctions.GETPIVOTDATA,
    category: FunctionCategory.LOOKUP,
    minArgs: 2,
    maxArgs: 126, // data_field, pivot_table, then up to 62 field/item pairs
    isSpecial: false,
    needsContext: true,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // CUBE FUNCTIONS (OLAP)
  // ============================================================================
  
  {
    name: 'CUBEMEMBER',
    handler: ExoticFunctions.CUBEMEMBER,
    category: FunctionCategory.CUBE,
    minArgs: 2,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CUBESET',
    handler: ExoticFunctions.CUBESET,
    category: FunctionCategory.CUBE,
    minArgs: 2,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CUBEVALUE',
    handler: ExoticFunctions.CUBEVALUE,
    category: FunctionCategory.CUBE,
    minArgs: 1,
    maxArgs: 254,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CUBERANKEDMEMBER',
    handler: ExoticFunctions.CUBERANKEDMEMBER,
    category: FunctionCategory.CUBE,
    minArgs: 3,
    maxArgs: 4,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CUBEKPIMEMBER',
    handler: ExoticFunctions.CUBEKPIMEMBER,
    category: FunctionCategory.CUBE,
    minArgs: 3,
    maxArgs: 4,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CUBEMEMBERPROPERTY',
    handler: ExoticFunctions.CUBEMEMBERPROPERTY,
    category: FunctionCategory.CUBE,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CUBESETCOUNT',
    handler: ExoticFunctions.CUBESETCOUNT,
    category: FunctionCategory.CUBE,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
];
