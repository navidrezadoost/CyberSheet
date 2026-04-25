/**
 * Excel 365 Color Palettes
 * 
 * These colors are extracted from Excel Online and match the Office/Fluent theme.
 * Theme colors support tint/shade variations (lighter/darker).
 */

/**
 * Theme Colors - 10 columns with 6 tint/shade variations each
 * 
 * Layout (top to bottom for each column):
 * - Row 0: Lightest tint (80% lighter)
 * - Row 1: Light tint (60% lighter)
 * - Row 2: Medium tint (40% lighter)
 * - Row 3: Base color
 * - Row 4: Dark shade (25% darker)
 * - Row 5: Darkest shade (50% darker)
 * 
 * Column order matches Excel:
 * 0: White/Gray scale
 * 1: Black/Gray scale
 * 2: Blue (theme primary)
 * 3: Orange (theme accent 1)
 * 4: Gray (theme accent 2)
 * 5: Yellow (theme accent 3)
 * 6: Light Blue (theme accent 4)
 * 7: Green (theme accent 5)
 * 8: Dark Blue (theme accent 6)
 * 9: Brown (theme accent 7)
 */
export const THEME_COLORS: string[][] = [
  // White → Gray
  ["#FFFFFF", "#F2F2F2", "#D9D9D9", "#BFBFBF", "#A6A6A6", "#7F7F7F"],
  
  // Black → Gray
  ["#000000", "#595959", "#404040", "#262626", "#0D0D0D", "#000000"],
  
  // Blue (Office theme primary)
  ["#4472C4", "#D9E1F2", "#B4C6E7", "#8EAADB", "#2F5597", "#203864"],
  
  // Orange (theme accent 1)
  ["#ED7D31", "#FCE4D6", "#F8CBAD", "#F4B084", "#C55A11", "#833C0C"],
  
  // Gray (theme accent 2)
  ["#A5A5A5", "#E7E6E6", "#D0CECE", "#BFBFBF", "#7F7F7F", "#595959"],
  
  // Yellow (theme accent 3)
  ["#FFC000", "#FFF2CC", "#FFE699", "#FFD966", "#BF9000", "#7F6000"],
  
  // Light Blue (theme accent 4)
  ["#5B9BD5", "#DDEBF7", "#BDD7EE", "#9DC3E6", "#2E75B6", "#1F4E79"],
  
  // Green (theme accent 5)
  ["#70AD47", "#E2EFDA", "#C6E0B4", "#A9D18E", "#548235", "#385723"],
  
  // Dark Blue (theme accent 6)
  ["#264478", "#D9E1F2", "#B4C6E7", "#8EAADB", "#1F3864", "#162A4A"],
  
  // Brown (theme accent 7)
  ["#9E480E", "#FBE5D6", "#F4B183", "#ED7D31", "#843C0C", "#5A2A08"],
];

/**
 * Standard Colors - Basic palette always available
 * 
 * These colors are theme-independent and match Excel's standard palette.
 * Order: Red, Orange, Yellow, Yellow-Green, Green, Cyan, Blue, Dark Blue, Purple
 */
export const STANDARD_COLORS: string[] = [
  "#C00000", // Dark Red
  "#FF0000", // Red
  "#FFC000", // Orange
  "#FFFF00", // Yellow
  "#92D050", // Yellow-Green
  "#00B050", // Green
  "#00B0F0", // Cyan
  "#0070C0", // Blue
  "#002060", // Dark Blue
  "#7030A0", // Purple
];

/**
 * Automatic color (default text color)
 * Excel uses this when no explicit color is set
 */
export const AUTOMATIC_COLOR = "#000000";

/**
 * No fill color (transparent background)
 * Used for cell fill color picker
 */
export const NO_FILL_COLOR = "transparent";
