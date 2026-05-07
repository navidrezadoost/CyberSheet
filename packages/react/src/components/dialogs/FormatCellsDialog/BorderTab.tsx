import * as React from 'react';
import { CellStyle, FormattingChanges } from './FormatCellsDialog';
import BorderPreviewWidget, { BorderEdge, BorderState } from './BorderPreviewWidget';

export interface BorderTabProps {
  currentFormatting: CellStyle;
  onChange: (changes: FormattingChanges['border']) => void;
}

const LINE_STYLES = [
  { id: 'none', label: 'None', display: '' },
  { id: 'thin', label: 'Thin', display: '──────────' },
  { id: 'medium', label: 'Medium', display: '━━━━━━━━' },
  { id: 'thick', label: 'Thick', display: '▬▬▬▬▬▬' },
  { id: 'dashed', label: 'Dashed', display: '─ ─ ─ ─ ─' },
  { id: 'dotted', label: 'Dotted', display: '┄ ┄ ┄ ┄ ┄' },
  { id: 'double', label: 'Double', display: '══════' },
  { id: 'dashedHeavy', label: 'Dashed Heavy', display: '━ ━ ━ ━' }
];

const BorderTab: React.FC<BorderTabProps> = ({
  currentFormatting,
  onChange
}) => {
  const [lineStyle, setLineStyle] = React.useState('thin');
  const [lineColor, setLineColor] = React.useState('#000000');
  const [borders, setBorders] = React.useState<BorderState>({
    top: currentFormatting.borderTop || undefined,
    bottom: currentFormatting.borderBottom || undefined,
    left: currentFormatting.borderLeft || undefined,
    right: currentFormatting.borderRight || undefined,
    diagonalUp: currentFormatting.borderDiagonalUp || undefined,
    diagonalDown: currentFormatting.borderDiagonalDown || undefined
  });
  
  // Notify parent of changes
  React.useEffect(() => {
    onChange({
      top: borders.top || null,
      bottom: borders.bottom || null,
      left: borders.left || null,
      right: borders.right || null,
      diagonalUp: borders.diagonalUp || null,
      diagonalDown: borders.diagonalDown || null
    });
  }, [borders, onChange]);
  
  const handleToggleEdge = (edge: BorderEdge) => {
    const current = borders[edge];
    
    if (current) {
      // Remove border
      const newBorders = { ...borders };
      delete newBorders[edge];
      setBorders(newBorders);
    } else {
      // Add border with current style and color
      setBorders({
        ...borders,
        [edge]: { style: lineStyle, color: lineColor }
      });
    }
  };
  
  const handlePresetNone = () => {
    setBorders({});
  };
  
  const handlePresetOutline = () => {
    const borderSpec = { style: lineStyle, color: lineColor };
    setBorders({
      top: borderSpec,
      bottom: borderSpec,
      left: borderSpec,
      right: borderSpec
    });
  };
  
  const handlePresetInside = () => {
    const borderSpec = { style: lineStyle, color: lineColor };
    setBorders({
      ...borders,
      horizontal: borderSpec,
      vertical: borderSpec
    });
  };
  
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left column: Line settings */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
            Line
          </h3>
          
          {/* Style selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Style:
            </label>
            <div
              style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxHeight: '150px',
                overflowY: 'auto',
                backgroundColor: '#fff'
              }}
            >
              {LINE_STYLES.map(style => (
                <div
                  key={style.id}
                  onClick={() => setLineStyle(style.id)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: lineStyle === style.id ? '#e3f2fd' : 'transparent',
                    borderLeft: lineStyle === style.id ? '3px solid #0078d4' : '3px solid transparent',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}
                >
                  {style.display || style.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* Color picker */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Color:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={lineColor}
                onChange={(e: any) => setLineColor(e.target.value)}
                style={{
                  width: '40px',
                  height: '32px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '13px', color: '#666' }}>
                {lineColor.toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Presets */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
              Presets:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePresetNone}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                None
              </button>
              <button
                onClick={handlePresetOutline}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Outline
              </button>
              <button
                onClick={handlePresetInside}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Inside
              </button>
            </div>
          </div>
        </div>
        
        {/* Right column: Border preview */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
            Border preview
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: '#fafafa'
            }}
          >
            <BorderPreviewWidget
              borders={borders}
              onToggleEdge={handleToggleEdge}
              currentStyle={lineStyle}
              currentColor={lineColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorderTab;
