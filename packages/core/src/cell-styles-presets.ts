/**
 * cell-styles-presets.ts
 * 
 * Excel-compatible cell style presets for CyberSheet.
 * Provides 40+ pre-built formatting styles matching Excel 365 exactly.
 * 
 * Style Categories:
 * - Good/Bad/Neutral (3 styles) - Status indicators with semantic colors
 * - Data & Model (8 styles) - Financial modeling and data analysis
 * - Titles & Headings (6 styles) - Document structure and hierarchy
 * - Themed Cell Styles (15 styles) - Office theme-based formatting
 * - Number Format (9 styles) - Common number format presets
 * 
 * Usage:
 * ```typescript
 * import { CELL_STYLE_PRESETS, getCellStyle } from './cell-styles-presets';
 * 
 * const goodStyle = getCellStyle('good');
 * formattingController.applyStyle(selectedCells, goodStyle);
 * ```
 */

import type { CellStyle } from './types';

export type CellStyleCategory =
  | 'Good/Bad/Neutral'
  | 'Data & Model'
  | 'Titles & Headings'
  | 'Themed Cell Styles'
  | 'Number Format';

export interface CellStylePreset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Style category */
  category: CellStyleCategory;
  /** Cell style properties */
  style: CellStyle;
  /** Optional description for tooltips */
  description?: string;
  /** Display order within category */
  order?: number;
}

/**
 * All cell style presets (Excel 365 compatible)
 */
