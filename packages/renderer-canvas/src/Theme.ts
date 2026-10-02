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
  // Spreadsheet gridlines and headers tuned to the provided example
  gridColor: "#E0E0E0",
  headerBg: "#F0F0F0",
  headerFg: "#333333",
  // Sheet background white
  sheetBg: "#FFFFFF",
  // Selection outline
  selectionColor: "#1D7545",
  // Typography
  fontFamily: "Calibri, Segoe UI, Arial, sans-serif",
  fontSize: 11,
};

// Optional dark theme preset (basic). Can be refined later.
export const ExcelDarkTheme: Theme = {
  // Spreadsheet gridlines and headers matched to the supplied sheet UI
  gridColor: "#E0E0E0",
  headerBg: "#F0F0F0",
  headerFg: "#333333",
  sheetBg: "#FFFFFF",
  selectionColor: "#1D7545",
  fontFamily: "Calibri, Segoe UI, Arial, sans-serif",
  fontSize: 11,
};

export function mergeTheme(base: Theme, override?: Partial<Theme>): Theme {
  if (!override) return base;
  return { ...base, ...override };
}

export type ThemePresetName = "excel-light" | "excel-dark";

export const ThemePresets: Record<ThemePresetName, Theme> = {
  "excel-light": ExcelLightTheme,
  "excel-dark": ExcelDarkTheme,
};

export function getThemePresetNames(): ThemePresetName[] {
  return Object.keys(ThemePresets) as ThemePresetName[];
}

export function resolveThemePreset(name: ThemePresetName): Theme {
  return ThemePresets[name];
}
