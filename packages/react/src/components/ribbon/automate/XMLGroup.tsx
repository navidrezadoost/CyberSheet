/**
 * XMLGroup.tsx
 *
 * XML Group - XML data import/export and mapping
 * Features: Source, Import, Export, Expansion Packs, XML Maps
 */

import React from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface XMLGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

export const XMLGroup: React.FC<XMLGroupProps> = ({ workbook, onCommand }) => {
  const handleXMLSource = () => {
    console.log('Open XML Source');
    onCommand?.({ type: 'openXMLSource' });
    alert('XML Source: Feature coming soon!\n\nView and manage XML schemas and mappings in your workbook.');
  };

  const handleImportXML = () => {
    console.log('Import XML');
    onCommand?.({ type: 'importXML' });
    alert('Import XML: Feature coming soon!\n\nImport XML data into your workbook using an XML schema.');
  };

  const handleExportXML = () => {
    console.log('Export XML');
    onCommand?.({ type: 'exportXML' });
    alert('Export XML: Feature coming soon!\n\nExport worksheet data as XML using a defined schema.');
  };

  const handleExpansionPacks = () => {
    console.log('Open Expansion Packs');
    onCommand?.({ type: 'openExpansionPacks' });
    alert('Expansion Packs: Feature coming soon!\n\nManage additional data type expansion packs for enhanced data functionality.');
  };

  return (
    <div className="ribbon-tab-shell ribbon-tab-shell-center">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* XML Source */}
        <button
          onClick={handleXMLSource}
          title="XML Source"
          style={{
            width: 110,
            height: 24,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            gap: 6,
            fontSize: 11,
            fontFamily: 'Segoe UI, sans-serif',
            color: '#333',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h3l3 6-3 6H2l3-6-3-6zM11 2h3l-3 6 3 6h-3l-3-6 3-6z" />
          </svg>
          <span>Source</span>
        </button>

        {/* Import/Export row */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleImportXML}
            title="Import XML"
            style={{
              width: 53,
              height: 20,
              border: 'none',
              background: '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
          >
            Import
          </button>

          <button
            onClick={handleExportXML}
            title="Export XML"
            style={{
              width: 53,
              height: 20,
              border: 'none',
              background: '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
          >
            Export
          </button>
        </div>

        {/* Expansion Packs */}
        <button
          onClick={handleExpansionPacks}
          title="Expansion Packs"
          style={{
            width: 110,
            height: 20,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            gap: 6,
            fontSize: 10,
            fontFamily: 'Segoe UI, sans-serif',
            color: '#333',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2L3 5v6l5 3 5-3V5l-5-3zM8 8L3 5M8 8l5-3M8 8v6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ fontSize: 9 }}>Expansion Packs</span>
        </button>
      </div>

      <div className="ribbon-tab-shell-title">XML</div>
    </div>
  );
};
