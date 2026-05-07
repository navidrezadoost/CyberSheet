import * as React from 'react';
import { CellStyle, FormattingChanges } from './FormatCellsDialog';
import OrientationWidget from './OrientationWidget';

export interface AlignmentTabProps {
  currentFormatting: CellStyle;
  onChange: (changes: FormattingChanges['alignment']) => void;
}

const HORIZONTAL_OPTIONS = [
  'General', 'Left', 'Center', 'Right', 'Fill',
  'Justify', 'Center Across Selection', 'Distributed'
];

const VERTICAL_OPTIONS = [
  'Top', 'Center', 'Bottom', 'Justify', 'Distributed'
];

const TEXT_DIRECTION_OPTIONS = [
  'Context', 'Left-to-Right', 'Right-to-Left'
];

const AlignmentTab: React.FC<AlignmentTabProps> = ({
  currentFormatting,
  onChange
}) => {
  const [horizontal, setHorizontal] = React.useState(
    currentFormatting.horizontalAlign || 'General'
  );
  const [vertical, setVertical] = React.useState(
    currentFormatting.verticalAlign || 'Bottom'
  );
  const [indent, setIndent] = React.useState(
    currentFormatting.indent || 0
  );
  const [rotation, setRotation] = React.useState(
    currentFormatting.textRotation || 0
  );
  const [wrapText, setWrapText] = React.useState(
    currentFormatting.wrapText || false
  );
  const [shrinkToFit, setShrinkToFit] = React.useState(
    currentFormatting.shrinkToFit || false
  );
  const [mergeCells, setMergeCells] = React.useState(
    currentFormatting.mergeCells || false
  );
  const [textDirection, setTextDirection] = React.useState(
    currentFormatting.textDirection || 'Context'
  );
  
  // Notify parent of changes (debounced)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onChange({
        horizontal,
        vertical,
        indent,
        rotation,
        wrapText,
        shrinkToFit,
        mergeCells,
        textDirection
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [horizontal, vertical, indent, rotation, wrapText, shrinkToFit, mergeCells, textDirection, onChange]);
  
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
          Text alignment
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Horizontal Alignment */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Horizontal:
            </label>
            <select
              value={horizontal}
              onChange={(e: any) => setHorizontal(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              {HORIZONTAL_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          {/* Indent */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Indent:
            </label>
            <input
              type="number"
              value={indent}
              onChange={(e: any) => setIndent(Number(e.target.value))}
              min="0"
              max="15"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Vertical Alignment */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Vertical:
            </label>
            <select
              value={vertical}
              onChange={(e: any) => setVertical(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              {VERTICAL_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          {/* Orientation Widget */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Orientation:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
              <OrientationWidget
                degrees={rotation}
                onChange={setRotation}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '12px'
          }}
        >
          <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Text control
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={wrapText}
                onChange={(e: any) => setWrapText(e.target.checked)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              Wrap text
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={shrinkToFit}
                onChange={(e: any) => setShrinkToFit(e.target.checked)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              Shrink to fit
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={mergeCells}
                onChange={(e: any) => setMergeCells(e.target.checked)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              Merge cells
            </label>
          </div>
        </div>
      </div>
      
      <div>
        <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
          Right-to-left
        </h4>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Text direction:
          </label>
          <select
            value={textDirection}
            onChange={(e: any) => setTextDirection(e.target.value)}
            style={{
              width: '200px',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            {TEXT_DIRECTION_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AlignmentTab;
