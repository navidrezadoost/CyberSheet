/**
 * ChartBuilder.js - Vanilla JS wrapper for ChartBuilderController
 * Week 12 Day 5: Multi-framework Chart Builder UI
 */

import {
  ChartBuilderController,
  CHART_TYPES
} from '@cyber-sheet/core';

/**
 * VanillaJS Chart Builder UI
 */
export class ChartBuilder {
  /**
   * @param {Object} config
   * @param {Worksheet} config.worksheet
   * @param {ChartManager} config.chartManager
   * @param {HTMLElement} config.container
   * @param {Function} [config.onClose]
   * @param {Function} [config.onChartCreated]
   */
  constructor({ worksheet, chartManager, container, onClose, onChartCreated }) {
    this.container = container;
    this.onClose = onClose;
    this.onChartCreated = onChartCreated;
    
    this.controller = new ChartBuilderController(worksheet, chartManager);
    this.state = this.controller.getState();
    this.error = null;

    this.unsubscribe = this.controller.on((event) => {
      if (event.type === 'state-changed') {
        this.state = event.state;
        this.error = null;
        this.render();
      } else if (event.type === 'error') {
        this.error = event.message;
        this.render();
      } else if (event.type === 'chart-created') {
        this.onChartCreated?.(event.chart.id);
        this.onClose?.();
      } else if (event.type === 'cancelled') {
        this.onClose?.();
      }
    });

    this.render();
  }

  /**
   * Render the UI
   */
  render() {
    const html = `
      <div class="chart-builder">
        <div class="chart-builder-header">
          <h2>Create Chart</h2>
          <button data-action="cancel" class="close-button">✕</button>
        </div>

        ${this.error ? `
          <div class="chart-builder-error">
            ${this.error}
          </div>
        ` : ''}

        <div class="chart-builder-content">
          ${this.renderContent()}
        </div>

        <div class="chart-builder-footer">
          <button data-action="cancel" class="button-secondary">Cancel</button>
          <button 
            data-action="create"
            ${!this.controller.canProceed() ? 'disabled' : ''}
            class="button-primary"
          >
            Create Chart
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render content based on current step
   */
  renderContent() {
    if (this.state.step === 'select-type') {
      return `
        <div class="chart-types">
          <h3>Select Chart Type</h3>
          <div class="chart-type-grid">
            ${CHART_TYPES.map(type => `
              <button
                class="chart-type-option ${this.state.selectedType?.type === type.type ? 'selected' : ''}"
                data-action="select-type"
                data-type="${type.type}"
              >
                <div class="chart-type-icon">${type.icon}</div>
                <div class="chart-type-label">${type.label}</div>
                <div class="chart-type-description">${type.description}</div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Configure/preview steps
    return `
      <div class="chart-config">
        <div class="config-section">
          <label>Chart Title</label>
          <input
            type="text"
            data-config="title"
            value="${this.state.title}"
            placeholder="Enter chart title..."
          />
        </div>

        <div class="config-section">
          <label>
            <input
              type="checkbox"
              data-config="showLegend"
              ${this.state.showLegend ? 'checked' : ''}
            />
            Show Legend
          </label>
          <label>
            <input
              type="checkbox"
              data-config="showAxes"
              ${this.state.showAxes ? 'checked' : ''}
            />
            Show Axes
          </label>
          <label>
            <input
              type="checkbox"
              data-config="showGrid"
              ${this.state.showGrid ? 'checked' : ''}
            />
            Show Grid
          </label>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        
        if (action === 'cancel') {
          this.controller.cancel();
        } else if (action === 'create') {
          this.controller.createChart();
        } else if (action === 'select-type') {
          const type = e.currentTarget.getAttribute('data-type');
          const chartType = CHART_TYPES.find(t => t.type === type);
          if (chartType) {
            this.controller.selectChartType(chartType);
          }
        }
      });
    });

    // Config inputs
    this.container.querySelectorAll('[data-config]').forEach(input => {
      const config = input.getAttribute('data-config');
      
      if (input.type === 'checkbox') {
        input.addEventListener('change', (e) => {
          this.controller.updateConfig({ [config]: e.target.checked });
        });
      } else {
        input.addEventListener('input', (e) => {
          this.controller.updateConfig({ [config]: e.target.value });
        });
      }
    });
  }

  /**
   * Clean up
   */
  destroy() {
    this.unsubscribe?.();
    this.container.innerHTML = '';
  }
}

/**
 * Helper function to create chart builder
 * @param {Object} config
 * @returns {ChartBuilder}
 */
export function createChartBuilder(config) {
  return new ChartBuilder(config);
}
