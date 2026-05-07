import * as React from 'react';
import { CellStyle, FormattingChanges } from './FormatCellsDialog';

export interface ProtectionTabProps {
  currentFormatting: CellStyle;
  onChange: (changes: FormattingChanges['protection']) => void;
}

const ProtectionTab: React.FC<ProtectionTabProps> = ({
  currentFormatting,
  onChange
}) => {
  const [locked, setLocked] = React.useState(
    currentFormatting.locked !== null ? currentFormatting.locked : true
  );
  const [hidden, setHidden] = React.useState(
    currentFormatting.hidden !== null ? currentFormatting.hidden : false
  );
  
  // Initialize from current formatting
  React.useEffect(() => {
    setLocked(currentFormatting.locked !== null ? currentFormatting.locked : true);
    setHidden(currentFormatting.hidden !== null ? currentFormatting.hidden : false);
  }, [currentFormatting]);
  
  // Notify parent of changes
  React.useEffect(() => {
    onChange({ locked, hidden });
  }, [locked, hidden, onChange]);
  
  const handleLockedChange = (e: any) => {
    setLocked(e.target.checked);
  };
  
  const handleHiddenChange = (e: any) => {
    setHidden(e.target.checked);
  };
  
  // Check if we have mixed state
  const lockedMixed = currentFormatting.locked === null;
  const hiddenMixed = currentFormatting.hidden === null;
  
  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          <input
            type="checkbox"
            checked={locked}
            onChange={handleLockedChange}
            ref={(input: any) => {
              if (input && lockedMixed) {
                input.indeterminate = true;
              }
            }}
            style={{
              marginRight: '8px',
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontWeight: 500 }}>Locked</span>
        </label>
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          <input
            type="checkbox"
            checked={hidden}
            onChange={handleHiddenChange}
            ref={(input: any) => {
              if (input && hiddenMixed) {
                input.indeterminate = true;
              }
            }}
            style={{
              marginRight: '8px',
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontWeight: 500 }}>Hidden</span>
        </label>
      </div>
      
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#555'
        }}
      >
        Locking cells or hiding formulas has no effect until you protect the 
        worksheet (Review tab, Protect Sheet).
      </div>
    </div>
  );
};

export default ProtectionTab;
