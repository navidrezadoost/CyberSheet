import React, { useEffect, useState } from 'react';
import type { Range, Worksheet } from '@cyber-sheet/core';
import {
  formatRangeA1,
  inferHasHeaders,
  resolveTableDataRange,
} from '../../utils/conditionalFormattingRibbon';

export interface CreateTableDialogProps {
  isOpen: boolean;
  worksheet: Worksheet;
  selection: Range | null;
  styleName: string;
  onClose: () => void;
  onConfirm: (range: Range, hasHeaders: boolean) => void;
}

export const CreateTableDialog: React.FC<CreateTableDialogProps> = ({
  isOpen,
  worksheet,
  selection,
  styleName,
  onClose,
  onConfirm,
}) => {
  const resolvedRange = resolveTableDataRange(worksheet, selection);
  const [hasHeaders, setHasHeaders] = useState(true);

  useEffect(() => {
    if (resolvedRange) {
      setHasHeaders(inferHasHeaders(worksheet, resolvedRange));
    }
  }, [worksheet, resolvedRange, isOpen]);

  if (!isOpen || !resolvedRange) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.35)',
        zIndex: 10014,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: 420,
          background: '#fff',
          border: '1px solid #d0d0d0',
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: 13,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600, fontSize: 14 }}>
          Create Table
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: '#666', fontSize: 12 }}>Style: {styleName}</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Where is the data for your table?</div>
            <div style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, background: '#fafafa' }}>
              {formatRangeA1(resolvedRange)}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(event) => setHasHeaders(event.target.checked)}
            />
            My table has headers
          </label>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 18px', border: '1px solid #d0d0d0', background: '#fff', borderRadius: 3, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(resolvedRange, hasHeaders)}
            style={{ padding: '6px 18px', border: '1px solid #0078d4', background: '#0078d4', color: '#fff', borderRadius: 3, cursor: 'pointer' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
