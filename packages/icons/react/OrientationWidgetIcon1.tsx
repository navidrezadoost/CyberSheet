import React from "react";
import type { SVGProps } from "react";

export interface OrientationWidgetIcon1Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const OrientationWidgetIcon1 = React.forwardRef<SVGSVGElement, OrientationWidgetIcon1Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 150} height={size ?? props.height ?? 150} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <circle cx="75" cy="75" r="60" fill="none" stroke="#ddd"/><path d="M75 15v8M135 75h-8M75 135v-8M15 75h8M32.6 32.6l5.7 5.7M117.4 117.4l-5.7-5.7M117.4 32.6l-5.7 5.7M32.6 117.4l5.7-5.7" stroke="#888"/><path d="M75 75 103 30" stroke="#0783d1" stroke-width="3"/><circle cx="103" cy="30" r="7" fill="#0783d1"/><text x="75" y="80" text-anchor="middle" font-size="12" fill="#333">Text</text>
    </svg>
  )
);

OrientationWidgetIcon1.displayName = "OrientationWidgetIcon1";
export default OrientationWidgetIcon1;
