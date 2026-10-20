import React from "react";
import type { SVGProps } from "react";

export interface FillColorButtonIcon1Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const FillColorButtonIcon1 = React.forwardRef<SVGSVGElement, FillColorButtonIcon1Props>(
  ({ size, className, style, ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? 24} height={size ?? props.height ?? 24} fill={props.fill || "currentColor"} className={className} style={style} {...props}>
      <path d="M4 4h16v12H4z" fill="#fff" stroke="currentColor"/><path d="M4 16h16v4H4z" fill="#4472c4"/><path d="m9 10 3-4 3 4-3 3z" fill="#f2c811"/>
    </svg>
  )
);

FillColorButtonIcon1.displayName = "FillColorButtonIcon1";
export default FillColorButtonIcon1;
