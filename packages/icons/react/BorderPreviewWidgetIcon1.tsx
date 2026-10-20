import React from "react";
import type { SVGProps } from "react";

export interface BorderPreviewWidgetIcon1Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const BorderPreviewWidgetIcon1 = React.forwardRef<SVGSVGElement, BorderPreviewWidgetIcon1Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 200} height={size ?? props.height ?? 200} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <rect x="40" y="40" width="120" height="120" fill="none" stroke="#ddd"/><path d="M40 40h120M40 160h120M40 40v120M160 40v120M40 100h120M100 40v120M40 160L160 40M40 40l120 120" stroke="#555"/>
    </svg>
  )
);

BorderPreviewWidgetIcon1.displayName = "BorderPreviewWidgetIcon1";
export default BorderPreviewWidgetIcon1;
