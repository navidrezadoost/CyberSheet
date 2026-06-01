/**
 * DrawingCommands.ts
 * 
 * Command pattern implementations for drawing object operations.
 * Supports undo/redo for delete, copy/paste, move, resize, rotate.
 */

import type { DrawingLayer, DrawingObject, FormControlObject, FormControlProperties } from '../DrawingLayer';

export interface Command {
  execute(): void;
  undo(): void;
}

/**
 * DeleteDrawingObjectsCommand
 * 
 * Removes one or more objects from the drawing layer.
 * Stores backups for undo.
 */
export class DeleteDrawingObjectsCommand implements Command {
  private backups: Map<string, DrawingObject> = new Map();
  
  constructor(
    private drawingLayer: DrawingLayer,
    private objects: DrawingObject[]
  ) {
    // Create deep copies of objects for undo
    objects.forEach(obj => {
      this.backups.set(obj.id, JSON.parse(JSON.stringify(obj)));
    });
  }
  
  execute(): void {
    this.backups.forEach((_, id) => {
      this.drawingLayer.removeObject(id);
    });
  }
  
  undo(): void {
    this.backups.forEach(obj => {
      this.drawingLayer.addObject(obj);
    });
  }
}

/**
 * CopyDrawingObjectsCommand
 * 
 * Duplicates selected objects with an offset.
 * Each paste increments offset for cascade effect.
 */
export class CopyDrawingObjectsCommand implements Command {
  private copiedObjects: DrawingObject[] = [];
  private pasteOffset: number = 0;
  
  constructor(
    private drawingLayer: DrawingLayer,
    private sourceObjects: DrawingObject[],
    private offsetX: number = 20,
    private offsetY: number = 20
  ) {}
  
