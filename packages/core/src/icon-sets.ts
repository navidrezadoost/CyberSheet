/**
 * icon-sets.ts
 * 
 * Excel-compatible icon set definitions for conditional formatting.
 * Provides SVG path data and canvas rendering instructions for all 19 Excel icon sets.
 * 
 * Icon Set Categories:
 * - 3-icon sets: arrows, triangles, traffic lights, signs, symbols, flags, stars
 * - 4-icon sets: arrows (4), traffic lights (4), ratings
 * - 5-icon sets: arrows (5), quarters, ratings (5), boxes
 * 
 * Usage:
 * ```typescript
 * const iconDef = ICON_SET_DEFINITIONS['3-arrows'][0]; // First icon (up arrow)
 * renderIconPath(ctx, iconDef.path, x, y, size, iconDef.color);
 * ```
 */

import type { ExcelIconSet } from './ConditionalFormattingEngine';

export interface IconDefinition {
  /** Icon identifier */
  id: string;
  /** SVG path data for rendering */
  path: string;
  /** Default icon color */
  color: string;
  /** Icon semantic meaning (for accessibility) */
  label: string;
  /** Viewbox for SVG (default: "0 0 16 16") */
  viewBox?: string;
}

/**
 * All 19 Excel icon sets with full rendering data
 */
