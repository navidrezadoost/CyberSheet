/**
 * ReviewCommands.ts
 *
 * Command implementations for Review tab operations:
 * - Comments (add, delete, navigate, show/hide)
 * - Protection (protect sheet, protect workbook)
 * - Proofing (spell check results)
 *
 * All commands implement the Command interface for undo/redo support.
 */

import type { Command } from '../CommandManager';
import type { Workbook } from '../workbook';
import type { Worksheet } from '../worksheet';
import type { Address } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  cell: Address;
  author: string;
  text: string;
  timestamp: Date;
  resolved?: boolean;
}

export interface SheetProtection {
  password?: string;
  allowSelectLockedCells: boolean;
  allowSelectUnlockedCells: boolean;
  allowFormatCells: boolean;
  allowFormatColumns: boolean;
  allowFormatRows: boolean;
  allowInsertColumns: boolean;
  allowInsertRows: boolean;
  allowDeleteColumns: boolean;
  allowDeleteRows: boolean;
}

export interface WorkbookProtection {
  password?: string;
  protectStructure: boolean;
  protectWindows: boolean;
}

// ─── Comment Commands ──────────────────────────────────────────────────────

/**
 * AddCommentCommand: Add comment to a cell
 *
 * Creates a comment attached to the specified cell.
 */
export class AddCommentCommand implements Command {
  description = 'Add Comment';

  private comment: Comment;

  constructor(
    private worksheet: Worksheet,
    private cell: Address,
    private text: string,
    private author: string = 'User'
  ) {
    this.comment = {
      id: `comment_${Date.now()}_${Math.random()}`,
      cell: this.cell,
      author: this.author,
      text: this.text,
      timestamp: new Date(),
      resolved: false,
    };
  }

  execute(): void {
    // Ensure comments storage exists
    if (!(this.worksheet as any).comments) {
      (this.worksheet as any).comments = new Map<string, Comment>();
    }

    const comments = (this.worksheet as any).comments as Map<string, Comment>;
    const key = `${this.cell.row},${this.cell.col}`;

    comments.set(key, this.comment);
    console.log(`Added comment at (${this.cell.row}, ${this.cell.col}):`, this.text);
  }

  undo(): void {
    const comments = (this.worksheet as any).comments as Map<string, Comment>;
    if (comments) {
      const key = `${this.cell.row},${this.cell.col}`;
      comments.delete(key);
      console.log(`Removed comment at (${this.cell.row}, ${this.cell.col})`);
    }
  }
}

/**
 * DeleteCommentCommand: Remove comment from a cell
 *
 * Stores deleted comment for undo.
 */
export class DeleteCommentCommand implements Command {
  description = 'Delete Comment';

  private deletedComment: Comment | undefined;

  constructor(
    private worksheet: Worksheet,
    private cell: Address
  ) {}

  execute(): void {
    const comments = (this.worksheet as any).comments as Map<string, Comment> | undefined;
    if (!comments) return;

    const key = `${this.cell.row},${this.cell.col}`;
    this.deletedComment = comments.get(key);

    if (this.deletedComment) {
      comments.delete(key);
      console.log(`Deleted comment at (${this.cell.row}, ${this.cell.col})`);
    }
  }

  undo(): void {
    if (this.deletedComment) {
      if (!(this.worksheet as any).comments) {
        (this.worksheet as any).comments = new Map<string, Comment>();
      }

      const comments = (this.worksheet as any).comments as Map<string, Comment>;
      const key = `${this.cell.row},${this.cell.col}`;
      comments.set(key, this.deletedComment);

      console.log('Restored deleted comment');
    }
  }
}

/**
 * ToggleCommentsVisibilityCommand: Show/hide all comments
 *
 * Controls whether comments are visible or just indicators shown.
 */
export class ToggleCommentsVisibilityCommand implements Command {
  description = 'Toggle Comments Visibility';

  private previousMode: 'show' | 'hide' | 'indicator';

  constructor(
    private worksheet: Worksheet,
    private mode: 'show' | 'hide' | 'indicator'
  ) {
    this.previousMode = this.getCurrentMode();
  }

  execute(): void {
    (this.worksheet as any).commentsVisibility = this.mode;
    console.log(`Comments visibility: ${this.mode}`);
  }

  undo(): void {
    (this.worksheet as any).commentsVisibility = this.previousMode;
    console.log(`Restored comments visibility: ${this.previousMode}`);
  }

  private getCurrentMode(): 'show' | 'hide' | 'indicator' {
    return (this.worksheet as any).commentsVisibility || 'indicator';
  }
}

// ─── Protection Commands ───────────────────────────────────────────────────

/**
 * ProtectSheetCommand: Protect worksheet with password and permissions
 *
 * Restricts operations based on protection settings.
 */
export class ProtectSheetCommand implements Command {
  description = 'Protect Sheet';

  private previousProtection: SheetProtection | undefined;

  constructor(
    private worksheet: Worksheet,
    private protection: SheetProtection
  ) {
    this.previousProtection = (this.worksheet as any).protection;
  }

