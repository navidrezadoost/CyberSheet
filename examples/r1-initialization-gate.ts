/** R1 checkpoint gate for examples requiring data writes or later-slice APIs. */
export function rejectR1ExampleInitialization(example: string, requiredSlices: string): never {
  throw new Error(
    `${example} is unavailable at the R1 checkpoint: initialization requires ${requiredSlices}. No workbook was created or published.`,
  );
}
