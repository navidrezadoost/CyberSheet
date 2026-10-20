<template>
  <div 
    ref="containerRef"
    class="cf-preset-picker" 
    :style="{ maxWidth: maxWidth ? `${maxWidth}px` : undefined }"
    role="region"
    aria-label="Conditional Formatting Preset Picker"
    aria-describedby="picker-description"
  >
    <!-- Screen reader announcer (hidden) -->
    <div 
      ref="announcerRef"
      aria-live="polite" 
      aria-atomic="true" 
      class="cf-preset-picker__sr-only"
    ></div>

    <!-- Header -->
    <div class="cf-preset-picker__header">
      <h3 class="cf-preset-picker__title">Conditional Formatting Presets</h3>
      <p 
        id="picker-description"
        class="cf-preset-picker__description"
      >
        Choose from 20+ Excel-style presets to quickly format your data. Use arrow keys to navigate, Enter to select.
      </p>
    </div>

    <!-- Search -->
    <div class="cf-preset-picker__search">
      <input
        ref="searchInputRef"
        type="text"
        :value="searchQuery"
        @input="handleSearchChange"
        placeholder="Search presets..."
        class="cf-preset-picker__search-input"
        role="searchbox"
        aria-label="Search presets by name, category, or tags"
        :aria-describedby="enableA11y ? 'search-help' : undefined"
      />
      <div 
        v-if="enableA11y"
        id="search-help" 
        class="cf-preset-picker__sr-only"
      >
        Type to filter presets by name, category, or tags
      </div>
    </div>

    <!-- Category Filters -->
    <div 
      class="cf-preset-picker__categories"
      role="toolbar"
      aria-label="Category filters"
    >
      <button
        v-for="(cat, index) in categories"
        :key="cat.id"
        :data-category-id="cat.id"
        @click="handleCategoryChange(cat.id)"
        @keydown="(e) => handleCategoryKeyDown(e, index)"
        :class="[
          'cf-preset-picker__category-btn',
          { 'cf-preset-picker__category-btn--active': selectedCategory === cat.id }
        ]"
        role="radio"
        :aria-checked="selectedCategory === cat.id"
        :aria-label="`${cat.label} category (${cat.count} presets)`"
        :tabindex="selectedCategory === cat.id ? 0 : -1"
      >
        {{ cat.label }}
        <span class="cf-preset-picker__category-badge">{{ cat.count }}</span>
      </button>
    </div>

    <!-- Popular Presets (only show when no filters) -->
    <div
      v-if="showPopular && selectedCategory === 'all' && !searchQuery && popularPresets.length > 0"
      class="cf-preset-picker__popular"
      aria-label="Popular presets"
    >
      <h4 class="cf-preset-picker__popular-title">
        <span aria-label="Star icon">⭐</span> Popular Presets
      </h4>
      <div 
        class="cf-preset-picker__popular-grid"
        role="list"
      >
        <div
          v-for="preset in popularPresets"
          :key="preset.id"
          role="listitem"
          :aria-label="`${preset.name}: ${preset.description}`"
        >
          <button
            @click="handlePresetClick(preset)"
            @keydown="handlePopularPresetKeyDown"
            :class="[
              'cf-preset-picker__popular-card',
              { 'cf-preset-picker__popular-card--selected': selectedPresetId === preset.id }
            ]"
            :aria-label="`${preset.name}: ${preset.description}`"
          >
            <div class="cf-preset-picker__popular-icon">{{ getPresetIcon(preset) }}</div>
            <div class="cf-preset-picker__popular-name">{{ preset.name }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- Status announcement for screen readers -->
    <div
      v-if="enableA11y"
      role="status"
      aria-live="polite"
      class="cf-preset-picker__sr-only"
    >
      {{ filteredPresets.length }} preset{{ filteredPresets.length !== 1 ? 's' : '' }} available
    </div>

    <!-- Main Preset Grid -->
    <div 
      class="cf-preset-picker__grid"
      role="grid"
      aria-label="Available conditional formatting presets"
      :aria-rowcount="Math.ceil(filteredPresets.length / 2)"
      aria-colcount="2"
    >
      <div v-for="(row, rowIndex) in presetRows" :key="rowIndex" role="row">
        <button
          v-for="(preset, columnIndex) in row"
          :key="preset.id"
          :data-preset-id="preset.id"
          role="gridcell"
          @click="handlePresetClick(preset)"
          @keydown="(e) => handlePresetKeyDown(e, preset, rowIndex * 2 + columnIndex)"
          :class="[
            'cf-preset-picker__card',
            { 'cf-preset-picker__card--selected': selectedPresetId === preset.id }
          ]"
          :tabindex="selectedPresetId === preset.id ? 0 : -1"
          :aria-label="`${preset.name}: ${preset.description}`"
          :aria-selected="selectedPresetId === preset.id"
        >
          <div class="cf-preset-picker__card-icon">{{ getPresetIcon(preset) }}</div>
          <div class="cf-preset-picker__card-content">
            <div class="cf-preset-picker__card-name">{{ preset.name }}</div>
            <div class="cf-preset-picker__card-description">{{ preset.description }}</div>
            <div v-if="preset.tags && preset.tags.length > 0" class="cf-preset-picker__card-tags">
              <span
                v-for="tag in preset.tags"
                :key="tag"
                class="cf-preset-picker__card-tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="cf-preset-picker__footer">
      <span 
        class="cf-preset-picker__count"
        role="status"
        aria-live="polite"
      >
        {{ filteredPresets.length }} preset{{ filteredPresets.length !== 1 ? 's' : '' }}
      </span>
      <button
        ref="applyButtonRef"
        @click="handleApplyClick"
        :disabled="!selectedPresetId"
        class="cf-preset-picker__apply-btn"
        :aria-label="selectedPresetId ? `Apply ${getSelectedPresetName()} preset` : 'Select a preset to apply'"
      >
        Apply Preset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from 'vue';
