<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import type { Worksheet } from '@cyber-sheet/core';
  import { ChartManager } from '@cyber-sheet/renderer-canvas';
  import {
    ChartBuilderController,
    ChartBuilderState,
    ChartTypeOption,
    CHART_TYPES
  } from '@cyber-sheet/core';

  export let worksheet: Worksheet;
  export let chartManager: ChartManager;

  const dispatch = createEventDispatcher<{
    close: void;
    'chart-created': string;
  }>();

  let controller: ChartBuilderController;
  let state: ChartBuilderState;
  let error: string | null = null;
  let unsubscribe: (() => void) | undefined;

  onMount(() => {
    controller = new ChartBuilderController(worksheet, chartManager);
    state = controller.getState();

    unsubscribe = controller.on((event) => {
      if (event.type === 'state-changed') {
        state = event.state;
        error = null;
      } else if (event.type === 'error') {
        error = event.message;
      } else if (event.type === 'chart-created') {
        dispatch('chart-created', event.chart.id);
        dispatch('close');
      } else if (event.type === 'cancelled') {
        dispatch('close');
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  function handleTypeSelect(type: ChartTypeOption): void {
    controller.selectChartType(type);
  }

  function handleCancel(): void {
    controller.cancel();
  }

  function handleCreate(): void {
    controller.createChart();
  }

  function updateTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    controller.updateConfig({ title: value });
  }

  function updateShowLegend(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    controller.updateConfig({ showLegend: checked });
  }

  function updateShowAxes(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    controller.updateConfig({ showAxes: checked });
  }

  function updateShowGrid(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    controller.updateConfig({ showGrid: checked });
  }
</script>

<div class="chart-builder">
  <div class="chart-builder-header">
    <h2>Create Chart</h2>
    <button on:click={handleCancel} class="close-button">✕</button>
  </div>

  {#if error}
    <div class="chart-builder-error">
      {error}
    </div>
  {/if}

  <div class="chart-builder-content">
    {#if state.step === 'select-type'}
      <div class="chart-types">
        <h3>Select Chart Type</h3>
        <div class="chart-type-grid">
          {#each CHART_TYPES as type}
            <button
              class="chart-type-option"
              class:selected={state.selectedType?.type === type.type}
              on:click={() => handleTypeSelect(type)}
            >
              <div class="chart-type-icon">{type.icon}</div>
              <div class="chart-type-label">{type.label}</div>
              <div class="chart-type-description">{type.description}</div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if state.step !== 'select-type'}
      <div class="chart-config">
        <div class="config-section">
          <label>Chart Title</label>
          <input
            type="text"
            value={state.title}
            on:input={updateTitle}
            placeholder="Enter chart title..."
          />
        </div>

        <div class="config-section">
          <label>
            <input
              type="checkbox"
              checked={state.showLegend}
              on:change={updateShowLegend}
            />
            Show Legend
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.showAxes}
              on:change={updateShowAxes}
            />
            Show Axes
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.showGrid}
              on:change={updateShowGrid}
            />
            Show Grid
          </label>
        </div>
      </div>
    {/if}
  </div>

  <div class="chart-builder-footer">
    <button on:click={handleCancel} class="button-secondary">Cancel</button>
    <button
      on:click={handleCreate}
      disabled={!controller?.canProceed()}
      class="button-primary"
    >
      Create Chart
    </button>
  </div>
</div>

<style>
  .chart-builder {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
