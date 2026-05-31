import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CustomCellComponent, Worksheet } from '@cyber-sheet/core';
import type { CanvasRenderer } from '../../../renderer-canvas/src';
import type { ComponentRegistry } from './ComponentRegistry';

export interface CustomCellOverlayProps {
  container: HTMLElement | null;
  sheet: Worksheet | null | undefined;
  renderer: CanvasRenderer | null;
  registry: ComponentRegistry;
  zoom?: number;
  enabled?: boolean;
}

function overlayStyleForComponent(
  rect: { x: number; y: number; w: number; h: number },
  component: CustomCellComponent,
): React.CSSProperties {
  const pad = 2;
  if (component.position === 'overlay') {
    return {
      position: 'absolute',
      left: rect.x + pad,
      top: rect.y + pad,
      width: Math.max(0, rect.w - pad * 2),
      height: Math.max(0, rect.h - pad * 2),
      pointerEvents: 'auto',
      overflow: 'hidden',
      zIndex: 4,
    };
  }

  const size = component.size ?? 16;
  const top = rect.y + (rect.h - size) / 2;
  const left = component.position === 'right'
    ? rect.x + rect.w - size - pad
    : rect.x + pad;

  return {
    position: 'absolute',
    left,
    top,
    width: size,
    height: size,
    pointerEvents: 'auto',
    zIndex: 4,
  };
}

export const CustomCellOverlay: React.FC<CustomCellOverlayProps> = ({
  container,
  sheet,
  renderer,
  registry,
  zoom = 1,
  enabled = true,
}) => {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled || !sheet) return;

    const subscription = sheet.on((event) => {
      if (
        event.type === 'cell-component-changed' ||
        event.type === 'sheet-mutated'
      ) {
        setRevision((value) => value + 1);
      }
    });

    return () => subscription.dispose();
  }, [enabled, sheet]);

  useEffect(() => {
    if (!enabled || !renderer) return;

    const subscription = renderer.onScrollChange?.(() => {
      setRevision((value) => value + 1);
    });

    return () => subscription?.dispose();
  }, [enabled, renderer]);

  useEffect(() => {
    if (!enabled || !renderer || typeof renderer.onSelectionChange !== 'function') return;

    const subscription = renderer.onSelectionChange(() => {
      setRevision((value) => value + 1);
    });

    return () => subscription.dispose();
  }, [enabled, renderer]);

  const placements = useMemo(() => {
    if (!enabled || !sheet || !renderer) return [];

    return sheet
      .getAllCellComponents()
      .filter(({ component }) => component.type === 'react-component')
      .map(({ address, component }) => {
        const rect = renderer.getRangeRect(address.row, address.col, address.row, address.col);
        if (!rect) return null;

        const Registered = registry.get(component.id);
        if (!Registered) return null;

        return {
          key: `${address.row}:${address.col}:${component.id}`,
          address,
          component,
          rect,
          Registered,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  }, [enabled, sheet, renderer, registry, revision, zoom]);

  if (!enabled || !container || placements.length === 0) return null;

  return createPortal(
    <>
      {placements.map(({ key, address, component, rect, Registered }) => (
        <div
          key={key}
          style={overlayStyleForComponent(rect, component)}
          data-custom-cell-component={component.id}
          data-cell-row={address.row}
          data-cell-col={address.col}
        >
          <Registered
            row={address.row}
            col={address.col}
            props={component.props}
            bounds={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
            zoom={zoom}
          />
        </div>
      ))}
    </>,
    container,
  );
};
