import * as React from 'react';
import { CellStyle, FormattingChanges } from './FormatCellsDialog';
import FillEffectsDialog, { GradientEffect } from './FillEffectsDialog';

export interface FillTabProps {
  currentFormatting: CellStyle;
  onChange: (changes: FormattingChanges['fill']) => void;
}

const THEME_COLORS = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5',
  '#70AD47', '#264478', '#9E480E', '#636363', '#997300'
];

const STANDARD_COLORS = [
  '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050',
  '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'
];

const PATTERN_STYLES = [
  { id: 'solid', label: 'Solid', preview: '█████' },
  { id: 'gray-12.5', label: '12.5% Gray', preview: '░░░░░' },
  { id: 'gray-25', label: '25% Gray', preview: '▒▒▒▒▒' },
  { id: 'gray-50', label: '50% Gray', preview: '▓▓▓▓▓' },
  { id: 'gray-75', label: '75% Gray', preview: '████░' },
  { id: 'horizontal', label: 'Horizontal Stripe', preview: '═════' },
  { id: 'vertical', label: 'Vertical Stripe', preview: '║║║║║' },
  { id: 'down-diagonal', label: 'Down Diagonal', preview: '╲╲╲╲╲' },
  { id: 'up-diagonal', label: 'Up Diagonal', preview: '╱╱╱╱╱' },
  { id: 'grid', label: 'Grid', preview: '┼┼┼┼┼' },
  { id: 'dots-small', label: 'Small Dots', preview: '·····' },
  { id: 'dots-large', label: 'Large Dots', preview: '●●●●●' }
];

const FillTab: React.FC<FillTabProps> = ({
  currentFormatting,
  onChange
}) => {
  const [backgroundColor, setBackgroundColor] = React.useState(
    currentFormatting.backgroundColor || '#FFFFFF'
  );
  const [patternColor, setPatternColor] = React.useState(
    currentFormatting.patternColor || '#000000'
  );
  const [patternStyle, setPatternStyle] = React.useState(
    currentFormatting.patternStyle || 'solid'
  );
  const [showFillEffects, setShowFillEffects] = React.useState(false);
  const [gradientEffect, setGradientEffect] = React.useState<GradientEffect | undefined>(
    currentFormatting.fillEffects
  );
  
  const [showBackgroundPicker, setShowBackgroundPicker] = React.useState(false);
  const [showPatternPicker, setShowPatternPicker] = React.useState(false);
  
  // Notify parent of changes
  React.useEffect(() => {
    onChange({
      backgroundColor,
      patternColor,
      patternStyle,
      fillEffects: gradientEffect
    });
  }, [backgroundColor, patternColor, patternStyle, gradientEffect, onChange]);
  
  const handleBackgroundColorSelect = (color: string) => {
    setBackgroundColor(color);
    setShowBackgroundPicker(false);
  };
  
  const handlePatternColorSelect = (color: string) => {
    setPatternColor(color);
    setShowPatternPicker(false);
  };
  
  const handleFillEffectsApply = (effect: GradientEffect) => {
    setGradientEffect(effect);
  };
  
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Background Color */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Background Color:
          </label>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: backgroundColor,
                  border: '1px solid #ccc',
                  borderRadius: '2px'
                }}
              />
              {backgroundColor.toUpperCase()}
            </button>
            
            {showBackgroundPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  padding: '12px',
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 100,
                  width: '200px'
                }}
              >
                <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#666' }}>
                  Theme Colors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '12px' }}>
                  {THEME_COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => handleBackgroundColorSelect(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: '1px solid #ccc',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
                
                <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#666' }}>
                  Standard Colors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '12px' }}>
                  {STANDARD_COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => handleBackgroundColorSelect(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: '1px solid #ccc',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
                
                <button
                  onClick={() => handleBackgroundColorSelect('#FFFFFF')}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  No Color
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Pattern Color */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Pattern Color:
          </label>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPatternPicker(!showPatternPicker)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: patternColor,
                  border: '1px solid #ccc',
                  borderRadius: '2px'
                }}
              />
              {patternColor.toUpperCase()}
            </button>
            
            {showPatternPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  padding: '12px',
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 100,
                  width: '200px'
                }}
              >
                <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#666' }}>
                  Theme Colors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '12px' }}>
                  {THEME_COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => handlePatternColorSelect(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: '1px solid #ccc',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
                
                <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 500, color: '#666' }}>
                  Standard Colors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {STANDARD_COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => handlePatternColorSelect(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: '1px solid #ccc',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Pattern Style */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
          Pattern Style:
        </label>
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            backgroundColor: '#fff',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {PATTERN_STYLES.map(pattern => (
            <div
              key={pattern.id}
              onClick={() => setPatternStyle(pattern.id)}
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: patternStyle === pattern.id ? '#e3f2fd' : '#fff',
                textAlign: 'center',
                fontSize: '16px',
                fontFamily: 'monospace'
              }}
              title={pattern.label}
            >
              {pattern.preview}
            </div>
          ))}
        </div>
      </div>
      
      {/* Fill Effects Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowFillEffects(true)}
          style={{
            padding: '8px 16px',
            border: '1px solid #0078d4',
            borderRadius: '4px',
            backgroundColor: '#fff',
            color: '#0078d4',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          Fill Effects...
        </button>
      </div>
      
      {/* Sample */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
          Sample
        </label>
        <div
          style={{
            width: '100%',
            height: '60px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: backgroundColor,
            backgroundImage: gradientEffect ? 
              `linear-gradient(to right, ${gradientEffect.color1}, ${gradientEffect.color2 || gradientEffect.color1})` : 
              undefined
          }}
        />
      </div>
      
      {/* Fill Effects Dialog */}
      <FillEffectsDialog
        isOpen={showFillEffects}
        onClose={() => setShowFillEffects(false)}
        onApply={handleFillEffectsApply}
        initialEffect={gradientEffect}
      />
    </div>
  );
};

export default FillTab;
