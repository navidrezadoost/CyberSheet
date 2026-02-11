/**
 * ChartExporter.ts
 * Week 12 Day 7: Chart Export Features
 * 
 * Export charts to various formats (PNG, SVG, clipboard) with support for:
 * - Multiple image formats (PNG, JPEG, WebP)
 * - Vector format (SVG)
 * - Clipboard integration
 * - Browser downloads
 * - Quality settings and scaling
 * 
 * @example Basic PNG export
 * ```typescript
 * const result = ChartExporter.exportToPNG(canvas, {
 *   quality: 0.95,
 *   backgroundColor: 'white',
 *   scale: 2.0
 * });
 * if (result.success) {
 *   console.log('Exported:', result.data);
 * }
 * ```
 * 
 * @example Copy to clipboard
 * ```typescript
 * await ChartExporter.copyToClipboard(canvas, { format: 'png' });
 * ```
 * 
 * @example Download as file
 * ```typescript
 * ChartExporter.download(canvas, {
 *   format: 'png',
 *   filename: 'my-chart.png',
 *   scale: 2.0
 * });
 * ```
 */

/**
 * Supported export formats for chart images
 * 
 * - `png`: Portable Network Graphics (supports transparency)
 * - `jpeg`: Joint Photographic Experts Group (smaller file size, no transparency)
 * - `webp`: Modern format with better compression (browser support required)
 * - `svg`: Scalable Vector Graphics (for SVG-based charts only)
 */
export type ExportFormat = 'png' | 'svg' | 'jpeg' | 'webp';

/**
 * Options for exporting charts to image formats
 * 
 * @example High-quality export with custom background
 * ```typescript
 * const options: ExportOptions = {
 *   format: 'png',
 *   quality: 0.95,
 *   backgroundColor: '#ffffff',
 *   scale: 2.0, // 2x resolution for retina displays
 *   filename: 'sales-chart.png'
 * };
 * ```
 */
export interface ExportOptions {
  /**
   * Output format
   */
  format?: ExportFormat;
  
  /**
   * Image quality (0.0 to 1.0) for JPEG/WebP
   * @default 0.92
   */
  quality?: number;
  
  /**
   * Background color (transparent if not specified for PNG)
   * @default 'transparent' for PNG, 'white' for JPEG/WebP
   */
  backgroundColor?: string;
  
  /**
   * Scale factor for higher resolution exports
   * @default 1.0
   */
  scale?: number;
  
  /**
   * Include metadata (title, date, etc.)
   * @default false
   */
  includeMetadata?: boolean;
  
  /**
   * Custom filename for download
   */
  filename?: string;
}

/**
 * Options for exporting charts to SVG format
 * 
 * @example Formatted SVG export
 * ```typescript
 * const options: SVGExportOptions = {
 *   inlineStyles: true,
 *   prettyPrint: true,
 *   includeXmlDeclaration: true,
 *   filename: 'chart.svg'
 * };
 * const result = ChartExporter.exportToSVG(svgElement, options);
 * ```
 */
export interface SVGExportOptions {
  /**
   * Include CSS styles inline
   * @default true
   */
  inlineStyles?: boolean;
  
  /**
   * Include XML declaration
   * @default true
   */
  includeXmlDeclaration?: boolean;
  
  /**
   * Pretty print (formatted) SVG
   * @default false
   */
  prettyPrint?: boolean;
  
  /**
   * Custom filename
   */
  filename?: string;
}

/**
 * Result of an export operation
 * 
 * Contains export status, data, and metadata about the exported chart.
 * 
 * @example Handling export result
 * ```typescript
 * const result = ChartExporter.exportToPNG(canvas);
 * if (result.success) {
 *   console.log('Exported successfully!');
 *   console.log('Size:', result.size, 'bytes');
 *   console.log('Type:', result.mimeType);
 *   // Use result.data (base64 data URL)
 * } else {
 *   console.error('Export failed:', result.error);
 * }
 * ```
 */
export interface ExportResult {
  /**
   * Success status
   */
  success: boolean;
  
  /**
   * Data URL or SVG string
   */
  data?: string;
  
  /**
   * Error message if failed
   */
  error?: string;
  
  /**
   * Mime type of exported data
   */
  mimeType?: string;
  
  /**
   * File size in bytes (approximate)
   */
  size?: number;
}

/**
 * Chart exporter for multiple formats and destinations
 * 
 * Provides static methods to export charts rendered on HTML canvas or SVG elements
 * to various image formats, clipboard, or browser downloads. Supports quality settings,
 * resolution scaling, and background customization.
 * 
 * @example Export to different formats
 * ```typescript
 * // Export to PNG with custom settings
 * const png = ChartExporter.exportToPNG(canvas, {
 *   quality: 0.95,
 *   backgroundColor: 'white',
 *   scale: 2.0
 * });
 * 
 * // Export to JPEG (always with background)
 * const jpeg = ChartExporter.exportToJPEG(canvas, { quality: 0.85 });
 * 
 * // Export to modern WebP format
 * const webp = ChartExporter.exportToWebP(canvas, { quality: 0.90 });
 * 
 * // Copy to clipboard for pasting
 * await ChartExporter.copyToClipboard(canvas);
 * 
 * // Trigger browser download
 * ChartExporter.download(canvas, { filename: 'my-chart.png' });
 * ```
 * 
 * @example Check format support
 * ```typescript
 * if (ChartExporter.isFormatSupported('webp')) {
 *   // Use WebP for better compression
 *   ChartExporter.exportToWebP(canvas);
 * } else {
 *   // Fallback to PNG
 *   ChartExporter.exportToPNG(canvas);
 * }
 * ```
 */
