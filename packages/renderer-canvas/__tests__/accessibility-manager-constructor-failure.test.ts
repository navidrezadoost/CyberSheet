import { Worksheet } from '../../core/src/worksheet';
import { AccessibilityManager } from '../src/AccessibilityManager';

describe('AccessibilityManager constructor failure cleanup', () => {
  test('a zero-based initial cell read fails without ARIA publication or active listeners', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const worksheet = new Worksheet('Standalone', 4, 4);
    const getCell = jest.spyOn(worksheet, 'getCell');
    const appended: HTMLElement[] = [];
    const appendChild = jest.spyOn(container, 'appendChild').mockImplementation((node) => {
      appended.push(node as HTMLElement);
      return appendChildOriginal(node);
    });
    const appendChildOriginal = HTMLElement.prototype.appendChild.bind(container);
    const addEventListener = jest.spyOn(HTMLElement.prototype, 'addEventListener');
    let constructionThrew = false;
    const focusChangesObservedBeforeThrow: boolean[] = [];
    const focusChangeEvents: CustomEvent[] = [];
    container.addEventListener('cyber-sheet-focus-change', (event) => {
      focusChangesObservedBeforeThrow.push(!constructionThrew);
      focusChangeEvents.push(event as CustomEvent);
    });

    try {
      let constructionError: unknown;
      try {
        new AccessibilityManager(container, worksheet);
      } catch (error) {
        constructionThrew = true;
        constructionError = error;
      }

      expect(constructionError).toBeInstanceOf(RangeError);
      expect(constructionError).toMatchObject({ message: expect.stringMatching(/address out of bounds/) });
      expect(getCell).toHaveBeenCalledWith({ row: 0, col: 0 });
      expect(focusChangesObservedBeforeThrow).toEqual([true]);
      expect(focusChangeEvents).toHaveLength(1);
      expect(focusChangeEvents[0].detail).toEqual({
        position: { row: 0, col: 0 },
        isEditing: false,
      });

      const liveRegion = appended.find((element) => element.getAttribute('role') === 'status');
      const focusOverlay = appended.find((element) => element.className === 'cyber-sheet-focus-overlay');
      expect(liveRegion?.textContent).toBe('');
      expect(focusOverlay?.getAttribute('aria-label')).toBeNull();
      expect(container.childElementCount).toBe(0);

      const keydownTarget = addEventListener.mock.contexts.find(
        (target) => (target as HTMLElement).className === 'cyber-sheet-focus-overlay',
      ) as HTMLElement | undefined;
      expect(keydownTarget).toBeDefined();

      const event = new KeyboardEvent('keydown', {
        code: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      keydownTarget?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(focusChangeEvents).toHaveLength(1);
    } finally {
      appendChild.mockRestore();
      addEventListener.mockRestore();
      getCell.mockRestore();
      container.remove();
    }
  });
});
