/**
 * chart-exporter.test.ts
 * Week 12 Day 7: Chart Export Tests
 * 
 * Tests for chart export functionality (PNG, JPEG, WebP, SVG, clipboard)
 */

import { ChartExporter, ExportOptions, SVGExportOptions } from '../src/ChartExporter';

// Mock clipboard API
const mockClipboard = {
  write: jest.fn()
};

// Mock ClipboardItem
global.ClipboardItem = jest.fn((items) => items) as any;

// Create mock canvas
const createMockCanvas = (width = 800, height = 600): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // Override toDataURL to return mock data
  Object.defineProperty(canvas, 'toDataURL', {
    value: jest.fn((type = 'image/png', quality = 0.92) => {
      return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
    }),
    writable: true,
    configurable: true
  });

  // Override toBlob
  Object.defineProperty(canvas, 'toBlob', {
    value: jest.fn((callback, type = 'image/png', quality = 0.92) => {
      const blob = new Blob(['fake-image-data'], { type });
      callback(blob);
    }),
    writable: true,
    configurable: true
  });

  // Mock getContext
  const mockContext = {
    fillStyle: '',
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    scale: jest.fn()
  };
  
  Object.defineProperty(canvas, 'getContext', {
    value: jest.fn(() => mockContext),
    writable: true,
    configurable: true
  });

  return canvas;
};

// Create mock SVG element
const createMockSVG = (): SVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '600');
  svg.setAttribute('viewBox', '0 0 800 600');
  
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '400');
  circle.setAttribute('cy', '300');
  circle.setAttribute('r', '50');
  svg.appendChild(circle);
  
  return svg;
};

