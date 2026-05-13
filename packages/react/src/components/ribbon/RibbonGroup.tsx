import React from 'react';
import './ribbon.css';

export interface RibbonGroupProps {
  title: string;
  children: React.ReactNode;
  showDialogLauncher?: boolean;
  onDialogLauncherClick?: () => void;
  className?: string;
}

/**
 * RibbonGroup - Container for related Ribbon controls
 * 
 * Matches Excel 365 Online group styling:
 * - 4px padding, 8px horizontal spacing
 * - Right border: 1px solid #e1dfdd
 * - Title below controls (11px Segoe UI)
 * - Optional dialog launcher button (14x14px, bottom-right)
 * - Inline-flex layout with column direction
 * 
 * @example
 * <RibbonGroup title="Font" showDialogLauncher onDialogLauncherClick={openFontDialog}>
 *   <FontFamilyDropdown />
 *   <BoldButton />
 * </RibbonGroup>
 */
export const RibbonGroup: React.FC<RibbonGroupProps> = ({ 
  title, 
  children,
  showDialogLauncher = false,
  onDialogLauncherClick,
  className = '',
}) => {
  return (
    <div className={`ribbon-group ${className}`.trim()} role="group" aria-label={title}>
      <div className="ribbon-group-content">{children}</div>
      <div className="ribbon-group-title">
        <span className="group-label">{title}</span>
        {showDialogLauncher && (
          <button
            className="group-dialog-launcher"
            onClick={onDialogLauncherClick}
            title={`${title} settings`}
            aria-label={`Open ${title} settings dialog`}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M11 11L7 7M7 7L3 3M7 7L11 3M7 7L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
