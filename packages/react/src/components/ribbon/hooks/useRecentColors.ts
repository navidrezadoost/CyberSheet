import { useEffect, useState } from 'react';

/**
 * Storage key for recent colors in localStorage
 */
const STORAGE_KEY_FONT = 'cs_recent_font_colors';
const STORAGE_KEY_FILL = 'cs_recent_fill_colors';

/**
 * Maximum number of recent colors to store
 */
const MAX_RECENT_COLORS = 10;

/**
 * Hook for managing recent colors with localStorage persistence
 * 
 * Maintains a list of recently used colors, automatically:
 * - Loads from localStorage on mount
 * - Saves to localStorage on changes
 * - Prevents duplicates (moves existing color to front)
 * - Limits to 10 most recent colors
 * 
 * @param type - 'font' or 'fill' to separate font/fill color histories
 * @returns Object with colors array and addColor function
 * 
 * @example
 * const { colors, addColor } = useRecentColors('font');
 * 
 * // When user picks a color
 * addColor('#FF0000');
 * 
 * // Display recent colors
 * colors.map(color => <ColorSwatch color={color} />)
 */
export function useRecentColors(type: 'font' | 'fill' = 'font') {
  const storageKey = type === 'font' ? STORAGE_KEY_FONT : STORAGE_KEY_FILL;
  const [colors, setColors] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setColors(parsed.slice(0, MAX_RECENT_COLORS));
        }
      }
    } catch (error) {
      console.error('Failed to load recent colors from localStorage:', error);
    }
  }, [storageKey]);

  /**
   * Add a color to recent colors list
   * 
   * Behavior:
   * - Moves color to front if already exists (prevents duplicates)
   * - Adds to front if new
   * - Limits to MAX_RECENT_COLORS (10)
   * - Persists to localStorage
   * 
   * @param color - Hex color value (e.g., "#FF0000")
   */
  const addColor = (color: string) => {
    setColors((prev) => {
      // Remove existing instance of this color
      const filtered = prev.filter((c) => c !== color);
      
      // Add to front
      const next = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
      
      // Persist to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (error) {
        console.error('Failed to save recent colors to localStorage:', error);
      }
      
      return next;
    });
  };

  return { colors, addColor };
}
