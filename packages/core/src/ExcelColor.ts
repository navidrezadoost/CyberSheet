/**
 * Excel Color System
 * 
 * Handles Excel's complex color model including:
 * - Theme colors with tint/shade transformations
 * - Indexed colors (legacy palette)
 * - RGB colors
 * - Automatic colors
 * - Conditional formatting colors
 * 
 * Excel uses HSL color space for tint/shade calculations with specific formulas.
 */

export interface ExcelThemeColor {
  /** Theme color index (0-11) */
  theme: number;
  /** Tint value (-1 to 1). Positive = lighter, Negative = darker */
  tint?: number;
}

export interface ExcelIndexedColor {
  /** Indexed color (0-63 in the color palette) */
  indexed: number;
}

export interface ExcelRgbColor {
  /** RGB hex string (e.g., "FF0000" for red) */
  rgb: string;
}

export interface ExcelAutoColor {
  /** Automatic color (context-dependent) */
  auto: true;
}

export type ExcelColorSpec = 
  | ExcelThemeColor 
  | ExcelIndexedColor 
  | ExcelRgbColor 
  | ExcelAutoColor
  | string; // Direct CSS color

/**
 * Excel's default theme color palette (Office theme)
 * Indices 0-11 map to specific semantic colors
 */
export const EXCEL_THEME_COLORS: Record<number, string> = {
  0: '#FFFFFF',  // lt1 (Light 1 - Background 1)
  1: '#000000',  // dk1 (Dark 1 - Text 1)
  2: '#EEECE1',  // lt2 (Light 2 - Background 2)
  3: '#1F497D',  // dk2 (Dark 2 - Text 2)
  4: '#4F81BD',  // accent1 (Blue)
  5: '#C0504D',  // accent2 (Red)
  6: '#9BBB59',  // accent3 (Green)
  7: '#8064A2',  // accent4 (Purple)
  8: '#4BACC6',  // accent5 (Aqua)
  9: '#F79646',  // accent6 (Orange)
  10: '#0000FF', // hlink (Hyperlink)
  11: '#800080', // folHlink (Followed Hyperlink)
};

/**
 * Excel's indexed color palette (legacy 56-color palette)
 * Indices 0-63 with special meanings for some values
 */
export const EXCEL_INDEXED_COLORS: Record<number, string> = {
  0: '#000000',  // Black
  1: '#FFFFFF',  // White
  2: '#FF0000',  // Red
  3: '#00FF00',  // Green
  4: '#0000FF',  // Blue
  5: '#FFFF00',  // Yellow
  6: '#FF00FF',  // Magenta
  7: '#00FFFF',  // Cyan
  8: '#000000',  // Black
  9: '#FFFFFF',  // White
  10: '#FF0000', // Red
  11: '#00FF00', // Green
  12: '#0000FF', // Blue
  13: '#FFFF00', // Yellow
  14: '#FF00FF', // Magenta
  15: '#00FFFF', // Cyan
  16: '#800000', // Maroon
  17: '#008000', // Green
  18: '#000080', // Navy
  19: '#808000', // Olive
  20: '#800080', // Purple
  21: '#008080', // Teal
  22: '#C0C0C0', // Silver
  23: '#808080', // Gray
  24: '#9999FF', // Periwinkle
  25: '#993366', // Plum
  26: '#FFFFCC', // Ivory
  27: '#CCFFFF', // Light Turquoise
  28: '#660066', // Dark Purple
  29: '#FF8080', // Coral
  30: '#0066CC', // Ocean Blue
  31: '#CCCCFF', // Ice Blue
  32: '#000080', // Dark Blue
  33: '#FF00FF', // Pink
  34: '#FFFF00', // Yellow
  35: '#00FFFF', // Turquoise
  36: '#800080', // Violet
  37: '#800000', // Dark Red
  38: '#008080', // Teal
  39: '#0000FF', // Blue
  40: '#00CCFF', // Sky Blue
  41: '#CCFFFF', // Light Turquoise
  42: '#CCFFCC', // Light Green
  43: '#FFFF99', // Light Yellow
  44: '#99CCFF', // Pale Blue
  45: '#FF99CC', // Rose
  46: '#CC99FF', // Lavender
  47: '#FFCC99', // Tan
  48: '#3366FF', // Light Blue
  49: '#33CCCC', // Aqua
  50: '#99CC00', // Lime
  51: '#FFCC00', // Gold
  52: '#FF9900', // Light Orange
  53: '#FF6600', // Orange
  54: '#666699', // Blue Gray
  55: '#969696', // Gray 40%
  56: '#003366', // Dark Teal
  57: '#339966', // Sea Green
  58: '#003300', // Dark Green
  59: '#333300', // Olive Green
  60: '#993300', // Brown
  61: '#993366', // Plum
  62: '#333399', // Indigo
  63: '#333333', // Gray 80%
  64: '#000000', // System Foreground (auto)
  65: '#FFFFFF', // System Background (auto)
};

