/**
 * exotic-functions.ts
 * 
 * Exotic and specialized Excel functions for complete parity.
 * Week 4 Extension: FORMULATEXT, SHEET, SHEETS, GETPIVOTDATA, CUBE functions
 * 
 * These are less commonly used but important for full Excel compatibility.
 */

import type { ContextAwareFormulaFunction, FormulaFunction, FormulaContext } from '../../types/formula-types';

/**
 * FORMULATEXT - Returns the formula at the given reference as text
 * 
 * Syntax: FORMULATEXT(reference)
 * Returns the formula as a text string, or #N/A if cell doesn't contain a formula
 * 
 * @example
 * If A1 contains =SUM(B1:B10)
 * =FORMULATEXT(A1) → "=SUM(B1:B10)"
 * 
 * If A1 contains just 42
 * =FORMULATEXT(A1) → #N/A
 */
export const FORMULATEXT: ContextAwareFormulaFunction = (context: FormulaContext, reference: any) => {
  if (!context || !context.worksheet) {
    return new Error('#N/A');
  }

  // Extract cell address from reference
  if (typeof reference === 'object' && reference !== null && 'row' in reference && 'col' in reference) {
    const cell = context.worksheet.getCell(reference);
    
    if (!cell) {
      return new Error('#N/A');
    }
    
    // Check if the cell has a formula in the formula property
    if (cell.formula && typeof cell.formula === 'string') {
      return cell.formula;
    }
    
    // Fall back to checking if value is a formula string (starts with '=')
    if (typeof cell.value === 'string' && cell.value.startsWith('=')) {
      return cell.value;
    }
    
    // Cell doesn't contain a formula
    return new Error('#N/A');
  }

  return new Error('#N/A');
};

/**
 * SHEET - Returns the sheet number of the referenced sheet
 * 
 * Syntax: SHEET([value])
 * - If no argument: returns the sheet number of the current sheet
 * - If reference: returns the sheet number of that reference
 * - If text: returns the sheet number of the sheet with that name
 * 
 * @example
 * =SHEET() → 1 (current sheet)
 * =SHEET(Sheet2!A1) → 2
 * =SHEET("Sheet3") → 3
 */
export const SHEET: ContextAwareFormulaFunction = (context: FormulaContext, value?: any) => {
  if (!context || !context.worksheet) {
    return 1; // Default to sheet 1
  }

  // If no argument, return current sheet number
  if (value === undefined) {
    // In our implementation, we don't track sheet numbers
    // Return 1 for compatibility
    return 1;
  }

  // If it's a string (sheet name), try to find the sheet
  if (typeof value === 'string') {
    // In a full implementation, we'd look up the sheet by name
    // For now, return 1 for the current sheet
    if (value === context.worksheet.name) {
      return 1;
    }
    return new Error('#REF!'); // Sheet not found
  }

  // If it's a reference with a sheet property
  if (typeof value === 'object' && value !== null && 'sheet' in value) {
    return value.sheet || 1;
  }

  // Default: return 1
  return 1;
};

/**
 * SHEETS - Returns the number of sheets in a reference
 * 
 * Syntax: SHEETS([reference])
 * - If no argument: returns total number of sheets in workbook
 * - If reference: returns number of sheets in the reference
 * 
 * @example
 * =SHEETS() → 3 (if workbook has 3 sheets)
 * =SHEETS(Sheet1:Sheet3!A1) → 3
 */
export const SHEETS: ContextAwareFormulaFunction = (context: FormulaContext, reference?: any) => {
  // In our implementation, we typically have 1 sheet
  // In a full workbook implementation, this would count actual sheets
  
  if (reference === undefined) {
    // Return total number of sheets in workbook
    // For now, return 1 (single sheet)
    return 1;
  }

  // If reference spans multiple sheets, count them
  if (typeof reference === 'object' && reference !== null && 'sheetCount' in reference) {
    return reference.sheetCount;
  }

  // Default: 1 sheet
  return 1;
};