import { PresetPickerController } from '@cyber-sheet/cf-ui-core';
import type { CFPreset, PresetCategory } from '@cyber-sheet/cf-ui-core';

/**
 * Vue 3 Composition API adapter for PresetPickerController
 * Wraps framework-agnostic controller with Vue reactivity
 * 
 * Accessibility Features (WCAG 2.1 AA):
 * - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - ARIA labels, roles, and descriptions
 * - Focus management and visual indicators
 * - Screen reader announcements for state changes
 * - Semantic HTML structure
 */

// Props
interface Props {
  onPresetSelect: (preset: CFPreset) => void;
  onApply?: (preset: CFPreset) => void;
  showPopular?: boolean;
  maxWidth?: number;
  enableA11y?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showPopular: true,
  maxWidth: 600,
  enableA11y: true,
});

// Controller instance (created once)
const controller = new PresetPickerController();
const initialState = controller.getState();

// Reactive state
const selectedPresetId: Ref<string | null> = ref(initialState.selectedPresetId);
const selectedCategory: Ref<PresetCategory | 'all'> = ref(initialState.selectedCategory);
const searchQuery: Ref<string> = ref(initialState.searchQuery);
const filteredPresets: Ref<CFPreset[]> = ref(initialState.filteredPresets);
const popularPresets: Ref<CFPreset[]> = ref(controller.getPopularPresets(6));
const presetRows = computed(() => {
  const rows: CFPreset[][] = [];
  for (let index = 0; index < filteredPresets.value.length; index += 2) {
    rows.push(filteredPresets.value.slice(index, index + 2));
  }
  return rows;
});

// Refs for accessibility
const containerRef = ref<HTMLDivElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const announcerRef = ref<HTMLDivElement | null>(null);
const applyButtonRef = ref<HTMLButtonElement | null>(null);

// Computed categories with counts
const categories = computed(() => controller.getCategories());

// Screen reader announcement helper
const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  if (!props.enableA11y || !announcerRef.value) return;
  
  announcerRef.value.setAttribute('aria-live', priority);
  announcerRef.value.textContent = message;
  
  // Clear after 1 second to allow re-announcing same message
  setTimeout(() => {
    if (announcerRef.value) {
      announcerRef.value.textContent = '';
    }
  }, 1000);
};

// Event handlers
const handleCategoryChange = (category: PresetCategory | 'all') => {
  controller.selectCategory(category);
  
  // Announce category change
  const categoryLabel = categories.value.find((c: { id: string; label: string; count: number }) => c.id === category)?.label || 'All';
  const count = controller.getState().filteredPresets.length;
  announce(`${categoryLabel} category selected. Showing ${count} presets.`, 'polite');
};

const handleSearchChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const query = target.value;
  controller.setSearchQuery(query);
  
  // Announce search results after a delay (debounced announcement)
  setTimeout(() => {
    const count = controller.getState().filteredPresets.length;
    if (query) {
      announce(`${count} presets found for "${query}"`, 'polite');
    }
  }, 500);
};

const handlePresetClick = (preset: CFPreset) => {
  controller.selectPreset(preset.id);
  props.onPresetSelect(preset);
  
  // Announce selection
  announce(`Selected preset: ${preset.name}`, 'polite');
  
  // Move focus to apply button if available
  if (props.onApply && applyButtonRef.value) {
    applyButtonRef.value.focus();
  }
};

const handleApplyClick = () => {
  const preset = controller.getSelectedPreset();
  if (preset && props.onApply) {
    props.onApply(preset);
    announce(`Applied ${preset.name} preset`, 'assertive');
  }
};

// Keyboard navigation for preset grid
const handlePresetKeyDown = (e: KeyboardEvent, preset: CFPreset, index: number) => {
  if (!props.enableA11y) return;
  
  const presets = filteredPresets.value;
  
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handlePresetClick(preset);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextIndex = Math.min(index + 2, presets.length - 1); // Move down one row (2 columns)
    const nextElement = containerRef.value?.querySelectorAll('[data-preset-id]')[nextIndex] as HTMLElement;
    nextElement?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevIndex = Math.max(index - 2, 0); // Move up one row
    const prevElement = containerRef.value?.querySelectorAll('[data-preset-id]')[prevIndex] as HTMLElement;
    prevElement?.focus();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    const nextIndex = Math.min(index + 1, presets.length - 1);
    const nextElement = containerRef.value?.querySelectorAll('[data-preset-id]')[nextIndex] as HTMLElement;
    nextElement?.focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prevIndex = Math.max(index - 1, 0);
    const prevElement = containerRef.value?.querySelectorAll('[data-preset-id]')[prevIndex] as HTMLElement;
    prevElement?.focus();
  } else if (e.key === 'Home') {
    e.preventDefault();
    const firstElement = containerRef.value?.querySelector('[data-preset-id]') as HTMLElement;
    firstElement?.focus();
  } else if (e.key === 'End') {
    e.preventDefault();
    const elements = containerRef.value?.querySelectorAll('[data-preset-id]');
    const lastElement = elements?.[elements.length - 1] as HTMLElement;
    lastElement?.focus();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
};

// Keyboard navigation for category buttons
const handleCategoryKeyDown = (e: KeyboardEvent, index: number) => {
  if (!props.enableA11y) return;
  
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const nextIndex = (index + 1) % categories.value.length;
    const nextButton = containerRef.value?.querySelectorAll('[data-category-id]')[nextIndex] as HTMLElement;
    nextButton?.focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prevIndex = (index - 1 + categories.value.length) % categories.value.length;
    const prevButton = containerRef.value?.querySelectorAll('[data-category-id]')[prevIndex] as HTMLElement;
    prevButton?.focus();
  } else if (e.key === 'Home') {
    e.preventDefault();
    const firstButton = containerRef.value?.querySelector('[data-category-id]') as HTMLElement;
    firstButton?.focus();
  } else if (e.key === 'End') {
    e.preventDefault();
    const buttons = containerRef.value?.querySelectorAll('[data-category-id]');
    const lastButton = buttons?.[buttons.length - 1] as HTMLElement;
    lastButton?.focus();
  }
};

// Keyboard navigation for popular presets
const handlePopularPresetKeyDown = (e: KeyboardEvent) => {
  if (!props.enableA11y) return;
  
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    // Click is handled by @click
  }
};

// Helper: Get selected preset name
const getSelectedPresetName = (): string => {
  const preset = controller.getSelectedPreset();
  return preset?.name || '';
};

// Helper: Get icon for preset
const getPresetIcon = (preset: CFPreset): string => {
  const icons: Record<PresetCategory, string> = {
    'data-bars': '📊',
    'color-scales': '🌈',
    'icon-sets': '🎯',
    'top-bottom': '🏆',
    'above-below': '📈',
    'duplicates': '🔄',
    'text': '📝',
    'dates': '📅',
    'advanced': '⚙️',
    'all': '✨',
  };
  return icons[preset.category] || '✨';
};

