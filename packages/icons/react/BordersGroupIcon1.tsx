import React from "react";
import type { SVGProps } from "react";

export interface BordersGroupIcon1Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const BordersGroupIcon1 = React.forwardRef<SVGSVGElement, BordersGroupIcon1Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 24} height={size ?? props.height ?? 24} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor"/><path d="M4 4h16M4 20h16M4 4v16M20 4v16" stroke="currentColor"/>
    </svg>
  )
);

BordersGroupIcon1.displayName = "BordersGroupIcon1";
export default BordersGroupIcon1;
