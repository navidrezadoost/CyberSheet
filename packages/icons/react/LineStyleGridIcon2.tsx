import React from "react";
import type { SVGProps } from "react";

export interface LineStyleGridIcon2Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const LineStyleGridIcon2 = React.forwardRef<SVGSVGElement, LineStyleGridIcon2Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 100 12" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 100} height={size ?? props.height ?? 12} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <path d="M0 6h100" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>
    </svg>
  )
);

LineStyleGridIcon2.displayName = "LineStyleGridIcon2";
export default LineStyleGridIcon2;