export const ICON_SET_DEFINITIONS: Record<ExcelIconSet, IconDefinition[]> = {
  '3-arrows': [
    {
      id: 'arrow-up-green',
      path: 'M8 2L12 8H4L8 2Z M8 8V14',
      color: '#388E3C',
      label: 'Up arrow (green)',
    },
    {
      id: 'arrow-right-yellow',
      path: 'M2 8L8 4V12L2 8Z M8 8H14',
      color: '#FFB300',
      label: 'Right arrow (yellow)',
    },
    {
      id: 'arrow-down-red',
      path: 'M8 14L4 8H12L8 14Z M8 8V2',
      color: '#D32F2F',
      label: 'Down arrow (red)',
    },
  ],

  '3-arrows-gray': [
    {
      id: 'arrow-up-gray',
      path: 'M8 2L12 8H4L8 2Z M8 8V14',
      color: '#5D5D5D',
      label: 'Up arrow (gray)',
    },
    {
      id: 'arrow-right-gray',
      path: 'M2 8L8 4V12L2 8Z M8 8H14',
      color: '#9E9E9E',
      label: 'Right arrow (gray)',
    },
    {
      id: 'arrow-down-gray',
      path: 'M8 14L4 8H12L8 14Z M8 8V2',
      color: '#C0C0C0',
      label: 'Down arrow (light gray)',
    },
  ],

  '3-triangles': [
    {
      id: 'triangle-up-green',
      path: 'M8 3L14 13H2Z',
      color: '#388E3C',
      label: 'Up trian (green)',
    },
    {
      id: 'triangle-dash-yellow',
      path: 'M3 8H13',
      color: '#FFB300',
      label: 'Dash (yellow)',
    },
    {
      id: 'triangle-down-red',
      path: 'M8 13L2 3H14Z',
      color: '#D32F2F',
      label: 'Down triangle (red)',
    },
  ],

  '3-traffic-lights': [
    {
      id: 'light-green',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#388E3C',
      label: 'Green light',
    },
    {
      id: 'light-yellow',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#FFB300',
      label: 'Yellow light',
    },
    {
      id: 'light-red',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#D32F2F',
      label: 'Red light',
    },
  ],

  '3-traffic-lights-rimmed': [
    {
      id: 'light-rimmed-green',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M8 8m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0',
      color: '#388E3C',
      label: 'Green light (rimmed)',
    },
    {
      id: 'light-rimmed-yellow',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M8 8m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0',
      color: '#FFB300',
      label: 'Yellow light (rimmed)',
    },
    {
      id: 'light-rimmed-red',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M8 8m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0',
      color: '#D32F2F',
      label: 'Red light (rimmed)',
    },
  ],

  '3-signs': [
    {
      id: 'sign-check-green',
      path: 'M8 1L15 8L8 15L1 8Z M5 8L7 10L11 6',
      color: '#388E3C',
      label: 'Check sign (green)',
    },
    {
      id: 'sign-exclamation-yellow',
      path: 'M8 1L15 8L8 15L1 8Z M8 5V9 M8 11V12',
      color: '#FFB300',
      label: 'Exclamation sign (yellow)',
    },
    {
      id: 'sign-x-red',
      path: 'M8 1L15 8L8 15L1 8Z M5 5L11 11 M5 11L11 5',
      color: '#D32F2F',
      label: 'X sign (red)',
    },
  ],

  '3-symbols-circled': [
    {
      id: 'check-circled-green',
      path: 'M8 2a6 6 0 1 1 0 12a6 6 0 0 1 0 -12 M5 8L7 10L11 6',
      color: '#388E3C',
      label: 'Check (circled green)',
    },
    {
      id: 'exclamation-circled-yellow',
      path: 'M8 2a6 6 0 1 1 0 12a6 6 0 0 1 0 -12 M8 5V9 M8 11h0.01',
      color: '#FFB300',
      label: 'Exclamation (circled yellow)',
    },
    {
      id: 'x-circled-red',
      path: 'M8 2a6 6 0 1 1 0 12a6 6 0 0 1 0 -12 M6 6L10 10 M6 10L10 6',
      color: '#D32F2F',
      label: 'X (circled red)',
    },
  ],

  '3-symbols': [
    {
      id: 'check-green',
      path: 'M4 8L7 11L12 5',
      color: '#388E3C',
      label: 'Check mark (green)',
    },
    {
      id: 'exclamation-yellow',
      path: 'M8 3V10 M8 12V13',
      color: '#FFB300',
      label: 'Exclamation (yellow)',
    },
    {
      id: 'x-red',
      path: 'M5 5L11 11 M5 11L11 5',
      color: '#D32F2F',
      label: 'X (red)',
    },
  ],

  '3-flags': [
    {
      id: 'flag-green',
      path: 'M4 3H12L10 6L12 9H4V3 M4 3V14',
      color: '#388E3C',
      label: 'Flag (green)',
    },
    {
      id: 'flag-yellow',
      path: 'M4 3H12L10 6L12 9H4V3 M4 3V14',
      color: '#FFB300',
      label: 'Flag (yellow)',
    },
    {
      id: 'flag-red',
      path: 'M4 3H12L10 6L12 9H4V3 M4 3V14',
      color: '#D32F2F',
      label: 'Flag (red)',
    },
  ],

  '3-stars': [
    {
      id: 'star-filled',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#FFB300',
      label: 'Filled star',
    },
    {
      id: 'star-half',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12V2',
      color: '#FFB300',
      label: 'Half star',
    },
    {
      id: 'star-empty',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#C0C0C0',
      label: 'Empty star',
    },
  ],

  '4-arrows': [
    {
      id: 'arrow-up-green-4',
      path: 'M8 2L12 8H4L8 2Z M8 8V14',
      color: '#388E3C',
      label: 'Up arrow (green)',
    },
    {
      id: 'arrow-diag-up-yellow-4',
      path: 'M12 4L8 8M12 4V8M12 4H8 M8 8L4 12',
      color: '#FFB300',
      label: 'Diagonal up arrow (yellow)',
    },
    {
      id: 'arrow-diag-down-orange-4',
      path: 'M4 4L8 8M4 4V8M4 4H8 M8 8L12 12',
      color: '#FF6F00',
      label: 'Diagonal down arrow (orange)',
    },
    {
      id: 'arrow-down-red-4',
      path: 'M8 14L4 8H12L8 14Z M8 8V2',
      color: '#D32F2F',
      label: 'Down arrow (red)',
    },
  ],

  '4-arrows-gray': [
    {
      id: 'arrow-up-gray-4',
      path: 'M8 2L12 8H4L8 2Z M8 8V14',
      color: '#424242',
      label: 'Up arrow (dark gray)',
    },
    {
      id: 'arrow-diag-up-gray-4',
      path: 'M12 4L8 8M12 4V8M12 4H8 M8 8L4 12',
      color: '#757575',
      label: 'Diagonal up arrow (gray)',
    },
    {
      id: 'arrow-diag-down-gray-4',
      path: 'M4 4L8 8M4 4V8M4 4H8 M8 8L12 12',
      color: '#9E9E9E',
      label: 'Diagonal down arrow (light gray)',
    },
    {
      id: 'arrow-down-lightgray-4',
      path: 'M8 14L4 8H12L8 14Z M8 8V2',
      color: '#C0C0C0',
      label: 'Down arrow (light gray)',
    },
  ],

  '4-traffic-lights': [
    {
      id: 'light-green-4',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#388E3C',
      label: 'Green light',
    },
    {
      id: 'light-yellow-4',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#FFB300',
      label: 'Yellow light',
    },
    {
      id: 'light-orange-4',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#FF6F00',
      label: 'Orange light',
    },
    {
      id: 'light-red-4',
      path: 'M8 8m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
      color: '#D32F2F',
      label: 'Red light',
    },
  ],

  '4-ratings': [
    {
      id: 'rating-4',
      path: 'M2 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M6 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M10 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M14 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
      color: '#424242',
      label: 'Four dots',
    },
    {
      id: 'rating-3',
      path: 'M3 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M8 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M13 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
      color: '#616161',
      label: 'Three dots',
    },
    {
      id: 'rating-2',
      path: 'M5 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M11 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
      color: '#9E9E9E',
      label: 'Two dots',
    },
    {
      id: 'rating-1',
      path: 'M8 8m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
      color: '#C0C0C0',
      label: 'One dot',
    },
  ],

  '5-arrows': [
    {
      id: 'arrow-up-green-5',
      path: 'M8 2L12 8H4L8 2Z M8 8V14',
      color: '#388E3C',
      label: 'Up arrow (green)',
    },
    {
      id: 'arrow-diag-up-yellow-5',
      path: 'M12 4L8 8M12 4V8M12 4H8 M8 8L4 12',
      color: '#FFB300',
      label: 'Diagonal up arrow (yellow)',
    },
    {
      id: 'arrow-right-amber-5',
      path: 'M2 8L8 4V12L2 8Z M8 8H14',
      color: '#FFA726',
      label: 'Right arrow (amber)',
    },
    {
      id: 'arrow-diag-down-orange-5',
      path: 'M4 4L8 8M4 4V8M4 4H8 M8 8L12 12',
      color: '#FF6F00',
      label: 'Diagonal down arrow (orange)',
    },
    {
      id: 'arrow-down-red-5',
      path: 'M8 14L4 8H12L8 14Z M8 8V2',
      color: '#D32F2F',
      label: 'Down arrow (red)',
    },
  ],

  '5-arrows-gray': [
    {
      id: 'arrow-up-darkgray-5',
      path: 'M8 2L12 8H4L8 2Z M8 8V14',
      color: '#424242',
      label: 'Up arrow (dark gray)',
    },
    {
      id: 'arrow-diag-up-gray-5',
      path: 'M12 4L8 8M12 4V8M12 4H8 M8 8L4 12',
      color: '#616161',
      label: 'Diagonal up arrow (gray)',
    },
    {
      id: 'arrow-right-gray-5',
      path: 'M2 8L8 4V12L2 8Z M8 8H14',
      color: '#757575',
      label: 'Right arrow (gray)',
    },
    {
      id: 'arrow-diag-down-lightgray-5',
      path: 'M4 4L8 8M4 4V8M4 4H8 M8 8L12 12',
      color: '#9E9E9E',
      label: 'Diagonal down arrow (light gray)',
    },
    {
      id: 'arrow-down-verylightgray-5',
      path: 'M8 14L4 8H12L8 14Z M8 8V2',
      color: '#C0C0C0',
      label: 'Down arrow (very light gray)',
    },
  ],

  '5-quarters': [
    {
      id: 'quarters-4',
      path: 'M2 2H14V14H2Z M2 8H14 M8 2V14',
      color: '#388E3C',
      label: 'Four quarters (full)',
    },
    {
      id: 'quarters-3',
      path: 'M2 2H14V14H2Z M2 8H14 M8 2V8',
      color: '#9CCC65',
      label: 'Three quarters',
    },
    {
      id: 'quarters-2',
      path: 'M2 2H14V14H2Z M2 8H14',
      color: '#FFB300',
      label: 'Two quarters (half)',
    },
    {
      id: 'quarters-1',
      path: 'M2 2H14V14H2Z M2 8H8',
      color: '#FF6F00',
      label: 'One quarter',
    },
    {
      id: 'quarters-0',
      path: 'M2 2H14V14H2Z',
      color: '#D32F2F',
      label: 'Zero quarters (empty)',
    },
  ],

  '5-ratings': [
    {
      id: 'rating-5',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#FFB300',
      label: 'Five stars',
    },
    {
      id: 'rating-4-5',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#FFB300',
      label: 'Four stars',
    },
    {
      id: 'rating-3-5',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#FFB300',
      label: 'Three stars',
    },
    {
      id: 'rating-2-5',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#FFB300',
      label: 'Two stars',
    },
    {
      id: 'rating-1-5',
      path: 'M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6Z',
      color: '#FFB300',
      label: 'One star',
    },
  ],

  '5-boxes': [
    {
      id: 'box-filled',
      path: 'M3 3H13V13H3Z',
      color: '#388E3C',
      label: 'Filled box (green)',
    },
    {
      id: 'box-three-quarter',
      path: 'M3 3H13V13H3Z M3 7H13',
      color: '#9CCC65',
      label: 'Three-quarter box',
    },
    {
      id: 'box-half',
      path: 'M3 3H13V13H3Z M3 8H13',
      color: '#FFB300',
      label: 'Half box',
    },
    {
      id: 'box-quarter',
      path: 'M3 3H13V13H3Z M3 11H13',
      color: '#FF6F00',
      label: 'Quarter box',
    },
    {
      id: 'box-empty',
      path: 'M3 3H13V13H3Z',
      color: '#FFFFFF',
      label: 'Empty box',
    },
  ],
};

