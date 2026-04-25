import React from 'react';
import './ribbon.css';

export interface RibbonSelectProps {
  value: string | number;
  options: (string | number)[];
  onChange: (value: string) => void;
  width?: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * RibbonSelect - Dropdown component for Excel-like Ribbon UI
 * 
 * Matches Excel 365 Online dropdown styling:
 * - Height: 24px
 * - Font: 12px Segoe UI
 * - Border: 1px solid #8a8886
 * - Hover border: #323130
 * - Focus border: #0078d4
 * - Border radius: 2px
 * 
 * @example
 * <RibbonSelect
 *   value={fontSize}
 *   options={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24]}
 *   onChange={(v) => setFontSize(Number(v))}
 *   width={60}
 *   ariaLabel="Font size"
 * />
 */
export const RibbonSelect: React.FC<RibbonSelectProps> = ({
  value,
  options,
  onChange,
  width = 120,
  placeholder,
  disabled = false,
  ariaLabel,
}) => {
  return (
    <select
      className="ribbon-select"
      style={{ width: `${width}px` }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
};
