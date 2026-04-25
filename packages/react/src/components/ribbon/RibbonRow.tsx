import React from 'react';
import './ribbon.css';

export interface RibbonRowProps {
  children: React.ReactNode;
  gap?: number;
  align?: 'start' | 'center' | 'end';
}

/**
 * RibbonRow - Horizontal layout container for Ribbon controls
 * 
 * Used to arrange buttons and dropdowns horizontally within a RibbonGroup.
 * Matches Excel's 4px gap between controls.
 * 
 * @example
 * <RibbonRow>
 *   <FontFamilySelect />
 *   <FontSizeSelect />
 * </RibbonRow>
 */
export const RibbonRow: React.FC<RibbonRowProps> = ({
  children,
  gap = 4,
  align = 'center',
}) => {
  return (
    <div
      className="ribbon-row"
      style={{
        gap: `${gap}px`,
        alignItems: align,
      }}
    >
      {children}
    </div>
  );
};
