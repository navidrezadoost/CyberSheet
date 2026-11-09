/**
 * Accessibility tests for Vanilla JS CFPresetPicker
 * Tests WCAG 2.1 AA compliance using jest-axe
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import { CFPresetPicker } from '../CFPresetPicker';
import type { CFPreset } from '@cyber-sheet/cf-ui-core';

expect.extend(toHaveNoViolations);

describe('CFPresetPicker - Accessibility', () => {
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollIntoView',
  );

  beforeAll(() => {
    // jsdom has no layout/scrolling geometry. Arrow-key tests assert focus
    // movement; browser scrolling is covered by browser-level tests.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterAll(() => {
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  let container: HTMLDivElement;
  let picker: CFPresetPicker;
  let mockOnPresetSelect: jest.Mock;
  let mockOnApply: jest.Mock;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock callbacks
    mockOnPresetSelect = jest.fn();
    mockOnApply = jest.fn();
  });

  afterEach(() => {
    // Cleanup
    if (picker) {
      picker.destroy();
    }
    document.body.removeChild(container);
    
    // Remove injected styles
    const styles = document.getElementById('cf-preset-picker-styles');
    if (styles) {
      styles.remove();
    }
  });

  describe('Automated accessibility violations', () => {
    it('should have no axe violations on initial render', async () => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations after search', async () => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const searchInput = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      searchInput.value = 'red';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations after category change', async () => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const categoryBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
      categoryBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML structure', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should use semantic heading elements', () => {
      const h3 = container.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3?.textContent).toBe('Conditional Formatting Presets');

      const h4 = container.querySelector('h4');
      expect(h4?.textContent).toBe('Popular Presets');
    });

    it('should have proper button elements', () => {
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have input with type="text"', () => {
      const input = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      expect(input.type).toBe('text');
    });

    it('should have paragraphs for descriptions', () => {
      const description = container.querySelector('.cf-preset-picker__description');
      expect(description?.tagName).toBe('P');
    });

    it('should use div for layout, not tables', () => {
      const tables = container.querySelectorAll('table');
      expect(tables.length).toBe(0);
    });
  });

  describe('ARIA attributes', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should have role="region" on container', () => {
      const wrapper = container.querySelector('.cf-preset-picker');
      expect(wrapper?.getAttribute('role')).toBe('region');
      expect(wrapper?.getAttribute('aria-label')).toBe('Conditional Formatting Preset Picker');
      expect(wrapper?.getAttribute('aria-describedby')).toBe('cf-preset-picker-desc');
    });

    it('should have role="searchbox" on search input', () => {
      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('role')).toBe('searchbox');
      expect(searchInput?.getAttribute('aria-label')).toBe('Search presets');
      expect(searchInput?.getAttribute('aria-controls')).toBe('cf-preset-grid');
    });

    it('should have role="toolbar" on categories container', () => {
      const categories = container.querySelector('.cf-preset-picker__categories');
      expect(categories?.getAttribute('role')).toBe('toolbar');
      expect(categories?.getAttribute('aria-label')).toBe('Category filters');
    });

    it('should have role="radio" on category buttons with aria-checked', () => {
      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn');
      categoryBtns.forEach(btn => {
        expect(btn.getAttribute('role')).toBe('radio');
        expect(btn.getAttribute('aria-checked')).toMatch(/^(true|false)$/);
      });

      const activeBtn = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeBtn?.getAttribute('aria-checked')).toBe('true');
    });

    it('should have role="grid" on preset grid with row/column counts', () => {
      const grid = container.querySelector('.cf-preset-picker__grid');
      expect(grid?.getAttribute('role')).toBe('grid');
      expect(grid?.getAttribute('aria-label')).toBe('Preset grid');
      expect(grid?.getAttribute('aria-rowcount')).toBeTruthy();
      expect(grid?.getAttribute('aria-colcount')).toBe('2');
      const group = container.querySelector('.cf-preset-picker__popular-grid');
      expect(group?.getAttribute('role')).toBe('group');
      expect(group?.getAttribute('aria-label')).toBe('Popular presets');

      const cards = container.querySelectorAll('.cf-preset-picker__popular-card');
      expect(cards.length).toBeGreaterThan(0);
      cards.forEach(card => {
        expect(card.tagName).toBe('BUTTON');
        expect(card.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
        expect(card.hasAttribute('aria-selected')).toBe(false);
        expect(card.hasAttribute('role')).toBe(false);
      });
    });

    it('should place selected grid cells in indexed rows with interactive buttons', () => {
      const cards = container.querySelectorAll('.cf-preset-picker__card');
      expect(cards.length).toBeGreaterThan(0);

      cards.forEach((card, index) => {
        const cell = card.parentElement;
        const row = cell?.parentElement;
        expect(cell?.getAttribute('role')).toBe('gridcell');
        expect(cell?.getAttribute('aria-colindex')).toBe(String((index % 2) + 1));
        expect(cell?.getAttribute('aria-selected')).toMatch(/^(true|false)$/);
        expect(row?.getAttribute('role')).toBe('row');
        expect(row?.getAttribute('aria-rowindex')).toBe(String(Math.floor(index / 2) + 1));
        expect(card.tagName).toBe('BUTTON');
        expect(card.hasAttribute('aria-selected')).toBe(false);
        expect(card.getAttribute('tabindex')).toMatch(/^(0|-1)$/);
      });
    });

    it('should have aria-live on announcer and count', () => {
      const announcer = container.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');

      const count = container.querySelector('.cf-preset-picker__count');
      expect(count?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Keyboard navigation - Tab order', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should have correct tabindex on focusable elements', () => {
      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.hasAttribute('tabindex')).toBe(false); // Native tabindex

      const activeCategory = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeCategory?.getAttribute('tabindex')).toBe('0');

      const inactiveCategories = container.querySelectorAll('.cf-preset-picker__category-btn:not(.cf-preset-picker__category-btn--active)');
      inactiveCategories.forEach(btn => {
        expect(btn.getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  describe('Keyboard navigation - Arrow keys', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should navigate categories with ArrowLeft and ArrowRight', () => {
      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const secondBtn = categoryBtns[1];

      firstBtn.focus();

      // ArrowRight
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      firstBtn.dispatchEvent(rightEvent);

      expect(document.activeElement).toBe(secondBtn);
    });

    it('should navigate categories with Home and End', () => {
      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const lastBtn = categoryBtns[categoryBtns.length - 1];

      firstBtn.focus();

      // End key
      const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      firstBtn.dispatchEvent(endEvent);

      expect(document.activeElement).toBe(lastBtn);

      // Home key
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      lastBtn.dispatchEvent(homeEvent);

      expect(document.activeElement).toBe(firstBtn);
    });

    it('should select category with Enter or Space', () => {
      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const secondBtn = categoryBtns[1];

      secondBtn.focus();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      secondBtn.dispatchEvent(enterEvent);

      // Selecting rerenders the category buttons synchronously, so inspect the
      // current DOM rather than the detached pre-render button reference.
      const activeButton = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeButton?.textContent).toBe(secondBtn.textContent);
    });

    it('should navigate preset grid with all arrow keys', () => {
      const cards = container.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      const firstCard = cards[0];
      const secondCard = cards[1];
      const thirdCard = cards[2]; // First card in second row

      firstCard.focus();

      // ArrowRight
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      firstCard.dispatchEvent(rightEvent);
      expect(document.activeElement).toBe(secondCard);

      // ArrowDown (should go to card in row below)
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      firstCard.dispatchEvent(downEvent);
      expect(document.activeElement).toBe(thirdCard);
    });

    it('should select preset with Enter or Space in grid', () => {
      const cards = container.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      const firstCard = cards[0];

      firstCard.focus();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      firstCard.dispatchEvent(enterEvent);

      expect(mockOnPresetSelect).toHaveBeenCalled();
    });

    it('should focus apply button with Escape key', () => {
      const cards = container.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      const firstCard = cards[0];

      firstCard.focus();
      firstCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      // Escape is documented to return focus to Apply. First select a preset,
      // because a disabled button cannot receive focus.
      const selectedCard = container.querySelector('.cf-preset-picker__card') as HTMLButtonElement;
      const applyBtn = container.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(false);
      selectedCard.focus();

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      selectedCard.dispatchEvent(escapeEvent);

      expect(document.activeElement).toBe(applyBtn);
    });

    it('should navigate popular presets with arrow keys', () => {
      const popularCards = container.querySelectorAll('.cf-preset-picker__popular-card') as NodeListOf<HTMLButtonElement>;
      if (popularCards.length > 1) {
        const firstCard = popularCards[0];
        const secondCard = popularCards[1];

        firstCard.focus();

        const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        firstCard.dispatchEvent(rightEvent);

        expect(document.activeElement).toBe(secondCard);
      }
    });
  });

  describe('Screen reader support', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should have screen reader only announcer element', () => {
      const announcer = container.querySelector('.cf-preset-picker__sr-only');
      expect(announcer).toBeInTheDocument();
      expect(announcer?.getAttribute('aria-live')).toBe('polite');

      const styles = window.getComputedStyle(announcer as Element);
      expect(styles.position).toBe('absolute');
      expect(styles.width).toBe('1px');
      expect(styles.height).toBe('1px');
    });

    it('should announce category changes', async () => {
      const categoryBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
      categoryBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const announcer = container.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.textContent).toContain('category selected');
      expect(announcer?.textContent).toContain('presets available');
    });

    it('should announce search results', async () => {
      const searchInput = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      searchInput.value = 'red';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 50));

      const announcer = container.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.textContent).toMatch(/\d+ preset(s)? found/);
    });

    it('should have descriptive aria-labels on interactive elements', () => {
      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('aria-label')).toBe('Search presets');

      const applyBtn = container.querySelector('.cf-preset-picker__apply-btn');
      expect(applyBtn?.getAttribute('aria-label')).toBe('Apply selected preset');

      const cards = container.querySelectorAll('.cf-preset-picker__card');
      cards.forEach(card => {
        const label = card.getAttribute('aria-label');
        expect(label).toBeTruthy();
        expect(label).toContain('.');
      });
    });
  });

  describe('Focus management', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should use roving tabindex for category buttons', () => {
      const activeBtn = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeBtn?.getAttribute('tabindex')).toBe('0');

      const inactiveBtns = container.querySelectorAll('.cf-preset-picker__category-btn:not(.cf-preset-picker__category-btn--active)');
      inactiveBtns.forEach(btn => {
        expect(btn.getAttribute('tabindex')).toBe('-1');
      });
    });

    it('should update tabindex when category changes', async () => {
      const firstBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[0] as HTMLButtonElement;
      const secondBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;

      expect(firstBtn.getAttribute('tabindex')).toBe('0');
      expect(secondBtn.getAttribute('tabindex')).toBe('-1');

      secondBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const newSecondBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
      expect(newSecondBtn.getAttribute('tabindex')).toBe('0');
    });

    it('should use roving tabindex for preset cards', () => {
      // Initially, no preset is selected, so all should have tabindex="-1"
      const cards = container.querySelectorAll('.cf-preset-picker__card');
      cards.forEach(card => {
        expect(card.getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  describe('Disabled state accessibility', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should disable apply button when no preset selected', () => {
      const applyBtn = container.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(true);
    });

    it('should enable apply button when preset is selected', async () => {
      const firstCard = container.querySelector('.cf-preset-picker__card') as HTMLButtonElement;
      firstCard.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      const applyBtn = container.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(false);
    });
  });

  describe('CSS accessibility features', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: true,
      });
    });

    it('should have focus-visible styles in injected CSS', () => {
      const styles = document.getElementById('cf-preset-picker-styles');
      expect(styles?.textContent).toContain(':focus-visible');
      expect(styles?.textContent).toContain('outline: 2px solid #007acc');
    });

    it('should have high contrast mode support', () => {
      const styles = document.getElementById('cf-preset-picker-styles');
      expect(styles?.textContent).toContain('@media (prefers-contrast: high)');
      expect(styles?.textContent).toContain('border-width: 2px');
    });

    it('should have reduced motion support', () => {
      const styles = document.getElementById('cf-preset-picker-styles');
      expect(styles?.textContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(styles?.textContent).toContain('transition: none');
    });
  });

  describe('Popular presets accessibility', () => {
    beforeEach(() => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        showPopular: true,
        enableA11y: true,
      });
    });

    it('should have a named group for popular preset controls', () => {
      const popular = container.querySelector('.cf-preset-picker__popular-grid');
      expect(popular?.getAttribute('role')).toBe('group');
      expect(popular?.getAttribute('aria-label')).toBe('Popular presets');
    });

    it('should expose popular preset selection on native buttons', () => {
      const popularCards = container.querySelectorAll('.cf-preset-picker__popular-card');
      if (popularCards.length > 0) {
        popularCards.forEach(card => {
          expect(card.tagName).toBe('BUTTON');
          expect(card.hasAttribute('role')).toBe(false);
          expect(card.getAttribute('aria-label')).toBeTruthy();
          expect(card.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
          expect(card.hasAttribute('aria-selected')).toBe(false);
        });
      }
    });

    it('should use roving tabindex for popular presets', () => {
      const popularCards = container.querySelectorAll('.cf-preset-picker__popular-card');
      if (popularCards.length > 0) {
        // All should have tabindex="-1" initially (no preset selected)
        popularCards.forEach(card => {
          expect(card.getAttribute('tabindex')).toBe('-1');
        });
      }
    });
  });

  describe('Feature toggle testing', () => {
    it('should not add ARIA attributes when enableA11y is false', () => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: false,
      });

      const wrapper = container.querySelector('.cf-preset-picker');
      expect(wrapper?.getAttribute('role')).toBeNull();

      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('role')).toBeNull();

      const categories = container.querySelector('.cf-preset-picker__categories');
      expect(categories?.getAttribute('role')).toBeNull();
    });

    it('should not add keyboard navigation when enableA11y is false', () => {
      picker = new CFPresetPicker(container, {
        onPresetSelect: mockOnPresetSelect,
        onApply: mockOnApply,
        enableA11y: false,
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const secondBtn = categoryBtns[1];

      firstBtn.focus();

      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      firstBtn.dispatchEvent(rightEvent);

      // Focus should not change when accessibility is disabled
      expect(document.activeElement).toBe(firstBtn);
    });
  });
});
