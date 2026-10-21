/**
 * ThemesGroup.tsx — Page Layout: Themes group (layout only)
 */

import React, { useState } from "react";
import { RibbonDropdownHost } from "../RibbonDropdownHost";
import { ribbonDropdownChrome } from "../ribbonDropdownChrome";

export interface ThemesGroupProps {
  onThemeChange?: (theme: string) => void;
  onColorsChange?: (colors: string) => void;
  onFontsChange?: (fonts: string) => void;
  onEffectsChange?: (effects: string) => void;
}

export const ThemesGroup: React.FC<ThemesGroupProps> = ({
  onThemeChange,
  onColorsChange,
  onFontsChange,
  onEffectsChange,
}) => {
  const [showThemesDropdown, setShowThemesDropdown] = useState(false);
  const [showColorsDropdown, setShowColorsDropdown] = useState(false);
  const [showFontsDropdown, setShowFontsDropdown] = useState(false);
  const [showEffectsDropdown, setShowEffectsDropdown] = useState(false);

  const menuStyle = ribbonDropdownChrome({
    minWidth: 200,
    maxHeight: 300,
    overflowY: "auto",
  });

  const dropdownItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "Segoe UI, Arial, sans-serif",
    borderBottom: "1px solid #F0F0F0",
  };

  const themes = ["Office", "Facet", "Integral", "Ion", "Retrospect", "Slice"];
  const colorThemes = [
    "Office",
    "Grayscale",
    "Blue Warm",
    "Blue",
    "Red",
    "Green",
    "Violet",
  ];
  const fontThemes = ["Office", "Office Classic", "Arial", "Calibri"];
  const effectThemes = ["Office", "Subtle", "Intense"];

  return (
    <div className="formulas-group pagelayout-themes">
      <div className="formulas-group-body formulas-defined-body pagelayout-themes-body">
        <RibbonDropdownHost
          open={showThemesDropdown}
          menuStyle={menuStyle}
          menu={
            <>
              {themes.map((theme, index) => (
                <div
                  key={theme}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom:
                      index === themes.length - 1 ? "none" : "1px solid #F0F0F0",
                  }}
                  onClick={() => {
                    setShowThemesDropdown(false);
                    onThemeChange?.(theme);
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
                  {theme}
                </div>
              ))}
            </>
          }
        >
          <button
            type="button"
            className="formulas-btn-large"
            onClick={() => setShowThemesDropdown(!showThemesDropdown)}
            title="Themes"
          >
            <span className="formulas-icon-lg" aria-hidden>
              🎨
            </span>
            <span>Themes</span>
            <span className="formulas-large-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </RibbonDropdownHost>

        <div className="formulas-menu-stack">
          <RibbonDropdownHost
            open={showColorsDropdown}
            menuStyle={menuStyle}
            menu={
              <>
                {colorThemes.map((colorTheme, index) => (
                  <div
                    key={colorTheme}
                    style={{
                      ...dropdownItemStyle,
                      borderBottom:
                        index === colorThemes.length - 1
                          ? "none"
                          : "1px solid #F0F0F0",
                    }}
                    onClick={() => {
                      setShowColorsDropdown(false);
                      onColorsChange?.(colorTheme);
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
                    {colorTheme}
                  </div>
                ))}
              </>
            }
          >
            <button
              type="button"
              className="formulas-row-btn"
              onClick={() => setShowColorsDropdown(!showColorsDropdown)}
              title="Colors"
            >
              <span className="formulas-icon-md" aria-hidden>
                🌈
              </span>
              <span>Colors</span>
              <span className="formulas-row-chevron" aria-hidden>
                ▾
              </span>
            </button>
          </RibbonDropdownHost>

          <RibbonDropdownHost
            open={showFontsDropdown}
            menuStyle={menuStyle}
            menu={
              <>
                {fontThemes.map((font, index) => (
                  <div
                    key={font}
                    style={{
                      ...dropdownItemStyle,
                      borderBottom:
                        index === fontThemes.length - 1
                          ? "none"
                          : "1px solid #F0F0F0",
                    }}
                    onClick={() => {
                      setShowFontsDropdown(false);
                      onFontsChange?.(font);
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
                    {font}
                  </div>
                ))}
              </>
            }
          >
            <button
              type="button"
              className="formulas-row-btn"
              onClick={() => setShowFontsDropdown(!showFontsDropdown)}
              title="Fonts"
            >
              <span className="formulas-icon-md" aria-hidden>
                Aa
              </span>
              <span>Fonts</span>
              <span className="formulas-row-chevron" aria-hidden>
                ▾
              </span>
            </button>
          </RibbonDropdownHost>

          <RibbonDropdownHost
            open={showEffectsDropdown}
            menuStyle={menuStyle}
            menu={
              <>
                {effectThemes.map((effect, index) => (
                  <div
                    key={effect}
                    style={{
                      ...dropdownItemStyle,
                      borderBottom:
                        index === effectThemes.length - 1
                          ? "none"
                          : "1px solid #F0F0F0",
                    }}
                    onClick={() => {
                      setShowEffectsDropdown(false);
                      onEffectsChange?.(effect);
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
                    {effect}
                  </div>
                ))}
              </>
            }
          >
            <button
              type="button"
              className="formulas-row-btn"
              onClick={() => setShowEffectsDropdown(!showEffectsDropdown)}
              title="Effects"
            >
              <span className="formulas-icon-md" aria-hidden>
                ✨
              </span>
              <span>Effects</span>
              <span className="formulas-row-chevron" aria-hidden>
                ▾
              </span>
            </button>
          </RibbonDropdownHost>
        </div>
      </div>

      <div className="formulas-group-caption">Themes</div>
    </div>
  );
};
