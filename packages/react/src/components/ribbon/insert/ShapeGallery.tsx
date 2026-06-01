/**
 * ShapeGallery.tsx
 *
 * Excel-style categorized shape picker with recently used tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { buildGalleryCategories } from '../../../shapes/shape-catalog';
import { getRecentShapeIds, trackShapeUsage } from '../../../shapes/recentShapes';
import { ShapeThumbnail } from './ShapeThumbnail';

interface ShapeGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShape: (shapeType: string) => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export const ShapeGallery: React.FC<ShapeGalleryProps> = ({
  isOpen,
  onClose,
  onSelectShape,
  triggerRef,
}) => {
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentShapeIds());

  useEffect(() => {
    if (isOpen) {
      setRecentIds(getRecentShapeIds());
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (shapeId: string) => {
      const updated = trackShapeUsage(shapeId);
      setRecentIds(updated);
      onSelectShape(shapeId);
      onClose();
    },
    [onClose, onSelectShape],
  );

  if (!isOpen) return null;

  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const top = triggerRect ? triggerRect.bottom + 4 : 100;
  const left = triggerRect ? triggerRect.left : 100;
  const categories = buildGalleryCategories(recentIds);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top,
          left,
          zIndex: 9999,
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D1D1',
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '4px 0 8px',
          maxHeight: 480,
          overflowY: 'auto',
          width: 280,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {categories.map((category, catIndex) => (
          <div key={category.id}>
            {catIndex > 0 && (
              <div style={{ height: 1, backgroundColor: '#EFEFEF', margin: '6px 12px' }} />
            )}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#666666',
                padding: '6px 12px 4px',
              }}
            >
              {category.label}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 4,
                padding: '0 8px 4px',
              }}
            >
              {category.shapes.map((shape) => {
                const isHovered = hoveredShape === shape.id;
                return (
                  <button
                    key={`${category.id}-${shape.id}`}
                    type="button"
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${isHovered ? '#0078D4' : '#D9D9D9'}`,
                      borderRadius: 2,
                      backgroundColor: isHovered ? '#E8E8E8' : '#FFFFFF',
                      cursor: 'crosshair',
                      padding: 0,
                    }}
                    onClick={() => handleSelect(shape.id)}
                    onMouseEnter={() => setHoveredShape(shape.id)}
                    onMouseLeave={() => setHoveredShape(null)}
                    title={shape.name}
                    aria-label={shape.name}
                  >
                    <ShapeThumbnail shapeId={shape.id} size={24} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