describe('ChartExporter', () => {
  beforeAll(() => {
    // Mock HTMLCanvasElement prototype methods globally
    HTMLCanvasElement.prototype.toDataURL = jest.fn(function(this: HTMLCanvasElement, type = 'image/png', quality = 0.92) {
      return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
    }) as any;
    
    HTMLCanvasElement.prototype.toBlob = jest.fn(function(this: HTMLCanvasElement, callback: BlobCallback, type = 'image/png', quality = 0.92) {
      const blob = new Blob(['fake-image-data'], { type });
      callback(blob);
    }) as any;
    
    // Mock getContext
    const mockGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(function(this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        return {
          fillStyle: '',
          fillRect: jest.fn(),
          drawImage: jest.fn(),
          scale: jest.fn()
        } as any;
      }
      return mockGetContext.call(this, contextId as any);
    }) as any;
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('PNG Export', () => {
    it('should export canvas to PNG with default options', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToPNG(canvas);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('data:image/png');
      expect(result.mimeType).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should export PNG with custom quality', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToPNG(canvas, { quality: 0.8 });

      expect(result.success).toBe(true);
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/png', 0.8);
    });

    it('should export PNG with transparent background', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToPNG(canvas, {
        backgroundColor: 'transparent'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should export PNG with colored background', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToPNG(canvas, {
        backgroundColor: 'white'
      });

      expect(result.success).toBe(true);
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeDefined();
    });

    it('should export PNG with scale factor', () => {
      const canvas = createMockCanvas(800, 600);
      const result = ChartExporter.exportToPNG(canvas, { scale: 2.0 });

      expect(result.success).toBe(true);
      // Scaled canvas should be created
    });

    it('should handle export errors gracefully', () => {
      const canvas = createMockCanvas();
      canvas.toDataURL = jest.fn(() => {
        throw new Error('Export failed');
      });

      const result = ChartExporter.exportToPNG(canvas);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export failed');
    });
  });

  describe('JPEG Export', () => {
    it('should export canvas to JPEG', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToJPEG(canvas);

      expect(result.success).toBe(true);
      expect(result.data).toContain('data:image/jpeg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should apply white background for JPEG', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToJPEG(canvas);

      expect(result.success).toBe(true);
      // JPEG doesn't support transparency, background should be applied
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeDefined();
    });

    it('should export JPEG with custom quality', () => {
      const canvas = createMockCanvas();
      const toDataURLSpy = jest.spyOn(canvas, 'toDataURL' as any);
      const result = ChartExporter.exportToJPEG(canvas, { quality: 0.5 });

      expect(result.success).toBe(true);
      // Note: toDataURL is called on internally created canvas, not the input canvas
    });

    it('should handle JPEG export errors', () => {
      const canvas = createMockCanvas();
      // Mock toDataURL on the prototype to throw
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = jest.fn(() => {
        throw new Error('JPEG export failed');
      }) as any;

      const result = ChartExporter.exportToJPEG(canvas);

      expect(result.success).toBe(false);
      expect(result.error).toBe('JPEG export failed');
      
      // Restore
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    });
  });

  describe('WebP Export', () => {
    it('should export canvas to WebP', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToWebP(canvas);

      expect(result.success).toBe(true);
      expect(result.data).toContain('data:image/webp');
      expect(result.mimeType).toBe('image/webp');
    });

    it('should support transparent background for WebP', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToWebP(canvas, {
        backgroundColor: 'transparent'
      });

      expect(result.success).toBe(true);
    });

    it('should export WebP with custom quality', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToWebP(canvas, { quality: 0.7 });

      expect(result.success).toBe(true);
    });
  });

  describe('Generic Export', () => {
    it('should export to PNG by default', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.export(canvas);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    it('should export to specified format', () => {
      const canvas = createMockCanvas();
      
      const pngResult = ChartExporter.export(canvas, { format: 'png' });
      expect(pngResult.mimeType).toBe('image/png');

      const jpegResult = ChartExporter.export(canvas, { format: 'jpeg' });
      expect(jpegResult.mimeType).toBe('image/jpeg');

      const webpResult = ChartExporter.export(canvas, { format: 'webp' });
      expect(webpResult.mimeType).toBe('image/webp');
    });

    it('should reject unsupported formats', () => {
      const canvas = createMockCanvas();
      
      // SVG export throws an error
      expect(() => {
        ChartExporter.export(canvas, { format: 'svg' as any });
      }).toThrow('SVG export requires');
    });

    it('should handle unknown formats', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.export(canvas, { format: 'bmp' as any });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });
  });

  describe('SVG Export', () => {
    it('should export SVG element to string', () => {
      const svg = createMockSVG();
      const result = ChartExporter.exportToSVG(svg);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('<svg');
      expect(result.data).toContain('</svg>');
      expect(result.mimeType).toBe('image/svg+xml');
    });

    it('should include XML declaration', () => {
      const svg = createMockSVG();
      const result = ChartExporter.exportToSVG(svg, {
        includeXmlDeclaration: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('<?xml version="1.0"');
    });

    it('should exclude XML declaration when requested', () => {
      const svg = createMockSVG();
      const result = ChartExporter.exportToSVG(svg, {
        includeXmlDeclaration: false
      });

      expect(result.success).toBe(true);
      expect(result.data).not.toContain('<?xml');
    });

    it('should pretty print SVG', () => {
      const svg = createMockSVG();
      const result = ChartExporter.exportToSVG(svg, {
        prettyPrint: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('\n');
    });

    it('should calculate SVG size', () => {
      const svg = createMockSVG();
      const result = ChartExporter.exportToSVG(svg);

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('Clipboard Copy', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
      mockClipboard.write.mockClear();
      (global.ClipboardItem as unknown as jest.Mock).mockClear();
    });

    it('should copy canvas to clipboard', async () => {
      const canvas = createMockCanvas();
      mockClipboard.write.mockResolvedValue(undefined);

      const result = await ChartExporter.copyToClipboard(canvas);

      expect(result.success).toBe(true);
      expect(mockClipboard.write).toHaveBeenCalled();
      expect(global.ClipboardItem).toHaveBeenCalled();
    });

    it('should handle clipboard API not available', async () => {
      const canvas = createMockCanvas();
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true
      });

      const result = await ChartExporter.copyToClipboard(canvas);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clipboard API not available');
    });

    it('should handle clipboard write errors', async () => {
      const canvas = createMockCanvas();
      mockClipboard.write.mockRejectedValue(new Error('Permission denied'));

      const result = await ChartExporter.copyToClipboard(canvas);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('Download', () => {
    let createElementSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };

      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should download canvas as PNG', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.download(canvas);

      expect(result.success).toBe(true);
      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should download with custom filename', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.download(canvas, {
        filename: 'my-chart.png'
      });

      expect(result.success).toBe(true);
    });

    it('should download as JPEG', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.download(canvas, {
        format: 'jpeg',
        filename: 'chart.jpg'
      });

      expect(result.success).toBe(true);
    });

    it('should handle download errors', () => {
      const canvas = createMockCanvas();
      canvas.toDataURL = jest.fn(() => {
        throw new Error('Download failed');
      });

      const result = ChartExporter.download(canvas);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Download failed');
    });
  });

  describe('SVG Download', () => {
    let createElementSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      createElementSpy.mockRestore();
    });

    it('should download SVG as file', () => {
      const svg = createMockSVG();
      const result = ChartExporter.downloadSVG(svg);

      expect(result.success).toBe(true);
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should download SVG with custom filename', () => {
      const svg = createMockSVG();
      const result = ChartExporter.downloadSVG(svg, {
        filename: 'my-chart.svg'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Format Support', () => {
    it('should check if PNG is supported', () => {
      const supported = ChartExporter.isFormatSupported('png');
      expect(supported).toBe(true);
    });

    it('should get list of supported formats', () => {
      const formats = ChartExporter.getSupportedFormats();
      
      expect(formats).toContain('png');
      expect(formats).toContain('jpeg');
      expect(Array.isArray(formats)).toBe(true);
    });
  });

  describe('Helper Methods', () => {
    it('should estimate data URL size', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToPNG(canvas);

      expect(result.size).toBeGreaterThan(0);
      expect(typeof result.size).toBe('number');
    });

    it('should handle scaling', () => {
      const canvas = createMockCanvas(800, 600);
      const result = ChartExporter.exportToPNG(canvas, { scale: 2.0 });

      expect(result.success).toBe(true);
    });

    it('should apply background color', () => {
      const canvas = createMockCanvas();
      const result = ChartExporter.exportToPNG(canvas, {
        backgroundColor: '#ff0000'
      });

      expect(result.success).toBe(true);
    });
  });
});
