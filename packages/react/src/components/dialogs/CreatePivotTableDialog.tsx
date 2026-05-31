import React, { useEffect, useMemo, useState } from 'react';
import type { Address, Range, Worksheet } from '@cyber-sheet/core';
import {
  defaultPivotTarget,
  formatAddressA1,
  formatRangeA1,
  normalizeRange,
  resolvePivotSourceRange,
} from '../../utils/insertPivotTable';

export interface CreatePivotTableDialogProps {
  isOpen: boolean;
  worksheet: Worksheet;
  selection: Range | null;
  onClose: () => void;
  onCreate: (sourceRange: Range, target: Address) => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.35)',
  zIndex: 10012,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 460,
  maxWidth: '95vw',
  background: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: 13,
  color: '#222',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #e0e0e0',
  fontWeight: 600,
  fontSize: 14,
};

const bodyStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 4,
};

const readoutStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#fafafa',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '6px 18px',
  border: '1px solid #0078d4',
  background: '#0078d4',
  color: '#fff',
  borderRadius: 3,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '6px 18px',
  border: '1px solid #d0d0d0',
  background: '#fff',
  borderRadius: 3,
  cursor: 'pointer',
};

export const CreatePivotTableDialog: React.FC<CreatePivotTableDialogProps> = ({
  isOpen,
  worksheet,
  selection,
  onClose,
  onCreate,
}) => {
  const sourceRange = useMemo(
    () => resolvePivotSourceRange(worksheet, selection),
    [worksheet, selection, isOpen],
  );

  const [target, setTarget] = useState<Address>(() =>
    sourceRange ? defaultPivotTarget(sourceRange) : { row: 1, col: 1 },
  );

  useEffect(() => {
    if (sourceRange) {
      setTarget(defaultPivotTarget(sourceRange));
    }
  }, [sourceRange, isOpen]);

  if (!isOpen) return null;

  const canCreate = Boolean(sourceRange);

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={dialogStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={headerStyle}>Create PivotTable</div>
        <div style={bodyStyle}>
          <div>
            <div style={labelStyle}>Choose the data that you want to analyze</div>
            <div style={readoutStyle}>
              {sourceRange ? formatRangeA1(sourceRange) : 'No data range available'}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Choose where you want the PivotTable report to be placed</div>
            <div style={readoutStyle}>
              {sourceRange
                ? `Existing worksheet starting at ${formatAddressA1(target)}`
                : 'Select a data range first'}
            </div>
          </div>
          {!canCreate && (
            <div style={{ color: '#a4262c' }}>
              Select a table with headers and at least one data row, then try again.
            </div>
          )}
        </div>
        <div style={footerStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={{
              ...primaryButtonStyle,
              opacity: canCreate ? 1 : 0.6,
              cursor: canCreate ? 'pointer' : 'not-allowed',
            }}
            disabled={!canCreate}
            onClick={() => {
              if (!sourceRange) return;
              onCreate(normalizeRange(sourceRange), target);
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
