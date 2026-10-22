/**
 * IllustrationsGroup.tsx — Insert tab: Illustrations (layout)
 */

import React, { useState, useRef } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";
import type { DrawingLayer } from "@cyber-sheet/core";
import type { PictureInsertTemplate } from "../../DrawingCanvas";
import { ShapeGallery } from "./ShapeGallery";
import { IconGallery } from "./IconGallery";
import { loadIconImage, type IconDefinition } from "../../../icons/icon-catalog";
import { createIconInsertTemplate } from "../../../utils/createDrawingObject";
import type { IconInsertTemplate } from "../../../utils/createDrawingObject";

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
        type: "picture",
        name: file.name,
        source: reader.result as string,
        sourceType: "dataUri",
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

    e.target.value = "";
  };

  const menuStyle = ribbonDropdownChrome({
    minWidth: 180,
    maxHeight: 400,
    overflowY: "auto",
  });

  const dropdownItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "Segoe UI, Arial, sans-serif",
    borderBottom: "1px solid #F0F0F0",
  };

  return (
    <div className="formulas-group insert-illustrations">
      <div className="formulas-group-body insert-illustrations-row">
        <RibbonDropdownHost
          open={showPictureDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  setShowPictureDropdown(false);
                  fileInputRef.current?.click();
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "#E8F4FD";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                }}
              >
                This Device...
              </div>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  setShowPictureDropdown(false);
                  console.log("Stock Images");
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "#E8F4FD";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                }}
              >
                Stock Images...
              </div>
              <div
                style={{ ...dropdownItemStyle, borderBottom: "none" }}
                onClick={() => {
                  setShowPictureDropdown(false);
                  console.log("Online Pictures");
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "#E8F4FD";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                }}
              >
                Online Pictures...
              </div>
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large insert-illustrations-btn"
            onClick={() => setShowPictureDropdown(!showPictureDropdown)}
            title="Pictures"
          >
            <span className="formulas-icon-lg" aria-hidden>
              🖼️
            </span>
            <span>Pictures</span>
          </button>
        </RibbonDropdownHost>

        <button
          ref={shapesButtonRef}
          type="button"
          className="formulas-btn-large insert-illustrations-btn"
          onClick={() => setShapeGalleryOpen(true)}
          title="Shapes"
        >
          <span className="formulas-icon-lg" aria-hidden>
            ◯△▭
          </span>
          <span>Shapes</span>
        </button>

        <ShapeGallery
          isOpen={shapeGalleryOpen}
          onClose={() => setShapeGalleryOpen(false)}
          onSelectShape={handleSelectShape}
          triggerRef={shapesButtonRef}
        />

        <button
          ref={iconsButtonRef}
          type="button"
          className="formulas-btn-large insert-illustrations-btn"
          onClick={() => setIconGalleryOpen(true)}
          title="Icons"
        >
          <span className="formulas-icon-lg" aria-hidden>
            ⭐
          </span>
          <span>Icons</span>
        </button>

        <IconGallery
          isOpen={iconGalleryOpen}
          onClose={() => setIconGalleryOpen(false)}
          onSelectIcon={handleSelectIcon}
          triggerRef={iconsButtonRef}
        />
      </div>

      <div className="formulas-group-caption">Illustrations</div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePictureUpload}
      />
    </div>
  );
};
