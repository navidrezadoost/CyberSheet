import React, { type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useRibbonAnchorPosition } from './useRibbonAnchorPosition';

export interface RibbonAnchoredOverlayProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
}

/** Fixed + portaled overlay for color/border/custom panels (not always role=menu). */
export function RibbonAnchoredOverlay({
  open,
  anchorRef,
  children,
  className = '',
  style,
  role = 'dialog',
}: RibbonAnchoredOverlayProps) {
  const anchorStyle = useRibbonAnchorPosition(open, anchorRef);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`cs-ribbon-popover cs-ribbon-floating-menu excel-app-ribbon-portal ${className}`.trim()}
      style={{ ...anchorStyle, ...style }}
      role={role}
    >
      {children}
    </div>,
    document.body,
  );
}
