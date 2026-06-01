/**
 * IllustrationsGroup.tsx
 *
 * Insert Tab - Illustrations Group
 * Contains: Pictures, Shapes, Icons, 3D Models
 */

import React, { useState, useRef } from 'react';
import type { DrawingLayer } from '@cyber-sheet/core';
import type { PictureInsertTemplate } from '../../DrawingCanvas';
import { ShapeGallery } from './ShapeGallery';
import { IconGallery } from './IconGallery';
import { loadIconImage, type IconDefinition } from '../../../icons/icon-catalog';
import { createIconInsertTemplate } from '../../../utils/createDrawingObject';
import type { IconInsertTemplate } from '../../../utils/createDrawingObject';

export interface IllustrationsGroupProps {
  drawingLayer?: DrawingLayer;
  onInsertPicture?: () => void;
  onInsertShape?: (shapeType: string) => void;
  onInsertIcon?: () => void;
  onObjectChange?: () => void;
  onBeginShapeInsert?: (shapeType: string) => void;
  onBeginPictureInsert?: (template: PictureInsertTemplate) => void;
  onBeginIconInsert?: (template: IconInsertTemplate) => void;
}

export const IllustrationsGroup: React.FC<IllustrationsGroupProps> = ({
  onInsertPicture,
  onInsertShape,
  onInsertIcon,
  onBeginShapeInsert,
  onBeginPictureInsert,
  onBeginIconInsert,
}) => {
  const [showPictureDropdown, setShowPictureDropdown] = useState(false);
  const [shapeGalleryOpen, setShapeGalleryOpen] = useState(false);
  const [iconGalleryOpen, setIconGalleryOpen] = useState(false);
  const shapesButtonRef = useRef(null as HTMLButtonElement | null);
  const iconsButtonRef = useRef(null as HTMLButtonElement | null);
  const fileInputRef = useRef(null as HTMLInputElement | null);

  const handleSelectShape = (shapeType: string) => {
    setShapeGalleryOpen(false);
    onBeginShapeInsert?.(shapeType);
    onInsertShape?.(shapeType);
  };

  const handleSelectIcon = async (iconDef: IconDefinition) => {
    setIconGalleryOpen(false);
    try {
      const loadedImage = await loadIconImage(iconDef);
      const template = createIconInsertTemplate(iconDef, loadedImage);
      onBeginIconInsert?.(template);
      onInsertIcon?.();
    } catch {
      const template = createIconInsertTemplate(iconDef);
      onBeginIconInsert?.(template);
      onInsertIcon?.();
    }
  };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const template: PictureInsertTemplate = {
        type: 'picture',
        name: file.name,
        source: reader.result as string,
        sourceType: 'dataUri',
        naturalWidth: 0,
        naturalHeight: 0,
        rotation: 0,
        locked: false,
        visible: true,
        altText: file.name,
      };

      const img = new Image();
      img.onload = () => {
        template.naturalWidth = img.naturalWidth;
        template.naturalHeight = img.naturalHeight;
        template.loadedImage = img;
        onBeginPictureInsert?.(template);
        onInsertPicture?.();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '4px 8px',
    position: 'relative',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 3,
    fontSize: 11,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    color: '#333',
    minWidth: 50,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 24,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Segoe UI, Arial, sans-serif',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    background: '#FFFFFF',
    border: '1px solid #D1D1D1',
    borderRadius: 3,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: 200,
    marginTop: 2,
  };

  const dropdownItemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    borderBottom: '1px solid #F0F0F0',
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean): void => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (isEnter) {
      btn.style.background = '#E8E8E8';
      btn.style.borderColor = '#D1D1D1';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'transparent';
    }
  };

  return (
    <div style={groupStyle}>
      <div style={buttonContainerStyle}>
        {/* Pictures */}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => {
              setShowPictureDropdown(!showPictureDropdown);
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
          >
            <span style={iconStyle}>🖼️</span>
            <span>Pictures</span>
          </button>

          {showPictureDropdown && (
            <div style={dropdownStyle}>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  setShowPictureDropdown(false);
                  fileInputRef.current?.click();
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                This Device...
              </div>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  setShowPictureDropdown(false);
                  console.log('Stock Images');
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                Stock Images...
              </div>
              <div
                style={{ ...dropdownItemStyle, borderBottom: 'none' }}
                onClick={() => {
                  setShowPictureDropdown(false);
                  console.log('Online Pictures');
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                Online Pictures...
              </div>
            </div>
          )}
        </div>

        {/* Shapes */}
        <button
          ref={shapesButtonRef}
          style={buttonStyle}
          onClick={() => setShapeGalleryOpen(true)}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
        >
          <span style={iconStyle}>◯△▭</span>
          <span>Shapes</span>
        </button>

        <ShapeGallery
          isOpen={shapeGalleryOpen}
          onClose={() => setShapeGalleryOpen(false)}
          onSelectShape={handleSelectShape}
          triggerRef={shapesButtonRef}
        />

        {/* Icons */}
        <button
          ref={iconsButtonRef}
          style={buttonStyle}
          onClick={() => setIconGalleryOpen(true)}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
        >
          <span style={iconStyle}>⭐</span>
          <span>Icons</span>
        </button>

        <IconGallery
          isOpen={iconGalleryOpen}
          onClose={() => setIconGalleryOpen(false)}
          onSelectIcon={handleSelectIcon}
          triggerRef={iconsButtonRef}
        />
      </div>

      <div style={labelStyle}>Illustrations</div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePictureUpload}
      />
    </div>
  );
};
