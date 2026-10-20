import React from "react";
import type { SVGProps } from "react";

export interface PatternGridIcon1Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const PatternGridIcon1 = React.forwardRef<SVGSVGElement, PatternGridIcon1Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 24} height={size ?? props.height ?? 24} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <defs><pattern id="pattern-grid" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><path d="M0 8 8 0" stroke="#999"/></pattern></defs><rect width="24" height="24" fill="url(#pattern-grid)"/>
    </svg>
  )
);

PatternGridIcon1.displayName = "PatternGridIcon1";
export default PatternGridIcon1;