  execute(): void {
    (this.worksheet as any).protection = { ...this.protection };
    (this.worksheet as any).isProtected = true;

    console.log('Sheet protected with settings:', this.protection);
  }

  undo(): void {
    if (this.previousProtection) {
      (this.worksheet as any).protection = this.previousProtection;
      (this.worksheet as any).isProtected = true;
    } else {
      (this.worksheet as any).protection = undefined;
      (this.worksheet as any).isProtected = false;
    }

    console.log('Restored previous sheet protection');
  }
}

/**
 * UnprotectSheetCommand: Remove sheet protection
 *
 * Requires password if sheet is password-protected.
 */
export class UnprotectSheetCommand implements Command {
  description = 'Unprotect Sheet';

  private previousProtection: SheetProtection | undefined;

  constructor(
    private worksheet: Worksheet,
    private password?: string
  ) {
    this.previousProtection = (this.worksheet as any).protection;
  }

  execute(): void {
    const protection = (this.worksheet as any).protection as SheetProtection | undefined;

    // Check password if sheet is protected
    if (protection && protection.password && protection.password !== this.password) {
      console.error('Incorrect password');
      throw new Error('Incorrect password');
    }

    (this.worksheet as any).protection = undefined;
    (this.worksheet as any).isProtected = false;

    console.log('Sheet unprotected');
  }

  undo(): void {
    if (this.previousProtection) {
      (this.worksheet as any).protection = this.previousProtection;
      (this.worksheet as any).isProtected = true;
      console.log('Restored sheet protection');
    }
  }
}

/**
 * ProtectWorkbookCommand: Protect workbook structure/windows
 *
 * Prevents adding/deleting/renaming sheets, and optionally locks window positions.
 */
export class ProtectWorkbookCommand implements Command {
  description = 'Protect Workbook';

  private previousProtection: WorkbookProtection | undefined;

  constructor(
    private workbook: Workbook,
    private protection: WorkbookProtection
  ) {
    this.previousProtection = (this.workbook as any).protection;
  }

  execute(): void {
    (this.workbook as any).protection = { ...this.protection };
    (this.workbook as any).isProtected = true;

    console.log('Workbook protected with settings:', this.protection);
  }

  undo(): void {
    if (this.previousProtection) {
      (this.workbook as any).protection = this.previousProtection;
      (this.workbook as any).isProtected = true;
    } else {
      (this.workbook as any).protection = undefined;
      (this.workbook as any).isProtected = false;
    }

    console.log('Restored previous workbook protection');
  }
}

/**
 * UnprotectWorkbookCommand: Remove workbook protection
 *
 * Requires password if workbook is password-protected.
 */
export class UnprotectWorkbookCommand implements Command {
  description = 'Unprotect Workbook';

  private previousProtection: WorkbookProtection | undefined;

  constructor(
    private workbook: Workbook,
    private password?: string
  ) {
    this.previousProtection = (this.workbook as any).protection;
  }

  execute(): void {
    const protection = (this.workbook as any).protection as WorkbookProtection | undefined;

    // Check password if workbook is protected
    if (protection && protection.password && protection.password !== this.password) {
      console.error('Incorrect password');
      throw new Error('Incorrect password');
    }

    (this.workbook as any).protection = undefined;
    (this.workbook as any).isProtected = false;

    console.log('Workbook unprotected');
  }

  undo(): void {
    if (this.previousProtection) {
      (this.workbook as any).protection = this.previousProtection;
      (this.workbook as any).isProtected = true;
      console.log('Restored workbook protection');
    }
  }
}

// ─── Allow Edit Ranges Command ─────────────────────────────────────────────

export interface AllowEditRange {
  id: string;
  name: string;
  range: { start: Address; end: Address };
  password?: string;
  users?: string[];
}

/**
 * SetAllowEditRangeCommand: Define ranges users can edit when sheet is protected
 *
 * Allows specific ranges to be edited even when sheet is locked.
 */
export class SetAllowEditRangeCommand implements Command {
  description = 'Set Allow Edit Range';

  private previousRanges: AllowEditRange[] | undefined;

  constructor(
    private worksheet: Worksheet,
    private range: AllowEditRange
  ) {
    const ranges = (this.worksheet as any).allowEditRanges as AllowEditRange[] | undefined;
    this.previousRanges = ranges ? [...ranges] : undefined;
  }

  execute(): void {
    if (!(this.worksheet as any).allowEditRanges) {
      (this.worksheet as any).allowEditRanges = [];
    }

    const ranges = (this.worksheet as any).allowEditRanges as AllowEditRange[];
    ranges.push({ ...this.range });

    console.log(`Added allow edit range: ${this.range.name}`);
  }

  undo(): void {
    if (this.previousRanges) {
      (this.worksheet as any).allowEditRanges = [...this.previousRanges];
    } else {
      (this.worksheet as any).allowEditRanges = [];
    }

    console.log('Restored previous allow edit ranges');
  }
}

/**
 * RemoveAllowEditRangeCommand: Remove an allowed edit range
 */
export class RemoveAllowEditRangeCommand implements Command {
  description = 'Remove Allow Edit Range';

