import React from "react";
import type { SVGProps } from "react";

export interface LineStyleGridIcon1Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const LineStyleGridIcon1 = React.forwardRef<SVGSVGElement, LineStyleGridIcon1Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 100 12" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 100} height={size ?? props.height ?? 12} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <path d="M0 3h100M0 9h100" stroke="currentColor"/>
    </svg>
  )
);

LineStyleGridIcon1.displayName = "LineStyleGridIcon1";
export default LineStyleGridIcon1;
