/**
 * chart-builder.component.ts - Angular wrapper for ChartBuilderController
 * Week 12 Day 5: Multi-framework Chart Builder UI
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import type { Worksheet } from '@cyber-sheet/core';
import { ChartManager } from '@cyber-sheet/renderer-canvas';
import {
  ChartBuilderController,
  ChartBuilderState,
  ChartTypeOption,
  CHART_TYPES
} from '@cyber-sheet/core';

@Component({
  selector: 'cs-chart-builder',
  template: `
    <div class="chart-builder">
      <div class="chart-builder-header">
        <h2>Create Chart</h2>
        <button (click)="handleCancel()" class="close-button">✕</button>
      </div>

      <div *ngIf="error" class="chart-builder-error">
        {{ error }}
      </div>

      <div class="chart-builder-content">
        <!-- Step 1: Select Type -->
        <div *ngIf="state.step === 'select-type'" class="chart-types">
          <h3>Select Chart Type</h3>
          <div class="chart-type-grid">
            <button
              *ngFor="let type of chartTypes"
              [class.selected]="state.selectedType?.type === type.type"
              class="chart-type-option"
              (click)="handleTypeSelect(type)"
            >
              <div class="chart-type-icon">{{ type.icon }}</div>
              <div class="chart-type-label">{{ type.label }}</div>
              <div class="chart-type-description">{{ type.description }}</div>
            </button>
          </div>
        </div>

        <!-- Steps 2-4: Configure -->
        <div *ngIf="state.step !== 'select-type'" class="chart-config">
          <div class="config-section">
            <label>Chart Title</label>
            <input
              type="text"
              [(ngModel)]="state.title"
              (ngModelChange)="updateTitle($event)"
              placeholder="Enter chart title..."
            />
          </div>

          <div class="config-section">
            <label>
              <input
                type="checkbox"
                [(ngModel)]="state.showLegend"
                (ngModelChange)="updateShowLegend($event)"
              />
              Show Legend
            </label>
            <label>
              <input
                type="checkbox"
                [(ngModel)]="state.showAxes"
                (ngModelChange)="updateShowAxes($event)"
              />
              Show Axes
            </label>
            <label>
              <input
                type="checkbox"
                [(ngModel)]="state.showGrid"
                (ngModelChange)="updateShowGrid($event)"
              />
              Show Grid
            </label>
          </div>
        </div>
      </div>

      <div class="chart-builder-footer">
        <button (click)="handleCancel()" class="button-secondary">Cancel</button>
        <button
          (click)="handleCreate()"
          [disabled]="!canProceed()"
          class="button-primary"
        >
          Create Chart
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chart-builder {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  `]
})
export class ChartBuilderComponent implements OnInit, OnDestroy {
  @Input() worksheet!: Worksheet;
  @Input() chartManager!: ChartManager;
  @Output() close = new EventEmitter<void>();
  @Output() chartCreated = new EventEmitter<string>();

  controller!: ChartBuilderController;
  state!: ChartBuilderState;
  error: string | null = null;
  chartTypes = CHART_TYPES;

  private unsubscribe?: () => void;

  ngOnInit(): void {
    this.controller = new ChartBuilderController(this.worksheet, this.chartManager);
    this.state = this.controller.getState();

    this.unsubscribe = this.controller.on((event) => {
      if (event.type === 'state-changed') {
        this.state = event.state;
        this.error = null;
      } else if (event.type === 'error') {
        this.error = event.message;
      } else if (event.type === 'chart-created') {
        this.chartCreated.emit(event.chart.id);
        this.close.emit();
      } else if (event.type === 'cancelled') {
        this.close.emit();
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  handleTypeSelect(type: ChartTypeOption): void {
    this.controller.selectChartType(type);
  }

  updateTitle(value: string): void {
    this.controller.updateConfig({ title: value });
  }

  updateShowLegend(value: boolean): void {
    this.controller.updateConfig({ showLegend: value });
  }

  updateShowAxes(value: boolean): void {
    this.controller.updateConfig({ showAxes: value });
  }

  updateShowGrid(value: boolean): void {
    this.controller.updateConfig({ showGrid: value });
  }

  handleCancel(): void {
    this.controller.cancel();
  }

  handleCreate(): void {
    this.controller.createChart();
  }

  canProceed(): boolean {
    return this.controller.canProceed();
  }
}
