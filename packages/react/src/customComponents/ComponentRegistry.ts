import type React from 'react';

export type CustomCellComponentRenderProps = {
  row: number;
  col: number;
  props?: Record<string, unknown>;
  bounds: { x: number; y: number; width: number; height: number };
  zoom: number;
};

export type RegisteredCellComponent = React.ComponentType<CustomCellComponentRenderProps>;

export class ComponentRegistry {
  private components = new Map<string, RegisteredCellComponent>();

  register(id: string, component: RegisteredCellComponent): void {
    this.components.set(id, component);
  }

  unregister(id: string): void {
    this.components.delete(id);
  }

  get(id: string): RegisteredCellComponent | undefined {
    return this.components.get(id);
  }

  list(): string[] {
    return Array.from(this.components.keys());
  }
}
