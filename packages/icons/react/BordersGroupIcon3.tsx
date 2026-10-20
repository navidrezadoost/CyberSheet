import React from "react";
import type { SVGProps } from "react";

export interface BordersGroupIcon3Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const BordersGroupIcon3 = React.forwardRef<SVGSVGElement, BordersGroupIcon3Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 16} height={size ?? props.height ?? 16} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <rect x="2" y="2" width="12" height="10" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2" y="13" width="12" height="2" fill="currentColor"/>
    </svg>
  )
);

BordersGroupIcon3.displayName = "BordersGroupIcon3";
export default BordersGroupIcon3;