  private previousRanges: AllowEditRange[] | undefined;

  constructor(
    private worksheet: Worksheet,
    private rangeId: string
  ) {
    const ranges = (this.worksheet as any).allowEditRanges as AllowEditRange[] | undefined;
    this.previousRanges = ranges ? [...ranges] : undefined;
  }

  execute(): void {
    const ranges = (this.worksheet as any).allowEditRanges as AllowEditRange[] | undefined;
    if (!ranges) return;

    const index = ranges.findIndex(r => r.id === this.rangeId);
    if (index >= 0) {
      ranges.splice(index, 1);
      console.log(`Removed allow edit range: ${this.rangeId}`);
    }
  }

  undo(): void {
    if (this.previousRanges) {
      (this.worksheet as any).allowEditRanges = [...this.previousRanges];
      console.log('Restored previous allow edit ranges');
    }
  }
}

// ─── Proofing Commands ─────────────────────────────────────────────────────

/**
 * SpellCheckCommand: Store spell check corrections
 *
 * Not a traditional command, but tracks corrections for undo/redo.
 */
export class SpellCheckCommand implements Command {
  description = 'Spell Check Correction';

  private corrections: Map<string, { original: string; corrected: string }>;

  constructor(
    private worksheet: Worksheet,
    corrections: Array<{ cell: Address; original: string; corrected: string }>
  ) {
    this.corrections = new Map();
    for (const correction of corrections) {
      const key = `${correction.cell.row},${correction.cell.col}`;
      this.corrections.set(key, {
        original: correction.original,
        corrected: correction.corrected,
      });
    }
  }

  execute(): void {
    for (const [key, correction] of this.corrections) {
      const [row, col] = key.split(',').map(Number);
      this.worksheet.setCellValue({ row, col }, correction.corrected);
    }

    console.log(`Applied ${this.corrections.size} spelling corrections`);
  }

  undo(): void {
    for (const [key, correction] of this.corrections) {
      const [row, col] = key.split(',').map(Number);
      this.worksheet.setCellValue({ row, col }, correction.original);
    }

    console.log(`Reverted ${this.corrections.size} spelling corrections`);
  }
}

// ─── Track Changes Commands ────────────────────────────────────────────────

export interface TrackedChange {
  id: string;
  author: string;
  timestamp: Date;
  type: 'cellValue' | 'cellStyle' | 'insertRow' | 'deleteRow' | 'insertColumn' | 'deleteColumn';
  address?: Address;
  oldValue?: any;
  newValue?: any;
  accepted?: boolean;
  rejected?: boolean;
}

/**
 * ToggleTrackChangesCommand: Enable/disable change tracking
 *
 * Starts recording all changes made to the workbook.
 */
export class ToggleTrackChangesCommand implements Command {
  description = 'Toggle Track Changes';

  private previousState: boolean;

  constructor(
    private workbook: Workbook,
    private enabled: boolean
  ) {
    this.previousState = (this.workbook as any).trackChangesEnabled || false;
  }

  execute(): void {
    (this.workbook as any).trackChangesEnabled = this.enabled;

    if (this.enabled) {
      if (!(this.workbook as any).trackedChanges) {
        (this.workbook as any).trackedChanges = [];
      }
      console.log('Track Changes enabled');
    } else {
      console.log('Track Changes disabled');
    }
  }

  undo(): void {
    (this.workbook as any).trackChangesEnabled = this.previousState;
    console.log(`Restored Track Changes: ${this.previousState ? 'ON' : 'OFF'}`);
  }
}

/**
 * AcceptChangeCommand: Accept a tracked change
 */
export class AcceptChangeCommand implements Command {
  description = 'Accept Change';

  private change: TrackedChange | undefined;

  constructor(
    private workbook: Workbook,
    private changeId: string
  ) {}

  execute(): void {
    const changes = (this.workbook as any).trackedChanges as TrackedChange[] | undefined;
    if (!changes) return;

    this.change = changes.find(c => c.id === this.changeId);
    if (this.change) {
      this.change.accepted = true;
      this.change.rejected = false;
      console.log(`Accepted change: ${this.changeId}`);
    }
  }

  undo(): void {
    if (this.change) {
      this.change.accepted = false;
      console.log(`Undid accept of change: ${this.changeId}`);
    }
  }
}

/**
 * RejectChangeCommand: Reject a tracked change
 */
export class RejectChangeCommand implements Command {
  description = 'Reject Change';

  private change: TrackedChange | undefined;

  constructor(
    private workbook: Workbook,
    private changeId: string
  ) {}

  execute(): void {
    const changes = (this.workbook as any).trackedChanges as TrackedChange[] | undefined;
    if (!changes) return;

    this.change = changes.find(c => c.id === this.changeId);
    if (this.change) {
      this.change.rejected = true;
      this.change.accepted = false;
      console.log(`Rejected change: ${this.changeId}`);
    }
  }

  undo(): void {
    if (this.change) {
      this.change.rejected = false;
      console.log(`Undid reject of change: ${this.changeId}`);
    }
  }
}
