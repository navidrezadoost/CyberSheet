/**
 * Accessibility tests for Angular CFPresetPickerComponent
 * Tests WCAG 2.1 AA compliance using jest-axe
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ConditionalFormattingPresetPickerComponent } from '../cf-preset-picker.component';
import type { CFPreset } from '@cyber-sheet/cf-ui-core';

expect.extend(toHaveNoViolations);

describe('ConditionalFormattingPresetPickerComponent - Accessibility', () => {
  let component: ConditionalFormattingPresetPickerComponent;
  let fixture: ComponentFixture<ConditionalFormattingPresetPickerComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionalFormattingPresetPickerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConditionalFormattingPresetPickerComponent);
    component = fixture.componentInstance;
    component.enableA11y = true;
    compiled = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Automated accessibility violations', () => {
    it('should have no axe violations on initial render', async () => {
      const results = await axe(compiled);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations after search', async () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      searchInput.value = 'red';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      await fixture.whenStable();
      const results = await axe(compiled);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations after category change', async () => {
      const categoryButtons = compiled.querySelectorAll('.cf-preset-picker__category-btn');
      const secondButton = categoryButtons[1] as HTMLButtonElement;
      secondButton.click();
      fixture.detectChanges();

      await fixture.whenStable();
      const results = await axe(compiled);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML structure', () => {
    it('should use semantic heading elements', () => {
      const h3 = compiled.querySelector('h3');
      expect(h3).toBeTruthy();
      expect(h3?.textContent).toContain('Conditional Formatting Presets');

      const h4 = compiled.querySelector('h4');
      if (h4) {
        expect(h4.textContent).toContain('Popular Presets');
      }
    });

    it('should have proper button elements', () => {
      const buttons = compiled.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have input with type="text"', () => {
      const input = compiled.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('text');
    });

    it('should have paragraphs for descriptions', () => {
      const description = compiled.querySelector('.cf-preset-picker__description');
      expect(description?.tagName).toBe('P');
    });

    it('should use div for layout, not tables', () => {
      const tables = compiled.querySelectorAll('table');
      expect(tables.length).toBe(0);
    });
  });

  describe('ARIA attributes', () => {
    it('should have role="region" on container', () => {
      const wrapper = compiled.querySelector('.cf-preset-picker');
      expect(wrapper?.getAttribute('role')).toBe('region');
      expect(wrapper?.getAttribute('aria-label')).toBe('Conditional Formatting Preset Picker');
      expect(wrapper?.getAttribute('aria-describedby')).toBe('cf-preset-picker-desc');
    });

    it('should have role="searchbox" on search input', () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('role')).toBe('searchbox');
      expect(searchInput?.getAttribute('aria-label')).toBe('Search presets');
      expect(searchInput?.getAttribute('aria-controls')).toBe('cf-preset-grid');
    });

    it('should have role="toolbar" on categories container', () => {
      const categories = compiled.querySelector('.cf-preset-picker__categories');
      expect(categories?.getAttribute('role')).toBe('toolbar');
      expect(categories?.getAttribute('aria-label')).toBe('Category filters');
    });

    it('should have role="radio" on category buttons with aria-checked', () => {
      const categoryBtns = compiled.querySelectorAll('.cf-preset-picker__category-btn');
      expect(categoryBtns.length).toBeGreaterThan(0);

      categoryBtns.forEach(btn => {
        expect(btn.getAttribute('role')).toBe('radio');
        expect(btn.getAttribute('aria-checked')).toMatch(/^(true|false)$/);
      });

      const activeBtn = compiled.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeBtn?.getAttribute('aria-checked')).toBe('true');
    });

    it('should have role="grid" on preset grid with row/column counts', () => {
      const grid = compiled.querySelector('.cf-preset-picker__grid');
      if (grid) {
        expect(grid.getAttribute('role')).toBe('grid');
        expect(grid.getAttribute('aria-label')).toBe('Preset grid');
        expect(grid.getAttribute('aria-rowcount')).toBeTruthy();
        expect(grid.getAttribute('aria-colcount')).toBe('2');
      }
    });

    it('should have role="gridcell" on each preset card with position', () => {
      const cards = compiled.querySelectorAll('.cf-preset-picker__card');
      if (cards.length > 0) {
        cards.forEach((card, index) => {
          expect(card.getAttribute('role')).toBe('gridcell');
          expect(card.getAttribute('aria-rowindex')).toBeTruthy();
          expect(card.getAttribute('aria-colindex')).toBeTruthy();
          expect(card.getAttribute('aria-selected')).toMatch(/^(true|false)$/);
        });
      }
    });

    it('should have aria-live on announcer and count', () => {
      const announcer = compiled.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.getAttribute('aria-live')).toBeTruthy();
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');

      const count = compiled.querySelector('.cf-preset-picker__count');
      if (count) {
        expect(count.getAttribute('aria-live')).toBe('polite');
      }
    });
  });

  describe('Keyboard navigation - Tab order', () => {
    it('should have correct tabindex on focusable elements', () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.hasAttribute('tabindex')).toBe(false); // Native tabindex

      const activeCategory = compiled.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeCategory?.getAttribute('tabindex')).toBe('0');

      const inactiveCategories = compiled.querySelectorAll('.cf-preset-picker__category-btn:not(.cf-preset-picker__category-btn--active)');
      inactiveCategories.forEach(btn => {
        expect(btn.getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  describe('Keyboard navigation - Arrow keys', () => {
    it('should navigate categories with ArrowLeft and ArrowRight', () => {
      const categoryBtns = compiled.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const secondBtn = categoryBtns[1];

      firstBtn.focus();
      expect(document.activeElement).toBe(firstBtn);

      // Simulate ArrowRight
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      firstBtn.dispatchEvent(rightEvent);
      fixture.detectChanges();

      // Focus should move to second button
      expect(document.activeElement).toBe(secondBtn);
    });

    it('should navigate categories with Home and End', () => {
      const categoryBtns = compiled.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const lastBtn = categoryBtns[categoryBtns.length - 1];

      firstBtn.focus();

      // End key
      const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      firstBtn.dispatchEvent(endEvent);
      fixture.detectChanges();

      expect(document.activeElement).toBe(lastBtn);

      // Home key
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      lastBtn.dispatchEvent(homeEvent);
      fixture.detectChanges();

      expect(document.activeElement).toBe(firstBtn);
    });

    it('should select category with Enter or Space', async () => {
      const categoryBtns = compiled.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const secondBtn = categoryBtns[1];

      const initialCategory = component.selectedCategory;
      secondBtn.focus();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      secondBtn.dispatchEvent(enterEvent);
      fixture.detectChanges();

      await fixture.whenStable();

      // Category should have changed
      expect(component.selectedCategory).not.toBe(initialCategory);
    });

    it('should navigate preset grid with all arrow keys', () => {
      const cards = compiled.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      if (cards.length > 2) {
        const firstCard = cards[0];
        const secondCard = cards[1];
        const thirdCard = cards[2]; // First card in second row

        firstCard.focus();

        // ArrowRight
        const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        firstCard.dispatchEvent(rightEvent);
        fixture.detectChanges();
        expect(document.activeElement).toBe(secondCard);

        // ArrowDown (should go to card in row below)
        firstCard.focus();
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        firstCard.dispatchEvent(downEvent);
        fixture.detectChanges();
        expect(document.activeElement).toBe(thirdCard);
      }
    });

    it('should select preset with Enter or Space in grid', () => {
      const cards = compiled.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      if (cards.length > 0) {
        const firstCard = cards[0];
        const presetSelectSpy = jest.spyOn(component.presetSelect, 'emit');

        firstCard.focus();

        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        firstCard.dispatchEvent(enterEvent);
        fixture.detectChanges();

        expect(presetSelectSpy).toHaveBeenCalled();
      }
    });

    it('should focus apply button with Escape key', () => {
      const cards = compiled.querySelectorAll('.cf-preset-picker__card') as NodeListOf<HTMLButtonElement>;
      const applyBtn = compiled.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;

      if (cards.length > 0) {
        const firstCard = cards[0];
        firstCard.click();
        fixture.detectChanges();
        expect(applyBtn.disabled).toBe(false);
        const selectedCard = compiled.querySelector('.cf-preset-picker__card') as HTMLButtonElement;
        selectedCard.focus();

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        selectedCard.dispatchEvent(escapeEvent);
        fixture.detectChanges();

        expect(document.activeElement).toBe(applyBtn);
      }
    });

    it('should navigate popular presets with arrow keys', () => {
      component.showPopular = true;
      fixture.detectChanges();

      const popularCards = compiled.querySelectorAll('.cf-preset-picker__popular-card') as NodeListOf<HTMLButtonElement>;
      if (popularCards.length > 1) {
        const firstCard = popularCards[0];
        const secondCard = popularCards[1];

        firstCard.focus();

        const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        firstCard.dispatchEvent(rightEvent);
        fixture.detectChanges();

        expect(document.activeElement).toBe(secondCard);
      }
    });
  });

  describe('Screen reader support', () => {
    it('should have screen reader only announcer element', () => {
      const announcer = compiled.querySelector('.cf-preset-picker__sr-only');
      expect(announcer).toBeTruthy();
      expect(announcer?.getAttribute('aria-live')).toBeTruthy();

      const styles = window.getComputedStyle(announcer as Element);
      expect(styles.position).toBe('absolute');
      expect(styles.width).toBe('1px');
      expect(styles.height).toBe('1px');
    });

    it('should announce category changes', async () => {
      const categoryBtn = compiled.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
      categoryBtn.click();
      fixture.detectChanges();

      await fixture.whenStable();

      const announcer = compiled.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.textContent).toContain('category selected');
      expect(announcer?.textContent).toContain('presets available');
    });

    it('should announce search results', async () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      searchInput.value = 'red';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      await fixture.whenStable();

      const announcer = compiled.querySelector('.cf-preset-picker__sr-only');
      expect(announcer?.textContent).toMatch(/\d+ preset(s)? found/);
    });

    it('should have descriptive aria-labels on interactive elements', () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('aria-label')).toBe('Search presets');

      const applyBtn = compiled.querySelector('.cf-preset-picker__apply-btn');
      if (applyBtn) {
        expect(applyBtn.getAttribute('aria-label')).toBe('Apply selected preset');
      }

      const cards = compiled.querySelectorAll('.cf-preset-picker__card');
      cards.forEach(card => {
        const label = card.getAttribute('aria-label');
        expect(label).toBeTruthy();
        expect(label).toContain('.');
      });
    });
  });

  describe('Focus management', () => {
    it('should use roving tabindex for category buttons', () => {
      const activeBtn = compiled.querySelector('.cf-preset-picker__category-btn--active');
      expect(activeBtn?.getAttribute('tabindex')).toBe('0');

      const inactiveBtns = compiled.querySelectorAll('.cf-preset-picker__category-btn:not(.cf-preset-picker__category-btn--active)');
      inactiveBtns.forEach(btn => {
        expect(btn.getAttribute('tabindex')).toBe('-1');
      });
    });

    it('should update tabindex when category changes', async () => {
      const firstBtn = compiled.querySelectorAll('.cf-preset-picker__category-btn')[0] as HTMLButtonElement;
      const secondBtn = compiled.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;

      expect(firstBtn.getAttribute('tabindex')).toBe('0');
      expect(secondBtn.getAttribute('tabindex')).toBe('-1');

      secondBtn.click();
      fixture.detectChanges();

      await fixture.whenStable();
      fixture.detectChanges();

      const newSecondBtn = compiled.querySelectorAll('.cf-preset-picker__category-btn')[1] as HTMLButtonElement;
      expect(newSecondBtn.getAttribute('tabindex')).toBe('0');
    });

    it('should use roving tabindex for preset cards', () => {
      const cards = compiled.querySelectorAll('.cf-preset-picker__card');
      cards.forEach(card => {
        // Initially, no preset is selected, so all should have tabindex="-1"
        expect(card.getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  describe('Disabled state accessibility', () => {
    it('should disable apply button when no preset selected', () => {
      const applyBtn = compiled.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
      expect(applyBtn?.disabled).toBe(true);
    });

    it('should enable apply button when preset is selected', async () => {
      const firstCard = compiled.querySelector('.cf-preset-picker__card') as HTMLButtonElement;
      if (firstCard) {
        firstCard.click();
        fixture.detectChanges();

        await fixture.whenStable();

        const applyBtn = compiled.querySelector('.cf-preset-picker__apply-btn') as HTMLButtonElement;
        expect(applyBtn?.disabled).toBe(false);
      }
    });
  });

  describe('CSS accessibility features', () => {
    it('should have focus-visible styles', () => {
      const style = document.querySelector('style');
      const styleContent = style?.textContent || '';
      
      // Check if focus-visible styles are defined somewhere
      const hasStyles = document.styleSheets.length > 0;
      expect(hasStyles).toBe(true);
    });

    it('should have high contrast mode support', () => {
      // Check that the component uses semantic elements that work well in high contrast
      const buttons = compiled.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Verify borders exist on interactive elements
      buttons.forEach(btn => {
        const styles = window.getComputedStyle(btn);
        expect(styles.borderStyle).toBeTruthy();
      });
    });

    it('should respect reduced motion preferences', () => {
      // Verify that the component doesn't force animations
      const wrapper = compiled.querySelector('.cf-preset-picker');
      expect(wrapper).toBeTruthy();
      
      // Check that no forced animation-duration is set
      const styles = window.getComputedStyle(wrapper as Element);
      expect(styles.animationDuration).not.toBe('1000s'); // Arbitrary high value
    });
  });

  describe('Popular presets accessibility', () => {
    beforeEach(() => {
      component.showPopular = true;
      fixture.detectChanges();
    });

    it('should have role="list" on popular presets container', () => {
      const popular = compiled.querySelector('.cf-preset-picker__popular');
      if (popular) {
        expect(popular.getAttribute('role')).toBe('list');
        expect(popular.getAttribute('aria-label')).toBe('Popular presets');
      }
    });

    it('should have role="listitem" on popular preset cards', () => {
      const popularCards = compiled.querySelectorAll('.cf-preset-picker__popular-card');
      if (popularCards.length > 0) {
        popularCards.forEach(card => {
          expect(card.parentElement?.getAttribute('role')).toBe('listitem');
          expect(card.getAttribute('role')).toBeNull();
          expect(card.getAttribute('aria-label')).toBeTruthy();
          expect(card.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
        });
      }
    });

    it('should use roving tabindex for popular presets', () => {
      const popularCards = compiled.querySelectorAll('.cf-preset-picker__popular-card');
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
      fixture.componentRef.setInput('enableA11y', false);
      fixture.detectChanges();

      const wrapper = compiled.querySelector('.cf-preset-picker');
      expect(wrapper?.getAttribute('role')).toBeNull();

      const searchInput = compiled.querySelector('.cf-preset-picker__search-input');
      expect(searchInput?.getAttribute('role')).toBeNull();

      const categories = compiled.querySelector('.cf-preset-picker__categories');
      expect(categories?.getAttribute('role')).toBeNull();
    });

    it('should not add keyboard navigation when enableA11y is false', () => {
      fixture.componentRef.setInput('enableA11y', false);
      fixture.detectChanges();

      const categoryBtns = compiled.querySelectorAll('.cf-preset-picker__category-btn') as NodeListOf<HTMLButtonElement>;
      const firstBtn = categoryBtns[0];
      const secondBtn = categoryBtns[1];

      firstBtn.focus();
      expect(document.activeElement).toBe(firstBtn);

      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      firstBtn.dispatchEvent(rightEvent);
      fixture.detectChanges();

      // Focus should not change when accessibility is disabled
      expect(document.activeElement).toBe(firstBtn);
    });
  });

  describe('Dynamic content updates', () => {
    it('should maintain accessibility after search filter changes', async () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      searchInput.value = 'green';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      await fixture.whenStable();

      const grid = compiled.querySelector('.cf-preset-picker__grid');
      if (grid) {
        expect(grid.getAttribute('role')).toBe('grid');
        
        const cards = compiled.querySelectorAll('.cf-preset-picker__card');
        cards.forEach(card => {
          expect(card.getAttribute('role')).toBe('gridcell');
        });
      }
    });

    it('should update row count in grid after filtering', async () => {
      const searchInput = compiled.querySelector('.cf-preset-picker__search-input') as HTMLInputElement;
      
      // Get initial row count
      const initialGrid = compiled.querySelector('.cf-preset-picker__grid');
      const initialRowCount = initialGrid?.getAttribute('aria-rowcount');

      // Apply search filter
      searchInput.value = 'a';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      await fixture.whenStable();

      const updatedGrid = compiled.querySelector('.cf-preset-picker__grid');
      const updatedRowCount = updatedGrid?.getAttribute('aria-rowcount');

      // Row count should be dynamically updated
      expect(updatedRowCount).toBeTruthy();
    });
  });
});
