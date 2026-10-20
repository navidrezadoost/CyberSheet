import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresetPickerController } from '@cyber-sheet/cf-ui-core';
import type { CFPreset, PresetCategory } from '@cyber-sheet/cf-ui-core';

/**
 * Angular adapter for PresetPickerController
 * Uses Angular lifecycle hooks and RxJS patterns
 */

interface CategoryWithCount {
  value: PresetCategory | 'all';
  label: string;
  count: number;
}

const componentStyles = [`
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
      border: 1px solid currentColor;
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
  `];

@Component({
  selector: 'cf-preset-picker',
  imports: [CommonModule],
  template: `
    <div
      #container
      class="cf-preset-picker"
      [style.max-width.px]="maxWidth"
      [attr.role]="enableA11y ? 'region' : null"
      [attr.aria-label]="enableA11y ? 'Conditional Formatting Preset Picker' : null"
      [attr.aria-describedby]="enableA11y ? 'cf-preset-picker-desc' : null"
    >
      <!-- Screen reader announcements -->
      <div
        #announcer
        [attr.aria-live]="enableA11y ? announcementPriority : null"
        [attr.aria-atomic]="enableA11y ? 'true' : null"
        class="cf-preset-picker__sr-only"
      >
        {{ announcementText }}
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
          #searchInput
          type="text"
          [value]="searchQuery"
          (input)="handleSearchChange($event)"
          placeholder="Search presets..."
          class="cf-preset-picker__search-input"
          [attr.role]="enableA11y ? 'searchbox' : null"
          [attr.aria-label]="enableA11y ? 'Search presets' : null"
          [attr.aria-controls]="enableA11y ? 'cf-preset-grid' : null"
        />
      </div>

      <!-- Category Filters -->
      <div
        class="cf-preset-picker__categories"
        [attr.role]="enableA11y ? 'toolbar' : null"
        [attr.aria-label]="enableA11y ? 'Category filters' : null"
      >
        <div [attr.role]="enableA11y ? 'radiogroup' : null" [attr.aria-label]="enableA11y ? 'Preset categories' : null">
          <button
            *ngFor="let cat of categories; let i = index"
            (click)="handleCategoryChange(cat.value)"
            (keydown)="enableA11y && handleCategoryKeyDown($event, i)"
            [class.cf-preset-picker__category-btn--active]="selectedCategory === cat.value"
            class="cf-preset-picker__category-btn"
            [attr.role]="enableA11y ? 'radio' : null"
            [attr.aria-checked]="enableA11y ? (selectedCategory === cat.value) : null"
            [attr.tabindex]="enableA11y ? (selectedCategory === cat.value ? 0 : -1) : null"
          >
            {{ cat.label }}
            <span
              class="cf-preset-picker__category-badge"
              [attr.aria-label]="enableA11y ? (cat.count + ' presets') : null"
            >
              {{ cat.count }}
            </span>
          </button>
        </div>
      </div>

      <!-- Popular Presets -->
      <div
        *ngIf="showPopular && selectedCategory === 'all' && !searchQuery && popularPresets.length > 0"
        class="cf-preset-picker__popular-section"
      >
        <h4 class="cf-preset-picker__popular-title">Popular Presets</h4>
        <div class="cf-preset-picker__popular cf-preset-picker__popular-grid" [attr.role]="enableA11y ? 'list' : null" [attr.aria-label]="enableA11y ? 'Popular presets' : null">
          <div *ngFor="let preset of popularPresets; let i = index" role="listitem" [attr.aria-label]="enableA11y ? preset.name : null">
          <button
            (click)="handlePresetClick(preset)"
            (keydown)="enableA11y && handlePopularKeyDown($event, preset, i)"
            [class.cf-preset-picker__popular-card--selected]="selectedPresetId === preset.id"
            class="cf-preset-picker__popular-card"
            [attr.aria-label]="enableA11y ? preset.name : null"
            [attr.aria-pressed]="enableA11y ? (selectedPresetId === preset.id) : null"
            [attr.tabindex]="enableA11y ? (selectedPresetId === preset.id ? 0 : -1) : null"
          >
            <div class="cf-preset-picker__popular-icon" aria-hidden="true">{{ getPresetIcon(preset) }}</div>
            <div class="cf-preset-picker__popular-name">{{ preset.name }}</div>
          </button>
          </div>
        </div>
      </div>

      <!-- Main Preset Grid -->
      <div
        id="cf-preset-grid"
        class="cf-preset-picker__grid"
        [attr.role]="enableA11y ? 'grid' : null"
        [attr.aria-label]="enableA11y ? 'Preset grid' : null"
        [attr.aria-rowcount]="enableA11y ? Math.ceil(filteredPresets.length / 2) : null"
        [attr.aria-colcount]="enableA11y ? 2 : null"
      >
        <div *ngFor="let row of filteredPresetRows; let rowIndex = index; trackBy: trackByIndex" [attr.role]="enableA11y ? 'row' : null" class="cf-preset-picker__grid-row">
        <button
          *ngFor="let preset of row; let columnIndex = index"
          (click)="handlePresetClick(preset)"
          (keydown)="enableA11y && handlePresetKeyDown($event, preset, rowIndex * 2 + columnIndex)"
          [class.cf-preset-picker__card--selected]="selectedPresetId === preset.id"
          class="cf-preset-picker__card"
          [attr.role]="enableA11y ? 'gridcell' : null"
          [attr.aria-label]="enableA11y ? (preset.name + '. ' + preset.description) : null"
          [attr.aria-selected]="enableA11y ? (selectedPresetId === preset.id) : null"
          [attr.aria-rowindex]="enableA11y ? rowIndex + 1 : null"
          [attr.aria-colindex]="enableA11y ? columnIndex + 1 : null"
          [attr.tabindex]="enableA11y ? (selectedPresetId === preset.id ? 0 : -1) : null"
        >
          <div class="cf-preset-picker__card-icon" aria-hidden="true">{{ getPresetIcon(preset) }}</div>
          <div class="cf-preset-picker__card-content">
            <div class="cf-preset-picker__card-name">{{ preset.name }}</div>
            <div class="cf-preset-picker__card-description">{{ preset.description }}</div>
            <div *ngIf="preset.tags && preset.tags.length > 0" class="cf-preset-picker__card-tags">
              <span
                *ngFor="let tag of preset.tags"
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
          [attr.aria-live]="enableA11y ? 'polite' : null"
        >
          {{ filteredPresets.length }} preset{{ filteredPresets.length !== 1 ? 's' : '' }}
        </span>
        <button
          #applyButton
          (click)="handleApplyClick()"
          [disabled]="!selectedPresetId"
          class="cf-preset-picker__apply-btn"
          [attr.aria-label]="enableA11y ? 'Apply selected preset' : null"
        >
          Apply Preset
        </button>
      </div>
    </div>
  `,
  styles: componentStyles
})
export class ConditionalFormattingPresetPickerComponent implements OnInit, OnDestroy {
  @Input() showPopular: boolean = true;
  @Input() maxWidth: number = 600;
  @Input() enableA11y: boolean = true;
  @Output() presetSelect = new EventEmitter<CFPreset>();
  @Output() apply = new EventEmitter<CFPreset>();

