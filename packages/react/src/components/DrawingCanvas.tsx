/**
 * DrawingCanvas.tsx
 *
 * Rendering layer for DrawingLayer objects.
 * Displays shapes, pictures, text boxes, form controls with selection handles,
 * drag-to-move, resize, and rotation interactions.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { isCtrlLetter } from '../utils/keyboardLayout';
import type {
  DrawingLayer,
  DrawingObject,
  ShapeObject,
  PictureObject,
  FormControlObject,
  TextBoxObject,
  CommandManager,
} from '@cyber-sheet/core';
import {
  DeleteDrawingObjectsCommand,
  CopyDrawingObjectsCommand,
} from '@cyber-sheet/core';

// ─── Types ────────────────────────────────────────────────

export interface DrawingCanvasProps {
  drawingLayer: DrawingLayer;
  canvasWidth: number;
  canvasHeight: number;
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
  commandManager?: CommandManager;
  onObjectChange?: () => void;
}

interface HandlePosition {
  x: number;
  y: number;
  cursor: string;
  type: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotation';
}

interface DragState {
  objectId: string;
  action: 'move' | 'resize';
  handle?: string;
  startMouseX: number;
  startMouseY: number;
  startObjectX: number;
  startObjectY: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
}

// ─── Constants ────────────────────────────────────────────

const HANDLE_SIZE = 7;
const HANDLE_COLOR = '#FFFFFF';
const HANDLE_BORDER = '#0078D4';
const SELECTION_BORDER = '#0078D4';
const ROTATION_HANDLE_OFFSET = 24;
const ROTATION_HANDLE_RADIUS = 4;
const MIN_OBJECT_SIZE = 5;

// ─── Shape SVG Paths ──────────────────────────────────────

const SHAPE_PATHS: Record<string, (w: number, h: number) => string> = {
  rectangle: (w, h) => `M0,0 L${w},0 L${w},${h} L0,${h} Z`,
  roundedRectangle: (w, h) => {
    const r = Math.min(w, h) * 0.15;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${r} Q0,0 ${r},0 Z`;
  },
  oval: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx - rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx - rx},${cy} Z`;
  },
  triangle: (w, h) => `M${w / 2},0 L${w},${h} L0,${h} Z`,
  diamond: (w, h) => `M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`,
  pentagon: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    let path = '';
    for (let i = 0; i < 5; i++) {
      const angle = ((i * 72 - 90) * Math.PI) / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      path += i === 0 ? `M${x},${y}` : `L${x},${y}`;
    }
    return path + ' Z';
  },
  hexagon: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    let path = '';
    for (let i = 0; i < 6; i++) {
      const angle = ((i * 60 - 90) * Math.PI) / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      path += i === 0 ? `M${x},${y}` : `L${x},${y}`;
    }
    return path + ' Z';
  },
  arrowRight: (w, h) => {
    const head = Math.min(w * 0.4, h);
    return `M0,${h * 0.3} L${w - head},${h * 0.3} L${w - head},0 L${w},${h / 2} L${w - head},${h} L${w - head},${h * 0.7} L0,${h * 0.7} Z`;
  },
  arrowLeft: (w, h) => {
    const head = Math.min(w * 0.4, h);
    return `M${w},${h * 0.3} L${head},${h * 0.3} L${head},0 L0,${h / 2} L${head},${h} L${head},${h * 0.7} L${w},${h * 0.7} Z`;
  },
  arrowUp: (w, h) => {
    const head = Math.min(h * 0.4, w);
    return `M${w * 0.3},${h} L${w * 0.3},${head} L0,${head} L${w / 2},0 L${w},${head} L${w * 0.7},${head} L${w * 0.7},${h} Z`;
  },
  arrowDown: (w, h) => {
    const head = Math.min(h * 0.4, w);
    return `M${w * 0.3},0 L${w * 0.3},${h - head} L0,${h - head} L${w / 2},${h} L${w},${h - head} L${w * 0.7},${h - head} L${w * 0.7},0 Z`;
  },
};

function getDefaultShapePath(shapeType: string, w: number, h: number): string {
  const fn = SHAPE_PATHS[shapeType];
  if (fn) return fn(w, h);
  return SHAPE_PATHS.rectangle(w, h);
}

// ─── Component ────────────────────────────────────────────

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  drawingLayer,
  canvasWidth,
  canvasHeight,
  scrollLeft,
  scrollTop,
  zoom,
  commandManager,
  onObjectChange,
}) => {
  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<DrawingObject[]>([]);
  const [pasteCount, setPasteCount] = useState<number>(0);

  // ─── Render all objects ─────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const objects = drawingLayer.getAllObjects();
    const selection = new Set(drawingLayer.getSelectedIds());

    objects.forEach((obj: DrawingObject) => {
      if (!obj.visible) return;
      renderObject(ctx, obj, selection.has(obj.id), zoom, scrollLeft, scrollTop);
    });

    // Render selection handles for selected objects
    objects.forEach((obj: DrawingObject) => {
      if (selection.has(obj.id)) {
        renderSelectionHandles(ctx, obj, zoom, scrollLeft, scrollTop, hoveredHandle);
      }
    });
  }, [drawingLayer, canvasWidth, canvasHeight, zoom, scrollLeft, scrollTop, hoveredHandle]);

  // ─── Render a single object ─────────────────────────────

  function renderObject(
    ctx: CanvasRenderingContext2D,
    obj: DrawingObject,
    isSelected: boolean,
    zoom: number,
    scrollLeft: number,
    scrollTop: number
  ): void {
    const x = (obj.position.x - scrollLeft) * zoom;
    const y = (obj.position.y - scrollTop) * zoom;
    const w = obj.size.width * zoom;
    const h = obj.size.height * zoom;

    ctx.save();

    // Apply rotation around center
    if (obj.rotation !== 0) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    switch (obj.type) {
      case 'picture':
        renderPicture(ctx, obj as PictureObject, x, y, w, h, isSelected);
        break;
      case 'shape':
        renderShape(ctx, obj as ShapeObject, x, y, w, h, isSelected);
        break;
      case 'textBox':
        renderTextBox(ctx, obj as TextBoxObject, x, y, w, h, isSelected);
        break;
      case 'formControl':
        renderFormControl(ctx, obj as FormControlObject, x, y, w, h, isSelected);
        break;
      case 'chart':
        renderChart(ctx, obj as any, x, y, w, h, isSelected);
        break;
      default:
        // Placeholder for unknown types
        ctx.strokeStyle = '#999';
        ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();
  }

  // ─── Render picture ─────────────────────────────────────

  function renderPicture(
    ctx: CanvasRenderingContext2D,
    obj: PictureObject,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean
  ): void {
    // Draw placeholder if image not loaded
    if (!(obj as any).loadedImage) {
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#D1D1D1';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#999';
      ctx.font = `${Math.min(w, h) * 0.2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🖼️', x + w / 2, y + h / 2);
    } else {
      ctx.drawImage((obj as any).loadedImage, x, y, w, h);
    }

    if (isSelected) {
      ctx.strokeStyle = SELECTION_BORDER;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  // ─── Render shape ───────────────────────────────────────

  function renderShape(
    ctx: CanvasRenderingContext2D,
    obj: ShapeObject,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const pathStr = getDefaultShapePath(obj.shapeType, w, h);
    const path = new Path2D(pathStr);

    // Fill
    if (obj.fill?.type !== 'none' && obj.fill?.color) {
      ctx.fillStyle = obj.fill.color;
      if (obj.fill.transparency) {
        ctx.globalAlpha = 1 - obj.fill.transparency / 100;
      }
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }

    // Line
    if (obj.line?.style && obj.line.style !== 'none') {
      ctx.strokeStyle = obj.line.color || '#000000';
      ctx.lineWidth = obj.line.width || 1;
      if (obj.line.style === 'dashed') ctx.setLineDash([6, 3]);
      else if (obj.line.style === 'dotted') ctx.setLineDash([2, 2]);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }

    // Text inside shape
    if (obj.text) {
      ctx.fillStyle = obj.textStyle?.color || '#000000';
      const fontSize = obj.textStyle?.fontSize || Math.min(w, h) * 0.2;
      const fontFamily = obj.textStyle?.fontFamily || 'sans-serif';
      const bold = obj.textStyle?.bold ? 'bold ' : '';
      const italic = obj.textStyle?.italic ? 'italic ' : '';
      ctx.font = `${italic}${bold}${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.text, w / 2, h / 2);
    }

    if (isSelected) {
      ctx.strokeStyle = SELECTION_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // ─── Render text box ────────────────────────────────────

  function renderTextBox(
    ctx: CanvasRenderingContext2D,
    obj: TextBoxObject,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean
  ): void {
    ctx.fillStyle = (obj as any).fillColor || '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    if ((obj as any).text) {
      ctx.fillStyle = (obj as any).fontColor || '#000000';
      const fontSize = ((obj as any).fontSize || 12) * zoom;
      ctx.font = `${fontSize}px ${(obj as any).fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines = (obj as any).text.split('\n');
      const lineHeight = fontSize * 1.3;
      lines.forEach((line: string, i: number) => {
        ctx.fillText(line, x + 4, y + 4 + i * lineHeight);
      });
    }

    if (isSelected) {
      ctx.strokeStyle = SELECTION_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }

  // ─── Render form control ────────────────────────────────

  function renderChart(
    ctx: CanvasRenderingContext2D,
    obj: any,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean
  ): void {
    // Render chart placeholder/container
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#D1D1D1';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Render chart icon and type label
    const iconSize = Math.min(w, h) * 0.3;
    ctx.fillStyle = '#666';
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const chartIcons: Record<string, string> = {
      column: '📊',
      bar: '📊',
      line: '📈',
      pie: '🥧',
      sparkline: '▁▂▃▅▇',
    };
    
    const icon = chartIcons[obj.chartType] || '📊';
    ctx.fillText(icon, x + w / 2, y + h / 2 - iconSize / 2);
    
    // Render chart type label
    ctx.font = `${iconSize * 0.3}px sans-serif`;
    ctx.fillStyle = '#999';
    ctx.fillText(obj.chartType || 'Chart', x + w / 2, y + h / 2 + iconSize / 2);
    
    // Render data range info
    if (obj.dataRange) {
      ctx.font = `${iconSize * 0.25}px monospace`;
      ctx.fillStyle = '#AAA';
      ctx.fillText(obj.dataRange, x + w / 2, y + h - 10);
    }

    if (isSelected) {
      ctx.strokeStyle = SELECTION_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }

  function renderFormControl(
    ctx: CanvasRenderingContext2D,
    obj: FormControlObject,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean
  ): void {
    switch (obj.controlType) {
      case 'checkbox': {
        const size = Math.min(w, h) * 0.7;
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + (h - size) / 2, size, size);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x + 2, y + (h - size) / 2, size, size);
        if ((obj as any).checked) {
          ctx.strokeStyle = '#0078D4';
          ctx.lineWidth = 2;
          const pad = size * 0.2;
          ctx.beginPath();
          ctx.moveTo(x + 2 + pad, y + h / 2);
          ctx.lineTo(x + 2 + size * 0.4, y + (h + size) / 2 - pad);
          ctx.lineTo(x + 2 + size - pad, y + (h - size) / 2 + pad);
          ctx.stroke();
        }
        if ((obj as any).label) {
          ctx.fillStyle = '#000';
          ctx.font = `${size * 0.7}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText((obj as any).label, x + size + 8, y + h / 2);
        }
        break;
      }
      case 'button': {
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        if ((obj as any).buttonText) {
          ctx.fillStyle = '#000';
          ctx.font = `${Math.min(w, h) * 0.4}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((obj as any).buttonText, x + w / 2, y + h / 2);
        }
        break;
      }
      default: {
        ctx.strokeStyle = '#999';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(x, y, w, h);
      }
    }

    if (isSelected) {
      ctx.strokeStyle = SELECTION_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }

  // ─── Render selection handles ───────────────────────────

  function renderSelectionHandles(
    ctx: CanvasRenderingContext2D,
    obj: DrawingObject,
    zoom: number,
    scrollLeft: number,
    scrollTop: number,
    hoveredHandle: string | null
  ): void {
    const x = (obj.position.x - scrollLeft) * zoom;
    const y = (obj.position.y - scrollTop) * zoom;
    const w = obj.size.width * zoom;
    const h = obj.size.height * zoom;
    const hs = HANDLE_SIZE;

    const handles: HandlePosition[] = [
      { x: x, y: y, cursor: 'nw-resize', type: 'nw' },
      { x: x + w / 2, y: y, cursor: 'n-resize', type: 'n' },
      { x: x + w, y: y, cursor: 'ne-resize', type: 'ne' },
      { x: x + w, y: y + h / 2, cursor: 'e-resize', type: 'e' },
      { x: x + w, y: y + h, cursor: 'se-resize', type: 'se' },
      { x: x + w / 2, y: y + h, cursor: 's-resize', type: 's' },
      { x: x, y: y + h, cursor: 'sw-resize', type: 'sw' },
      { x: x, y: y + h / 2, cursor: 'w-resize', type: 'w' },
    ];

    handles.forEach((h: HandlePosition) => {
      const isHovered = hoveredHandle === h.type;
      ctx.fillStyle = isHovered ? '#0078D4' : HANDLE_COLOR;
      ctx.strokeStyle = HANDLE_BORDER;
      ctx.lineWidth = 1.5;
      ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
      ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
    });

    // Rotation handle
    const rotY = y - ROTATION_HANDLE_OFFSET;
    const rotX = x + w / 2;
    ctx.beginPath();
    ctx.moveTo(rotX, y);
    ctx.lineTo(rotX, rotY);
    ctx.strokeStyle = HANDLE_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    const isRotHovered = hoveredHandle === 'rotation';
    ctx.beginPath();
    ctx.arc(rotX, rotY, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isRotHovered ? '#0078D4' : '#00B050';
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ─── Hit testing ────────────────────────────────────────

  function hitTest(mouseX: number, mouseY: number): { objectId?: string; handle?: string } {
    const selection = drawingLayer.getSelectedIds();
    if (selection.length === 1) {
      const obj = drawingLayer.getObject(selection[0]);
      if (obj) {
        // Check handles first
        const handle = hitTestHandles(obj, mouseX, mouseY);
        if (handle) return { objectId: obj.id, handle };

        // Then check rotation handle
        const rotHandle = hitTestRotationHandle(obj, mouseX, mouseY);
        if (rotHandle) return { objectId: obj.id, handle: 'rotation' };
      }
    }

    // Check objects (reverse z-order for top-most first)
    const objects = drawingLayer.getAllObjects().reverse();
    for (const obj of objects) {
      if (!obj.visible) continue;
      const x = (obj.position.x - scrollLeft) * zoom;
      const y = (obj.position.y - scrollTop) * zoom;
      const w = obj.size.width * zoom;
      const h = obj.size.height * zoom;
      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        return { objectId: obj.id };
      }
    }

    return {};
  }

  function hitTestHandles(obj: DrawingObject, mx: number, my: number): string | null {
    const x = (obj.position.x - scrollLeft) * zoom;
    const y = (obj.position.y - scrollTop) * zoom;
    const w = obj.size.width * zoom;
    const h = obj.size.height * zoom;
    const hs = HANDLE_SIZE + 2;

    const handles: { type: string; rx: number; ry: number }[] = [
      { type: 'nw', rx: x, ry: y },
      { type: 'n', rx: x + w / 2, ry: y },
      { type: 'ne', rx: x + w, ry: y },
      { type: 'e', rx: x + w, ry: y + h / 2 },
      { type: 'se', rx: x + w, ry: y + h },
      { type: 's', rx: x + w / 2, ry: y + h },
      { type: 'sw', rx: x, ry: y + h },
      { type: 'w', rx: x, ry: y + h / 2 },
    ];

    for (const h of handles) {
      if (Math.abs(mx - h.rx) <= hs / 2 && Math.abs(my - h.ry) <= hs / 2) {
        return h.type;
      }
    }
    return null;
  }

  function hitTestRotationHandle(obj: DrawingObject, mx: number, my: number): boolean {
    const x = (obj.position.x - scrollLeft) * zoom;
    const y = (obj.position.y - scrollTop) * zoom;
    const w = obj.size.width * zoom;
    const rotX = x + w / 2;
    const rotY = y - ROTATION_HANDLE_OFFSET;
    return Math.sqrt((mx - rotX) ** 2 + (my - rotY) ** 2) <= ROTATION_HANDLE_RADIUS + 2;
  }

  // ─── Mouse handlers ─────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTest(mx, my);

      if (hit.handle) {
        const obj = drawingLayer.getObject(hit.objectId!);
        if (obj) {
          // Don't change selection when grabbing a handle
          setDragState({
            objectId: obj.id,
            action: 'resize',
            handle: hit.handle,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startObjectX: obj.position.x,
            startObjectY: obj.position.y,
            startWidth: obj.size.width,
            startHeight: obj.size.height,
            startRotation: obj.rotation,
          });
          return;
        }
      }

      if (hit.objectId) {
        // Multi-select with Shift key
        if (e.shiftKey) {
          const currentSelection = drawingLayer.getSelectedIds();
          if (currentSelection.includes(hit.objectId)) {
            // Deselect if already selected
            drawingLayer.deselectObject(hit.objectId);
          } else {
            // Add to selection
            drawingLayer.selectObject(hit.objectId);
          }
          setSelectedIds(drawingLayer.getSelectedIds());
        } else {
          // Single select (clear others)
          drawingLayer.deselectAll();
          drawingLayer.selectObject(hit.objectId);
          setSelectedIds([hit.objectId]);
        }
        
        const obj = drawingLayer.getObject(hit.objectId);
        if (obj && !e.shiftKey) {
          setDragState({
            objectId: hit.objectId,
            action: 'move',
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startObjectX: obj.position.x,
            startObjectY: obj.position.y,
            startWidth: obj.size.width,
            startHeight: obj.size.height,
            startRotation: obj.rotation,
          });
        }
      } else {
        // Click on empty space clears selection
        if (!e.shiftKey) {
          drawingLayer.deselectAll();
          setSelectedIds([]);
        }
      }
      onObjectChange?.();
    },
    [drawingLayer, zoom, scrollLeft, scrollTop, onObjectChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState) {
        // Update hovered handle
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = hitTest(mx, my);
        setHoveredHandle(hit.handle || null);

        // Update cursor
        if (canvasRef.current) {
          const handleCursors: Record<string, string> = {
            nw: 'nw-resize',
            n: 'n-resize',
            ne: 'ne-resize',
            e: 'e-resize',
            se: 'se-resize',
            s: 's-resize',
            sw: 'sw-resize',
            w: 'w-resize',
            rotation: 'crosshair',
          };
          canvasRef.current.style.cursor = hit.handle
            ? handleCursors[hit.handle] || 'default'
            : hit.objectId
            ? 'move'
            : 'default';
        }
        return;
      }

      const dx = (e.clientX - dragState.startMouseX) / zoom;
      const dy = (e.clientY - dragState.startMouseY) / zoom;

      if (dragState.action === 'move') {
        drawingLayer.setObjectPosition(dragState.objectId, {
          x: dragState.startObjectX + dx,
          y: dragState.startObjectY + dy,
        });
      } else if (dragState.action === 'resize') {
        const h = dragState.handle!;
        let newX = dragState.startObjectX;
        let newY = dragState.startObjectY;
        let newW = dragState.startWidth;
        let newH = dragState.startHeight;

        if (h.includes('e')) {
          newW = Math.max(MIN_OBJECT_SIZE, dragState.startWidth + dx);
        }
        if (h.includes('w')) {
          newW = Math.max(MIN_OBJECT_SIZE, dragState.startWidth - dx);
          newX = dragState.startObjectX + dragState.startWidth - newW;
        }
        if (h.includes('s')) {
          newH = Math.max(MIN_OBJECT_SIZE, dragState.startHeight + dy);
        }
        if (h.includes('n')) {
          newH = Math.max(MIN_OBJECT_SIZE, dragState.startHeight - dy);
          newY = dragState.startObjectY + dragState.startHeight - newH;
        }

        drawingLayer.resizeObject(dragState.objectId, { width: newW, height: newH });
        drawingLayer.setObjectPosition(dragState.objectId, { x: newX, y: newY });
      }

      onObjectChange?.();
    },
    [dragState, drawingLayer, zoom, scrollLeft, scrollTop, onObjectChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // ─── Effects ─────────────────────────────────────────────

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const onLayerChange = () => {
      setSelectedIds(drawingLayer.getSelectedIds());
      render();
    };
    drawingLayer.on('changed', onLayerChange);
    return () => (drawingLayer as any).off('changed', onLayerChange);
  }, [drawingLayer, render]);

  // ─── Keyboard shortcuts ──────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const selectedIds = drawingLayer.getSelectedIds();

      // Delete or Backspace: Remove selected objects
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const objectsToDelete = selectedIds
            .map(id => drawingLayer.getObject(id))
            .filter(Boolean) as DrawingObject[];
          
          if (commandManager) {
            commandManager.execute(
              new DeleteDrawingObjectsCommand(drawingLayer, objectsToDelete)
            );
          } else {
            // Fallback if no command manager
            selectedIds.forEach(id => drawingLayer.removeObject(id));
          }
          onObjectChange?.();
        }
      }

      // Ctrl+C or Cmd+C: Copy selected objects
      if (isCtrlLetter(e, 'c')) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const objects = selectedIds
            .map(id => drawingLayer.getObject(id))
            .filter(Boolean) as DrawingObject[];
          
          if (commandManager) {
            const command = new CopyDrawingObjectsCommand(drawingLayer, objects);
            command.execute();
            // Store in local clipboard for paste offset tracking
            setClipboard(objects);
          } else {
            setClipboard(objects);
          }
          setPasteCount(0);
          console.log(`Copied ${objects.length} object(s)`);
        }
      }

      // Ctrl+V or Cmd+V: Paste objects from clipboard
      if (isCtrlLetter(e, 'v')) {
        if (clipboard.length > 0) {
          e.preventDefault();
          const newPasteCount = pasteCount + 1;
          setPasteCount(newPasteCount);
          
          const offsetX = 20 * newPasteCount;
          const offsetY = 20 * newPasteCount;
          const pastedIds: string[] = [];

          clipboard.forEach(source => {
            const copy = JSON.parse(JSON.stringify(source)) as DrawingObject;
            copy.id = `${source.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            copy.position.x += offsetX;
            copy.position.y += offsetY;
            copy.zIndex = drawingLayer.getAllObjects().length + 1;
            drawingLayer.addObject(copy);
            pastedIds.push(copy.id);
          });

          // Select the pasted objects
          drawingLayer.deselectAll();
          pastedIds.forEach(id => drawingLayer.selectObject(id));
          onObjectChange?.();
          console.log(`Pasted ${pastedIds.length} object(s) at offset (${offsetX}, ${offsetY})`);
        }
      }

      // Ctrl+X or Cmd+X: Cut selected objects
      if (isCtrlLetter(e, 'x')) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const objects = selectedIds
            .map(id => drawingLayer.getObject(id))
            .filter(Boolean) as DrawingObject[];
          setClipboard(objects);
          setPasteCount(0);
          
          if (commandManager) {
            commandManager.execute(
              new DeleteDrawingObjectsCommand(drawingLayer, objects)
            );
          } else {
            selectedIds.forEach(id => drawingLayer.removeObject(id));
          }
          onObjectChange?.();
          console.log(`Cut ${objects.length} object(s)`);
        }
      }

      // Escape: Clear selection
      if (e.code === 'Escape') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          drawingLayer.deselectAll();
          onObjectChange?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingLayer, clipboard, pasteCount, onObjectChange]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through to spreadsheet
        zIndex: 5,
      }}
      width={canvasWidth}
      height={canvasHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