/**
 * Render an icon on canvas context
 * 
 * @param ctx - Canvas 2D rendering context
 * @param iconSet - Icon set identifier (e.g., '3-arrows')
 * @param iconIndex - Icon index within the set (0-based)
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param size - Icon size in pixels
 */
export function renderIconOnCanvas(
  ctx: CanvasRenderingContext2D,
  iconSet: ExcelIconSet,
  iconIndex: number,
  x: number,
  y: number,
  size: number
): void {
  const icons = ICON_SET_DEFINITIONS[iconSet];
  if (!icons || iconIndex < 0 || iconIndex >= icons.length) return;

  const icon = icons[iconIndex];
  const viewBox = icon.viewBox || '0 0 16 16';
  const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
  const scale = size / Math.max(vbWidth, vbHeight);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Set color and render path
  ctx.fillStyle = icon.color;
  ctx.strokeStyle = icon.color;
  ctx.lineWidth = 1.5;

  // Parse and render SVG path
  const path = new Path2D(icon.path);
  ctx.fill(path);
  ctx.stroke(path);

  ctx.restore();
}

/**
 * Get icon definition for a specific icon set and index
 */
export function getIconDefinition(
  iconSet: ExcelIconSet,
  iconIndex: number
): IconDefinition | null {
  const icons = ICON_SET_DEFINITIONS[iconSet];
  if (!icons || iconIndex < 0 || iconIndex >= icons.length) return null;
  return icons[iconIndex];
}

/**
 * Get count of icons in a set
 */
export function getIconSetCount(iconSet: ExcelIconSet): number {
  return ICON_SET_DEFINITIONS[iconSet]?.length || 0;
}
