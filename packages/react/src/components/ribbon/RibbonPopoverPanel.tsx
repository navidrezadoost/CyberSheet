import React, { type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useRibbonAnchorPosition } from './useRibbonAnchorPosition';

export interface RibbonPopoverPanelProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Ribbon dropdown panel — fixed positioning + body portal so menus are never clipped by ribbon overflow.
 */
export function RibbonPopoverPanel({
  open,
  anchorRef,
  children,
  className = '',
  style,
}: RibbonPopoverPanelProps) {
  const anchorStyle = useRibbonAnchorPosition(open, anchorRef);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`cs-ribbon-popover cs-ribbon-floating-menu excel-app-ribbon-portal ${className}`.trim()}
      style={{ ...anchorStyle, ...style }}
      role="menu"
    >
      {children}
    </div>,
    document.body,
  );
}
