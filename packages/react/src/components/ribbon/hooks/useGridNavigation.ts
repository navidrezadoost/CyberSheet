/**
 * Centralized Grid Navigation Hook
 * 
 * Prevents keyboard navigation fragmentation by providing a single,
 * battle-tested implementation shared by ColorGrid, PatternGrid,
 * BorderPresetGrid, LineStyleGrid, and future grids.
 * 
 * Without this:
 * - Inconsistent wrapping behavior
 * - RTL support breaks
 * - Focus leaks across grids
 * - Duplicate arrow key logic in each component
 * 
 * Usage:
 * ```tsx
 * const { focusedIndex, handleKeyDown } = useGridNavigation({
 *   totalItems: 60,
 *   columns: 10,
 *   onSelect: (index) => handleColorSelect(colors[index]),
 * });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface UseGridNavigationOptions {
  /** Total number of items in the grid */
  totalItems: number;

  /** Number of columns (for 2D grids, use 1 for vertical lists) */
  columns: number;

  /** Callback when Enter/Space is pressed on focused item */
  onSelect: (index: number) => void;

  /** Initial focused index (default: 0) */
  initialFocusedIndex?: number;

  /** Enable wrapping at grid edges (default: false) */
  wrap?: boolean;

  /** RTL mode (reverses left/right navigation) */
  rtl?: boolean;

  /** Callback when Escape is pressed (typically closes dropdown) */
  onEscape?: () => void;

  /** Callback when focus moves (for scroll management) */
  onFocusChange?: (index: number) => void;
}

export interface UseGridNavigationResult {
  /** Currently focused index */
  focusedIndex: number;

  /** Set focused index programmatically */
  setFocusedIndex: (index: number) => void;

  /** Keyboard event handler (attach to grid container) */
  handleKeyDown: (event: React.KeyboardEvent) => void;

  /** Props to spread on grid container */
  containerProps: {
    tabIndex: number;
    role: string;
    "aria-label": string;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };

  /** Function to check if specific index is focused */
  isFocused: (index: number) => boolean;

