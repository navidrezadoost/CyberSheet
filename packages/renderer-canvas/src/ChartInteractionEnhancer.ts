/**
 * ChartInteractionEnhancer.ts
 * 
 * Advanced chart interaction features:
 * - Zoom/Pan with mouse wheel and drag
 * - Drill-down for hierarchical charts
 * - Annotation system (text, shapes, arrows)
 * - Crosshairs for precise data reading
 * - Data point selection and highlighting
 */

import { ChartEngine, ChartData, ChartOptions } from './ChartEngine';

export interface ZoomState {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  minZoom: number;
  maxZoom: number;
}

export interface PanState {
  isPanning: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export interface AnnotationShape {
  type: 'text' | 'rectangle' | 'circle' | 'arrow' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  strokeWidth?: number;
}

export interface CrosshairState {
  enabled: boolean;
  x: number;
  y: number;
  color: string;
  lineWidth: number;
}

export interface SelectionState {
  selectedIndices: number[];
  highlightColor: string;
  highlightAlpha: number;
}

export interface DrillDownLevel {
  data: ChartData;
  title: string;
}

export interface InteractionOptions {
  enableZoom?: boolean;
  enablePan?: boolean;
  enableCrosshair?: boolean;
  enableSelection?: boolean;
  enableAnnotations?: boolean;
  enableDrillDown?: boolean;
  enableTouch?: boolean;
  zoomSpeed?: number;
  panSmoothing?: number;
  crosshairColor?: string;
  selectionColor?: string;
  onRedraw?: () => void;
  onSelectionChange?: (indices: number[]) => void;
  onZoomChange?: (state: ZoomState) => void;
}

/**
 * Enhanced chart interaction manager
 */
export class ChartInteractionEnhancer {
  private canvas: HTMLCanvasElement;
  private chartEngine: ChartEngine;
  private options: InteractionOptions;
  
  private zoomState: ZoomState;
  private panState: PanState;
  private crosshairState: CrosshairState;
  private selectionState: SelectionState;
  private annotations: AnnotationShape[];
  private drillDownStack: DrillDownLevel[];
  
  private listeners: Map<string, any>;
  private touchStartDistance: number = 0;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    chartEngine: ChartEngine,
    options: InteractionOptions = {}
  ) {
    this.canvas = canvas;
    this.chartEngine = chartEngine;
    this.options = {
      enableZoom: options.enableZoom ?? true,
      enablePan: options.enablePan ?? true,
      enableCrosshair: options.enableCrosshair ?? false,
      enableSelection: options.enableSelection ?? true,
      enableAnnotations: options.enableAnnotations ?? false,
      enableDrillDown: options.enableDrillDown ?? false,
      enableTouch: options.enableTouch ?? true,
      zoomSpeed: options.zoomSpeed ?? 0.1,
      panSmoothing: options.panSmoothing ?? 1,
      crosshairColor: options.crosshairColor ?? '#666666',
      selectionColor: options.selectionColor ?? '#4285F4',
      onRedraw: options.onRedraw,
      onSelectionChange: options.onSelectionChange,
      onZoomChange: options.onZoomChange,
    };
    
    this.zoomState = {
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      minZoom: 0.5,
      maxZoom: 5,
    };
    
    this.panState = {
      isPanning: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    };
    
    this.crosshairState = {
      enabled: false,
      x: 0,
      y: 0,
      color: this.options.crosshairColor!,
      lineWidth: 1,
    };
    
    this.selectionState = {
      selectedIndices: [],
      highlightColor: this.options.selectionColor!,
      highlightAlpha: 0.3,
    };
    
    this.annotations = [];
    this.drillDownStack = [];
    this.listeners = new Map();
    
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    if (this.options.enableZoom) {
      this.setupZoomListeners();
    }
    
    if (this.options.enablePan) {
      this.setupPanListeners();
    }
    
    if (this.options.enableCrosshair) {
      this.setupCrosshairListeners();
    }
    
    if (this.options.enableSelection) {
      this.setupSelectionListeners();
    }
    
    if (this.options.enableTouch) {
      this.setupTouchListeners();
    }
  }

