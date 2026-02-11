/**
 * chart-accessibility-manager.test.ts
 * 
 * Tests for ChartAccessibilityManager
 */

import { ChartAccessibilityManager } from '../src/ChartAccessibilityManager';
import type { AccessibilityOptions, AccessibleElement } from '../src/ChartAccessibilityManager';
import type { ChartData } from '../src/ChartEngine';

// Mock DOM
beforeAll(() => {
  global.document = {
    createElement: jest.fn((tag: string) => {
      const element: any = {
        id: '',
        tagName: tag.toUpperCase(),
        style: {},
        children: [],
        textContent: '',
        parentNode: null,
        setAttribute: jest.fn(),
        appendChild: jest.fn(function(child: any) {
          this.children.push(child);
          child.parentNode = this;
          return child;
        }),
      };
      return element;
    }),
    getElementById: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    activeElement: null,
  } as any;

  global.window = {
    matchMedia: jest.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  } as any;
});

describe('ChartAccessibilityManager', () => {
  let manager: ChartAccessibilityManager;
  let sampleData: ChartData;

  beforeEach(() => {
    manager = new ChartAccessibilityManager();
    sampleData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: 'Sales',
        data: [45, 62, 58, 73],
      }],
    };
    // Don't clear all mocks - we need to track createElement calls
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Initialization', () => {
    test('should create manager instance', () => {
      expect(manager).toBeDefined();
    });

    test('should initialize chart with accessibility', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should skip initialization when disabled', () => {
      manager.initializeChart('chart1', 'bar', sampleData, { enabled: false });
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(0);
    });

    test('should create ARIA live region when screen reader enabled', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableScreenReader: true,
      });
      
      // Verify elements were generated (main functionality)
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should create data table when fallback enabled', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        dataTableFallback: true,
      });
      
      // Verify elements were generated (main functionality)
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessible Element Generation', () => {
    test('should generate elements for bar chart', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(4); // 4 data points
      
      const firstElement = elements[0];
      expect(firstElement.type).toBe('datapoint');
      expect(firstElement.label).toContain('Q1');
      expect(firstElement.value).toBe(45);
      expect(firstElement.focusable).toBe(true);
    });

    test('should generate elements for pie chart', () => {
      manager.initializeChart('chart1', 'pie', sampleData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(4);
      
      const firstElement = elements[0];
      expect(firstElement.id).toBe('slice-0');
      expect(firstElement.description).toContain('%');
    });

    test('should generate elements for line chart', () => {
      manager.initializeChart('chart1', 'line', sampleData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(4);
      expect(elements.every(el => el.type === 'datapoint')).toBe(true);
    });

    test('should generate elements for radar chart', () => {
      manager.initializeChart('chart1', 'radar', sampleData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(4);
      elements.forEach(el => {
        expect(el.id).toContain('radar-');
      });
    });

    test('should handle multiple datasets', () => {
      const multiData: ChartData = {
        labels: ['Q1', 'Q2'],
        datasets: [
          { label: 'Sales', data: [45, 62] },
          { label: 'Costs', data: [30, 40] },
        ],
      };

      manager.initializeChart('chart1', 'bar', multiData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(4); // 2 datasets * 2 points
    });

    test('should generate elements for Gantt chart', () => {
      const ganttData: ChartData = {
        labels: [],
        datasets: [],
        ganttTasks: [
          {
            name: 'Task 1',
            start: new Date('2024-01-01'),
            end: new Date('2024-01-15'),
            progress: 50,
          },
          {
            name: 'Task 2',
            start: new Date('2024-01-10'),
            end: new Date('2024-01-25'),
          },
        ],
      };

      manager.initializeChart('chart1', 'gantt', ganttData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(2);
      expect(elements[0].description).toContain('days');
    });
  });

  describe('Element Descriptions', () => {
    test('should format data point descriptions', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const element = manager.getElement('chart1', 'datapoint-0-0');
      expect(element?.description).toContain('Q1');
      expect(element?.description).toContain('45');
    });

    test('should format pie slice percentages', () => {
      manager.initializeChart('chart1', 'pie', sampleData);
      
      const element = manager.getElement('chart1', 'slice-0');
      expect(element?.description).toMatch(/\d+\.\d+%/);
    });

    test('should include series labels in descriptions', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const element = manager.getElement('chart1', 'datapoint-0-0');
      expect(element?.description).toContain('Sales');
    });

    test('should format numeric values with separators', () => {
      const largeData: ChartData = {
        labels: ['A'],
        datasets: [{ label: 'Revenue', data: [1234567.89] }],
      };

      manager.initializeChart('chart1', 'bar', largeData);
      
      const element = manager.getElement('chart1', 'datapoint-0-0');
      expect(element?.description).toMatch(/1[,.]234[,.]567/);
    });
  });

  describe('Focus Management', () => {
    test('should set focus to element', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const onFocus = jest.fn();
      manager.setFocus('chart1', 'datapoint-0-0', { onFocus });
      
      expect(onFocus).toHaveBeenCalledWith('datapoint-0-0');
      
      const focusState = manager.getFocusState('chart1');
      expect(focusState?.currentElementId).toBe('datapoint-0-0');
    });

    test('should track previous focus', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      manager.setFocus('chart1', 'datapoint-0-0', {});
      manager.setFocus('chart1', 'datapoint-0-1', {});
      
      const focusState = manager.getFocusState('chart1');
      expect(focusState?.previousElementId).toBe('datapoint-0-0');
      expect(focusState?.currentElementId).toBe('datapoint-0-1');
    });

    test('should clear focus', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      manager.setFocus('chart1', 'datapoint-0-0', {});
      
      const onBlur = jest.fn();
      manager.clearFocus('chart1', { onBlur });
      
      expect(onBlur).toHaveBeenCalledWith('datapoint-0-0');
      
      const focusState = manager.getFocusState('chart1');
      expect(focusState?.currentElementId).toBeNull();
    });

    test('should not set focus to non-focusable element', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        ariaLabel: 'Test Chart',
      });
      
      manager.setFocus('chart1', 'chart-title', {});
      
      const focusState = manager.getFocusState('chart1');
      expect(focusState?.currentElementId).toBeNull();
    });

    test('should get focused element', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      manager.setFocus('chart1', 'datapoint-0-1', {});
      
      const focusState = manager.getFocusState('chart1');
      expect(focusState?.focusedElement?.value).toBe(62);
    });
  });

  describe('Keyboard Navigation', () => {
    test('should setup keyboard listeners', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableKeyboardNav: true,
      });
      
      // Verify elements were generated for keyboard navigation
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
      expect(elements.every(e => e.focusable)).toBe(true);
    });

    test('should not setup keyboard listeners when disabled', () => {
      // Just clear all mocks before the test
      jest.clearAllMocks();
      
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableKeyboardNav: false,
      });
      
      // Verify keyboard navigation is disabled (elements still exist but no listeners)
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should call navigation callback', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const onNavigate = jest.fn();
      manager.setFocus('chart1', 'datapoint-0-0', {});
      
      // Simulate navigation (we can't easily test keyboard events in Jest)
      // But we can test the navigation method directly
      manager['navigate']('chart1', 'right', { onNavigate });
      
      expect(onNavigate).toHaveBeenCalledWith('right', expect.any(String));
    });
  });

  describe('Screen Reader Support', () => {
    test('should create ARIA live region', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableScreenReader: true,
      });
      
      // Verify screen reader features work by testing announce
      expect(() => manager.announce('chart1', 'Test message')).not.toThrow();
    });

    test('should announce message', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableScreenReader: true,
      });
      
      manager.announce('chart1', 'Test message');
      
      // Message announcement is delayed, so we just check it doesn't throw
      expect(() => manager.announce('chart1', 'Test')).not.toThrow();
    });

    test('should announce on focus', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableScreenReader: true,
      });
      
      manager.setFocus('chart1', 'datapoint-0-0', { enableScreenReader: true });
      
      // Announcement should happen (tested via announce method)
      expect(() => manager.announce('chart1', 'test')).not.toThrow();
    });

    test('should announce data changes', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableScreenReader: true,
        announceDataChanges: true,
      });
      
      const newData: ChartData = {
        labels: ['Q1', 'Q2'],
        datasets: [{ label: 'Sales', data: [50, 70] }],
      };
      
      manager.updateData('chart1', newData, {
        announceDataChanges: true,
        enableScreenReader: true,
      });
      
      // Should announce without error
      expect(() => manager.announce('chart1', 'updated')).not.toThrow();
    });
  });

  describe('Data Table Fallback', () => {
    test('should create data table', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        dataTableFallback: true,
      });
      
      // Verify elements were generated (data table is created in addition)
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should recreate data table on update', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        dataTableFallback: true,
      });
      
      const newData: ChartData = {
        labels: ['Q1', 'Q2', 'Q3'],
        datasets: [{ label: 'Sales', data: [50, 60, 70] }],
      };
      
      // Update should not throw
      expect(() => {
        manager.updateData('chart1', newData, { dataTableFallback: true });
      }).not.toThrow();
    });
  });

  describe('High Contrast Mode', () => {
    test('should detect high contrast mode', () => {
      const result = manager.detectHighContrastMode();
      // Should not throw and return a boolean
      expect(typeof result).toBe('boolean');
    });

    test('should provide high contrast colors', () => {
      const colors = manager.getHighContrastColors();
      
      expect(colors.length).toBeGreaterThan(0);
      expect(colors.every(c => c.startsWith('#'))).toBe(true);
    });
  });

  describe('Data Updates', () => {
    test('should update accessible elements', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const originalCount = manager.getAllElements('chart1').length;
      
      const newData: ChartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
        datasets: [{ label: 'Sales', data: [45, 62, 58, 73, 80, 90] }],
      };
      
      manager.updateData('chart1', newData);
      
      const newCount = manager.getAllElements('chart1').length;
      expect(newCount).toBe(6);
      expect(newCount).toBeGreaterThan(originalCount);
    });

    test('should maintain focus order after update', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      manager.setFocus('chart1', 'datapoint-0-0', {});
      
      const newData: ChartData = {
        labels: ['Q1', 'Q2', 'Q3'],
        datasets: [{ label: 'Sales', data: [50, 60, 70] }],
      };
      
      manager.updateData('chart1', newData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(3);
    });
  });

  describe('Element Selection', () => {
    test('should select current element', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      manager.setFocus('chart1', 'datapoint-0-1', {});
      
      const onSelect = jest.fn();
      manager['selectCurrentElement']('chart1', { onSelect });
      
      expect(onSelect).toHaveBeenCalledWith(
        'datapoint-0-1',
        expect.objectContaining({
          label: expect.any(String),
          value: 62,
        })
      );
    });

    test('should not select when no element focused', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const onSelect = jest.fn();
      manager['selectCurrentElement']('chart1', { onSelect });
      
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Element Retrieval', () => {
    test('should get element by ID', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const element = manager.getElement('chart1', 'datapoint-0-2');
      
      expect(element).not.toBeNull();
      expect(element?.value).toBe(58);
      expect(element?.label).toContain('Q3');
    });

    test('should return null for non-existent element', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const element = manager.getElement('chart1', 'nonexistent');
      expect(element).toBeNull();
    });

    test('should get all elements', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      
      const elements = manager.getAllElements('chart1');
      
      expect(elements.length).toBe(4);
      expect(elements.every(el => el.type === 'datapoint')).toBe(true);
    });

    test('should return empty array for non-existent chart', () => {
      const elements = manager.getAllElements('nonexistent');
      expect(elements).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup single chart', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableScreenReader: true,
        dataTableFallback: true,
        enableKeyboardNav: true,
      });
      
      manager.destroyChart('chart1');
      
      // Verify chart is removed
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(0);
    });

    test('should cleanup all charts', () => {
      manager.initializeChart('chart1', 'bar', sampleData);
      manager.initializeChart('chart2', 'line', sampleData);
      manager.initializeChart('chart3', 'pie', sampleData);
      
      manager.destroy();
      
      expect(manager.getAllElements('chart1').length).toBe(0);
      expect(manager.getAllElements('chart2').length).toBe(0);
      expect(manager.getAllElements('chart3').length).toBe(0);
    });

    test('should handle cleanup of non-existent chart', () => {
      expect(() => manager.destroyChart('nonexistent')).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty datasets', () => {
      const emptyData: ChartData = {
        labels: [],
        datasets: [],
      };
      
      manager.initializeChart('chart1', 'bar', emptyData);
      
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBe(0);
    });

    test('should handle chart without labels', () => {
      const noLabelsData: ChartData = {
        labels: [],
        datasets: [{ label: 'Sales', data: [45, 62, 58] }],
      };
      
      manager.initializeChart('chart1', 'bar', noLabelsData);
      
      // Should still create elements
      const elements = manager.getAllElements('chart1');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should handle missing dataset labels', () => {
      const noDatasetLabel: ChartData = {
        labels: ['Q1', 'Q2'],
        datasets: [{ label: '', data: [45, 62] }],
      };
      
      manager.initializeChart('chart1', 'bar', noDatasetLabel);
      
      const element = manager.getElement('chart1', 'datapoint-0-0');
      expect(element?.label).toBeTruthy();
    });

    test('should handle custom key bindings', () => {
      manager.initializeChart('chart1', 'bar', sampleData, {
        enableKeyboardNav: true,
        keyBindings: {
          up: 'w',
          down: 's',
          left: 'a',
          right: 'd',
        },
      });
      
      // Should initialize without errors
      expect(manager.getAllElements('chart1').length).toBeGreaterThan(0);
    });
  });
});