  /** Auto-focus the grid container on mount */
  gridRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Centralized grid navigation hook
 */
export function useGridNavigation({
  totalItems,
  columns,
  onSelect,
  initialFocusedIndex = 0,
  wrap = false,
  rtl = false,
  onEscape,
  onFocusChange,
}: UseGridNavigationOptions): UseGridNavigationResult {
  const [focusedIndex, setFocusedIndexInternal] = useState(
    initialFocusedIndex
  );
  const gridRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const rows = Math.ceil(totalItems / columns);

  /**
   * Set focused index with bounds checking + callback
   */
  const setFocusedIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, totalItems - 1));
      setFocusedIndexInternal(clampedIndex);
      onFocusChange?.(clampedIndex);
    },
    [totalItems, onFocusChange]
  );

  /**
   * Calculate row/column from index
   */
  const getPosition = useCallback(
    (index: number) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      return { row, col };
    },
    [columns]
  );

  /**
   * Calculate index from row/column
   */
  const getIndex = useCallback(
    (row: number, col: number) => {
      return row * columns + col;
    },
    [columns]
  );

  /**
   * Navigate right (handles RTL + wrapping)
   */
  const navigateRight = useCallback(() => {
    const { row, col } = getPosition(focusedIndex);
    const direction = rtl ? -1 : 1;
    const nextCol = col + direction;

    if (nextCol >= 0 && nextCol < columns) {
      const nextIndex = getIndex(row, nextCol);
      if (nextIndex < totalItems) {
        setFocusedIndex(nextIndex);
      }
    } else if (wrap) {
      // Wrap to next/prev row
      const nextRow = row + (nextCol < 0 ? -1 : 1);
      if (nextRow >= 0 && nextRow < rows) {
        const wrapCol = nextCol < 0 ? columns - 1 : 0;
        const wrapIndex = getIndex(nextRow, wrapCol);
        if (wrapIndex < totalItems) {
          setFocusedIndex(wrapIndex);
        }
      }
    }
  }, [
    focusedIndex,
    columns,
    rows,
    totalItems,
    rtl,
    wrap,
    getPosition,
    getIndex,
    setFocusedIndex,
  ]);

  /**
   * Navigate left (handles RTL + wrapping)
   */
  const navigateLeft = useCallback(() => {
    const { row, col } = getPosition(focusedIndex);
    const direction = rtl ? 1 : -1;
    const nextCol = col + direction;

    if (nextCol >= 0 && nextCol < columns) {
      const nextIndex = getIndex(row, nextCol);
      if (nextIndex < totalItems) {
        setFocusedIndex(nextIndex);
      }
    } else if (wrap) {
      // Wrap to next/prev row
      const nextRow = row + (nextCol < 0 ? -1 : 1);
      if (nextRow >= 0 && nextRow < rows) {
        const wrapCol = nextCol < 0 ? columns - 1 : 0;
        const wrapIndex = getIndex(nextRow, wrapCol);
        if (wrapIndex < totalItems) {
          setFocusedIndex(wrapIndex);
        }
      }
    }
  }, [
    focusedIndex,
    columns,
    rows,
    totalItems,
    rtl,
    wrap,
    getPosition,
    getIndex,
    setFocusedIndex,
  ]);

  /**
   * Navigate down
   */
  const navigateDown = useCallback(() => {
    const { row, col } = getPosition(focusedIndex);
    const nextRow = row + 1;

    if (nextRow < rows) {
      const nextIndex = getIndex(nextRow, col);
      if (nextIndex < totalItems) {
        setFocusedIndex(nextIndex);
      }
    } else if (wrap) {
      // Wrap to first row, same column
      const wrapIndex = getIndex(0, col);
      if (wrapIndex < totalItems) {
        setFocusedIndex(wrapIndex);
      }
    }
  }, [
    focusedIndex,
    rows,
    totalItems,
    wrap,
    getPosition,
    getIndex,
    setFocusedIndex,
  ]);

  /**
   * Navigate up
   */
  const navigateUp = useCallback(() => {
    const { row, col } = getPosition(focusedIndex);
    const nextRow = row - 1;

    if (nextRow >= 0) {
      const nextIndex = getIndex(nextRow, col);
      setFocusedIndex(nextIndex);
    } else if (wrap) {
      // Wrap to last row, same column
      const lastRow = Math.floor((totalItems - 1) / columns);
      const wrapIndex = getIndex(lastRow, col);
      if (wrapIndex < totalItems) {
        setFocusedIndex(wrapIndex);
      }
    }
  }, [
    focusedIndex,
    totalItems,
    columns,
    wrap,
    getPosition,
    getIndex,
    setFocusedIndex,
  ]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          navigateRight();
          break;

        case "ArrowLeft":
          event.preventDefault();
          navigateLeft();
          break;

        case "ArrowDown":
          event.preventDefault();
          navigateDown();
          break;

        case "ArrowUp":
          event.preventDefault();
          navigateUp();
          break;

        case "Enter":
        case " ":
          event.preventDefault();
          onSelect(focusedIndex);
          break;

        case "Escape":
          event.preventDefault();
          onEscape?.();
          break;

        case "Home":
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case "End":
          event.preventDefault();
          setFocusedIndex(totalItems - 1);
          break;

        default:
          break;
      }
    },
    [
      focusedIndex,
      totalItems,
      navigateRight,
      navigateLeft,
      navigateDown,
      navigateUp,
      onSelect,
      onEscape,
      setFocusedIndex,
    ]
  );

  /**
   * Auto-focus grid on mount
   */
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  /**
   * Check if index is focused
   */
  const isFocused = useCallback(
    (index: number) => index === focusedIndex,
    [focusedIndex]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    containerProps: {
      tabIndex: 0,
      role: "grid",
      "aria-label": "Grid navigation",
      onKeyDown: handleKeyDown,
    },
    isFocused,
    gridRef,
  };
}

/**
 * Variant: Linear list navigation (1D, no columns)
 * Convenience wrapper for vertical/horizontal lists
 */
export function useListNavigation(
  options: Omit<UseGridNavigationOptions, "columns">
) {
  return useGridNavigation({ ...options, columns: 1 });
}