  execute(): void {
    this.copiedObjects = [];
    this.pasteOffset++;
    
    this.sourceObjects.forEach(source => {
      const copy = JSON.parse(JSON.stringify(source)) as DrawingObject;
      copy.id = `${source.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      copy.position.x += this.offsetX * this.pasteOffset;
      copy.position.y += this.offsetY * this.pasteOffset;
      copy.zIndex = this.drawingLayer.getAllObjects().length + 1;
      
      this.drawingLayer.addObject(copy);
      this.copiedObjects.push(copy);
    });
    
    // Select the pasted objects
    this.drawingLayer.deselectAll();
    this.copiedObjects.forEach(obj => {
      this.drawingLayer.selectObject(obj.id);
    });
  }
  
  undo(): void {
    this.copiedObjects.forEach(obj => {
      this.drawingLayer.removeObject(obj.id);
    });
    this.copiedObjects = [];
  }
  
  resetPasteOffset(): void {
    this.pasteOffset = 0;
  }
}

/**
 * MoveDrawingObjectsCommand
 * 
 * Moves one or more objects by a delta.
 */
export class MoveDrawingObjectsCommand implements Command {
  constructor(
    private drawingLayer: DrawingLayer,
    private objectIds: string[],
    private deltaX: number,
    private deltaY: number
  ) {}
  
  execute(): void {
    this.objectIds.forEach(id => {
      this.drawingLayer.moveObject(id, { x: this.deltaX, y: this.deltaY });
    });
  }
  
  undo(): void {
    this.objectIds.forEach(id => {
      this.drawingLayer.moveObject(id, { x: -this.deltaX, y: -this.deltaY });
    });
  }
}

/**
 * ResizeDrawingObjectCommand
 * 
 * Resizes an object with optional anchor point.
 */
export class ResizeDrawingObjectCommand implements Command {
  private oldSize: { width: number; height: number };
  
  constructor(
    private drawingLayer: DrawingLayer,
    private objectId: string,
    private newSize: { width: number; height: number },
    private anchor: 'topLeft' | 'center' = 'topLeft'
  ) {
    const obj = drawingLayer.getObject(objectId);
    this.oldSize = obj ? { ...obj.size } : { width: 0, height: 0 };
  }
  
  execute(): void {
    this.drawingLayer.resizeObject(this.objectId, this.newSize, this.anchor);
  }
  
  undo(): void {
    this.drawingLayer.resizeObject(this.objectId, this.oldSize, this.anchor);
  }
}

/**
 * RotateDrawingObjectCommand
 * 
 * Rotates an object by a delta in degrees.
 */
export class RotateDrawingObjectCommand implements Command {
  constructor(
    private drawingLayer: DrawingLayer,
    private objectId: string,
    private degrees: number
  ) {}
  
  execute(): void {
    this.drawingLayer.rotateObject(this.objectId, this.degrees);
  }
  
  undo(): void {
    this.drawingLayer.rotateObject(this.objectId, -this.degrees);
  }
}

/**
 * AddDrawingObjectCommand — insert a floating object with undo support.
 */
export class AddDrawingObjectCommand implements Command {
  description?: string;

  constructor(
    private drawingLayer: DrawingLayer,
    private object: DrawingObject,
  ) {
    this.description = `Insert ${object.type}`;
  }

  execute(): void {
    this.drawingLayer.addObject(this.object);
    this.drawingLayer.selectObject(this.object.id);
  }

  undo(): void {
    this.drawingLayer.removeObject(this.object.id);
  }
}

export interface FormControlFormatUpdates {
  linkedCell?: string;
  size?: { width: number; height: number };
  locked?: boolean;
  visible?: boolean;
  altText?: string;
  anchor?: DrawingObject['anchor'];
  controlProperties?: Partial<FormControlProperties>;
}

/**
 * FormatFormControlCommand — apply Format Control dialog changes with undo.
 */
export class FormatFormControlCommand implements Command {
  description = 'Format Control';
  private readonly before: DrawingObject;
  private readonly after: DrawingObject;

  constructor(
    private drawingLayer: DrawingLayer,
    objectId: string,
    updates: FormControlFormatUpdates,
  ) {
    const obj = drawingLayer.getObject(objectId);
    if (!obj) {
      throw new Error(`Form control not found: ${objectId}`);
    }
    this.before = JSON.parse(JSON.stringify(obj));
    this.after = FormatFormControlCommand.mergeUpdates(this.before, updates);
  }

  private static mergeUpdates(
    source: DrawingObject,
    updates: FormControlFormatUpdates,
  ): DrawingObject {
    const next = JSON.parse(JSON.stringify(source)) as FormControlObject;
    if (updates.size) next.size = { ...updates.size };
    if (updates.locked !== undefined) next.locked = updates.locked;
    if (updates.visible !== undefined) next.visible = updates.visible;
    if (updates.altText !== undefined) next.altText = updates.altText;
    if (updates.anchor) next.anchor = { ...updates.anchor };
    if (updates.linkedCell !== undefined) next.linkedCell = updates.linkedCell;
    if (updates.controlProperties) {
      next.controlProperties = {
        ...next.controlProperties,
        ...updates.controlProperties,
      };
    }
    return next;
  }

  execute(): void {
    this.apply(this.after);
  }

  undo(): void {
    this.apply(this.before);
  }

  private apply(obj: DrawingObject): void {
    const existing = this.drawingLayer.getObject(obj.id);
    if (!existing) return;
    this.drawingLayer.updateObject(obj.id, obj);
  }
}

/**
 * GroupDrawingObjectsCommand
 * 
 * Groups multiple objects into a single logical unit.
 * (Placeholder for future implementation)
 */
export class GroupDrawingObjectsCommand implements Command {
  constructor(
    private drawingLayer: DrawingLayer,
    private objectIds: string[]
  ) {}
  
  execute(): void {
    console.log('Group command not yet implemented');
  }
  
  undo(): void {
    console.log('Ungroup command not yet implemented');
  }
}
