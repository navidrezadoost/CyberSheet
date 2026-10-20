import { PresetPickerController } from '@cyber-sheet/cf-ui-core';
import type { CFPreset, PresetCategory } from '@cyber-sheet/cf-ui-core';

/**
 * Vanilla JavaScript adapter for PresetPickerController
 * Pure DOM APIs - no framework dependencies
 * Enhanced with WCAG 2.1 AA accessibility
 * This is the ultimate proof that our architecture is truly framework-agnostic!
 */

export interface CFPresetPickerOptions {
  onPresetSelect: (preset: CFPreset) => void;
  onApply?: (preset: CFPreset) => void;
  showPopular?: boolean;
  maxWidth?: number;
  enableA11y?: boolean;
}

export class CFPresetPicker {
  private controller: PresetPickerController;
  private container: HTMLElement;
  private options: Required<CFPresetPickerOptions>;
  
  // Accessibility state
  private announcerEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private applyButtonEl: HTMLButtonElement | null = null;
  private wrapperEl: HTMLDivElement | null = null;

  constructor(container: HTMLElement, options: CFPresetPickerOptions) {
    this.container = container;
    this.options = {
      showPopular: options.showPopular ?? true,
      maxWidth: options.maxWidth ?? 600,
      enableA11y: options.enableA11y ?? true,
      onPresetSelect: options.onPresetSelect,
      onApply: options.onApply ?? (() => {}),
    };

    this.controller = new PresetPickerController();
    this.init();
  }

  private init(): void {
    // Subscribe to controller events
    this.controller.on('category-changed', () => {
      this.render();
      // Announce category change
      const state = this.controller.getState();
      const categories = this.controller.getCategories();
      const category = categories.find((c) => c.id === state.selectedCategory);
      if (category) {
        this.announce(`${category.label} category selected. ${state.filteredPresets.length} presets available.`);
      }
    });

    this.controller.on('search-changed', () => {
      const state = this.controller.getState();
      this.render();
      // Announce search results
      this.announce(`${state.filteredPresets.length} preset${state.filteredPresets.length !== 1 ? 's' : ''} found.`);
    });

    this.controller.on('preset-selected', () => {
      this.render();
      // Announce preset selection
      const preset = this.controller.getSelectedPreset();
      if (preset) {
        this.announce(`${preset.name} selected. ${preset.description}`);
      }
    });

    // Initial render
    this.render();
  }