/**
 * Conditional formatting color scales
 * Maps CF color types to RGB values
 */
export const CF_COLOR_SCALES = {
  // 2-color scales
  'red-white': { min: '#F8696B', max: '#FFFFFF' },
  'white-red': { min: '#FFFFFF', max: '#F8696B' },
  'green-white': { min: '#63BE7B', max: '#FFFFFF' },
  'white-green': { min: '#FFFFFF', max: '#63BE7B' },
  'red-green': { min: '#F8696B', max: '#63BE7B' },
  'green-red': { min: '#63BE7B', max: '#F8696B' },
  
  // 3-color scales
  'red-yellow-green': { min: '#F8696B', mid: '#FFEB84', max: '#63BE7B' },
  'green-yellow-red': { min: '#63BE7B', mid: '#FFEB84', max: '#F8696B' },
  'red-white-green': { min: '#F8696B', mid: '#FFFFFF', max: '#63BE7B' },
  'blue-white-red': { min: '#5A8AC6', mid: '#FFFFFF', max: '#F8696B' },
};

/**
 * Convert RGB hex string to [R, G, B] array
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert [R, G, B] to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const h = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Convert RGB to HSL
 * Returns [H (0-360), S (0-1), L (0-1)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return [h * 360, s, l];
}

/**
 * Convert HSL to RGB
 * H: 0-360, S: 0-1, L: 0-1
 * Returns [R, G, B] (0-255)
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [r * 255, g * 255, b * 255];
}

/**
 * Apply Excel tint transformation
 * 
 * Excel's tint algorithm (from ECMA-376 specification):
 * - If tint > 0: Lightens color toward white
 *   H_lum = L + (1 - L) * tint
 * - If tint < 0: Darkens color toward black
 *   H_lum = L * (1 + tint)
 * 
 * @param rgb - Base RGB color as hex string
 * @param tint - Tint value from -1 to 1
 * @returns Tinted color as hex string
 */
export function applyExcelTint(rgb: string, tint: number): string {
  if (tint === 0) return rgb;

  const [r, g, b] = hexToRgb(rgb);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Apply Excel's tint formula to luminance
  let newL: number;
  if (tint > 0) {
    // Lighten toward white
    newL = l + (1 - l) * tint;
  } else {
    // Darken toward black
    newL = l * (1 + tint);
  }

  // Clamp to valid range
  newL = Math.max(0, Math.min(1, newL));

  const [newR, newG, newB] = hslToRgb(h, s, newL);
  return rgbToHex(newR, newG, newB);
}

/**
 * Resolve Excel color specification to CSS color string
 * 
 * Handles all Excel color types:
 * - Theme colors with tint/shade
 * - Indexed colors from palette
 * - Direct RGB colors
 * - Automatic colors (system defaults)
 * - Direct CSS color strings
 * 
 * @param color - Excel color specification
 * @param options - Resolution options
 * @returns CSS color string (hex, rgb(), rgba())
 */
export function resolveExcelColor(
  color: ExcelColorSpec | null | undefined,
  options: {
    /** Theme palette to use (defaults to Office theme) */
    themePalette?: Record<number, string>;
    /** Indexed color palette (defaults to Excel 56-color) */
    indexedPalette?: Record<number, string>;
    /** Default color if auto or unresolved */
    defaultColor?: string;
    /** Whether to support alpha channel */
    alpha?: number;
  } = {}
): string {
  const {
    themePalette = EXCEL_THEME_COLORS,
    indexedPalette = EXCEL_INDEXED_COLORS,
    defaultColor = '#000000',
    alpha,
  } = options;

  // Handle null/undefined
  if (!color) return defaultColor;

  // Handle direct CSS color strings
  if (typeof color === 'string') {
    return alpha !== undefined ? addAlpha(color, alpha) : color;
  }

  // Handle automatic color
  if ('auto' in color) {
    return defaultColor;
  }

  // Handle theme color with tint
  if ('theme' in color) {
    const baseColor = themePalette[color.theme] ?? defaultColor;
    const tintedColor = color.tint ? applyExcelTint(baseColor, color.tint) : baseColor;
    return alpha !== undefined ? addAlpha(tintedColor, alpha) : tintedColor;
  }

  // Handle indexed color
  if ('indexed' in color) {
    const indexColor = indexedPalette[color.indexed] ?? defaultColor;
    return alpha !== undefined ? addAlpha(indexColor, alpha) : indexColor;
  }

  // Handle RGB color
  if ('rgb' in color) {
    const hexColor = color.rgb.startsWith('#') ? color.rgb : '#' + color.rgb;
    return alpha !== undefined ? addAlpha(hexColor, alpha) : hexColor;
  }

  return defaultColor;
}

