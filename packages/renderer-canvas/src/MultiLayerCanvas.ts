/**
 * Multi-Layer Canvas Rendering System
 * 
 * Competitive Advantages:
 * - 4 separate canvas layers (background, grid, content, overlay) for independent repainting
 * - DevicePixelRatio-aware rendering at all zoom levels (1x, 1.25x, 1.5x, 2x, 3x)
 * - Granular anti-aliasing control per layer
 * - Pixel-perfect gridlines with subpixel alignment
 * - Zero DOM manipulation during scrolling
 * - Hardware-accelerated compositing via CSS transforms
 */

export type CanvasLayerType = 'background' | 'grid' | 'content' | 'overlay';

export interface LayerRenderOptions {
  /** Enable/disable anti-aliasing for shapes and paths */
  imageSmoothingEnabled?: boolean;
  /** Anti-aliasing quality: low (faster) | medium | high (slower but better) */
  imageSmoothingQuality?: 'low' | 'medium' | 'high';
  /** Enable subpixel text rendering (ClearType/LCD) */
  subpixelText?: boolean;
  /** Force integer pixel alignment for crisp lines */
  snapToPixel?: boolean;
  /** Layer opacity (0-1) */
  opacity?: number;
  /** Blend mode for compositing */
  blendMode?: GlobalCompositeOperation;
}

export interface MultiLayerCanvasOptions {
  /** Container element to mount canvases into */
  container: HTMLElement;
  /** Initial width in CSS pixels */
  width: number;
  /** Initial height in CSS pixels */
  height: number;
  /** Per-layer rendering options */
  layers?: {
    background?: LayerRenderOptions;
    grid?: LayerRenderOptions;
    content?: LayerRenderOptions;
    overlay?: LayerRenderOptions;
  };
  /** Enable debug mode with layer visualization */
  debug?: boolean;
}

export class MultiLayerCanvas {
  private container: HTMLElement;
  private canvases: Map<CanvasLayerType, HTMLCanvasElement> = new Map();
  private contexts: Map<CanvasLayerType, CanvasRenderingContext2D> = new Map();
  private layerOptions: Map<CanvasLayerType, Required<LayerRenderOptions>> = new Map();
  private dpr = 1;
  private width = 0;
  private height = 0;
  private debug = false;

  constructor(options: MultiLayerCanvasOptions) {
    this.container = options.container;
    this.width = options.width;
    this.height = options.height;
    this.debug = options.debug ?? false;
    this.dpr = window.devicePixelRatio || 1;

    // Default layer options optimized for Excel rendering
    const defaultOptions: Required<LayerRenderOptions> = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'high',
      subpixelText: true,
      snapToPixel: true,
      opacity: 1,
      blendMode: 'source-over',
    };

    // Layer-specific defaults
    const layerDefaults: Record<CanvasLayerType, Required<LayerRenderOptions>> = {
      background: { ...defaultOptions, imageSmoothingEnabled: true }, // Smooth fills
      grid: { ...defaultOptions, snapToPixel: true }, // Crisp gridlines
      content: { ...defaultOptions, imageSmoothingEnabled: false, subpixelText: true }, // Sharp text
      overlay: { ...defaultOptions, imageSmoothingEnabled: true }, // Smooth overlays (selection, highlights)
    };

    // Create layers in z-index order
    const layers: CanvasLayerType[] = ['background', 'grid', 'content', 'overlay'];
    layers.forEach((type, index) => {
      const canvas = this.createLayer(type, index);
      this.canvases.set(type, canvas);
      
      const ctx = canvas.getContext('2d', { 
        alpha: type !== 'background', // Background layer is opaque
        desynchronized: true, // Hint for better performance
      });
      
      if (!ctx) throw new Error(`Failed to get 2D context for ${type} layer`);
      this.contexts.set(type, ctx);
      
      // Merge user options with defaults
      const userOpts = options.layers?.[type] || {};
      this.layerOptions.set(type, { ...layerDefaults[type], ...userOpts });
      
      this.container.appendChild(canvas);
    });

