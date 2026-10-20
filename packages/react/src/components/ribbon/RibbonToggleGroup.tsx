/**
 * RibbonToggleGroup Component
 * 
 * Handles mutually exclusive button states (radio group behavior).
 * Required for Alignment (left/center/right) where only one can be active.
 * 
 * Difference from independent toggles (Bold, Italic, Underline):
 * - Independent: Multiple can be active simultaneously
 * - Radio group: Only one active at a time
 * 
 * This abstraction prevents hacking radio behavior into individual buttons,
 * which would lead to state synchronization bugs.
 * 
 * Usage:
 * ```tsx
 * <RibbonToggleGroup
 *   value={horizontalAlign}
 *   onChange={setHorizontalAlign}
 * >
 *   <RibbonButton value="left" icon={<AlignLeftIcon />} tooltip="Align Left" />
 *   <RibbonButton value="center" icon={<AlignCenterIcon />} tooltip="Align Center" />
 *   <RibbonButton value="right" icon={<AlignRightIcon />} tooltip="Align Right" />
 * </RibbonToggleGroup>
 * ```
 */

import React, { cloneElement, isValidElement } from "react";

export interface RibbonToggleGroupProps<T extends string> {
  /** Currently selected value */
  value?: T | "mixed";

  /** Callback when selection changes */
  onChange: (value: T) => void;

  /** Button children (must be RibbonButton components) */
  children: React.ReactNode;

  /** Disabled state (affects all buttons in group) */
  disabled?: boolean;

  /** Group type ("single" or "multiple") */
  type?: "single" | "multiple";

  /** ARIA label for the group */
  ariaLabel?: string;
}

/**
 * Toggle group supporting mutually exclusive (radio) and multi-select
 */
export function RibbonToggleGroup<T extends string>({
  value,
  onChange,
  children,
  disabled = false,
  type = "single",
  ariaLabel,
}: RibbonToggleGroupProps<T>) {
  /**
   * Determine if specific child is active
   */
  const isChildActive = (childValue: T): boolean => {
    if (value === "mixed") return false;
    return value === childValue;
  };

  /**
   * Handle child button click
   */
  const handleChildClick = (childValue: T) => {
    if (disabled) return;

    if (type === "single") {
      // Radio behavior: always set to clicked value
      onChange(childValue);
    } else {
      // Multi-select behavior: toggle
      // (Note: For alignment, we use "single", but this supports future use cases)
      onChange(childValue);
    }
  };

  /**
   * Clone children with active state + click handler
   */
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    // Extract value from child props
    const childValue = (child.props as any).value as T | undefined;

    if (childValue === undefined) {
      console.warn(
        "RibbonToggleGroup child is missing 'value' prop:",
        child
      );
      return child;
    }

    // Clone with enhanced props
    return cloneElement(child, {
      active: isChildActive(childValue),
      onClick: () => handleChildClick(childValue),
      disabled: disabled || (child.props as any).disabled,
    } as any);
  });

  return (
    <div
      className="cs-ribbon-toggle-group"
      role={type === "single" ? "radiogroup" : "group"}
      aria-label={ariaLabel}
    >
      {enhancedChildren}
    </div>
  );
}

/**
 * Specialized component for horizontal alignment (common use case)
 */
export interface HorizontalAlignGroupProps {
  value?: "left" | "center" | "right" | "justify" | "mixed";
  onChange: (value: "left" | "center" | "right" | "justify") => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function HorizontalAlignGroup({
  value,
  onChange,
  children,
  disabled,
}: HorizontalAlignGroupProps) {
  return (
    <RibbonToggleGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      type="single"
      ariaLabel="Horizontal alignment"
    >
      {children}
    </RibbonToggleGroup>
  );
}

/**
 * Specialized component for vertical alignment (common use case)
 */
export interface VerticalAlignGroupProps {
  value?: "top" | "middle" | "bottom" | "mixed";
  onChange: (value: "top" | "middle" | "bottom") => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function VerticalAlignGroup({
  value,
  onChange,
  children,
  disabled,
}: VerticalAlignGroupProps) {
  return (
    <RibbonToggleGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      type="single"
      ariaLabel="Vertical alignment"
    >
      {children}
    </RibbonToggleGroup>
  );
}
