/**
 * ArrangeGroup.tsx — Page Layout: Arrange group (layout only)
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface ArrangeGroupProps {
  onBringForward?: (step: "front" | "forward") => void;
  onSendBackward?: (step: "back" | "backward") => void;
  onSelectionPane?: () => void;
  onAlign?: (alignment: string) => void;
  onGroup?: (action: "group" | "ungroup" | "regroup") => void;
  onRotate?: (rotation: string) => void;
}

export const ArrangeGroup: React.FC<ArrangeGroupProps> = ({
  onBringForward,
  onSendBackward,
  onSelectionPane,
  onAlign,
  onGroup,
  onRotate,
}) => {
  const [showBringForwardMenu, setShowBringForwardMenu] = useState(false);
  const [showSendBackwardMenu, setShowSendBackwardMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showRotateMenu, setShowRotateMenu] = useState(false);

  const menuStyle = ribbonDropdownChrome({ minWidth: 160, maxHeight: 320 });

  const menuBtn = (
    label: string,
    onClick: () => void,
  ): React.ReactNode => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "6px 12px",
        border: "none",
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "Segoe UI, sans-serif",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.background = "#F0F0F0";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="formulas-group pagelayout-arrange">
      <div className="formulas-group-body pagelayout-arrange-row">
        <RibbonDropdownHost
          open={showBringForwardMenu}
          menuStyle={menuStyle}
          menu={
            <>
              {menuBtn("Bring to Front", () => {
                onBringForward?.("front");
                setShowBringForwardMenu(false);
              })}
              {menuBtn("Bring Forward", () => {
                onBringForward?.("forward");
                setShowBringForwardMenu(false);
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-arrange-btn"
            onClick={() => setShowBringForwardMenu(!showBringForwardMenu)}
            title="Bring Forward"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ⬆️
            </span>
            <span>
              Bring
              <br />
              Forward
            </span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showSendBackwardMenu}
          menuStyle={menuStyle}
          menu={
            <>
              {menuBtn("Send to Back", () => {
                onSendBackward?.("back");
                setShowSendBackwardMenu(false);
              })}
              {menuBtn("Send Backward", () => {
                onSendBackward?.("backward");
                setShowSendBackwardMenu(false);
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-arrange-btn"
            onClick={() => setShowSendBackwardMenu(!showSendBackwardMenu)}
            title="Send Backward"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ⬇️
            </span>
            <span>
              Send
              <br />
              Backward
            </span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <button
          type="button"
          className="formulas-btn-large pagelayout-arrange-btn"
          onClick={() => onSelectionPane?.()}
          title="Selection Pane"
        >
          <span className="formulas-icon-lg" aria-hidden>
            🖱️
          </span>
          <span>
            Selection
            <br />
            Pane
          </span>
        </button>

        <RibbonDropdownHost
          open={showAlignMenu}
          menuStyle={menuStyle}
          menu={
            <>
              {[
                "Align Left",
                "Align Center",
                "Align Right",
                "Align Top",
                "Align Middle",
                "Align Bottom",
                "Distribute Horizontally",
                "Distribute Vertically",
              ].map((align) => (
                <React.Fragment key={align}>
                  {menuBtn(align, () => {
                    onAlign?.(align);
                    setShowAlignMenu(false);
                  })}
                </React.Fragment>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-arrange-btn"
            onClick={() => setShowAlignMenu(!showAlignMenu)}
            title="Align"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ≡
            </span>
            <span>Align</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showGroupMenu}
          menuStyle={menuStyle}
          menu={
            <>
              {menuBtn("Group", () => {
                onGroup?.("group");
                setShowGroupMenu(false);
              })}
              {menuBtn("Ungroup", () => {
                onGroup?.("ungroup");
                setShowGroupMenu(false);
              })}
              {menuBtn("Regroup", () => {
                onGroup?.("regroup");
                setShowGroupMenu(false);
              })}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-arrange-btn"
            onClick={() => setShowGroupMenu(!showGroupMenu)}
            title="Group"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ▢
            </span>
            <span>Group</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <RibbonDropdownHost
          open={showRotateMenu}
          menuStyle={menuStyle}
          menu={
            <>
              {[
                "Rotate Right 90°",
                "Rotate Left 90°",
                "Flip Vertical",
                "Flip Horizontal",
              ].map((rotation) => (
                <React.Fragment key={rotation}>
                  {menuBtn(rotation, () => {
                    onRotate?.(rotation);
                    setShowRotateMenu(false);
                  })}
                </React.Fragment>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large pagelayout-arrange-btn"
            onClick={() => setShowRotateMenu(!showRotateMenu)}
            title="Rotate"
          >
            <span className="formulas-icon-lg" aria-hidden>
              ↻
            </span>
            <span>Rotate</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>
      </div>

      <div className="formulas-group-caption">Arrange</div>
    </div>
  );
};
