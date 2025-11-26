export type Theme = {
  // Canvas renderer visual tokens
  gridColor: string;
  headerBg: string;
  headerFg: string;
  sheetBg: string;
  selectionColor: string;
  // Typography
  fontFamily: string;
  fontSize: number; // px
};

// Excel-like light theme (defaults tuned to match Excel’s default look)
export const ExcelLightTheme: Theme = {
  // Excel gridlines are very light gray
  gridColor: '#D9D9D9',
  // Column/row header background is light gray
  headerBg: '#F3F3F3',
  // Header text close to black
  headerFg: '#1F1F1F',
  // Sheet background white
  sheetBg: '#FFFFFF',
  // Selection outline (Excel-esque blue)
  selectionColor: '#5B9BD5',
  // Typography
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: 11,
};

// Optional dark theme preset (basic). Can be refined later.
export const ExcelDarkTheme: Theme = {
  gridColor: '#3A3A3A',
  headerBg: '#2B2B2B',
  headerFg: '#E6E6E6',
  sheetBg: '#1E1E1E',
  selectionColor: '#5B9BD5',
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: 11,
};

export function mergeTheme(base: Theme, override?: Partial<Theme>): Theme {
  if (!override) return base;
  return { ...base, ...override };
}

export type ThemePresetName = 'excel-light' | 'excel-dark';

export const ThemePresets: Record<ThemePresetName, Theme> = {
  'excel-light': ExcelLightTheme,
  'excel-dark': ExcelDarkTheme,
};

export function getThemePresetNames(): ThemePresetName[] {
  return Object.keys(ThemePresets) as ThemePresetName[];
}

export function resolveThemePreset(name: ThemePresetName): Theme {
  return ThemePresets[name];
}
