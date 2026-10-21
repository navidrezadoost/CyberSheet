import React, { useRef } from 'react';
import { RibbonPopoverPanel } from './RibbonPopoverPanel';

export interface RibbonDropdownHostProps {
  open: boolean;
  menu: React.ReactNode;
  menuStyle?: React.CSSProperties;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** Wraps a trigger; renders menu in a portaled fixed layer anchored to this host. */
export function RibbonDropdownHost({
  open,
  menu,
  menuStyle,
  className,
  style,
  children,
}: RibbonDropdownHostProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={anchorRef}
      className={className}
      style={{ position: 'relative', ...style }}
    >
      {children}
      <RibbonPopoverPanel open={open} anchorRef={anchorRef} style={menuStyle}>
        {menu}
      </RibbonPopoverPanel>
    </div>
  );
}