export class ChartExporter {
  /**
   * Export canvas to PNG format with transparency support
   * 
   * PNG format supports transparency and lossless compression, making it ideal
   * for charts with transparent backgrounds or when quality is more important
   * than file size.
   * 
   * @param canvas - Canvas element containing the rendered chart
   * @param options - Export configuration options
   * @returns Export result with base64-encoded data URL
   * 
   * @example Basic PNG export
   * ```typescript
   * const result = ChartExporter.exportToPNG(canvas);
   * ```
   * 
   * @example High-resolution export with background
   * ```typescript
   * const result = ChartExporter.exportToPNG(canvas, {
   *   scale: 2.0, // 2x resolution for retina displays
   *   backgroundColor: '#ffffff',
   *   quality: 0.95
   * });
   * ```
   * 
   * @example Error handling
   * ```typescript
   * const result = ChartExporter.exportToPNG(canvas);
   * if (!result.success) {
   *   console.error('PNG export failed:', result.error);
   * }
   * ```
   */
  static exportToPNG(canvas: HTMLCanvasElement, options: ExportOptions = {}): ExportResult {
    try {
      const {
        quality = 0.92,
        backgroundColor = 'transparent',
        scale = 1.0,
        filename = 'chart.png'
      } = options;

      // Create a new canvas if scaling is needed
      let exportCanvas = canvas;
      if (scale !== 1.0) {
        exportCanvas = this.scaleCanvas(canvas, scale);
      }

      // Apply background if not transparent
      if (backgroundColor !== 'transparent') {
        exportCanvas = this.applyBackground(exportCanvas, backgroundColor);
      }

      // Get data URL
      const dataURL = exportCanvas.toDataURL('image/png', quality);
      
      return {
        success: true,
        data: dataURL,
        mimeType: 'image/png',
        size: this.estimateSize(dataURL)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export canvas to JPEG format
   * 
   * @param canvas - Canvas element to export
   * @param options - Export options
   * @returns Export result with data URL
   */
  static exportToJPEG(canvas: HTMLCanvasElement, options: ExportOptions = {}): ExportResult {
    try {
      const {
        quality = 0.92,
        backgroundColor = 'white',
        scale = 1.0
      } = options;

      // JPEG doesn't support transparency, apply white background
      let exportCanvas = canvas;
      if (scale !== 1.0) {
        exportCanvas = this.scaleCanvas(canvas, scale);
      }
      exportCanvas = this.applyBackground(exportCanvas, backgroundColor);

      const dataURL = exportCanvas.toDataURL('image/jpeg', quality);
      
      return {
        success: true,
        data: dataURL,
        mimeType: 'image/jpeg',
        size: this.estimateSize(dataURL)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export canvas to WebP format
   * 
   * @param canvas - Canvas element to export
   * @param options - Export options
   * @returns Export result with data URL
   */
  static exportToWebP(canvas: HTMLCanvasElement, options: ExportOptions = {}): ExportResult {
    try {
      const {
        quality = 0.92,
        backgroundColor = 'transparent',
        scale = 1.0
      } = options;

      let exportCanvas = canvas;
      if (scale !== 1.0) {
        exportCanvas = this.scaleCanvas(canvas, scale);
      }

      if (backgroundColor !== 'transparent') {
        exportCanvas = this.applyBackground(exportCanvas, backgroundColor);
      }

      const dataURL = exportCanvas.toDataURL('image/webp', quality);
      
      return {
        success: true,
        data: dataURL,
        mimeType: 'image/webp',
        size: this.estimateSize(dataURL)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export to specified format
   * 
   * @param canvas - Canvas element to export
   * @param options - Export options
   * @returns Export result
   */
  static export(canvas: HTMLCanvasElement, options: ExportOptions = {}): ExportResult {
    const format = options.format || 'png';

    switch (format) {
      case 'png':
        return this.exportToPNG(canvas, options);
      case 'jpeg':
        return this.exportToJPEG(canvas, options);
      case 'webp':
        return this.exportToWebP(canvas, options);
      case 'svg':
        throw new Error('SVG export requires exportToSVG method with SVG data');
      default:
        return {
          success: false,
          error: `Unsupported format: ${format}`
        };
    }
  }

  /**
   * Export SVG to string
   * 
   * @param svgElement - SVG element to export
   * @param options - SVG export options
   * @returns Export result with SVG string
   */
  static exportToSVG(svgElement: SVGElement, options: SVGExportOptions = {}): ExportResult {
    try {
      const {
        inlineStyles = true,
        includeXmlDeclaration = true,
        prettyPrint = false
      } = options;

      let svgString = svgElement.outerHTML;

      // Add XML declaration
      if (includeXmlDeclaration) {
        svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
      }

      // Pretty print if requested
      if (prettyPrint) {
        svgString = this.prettifySVG(svgString);
      }

      return {
        success: true,
        data: svgString,
        mimeType: 'image/svg+xml',
        size: new Blob([svgString]).size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SVG export failed'
      };
    }
  }

  /**
   * Copy canvas to clipboard
   * 
   * @param canvas - Canvas element to copy
   * @param options - Export options
   * @returns Promise that resolves when copied
   */
  static async copyToClipboard(canvas: HTMLCanvasElement, options: ExportOptions = {}): Promise<ExportResult> {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      // Convert canvas to blob
      const blob = await this.canvasToBlob(canvas, options);
      
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }

      // Create clipboard item
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      });

      // Write to clipboard
      await navigator.clipboard.write([clipboardItem]);

      return {
        success: true,
        mimeType: blob.type,
        size: blob.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clipboard copy failed'
      };
    }
  }

  /**
   * Download canvas as file
   * 
   * @param canvas - Canvas element to download
   * @param options - Export options
   */
  static download(canvas: HTMLCanvasElement, options: ExportOptions = {}): ExportResult {
    try {
      const format = options.format || 'png';
      const filename = options.filename || `chart.${format}`;

      const result = this.export(canvas, options);
      
      if (!result.success || !result.data) {
        return result;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = result.data;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Download SVG as file
   * 
   * @param svgElement - SVG element to download
   * @param options - SVG export options
   */
  static downloadSVG(svgElement: SVGElement, options: SVGExportOptions = {}): ExportResult {
    try {
      const filename = options.filename || 'chart.svg';
      const result = this.exportToSVG(svgElement, options);

      if (!result.success || !result.data) {
        return result;
      }

      // Create blob and download
      const blob = new Blob([result.data], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Convert canvas to blob
   * 
   * @param canvas - Canvas element
   * @param options - Export options
   * @returns Promise resolving to blob
   */
  private static async canvasToBlob(
    canvas: HTMLCanvasElement,
    options: ExportOptions = {}
  ): Promise<Blob | null> {
    const {
      format = 'png',
      quality = 0.92,
      backgroundColor
    } = options;

    let exportCanvas = canvas;
    if (backgroundColor && backgroundColor !== 'transparent') {
      exportCanvas = this.applyBackground(canvas, backgroundColor);
    }

    const mimeType = `image/${format}`;
    
    return new Promise((resolve) => {
      exportCanvas.toBlob(
        (blob) => resolve(blob),
        mimeType,
        quality
      );
    });
  }

  /**
   * Scale canvas for higher resolution export
   * 
   * @param canvas - Original canvas
   * @param scale - Scale factor
   * @returns Scaled canvas
   */
  private static scaleCanvas(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = canvas.width * scale;
    scaledCanvas.height = canvas.height * scale;

    const ctx = scaledCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);

    return scaledCanvas;
  }

  /**
   * Apply background color to canvas
   * 
   * @param canvas - Original canvas
   * @param backgroundColor - Background color
   * @returns Canvas with background
   */
  private static applyBackground(canvas: HTMLCanvasElement, backgroundColor: string): HTMLCanvasElement {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;

    const ctx = bgCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Draw original canvas on top
    ctx.drawImage(canvas, 0, 0);

    return bgCanvas;
  }

  /**
   * Estimate size of data URL in bytes
   * 
   * @param dataURL - Data URL string
   * @returns Estimated size in bytes
   */
  private static estimateSize(dataURL: string): number {
    // Remove data URL prefix
    const base64 = dataURL.split(',')[1];
    
    // Base64 encoding increases size by ~33%
    // Decode to get actual size
    return Math.ceil(base64.length * 0.75);
  }

  /**
   * Pretty print SVG string
   * 
   * @param svgString - SVG string
   * @returns Formatted SVG string
   */
  private static prettifySVG(svgString: string): string {
    // Simple formatting: add newlines after tags
    return svgString
      .replace(/></g, '>\n<')
      .replace(/\n\s*\n/g, '\n');
  }

  /**
   * Check if format is supported
   * 
   * @param format - Format to check
   * @returns True if supported
   */
  static isFormatSupported(format: ExportFormat): boolean {
    const canvas = document.createElement('canvas');
    const testMimeType = `image/${format}`;
    
    try {
      const dataURL = canvas.toDataURL(testMimeType);
      return dataURL.startsWith(`data:${testMimeType}`);
    } catch {
      return false;
    }
  }

  /**
   * Get supported formats
   * 
   * @returns Array of supported formats
   */
  static getSupportedFormats(): ExportFormat[] {
    const formats: ExportFormat[] = ['png', 'jpeg', 'webp', 'svg'];
    return formats.filter(format => this.isFormatSupported(format));
  }
}