/**
 * GETPIVOTDATA - Extracts data from a pivot table
 * 
 * Phase 32: Full pivot integration with auto-recompute support.
 * 
 * Syntax: GETPIVOTDATA(data_field, pivot_table, [field1, item1], ...)
 * Returns data from a pivot table based on the structure
 * 
 * Implementation:
 * 1. Resolve pivot ID from anchor cell (pivot_table reference)
 * 2. Build filter object from field/item pairs
 * 3. Delegate to GetPivotData.query() (Phase 29b/31a)
 * 4. Map pivot errors to formula errors
 * 
 * Error codes:
 * - #REF!: Pivot not found at reference, or field not found
 * - #CALC!: Pivot rebuild failed (dirty state)
 * - #N/A: No matching data
 * - #VALUE!: Multiple matches (ambiguous)
 * 
 * @example
 * =GETPIVOTDATA("Sales", A1, "Region", "East") → sum of sales for East region
 * =GETPIVOTDATA("Revenue", $B$5) → grand total revenue
 */
export const GETPIVOTDATA: ContextAwareFormulaFunction = (context: FormulaContext, ...args: any[]) => {
  if (args.length < 2) {
    return new Error('#VALUE!'); // Insufficient arguments
  }

  const [dataField, pivotRef, ...fieldItemPairs] = args;

  // Validate value field is a string
  if (typeof dataField !== 'string') {
    return new Error('#VALUE!'); // Value field must be string
  }

  // Parse pivot reference
  let pivotAddress: { row: number; col: number } | null = null;

  if (typeof pivotRef === 'object' && pivotRef !== null && 'row' in pivotRef && 'col' in pivotRef) {
    // Direct address object
    pivotAddress = pivotRef;
  } else if (typeof pivotRef === 'string') {
    // String reference like "A1" - would need A1 notation parser
    // For now, return #REF! (not implemented)
    return new Error('#REF!');
  } else {
    return new Error('#VALUE!'); // Invalid pivot reference
  }

  // Get workbook from context (via worksheet)
  const worksheet = context.worksheet;
  if (!worksheet || !(worksheet as any).workbook) {
    return new Error('#REF!'); // No workbook context
  }

  const workbook = (worksheet as any).workbook;

  // Resolve pivot ID from anchor cell on current sheet
  // Phase 32 patch: Pass worksheet name as sheetId for cross-sheet safety
  const pivotId = workbook.resolvePivotAt(pivotAddress, worksheet.name);
  if (!pivotId) {
    return new Error('#REF!'); // No pivot at reference
  }

  // Build filters from field/item pairs
  const filters: Array<{ field: string; value: any }> = [];
  for (let i = 0; i < fieldItemPairs.length; i += 2) {
    if (i + 1 >= fieldItemPairs.length) {
      return new Error('#VALUE!'); // Odd number of filter args (missing value)
    }

    const field = fieldItemPairs[i];
    const value = fieldItemPairs[i + 1];

    if (typeof field !== 'string') {
      return new Error('#VALUE!'); // Field name must be string
    }

    filters.push({ field, value });
  }

  // Get GetPivotData query engine from workbook
  const registry = workbook.getPivotRegistry();
  const snapshotStore = workbook.getPivotSnapshotStore();
  const recomputeEngine = workbook.getPivotRecomputeEngine();

  // Import GetPivotData class dynamically (to avoid circular dependency)
  const { GetPivotData } = require('../../GetPivotData');
  const queryEngine = new GetPivotData(registry, snapshotStore, recomputeEngine);

  // Execute query (Phase 31a: ensureFresh happens here)
  const result = queryEngine.query(pivotId, dataField, filters);

  // Map pivot errors to formula errors
  if (result === '#REF!') {
    return new Error('#REF!'); // Pivot/field not found
  }
  if (result === '#CALC!') {
    return new Error('#CALC!'); // Rebuild failed
  }
  if (result === '#N/A') {
    return new Error('#N/A'); // No matching data
  }
  if (result === '#VALUE!') {
    return new Error('#VALUE!'); // Multiple matches
  }

  // Return value
  return result;
};

// ============================================================================
// CUBE Functions - For OLAP/Cube data sources
// ============================================================================

/**
 * CUBEMEMBER - Returns a member or tuple from the cube hierarchy
 * 
 * Syntax: CUBEMEMBER(connection, member_expression, [caption])
 * 
 * Note: Cube functions require an external data connection to an OLAP cube.
 * This is a stub implementation that returns #N/A since we don't have a cube provider.
 * 
 * To implement: Create a CubeProvider interface and inject it into the formula engine.
 * 
 * @example
 * =CUBEMEMBER("SalesCube", "[Time].[Year].[2024]") → would return member reference
 */
