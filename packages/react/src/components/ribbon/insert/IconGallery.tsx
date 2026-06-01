/**
 * IconGallery.tsx — searchable icon picker for Insert → Icons
 */

import React, { useMemo, useState } from 'react';
import {
  ICON_CATEGORIES,
  groupIconsByCategory,
  searchIcons,
  buildIconSvg,
  type IconDefinition,
} from '../../../icons/icon-catalog';

interface IconGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (icon: IconDefinition) => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export const IconGallery: React.FC<IconGalleryProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  triggerRef,
}) => {
  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => searchIcons(query), [query]);
  const grouped = useMemo(() => groupIconsByCategory(filtered), [filtered]);

  if (!isOpen) return null;

  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const top = triggerRect ? triggerRect.bottom + 4 : 100;
  const left = triggerRect ? triggerRect.left : 100;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top,
          left,
          zIndex: 9999,
          width: 320,
          maxHeight: 480,
          overflowY: 'auto',
          background: '#FFFFFF',
          border: '1px solid #D1D1D1',
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '8px 0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '0 12px 8px' }}>
          <input
            type="search"
            placeholder="Search icons"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '6px 8px',
              border: '1px solid #D1D1D1',
              borderRadius: 3,
              fontSize: 12,
              fontFamily: 'Segoe UI, Arial, sans-serif',
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '12px', color: '#888', fontSize: 12 }}>No icons found</div>
        ) : (
          ICON_CATEGORIES.map((category) => {
            const icons = grouped.get(category);
            if (!icons?.length) return null;
            return (
              <div key={category}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#666',
                    padding: '6px 12px 4px',
                  }}
                >
                  {category}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 4,
                    padding: '0 8px 8px',
                  }}
                >
                  {icons.map((icon) => {
                    const isHovered = hoveredId === icon.id;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        title={icon.name}
                        aria-label={icon.name}
                        style={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${isHovered ? '#0078D4' : '#D9D9D9'}`,
                          borderRadius: 2,
                          background: isHovered ? '#E8E8E8' : '#FFF',
                          cursor: 'crosshair',
                          padding: 4,
                        }}
                        onClick={() => {
                          onSelectIcon(icon);
                          onClose();
                          setQuery('');
                        }}
                        onMouseEnter={() => setHoveredId(icon.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        dangerouslySetInnerHTML={{
                          __html: buildIconSvg(icon, '#595959').replace(
                            '<svg',
                            '<svg width="24" height="24"',
                          ),
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
