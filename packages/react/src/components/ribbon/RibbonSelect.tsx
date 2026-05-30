import React, { useMemo } from 'react';
import { SmilodonSelectCore, type SmilodonSelectItem } from '../SmilodonNativeSelect';
import './ribbon.css';

export type RibbonSelectOption = string | number | { value: string | number; label: string };

export interface RibbonSelectProps {
  value: string | number;
  options: RibbonSelectOption[];
  onChange: (value: string) => void;
  width?: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
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
  className = '',
}) => {
  const items: SmilodonSelectItem[] = useMemo(
    () => options.map((opt) => (
      typeof opt === 'object'
        ? { value: opt.value, label: opt.label }
        : { value: opt, label: String(opt) }
    )),
    [options]
  );

  const selectedValue = value === undefined || value === null ? '' : value;

  return (
    <SmilodonSelectCore
      className={`ribbon-select smilodon-excel-select ${className}`.trim()}
      style={{ width: `${width}px` }}
      items={placeholder ? [{ value: '', label: placeholder, disabled: true }, ...items] : items}
      value={selectedValue}
      disabled={disabled}
      ariaLabel={ariaLabel}
      onValueChange={onChange}
    />
  );
};