  // ViewChild refs for accessibility
  @ViewChild('container', { static: false }) containerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput', { static: false }) searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('announcer', { static: false }) announcerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('applyButton', { static: false }) applyButtonRef?: ElementRef<HTMLButtonElement>;

  // Controller instance
  private controller!: PresetPickerController;

  // State
  selectedPresetId: string | null = null;
  selectedCategory: PresetCategory | 'all' = 'all';
  searchQuery: string = '';
  filteredPresets: CFPreset[] = [];
  popularPresets: CFPreset[] = [];
  categories: CategoryWithCount[] = [];

  // Screen reader announcements
  announcementText: string = '';
  announcementPriority: 'polite' | 'assertive' = 'polite';

  // Make Math available in template
  Math = Math;

  get filteredPresetRows(): CFPreset[][] {
    const rows: CFPreset[][] = [];
    for (let index = 0; index < this.filteredPresets.length; index += 2) {
      rows.push(this.filteredPresets.slice(index, index + 2));
    }
    return rows;
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngOnInit(): void {
    // Initialize controller
    this.controller = new PresetPickerController();

    // Initial state sync
    const state = this.controller.getState();
    this.selectedPresetId = state.selectedPresetId;
    this.selectedCategory = state.selectedCategory;
    this.searchQuery = state.searchQuery;
    this.filteredPresets = state.filteredPresets;
    this.popularPresets = this.controller.getPopularPresets(6);
    this.categories = this.controller.getCategories().map(({ id, ...category }) => ({ ...category, value: id }));

    // Subscribe to controller events
    this.controller.on('category-changed', () => {
      const state = this.controller.getState();
      this.selectedCategory = state.selectedCategory;
      this.filteredPresets = state.filteredPresets;
      this.categories = this.controller.getCategories().map(({ id, ...category }) => ({ ...category, value: id }));

      // Announce category change
      const category = this.categories.find(c => c.value === state.selectedCategory);
      if (category) {
        this.announce(`${category.label} category selected. ${this.filteredPresets.length} presets available.`);
      }
    });

    this.controller.on('search-changed', () => {
      const state = this.controller.getState();
      this.searchQuery = state.searchQuery;
      this.filteredPresets = state.filteredPresets;

      // Announce search results
      this.announce(`${this.filteredPresets.length} preset${this.filteredPresets.length !== 1 ? 's' : ''} found.`);
    });

    this.controller.on('preset-selected', () => {
      const state = this.controller.getState();
      this.selectedPresetId = state.selectedPresetId;

      // Announce preset selection
      const preset = this.controller.getSelectedPreset();
      if (preset) {
        this.announce(`${preset.name} selected. ${preset.description}`);
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup (future: controller.destroy())
  }

  handleCategoryChange(category: PresetCategory | 'all'): void {
    this.controller.selectCategory(category);
  }

  handleSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.controller.setSearchQuery(target.value);
  }

  handlePresetClick(preset: CFPreset): void {
    this.controller.selectPreset(preset.id);
    this.presetSelect.emit(preset);
  }

  handleApplyClick(): void {
    const preset = this.controller.getSelectedPreset();
    if (preset) {
      this.apply.emit(preset);
    }
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.enableA11y) return;

    this.announcementText = message;
    this.announcementPriority = priority;

    // Clear announcement after a short delay to allow re-announcing the same message
    setTimeout(() => {
      this.announcementText = '';
    }, 100);
  }

  /**
   * Handle keyboard navigation for category filters
   */
  handleCategoryKeyDown(event: KeyboardEvent, currentIndex: number): void {
    const categories = this.categories;
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
        this.handleCategoryChange(categories[currentIndex].value);
        return;
      default:
        return;
    }

    // Focus the new category button
    const buttons = this.containerRef?.nativeElement.querySelectorAll('.cf-preset-picker__category-btn');
    if (buttons && buttons[newIndex]) {
      (buttons[newIndex] as HTMLButtonElement).focus();
    }

    this.announce(`${categories[newIndex].label} category, ${categories[newIndex].count} presets`);
  }

  /**
   * Handle keyboard navigation for popular presets
   */
  handlePopularKeyDown(event: KeyboardEvent, preset: CFPreset, currentIndex: number): void {
    const presets = this.popularPresets;
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
        this.handlePresetClick(preset);
        return;
      default:
        return;
    }

    // Focus the new popular preset card
    const cards = this.containerRef?.nativeElement.querySelectorAll('.cf-preset-picker__popular-card');
    if (cards && cards[newIndex]) {
      (cards[newIndex] as HTMLButtonElement).focus();
    }

    this.announce(`${presets[newIndex].name} selected`);
  }

  /**
   * Handle keyboard navigation for main preset grid
   */
  handlePresetKeyDown(event: KeyboardEvent, preset: CFPreset, currentIndex: number): void {
    const presets = this.filteredPresets;
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
        this.handlePresetClick(preset);
        return;
      case 'Escape':
        event.preventDefault();
        // Focus apply button
        this.applyButtonRef?.nativeElement?.focus();
        this.announce('Preset selection cancelled');
        return;
      default:
        return;
    }

    // Focus the new preset card
    const cards = this.containerRef?.nativeElement.querySelectorAll('.cf-preset-picker__card');
    if (cards && cards[newIndex]) {
      (cards[newIndex] as HTMLButtonElement).focus();
      // Scroll into view if needed
      (cards[newIndex] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    this.announce(`${presets[newIndex].name}. ${presets[newIndex].description}`);
  }

  getPresetIcon(preset: CFPreset): string {
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
}
