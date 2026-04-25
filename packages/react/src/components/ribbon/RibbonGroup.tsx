import React from 'react';
import './ribbon.css';

export interface RibbonGroupProps {
  title: string;
  children: React.ReactNode;
}

/**
 * RibbonGroup - Container for related Ribbon controls
 * 
 * Matches Excel 365 Online group styling:
 * - 4px padding, 8px horizontal spacing
 * - Right border: 1px solid #e1dfdd
 * - Title below controls (11px Segoe UI)
 * - Inline-flex layout with column direction
 * 
 * @example
 * <RibbonGroup title="Font">
 *   <FontFamilyDropdown />
 *   <BoldButton />
 * </RibbonGroup>
 */
export const RibbonGroup: React.FC<RibbonGroupProps> = ({ title, children }) => {
  return (
    <div className="ribbon-group" role="group" aria-label={title}>
      <div className="ribbon-group-content">{children}</div>
      <div className="ribbon-group-title">{title}</div>
    </div>
  );
};