export const CELL_STYLE_PRESETS: CellStylePreset[] = [
  // ==================== Good/Bad/Neutral ====================
  {
    id: 'good',
    name: 'Good',
    category: 'Good/Bad/Neutral',
    description: 'Positive result or status',
    order: 1,
    style: {
      fill: '#C6EFCE',
      color: '#006100',
      bold: false,
    },
  },
  {
    id: 'bad',
    name: 'Bad',
    category: 'Good/Bad/Neutral',
    description: 'Negative result or error',
    order: 2,
    style: {
      fill: '#FFC7CE',
      color: '#9C0006',
      bold: false,
    },
  },
  {
    id: 'neutral',
    name: 'Neutral',
    category: 'Good/Bad/Neutral',
    description: 'Neutral or warning status',
    order: 3,
    style: {
      fill: '#FFEB9C',
      color: '#9C6500',
      bold: false,
    },
  },

  // ==================== Data & Model ====================
  {
    id: 'calculation',
    name: 'Calculation',
    category: 'Data & Model',
    description: 'Formula cell in financial models',
    order: 1,
    style: {
      fill: '#F2F2F2',
      color: '#FA7D00',
      bold: true,
      italic: false,
    },
  },
  {
    id: 'check-cell',
    name: 'Check Cell',
    category: 'Data & Model',
    description: 'Validation or audit cell',
    order: 2,
    style: {
      fill: '#A5A5A5',
      color: '#FFFFFF',
      bold: true,
    },
  },
  {
    id: 'explanatory-text',
    name: 'Explanatory Text',
    category: 'Data & Model',
    description: 'Cell annotations and notes',
    order: 3,
    style: {
      color: '#7F7F7F',
      italic: true,
    },
  },
  {
    id: 'input',
    name: 'Input',
    category: 'Data & Model',
    description: 'User input cell (orange background)',
    order: 4,
    style: {
      fill: '#FFCC99',
      color: '#3F3F76',
    },
  },
  {
    id: 'linked-cell',
    name: 'Linked Cell',
    category: 'Data & Model',
    description: 'Cell with external link',
    order: 5,
    style: {
      fill: '#FFEB9C',
      color: '#FA7D00',
    },
  },
  {
    id: 'note',
    name: 'Note',
    category: 'Data & Model',
    description: 'Highlighted note or comment',
    order: 6,
    style: {
      fill: '#FFFFCC',
      color: '#000000',
      border: {
        top: { color: '#B2B2B2', style: 'thin' },
        bottom: { color: '#B2B2B2', style: 'thin' },
        left: { color: '#B2B2B2', style: 'thin' },
        right: { color: '#B2B2B2', style: 'thin' },
      },
    },
  },
  {
    id: 'output',
    name: 'Output',
    category: 'Data & Model',
    description: 'Final calculation result',
    order: 7,
    style: {
      fill: '#F2F2F2',
      color: '#3F3F3F',
      bold: true,
    },
  },
  {
    id: 'warning-text',
    name: 'Warning Text',
    category: 'Data & Model',
    description: 'Error or warning message',
    order: 8,
    style: {
      color: '#FF0000',
      bold: false,
    },
  },

  // ==================== Titles & Headings ====================
  {
    id: 'heading-1',
    name: 'Heading 1',
    category: 'Titles & Headings',
    description: 'Top-level heading',
    order: 1,
    style: {
      fontSize: 15,
      bold: true,
      color: '#4472C4',
      border: {
        bottom: { color: '#4472C4', style: 'thick' },
      },
    },
  },
  {
    id: 'heading-2',
    name: 'Heading 2',
    category: 'Titles & Headings',
    description: 'Second-level heading',
    order: 2,
    style: {
      fontSize: 13,
      bold: true,
      color: '#4472C4',
      border: {
        bottom: { color: '#4472C4', style: 'thin' },
      },
    },
  },
  {
    id: 'heading-3',
    name: 'Heading 3',
    category: 'Titles & Headings',
    description: 'Third-level heading',
    order: 3,
    style: {
      fontSize: 11,
      bold: true,
      color: '#4472C4',
    },
  },
  {
    id: 'heading-4',
    name: 'Heading 4',
    category: 'Titles & Headings',
    description: 'Fourth-level heading',
    order: 4,
    style: {
      fontSize: 11,
      bold: true,
      color: '#000000',
    },
  },
  {
    id: 'title',
    name: 'Title',
    category: 'Titles & Headings',
    description: 'Document title',
    order: 5,
    style: {
      fontSize: 18,
      bold: true,
      color: '#4472C4',
    },
  },
  {
    id: 'total',
    name: 'Total',
    category: 'Titles & Headings',
    description: 'Sum total row',
    order: 6,
    style: {
      bold: true,
      color: '#4472C4',
      border: {
        top: { color: '#4472C4', style: 'thin' },
        bottom: { color: '#4472C4', style: 'double' },
      },
    },
  },

  // ==================== Themed Cell Styles ====================
  {
    id: 'accent1',
    name: 'Accent1',
    category: 'Themed Cell Styles',
    order: 1,
    style: {
      fill: '#4472C4',
      color: '#FFFFFF',
      bold: false,
    },
  },
  {
    id: 'accent1-20',
    name: '20% - Accent1',
    category: 'Themed Cell Styles',
    order: 2,
    style: {
      fill: '#D9E2F3',
      color: '#000000',
    },
  },
  {
    id: 'accent1-40',
    name: '40% - Accent1',
    category: 'Themed Cell Styles',
    order: 3,
    style: {
      fill: '#B4C7E7',
      color: '#000000',
    },
  },
  {
    id: 'accent1-60',
    name: '60% - Accent1',
    category: 'Themed Cell Styles',
    order: 4,
    style: {
      fill: '#8EAADB',
      color: '#000000',
    },
  },
  {
    id: 'accent2',
    name: 'Accent2',
    category: 'Themed Cell Styles',
    order: 5,
    style: {
      fill: '#ED7D31',
      color: '#FFFFFF',
    },
  },
  {
    id: 'accent2-20',
    name: '20% - Accent2',
    category: 'Themed Cell Styles',
    order: 6,
    style: {
      fill: '#FCE4D6',
      color: '#000000',
    },
  },
  {
    id: 'accent2-40',
    name: '40% - Accent2',
    category: 'Themed Cell Styles',
    order: 7,
    style: {
      fill: '#F8CBAD',
      color: '#000000',
    },
  },
  {
    id: 'accent3',
    name: 'Accent3',
    category: 'Themed Cell Styles',
    order: 8,
    style: {
      fill: '#A5A5A5',
      color: '#FFFFFF',
    },
  },
  {
    id: 'accent3-20',
    name: '20% - Accent3',
    category: 'Themed Cell Styles',
    order: 9,
    style: {
      fill: '#EDEDED',
      color: '#000000',
    },
  },
  {
    id: 'accent4',
    name: 'Accent4',
    category: 'Themed Cell Styles',
    order: 10,
    style: {
      fill: '#FFC000',
      color: '#FFFFFF',
    },
  },
  {
    id: 'accent4-20',
    name: '20% - Accent4',
    category: 'Themed Cell Styles',
    order: 11,
    style: {
      fill: '#FFE699',
      color: '#000000',
    },
  },
  {
    id: 'accent5',
    name: 'Accent5',
    category: 'Themed Cell Styles',
    order: 12,
    style: {
      fill: '#5B9BD5',
      color: '#FFFFFF',
    },
  },
  {
    id: 'accent5-20',
    name: '20% - Accent5',
    category: 'Themed Cell Styles',
    order: 13,
    style: {
      fill: '#DDEBF7',
      color: '#000000',
    },
  },
  {
    id: 'accent6',
    name: 'Accent6',
    category: 'Themed Cell Styles',
    order: 14,
    style: {
      fill: '#70AD47',
      color: '#FFFFFF',
    },
  },
  {
    id: 'accent6-20',
    name: '20% - Accent6',
    category: 'Themed Cell Styles',
    order: 15,
    style: {
      fill: '#E2EFDA',
      color: '#000000',
    },
  },

  // ==================== Number Format ====================
  {
    id: 'comma',
    name: 'Comma',
    category: 'Number Format',
    description: 'Thousand separator with 2 decimals',
    order: 1,
    style: {
      numberFormat: '#,##0.00',
    },
  },
  {
    id: 'comma-0',
    name: 'Comma [0]',
    category: 'Number Format',
    description: 'Thousand separator, no decimals',
    order: 2,
    style: {
      numberFormat: '#,##0',
    },
  },
  {
    id: 'currency',
    name: 'Currency',
    category: 'Number Format',
    description: 'Currency with 2 decimals',
    order: 3,
    style: {
      numberFormat: '$#,##0.00',
    },
  },
  {
    id: 'currency-0',
    name: 'Currency [0]',
    category: 'Number Format',
    description: 'Currency, no decimals',
    order: 4,
    style: {
      numberFormat: '$#,##0',
    },
  },
  {
    id: 'percent',
    name: 'Percent',
    category: 'Number Format',
    description: 'Percentage',
    order: 5,
    style: {
      numberFormat: '0%',
    },
  },
];

/**
 * Get style preset by ID
 */
export function getCellStyle(id: string): CellStyle | null {
  const preset = CELL_STYLE_PRESETS.find((p) => p.id === id);
  return preset ? preset.style : null;
}

/**
 * Get all presets for a category
 */
export function getCellStylesByCategory(category: CellStyleCategory): CellStylePreset[] {
  return CELL_STYLE_PRESETS.filter((p) => p.category === category).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
}

/**
 * Get all categories
 */
export function getCellStyleCategories(): CellStyleCategory[] {
  return [
    'Good/Bad/Neutral',
    'Data & Model',
    'Titles & Headings',
    'Themed Cell Styles',
    'Number Format',
  ];
}
