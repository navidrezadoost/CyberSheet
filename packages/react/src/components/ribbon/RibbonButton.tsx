import React from 'react';
import './ribbon.css';

export interface RibbonButtonProps {
  icon: React.ReactNode;
  label?: string;
  tooltip: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: 'small' | 'large';
}

/**
 * RibbonButton - Core button component for Excel-like Ribbon UI
 * 
 * Matches Excel 365 Online button behavior:
 * - 32x32px default size (small buttons)
 * - Hover state: #edebe9
 * - Active state: #e1dfdd
 * - Disabled state: #a19f9d
 * - 2px border radius
 * - Fluent UI icons
 * 
 * @example
 * <RibbonButton
 *   icon={<TextBoldRegular />}
 *   tooltip="Bold (Ctrl+B)"
 *   active={isBold}
 *   onClick={handleBold}
 * />
 */
export const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon,
  label,
  tooltip,
  active = false,
  disabled = false,
  onClick,
  size = 'small',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onClick();
      }
    }
  };

  return (
    <button
      className={`ribbon-btn ribbon-btn-${size} ${active ? 'active' : ''}`}
      title={tooltip}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={tooltip}
      aria-pressed={active}
      type="button"
    >
      <div className="ribbon-btn-icon">{icon}</div>
      {label && <div className="ribbon-btn-label">{label}</div>}
    </button>
  );
};
