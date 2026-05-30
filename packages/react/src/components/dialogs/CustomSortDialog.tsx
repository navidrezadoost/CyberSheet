import React, { useState } from 'react';
import type { Range } from '@cyber-sheet/core';
import { RibbonSelect } from '../ribbon/RibbonSelect';

export interface CustomSortDialogProps {
  sortRange: Range;
  onClose: () => void;
  onSort: (levels: Array<{ columnIndex: number; ascending: boolean }>, hasHeaders: boolean) => void;
}

export function CustomSortDialog({ sortRange, onClose, onSort }: CustomSortDialogProps): JSX.Element {
  const columnCount = sortRange.end.col - sortRange.start.col + 1;
  const [sortLevels, setSortLevels] = useState<Array<{ columnIndex: number; ascending: boolean }>>([
    { columnIndex: 0, ascending: true },
  ]);
  const [hasHeaders, setHasHeaders] = useState(true);

  const columnOptions = Array.from({ length: columnCount }, (_, i) => ({
    value: i,
    label: `Column ${String.fromCharCode(65 + ((sortRange.start.col - 1 + i) % 26))}`,
  }));

  const addLevel = () => {
    setSortLevels([...sortLevels, { columnIndex: 0, ascending: true }]);
  };

  const removeLevel = (index: number) => {
    if (sortLevels.length === 1) return;
    setSortLevels(sortLevels.filter((_, i) => i !== index));
  };

  const updateLevel = (index: number, field: 'columnIndex' | 'ascending', value: number | boolean) => {
    const next = [...sortLevels];
    next[index] = { ...next[index], [field]: value };
    setSortLevels(next);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          width: 480,
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: 'Segoe UI, sans-serif',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Sort</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        <div style={{ padding: 16 }}>
          {sortLevels.map((level, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, minWidth: 60 }}>{index === 0 ? 'Sort by:' : 'Then by:'}</span>
              <RibbonSelect
                value={level.columnIndex}
                options={columnOptions}
                onChange={(next) => updateLevel(index, 'columnIndex', parseInt(next, 10))}
                width={160}
                ariaLabel={index === 0 ? 'Sort by column' : 'Then by column'}
              />
              <RibbonSelect
                value={level.ascending ? 'asc' : 'desc'}
                options={[
                  { value: 'asc', label: 'A to Z' },
                  { value: 'desc', label: 'Z to A' },
                ]}
                onChange={(next) => updateLevel(index, 'ascending', next === 'asc')}
                width={90}
                ariaLabel="Sort order"
              />
              {sortLevels.length > 1 && (
                <button type="button" onClick={() => removeLevel(index)} style={{ padding: '4px 8px', border: '1px solid #D9D9D9', background: '#F0F0F0', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>
                  Delete
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addLevel} style={{ padding: '6px 12px', border: '1px solid #D9D9D9', background: '#F0F0F0', borderRadius: 2, cursor: 'pointer', fontSize: 11, marginTop: 8 }}>
            + Add Level
          </button>

          <div style={{ marginTop: 16, padding: 12, background: '#F8F8F8', borderRadius: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <input type="checkbox" checked={hasHeaders} onChange={(e) => setHasHeaders(e.target.checked)} />
              My data has headers
            </label>
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 16px', border: '1px solid #D9D9D9', background: '#F0F0F0', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSort(sortLevels, hasHeaders)}
            style={{ padding: '6px 16px', border: '1px solid #0078D4', background: '#0078D4', color: '#FFFFFF', borderRadius: 2, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
