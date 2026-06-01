import type { DrawingLayer, PictureObject, ShapeObject, IconObject } from '@cyber-sheet/core';
import { getShapeDefinition } from '../shapes/shape-catalog';
import type { IconDefinition } from '../icons/icon-catalog';

export type IconInsertTemplate = Omit<IconObject, 'id' | 'position' | 'size' | 'zIndex'>;

export function createIconInsertTemplate(def: IconDefinition, loadedImage?: HTMLImageElement): IconInsertTemplate {
  return {
    type: 'icon',
    name: def.name,
    iconId: def.id,
    svgContent: def.content,
    viewBox: def.viewBox,
    fillColor: '#4472C4',
    rotation: 0,
    locked: false,
    visible: true,
    altText: def.name,
    loadedImage,
  };
}

export function createShapeObject(
  shapeType: string,
  x: number,
  y: number,
  width: number,
  height: number,
  drawingLayer: DrawingLayer,
): ShapeObject {
  const definition = getShapeDefinition(shapeType);
  return {
    id: `shape_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: 'shape',
    name: definition?.name ?? shapeType,
    shapeType: shapeType as ShapeObject['shapeType'],
    position: { x, y },
    size: { width, height },
    rotation: 0,
    zIndex: drawingLayer.getAllObjects().length + 1,
    locked: false,
    visible: true,
    altText: definition?.name ?? shapeType,
    fill: { type: 'solid', color: '#4472C4', transparency: 0 },
    line: { color: '#4472C4', width: 1, style: 'solid' },
  };
}

export function createPictureObjectFromTemplate(
  template: Omit<PictureObject, 'id' | 'position' | 'size' | 'zIndex'>,
  x: number,
  y: number,
  width: number,
  height: number,
  drawingLayer: DrawingLayer,
): PictureObject {
  return {
    ...template,
    id: `pic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    position: { x, y },
    size: { width, height },
    zIndex: drawingLayer.getAllObjects().length + 1,
  };
}

export function createIconObjectFromTemplate(
  template: IconInsertTemplate,
  x: number,
  y: number,
  width: number,
  height: number,
  drawingLayer: DrawingLayer,
): IconObject {
  return {
    ...template,
    id: `icon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    position: { x, y },
    size: { width, height },
    zIndex: drawingLayer.getAllObjects().length + 1,
  };
}
