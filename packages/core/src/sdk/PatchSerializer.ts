/**
 * PatchSerializer — deterministic, stable JSON serialization for WorksheetPatch.
 *
 * Guarantees:
 *  1. Key-order stability: the same logical patch always produces the same JSON
 *     string regardless of V8 object insertion history.
 *  2. Schema validation: `deserialize` throws a typed `PatchDeserializeError`
 *     on malformed input.
 *  3. Round-trip fidelity: deserialize(serialize(p)) deep-equals p for all
 *     valid patches.
 *
 * No external dependencies — intentionally kept as a pure utility.
 */

import type { WorksheetPatch } from '../patch/WorksheetPatch';
import type { PatchOp } from '../patch/WorksheetPatch';
import { SdkError } from './errors';

/** A patch in "wire" format: seq is optional (assigned by PatchRecorder). */
export type SerializedPatch = Omit<WorksheetPatch, 'seq'> & { seq?: number };

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class PatchDeserializeError extends SdkError {
  constructor(
    message: string,
    /** The raw string that failed to parse (trimmed to 200 chars). */
    public readonly input: string,
  ) {
    super(`PatchDeserializeError: ${message}`, 'DESERIALIZE_FAILED');
    this.name = 'PatchDeserializeError';
  }
}

// ---------------------------------------------------------------------------
// Internal key ordering
// ---------------------------------------------------------------------------

/**
 * Canonical key order for the top-level WorksheetPatch object.
 * Keys NOT in this list are appended in their natural order.
 */
const PATCH_TOP_KEYS: readonly string[] = ['seq', 'ops'];

/**
 * Canonical key order per op `op` discriminant.
 * This ensures setCellValueOp always serializes as { op, row, col, before, after }
 * regardless of how the object was constructed.
 */
const OP_KEY_ORDER: Record<string, readonly string[]> = {
  setCellValue: ['op', 'row', 'col', 'before', 'after'],
  clearCell:    ['op', 'row', 'col', 'before'],
  setCellStyle: ['op', 'row', 'col', 'before', 'after'],
  mergeCells:   ['op', 'startRow', 'startCol', 'endRow', 'endCol'],
  cancelMerge:  ['op', 'startRow', 'startCol', 'endRow', 'endCol'],
  hideRow:      ['op', 'row'],
  showRow:      ['op', 'row'],
  hideCol:      ['op', 'col'],
  showCol:      ['op', 'col'],
};

/**
 * JSON.stringify replacer that enforces stable key order.
 * Returns an object whose own-enumerable property order matches
 * the canonical lists above.
 */
function stableReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;

  // Top-level patch object
  if (typeof obj['ops'] !== 'undefined' || typeof obj['seq'] !== 'undefined') {
    const ordered: Record<string, unknown> = {};
    for (const k of PATCH_TOP_KEYS) {
      if (k in obj) ordered[k] = obj[k];
    }
    for (const k of Object.keys(obj)) {
      if (!(k in ordered)) ordered[k] = obj[k];
    }
    return ordered;
  }

  // Op object
  if (typeof obj['op'] === 'string') {
    const opName = obj['op'] as string;
    const keyOrder = OP_KEY_ORDER[opName];
    if (keyOrder) {
      const ordered: Record<string, unknown> = {};
      for (const k of keyOrder) {
        if (k in obj) ordered[k] = obj[k];
      }
      for (const k of Object.keys(obj)) {
        if (!(k in ordered)) ordered[k] = obj[k];
      }
      return ordered;
    }
  }

  return value;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_OPS = new Set(Object.keys(OP_KEY_ORDER));

function validateOp(op: unknown, index: number): asserts op is PatchOp {
  if (op === null || typeof op !== 'object' || Array.isArray(op)) {
    throw new TypeError(`ops[${index}] is not an object`);
  }
  const o = op as Record<string, unknown>;
  if (typeof o['op'] !== 'string') {
    throw new TypeError(`ops[${index}].op is not a string`);
  }
  if (!VALID_OPS.has(o['op'])) {
    throw new TypeError(`ops[${index}].op "${o['op']}" is not a valid PatchOp discriminant`);
  }
  // Row/col must be positive safe integers (1-based) where present
  for (const numKey of ['row', 'col', 'startRow', 'startCol', 'endRow', 'endCol']) {
    if (numKey in o) {
      const v = o[numKey];
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1) {
        throw new TypeError(`ops[${index}].${numKey} must be a positive safe integer (1-based)`);
      }
    }
  }
}

function validatePatch(parsed: unknown): asserts parsed is WorksheetPatch {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('patch root must be a non-null object');
  }
  const p = parsed as Record<string, unknown>;
  if (!Array.isArray(p['ops'])) {
    throw new TypeError('patch.ops must be an array');
  }
  // seq is optional in the serialized form (automatically assigned by PatchRecorder)
  if ('seq' in p && p['seq'] !== undefined && typeof p['seq'] !== 'number') {
    throw new TypeError('patch.seq must be a number when present');
  }
  for (let i = 0; i < p['ops'].length; i++) {
    validateOp(p['ops'][i], i);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class PatchSerializer {
  /**
   * Serialize a `WorksheetPatch` (or `SerializedPatch`) to a deterministic JSON string.
   * Key order is canonical regardless of object construction history.
   */
  static serialize(patch: WorksheetPatch | SerializedPatch): string {
    return JSON.stringify(patch, stableReplacer);
  }

  /**
   * Deserialize a JSON string to a `WorksheetPatch`.
   * `seq` defaults to 0 if absent.
   * Throws `PatchDeserializeError` if the input is invalid JSON or fails
   * schema validation.
   */
  static deserialize(json: string): WorksheetPatch {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new PatchDeserializeError(
        'invalid JSON',
        json.slice(0, 200),
      );
    }
    try {
      validatePatch(parsed);
    } catch (err) {
      throw new PatchDeserializeError(
        (err as Error).message,
        json.slice(0, 200),
      );
    }
    const p = parsed as Record<string, unknown>;
    // Ensure seq is always a number (0 when absent)
    if (typeof p['seq'] !== 'number') p['seq'] = 0;
    return p as unknown as WorksheetPatch;
  }

  /**
   * Type guard — returns `true` if `value` is a structurally valid `WorksheetPatch`
   * (or `SerializedPatch`). Does not throw; use `deserialize` when you want error details.
   */
  static validate(value: unknown): value is SerializedPatch {
    try {
      validatePatch(value);
      return true;
    } catch {
      return false;
    }
  }
}
