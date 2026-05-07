import * as React from 'react';
import { CellStyle, FormattingChanges } from './FormatCellsDialog';

export interface FontTabProps {
  currentFormatting: CellStyle;
  onChange: (changes: FormattingChanges['font']) => void;
}

const FONT_FAMILIES = [
  'Calibri', 'Arial', 'Times New Roman', 'Courier New', 'Verdana',
  'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact',
  'Palatino Linotype', 'Lucida Sans Unicode', 'Tahoma', 'Century Gothic'
];

const FONT_STYLES = ['Regular', 'Italic', 'Bold', 'Bold Italic'];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const UNDERLINE_OPTIONS = ['None', 'Single', 'Double', 'Single Accounting', 'Double Accounting'];

const FontTab: React.FC<FontTabProps> = ({
  currentFormatting,
  onChange
}) => {
  const [fontFamily, setFontFamily] = React.useState(
    currentFormatting.fontFamily || 'Calibri'
  );
  const [fontSize, setFontSize] = React.useState(
    currentFormatting.fontSize || 11
  );
  const [bold, setBold] = React.useState(
    currentFormatting.bold || false
  );
  const [italic, setItalic] = React.useState(
    currentFormatting.italic || false
  );
  const [underline, setUnderline] = React.useState(
    currentFormatting.underline || 'None'
  );
  const [strikethrough, setStrikethrough] = React.useState(
    currentFormatting.strikethrough || false
  );
  const [superscript, setSuperscript] = React.useState(
    currentFormatting.superscript || false
  );
  const [subscript, setSubscript] = React.useState(
    currentFormatting.subscript || false
  );
  const [color, setColor] = React.useState(
    currentFormatting.fontColor || '#000000'
  );
  
  // Derive font style from bold/italic
  const fontStyle = React.useMemo(() => {
    if (bold && italic) return 'Bold Italic';
    if (bold) return 'Bold';
    if (italic) return 'Italic';
    return 'Regular';
  }, [bold, italic]);
  
  // Notify parent of changes (debounced)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onChange({
        fontFamily,
        fontSize,
        bold,
        italic,
        underline: underline === 'None' ? undefined : underline,
        strikethrough,
        superscript,
        subscript,
        color
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fontFamily, fontSize, bold, italic, underline, strikethrough, superscript, subscript, color, onChange]);
  
  const handleFontStyleChange = (style: string) => {
    setBold(style === 'Bold' || style === 'Bold Italic');
    setItalic(style === 'Italic' || style === 'Bold Italic');
  };
  
  const handleSuperscriptChange = (e: any) => {
    const checked = e.target.checked;
    setSuperscript(checked);
    if (checked) setSubscript(false);
  };
  
  const handleSubscriptChange = (e: any) => {
    const checked = e.target.checked;
    setSubscript(checked);
    if (checked) setSuperscript(false);
  };
  
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '16px', marginBottom: '20px' }}>
        {/* Font Family */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Font:
          </label>
          <select
            value={fontFamily}
            onChange={(e: any) => setFontFamily(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            {FONT_FAMILIES.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>
        
        {/* Font Style */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Font style:
          </label>
          <select
            value={fontStyle}
            onChange={(e: any) => handleFontStyleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            {FONT_STYLES.map(style => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>
        
        {/* Font Size */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Size:
          </label>
          <select
            value={fontSize}
            onChange={(e: any) => setFontSize(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            {FONT_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Underline */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Underline:
          </label>
          <select
            value={underline}
            onChange={(e: any) => setUnderline(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            {UNDERLINE_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        {/* Color */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Color:
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              value={color}
              onChange={(e: any) => setColor(e.target.value)}
              style={{
                width: '40px',
                height: '32px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '13px', color: '#666' }}>
              {color.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Effects */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Effects
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={strikethrough}
                onChange={(e: any) => setStrikethrough(e.target.checked)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              Strikethrough
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={superscript}
                onChange={handleSuperscriptChange}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              Superscript
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={subscript}
                onChange={handleSubscriptChange}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              Subscript
            </label>
          </div>
        </div>
        
        {/* Preview */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Preview
          </label>
          <div
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '16px',
              backgroundColor: '#fff',
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize}px`,
                fontWeight: bold ? 'bold' : 'normal',
                fontStyle: italic ? 'italic' : 'normal',
                textDecoration: [
                  strikethrough ? 'line-through' : '',
                  underline !== 'None' ? 'underline' : ''
                ].filter(Boolean).join(' ') || 'none',
                color: color,
                position: 'relative',
                verticalAlign: superscript ? 'super' : subscript ? 'sub' : 'baseline'
              }}
            >
              AaBbCc
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            This is a TrueType font
          </div>
        </div>
      </div>
    </div>
  );
};

export default FontTab;
