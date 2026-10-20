/**
 * Phase 3's integration demo requires workbook writes, pivot operations, and
 * staged import/restore. Keep module import side-effect free; the host can call
 * this explicit initialization boundary to receive the R1 availability error.
 */
import { rejectR1ExampleInitialization } from './r1-initialization-gate';

export function initializePhase3IntegrationDemo(): never {
  return rejectR1ExampleInitialization(
    'Phase 3 integration demo',
    'R2 initial content, R5 pivot operations, and R6 import/restore',
  );
}