// Lifecycle: Subscribe to controller events
onMounted(() => {
  // Initial state sync
  const state = controller.getState();
  selectedPresetId.value = state.selectedPresetId;
  selectedCategory.value = state.selectedCategory;
  searchQuery.value = state.searchQuery;
  filteredPresets.value = state.filteredPresets;
  popularPresets.value = controller.getPopularPresets(6);

  // Subscribe to state changes
  controller.on('category-changed', () => {
    const state = controller.getState();
    selectedCategory.value = state.selectedCategory;
    filteredPresets.value = state.filteredPresets;
  });

  controller.on('search-changed', () => {
    const state = controller.getState();
    searchQuery.value = state.searchQuery;
    filteredPresets.value = state.filteredPresets;
    
    // Announce filter changes
    if (props.enableA11y && state.filteredPresets.length === 0) {
      announce('No presets found', 'polite');
    }
  });

  controller.on('preset-selected', () => {
    const state = controller.getState();
    selectedPresetId.value = state.selectedPresetId;
  });
});
</script>

<style scoped>
.cf-preset-picker {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.cf-preset-picker__header {
  margin-bottom: 16px;
}

.cf-preset-picker__title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.cf-preset-picker__description {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.cf-preset-picker__search {
  margin-bottom: 16px;
}

.cf-preset-picker__search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.cf-preset-picker__search-input:focus {
  outline: none;
  border-color: #007acc;
}

.cf-preset-picker__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.cf-preset-picker__category-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.cf-preset-picker__category-btn:hover {
  border-color: #007acc;
  background: #f0f8ff;
}

.cf-preset-picker__category-btn--active {
  background: #007acc;
  color: white;
  border-color: #007acc;
}

.cf-preset-picker__category-badge {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.cf-preset-picker__category-btn--active .cf-preset-picker__category-badge {
  background: rgba(255, 255, 255, 0.3);
}

.cf-preset-picker__popular {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.cf-preset-picker__popular-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
}

.cf-preset-picker__popular-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cf-preset-picker__popular-card {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.cf-preset-picker__popular-card:hover {
  border-color: #007acc;
  background: #f0f8ff;
}

.cf-preset-picker__popular-card--selected {
  border-color: #007acc;
  background: #e6f3ff;
}

.cf-preset-picker__popular-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.cf-preset-picker__popular-name {
  font-size: 11px;
  color: #333;
}

.cf-preset-picker__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.cf-preset-picker__card {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  text-align: left;
  display: flex;
  gap: 12px;
  transition: all 0.2s;
}

.cf-preset-picker__card:hover {
  border-color: #007acc;
  background: #f0f8ff;
}

.cf-preset-picker__card--selected {
  border-color: #007acc;
  background: #e6f3ff;
}

.cf-preset-picker__card-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.cf-preset-picker__card-content {
  flex: 1;
}

.cf-preset-picker__card-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.cf-preset-picker__card-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.cf-preset-picker__card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cf-preset-picker__card-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 3px;
  color: #666;
}

.cf-preset-picker__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.cf-preset-picker__count {
  font-size: 12px;
  color: #666;
}

.cf-preset-picker__apply-btn {
  padding: 8px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.cf-preset-picker__apply-btn:hover:not(:disabled) {
  background: #005a9e;
}

.cf-preset-picker__apply-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Accessibility Styles */
.cf-preset-picker__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible styles for WCAG 2.1 AA compliance */
.cf-preset-picker__search-input:focus-visible {
  outline: 2px solid #005a9e;
  outline-offset: 2px;
}

.cf-preset-picker__category-btn:focus-visible {
  outline: 2px solid #005a9e;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
}

.cf-preset-picker__popular-card:focus-visible {
  outline: 2px solid #005a9e;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
}

.cf-preset-picker__card:focus-visible {
  outline: 2px solid #005a9e;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
}

.cf-preset-picker__apply-btn:focus-visible {
  outline: 2px solid #005a9e;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .cf-preset-picker__category-btn--active {
    border: 2px solid currentColor;
  }
  
  .cf-preset-picker__card--selected {
    border: 2px solid currentColor;
  }
  
  .cf-preset-picker__popular-card--selected {
    border: 2px solid currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .cf-preset-picker__category-btn,
  .cf-preset-picker__popular-card,
  .cf-preset-picker__card,
  .cf-preset-picker__apply-btn {
    transition: none;
  }
}
</style>
