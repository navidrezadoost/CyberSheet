/**
 * Phase 2's integration demo requires workbook cell writes and later editing
 * operations. Keep module import side-effect free; the host can call this
 * explicit initialization boundary to receive the R1 availability error.
 */
import { rejectR1ExampleInitialization } from './r1-initialization-gate';

export function initializePhase2IntegrationDemo(): never {
  return rejectR1ExampleInitialization(
    'Phase 2 integration demo',
    'R2 cell content/formula edits and R5 editing/metadata operations',
  );
}