  /**
   * Setup zoom event listeners
   */
  private setupZoomListeners(): void {
    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      const zoomFactor = event.deltaY > 0 ? 
        (1 - this.options.zoomSpeed!) : 
        (1 + this.options.zoomSpeed!);
      
      const newScaleX = this.zoomState.scaleX * zoomFactor;
      const newScaleY = this.zoomState.scaleY * zoomFactor;
      
      // Clamp zoom
      if (newScaleX >= this.zoomState.minZoom && newScaleX <= this.zoomState.maxZoom) {
        // Zoom toward mouse position
        this.zoomState.offsetX = mouseX - (mouseX - this.zoomState.offsetX) * zoomFactor;
        this.zoomState.offsetY = mouseY - (mouseY - this.zoomState.offsetY) * zoomFactor;
        this.zoomState.scaleX = newScaleX;
        this.zoomState.scaleY = newScaleY;
        
        if (this.options.onZoomChange) {
          this.options.onZoomChange(this.getZoomState());
        }
        
        this.requestRedraw();
      }
    };
    
    this.canvas.addEventListener('wheel', wheelHandler, { passive: false });
    this.listeners.set('wheel', wheelHandler);
  }

  /**
   * Setup pan event listeners
   */
  private setupPanListeners(): void {
    const mouseDownHandler = (event: MouseEvent) => {
      if (event.button === 0 && (event.shiftKey || event.ctrlKey)) {
        this.panState.isPanning = true;
        this.panState.startX = event.clientX;
        this.panState.startY = event.clientY;
        this.canvas.style.cursor = 'grabbing';
      }
    };
    
    const mouseMoveHandler = (event: MouseEvent) => {
      if (this.panState.isPanning) {
        const dx = event.clientX - this.panState.startX;
        const dy = event.clientY - this.panState.startY;
        
        this.zoomState.offsetX += dx * this.options.panSmoothing!;
        this.zoomState.offsetY += dy * this.options.panSmoothing!;
        
        this.panState.startX = event.clientX;
        this.panState.startY = event.clientY;
        
        this.requestRedraw();
      }
    };
    
    const mouseUpHandler = () => {
      if (this.panState.isPanning) {
        this.panState.isPanning = false;
        this.canvas.style.cursor = 'default';
      }
    };
    
    this.canvas.addEventListener('mousedown', mouseDownHandler);
    this.canvas.addEventListener('mousemove', mouseMoveHandler);
    this.canvas.addEventListener('mouseup', mouseUpHandler);
    this.canvas.addEventListener('mouseleave', mouseUpHandler);
    
    this.listeners.set('mousedown', mouseDownHandler);
    this.listeners.set('mousemove', mouseMoveHandler);
    this.listeners.set('mouseup', mouseUpHandler);
  }

  /**
   * Setup crosshair event listeners
   */
  private setupCrosshairListeners(): void {
    const mouseMoveHandler = (event: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.crosshairState.x = event.clientX - rect.left;
      this.crosshairState.y = event.clientY - rect.top;
      this.crosshairState.enabled = true;
      this.requestRedraw();
    };
    
    const mouseLeaveHandler = () => {
      this.crosshairState.enabled = false;
      this.requestRedraw();
    };
    
    this.canvas.addEventListener('mousemove', mouseMoveHandler);
    this.canvas.addEventListener('mouseleave', mouseLeaveHandler);
    
    if (!this.listeners.has('mousemove')) {
      this.listeners.set('mousemove', mouseMoveHandler);
    }
  }

  /**
   * Setup selection event listeners
   */
  private setupSelectionListeners(): void {
    const clickHandler = (event: MouseEvent) => {
      if (this.panState.isPanning) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      // Find clicked data point (simplified - would need actual chart context)
      const dataIndex = this.findDataPointAtPosition(clickX, clickY);
      
      if (dataIndex !== -1) {
        if (event.ctrlKey || event.metaKey) {
          // Multi-select
          const idx = this.selectionState.selectedIndices.indexOf(dataIndex);
          if (idx > -1) {
            this.selectionState.selectedIndices.splice(idx, 1);
          } else {
            this.selectionState.selectedIndices.push(dataIndex);
          }
        } else {
          // Single select
          this.selectionState.selectedIndices = [dataIndex];
        }
        
        if (this.options.onSelectionChange) {
          this.options.onSelectionChange(this.getSelectedIndices());
        }
        
        this.requestRedraw();
      }
    };
    
    this.canvas.addEventListener('click', clickHandler);
    this.listeners.set('click', clickHandler);
  }

  /**
   * Setup touch event listeners for mobile support
   */
  private setupTouchListeners(): void {
    let initialDistance = 0;
    let initialScale = 1;
    
    const touchStartHandler = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        // Two-finger pinch-to-zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        initialDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        initialScale = this.zoomState.scaleX;
        
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        this.lastTouchX = centerX;
        this.lastTouchY = centerY;
      } else if (event.touches.length === 1) {
        // Single finger pan
        const touch = event.touches[0];
        this.panState.isPanning = true;
        this.panState.startX = touch.clientX;
        this.panState.startY = touch.clientY;
      }
    };
    
    const touchMoveHandler = (event: TouchEvent) => {
      event.preventDefault();
      
      if (event.touches.length === 2 && this.options.enableZoom) {
        // Pinch zoom
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        const scale = (currentDistance / initialDistance) * initialScale;
        
        // Clamp zoom
        if (scale >= this.zoomState.minZoom && scale <= this.zoomState.maxZoom) {
          const rect = this.canvas.getBoundingClientRect();
          const centerX = ((touch1.clientX + touch2.clientX) / 2) - rect.left;
          const centerY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;
          
          // Zoom toward center of pinch
          const scaleChange = scale / this.zoomState.scaleX;
          this.zoomState.offsetX = centerX - (centerX - this.zoomState.offsetX) * scaleChange;
          this.zoomState.offsetY = centerY - (centerY - this.zoomState.offsetY) * scaleChange;
          
          this.zoomState.scaleX = scale;
          this.zoomState.scaleY = scale;
          
          this.requestRedraw();
          
          if (this.options.onZoomChange) {
            this.options.onZoomChange(this.getZoomState());
          }
        }
      } else if (event.touches.length === 1 && this.panState.isPanning && this.options.enablePan) {
        // Pan
        const touch = event.touches[0];
        const dx = touch.clientX - this.panState.startX;
        const dy = touch.clientY - this.panState.startY;
        
        this.zoomState.offsetX += dx;
        this.zoomState.offsetY += dy;
        
        this.panState.startX = touch.clientX;
        this.panState.startY = touch.clientY;
        
        this.requestRedraw();
      }
    };
    
    const touchEndHandler = () => {
      this.panState.isPanning = false;
      initialDistance = 0;
    };
    
    this.canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    this.canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    this.canvas.addEventListener('touchend', touchEndHandler);
    this.canvas.addEventListener('touchcancel', touchEndHandler);
    
    this.listeners.set('touchstart', touchStartHandler);
    this.listeners.set('touchmove', touchMoveHandler);
    this.listeners.set('touchend', touchEndHandler);
  }

  /**
   * Find data point at position (simplified)
   */
  private findDataPointAtPosition(x: number, y: number): number {
    // This would need access to chart rendering context
    // For now, return -1 (no point found)
    // Real implementation would calculate based on chart type and data
    return -1;
  }

  /**
   * Request chart redraw
   */
  private requestRedraw(): void {
    if (this.options.onRedraw) {
      this.options.onRedraw();
    }
  }

  /**
   * Add annotation to chart
   */
  addAnnotation(annotation: AnnotationShape): void {
    if (!this.options.enableAnnotations) return;
    this.annotations.push(annotation);
    this.requestRedraw();
  }

  /**
   * Remove annotation
   */
  removeAnnotation(index: number): void {
    if (index >= 0 && index < this.annotations.length) {
      this.annotations.splice(index, 1);
      this.requestRedraw();
    }
  }

  /**
   * Clear all annotations
   */
  clearAnnotations(): void {
    this.annotations = [];
    this.requestRedraw();
  }

  /**
   * Render annotations on canvas
   */
  renderAnnotations(ctx: CanvasRenderingContext2D): void {
    if (!this.options.enableAnnotations) return;
    
    this.annotations.forEach(annotation => {
      ctx.save();
      
      ctx.strokeStyle = annotation.color ?? '#000000';
      ctx.fillStyle = annotation.color ?? '#000000';
      ctx.lineWidth = annotation.strokeWidth ?? 2;
      
      switch (annotation.type) {
        case 'text':
          ctx.font = `${annotation.fontSize ?? 14}px sans-serif`;
          ctx.fillText(annotation.text ?? '', annotation.x, annotation.y);
          break;
          
        case 'rectangle':
          ctx.strokeRect(
            annotation.x,
            annotation.y,
            annotation.width ?? 100,
            annotation.height ?? 50
          );
          break;
          
        case 'circle':
          ctx.beginPath();
          ctx.arc(annotation.x, annotation.y, annotation.radius ?? 20, 0, Math.PI * 2);
          ctx.stroke();
          break;
          
        case 'line':
          ctx.beginPath();
          ctx.moveTo(annotation.x, annotation.y);
          ctx.lineTo(annotation.endX ?? annotation.x + 100, annotation.endY ?? annotation.y);
          ctx.stroke();
          break;
          
        case 'arrow':
          this.drawArrow(
            ctx,
            annotation.x,
            annotation.y,
            annotation.endX ?? annotation.x + 100,
            annotation.endY ?? annotation.y
          );
          break;
      }
      
      ctx.restore();
    });
  }

  /**
   * Draw arrow on canvas
   */
  private drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  /**
   * Render crosshair
   */
  renderCrosshair(ctx: CanvasRenderingContext2D): void {
    if (!this.crosshairState.enabled) return;
    
    ctx.save();
    ctx.strokeStyle = this.crosshairState.color;
    ctx.lineWidth = this.crosshairState.lineWidth;
    ctx.setLineDash([5, 5]);
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(this.crosshairState.x, 0);
    ctx.lineTo(this.crosshairState.x, this.canvas.height);
    ctx.stroke();
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, this.crosshairState.y);
    ctx.lineTo(this.canvas.width, this.crosshairState.y);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Push new drill-down level
   */
  drillDown(level: DrillDownLevel): void {
    if (!this.options.enableDrillDown) return;
    this.drillDownStack.push(level);
    // Would trigger re-render with new data
  }

  /**
   * Pop to previous drill-down level
   */
  drillUp(): DrillDownLevel | undefined {
    if (!this.options.enableDrillDown || this.drillDownStack.length === 0) {
      return undefined;
    }
    return this.drillDownStack.pop();
  }

  /**
   * Reset zoom and pan
   */
  resetView(): void {
    this.zoomState.scaleX = 1;
    this.zoomState.scaleY = 1;
    this.zoomState.offsetX = 0;
    this.zoomState.offsetY = 0;
    
    if (this.options.onZoomChange) {
      this.options.onZoomChange(this.getZoomState());
    }
    
    this.requestRedraw();
  }

  /**
   * Get current zoom state
   */
  getZoomState(): ZoomState {
    return { ...this.zoomState };
  }

  /**
   * Get selected indices
   */
  getSelectedIndices(): number[] {
    return [...this.selectionState.selectedIndices];
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectionState.selectedIndices = [];
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange([]);
    }
    this.requestRedraw();
  }

  /**
   * Apply zoom and pan transforms to canvas context
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.zoomState.offsetX, this.zoomState.offsetY);
    ctx.scale(this.zoomState.scaleX, this.zoomState.scaleY);
  }

  /**
   * Get inverse transform for coordinate conversion
   */
  screenToChart(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX - this.zoomState.offsetX) / this.zoomState.scaleX;
    const y = (screenY - this.zoomState.offsetY) / this.zoomState.scaleY;
    return { x, y };
  }

  /**
   * Convert chart coordinates to screen coordinates
   */
  chartToScreen(chartX: number, chartY: number): { x: number; y: number } {
    const x = chartX * this.zoomState.scaleX + this.zoomState.offsetX;
    const y = chartY * this.zoomState.scaleY + this.zoomState.offsetY;
    return { x, y };
  }

  /**
   * Check if a point is within zoom/pan bounds
   */
  isPointVisible(x: number, y: number): boolean {
    return x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height;
  }

  /**
   * Animate zoom to a specific scale
   */
  animateZoomTo(targetScale: number, duration: number = 300): void {
    const startScale = this.zoomState.scaleX;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      
      const currentScale = startScale + (targetScale - startScale) * eased;
      
      if (currentScale >= this.zoomState.minZoom && currentScale <= this.zoomState.maxZoom) {
        this.zoomState.scaleX = currentScale;
        this.zoomState.scaleY = currentScale;
        
        if (this.options.onZoomChange) {
          this.options.onZoomChange(this.getZoomState());
        }
        
        this.requestRedraw();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this.listeners.forEach((listener, event) => {
      this.canvas.removeEventListener(event, listener);
    });
    this.listeners.clear();
  }
}
