/**
 * DrawingCanvas.tsx
 *
 * Rendering layer for DrawingLayer objects.
 * Displays shapes, pictures, text boxes, form controls with selection handles,
 * drag-to-move, resize, and rotation interactions.
 */

import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { isCtrlLetter, hasCtrlOrMeta } from '../utils/keyboardLayout';
import type {
  DrawingLayer,
  DrawingObject,
  ShapeObject,
  PictureObject,
  FormControlObject,
  TextBoxObject,
  IconObject,
  CommandManager,
  Worksheet,
} from '@cyber-sheet/core';
import {
  DeleteDrawingObjectsCommand,
  CopyDrawingObjectsCommand,
  AddDrawingObjectCommand,
} from '@cyber-sheet/core';
import {
  clientToSheetPoint,
  normalizeInsertRect,
  snapSheetPoint,
  DEFAULT_INSERT_OBJECT_SIZE_PX,
} from '../utils/drawingGridSnap';
import {
  createShapeObject,
  createPictureObjectFromTemplate,
  createIconObjectFromTemplate,
  type IconInsertTemplate,
} from '../utils/createDrawingObject';
import {
  createFormControlFromTemplate,
  getFormControlDefaultSize,
  type FormControlInsertTemplate,
} from '../utils/formControlFactory';
import {
  createTextBoxFromTemplate,
  DEFAULT_TEXT_BOX_SIZE,
  type TextBoxInsertTemplate,
} from '../utils/textBoxFactory';
import {
  DEFAULT_WORD_ART_SIZE,
  isWordArtObject,
} from '../utils/wordArtFactory';
import { parseA1Reference } from '../utils/parseA1Reference';
import {
  isClickOnOptionButtonCircle,
  selectOptionButtonInGroup,
} from '../utils/optionButtonGroup';
import { getShapePath, getShapePathKind } from '../shapes/shapePaths';

// ─── Types ────────────────────────────────────────────────

export interface DrawingCanvasProps {
  drawingLayer: DrawingLayer;
  canvasWidth: number;
  canvasHeight: number;
  scrollLeft: number;
  scrollTop: number;
  zoom: number;
  worksheet?: Worksheet;
  commandManager?: CommandManager;
  onObjectChange?: () => void;
  onFormControlContextMenu?: (objectId: string, clientX: number, clientY: number) => void;
  suspendInteraction?: boolean;
}

export type PictureInsertTemplate = Omit<PictureObject, 'id' | 'position' | 'size' | 'zIndex'>;

export interface DrawingCanvasHandle {
  startShapeInsert: (shapeType: string) => void;
  startPictureInsert: (template: PictureInsertTemplate) => void;
  startIconInsert: (template: IconInsertTemplate) => void;
  startFormControlInsert: (template: FormControlInsertTemplate) => void;
  startTextBoxInsert: (template: TextBoxInsertTemplate) => void;
  startWordArtInsert: (template: TextBoxInsertTemplate) => void;
  cancelInsert: () => void;
}

interface InsertPreviewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HandlePosition {
  x: number;
  y: number;
  cursor: string;
  type: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotation';
}

interface DragState {
  objectId: string;
  action: 'move' | 'resize' | 'rotate';
  handle?: string;
  startMouseX: number;
  startMouseY: number;
  startObjectX: number;
  startObjectY: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
  startPointerAngle?: number;
}

