/**
 * CyberSheetComponent.ts
 * 
 * Angular component for Cyber Sheet
 */

import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CyberSheetService } from './internal';
import type { WorkbookSheetView, CollaborationEngine } from '@cyber-sheet/core';
import type { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

@Component({
  selector: 'cyber-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #container [ngStyle]="containerStyle"></div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
    }
  `]
})
export class CyberSheetComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() data?: any[][];
  @Input() enableFormulas = false;
  @Input() enableCollaboration = false;
  @Input() collaborationUrl?: string;
  @Input() width: number | string = '100%';
  @Input() height: number | string = 600;

  @Output() cellChange = new EventEmitter<{ row: number; col: number; value: any }>();
  @Output() selectionChange = new EventEmitter<{ start: { row: number; col: number }; end: { row: number; col: number } }>();

  worksheet: WorkbookSheetView | null = null;
  renderer: CanvasRenderer | null = null;
  collaboration: CollaborationEngine | null = null;

  private cellChangeHandler: EventListener | null = null;

  constructor(private cyberSheetService: CyberSheetService) {}

  get containerStyle() {
    return {
      width: typeof this.width === 'number' ? `${this.width}px` : this.width,
      height: typeof this.height === 'number' ? `${this.height}px` : this.height,
      position: 'relative',
      overflow: 'hidden'
    };
  }

  async ngOnInit() {
    const container = this.containerRef.nativeElement;

    const { worksheet, renderer, formulaEngine, collaboration } =
      await this.cyberSheetService.createRenderer(container, {
        data: this.data,
        enableFormulas: this.enableFormulas,
        enableCollaboration: this.enableCollaboration,
        collaborationUrl: this.collaborationUrl
      });

    this.worksheet = worksheet;
    this.renderer = renderer;
    this.collaboration = collaboration || null;

    // Handle cell changes
    this.cellChangeHandler = ((e: CustomEvent) => {
      const { row, col, value } = e.detail;
      this.cellChange.emit({ row, col, value });
    }) as EventListener;

    document.addEventListener('cyber-sheet-cell-change', this.cellChangeHandler);
  }

  ngOnDestroy() {
    this.collaboration?.disconnect();
    if (this.cellChangeHandler) {
      document.removeEventListener('cyber-sheet-cell-change', this.cellChangeHandler);
    }
  }

  setCell(row: number, col: number, value: any) {
    if (!this.worksheet) return;
    void row; void col; void value;
    throw new Error('Workbook cell writes are unavailable until the R2 journal slice is authorized');
  }

  getCell(row: number, col: number) {
    if (!this.worksheet) return null;
    return this.worksheet.getCell({ row, col })?.value;
  }

  refresh() {
    if (this.renderer && this.containerRef) {
      this.containerRef.nativeElement.dispatchEvent(new CustomEvent('cyber-sheet-refresh'));
    }
  }
}
