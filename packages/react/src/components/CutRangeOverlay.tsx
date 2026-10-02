/**
 * CutRangeOverlay.tsx
 *
 * Renders a marching ants border animation over cut cells
 * to visually indicate which cells will be cleared after paste
 */

import React, { useEffect, useRef } from "react";

export interface CutRangeOverlayProps {
  cutRange: {
    start: { row: number; col: number };
    end: { row: number; col: number };
  } | null;
  renderer: any; // CanvasRenderer
  zoom: number;
}

export const CutRangeOverlay: React.FC<CutRangeOverlayProps> = ({
  cutRange,
  renderer,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    if (!cutRange || !renderer || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get canvas dimensions
    const container = renderer.container;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // Animation function
    const animate = () => {
      if (!ctx || !cutRange) return;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get cell bounds for the cut range
      const startBounds = renderer.getCellBounds?.(
        cutRange.start.row,
        cutRange.start.col,
      );
      const endBounds = renderer.getCellBounds?.(
        cutRange.end.row,
        cutRange.end.col,
      );

      if (!startBounds || !endBounds) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate rectangle
      const x = Math.min(startBounds.x, endBounds.x);
      const y = Math.min(startBounds.y, endBounds.y);
      const w =
        Math.max(
          startBounds.x + startBounds.width,
          endBounds.x + endBounds.width,
        ) - x;
      const h =
        Math.max(
          startBounds.y + startBounds.height,
          endBounds.y + endBounds.height,
        ) - y;

      // Draw marching ants border
      ctx.save();
      ctx.strokeStyle = "#1A73E8";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.restore();

      // Update offset for animation
      offsetRef.current = (offsetRef.current + 0.5) % 10;

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [cutRange, renderer, zoom]);

  if (!cutRange) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none", // Allow clicks to pass through
        zIndex: 900, // Above the spreadsheet but below overlays
      }}
    />
  );
};