  /**
   * Announce a message to screen readers
   */
  private announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.options.enableA11y || !this.announcerEl) return;

    this.announcerEl.textContent = message;
    this.announcerEl.setAttribute('aria-live', priority);

    // Clear announcement after a short delay to allow re-announcing the same message
    setTimeout(() => {
      if (this.announcerEl) {
        this.announcerEl.textContent = '';
      }
    }, 100);
  }

  /**
   * Handle keyboard navigation for category filters
   */
  private handleCategoryKeyDown(event: KeyboardEvent, currentIndex: number, categories: Array<{ id: PresetCategory | 'all'; label: string; count: number }>): void {
    if (!this.options.enableA11y || !this.wrapperEl) return;

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
        this.controller.selectCategory(categories[currentIndex].id);
        return;
      default:
        return;
    }

    // Focus the new category button
    const buttons = this.wrapperEl.querySelectorAll('.cf-preset-picker__category-btn');
    if (buttons && buttons[newIndex]) {
      (buttons[newIndex] as HTMLButtonElement).focus();
    }

    this.announce(`${categories[newIndex].label} category, ${categories[newIndex].count} presets`);
  }

  /**
   * Handle keyboard navigation for popular presets
   */
  private handlePopularKeyDown(event: KeyboardEvent, currentIndex: number, presets: CFPreset[]): void {
    if (!this.options.enableA11y || !this.wrapperEl) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : presets.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < presets.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = presets.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.controller.selectPreset(presets[currentIndex].id);
        this.options.onPresetSelect(presets[currentIndex]);
        return;
      default:
        return;
    }

    // Focus the new popular preset card
    const cards = this.wrapperEl.querySelectorAll('.cf-preset-picker__popular-card');
    if (cards && cards[newIndex]) {
      (cards[newIndex] as HTMLButtonElement).focus();
    }

    this.announce(`${presets[newIndex].name} selected`);
  }

  /**
   * Handle keyboard navigation for main preset grid
   */
  private handlePresetKeyDown(event: KeyboardEvent, currentIndex: number, presets: CFPreset[]): void {
    if (!this.options.enableA11y || !this.wrapperEl) return;

    let newIndex = currentIndex;
    const columns = 2; // Grid has 2 columns

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : presets.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < presets.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex >= columns ? currentIndex - columns : currentIndex;
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = currentIndex + columns < presets.length ? currentIndex + columns : currentIndex;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = presets.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.controller.selectPreset(presets[currentIndex].id);
        this.options.onPresetSelect(presets[currentIndex]);
        return;
      case 'Escape':
        event.preventDefault();
        // Focus apply button
        this.applyButtonEl?.focus();
        this.announce('Preset selection cancelled');
        return;
      default:
        return;
    }

    // Focus the new preset card
    const cards = this.wrapperEl.querySelectorAll('.cf-preset-picker__card');
    if (cards && cards[newIndex]) {
      (cards[newIndex] as HTMLButtonElement).focus();
      // Scroll into view if needed
      (cards[newIndex] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    this.announce(`${presets[newIndex].name}. ${presets[newIndex].description}`);
  }

  private render(): void {
    const state = this.controller.getState();
    const categories = this.controller.getCategories();
    const popularPresets = this.controller.getPopularPresets(6);

    // Clear container
    this.container.innerHTML = '';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'cf-preset-picker';
    wrapper.style.maxWidth = `${this.options.maxWidth}px`;
    
    // Store wrapper reference for keyboard navigation
    this.wrapperEl = wrapper;

    // Accessibility: Add ARIA attributes
    if (this.options.enableA11y) {
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Conditional Formatting Preset Picker');
      wrapper.setAttribute('aria-describedby', 'cf-preset-picker-desc');
    }

    // Screen reader announcements
    if (this.options.enableA11y) {
      const announcer = document.createElement('div');
      announcer.className = 'cf-preset-picker__sr-only';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      this.announcerEl = announcer;
      wrapper.appendChild(announcer);
    }

    // Header
    const header = this.createHeader();
    wrapper.appendChild(header);

    // Search
    const search = this.createSearch(state.searchQuery);
    wrapper.appendChild(search);

    // Categories
    const categoriesEl = this.createCategories(categories, state.selectedCategory);
    wrapper.appendChild(categoriesEl);

    // Popular presets
    if (this.options.showPopular && state.selectedCategory === 'all' && !state.searchQuery && popularPresets.length > 0) {
      const popular = this.createPopularSection(popularPresets, state.selectedPresetId);
      wrapper.appendChild(popular);
    }

    // Main preset grid
    const grid = this.createPresetGrid(state.filteredPresets, state.selectedPresetId);
    wrapper.appendChild(grid);

    // Footer
    const footer = this.createFooter(state.filteredPresets.length, state.selectedPresetId);
    wrapper.appendChild(footer);

    // Append to container
    this.container.appendChild(wrapper);

    // Add styles if not already present
    this.injectStyles();
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cf-preset-picker__header';
    header.innerHTML = `
      <h3 class="cf-preset-picker__title">Conditional Formatting Presets</h3>
      <p id="cf-preset-picker-desc" class="cf-preset-picker__description">
        Choose from 20+ Excel-style presets to quickly format your data
      </p>
    `;
    return header;
  }

  private createSearch(value: string): HTMLElement {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'cf-preset-picker__search';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = 'Search presets...';
    input.className = 'cf-preset-picker__search-input';
    
    // Store reference for accessibility
    this.searchInputEl = input;

    // Accessibility: Add ARIA attributes
    if (this.options.enableA11y) {
      input.setAttribute('role', 'searchbox');
      input.setAttribute('aria-label', 'Search presets');
      input.setAttribute('aria-controls', 'cf-preset-grid');
    }

    input.addEventListener('input', (e) => {
      this.controller.setSearchQuery((e.target as HTMLInputElement).value);
    });

    searchContainer.appendChild(input);
    return searchContainer;
  }

  private createCategories(categories: Array<{ id: PresetCategory | 'all'; label: string; count: number }>, selected: PresetCategory | 'all'): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cf-preset-picker__categories';

    // Accessibility: Add ARIA attributes
    if (this.options.enableA11y) {
      container.setAttribute('role', 'toolbar');
      container.setAttribute('aria-label', 'Category filters');
    }

    categories.forEach((cat, index) => {
      const btn = document.createElement('button');
      btn.className = 'cf-preset-picker__category-btn';
      if (selected === cat.id) {
        btn.classList.add('cf-preset-picker__category-btn--active');
      }

      // Accessibility: Add ARIA attributes and keyboard navigation
      if (this.options.enableA11y) {
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', String(selected === cat.id));
        btn.setAttribute('tabindex', selected === cat.id ? '0' : '-1');
        btn.addEventListener('keydown', (e) => this.handleCategoryKeyDown(e, index, categories));
      }

      const badge = document.createElement('span');
      badge.className = 'cf-preset-picker__category-badge';
      badge.textContent = String(cat.count);
      
      if (this.options.enableA11y) {
        badge.setAttribute('aria-label', `${cat.count} presets`);
      }

      btn.textContent = cat.label + ' ';
      btn.appendChild(badge);

      btn.addEventListener('click', () => {
        this.controller.selectCategory(cat.id);
      });
      container.appendChild(btn);
    });

    return container;
  }

  private createPopularSection(presets: CFPreset[], selectedId: string | null): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cf-preset-picker__popular';

    // Accessibility: Add ARIA attributes
    if (this.options.enableA11y) {
      container.setAttribute('role', 'list');
      container.setAttribute('aria-label', 'Popular presets');
    }

    const title = document.createElement('h4');
    title.className = 'cf-preset-picker__popular-title';
    title.textContent = 'Popular Presets';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'cf-preset-picker__popular-grid';

    presets.forEach((preset, index) => {
      const card = document.createElement('button');
      card.className = 'cf-preset-picker__popular-card';
      if (selectedId === preset.id) {
        card.classList.add('cf-preset-picker__popular-card--selected');
      }

      // Accessibility: Add ARIA attributes and keyboard navigation
      if (this.options.enableA11y) {
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-label', preset.name);
        card.setAttribute('aria-selected', String(selectedId === preset.id));
        card.setAttribute('tabindex', selectedId === preset.id ? '0' : '-1');
        card.addEventListener('keydown', (e) => this.handlePopularKeyDown(e, index, presets));
      }

      const icon = document.createElement('div');
      icon.className = 'cf-preset-picker__popular-icon';
      icon.textContent = this.getPresetIcon(preset);
      icon.setAttribute('aria-hidden', 'true');

      const name = document.createElement('div');
      name.className = 'cf-preset-picker__popular-name';
      name.textContent = preset.name;

      card.appendChild(icon);
      card.appendChild(name);

      card.addEventListener('click', () => {
        this.controller.selectPreset(preset.id);
        this.options.onPresetSelect(preset);
      });
      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }

  private createPresetGrid(presets: CFPreset[], selectedId: string | null): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'cf-preset-picker__grid';
    grid.id = 'cf-preset-grid';

    // Accessibility: Add ARIA attributes
    if (this.options.enableA11y) {
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-label', 'Preset grid');
      grid.setAttribute('aria-rowcount', String(Math.ceil(presets.length / 2)));
      grid.setAttribute('aria-colcount', '2');
    }

    presets.forEach((preset, index) => {
      const card = document.createElement('button');
      card.className = 'cf-preset-picker__card';
      if (selectedId === preset.id) {
        card.classList.add('cf-preset-picker__card--selected');
      }

      // Accessibility: Add ARIA attributes and keyboard navigation
      if (this.options.enableA11y) {
        card.setAttribute('role', 'gridcell');
        card.setAttribute('aria-label', `${preset.name}. ${preset.description}`);
        card.setAttribute('aria-selected', String(selectedId === preset.id));
        card.setAttribute('aria-rowindex', String(Math.floor(index / 2) + 1));
        card.setAttribute('aria-colindex', String((index % 2) + 1));
        card.setAttribute('tabindex', selectedId === preset.id ? '0' : '-1');
        card.addEventListener('keydown', (e) => this.handlePresetKeyDown(e, index, presets));
      }

      const icon = document.createElement('div');
      icon.className = 'cf-preset-picker__card-icon';
      icon.textContent = this.getPresetIcon(preset);
      icon.setAttribute('aria-hidden', 'true');

      const content = document.createElement('div');
      content.className = 'cf-preset-picker__card-content';

      const name = document.createElement('div');
      name.className = 'cf-preset-picker__card-name';
      name.textContent = preset.name;

      const description = document.createElement('div');
      description.className = 'cf-preset-picker__card-description';
      description.textContent = preset.description;

      content.appendChild(name);
      content.appendChild(description);

      if (preset.tags && preset.tags.length > 0) {
        const tags = document.createElement('div');
        tags.className = 'cf-preset-picker__card-tags';
        preset.tags.forEach((tag: string) => {
          const tagEl = document.createElement('span');
          tagEl.className = 'cf-preset-picker__card-tag';
          tagEl.textContent = tag;
          tags.appendChild(tagEl);
        });
        content.appendChild(tags);
      }

      card.appendChild(icon);
      card.appendChild(content);

      card.addEventListener('click', () => {
        this.controller.selectPreset(preset.id);
        this.options.onPresetSelect(preset);
      });

      grid.appendChild(card);
    });

    return grid;
  }

  private createFooter(presetCount: number, selectedId: string | null): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'cf-preset-picker__footer';

    const count = document.createElement('span');
    count.className = 'cf-preset-picker__count';
    count.textContent = `${presetCount} preset${presetCount !== 1 ? 's' : ''}`;
    
    // Accessibility: Add ARIA live region
    if (this.options.enableA11y) {
      count.setAttribute('aria-live', 'polite');
    }

    const btn = document.createElement('button');
    btn.className = 'cf-preset-picker__apply-btn';
    btn.textContent = 'Apply Preset';
    btn.disabled = !selectedId;
    
    // Store reference for accessibility
    this.applyButtonEl = btn;

    // Accessibility: Add ARIA label
    if (this.options.enableA11y) {
      btn.setAttribute('aria-label', 'Apply selected preset');
    }

    btn.addEventListener('click', () => {
      const preset = this.controller.getSelectedPreset();
      if (preset) {
        this.options.onApply(preset);
      }
    });

    footer.appendChild(count);
    footer.appendChild(btn);

    return footer;
  }

  private getPresetIcon(preset: CFPreset): string {
    const icons: Record<PresetCategory | 'all', string> = {
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
  }

  private injectStyles(): void {
    // Check if styles already injected
    if (document.getElementById('cf-preset-picker-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'cf-preset-picker-styles';
    style.textContent = `
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

      .cf-preset-picker__header { margin-bottom: 16px; }
      .cf-preset-picker__title {
        margin: 0 0 4px 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }
      .cf-preset-picker__description { margin: 0; font-size: 13px; color: #666; }
      .cf-preset-picker__search { margin-bottom: 16px; }
      .cf-preset-picker__search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        box-sizing: border-box;
      }
      .cf-preset-picker__search-input:focus { outline: none; border-color: #007acc; }

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
        border-radius: 16px;
        background: white;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }
      .cf-preset-picker__category-btn:hover { border-color: #007acc; background: #f0f8ff; }

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
      .cf-preset-picker__popular-card {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      .cf-preset-picker__popular-card:hover { border-color: #007acc; background: #f0f8ff; }

      .cf-preset-picker__popular-card:focus-visible {
        outline: 2px solid #007acc;
        outline-offset: 2px;
        box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
      }

      .cf-preset-picker__popular-card--selected { border-color: #007acc; background: #e6f3ff; }
      .cf-preset-picker__popular-icon { font-size: 24px; margin-bottom: 4px; }
      .cf-preset-picker__popular-name { font-size: 11px; color: #333; }
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
      .cf-preset-picker__card:hover { border-color: #007acc; background: #f0f8ff; }

      .cf-preset-picker__card:focus-visible {
        outline: 2px solid #007acc;
        outline-offset: 2px;
        box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
      }

      .cf-preset-picker__card--selected { border-color: #007acc; background: #e6f3ff; }
      .cf-preset-picker__card-icon { font-size: 32px; flex-shrink: 0; }
      .cf-preset-picker__card-content { flex: 1; }
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
      .cf-preset-picker__card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
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
      .cf-preset-picker__count { font-size: 12px; color: #666; }
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
      .cf-preset-picker__apply-btn:hover:not(:disabled) { background: #005a9e; }

      .cf-preset-picker__apply-btn:focus-visible {
        outline: 2px solid #007acc;
        outline-offset: 2px;
        box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2);
      }

      .cf-preset-picker__apply-btn:disabled { background: #ccc; cursor: not-allowed; }

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
    `;

    document.head.appendChild(style);
  }

  public destroy(): void {
    // Cleanup
    this.container.innerHTML = '';
    // Future: this.controller.destroy()
  }
}