/**
 * Add alpha channel to hex color
 * @param hex - Hex color string
 * @param alpha - Alpha value (0-1)
 * @returns rgba() string
 */
function addAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Extract conditional formatting color from scale
 * @param value - Cell value (0-1 normalized)
 * @param scale - Color scale type
 * @param options - Scale options
 * @returns CSS color string
 */
export function getConditionalFormattingColor(
  value: number,
  scale: keyof typeof CF_COLOR_SCALES,
  options: {
    /** Minimum value for normalization */
    min?: number;
    /** Maximum value for normalization */
    max?: number;
    /** Midpoint value (for 3-color scales) */
    mid?: number;
  } = {}
): string {
  const colors = CF_COLOR_SCALES[scale];
  if (!colors) return '#FFFFFF';

  // Normalize value to 0-1 range
  let normalized = value;
  if (options.min !== undefined && options.max !== undefined) {
    normalized = (value - options.min) / (options.max - options.min);
    normalized = Math.max(0, Math.min(1, normalized));
  }

  // 3-color scale
  if ('mid' in colors) {
    const midPoint = options.mid ?? 0.5;
    
    if (normalized <= midPoint) {
      // Interpolate between min and mid
      const t = normalized / midPoint;
      return interpolateColor(colors.min, colors.mid, t);
    } else {
      // Interpolate between mid and max
      const t = (normalized - midPoint) / (1 - midPoint);
      return interpolateColor(colors.mid, colors.max, t);
    }
  }

  // 2-color scale
  return interpolateColor(colors.min, colors.max, normalized);
}

/**
 * Interpolate between two colors
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated color (hex)
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  const r = r1 + (r2 - r1) * t;
  const g = g1 + (g2 - g1) * t;
  const b = b1 + (b2 - b1) * t;

  return rgbToHex(r, g, b);
}

/**
 * Parse Excel-style color string
 * Supports formats like:
 * - "theme:4,tint:0.5" - Theme color with tint
 * - "indexed:10" - Indexed color
 * - "rgb:FF0000" - RGB hex
 * - "#FF0000" - Direct hex
 * - "auto" - Automatic color
 * 
 * @param colorStr - Color string to parse
 * @returns ExcelColorSpec
 */
export function parseExcelColorString(colorStr: string): ExcelColorSpec {
  if (!colorStr) return { auto: true };

  // Auto color
  if (colorStr === 'auto') return { auto: true };

  // Direct hex color
  if (colorStr.startsWith('#')) return colorStr;

  // Parse structured format
  const parts = colorStr.split(',').map(p => p.trim());
  const spec: any = {};

  for (const part of parts) {
    const [key, value] = part.split(':').map(s => s.trim());
    
    if (key === 'theme') {
      spec.theme = parseInt(value, 10);
    } else if (key === 'tint') {
      spec.tint = parseFloat(value);
    } else if (key === 'indexed') {
      spec.indexed = parseInt(value, 10);
    } else if (key === 'rgb') {
      spec.rgb = value;
    }
  }

  // Return appropriate type
  if ('theme' in spec) return spec as ExcelThemeColor;
  if ('indexed' in spec) return spec as ExcelIndexedColor;
  if ('rgb' in spec) return spec as ExcelRgbColor;

  return { auto: true };
}

/**
 * Get luminance of a color (for contrast calculations)
 * Uses WCAG formula
 * @param hex - Hex color string
 * @returns Luminance value (0-1)
 */
export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First color (hex)
 * @param color2 - Second color (hex)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if text color has sufficient contrast with background
 * @param textColor - Text color (hex)
 * @param bgColor - Background color (hex)
 * @param level - WCAG level ('AA' or 'AAA')
 * @returns Whether contrast is sufficient
 */
export function hasGoodContrast(
  textColor: string,
  bgColor: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(textColor, bgColor);
  const threshold = level === 'AAA' ? 7 : 4.5;
  return ratio >= threshold;
}
