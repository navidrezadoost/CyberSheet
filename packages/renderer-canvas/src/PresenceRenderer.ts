/**
 * PresenceRenderer.ts
 * 
 * Canvas-optimized rendering of collaborative presence indicators
 * (cursors, selections, user badges)
 */

import type { ClientPresence } from '@cyber-sheet/core';
import type { Address } from '@cyber-sheet/core';

export interface PresenceRenderOptions {
  showCursors?: boolean;
  showSelections?: boolean;
  showBadges?: boolean;
  cursorSize?: number;
  badgeHeight?: number;
  selectionAlpha?: number;
}

export class PresenceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<PresenceRenderOptions>;
  
  // Cache for rendered badges
  private badgeCache = new Map<string, ImageBitmap>();

  constructor(canvas: HTMLCanvasElement, options: PresenceRenderOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.options = {
      showCursors: options.showCursors ?? true,
      showSelections: options.showSelections ?? true,
      showBadges: options.showBadges ?? true,
      cursorSize: options.cursorSize ?? 16,
      badgeHeight: options.badgeHeight ?? 20,
      selectionAlpha: options.selectionAlpha ?? 0.2
    };
  }

  /**
   * Render all presence indicators
   */
  render(
    clients: ClientPresence[],
    getCellBounds: (addr: Address) => { x: number; y: number; width: number; height: number }
  ): void {
    // Clear previous frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render in layers: selections -> cursors -> badges
    if (this.options.showSelections) {
      clients.forEach(client => {
        if (client.selection) {
          this.renderSelection(client, getCellBounds);
        }
      });
    }
    
    if (this.options.showCursors) {
      clients.forEach(client => {
        if (client.cursor) {
          this.renderCursor(client, getCellBounds);
        }
      });
    }
    
    if (this.options.showBadges) {
      clients.forEach(client => {
        if (client.cursor) {
          this.renderBadge(client, getCellBounds);
        }
      });
    }
  }

  /**
   * Render selection rectangle
   */
  private renderSelection(
    client: ClientPresence,
    getCellBounds: (addr: Address) => { x: number; y: number; width: number; height: number }
  ): void {
    if (!client.selection) return;
    
    const startBounds = getCellBounds(client.selection.start);
    const endBounds = getCellBounds(client.selection.end);
    
    const x = Math.min(startBounds.x, endBounds.x);
    const y = Math.min(startBounds.y, endBounds.y);
    const width = Math.max(startBounds.x + startBounds.width, endBounds.x + endBounds.width) - x;
    const height = Math.max(startBounds.y + startBounds.height, endBounds.y + endBounds.height) - y;
    
    // Fill with transparent color
    this.ctx.fillStyle = this.hexToRgba(client.color, this.options.selectionAlpha);
    this.ctx.fillRect(x, y, width, height);
    
    // Border
    this.ctx.strokeStyle = client.color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Render cursor (cell outline)
   */
  private renderCursor(
    client: ClientPresence,
    getCellBounds: (addr: Address) => { x: number; y: number; width: number; height: number }
  ): void {
    if (!client.cursor) return;
    
    const bounds = getCellBounds(client.cursor);
    
    // Thick border for cursor
    this.ctx.strokeStyle = client.color;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Corner indicator (small triangle)
    this.ctx.fillStyle = client.color;
    this.ctx.beginPath();
    this.ctx.moveTo(bounds.x, bounds.y);
    this.ctx.lineTo(bounds.x + this.options.cursorSize, bounds.y);
    this.ctx.lineTo(bounds.x, bounds.y + this.options.cursorSize);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Render user badge (name tag)
   */
  private renderBadge(
    client: ClientPresence,
    getCellBounds: (addr: Address) => { x: number; y: number; width: number; height: number }
  ): void {
    if (!client.cursor) return;
    
    const bounds = getCellBounds(client.cursor);
    
    // Badge position (above cursor)
    const badgeX = bounds.x;
    const badgeY = bounds.y - this.options.badgeHeight - 4;
    
    // Skip if off-screen
    if (badgeY < 0) return;
    
    // Measure text
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textMetrics = this.ctx.measureText(client.username);
    const badgeWidth = textMetrics.width + 16;
    
    // Background
    this.ctx.fillStyle = client.color;
    this.ctx.beginPath();
    this.ctx.roundRect(badgeX, badgeY, badgeWidth, this.options.badgeHeight, 4);
    this.ctx.fill();
    
    // Text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      client.username,
      badgeX + 8,
      badgeY + this.options.badgeHeight / 2
    );
  }

  /**
   * Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Clear canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
