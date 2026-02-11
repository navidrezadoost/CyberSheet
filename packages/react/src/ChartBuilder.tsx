/**
 * ChartBuilder.tsx - React wrapper for ChartBuilderController
 * Week 12 Day 5: Multi-framework Chart Builder UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Worksheet } from '@cyber-sheet/core';
import { ChartManager } from '@cyber-sheet/renderer-canvas';
import {
  ChartBuilderController,
  ChartBuilderState,
  ChartTypeOption,
  CHART_TYPES
} from '@cyber-sheet/core';

export interface ChartBuilderProps {
  worksheet: Worksheet;
  chartManager: ChartManager;
  onClose?: () => void;
  onChartCreated?: (chartId: string) => void;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  worksheet,
  chartManager,
  onClose,
  onChartCreated
}) => {
  const [controller] = useState(() => new ChartBuilderController(worksheet, chartManager));
  const [state, setState] = useState<ChartBuilderState>(controller.getState());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = controller.on((event) => {
      if (event.type === 'state-changed') {
        setState(event.state);
        setError(null);
      } else if (event.type === 'error') {
        setError(event.message);
      } else if (event.type === 'chart-created') {
        onChartCreated?.(event.chart.id);
        onClose?.();
      } else if (event.type === 'cancelled') {
        onClose?.();
      }
    });

    return unsubscribe;
  }, [controller, onClose, onChartCreated]);

  const handleTypeSelect = useCallback((type: ChartTypeOption) => {
    controller.selectChartType(type);
  }, [controller]);

  const handleCancel = useCallback(() => {
    controller.cancel();
  }, [controller]);

  const handleCreate = useCallback(() => {
    controller.createChart();
  }, [controller]);

  return (
    <div className="chart-builder">
      <div className="chart-builder-header">
        <h2>Create Chart</h2>
        <button onClick={handleCancel} className="close-button">✕</button>
      </div>

      {error && (
        <div className="chart-builder-error">
          {error}
        </div>
      )}

      <div className="chart-builder-content">
        {state.step === 'select-type' && (
          <div className="chart-types">
            <h3>Select Chart Type</h3>
            <div className="chart-type-grid">
              {CHART_TYPES.map((type) => (
                <button
                  key={type.type}
                  className={`chart-type-option ${state.selectedType?.type === type.type ? 'selected' : ''}`}
                  onClick={() => handleTypeSelect(type)}
                >
                  <div className="chart-type-icon">{type.icon}</div>
                  <div className="chart-type-label">{type.label}</div>
                  <div className="chart-type-description">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(state.step === 'select-range' || state.step === 'configure' || state.step === 'preview') && (
          <div className="chart-config">
            <div className="config-section">
              <label>Chart Title</label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => controller.updateConfig({ title: e.target.value })}
                placeholder="Enter chart title..."
              />
            </div>

            <div className="config-section">
              <label>
                <input
                  type="checkbox"
                  checked={state.showLegend}
                  onChange={(e) => controller.updateConfig({ showLegend: e.target.checked })}
                />
                Show Legend
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={state.showAxes}
                  onChange={(e) => controller.updateConfig({ showAxes: e.target.checked })}
                />
                Show Axes
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={state.showGrid}
                  onChange={(e) => controller.updateConfig({ showGrid: e.target.checked })}
                />
                Show Grid
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="chart-builder-footer">
        <button onClick={handleCancel} className="button-secondary">
          Cancel
        </button>
        <button 
          onClick={handleCreate}
          disabled={!controller.canProceed()}
          className="button-primary"
        >
          Create Chart
        </button>
      </div>
    </div>
  );
};
