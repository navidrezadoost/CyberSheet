import { SortFilterGroupIcon5, SortFilterGroupIcon4, SortFilterGroupIcon3, SortFilterGroupIcon2, SortFilterGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useCallback } from 'react';
import type { Workbook, Address, Range } from '@cyber-sheet/core';
import {
  normalizeRange,
  resolveSortRange,
} from '../../../utils/sortFilterCommands';
import { CustomSortDialog } from '../../dialogs/CustomSortDialog';

interface SortFilterGroupProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const SortFilterGroup: React.FC<SortFilterGroupProps> = ({ workbook, selectedCells, onCommand }) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);

  const sheet = workbook.activeSheet;
  const filterActive = Boolean(sheet?.getAutoFilterRange());

  const getSelectionRange = useCallback((): Range | null => {
    if (selectedCells.length === 0) return null;
    return normalizeRange({
      start: selectedCells[0],
      end: selectedCells[selectedCells.length - 1],
    });
  }, [selectedCells]);

  const handleSortAscending = useCallback(() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return;

    const sortRange = resolveSortRange(sheet, selection);
    onCommand?.({
      type: 'sort',
      range: sortRange,
      sortBy: [{ columnIndex: selection.start.col, ascending: true }],
      hasHeaders: sortRange.end.row > sortRange.start.row,
    });
  }, [sheet, getSelectionRange, onCommand]);

  const handleSortDescending = useCallback(() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return;

    const sortRange = resolveSortRange(sheet, selection);
    onCommand?.({
      type: 'sort',
      range: sortRange,
      sortBy: [{ columnIndex: selection.start.col, ascending: false }],
      hasHeaders: sortRange.end.row > sortRange.start.row,
    });
  }, [sheet, getSelectionRange, onCommand]);

  const handleCustomSort = useCallback(() => {
    setShowSortDialog(true);
  }, []);

  const handleToggleFilter = useCallback(() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return;

    onCommand?.({
      type: 'toggleAutoFilter',
      range: selection,
      enabled: !filterActive,
    });
  }, [sheet, getSelectionRange, filterActive, onCommand]);

  const handleClearFilter = useCallback(() => {
    onCommand?.({ type: 'clearFilter' });
  }, [onCommand]);

  const handleReapplyFilter = useCallback(() => {
    onCommand?.({ type: 'reapplyFilter' });
  }, [onCommand]);

  const customSortRange = (() => {
    const selection = getSelectionRange();
    if (!sheet || !selection) return null;
    return resolveSortRange(sheet, selection);
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px' }}>
      {/* Group Label */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
        {/* Sort Ascending Button */}
        <button
          onClick={handleSortAscending}
          title="Sort A to Z (Ascending)"
          style={{
            width: 32,
            height: 32,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <SortFilterGroupIcon1 />
        </button>

        {/* Sort Descending Button */}
        <button
          onClick={handleSortDescending}
          title="Sort Z to A (Descending)"
          style={{
            width: 32,
            height: 32,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <SortFilterGroupIcon2 />
        </button>

        {/* Custom Sort Button */}
        <button
          onClick={handleCustomSort}
          title="Custom Sort..."
          style={{
            width: 32,
            height: 32,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <SortFilterGroupIcon3 />
        </button>
      </div>

      {/* Filter Button with Dropdown */}
      <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
        <div style={{ position: 'relative', width: 68, height: 24 }}>
          <button
            onClick={handleToggleFilter}
            title="Toggle Filter"
            style={{
              width: '100%',
              height: '100%',
              border: `1px solid ${filterActive ? '#0078D4' : '#D9D9D9'}`,
              background: filterActive ? '#D3E3FD' : '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 11,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
              paddingRight: 16,
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!filterActive) e.currentTarget.style.background = '#E0E0E0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!filterActive) e.currentTarget.style.background = '#F0F0F0';
            }}
          >
            <SortFilterGroupIcon4 />
            <span>Filter</span>
          </button>

          {/* Dropdown Arrow */}
          <button
            type="button"
            aria-label="Filter options"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 16,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
            }}
          >
            <SortFilterGroupIcon5 />
          </button>
        </div>

        {/* Filter Dropdown Menu */}
        {showFilterDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 2,
              background: '#FFFFFF',
              border: '1px solid #D9D9D9',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: 160,
            }}
          >
            <button
              onClick={() => {
                handleClearFilter();
                setShowFilterDropdown(false);
              }}
              style={{
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'Segoe UI, sans-serif',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
            >
              Clear Filter
            </button>
            <button
              onClick={() => {
                handleReapplyFilter();
                setShowFilterDropdown(false);
              }}
              style={{
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'Segoe UI, sans-serif',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
            >
              Reapply Filter
            </button>
            <div style={{ height: 1, background: '#E0E0E0', margin: '4px 0' }} />
            <button
              style={{
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'Segoe UI, sans-serif',
                color: '#888',
              }}
            >
              Filter by Color...
            </button>
            <button
              style={{
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'Segoe UI, sans-serif',
                color: '#888',
              }}
            >
              Text Filters ▶
            </button>
            <button
              style={{
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'Segoe UI, sans-serif',
                color: '#888',
              }}
            >
              Number Filters ▶
            </button>
          </div>
        )}
      </div>

      {/* Group Label */}
      <div style={{ fontSize: 10, color: '#666', marginTop: 2, fontFamily: 'Segoe UI, sans-serif' }}>
        Sort & Filter
      </div>

      {/* Custom Sort Dialog */}
      {showSortDialog && customSortRange && (
        <CustomSortDialog
          sortRange={customSortRange}
          onClose={() => setShowSortDialog(false)}
          onSort={(levels, hasHeaders) => {
            if (!sheet) return;
            const sortLevels = levels.map((level) => ({
              columnIndex: customSortRange.start.col + level.columnIndex,
              ascending: level.ascending,
            }));
            onCommand?.({
              type: 'sort',
              range: customSortRange,
              sortBy: sortLevels,
              hasHeaders,
            });
            setShowSortDialog(false);
          }}
        />
      )}
    </div>
  );
};