    this.resize(this.width, this.height);
    this.applyRenderingHints();
  }

  /**
   * Create a single canvas layer with proper styling
   */
  private createLayer(type: CanvasLayerType, zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = String(zIndex);
    canvas.style.pointerEvents = type === 'overlay' ? 'auto' : 'none'; // Only overlay receives events
    canvas.dataset.layer = type;
    
    if (this.debug) {
      canvas.style.border = '1px solid rgba(255,0,0,0.3)';
      canvas.title = `Layer: ${type} (z-index: ${zIndex})`;
    }
    
    return canvas;
  }

  /**
   * Apply rendering hints to all contexts based on layer options
   */
  private applyRenderingHints() {
    for (const [type, ctx] of this.contexts) {
      const opts = this.layerOptions.get(type)!;
      
      // Anti-aliasing control
      ctx.imageSmoothingEnabled = opts.imageSmoothingEnabled;
      if (ctx.imageSmoothingEnabled) {
        ctx.imageSmoothingQuality = opts.imageSmoothingQuality;
      }
      
      // Text rendering hints (browser-specific)
      (ctx as any).textRendering = 'optimizeLegibility';
      (ctx as any).fontSmooth = opts.subpixelText ? 'auto' : 'never';
      
      // Set transform for DPR scaling
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      
      // Set blend mode
      ctx.globalCompositeOperation = opts.blendMode;
      ctx.globalAlpha = opts.opacity;
    }
  }

  /**
   * Resize all layers to new dimensions (CSS pixels)
   */
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;

    for (const [type, canvas] of this.canvases) {
      // Set physical size (device pixels)
      canvas.width = Math.ceil(width * this.dpr);
      canvas.height = Math.ceil(height * this.dpr);
      
      // Set CSS size (layout pixels)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    this.applyRenderingHints();
  }

  /**
   * Get context for a specific layer
   */
  getContext(layer: CanvasLayerType): CanvasRenderingContext2D {
    const ctx = this.contexts.get(layer);
    if (!ctx) throw new Error(`Layer ${layer} not found`);
    return ctx;
  }

  /**
   * Get canvas element for a specific layer
   */
  getCanvas(layer: CanvasLayerType): HTMLCanvasElement {
    const canvas = this.canvases.get(layer);
    if (!canvas) throw new Error(`Layer ${layer} not found`);
    return canvas;
  }

  /**
   * Clear a specific layer or all layers
   */
  clear(layer?: CanvasLayerType) {
    if (layer) {
      const ctx = this.getContext(layer);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    } else {
      // Clear all layers
      for (const type of this.canvases.keys()) {
        this.clear(type);
      }
    }
  }

  /**
   * Snap coordinate to nearest pixel boundary for crisp lines
   * Essential for pixel-perfect gridlines at all DPR levels
   */
  snapToPixel(value: number, thickness = 1): number {
    // For odd thickness (1, 3, 5), add 0.5 to align to pixel center
    // For even thickness (2, 4, 6), round to pixel boundary
    const adjusted = Math.round(value * this.dpr);
    return thickness % 2 === 1 
      ? adjusted / this.dpr + 0.5 / this.dpr
      : adjusted / this.dpr;
  }

  /**
   * Draw a crisp 1px line that looks perfect at any DPR
   */
  drawCrispLine(
    layer: CanvasLayerType,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = '#000000',
    thickness: number = 1
  ) {
    const ctx = this.getContext(layer);
    const opts = this.layerOptions.get(layer)!;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    
    // Snap to pixel boundaries for crisp rendering
    if (opts.snapToPixel) {
      if (x1 === x2) {
        // Vertical line
        const x = this.snapToPixel(x1, thickness);
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      } else if (y1 === y2) {
        // Horizontal line
        const y = this.snapToPixel(y1, thickness);
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      } else {
        // Diagonal line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Update rendering options for a layer
   */
  setLayerOptions(layer: CanvasLayerType, options: Partial<LayerRenderOptions>) {
    const current = this.layerOptions.get(layer)!;
    this.layerOptions.set(layer, { ...current, ...options });
    this.applyRenderingHints();
  }

  /**
   * Get current DPR
   */
  getDPR(): number {
    return this.dpr;
  }

  /**
   * Get layer dimensions in CSS pixels
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Export a specific layer or composite of all layers to data URL
   */
  toDataURL(
    type: 'image/png' | 'image/jpeg' = 'image/png',
    quality?: number,
    layers?: CanvasLayerType[]
  ): string {
    const targetLayers = layers || Array.from(this.canvases.keys());
    
    if (targetLayers.length === 1) {
      return this.getCanvas(targetLayers[0]).toDataURL(type, quality);
    }
    
    // Composite multiple layers
    const composite = document.createElement('canvas');
    composite.width = Math.ceil(this.width * this.dpr);
    composite.height = Math.ceil(this.height * this.dpr);
    const ctx = composite.getContext('2d')!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    
    // Draw each layer in order
    for (const layer of targetLayers) {
      const canvas = this.getCanvas(layer);
      const opts = this.layerOptions.get(layer)!;
      ctx.globalAlpha = opts.opacity;
      ctx.globalCompositeOperation = opts.blendMode;
      ctx.drawImage(canvas, 0, 0, this.width, this.height);
    }
    
    return composite.toDataURL(type, quality);
  }

  /**
   * Dispose all layers and remove from DOM
   */
  dispose() {
    for (const canvas of this.canvases.values()) {
      canvas.remove();
    }
    this.canvases.clear();
    this.contexts.clear();
    this.layerOptions.clear();
  }
}

/**
 * Excel-specific Border Styles
 * Implements pixel-perfect Excel border rendering
 */
export type ExcelBorderStyle = 
  | 'none'
  | 'thin'          // 1px solid
  | 'medium'        // 2px solid
  | 'thick'         // 3px solid
  | 'double'        // Double line
  | 'dotted'        // Dotted line
  | 'dashed'        // Dashed line
  | 'dashDot'       // Dash-dot pattern
  | 'dashDotDot'    // Dash-dot-dot pattern
  | 'slantDashDot'  // Slanted dash-dot
  | 'hair';         // Hairline (0.5px)

export class ExcelBorderRenderer {
  /**
   * Draw Excel-style border on a multi-layer canvas
   */
  static drawBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    style: ExcelBorderStyle,
    color: string = '#000000',
    dpr: number = 1
  ) {
    if (style === 'none') return;

    ctx.save();
    ctx.strokeStyle = color;

    switch (style) {
      case 'hair':
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, width, height);
        break;

      case 'thin':
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        break;

      case 'medium':
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
        break;

      case 'thick':
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
        break;

      case 'double':
        // Draw outer border
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        // Draw inner border (2px inset)
        ctx.strokeRect(x + 2.5, y + 2.5, width - 5, height - 5);
        break;

      case 'dotted':
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 1]);
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        break;

      case 'dashed':
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        break;

      case 'dashDot':
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2, 1, 2]);
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        break;

      case 'dashDotDot':
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2, 1, 2, 1, 2]);
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        break;

      case 'slantDashDot':
        // Custom pattern with slanted dashes
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2, 1, 2]);
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        break;
    }

    ctx.restore();
  }
}
