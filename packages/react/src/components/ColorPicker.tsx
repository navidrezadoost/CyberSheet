import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  x: number;
  y: number;
  onColorSelect: (color: string) => void;
  onClose: () => void;
  recentColors?: string[];
}

// Excel 365 theme colors (10 themes × 6 tints/shades)
const THEME_COLORS = {
  names: [
    'Background 1',
    'Text 1',
    'Background 2',
    'Text 2',
    'Accent 1',
    'Accent 2',
    'Accent 3',
    'Accent 4',
    'Accent 5',
    'Accent 6',
  ],
  base: [
    '#FFFFFF', // Background 1 (white)
    '#000000', // Text 1 (black)
    '#E7E6E6', // Background 2 (light gray)
    '#44546A', // Text 2 (dark blue-gray)
    '#4472C4', // Accent 1 (blue)
    '#ED7D31', // Accent 2 (orange)
    '#A5A5A5', // Accent 3 (gray)
    '#FFC000', // Accent 4 (gold)
    '#5B9BD5', // Accent 5 (light blue)
    '#70AD47', // Accent 6 (green)
  ],
  // Tint percentages: 80%, 60%, 40%, -25%, -50%
  tints: [
    [0.8, 0.6, 0.4, -0.25, -0.5],
  ],
};

// Standard colors (Excel's 10 standard colors)
const STANDARD_COLORS = [
  '#C00000', // Dark Red
  '#FF0000', // Red
  '#FFC000', // Orange
  '#FFFF00', // Yellow
  '#92D050', // Light Green
  '#00B050', // Green
  '#00B0F0', // Light Blue
  '#0070C0', // Blue
  '#002060', // Dark Blue
  '#7030A0', // Purple
];

// Apply tint/shade to a hex color
function applyTint(hex: string, tintValue: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let newR: number, newG: number, newB: number;

  if (tintValue < 0) {
    // Shade (darken)
    const shade = 1 + tintValue;
    newR = Math.round(r * shade);
    newG = Math.round(g * shade);
    newB = Math.round(b * shade);
  } else {
    // Tint (lighten)
    newR = Math.round(r + (255 - r) * tintValue);
    newG = Math.round(g + (255 - g) * tintValue);
    newB = Math.round(b + (255 - b) * tintValue);
  }

  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

// Generate all theme color variations
function generateThemeColors(): string[][] {
  return THEME_COLORS.base.map((baseColor) => {
    const variations = [baseColor]; // Base color first
    THEME_COLORS.tints[0].forEach((tint) => {
      variations.push(applyTint(baseColor, tint));
    });
    return variations;
  });
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  x,
  y,
  onColorSelect,
  onClose,
  recentColors = [],
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [customColor, setCustomColor] = useState('#000000');
  const [position, setPosition] = useState({ x, y });
  
  const themeColors = generateThemeColors();

  // Adjust position to keep picker on screen
  useEffect(() => {
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Keep within viewport horizontally
      if (adjustedX + rect.width > viewportWidth - 4) {
        adjustedX = viewportWidth - rect.width - 4;
      }
      if (adjustedX < 4) adjustedX = 4;

      // Keep within viewport vertically
      if (adjustedY + rect.height > viewportHeight - 4) {
        adjustedY = viewportHeight - rect.height - 4;
      }
      if (adjustedY < 4) adjustedY = 4;

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleColorClick = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  const colorSwatchStyle = (color: string): React.CSSProperties => ({
    width: '18px',
    height: '18px',
    backgroundColor: color,
    border: '1px solid #D0D0D0',
    cursor: 'pointer',
    transition: 'transform 0.1s',
  });

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '220px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CCCCCC',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '8px',
        zIndex: 10002,
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '11px',
      }}
    >
      {/* Theme Colors Section */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
          Theme Colors
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {/* Display as columns (10 columns, 6 rows) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 20px)', gap: '1px' }}>
            {/* First row: base colors */}
            {themeColors.map((colorRow, colIndex) => (
              <div
                key={`base-${colIndex}`}
                style={colorSwatchStyle(colorRow[0])}
                onClick={() => handleColorClick(colorRow[0])}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.zIndex = '1';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.zIndex = '0';
                }}
                title={THEME_COLORS.names[colIndex]}
              />
            ))}
            {/* Remaining rows: tints/shades */}
            {[1, 2, 3, 4, 5].map((rowIndex) =>
              themeColors.map((colorRow, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={colorSwatchStyle(colorRow[rowIndex])}
                  onClick={() => handleColorClick(colorRow[rowIndex])}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.zIndex = '1';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '0';
                  }}
                  title={`${THEME_COLORS.names[colIndex]} ${rowIndex === 1 ? 'Lighter 80%' : rowIndex === 2 ? 'Lighter 60%' : rowIndex === 3 ? 'Lighter 40%' : rowIndex === 4 ? 'Darker 25%' : 'Darker 50%'}`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Standard Colors Section */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
          Standard Colors
        </div>
        <div style={{ display: 'flex', gap: '1px', flexWrap: 'wrap' }}>
          {STANDARD_COLORS.map((color, index) => (
            <div
              key={`standard-${index}`}
              style={colorSwatchStyle(color)}
              onClick={() => handleColorClick(color)}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.zIndex = '1';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '0';
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Recent Colors Section */}
      {recentColors.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
            Recent Colors
          </div>
          <div style={{ display: 'flex', gap: '1px', flexWrap: 'wrap' }}>
            {recentColors.slice(0, 10).map((color, index) => (
              <div
                key={`recent-${index}`}
                style={colorSwatchStyle(color)}
                onClick={() => handleColorClick(color)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                  e.currentTarget.style.zIndex = '1';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.zIndex = '0';
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Color Section */}
      <div style={{ borderTop: '1px solid #E1E1E1', paddingTop: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>
          Custom Color
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="color"
            value={customColor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomColor(e.target.value)}
            style={{
              width: '40px',
              height: '24px',
              border: '1px solid #CCCCCC',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          />
          <input
            type="text"
            value={customColor.toUpperCase()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                setCustomColor(value);
              }
            }}
            placeholder="#000000"
            style={{
              flex: 1,
              height: '24px',
              padding: '0 6px',
              border: '1px solid #CCCCCC',
              borderRadius: '2px',
              fontFamily: 'Consolas, monospace',
              fontSize: '11px',
            }}
          />
          <button
            onClick={() => handleColorClick(customColor)}
            style={{
              height: '24px',
              padding: '0 10px',
              border: '1px solid #CCCCCC',
              borderRadius: '2px',
              backgroundColor: '#F0F0F0',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#E0E0E0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#F0F0F0';
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
