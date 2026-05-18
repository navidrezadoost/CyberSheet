/**
 * ConditionalFormattingRenderer.tsx
 * 
 * React components for rendering conditional formatting elements:
 * - Icon Sets (19 Excel icon sets with SVG rendering)
 * - Data Bars (gradient bars with percentage fill)
 * - Color Scales (applied via cell styles, no separate component needed)
 * 
 * These components are used by CyberSheet to overlay conditional formatting
 * visuals on top of cell values.
 */

import React from 'react';
import type { ExcelIconSet } from '@cyber-sheet/core';
import { ICON_SET_DEFINITIONS } from '@cyber-sheet/core/src/icon-sets';

export interface IconSetRendererProps {
  /** Icon set type (e.g., '3-arrows', '5-ratings') */
  iconSet: ExcelIconSet;
  /** Icon index within the set (0-based) */
  iconIndex: number;
  /** Size in pixels (default: 14) */
  size?: number;
  /** Additional class name */
  className?: string;
  /** Style overrides */
  style?: React.CSSProperties;
}

/**
 * IconSetRenderer - Renders Excel conditional formatting icons
 * 
 * Displays one of 19 Excel icon sets (arrows, traffic lights, stars, etc.)
 * with SVG rendering for pixel-perfect fidelity.
 * 
 * @example
 * ```tsx
 * <IconSetRenderer iconSet="3-arrows" iconIndex={0} size={16} />
 * // Renders green up arrow
 * 
 * <IconSetRenderer iconSet="5-ratings" iconIndex={4} />
 * // Renders 1-star rating
 * ```
 */
export const IconSetRenderer: React.FC<IconSetRendererProps> = ({
  iconSet,
  iconIndex,
  size = 14,
  className,
  style,
}) => {
  const icons = ICON_SET_DEFINITIONS[iconSet];
  if (!icons || iconIndex < 0 || iconIndex >= icons.length) {
    return null;
  }

  const icon = icons[iconIndex];
  const viewBox = icon.viewBox || '0 0 16 16';

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      role="img"
      aria-label={icon.label}
    >
      <path
        d={icon.path}
        fill={icon.color}
        stroke={icon.color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export interface DataBarRendererProps {
  /** Fill percentage (0-1) */
  percent: number;
  /** Bar color */
  color: string;
  /** Use gradient fill (default: true) */
  gradient?: boolean;
  /** Show cell value text (default: true) */
  showValue?: boolean;
  /** Cell value content */
  value?: string | number;
  /** Width of the container (pixels) */
  width?: number;
  /** Height of the container (pixels) */
  height?: number;
}

/**
 * DataBarRenderer - Renders Excel data bars in cells
 * 
 * Displays a horizontal bar with proportional fill based on cell value.
 * Supports gradient rendering and optional value text overlay.
 * 
 * @example
 * ```tsx
 * <DataBarRenderer 
 *   percent={0.75} 
 *   color="#638EC6" 
 *   gradient={true}
 *   showValue={true}
 *   value={75}
 *   width={100}
 *   height={20}
 * />
 * // Renders 75%-filled blue gradient bar with "75" text
 * ```
 */
export const DataBarRenderer: React.FC<DataBarRendererProps> = ({
  percent,
  color,
  gradient = true,
  showValue = true,
  value,
  width = 100,
  height = 20,
}) => {
  const safePercent = Math.max(0, Math.min(1, percent));
  const barWidth = width * safePercent;

  // Generate gradient ID (unique per instance)
  const gradientId = React.useId();

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* SVG Data Bar */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.65" />
            </linearGradient>
          </defs>
        )}
        <rect
          x="3"
          y="3"
          width={Math.max(0, barWidth - 6)}
          height={Math.max(4, height - 6)}
          fill={gradient ? `url(#${gradientId})` : color}
          rx="2"
        />
      </svg>

      {/* Value Text Overlay */}
      {showValue && value !== null && value !== undefined && (
        <div
          style={{
            position: 'relative',
            paddingLeft: '6px',
            fontSize: '11px',
            fontFamily: 'Segoe UI, Calibri, sans-serif',
            color: '#333',
            zIndex: 1,
            userSelect: 'none',
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
};

/**
 * Combined renderer for all conditional formatting elements in a cell
 */
export interface ConditionalFormattingCellProps {
  /** Cell value */
  value: string | number | boolean | null;
  /** Icon data (if icon set rule applies) */
  icon?: {
    iconSet: ExcelIconSet;
    iconIndex: number;
    showIconOnly?: boolean;
  };
  /** Data bar data (if data bar rule applies) */
  dataBar?: {
    percent: number;
    color: string;
    gradient?: boolean;
    showValue?: boolean;
  };
  /** Cell width (for data bar sizing) */
  cellWidth?: number;
  /** Cell height (for layout) */
  cellHeight?: number;
}

/**
 * ConditionalFormattingCell - Composite renderer for CF elements
 * 
 * Renders icon sets and/or data bars alongside cell values according
 * to Excel conditional formatting display rules.
 */
export const ConditionalFormattingCell: React.FC<ConditionalFormattingCellProps> = ({
  value,
  icon,
  dataBar,
  cellWidth = 100,
  cellHeight = 20,
}) => {
  const showValue =
    !icon?.showIconOnly && (dataBar?.showValue ?? true) && value !== null && value !== undefined;

  return (
    <div
      style={{
        width: `${cellWidth}px`,
        height: `${cellHeight}px`,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        position: 'relative',
      }}
    >
      {/* Data bar (background layer) */}
      {dataBar && (
        <DataBarRenderer
          percent={dataBar.percent}
          color={dataBar.color}
          gradient={dataBar.gradient}
          showValue={false} // We handle value separately
          width={cellWidth}
          height={cellHeight}
        />
      )}

      {/* Icon + Value (foreground layer) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: '4px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {icon && (
          <IconSetRenderer
            iconSet={icon.iconSet}
            iconIndex={icon.iconIndex}
            size={Math.min(14, cellHeight - 4)}
          />
        )}
        {showValue && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'Segoe UI, Calibri, sans-serif',
              color: '#333',
            }}
          >
            {String(value)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConditionalFormattingCell;
