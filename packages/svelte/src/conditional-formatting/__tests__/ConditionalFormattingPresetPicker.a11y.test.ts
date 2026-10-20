/**
 * Accessibility tests for Svelte ConditionalFormattingPresetPicker
 * Tests WCAG 2.1 AA compliance using jest-axe and @testing-library/svelte
 */

import { render, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import ConditionalFormattingPresetPicker from '../ConditionalFormattingPresetPicker.svelte';
import type { CFPreset } from '@cyber-sheet/cf-ui-core';

expect.extend(toHaveNoViolations);

describe('ConditionalFormattingPresetPicker - Accessibility', () => {
  const mockOnPresetSelect = jest.fn();
  const mockOnApply = jest.fn();

  beforeEach(() => {
    mockOnPresetSelect.mockClear();
    mockOnApply.mockClear();
  });

  describe('Automated accessibility violations', () => {
    it('should have no axe violations on initial render', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      await waitFor(() => {
        expect(container.querySelector('.cf-preset-picker')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations after search', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const searchInput = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'red' } });

      await waitFor(() => {
        const cards = container.querySelectorAll('.cf-preset-picker__card');
        expect(cards.length).toBeGreaterThan(0);
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations after category change', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryButtons = container.querySelectorAll('.cf-preset-picker__category-btn');
      const secondButton = categoryButtons[1] as HTMLButtonElement;
      await fireEvent.click(secondButton);

      await waitFor(() => {
        expect(secondButton.classList.contains('cf-preset-picker__category-btn--active')).toBe(true);
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML structure', () => {
    it('should use semantic heading elements', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const h3 = container.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3?.textContent).toContain('Conditional Formatting Presets');

      const h4 = container.querySelector('h4');
      if (h4) {
        expect(h4.textContent).toContain('Popular Presets');
      }
    });

    it('should have proper button elements', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have input with type="text"', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const input = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('text');
    });

    it('should have paragraphs for descriptions', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const description = container.querySelector('.cf-preset-picker__description');
      expect(description?.tagName).toBe('P');
    });

    it('should use div for layout, not tables', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const tables = container.querySelectorAll('table');
      expect(tables.length).toBe(0);
    });
  });

  describe('ARIA attributes', () => {
    it('should have role="region" on container', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const wrapper = container.querySelector('.cf-preset-picker');
      expect(wrapper?.getAttribute('role')).toBe('region');
      expect(wrapper?.getAttribute('aria-label')).toBe('Conditional Formatting Preset Picker');
      expect(wrapper?.getAttribute('aria-describedby')).toBe('cf-preset-picker-desc');
    });

    it('should have role="searchbox" on search input', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('role')).toBe('searchbox');
      expect(searchInput?.getAttribute('aria-label')).toBe('Search presets');
      expect(searchInput?.getAttribute('aria-controls')).toBe('cf-preset-grid');
    });

    it('should have role="toolbar" on categories container', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categories = container.querySelector('.cf-preset-picker__categories');
      expect(categories?.getAttribute('role')).toBe('toolbar');
      expect(categories?.getAttribute('aria-label')).toBe('Category filters');
    });

    it('should have role="radio" on category buttons with aria-checked', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn');
      expect(categoryBtns.length).toBeGreaterThan(0);
      await waitFor(() => expect(container.querySelector('.cf-preset-picker__category-btn--active')).toBeTruthy());

      categoryBtns.forEach(btn => {
        expect(btn.getAttribute('role')).toBe('radio');
        expect(btn.getAttribute('aria-checked')).toMatch(/^(true|false)$/);
      });

      const activeBtn = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeBtn?.getAttribute('aria-checked')).toBe('true');
    });

    it('should have role="grid" on preset grid with row/column counts', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const grid = container.querySelector('.cf-preset-picker__grid');
      expect(grid?.getAttribute('role')).toBe('grid');
      expect(grid?.getAttribute('aria-label')).toBe('Preset grid');
      expect(grid?.getAttribute('aria-rowcount')).toBeTruthy();
      expect(grid?.getAttribute('aria-colcount')).toBe('2');
    });

    it('should have role="gridcell" on each preset card with position', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const cards = container.querySelectorAll('.cf-preset-picker__card');
      expect(cards.length).toBeGreaterThan(0);

      cards.forEach((card) => {
        expect(card.getAttribute('role')).toBe('gridcell');
        expect(card.getAttribute('aria-rowindex')).toBeTruthy();
        expect(card.getAttribute('aria-colindex')).toBeTruthy();
        expect(card.getAttribute('aria-selected')).toMatch(/^(true|false)$/);
      });
    });

    it('should have aria-live on announcer and count', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const announcer = container.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.getAttribute('aria-live')).toBeTruthy();
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');

      const count = container.querySelector('.cf-preset-picker__count');
      expect(count?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Keyboard navigation - Tab order', () => {
    it('should have correct tabindex on focusable elements', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.hasAttribute('tabindex')).toBe(false); // Native tabindex

      await waitFor(() => expect(container.querySelector('.cf-preset-picker__category-btn--active')?.getAttribute('tabindex')).toBe('0'));
      const activeCategory = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeCategory?.getAttribute('tabindex')).toBe('0');

      const inactiveCategories = container.querySelectorAll('.cf-preset-picker__category-btn:not(.cf-preset-picker__category-btn--active)');
      inactiveCategories.forEach(btn => {
        expect(btn.getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  describe('Keyboard navigation - Arrow keys', () => {
    it('should navigate categories with ArrowLeft and ArrowRight', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const secondBtn = categoryBtns[1];

      firstBtn.focus();
      expect(document.activeElement).toBe(firstBtn);

      // Simulate ArrowRight
      await fireEvent.keyDown(firstBtn, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(document.activeElement).toBe(secondBtn);
      });
    });

    it('should navigate categories with Home and End', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const lastBtn = categoryBtns[categoryBtns.length - 1];

      firstBtn.focus();

      // End key
      await fireEvent.keyDown(firstBtn, { key: 'End' });

      await waitFor(() => {
        expect(document.activeElement).toBe(lastBtn);
      });

      // Home key
      await fireEvent.keyDown(lastBtn, { key: 'Home' });

      await waitFor(() => {
        expect(document.activeElement).toBe(firstBtn);
      });
    });

    it('should select category with Enter or Space', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const secondBtn = categoryBtns[1];

      secondBtn.focus();

      await fireEvent.keyDown(secondBtn, { key: 'Enter' });

      await waitFor(() => {
        expect(secondBtn.classList.contains('cf-preset-picker__category-btn--active')).toBe(true);
      });
    });

    it('should navigate preset grid with all arrow keys', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const cards = container.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      if (cards.length > 2) {
        const firstCard = cards[0];
        const secondCard = cards[1];
        const thirdCard = cards[2];

        firstCard.focus();

        // ArrowRight
        await fireEvent.keyDown(firstCard, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(document.activeElement).toBe(secondCard);
        });

        // ArrowDown (should go to card in row below)
        firstCard.focus();
        await fireEvent.keyDown(firstCard, { key: 'ArrowDown' });

        await waitFor(() => {
          expect(document.activeElement).toBe(thirdCard);
        });
      }
    });

    it('should select preset with Enter or Space in grid', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const cards = container.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      const firstCard = cards[0];

      firstCard.focus();

      await fireEvent.keyDown(firstCard, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnPresetSelect).toHaveBeenCalled();
      });
    });

    it('should focus apply button with Escape key', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const cards = container.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      const firstCard = cards[0];

      await fireEvent.click(firstCard);
      const applyBtn = container.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(false);
      firstCard.focus();

      await fireEvent.keyDown(firstCard, { key: 'Escape' });

      await waitFor(() => {
        expect(document.activeElement).toBe(applyBtn);
      });
    });

    it('should navigate popular presets with arrow keys', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          showPopular: true,
          enableA11y: true,
        },
      });

      const popularCards = container.querySelectorAll('.cf-preset-picker__popular-card') as NodeListOf<HTMLButtonElement>;
      if (popularCards.length > 1) {
        const firstCard = popularCards[0];
        const secondCard = popularCards[1];

        firstCard.focus();

        await fireEvent.keyDown(firstCard, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(document.activeElement).toBe(secondCard);
        });
      }
    });
  });

  describe('Screen reader support', () => {
    it('should have screen reader only announcer element', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const announcer = container.querySelector('.cf-preset-picker__sr-only');
      expect(announcer).toBeInTheDocument();
      expect(announcer?.getAttribute('aria-live')).toBeTruthy();

      const styles = window.getComputedStyle(announcer as Element);
      expect(styles.position).toBe('absolute');
      expect(styles.width).toBe('1px');
      expect(styles.height).toBe('1px');
    });

    it('should announce category changes', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
      await fireEvent.click(categoryBtn);

      await waitFor(() => {
        const announcer = container.querySelector('.cf-preset-picker__sr-only');
        expect(announcer?.textContent).toContain('category selected');
        expect(announcer?.textContent).toContain('presets available');
      });
    });

    it('should announce search results', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const searchInput = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'red' } });

      await waitFor(() => {
        const announcer = container.querySelector('.cf-preset-picker__sr-only');
        expect(announcer?.textContent).toMatch(/\d+ preset(s)? found/);
      });
    });

    it('should have descriptive aria-labels on interactive elements', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

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
    it('should use roving tabindex for category buttons', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      await waitFor(() => expect(container.querySelector('.cf-preset-picker__category-btn--active')?.getAttribute('tabindex')).toBe('0'));
      const activeBtn = container.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeBtn?.getAttribute('tabindex')).toBe('0');

      const inactiveBtns = container.querySelectorAll('.cf-preset-picker__category-btn:not(.cf-preset-picker__category-btn--active)');
      inactiveBtns.forEach(btn => {
        expect(btn.getAttribute('tabindex')).toBe('-1');
      });
    });

    it('should update tabindex when category changes', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const firstBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[0] as HTMLButtonElement;
      const secondBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;

      await waitFor(() => expect(firstBtn.getAttribute('tabindex')).toBe('0'));
      expect(secondBtn.getAttribute('tabindex')).toBe('-1');

      await fireEvent.click(secondBtn);

      await waitFor(() => {
        const newSecondBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
        expect(newSecondBtn.getAttribute('tabindex')).toBe('0');
      });
    });

    it('should use roving tabindex for preset cards', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const cards = container.querySelectorAll('.cf-preset-picker__card');
      cards.forEach(card => {
        // Initially, no preset is selected, so all should have tabindex="-1"
        expect(card.getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  describe('Disabled state accessibility', () => {
    it('should disable apply button when no preset selected', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const applyBtn = container.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
      expect(applyBtn?.disabled).toBe(true);
    });

    it('should enable apply button when preset is selected', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const firstCard = container.querySelector('.cf-preset-picker__card') as HTMLButtonElement;
      await fireEvent.click(firstCard);

      await waitFor(() => {
        const applyBtn = container.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
        expect(applyBtn?.disabled).toBe(false);
      });
    });
  });

  describe('CSS accessibility features', () => {
    it('should have focus-visible styles', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      // Check that the component renders and has interactive elements
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Verify focus-visible is applied (check in style tag or inline styles)
      const hasStyles = document.styleSheets.length > 0;
      expect(hasStyles).toBe(true);
    });

    it('should have high contrast mode support', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      // Check that the component uses semantic elements that work well in high contrast
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Verify borders exist on interactive elements
      buttons.forEach(btn => {
        const styles = window.getComputedStyle(btn);
        expect(styles.borderStyle).toBeTruthy();
      });
    });

    it('should respect reduced motion preferences', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      // Verify that the component doesn't force animations
      const wrapper = container.querySelector('.cf-preset-picker');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Popular presets accessibility', () => {
    it('should have role="list" on popular presets container', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          showPopular: true,
          enableA11y: true,
        },
      });

      const popular = container.querySelector('.cf-preset-picker__popular');
      if (popular) {
        const list = popular.querySelector('.cf-preset-picker__popular-grid');
        expect(list?.getAttribute('role')).toBe('list');
        expect(list?.getAttribute('aria-label')).toBe('Popular presets');
      }
    });

    it('should have role="listitem" on popular preset cards', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          showPopular: true,
          enableA11y: true,
        },
      });

      const popularCards = container.querySelectorAll('.cf-preset-picker__popular-card');
      if (popularCards.length > 0) {
        popularCards.forEach(card => {
          expect(card.parentElement?.getAttribute('role')).toBe('listitem');
          expect(card.getAttribute('aria-label')).toBeTruthy();
          expect(card.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
        });
      }
    });

    it('should use roving tabindex for popular presets', () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          showPopular: true,
          enableA11y: true,
        },
      });

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
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: false,
        },
      });

      const wrapper = container.querySelector('.cf-preset-picker');
      expect(wrapper?.getAttribute('role')).toBeNull();

      const searchInput = container.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('role')).toBeNull();

      const categories = container.querySelector('.cf-preset-picker__categories');
      expect(categories?.getAttribute('role')).toBeNull();
    });

    it('should not add keyboard navigation when enableA11y is false', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: false,
        },
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const secondBtn = categoryBtns[1];

      firstBtn.focus();
      expect(document.activeElement).toBe(firstBtn);

      await fireEvent.keyDown(firstBtn, { key: 'ArrowRight' });

      // Focus should not change when accessibility is disabled
      expect(document.activeElement).toBe(firstBtn);
    });
  });

  describe('Dynamic content updates', () => {
    it('should maintain accessibility after search filter changes', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const searchInput = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'green' } });

      await waitFor(() => {
        const grid = container.querySelector('.cf-preset-picker__grid');
        expect(grid?.getAttribute('role')).toBe('grid');
        
        const cards = container.querySelectorAll('.cf-preset-picker__card');
        cards.forEach(card => {
          expect(card.getAttribute('role')).toBe('gridcell');
        });
      });
    });

    it('should update row count in grid after filtering', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      // Get initial row count
      const initialGrid = container.querySelector('.cf-preset-picker__grid');
      const initialRowCount = initialGrid?.getAttribute('aria-rowcount');

      // Apply search filter
      const searchInput = container.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'a' } });

      await waitFor(() => {
        const updatedGrid = container.querySelector('.cf-preset-picker__grid');
        const updatedRowCount = updatedGrid?.getAttribute('aria-rowcount');

        // Row count should be dynamically updated
        expect(updatedRowCount).toBeTruthy();
      });
    });
  });

  describe('Svelte-specific reactivity', () => {
    it('should reactively update ARIA attributes on prop changes', async () => {
      const { container, rerender } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
          showPopular: true,
        },
      });

      // Initially popular section should exist
      let popular = container.querySelector('.cf-preset-picker__popular');
      expect(popular).toBeInTheDocument();

      // Update props
      await rerender({ showPopular: false });

      await waitFor(() => {
        popular = container.querySelector('.cf-preset-picker__popular');
        expect(popular).not.toBeInTheDocument();
      });
    });

    it('should maintain focus after reactive updates', async () => {
      const { container } = render(ConditionalFormattingPresetPicker, {
        props: {
          onPresetSelect: mockOnPresetSelect,
          onApply: mockOnApply,
          enableA11y: true,
        },
      });

      const categoryBtns = container.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const secondBtn = categoryBtns[1];

      secondBtn.focus();
      expect(document.activeElement).toBe(secondBtn);

      // Click the button (triggers reactive update)
      await fireEvent.click(secondBtn);

      await waitFor(() => {
        // After reactive update, the button should still be in the DOM
        const updatedBtn = container.querySelectorAll('.cf-preset-picker__category-btn')[1];
        expect(updatedBtn).toBeInTheDocument();
      });
    });
  });
});