export const CUBEMEMBER: FormulaFunction = (connection: any, memberExpression: any, caption?: any) => {
  // Cube functions require an external OLAP cube connection
  // This is a placeholder implementation
  
  if (typeof connection !== 'string' || typeof memberExpression !== 'string') {
    return new Error('#VALUE!');
  }

  // In a real implementation:
  // 1. Connect to the OLAP cube using the connection string
  // 2. Query the cube for the member at memberExpression
  // 3. Return a member reference object
  // 4. Use caption if provided for display

  // For now, return #N/A to indicate cube data not available
  return new Error('#N/A');
};

/**
 * CUBESET - Defines a calculated set of members or tuples
 * 
 * Syntax: CUBESET(connection, set_expression, [caption], [sort_order], [sort_by])
 * 
 * Note: Requires OLAP cube connection. Stub implementation.
 * 
 * @example
 * =CUBESET("SalesCube", "[Product].[Category].Members", "All Categories")
 */
export const CUBESET: FormulaFunction = (
  connection: any,
  setExpression: any,
  caption?: any,
  sortOrder?: any,
  sortBy?: any
) => {
  if (typeof connection !== 'string' || typeof setExpression !== 'string') {
    return new Error('#VALUE!');
  }

  // In a real implementation:
  // 1. Connect to OLAP cube
  // 2. Evaluate set_expression (MDX query)
  // 3. Return set of members
  // 4. Apply sorting if specified

  return new Error('#N/A');
};

/**
 * CUBEVALUE - Returns an aggregated value from a cube
 * 
 * Syntax: CUBEVALUE(connection, [member_expression1], [member_expression2], ...)
 * 
 * Note: Requires OLAP cube connection. Stub implementation.
 * 
 * @example
 * =CUBEVALUE("SalesCube", "[Time].[2024]", "[Product].[Bikes]", "[Measures].[Sales]")
 * → would return sales value for Bikes in 2024
 */
export const CUBEVALUE: FormulaFunction = (connection: any, ...memberExpressions: any[]) => {
  if (typeof connection !== 'string') {
    return new Error('#VALUE!');
  }

  // In a real implementation:
  // 1. Connect to OLAP cube
  // 2. Query cube with member expressions (defines coordinates in cube)
  // 3. Return aggregated measure value
  // 4. Handle #N/A if data not available

  return new Error('#N/A');
};

/**
 * CUBERANKEDMEMBER - Returns the nth ranked member in a set
 * 
 * Syntax: CUBERANKEDMEMBER(connection, set_expression, rank, [caption])
 * 
 * @example
 * =CUBERANKEDMEMBER("SalesCube", "[Product].[Top10]", 1) → returns #1 ranked product
 */
export const CUBERANKEDMEMBER: FormulaFunction = (
  connection: any,
  setExpression: any,
  rank: any,
  caption?: any
) => {
  if (typeof connection !== 'string' || typeof rank !== 'number') {
    return new Error('#VALUE!');
  }

  return new Error('#N/A');
};

/**
 * CUBEKPIMEMBER - Returns a KPI property from a cube
 * 
 * Syntax: CUBEKPIMEMBER(connection, kpi_name, kpi_property, [caption])
 * 
 * KPI properties: "Value", "Goal", "Status", "Trend", "Weight"
 */
export const CUBEKPIMEMBER: FormulaFunction = (
  connection: any,
  kpiName: any,
  kpiProperty: any,
  caption?: any
) => {
  if (typeof connection !== 'string' || typeof kpiName !== 'string') {
    return new Error('#VALUE!');
  }

  return new Error('#N/A');
};

/**
 * CUBEMEMBERPROPERTY - Returns a member property value from the cube
 * 
 * Syntax: CUBEMEMBERPROPERTY(connection, member_expression, property)
 */
export const CUBEMEMBERPROPERTY: FormulaFunction = (
  connection: any,
  memberExpression: any,
  property: any
) => {
  if (typeof connection !== 'string') {
    return new Error('#VALUE!');
  }

  return new Error('#N/A');
};

/**
 * CUBESETCOUNT - Returns the number of items in a set
 * 
 * Syntax: CUBESETCOUNT(set)
 */
export const CUBESETCOUNT: FormulaFunction = (set: any) => {
  // Would count members in a cube set
  return new Error('#N/A');
};
