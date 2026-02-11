<template>
  <div class="chart-builder">
    <div class="chart-builder-header">
      <h2>Create Chart</h2>
      <button @click="handleCancel" class="close-button">✕</button>
    </div>

    <div v-if="error" class="chart-builder-error">
      {{ error }}
    </div>

    <div class="chart-builder-content">
      <!-- Step 1: Select Type -->
      <div v-if="state.step === 'select-type'" class="chart-types">
        <h3>Select Chart Type</h3>
        <div class="chart-type-grid">
          <button
            v-for="type in chartTypes"
            :key="type.type"
            :class="['chart-type-option', { selected: state.selectedType?.type === type.type }]"
            @click="handleTypeSelect(type)"
          >
            <div class="chart-type-icon">{{ type.icon }}</div>
            <div class="chart-type-label">{{ type.label }}</div>
            <div class="chart-type-description">{{ type.description }}</div>
          </button>
        </div>
      </div>

      <!-- Steps 2-4: Configure -->
      <div v-if="state.step !== 'select-type'" class="chart-config">
        <div class="config-section">
          <label>Chart Title</label>
          <input
            type="text"
            v-model="title"
            @input="updateTitle"
            placeholder="Enter chart title..."
          />
        </div>

        <div class="config-section">
          <label>
            <input type="checkbox" v-model="showLegend" @change="updateShowLegend" />
            Show Legend
          </label>
          <label>
            <input type="checkbox" v-model="showAxes" @change="updateShowAxes" />
            Show Axes
          </label>
          <label>
            <input type="checkbox" v-model="showGrid" @change="updateShowGrid" />
            Show Grid
          </label>
        </div>
      </div>
    </div>

    <div class="chart-builder-footer">
      <button @click="handleCancel" class="button-secondary">Cancel</button>
      <button @click="handleCreate" :disabled="!canProceed" class="button-primary">
        Create Chart
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed, PropType } from 'vue';
import type { Worksheet } from '@cyber-sheet/core';
import { ChartManager } from '@cyber-sheet/renderer-canvas';
import {
  ChartBuilderController,
  ChartBuilderState,
  ChartTypeOption,
  CHART_TYPES
} from '@cyber-sheet/core';

export default defineComponent({
  name: 'ChartBuilder',
  props: {
    worksheet: {
      type: Object as PropType<Worksheet>,
      required: true
    },
    chartManager: {
      type: Object as PropType<ChartManager>,
      required: true
    }
  },
  emits: ['close', 'chart-created'],
  setup(props, { emit }) {
    const controller = new ChartBuilderController(props.worksheet, props.chartManager);
    const state = ref<ChartBuilderState>(controller.getState());
    const error = ref<string | null>(null);
    
    // Local state for v-model
    const title = ref(state.value.title);
    const showLegend = ref(state.value.showLegend);
    const showAxes = ref(state.value.showAxes);
    const showGrid = ref(state.value.showGrid);
    
    const chartTypes = CHART_TYPES;
    const canProceed = computed(() => controller.canProceed());

    let unsubscribe: (() => void) | null = null;

    onMounted(() => {
      unsubscribe = controller.on((event) => {
        if (event.type === 'state-changed') {
          state.value = event.state;
          title.value = event.state.title;
          showLegend.value = event.state.showLegend;
          showAxes.value = event.state.showAxes;
          showGrid.value = event.state.showGrid;
          error.value = null;
        } else if (event.type === 'error') {
          error.value = event.message;
        } else if (event.type === 'chart-created') {
          emit('chart-created', event.chart.id);
          emit('close');
        } else if (event.type === 'cancelled') {
          emit('close');
        }
      });
    });

    onUnmounted(() => {
      unsubscribe?.();
    });

    const handleTypeSelect = (type: ChartTypeOption) => {
      controller.selectChartType(type);
    };

    const updateTitle = () => {
      controller.updateConfig({ title: title.value });
    };

    const updateShowLegend = () => {
      controller.updateConfig({ showLegend: showLegend.value });
    };

    const updateShowAxes = () => {
      controller.updateConfig({ showAxes: showAxes.value });
    };

    const updateShowGrid = () => {
      controller.updateConfig({ showGrid: showGrid.value });
    };

    const handleCancel = () => {
      controller.cancel();
    };

    const handleCreate = () => {
      controller.createChart();
    };

    return {
      state,
      error,
      chartTypes,
      canProceed,
      title,
      showLegend,
      showAxes,
      showGrid,
      handleTypeSelect,
      updateTitle,
      updateShowLegend,
      updateShowAxes,
      updateShowGrid,
      handleCancel,
      handleCreate
    };
  }
});
</script>

<style scoped>
.chart-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
