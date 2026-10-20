<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { PresetPickerController } from '@cyber-sheet/cf-ui-core';
  import type { CFPreset, PresetCategory } from '@cyber-sheet/cf-ui-core';

  /**
   * Svelte adapter for PresetPickerController
   * Uses Svelte stores and reactive statements
   * Enhanced with WCAG 2.1 AA accessibility
   */

  // Props
  export let onPresetSelect: (preset: CFPreset) => void;
  export let onApply: ((preset: CFPreset) => void) | undefined = undefined;
  export let showPopular: boolean = true;
  export let maxWidth: number = 600;
  export let enableA11y: boolean = true;

  // Controller instance
  let controller: PresetPickerController;

  // Reactive state
  let selectedPresetId: string | null = null;
  let selectedCategory: PresetCategory = 'all';
  let searchQuery: string = '';
  let filteredPresets: CFPreset[] = [];
  let popularPresets: CFPreset[] = [];
  $: filteredPresetRows = Array.from(
    { length: Math.ceil(filteredPresets.length / 2) },
    (_, rowIndex) => filteredPresets.slice(rowIndex * 2, rowIndex * 2 + 2),
  );

  // Accessibility state
  let announcementText: string = '';
  let announcementPriority: 'polite' | 'assertive' = 'polite';

  // Element bindings for focus management
  let containerEl: HTMLDivElement;
  let searchInputEl: HTMLInputElement;
  let announcerEl: HTMLDivElement;
  let applyButtonEl: HTMLButtonElement;

  // Reactive categories (recomputed when state changes)
  $: categories = controller ? controller.getCategories() : [];

  /**
   * Announce a message to screen readers
   */
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!enableA11y) return;

    announcementText = message;
    announcementPriority = priority;

    // Clear announcement after a short delay to allow re-announcing the same message
    setTimeout(() => {
      announcementText = '';
    }, 100);
  };

  /**
   * Handle keyboard navigation for category filters
   */
  const handleCategoryKeyDown = (event: KeyboardEvent, currentIndex: number) => {
    if (!enableA11y) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : categories.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < categories.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = categories.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleCategoryChange(categories[currentIndex].id);
        return;
      default:
        return;
    }

    // Focus the new category button
    const buttons = containerEl.querySelectorAll('.cf-preset-picker__category-btn');
    if (buttons && buttons[newIndex]) {
      (buttons[newIndex] as HTMLButtonElement).focus();
    }

    announce(`${categories[newIndex].label} category, ${categories[newIndex].count} presets`);
  };

  /**
   * Handle keyboard navigation for popular presets
   */
  const handlePopularKeyDown = (event: KeyboardEvent, preset: CFPreset, currentIndex: number) => {
    if (!enableA11y) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : popularPresets.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < popularPresets.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = popularPresets.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handlePresetClick(preset);
        return;
      default:
        return;
    }

    // Focus the new popular preset card
    const cards = containerEl.querySelectorAll('.cf-preset-picker__popular-card');
    if (cards && cards[newIndex]) {
      (cards[newIndex] as HTMLButtonElement).focus();
    }

    announce(`${popularPresets[newIndex].name} selected`);
  };

  /**
   * Handle keyboard navigation for main preset grid
   */
  const handlePresetKeyDown = (event: KeyboardEvent, preset: CFPreset, currentIndex: number) => {
    if (!enableA11y) return;

    let newIndex = currentIndex;
    const columns = 2; // Grid has 2 columns

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPresets.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < filteredPresets.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex >= columns ? currentIndex - columns : currentIndex;
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = currentIndex + columns < filteredPresets.length ? currentIndex + columns : currentIndex;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = filteredPresets.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handlePresetClick(preset);
        return;
      case 'Escape':
        event.preventDefault();
        // Focus apply button
        applyButtonEl?.focus();
        announce('Preset selection cancelled');
        return;
      default:
        return;
    }

    // Focus the new preset card
    const cards = containerEl.querySelectorAll('.cf-preset-picker__card');
    if (cards && cards[newIndex]) {
      (cards[newIndex] as HTMLButtonElement).focus();
      // Scroll into view if needed
      (cards[newIndex] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    announce(`${filteredPresets[newIndex].name}. ${filteredPresets[newIndex].description}`);
  };

  // Event handlers
  const handleCategoryChange = (category: PresetCategory | 'all') => {
    controller.selectCategory(category);
  };

  const handleSearchChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    controller.setSearchQuery(target.value);
  };

  const handlePresetClick = (preset: CFPreset) => {
    controller.selectPreset(preset.id);
    onPresetSelect(preset);
  };

  const handleApplyClick = () => {
    const preset = controller.getSelectedPreset();
    if (preset && onApply) {
      onApply(preset);
    }
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

  // Lifecycle: Initialize controller and subscribe to events
  onMount(() => {
    controller = new PresetPickerController();

    // Initial state sync
    const state = controller.getState();
    selectedPresetId = state.selectedPresetId;
    selectedCategory = state.selectedCategory;
    searchQuery = state.searchQuery;
    filteredPresets = state.filteredPresets;
    popularPresets = controller.getPopularPresets(6);

    // Subscribe to controller events
    controller.on('category-changed', () => {
      const state = controller.getState();
      selectedCategory = state.selectedCategory;
      filteredPresets = state.filteredPresets;

      // Announce category change
      const category = categories.find(c => c.id === state.selectedCategory);
      if (category) {
        announce(`${category.label} category selected. ${filteredPresets.length} presets available.`);
      }
    });

    controller.on('search-changed', () => {
      const state = controller.getState();
      searchQuery = state.searchQuery;
      filteredPresets = state.filteredPresets;

      // Announce search results
      announce(`${filteredPresets.length} preset${filteredPresets.length !== 1 ? 's' : ''} found.`);
    });

    controller.on('preset-selected', () => {
      const state = controller.getState();
      selectedPresetId = state.selectedPresetId;

      // Announce preset selection
      const preset = controller.getSelectedPreset();
      if (preset) {
        announce(`${preset.name} selected. ${preset.description}`);
      }
    });
  });

  // Cleanup
  onDestroy(() => {
    // Future: controller.destroy()
  });
</script>

<div 
  bind:this={containerEl}
  class="cf-preset-picker" 
  style:max-width={maxWidth ? `${maxWidth}px` : undefined}
  role={enableA11y ? 'region' : undefined}
  aria-label={enableA11y ? 'Conditional Formatting Preset Picker' : undefined}
  aria-describedby={enableA11y ? 'cf-preset-picker-desc' : undefined}
>
  <!-- Screen reader announcements -->
  <div 
    bind:this={announcerEl}
    aria-live={enableA11y ? announcementPriority : undefined}
    aria-atomic={enableA11y ? 'true' : undefined}
    class="cf-preset-picker__sr-only"
  >
    {announcementText}
  </div>

  <!-- Header -->
  <div class="cf-preset-picker__header">
    <h3 class="cf-preset-picker__title">Conditional Formatting Presets</h3>
    <p id="cf-preset-picker-desc" class="cf-preset-picker__description">
      Choose from 20+ Excel-style presets to quickly format your data
    </p>
  </div>

  <!-- Search -->
  <div class="cf-preset-picker__search">
    <input
      bind:this={searchInputEl}
      type="text"
      value={searchQuery}
      on:input={handleSearchChange}
      placeholder="Search presets..."
      class="cf-preset-picker__search-input"
      role={enableA11y ? 'searchbox' : undefined}
      aria-label={enableA11y ? 'Search presets' : undefined}
      aria-controls={enableA11y ? 'cf-preset-grid' : undefined}
    />
  </div>

  <!-- Category Filters -->
  <div 
    class="cf-preset-picker__categories"
    role={enableA11y ? 'toolbar' : undefined}
    aria-label={enableA11y ? 'Category filters' : undefined}
  >
    <div role={enableA11y ? 'radiogroup' : undefined} aria-label={enableA11y ? 'Preset categories' : undefined}>
      {#each categories as cat, i}
        <button
          on:click={() => handleCategoryChange(cat.id)}
          on:keydown={(e) => enableA11y && handleCategoryKeyDown(e, i)}
          class:cf-preset-picker__category-btn--active={selectedCategory === cat.id}
          class="cf-preset-picker__category-btn"
          role={enableA11y ? 'radio' : undefined}
          aria-checked={enableA11y ? (selectedCategory === cat.id) : undefined}
          tabindex={enableA11y ? (selectedCategory === cat.id ? 0 : -1) : undefined}
        >
          {cat.label}
          <span class="cf-preset-picker__category-badge" aria-label={enableA11y ? `${cat.count} presets` : undefined}>
            {cat.count}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Popular Presets -->
  {#if showPopular && selectedCategory === 'all' && !searchQuery && popularPresets.length > 0}
    <div class="cf-preset-picker__popular">
      <h4 class="cf-preset-picker__popular-title">Popular Presets</h4>
      <div class="cf-preset-picker__popular-grid" role={enableA11y ? 'list' : undefined} aria-label={enableA11y ? 'Popular presets' : undefined}>
        {#each popularPresets as preset, i}
          <div role="listitem" aria-label={enableA11y ? preset.name : undefined}>
            <button
              on:click={() => handlePresetClick(preset)}
              on:keydown={(e) => enableA11y && handlePopularKeyDown(e, preset, i)}
              class:cf-preset-picker__popular-card--selected={selectedPresetId === preset.id}
              class="cf-preset-picker__popular-card"
              aria-label={enableA11y ? preset.name : undefined}
              aria-pressed={enableA11y ? (selectedPresetId === preset.id) : undefined}
              tabindex={enableA11y ? (selectedPresetId === preset.id ? 0 : -1) : undefined}
            >
              <div class="cf-preset-picker__popular-icon" aria-hidden="true">{getPresetIcon(preset)}</div>
              <div class="cf-preset-picker__popular-name">{preset.name}</div>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Main Preset Grid -->
  <div 
    id="cf-preset-grid"
    class="cf-preset-picker__grid"
    role={enableA11y ? 'grid' : undefined}
    aria-label={enableA11y ? 'Preset grid' : undefined}
    aria-rowcount={enableA11y ? Math.ceil(filteredPresets.length / 2) : undefined}
    aria-colcount={enableA11y ? 2 : undefined}
  >
    {#each filteredPresetRows as row, rowIndex}
      <div class="cf-preset-picker__grid-row" role={enableA11y ? 'row' : undefined}>
        {#each row as preset, columnIndex}
          <button
            on:click={() => handlePresetClick(preset)}
            on:keydown={(e) => enableA11y && handlePresetKeyDown(e, preset, rowIndex * 2 + columnIndex)}
            class:cf-preset-picker__card--selected={selectedPresetId === preset.id}
            class="cf-preset-picker__card"
            role={enableA11y ? 'gridcell' : undefined}
            aria-label={enableA11y ? `${preset.name}. ${preset.description}` : undefined}
            aria-selected={enableA11y ? (selectedPresetId === preset.id) : undefined}
            aria-rowindex={enableA11y ? rowIndex + 1 : undefined}
            aria-colindex={enableA11y ? columnIndex + 1 : undefined}
            tabindex={enableA11y ? (selectedPresetId === preset.id ? 0 : -1) : undefined}
          >
            <div class="cf-preset-picker__card-icon" aria-hidden="true">{getPresetIcon(preset)}</div>
            <div class="cf-preset-picker__card-content">
              <div class="cf-preset-picker__card-name">{preset.name}</div>
              <div class="cf-preset-picker__card-description">{preset.description}</div>
              {#if preset.tags && preset.tags.length > 0}
                <div class="cf-preset-picker__card-tags">
                  {#each preset.tags as tag}
                    <span class="cf-preset-picker__card-tag">{tag}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/each}
  </div>

  <!-- Footer -->
  <div class="cf-preset-picker__footer">
    <span 
      class="cf-preset-picker__count"
      aria-live={enableA11y ? 'polite' : undefined}
    >
      {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''}
    </span>
    <button
      bind:this={applyButtonEl}
      on:click={handleApplyClick}
      disabled={!selectedPresetId}
      class="cf-preset-picker__apply-btn"
      aria-label={enableA11y ? 'Apply selected preset' : undefined}
    >
      Apply Preset
    </button>
  </div>
</div>

<style>
  .cf-preset-picker {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Screen reader only content */
  .cf-preset-picker__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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

  /* Accessibility: Focus indicators */
  .cf-preset-picker__search-input:focus-visible {
    outline: 2px solid #007acc;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
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
    border-style: solid;
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

  .cf-preset-picker__category-btn:focus-visible {
    outline: 2px solid #007acc;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
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

  .cf-preset-picker__popular-grid > div,
  .cf-preset-picker__grid-row {
    display: contents;
  }

  .cf-preset-picker__popular-card {
    padding: 12px;
    border: 1px solid #ddd;
    border-style: solid;
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

  .cf-preset-picker__popular-card:focus-visible {
    outline: 2px solid #007acc;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
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
    border-style: solid;
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

  .cf-preset-picker__card:focus-visible {
    outline: 2px solid #007acc;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
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
    border: 1px solid transparent;
    border-style: solid;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .cf-preset-picker__apply-btn:hover:not(:disabled) {
    background: #005a9e;
  }

  .cf-preset-picker__apply-btn:focus-visible {
    outline: 2px solid #007acc;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
  }

  .cf-preset-picker__apply-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  /* Accessibility: High contrast mode support */
  @media (prefers-contrast: high) {
    .cf-preset-picker {
      border: 2px solid currentColor;
    }

    .cf-preset-picker__category-btn,
    .cf-preset-picker__popular-card,
    .cf-preset-picker__card {
      border-width: 2px;
    }

    .cf-preset-picker__category-btn--active,
    .cf-preset-picker__popular-card--selected,
    .cf-preset-picker__card--selected {
      border-width: 3px;
    }
  }

  /* Accessibility: Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .cf-preset-picker__category-btn,
    .cf-preset-picker__popular-card,
    .cf-preset-picker__card,
    .cf-preset-picker__apply-btn {
      transition: none;
    }
  }
</style>
