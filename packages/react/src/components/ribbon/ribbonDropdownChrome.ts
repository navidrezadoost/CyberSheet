import type { CSSProperties } from 'react';

/** Visual chrome only — pair with RibbonPopoverPanel (no position / z-index). */
export function ribbonDropdownChrome(extra?: CSSProperties): CSSProperties {
  return {
    background: '#FFFFFF',
    border: '1px solid #ababab',
    borderRadius: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    ...extra,
  };
}