interface ObjectScreenMetrics {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

function getObjectScreenMetrics(
  obj: DrawingObject,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
): ObjectScreenMetrics {
  const x = (obj.position.x - scrollLeft) * zoom;
  const y = (obj.position.y - scrollTop) * zoom;
  const w = obj.size.width * zoom;
  const h = obj.size.height * zoom;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function screenToObjectLocal(
  mx: number,
  my: number,
  metrics: ObjectScreenMetrics,
  rotation: number,
): { lx: number; ly: number } {
  const rad = (-rotation * Math.PI) / 180;
  const dx = mx - metrics.cx;
  const dy = my - metrics.cy;
  return {
    lx: dx * Math.cos(rad) - dy * Math.sin(rad),
    ly: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function isClickOnCheckboxSquare(
  obj: FormControlObject,
  mx: number,
  my: number,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
): boolean {
  const x = (obj.position.x - scrollLeft) * zoom;
  const y = (obj.position.y - scrollTop) * zoom;
  const w = obj.size.width * zoom;
  const h = obj.size.height * zoom;
  const size = Math.min(w, h) * 0.7;
  const boxX = x + 2;
  const boxY = y + (h - size) / 2;
  return mx >= boxX && mx <= boxX + size && my >= boxY && my <= boxY + size;
}

// ─── Constants ────────────────────────────────────────────

const HANDLE_SIZE = 7;
const HANDLE_COLOR = '#FFFFFF';
const HANDLE_BORDER = '#0078D4';
const SELECTION_BORDER = '#0078D4';
const ROTATION_HANDLE_OFFSET = 24;
const ROTATION_HANDLE_RADIUS = 4;
const MIN_OBJECT_SIZE = 5;

// ─── Component ────────────────────────────────────────────

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  {
    drawingLayer,
    canvasWidth,
    canvasHeight,
    scrollLeft,
    scrollTop,
    zoom,
    worksheet,
    commandManager,
    onObjectChange,
    onFormControlContextMenu,
    suspendInteraction = false,
  },
  ref,
) {
  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<DrawingObject[]>([]);
  const [pasteCount, setPasteCount] = useState<number>(0);
  const [insertActive, setInsertActive] = useState(false);
  const [insertPreview, setInsertPreview] = useState<InsertPreviewRect | null>(null);
  const [objectCount, setObjectCount] = useState(() => drawingLayer.getAllObjects().length);
  const [textEdit, setTextEdit] = useState<{
    objectId: string;
    text: string;
    originalText: string;
  } | null>(null);
  const textEditRef = useRef<HTMLTextAreaElement | null>(null);

  const passClickToSpreadsheet = useCallback((clientX: number, clientY: number, sourceEvent: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.pointerEvents = 'none';
    const target = document.elementFromPoint(clientX, clientY);
    canvas.style.pointerEvents = 'auto';

    if (!target || target === canvas) return;

    const eventInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      button: sourceEvent.button,
      buttons: sourceEvent.buttons,
      shiftKey: sourceEvent.shiftKey,
      ctrlKey: sourceEvent.ctrlKey,
      altKey: sourceEvent.altKey,
      metaKey: sourceEvent.metaKey,
    };

    target.dispatchEvent(new MouseEvent('mousedown', eventInit));
    target.dispatchEvent(new MouseEvent('mouseup', eventInit));
    target.dispatchEvent(new MouseEvent('click', eventInit));
  }, []);

  const interactionEnabled =
    !suspendInteraction && !textEdit && (insertActive || objectCount > 0);

  const insertModeRef = useRef<
    'none' | 'shape' | 'picture' | 'icon' | 'formControl' | 'textBox'
  >('none');
  const insertShapeTypeRef = useRef<string | null>(null);
  const insertPictureTemplateRef = useRef<PictureInsertTemplate | null>(null);
  const insertIconTemplateRef = useRef<IconInsertTemplate | null>(null);
  const insertFormControlTemplateRef = useRef<FormControlInsertTemplate | null>(null);
  const insertTextBoxTemplateRef = useRef<TextBoxInsertTemplate | null>(null);

  const cancelInsertMode = useCallback(() => {
    insertModeRef.current = 'none';
    insertShapeTypeRef.current = null;
    insertPictureTemplateRef.current = null;
    insertIconTemplateRef.current = null;
    insertFormControlTemplateRef.current = null;
    insertTextBoxTemplateRef.current = null;
    setInsertActive(false);
    setInsertPreview(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, []);

  useImperativeHandle(ref, () => ({
    startShapeInsert(shapeType: string) {
      insertModeRef.current = 'shape';
      insertShapeTypeRef.current = shapeType;
      insertPictureTemplateRef.current = null;
      insertIconTemplateRef.current = null;
      insertFormControlTemplateRef.current = null;
      insertTextBoxTemplateRef.current = null;
      setInsertActive(true);
      setInsertPreview(null);
      drawingLayer.deselectAll();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    },
    startPictureInsert(template: PictureInsertTemplate) {
      insertModeRef.current = 'picture';
      insertPictureTemplateRef.current = template;
      insertShapeTypeRef.current = null;
      insertIconTemplateRef.current = null;
      insertFormControlTemplateRef.current = null;
      insertTextBoxTemplateRef.current = null;
      setInsertActive(true);
      setInsertPreview(null);
      drawingLayer.deselectAll();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    },
    startIconInsert(template: IconInsertTemplate) {
      insertModeRef.current = 'icon';
      insertIconTemplateRef.current = template;
      insertShapeTypeRef.current = null;
      insertPictureTemplateRef.current = null;
      insertFormControlTemplateRef.current = null;
      insertTextBoxTemplateRef.current = null;
      setInsertActive(true);
      setInsertPreview(null);
      drawingLayer.deselectAll();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    },
    startFormControlInsert(template: FormControlInsertTemplate) {
      insertModeRef.current = 'formControl';
      insertFormControlTemplateRef.current = template;
      insertShapeTypeRef.current = null;
      insertPictureTemplateRef.current = null;
      insertIconTemplateRef.current = null;
      insertTextBoxTemplateRef.current = null;
      setInsertActive(true);
      setInsertPreview(null);
      drawingLayer.deselectAll();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    },
    startTextBoxInsert(template: TextBoxInsertTemplate) {
      insertModeRef.current = 'textBox';
      insertTextBoxTemplateRef.current = template;
      insertShapeTypeRef.current = null;
      insertPictureTemplateRef.current = null;
      insertIconTemplateRef.current = null;
      insertFormControlTemplateRef.current = null;
      setInsertActive(true);
      setInsertPreview(null);
      drawingLayer.deselectAll();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    },
    startWordArtInsert(template: TextBoxInsertTemplate) {
      insertModeRef.current = 'textBox';
      insertTextBoxTemplateRef.current = template;
      insertShapeTypeRef.current = null;
      insertPictureTemplateRef.current = null;
      insertIconTemplateRef.current = null;
      insertFormControlTemplateRef.current = null;
      setInsertActive(true);
      setInsertPreview(null);
      drawingLayer.deselectAll();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    },
    cancelInsert() {
      cancelInsertMode();
    },
  }), [drawingLayer, cancelInsertMode]);

  const finalizeInsert = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      const mode = insertModeRef.current;
      if (mode === 'none') return;

      let rect = normalizeInsertRect(startX, startY, endX, endY);

      if (
        (mode === 'picture' || mode === 'icon' || mode === 'formControl' || mode === 'textBox') &&
        Math.abs(endX - startX) < 5 &&
        Math.abs(endY - startY) < 5
      ) {
        if (mode === 'picture' && insertPictureTemplateRef.current) {
          const template = insertPictureTemplateRef.current;
          const defaultW = template.naturalWidth > 0 ? Math.min(template.naturalWidth, 400) : DEFAULT_INSERT_OBJECT_SIZE_PX;
          const defaultH = template.naturalHeight > 0 ? Math.min(template.naturalHeight, 400) : DEFAULT_INSERT_OBJECT_SIZE_PX;
          if (template.naturalWidth > 400 || template.naturalHeight > 400) {
            const ratio = Math.min(400 / template.naturalWidth, 400 / template.naturalHeight);
            rect = {
              x: startX - (template.naturalWidth * ratio) / 2,
              y: startY - (template.naturalHeight * ratio) / 2,
              width: template.naturalWidth * ratio,
              height: template.naturalHeight * ratio,
            };
          } else {
            rect = {
              x: startX - defaultW / 2,
              y: startY - defaultH / 2,
              width: defaultW,
              height: defaultH,
            };
          }
        } else if (mode === 'icon') {
          const iconSize = 48;
          rect = {
            x: startX - iconSize / 2,
            y: startY - iconSize / 2,
            width: iconSize,
            height: iconSize,
          };
        } else if (mode === 'formControl' && insertFormControlTemplateRef.current) {
          const { width, height } = getFormControlDefaultSize(
            insertFormControlTemplateRef.current.controlType,
          );
          rect = {
            x: startX - width / 2,
            y: startY - height / 2,
            width,
            height,
          };
        } else if (mode === 'textBox') {
          const template = insertTextBoxTemplateRef.current;
          const isWordArt = Boolean(template?.wordArtStyle);
          const size = isWordArt ? DEFAULT_WORD_ART_SIZE : DEFAULT_TEXT_BOX_SIZE;
          rect = {
            x: startX - size.width / 2,
            y: startY - size.height / 2,
            width: size.width,
            height: size.height,
          };
        }
      }

      let object: DrawingObject;
      if (mode === 'shape' && insertShapeTypeRef.current) {
        object = createShapeObject(
          insertShapeTypeRef.current,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          drawingLayer,
        );
      } else if (mode === 'picture' && insertPictureTemplateRef.current) {
        object = createPictureObjectFromTemplate(
          insertPictureTemplateRef.current,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          drawingLayer,
        );
      } else if (mode === 'icon' && insertIconTemplateRef.current) {
        object = createIconObjectFromTemplate(
          insertIconTemplateRef.current,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          drawingLayer,
        );
      } else if (mode === 'formControl' && insertFormControlTemplateRef.current) {
        object = createFormControlFromTemplate(
          insertFormControlTemplateRef.current,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          drawingLayer,
        );
      } else if (mode === 'textBox' && insertTextBoxTemplateRef.current) {
        object = createTextBoxFromTemplate(
          insertTextBoxTemplateRef.current,
          rect.x,
          rect.y,
          Math.max(rect.width, 40),
          Math.max(rect.height, 24),
          drawingLayer,
        );
      } else {
        return;
      }

      if (commandManager) {
        commandManager.execute(new AddDrawingObjectCommand(drawingLayer, object));
      } else {
        drawingLayer.addObject(object);
        drawingLayer.selectObject(object.id);
      }

      cancelInsertMode();
      onObjectChange?.();

      if (object.type === 'textBox') {
        const tb = object as TextBoxObject;
        setTextEdit({ objectId: tb.id, text: tb.text, originalText: tb.text });
      }
    },
    [drawingLayer, commandManager, cancelInsertMode, onObjectChange],
  );

  const toggleFormControlCheckbox = useCallback(
    (obj: FormControlObject) => {
      const checked = !obj.controlProperties.checked;
      drawingLayer.updateObject(obj.id, {
        controlProperties: { ...obj.controlProperties, checked },
      } as Partial<FormControlObject>);

      if (obj.linkedCell && worksheet) {
        const addr = parseA1Reference(obj.linkedCell);
        if (addr) {
          worksheet.setCellValue(addr, checked);
        }
      }

      onObjectChange?.();
    },
    [drawingLayer, worksheet, onObjectChange],
  );

  const selectFormControlOptionButton = useCallback(
    (obj: FormControlObject) => {
      if (obj.controlProperties.checked) return;
      selectOptionButtonInGroup(obj, drawingLayer, worksheet);
      onObjectChange?.();
    },
    [drawingLayer, worksheet, onObjectChange],
  );

  const commitTextEdit = useCallback(() => {
    if (!textEdit) return;
    drawingLayer.updateObject(textEdit.objectId, { text: textEdit.text } as Partial<TextBoxObject>);
    setTextEdit(null);
    onObjectChange?.();
  }, [textEdit, drawingLayer, onObjectChange]);

  const cancelTextEdit = useCallback(() => {
    if (!textEdit) return;
    drawingLayer.updateObject(textEdit.objectId, {
      text: textEdit.originalText,
    } as Partial<TextBoxObject>);
    setTextEdit(null);
    onObjectChange?.();
  }, [textEdit, drawingLayer, onObjectChange]);

  const beginTextEdit = useCallback(
    (objectId: string) => {
      const obj = drawingLayer.getObject(objectId);
      if (!obj || obj.type !== 'textBox') return;
      const tb = obj as TextBoxObject;
      drawingLayer.deselectAll();
      drawingLayer.selectObject(objectId);
      setSelectedIds([objectId]);
      setTextEdit({ objectId, text: tb.text, originalText: tb.text });
    },
    [drawingLayer],
  );

  useEffect(() => {
    if (!textEdit) return;
    const timer = window.setTimeout(() => {
      textEditRef.current?.focus();
      textEditRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [textEdit?.objectId]);

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
      if (textEdit?.objectId === obj.id) return;
      renderObject(ctx, obj, selection.has(obj.id), zoom, scrollLeft, scrollTop);
    });

    // Render selection handles for selected objects
    objects.forEach((obj: DrawingObject) => {
      if (selection.has(obj.id)) {
        renderSelectionHandles(ctx, obj, zoom, scrollLeft, scrollTop, hoveredHandle);
      }
    });

    if (insertPreview) {
      const px = (insertPreview.x - scrollLeft) * zoom;
      const py = (insertPreview.y - scrollTop) * zoom;
      const pw = insertPreview.width * zoom;
      const ph = insertPreview.height * zoom;
      ctx.save();
      ctx.strokeStyle = '#0078D4';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(px, py, pw, ph);
      ctx.restore();
    }
  }, [drawingLayer, canvasWidth, canvasHeight, zoom, scrollLeft, scrollTop, hoveredHandle, insertPreview, textEdit]);

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
      case 'icon':
        renderIcon(ctx, obj as IconObject, x, y, w, h);
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
  }

  function renderIcon(
    ctx: CanvasRenderingContext2D,
    obj: IconObject,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    if (obj.loadedImage) {
      ctx.drawImage(obj.loadedImage, x, y, w, h);
      return;
    }

    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#D1D1D1';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#999';
    ctx.font = `${Math.min(w, h) * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', x + w / 2, y + h / 2);
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

    const pathStr = getShapePath(obj.shapeType, w, h);
    const path = new Path2D(pathStr);
    const isStrokeShape = getShapePathKind(obj.shapeType) === 'stroke';

    if (isStrokeShape) {
      ctx.strokeStyle = obj.line?.color || '#4472C4';
      ctx.lineWidth = Math.max(2, (obj.line?.width || 1) * zoom);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    } else {
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
    isSelected: boolean,
  ): void {
    const style = obj.textStyle;
    const fill = obj.fill;
    const border = obj.border;
    const wordArt = obj.wordArtStyle;

    if (!wordArt && fill.type === 'solid' && fill.color) {
      ctx.fillStyle = fill.color;
      ctx.fillRect(x, y, w, h);
    }

    if (!wordArt && border.style !== 'none') {
      ctx.strokeStyle = border.color;
      ctx.lineWidth = border.width;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    const fontSize = style.fontSize * zoom;
    const fontParts = [
      style.italic ? 'italic' : '',
      style.bold ? 'bold' : '',
      `${fontSize}px`,
      style.fontFamily,
    ].filter(Boolean);
    ctx.font = fontParts.join(' ');
    ctx.textAlign = style.align;
    ctx.textBaseline = 'top';

    const padding = wordArt ? 2 : 4;
    const lines = (obj.text || '').split('\n');
    const lineHeight = fontSize * 1.3;

    if (wordArt) {
      ctx.save();
      if (wordArt.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 4 * zoom;
        ctx.shadowOffsetX = 2 * zoom;
        ctx.shadowOffsetY = 2 * zoom;
      }

      lines.forEach((line, i) => {
        let textX = x + padding;
        if (style.align === 'center') textX = x + w / 2;
        else if (style.align === 'right') textX = x + w - padding;
        const textY = y + padding + i * lineHeight;

        if (wordArt.outlineColor && wordArt.outlineWidth) {
          ctx.lineWidth = wordArt.outlineWidth * zoom;
          ctx.strokeStyle = wordArt.outlineColor;
          ctx.strokeText(line, textX, textY);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(line, textX, textY);
        } else {
          const gradient = ctx.createLinearGradient(textX, textY, textX, textY + lineHeight);
          gradient.addColorStop(0, wordArt.gradientFrom);
          gradient.addColorStop(1, wordArt.gradientTo);
          ctx.fillStyle = gradient;
          ctx.fillText(line, textX, textY);
        }
      });
      ctx.restore();
    } else {
      ctx.fillStyle = style.color;
      lines.forEach((line, i) => {
        let textX = x + padding;
        if (style.align === 'center') textX = x + w / 2;
        else if (style.align === 'right') textX = x + w - padding;
        ctx.fillText(line, textX, y + padding + i * lineHeight);
      });
    }

    if (isSelected && !textEdit) {
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
        const props = obj.controlProperties;
        const size = Math.min(w, h) * 0.7;
        const boxX = x + 2;
        const boxY = y + (h - size) / 2;
        const shaded = props.threeDShading !== false;

        if (shaded) {
          ctx.fillStyle = '#d4d4d4';
          ctx.fillRect(boxX, boxY, size, size);
          ctx.strokeStyle = '#808080';
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX + 0.5, boxY + 0.5, size - 1, size - 1);
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + size);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + size, boxY);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(boxX, boxY, size, size);
          ctx.fillStyle = '#FFF';
          ctx.fillRect(boxX, boxY, size, size);
        }

        if (props.mixed) {
          ctx.fillStyle = '#333';
          const inset = size * 0.32;
          ctx.fillRect(boxX + inset, boxY + inset, size - inset * 2, size - inset * 2);
        } else if (props.checked) {
          ctx.strokeStyle = '#0078D4';
          ctx.lineWidth = 2;
          const pad = size * 0.2;
          ctx.beginPath();
          ctx.moveTo(boxX + pad, boxY + size / 2);
          ctx.lineTo(boxX + size * 0.4, boxY + size - pad);
          ctx.lineTo(boxX + size - pad, boxY + pad);
          ctx.stroke();
        }
        if (props.label) {
          ctx.fillStyle = '#000';
          ctx.font = `${Math.max(11, size * 0.55)}px Segoe UI, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(props.label, x + size + 10, y + h / 2);
        }
        break;
      }
      case 'optionButton': {
        const props = obj.controlProperties;
        const radius = Math.min(w, h) * 0.28;
        const cx = x + 2 + radius;
        const cy = y + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (props.checked) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#0078D4';
          ctx.fill();
        }
        if (props.label) {
          ctx.fillStyle = '#000';
          ctx.font = `${Math.max(11, radius)}px Segoe UI, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(props.label, x + radius * 2 + 10, y + h / 2);
        }
        break;
      }
      case 'groupBox': {
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 8, w - 8, h - 12);
        if (obj.controlProperties.label) {
          ctx.fillStyle = '#FFF';
          ctx.fillRect(x + 10, y, ctx.measureText(obj.controlProperties.label).width + 8, 14);
          ctx.fillStyle = '#333';
          ctx.font = '11px Segoe UI, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(obj.controlProperties.label, x + 14, y + 1);
        }
        break;
      }
      case 'label': {
        ctx.fillStyle = '#000';
        ctx.font = `${Math.max(11, h * 0.55)}px Segoe UI, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.controlProperties.label ?? 'Label', x + 4, y + h / 2);
        break;
      }
      case 'button': {
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        const text = obj.controlProperties.buttonText ?? 'Button';
        ctx.fillStyle = '#000';
        ctx.font = `${Math.min(w, h) * 0.38}px Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
        break;
      }
      default: {
        ctx.strokeStyle = '#999';
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(x, y, w, h);
      }
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
    const { w, h, cx, cy } = getObjectScreenMetrics(obj, zoom, scrollLeft, scrollTop);
    const hs = HANDLE_SIZE;
    const rotationRad = (obj.rotation * Math.PI) / 180;
    const isFormControl = obj.type === 'formControl';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRad);

    ctx.strokeStyle = SELECTION_BORDER;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    const localHandles: { lx: number; ly: number; type: HandlePosition['type'] }[] = [
      { lx: -w / 2, ly: -h / 2, type: 'nw' },
      { lx: 0, ly: -h / 2, type: 'n' },
      { lx: w / 2, ly: -h / 2, type: 'ne' },
      { lx: w / 2, ly: 0, type: 'e' },
      { lx: w / 2, ly: h / 2, type: 'se' },
      { lx: 0, ly: h / 2, type: 's' },
      { lx: -w / 2, ly: h / 2, type: 'sw' },
      { lx: -w / 2, ly: 0, type: 'w' },
    ];

    localHandles.forEach((handle) => {
      const isHovered = hoveredHandle === handle.type;
      ctx.fillStyle = isHovered ? '#0078D4' : HANDLE_COLOR;
      ctx.strokeStyle = HANDLE_BORDER;
      ctx.lineWidth = 1.5;
      ctx.fillRect(handle.lx - hs / 2, handle.ly - hs / 2, hs, hs);
      ctx.strokeRect(handle.lx - hs / 2, handle.ly - hs / 2, hs, hs);
    });

    if (!isFormControl) {
      const rotHandleY = -h / 2 - ROTATION_HANDLE_OFFSET;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, rotHandleY);
      ctx.strokeStyle = HANDLE_BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();

      const isRotHovered = hoveredHandle === 'rotation';
      ctx.beginPath();
      ctx.arc(0, rotHandleY, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isRotHovered ? '#0078D4' : '#00B050';
      ctx.fill();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
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

        // Then check rotation handle (form controls cannot rotate)
        if (obj.type !== 'formControl') {
          const rotHandle = hitTestRotationHandle(obj, mouseX, mouseY);
          if (rotHandle) return { objectId: obj.id, handle: 'rotation' };
        }
      }
    }

    // Check objects (reverse z-order for top-most first)
    const objects = drawingLayer.getAllObjects().reverse();
    for (const obj of objects) {
      if (!obj.visible) continue;
      const metrics = getObjectScreenMetrics(obj, zoom, scrollLeft, scrollTop);
      const { lx, ly } = screenToObjectLocal(mouseX, mouseY, metrics, obj.rotation);
      if (Math.abs(lx) <= metrics.w / 2 && Math.abs(ly) <= metrics.h / 2) {
        return { objectId: obj.id };
      }
    }

    return {};
  }

  function hitTestHandles(obj: DrawingObject, mx: number, my: number): string | null {
    const metrics = getObjectScreenMetrics(obj, zoom, scrollLeft, scrollTop);
    const { lx, ly } = screenToObjectLocal(mx, my, metrics, obj.rotation);
    const hs = HANDLE_SIZE + 2;

    const handles: { type: string; lx: number; ly: number }[] = [
      { type: 'nw', lx: -metrics.w / 2, ly: -metrics.h / 2 },
      { type: 'n', lx: 0, ly: -metrics.h / 2 },
      { type: 'ne', lx: metrics.w / 2, ly: -metrics.h / 2 },
      { type: 'e', lx: metrics.w / 2, ly: 0 },
      { type: 'se', lx: metrics.w / 2, ly: metrics.h / 2 },
      { type: 's', lx: 0, ly: metrics.h / 2 },
      { type: 'sw', lx: -metrics.w / 2, ly: metrics.h / 2 },
      { type: 'w', lx: -metrics.w / 2, ly: 0 },
    ];

    for (const handle of handles) {
      if (Math.abs(lx - handle.lx) <= hs / 2 && Math.abs(ly - handle.ly) <= hs / 2) {
        return handle.type;
      }
    }
    return null;
  }

  function hitTestRotationHandle(obj: DrawingObject, mx: number, my: number): boolean {
    const metrics = getObjectScreenMetrics(obj, zoom, scrollLeft, scrollTop);
    const { lx, ly } = screenToObjectLocal(mx, my, metrics, obj.rotation);
    const rotHandleY = -metrics.h / 2 - ROTATION_HANDLE_OFFSET;
    return Math.sqrt(lx * lx + (ly - rotHandleY) ** 2) <= ROTATION_HANDLE_RADIUS + 2;
  }

  // ─── Mouse handlers ─────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (textEdit) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (insertModeRef.current !== 'none') {
        e.preventDefault();
        e.stopPropagation();

        const snapStart = !e.altKey;
        const startPoint = clientToSheetPoint(e.clientX, e.clientY, rect, zoom, scrollLeft, scrollTop);
        const startSnapped = snapSheetPoint(startPoint.x, startPoint.y, worksheet, snapStart);

        const onMouseMove = (moveEvent: MouseEvent) => {
          const snapMove = !moveEvent.altKey;
          const currentPoint = clientToSheetPoint(
            moveEvent.clientX,
            moveEvent.clientY,
            rect,
            zoom,
            scrollLeft,
            scrollTop,
          );
          const currentSnapped = snapSheetPoint(currentPoint.x, currentPoint.y, worksheet, snapMove);
          setInsertPreview({
            x: Math.min(startSnapped.x, currentSnapped.x),
            y: Math.min(startSnapped.y, currentSnapped.y),
            width: Math.abs(currentSnapped.x - startSnapped.x),
            height: Math.abs(currentSnapped.y - startSnapped.y),
          });
        };

        const onMouseUp = (upEvent: MouseEvent) => {
          const snapEnd = !upEvent.altKey;
          const endPoint = clientToSheetPoint(
            upEvent.clientX,
            upEvent.clientY,
            rect,
            zoom,
            scrollLeft,
            scrollTop,
          );
          const endSnapped = snapSheetPoint(endPoint.x, endPoint.y, worksheet, snapEnd);
          finalizeInsert(startSnapped.x, startSnapped.y, endSnapped.x, endSnapped.y);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return;
      }

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTest(mx, my);

      if (hit.handle) {
        const obj = drawingLayer.getObject(hit.objectId!);
        if (obj) {
          e.preventDefault();
          e.stopPropagation();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const metrics = getObjectScreenMetrics(obj, zoom, scrollLeft, scrollTop);
          const startPointerAngle = Math.atan2(my - metrics.cy, mx - metrics.cx);
          setDragState({
            objectId: obj.id,
            action: hit.handle === 'rotation' ? 'rotate' : 'resize',
            handle: hit.handle,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startObjectX: obj.position.x,
            startObjectY: obj.position.y,
            startWidth: obj.size.width,
            startHeight: obj.size.height,
            startRotation: obj.rotation,
            startPointerAngle,
          });
          return;
        }
      }

      if (hit.objectId) {
        e.preventDefault();
        e.stopPropagation();

        const obj = drawingLayer.getObject(hit.objectId);
        if (
          obj?.type === 'formControl' &&
          (obj as FormControlObject).controlType === 'checkbox' &&
          !e.shiftKey
        ) {
          const fc = obj as FormControlObject;
          const onSquare = isClickOnCheckboxSquare(fc, mx, my, zoom, scrollLeft, scrollTop);

          if (onSquare && !hasCtrlOrMeta(e)) {
            toggleFormControlCheckbox(fc);
            drawingLayer.deselectAll();
            drawingLayer.selectObject(fc.id);
            setSelectedIds([fc.id]);
            return;
          }

          if (hasCtrlOrMeta(e)) {
            drawingLayer.deselectAll();
            drawingLayer.selectObject(fc.id);
            setSelectedIds([fc.id]);
            return;
          }
        }

        if (
          obj?.type === 'formControl' &&
          (obj as FormControlObject).controlType === 'optionButton' &&
          !e.shiftKey
        ) {
          const fc = obj as FormControlObject;
          const onCircle = isClickOnOptionButtonCircle(fc, mx, my, zoom, scrollLeft, scrollTop);

          if (onCircle && !hasCtrlOrMeta(e)) {
            selectFormControlOptionButton(fc);
            drawingLayer.deselectAll();
            drawingLayer.selectObject(fc.id);
            setSelectedIds([fc.id]);
            return;
          }

          if (hasCtrlOrMeta(e)) {
            drawingLayer.deselectAll();
            drawingLayer.selectObject(fc.id);
            setSelectedIds([fc.id]);
            return;
          }
        }

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
        e.preventDefault();
        e.stopPropagation();
        if (!e.shiftKey) {
          drawingLayer.deselectAll();
          setSelectedIds([]);
        }
        passClickToSpreadsheet(e.clientX, e.clientY, e.nativeEvent);
        return;
      }
      onObjectChange?.();
    },
    [drawingLayer, zoom, scrollLeft, scrollTop, onObjectChange, worksheet, finalizeInsert, passClickToSpreadsheet, toggleFormControlCheckbox, selectFormControlOptionButton, textEdit]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (textEdit) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTest(mx, my);
      if (!hit.objectId) return;
      const obj = drawingLayer.getObject(hit.objectId);
      if (obj?.type === 'textBox') {
        e.preventDefault();
        e.stopPropagation();
        beginTextEdit(hit.objectId);
      }
    },
    [textEdit, drawingLayer, beginTextEdit],
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
      } else if (dragState.action === 'rotate') {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const obj = drawingLayer.getObject(dragState.objectId);
        if (!obj || dragState.startPointerAngle === undefined) return;

        const metrics = getObjectScreenMetrics(obj, zoom, scrollLeft, scrollTop);
        const pointerAngle = Math.atan2(my - metrics.cy, mx - metrics.cx);
        let deltaDeg = ((pointerAngle - dragState.startPointerAngle) * 180) / Math.PI;
        let newRotation = dragState.startRotation + deltaDeg;

        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        drawingLayer.setObjectRotation(dragState.objectId, newRotation);
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
    if (!dragState) return;

    const onWindowMove = (e: MouseEvent) => {
      handleMouseMove(e as unknown as React.MouseEvent<HTMLCanvasElement>);
    };
    const onWindowUp = () => setDragState(null);

    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
    };
  }, [dragState, handleMouseMove]);

  useEffect(() => {
    const syncLayer = () => {
      setSelectedIds(drawingLayer.getSelectedIds());
      setObjectCount(drawingLayer.getAllObjects().length);
      render();
    };
    const syncSelection = () => {
      setSelectedIds(drawingLayer.getSelectedIds());
      render();
    };

    drawingLayer.on('changed', syncLayer);
    drawingLayer.on('selectionChanged', syncSelection);

    return () => {
      drawingLayer.off('changed', syncLayer);
      drawingLayer.off('selectionChanged', syncSelection);
    };
  }, [drawingLayer, render]);

  useEffect(() => {
    const onDocumentMouseDown = (e: MouseEvent) => {
      if (insertModeRef.current !== 'none') return;
      if (drawingLayer.getSelectedIds().length === 0) return;

      const canvas = canvasRef.current;
      if (canvas?.contains(e.target as Node)) return;

      drawingLayer.deselectAll();
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [drawingLayer]);

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

      // Escape: cancel text edit, insert mode, or clear selection
      if (e.code === 'Escape') {
        if (textEdit) {
          e.preventDefault();
          cancelTextEdit();
          return;
        }
        if (insertModeRef.current !== 'none') {
          e.preventDefault();
          cancelInsertMode();
          onObjectChange?.();
          return;
        }
        if (selectedIds.length > 0) {
          e.preventDefault();
          drawingLayer.deselectAll();
          onObjectChange?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingLayer, clipboard, pasteCount, onObjectChange, commandManager, cancelInsertMode, textEdit, cancelTextEdit, selectedIds]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || insertModeRef.current !== 'none') return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTest(mx, my);
      if (!hit.objectId) return;

      const obj = drawingLayer.getObject(hit.objectId);
      if (obj?.type !== 'formControl') return;

      e.preventDefault();
      e.stopPropagation();
      drawingLayer.deselectAll();
      drawingLayer.selectObject(hit.objectId);
      setSelectedIds([hit.objectId]);
      onFormControlContextMenu?.(hit.objectId, e.clientX, e.clientY);
    },
    [drawingLayer, onFormControlContextMenu],
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: interactionEnabled ? 'auto' : 'none',
          cursor: insertActive ? 'crosshair' : undefined,
        }}
        width={canvasWidth}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {textEdit && (() => {
        const obj = drawingLayer.getObject(textEdit.objectId) as TextBoxObject | undefined;
        if (!obj || obj.type !== 'textBox') return null;
        const left = (obj.position.x - scrollLeft) * zoom;
        const top = (obj.position.y - scrollTop) * zoom;
        const width = obj.size.width * zoom;
        const height = obj.size.height * zoom;
        const style = obj.textStyle;
        return (
          <textarea
            ref={textEditRef}
            value={textEdit.text}
            onChange={(e) => setTextEdit((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
            onBlur={commitTextEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelTextEdit();
              }
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              boxSizing: 'border-box',
              padding: 4,
              margin: 0,
              border: isWordArtObject(obj) ? '1px dashed #0078d4' : '1px solid #0078d4',
              outline: 'none',
              resize: 'none',
              overflow: 'auto',
              background: isWordArtObject(obj)
                ? 'transparent'
                : obj.fill.type === 'solid'
                  ? (obj.fill.color ?? '#fff')
                  : '#fff',
              color: style.color,
              fontFamily: style.fontFamily,
              fontSize: style.fontSize * zoom,
              fontWeight: style.bold ? 'bold' : 'normal',
              fontStyle: style.italic ? 'italic' : 'normal',
              textAlign: style.align,
              lineHeight: 1.3,
              pointerEvents: 'auto',
              zIndex: 6,
            }}
            spellCheck={false}
          />
        );
      })()}
    </div>
  );
});
