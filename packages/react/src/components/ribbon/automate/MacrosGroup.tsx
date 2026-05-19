/**
 * MacrosGroup.tsx
 *
 * Macros Group - Macro recording and execution tools
 * Features: Visual Basic, Macros, Record Macro, Use Relative References, Macro Security
 */

import React, { useState } from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface MacrosGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

export const MacrosGroup: React.FC<MacrosGroupProps> = ({ workbook, onCommand }) => {
  const [recording, setRecording] = useState(false);
  const [useRelativeRefs, setUseRelativeRefs] = useState(false);

  const handleVisualBasic = () => {
    console.log('Open Visual Basic Editor');
    onCommand?.({ type: 'openVBEditor' });
    alert('Visual Basic Editor: Feature coming soon!\n\nThis will open the VBA development environment for creating and editing macros.');
  };

  const handleMacros = () => {
    console.log('Open Macros dialog');
    onCommand?.({ type: 'openMacrosDialog' });
    alert('Macros Dialog: Feature coming soon!\n\nView, run, edit, or delete macros in this workbook.');
  };

  const handleRecordMacro = () => {
    if (!recording) {
      console.log('Start recording macro');
      setRecording(true);
      onCommand?.({ type: 'startRecordingMacro', useRelativeReferences: useRelativeRefs });
      alert('Macro Recording Started!\n\nAll your actions will be recorded. Click "Stop Recording" when done.');
    } else {
      console.log('Stop recording macro');
      setRecording(false);
      onCommand?.({ type: 'stopRecordingMacro' });
      alert('Macro Recording Stopped!\n\nYour macro has been saved and can be run from the Macros dialog.');
    }
  };

  const handleToggleRelativeRefs = () => {
    const newValue = !useRelativeRefs;
    setUseRelativeRefs(newValue);
    console.log('Use Relative References:', newValue);
    onCommand?.({ type: 'setRelativeReferences', value: newValue });
  };

  const handleMacroSecurity = () => {
    console.log('Open Macro Security settings');
    onCommand?.({ type: 'openMacroSecurity' });
    alert('Macro Security: Feature coming soon!\n\nConfigure security settings for macros:\n• Disable all macros\n• Disable macros with notification\n• Disable macros except digitally signed\n• Enable all macros (not recommended)');
  };

  return (
    <div className="ribbon-tab-shell">
      <div style={{ display: 'flex', gap: 4 }}>
        {/* Visual Basic */}
        <button
          onClick={handleVisualBasic}
          title="Visual Basic (Alt+F11)"
          style={{
            width: 56,
            height: 64,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            fontSize: 10,
            fontFamily: 'Segoe UI, sans-serif',
            color: '#333',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
        >
          {/* Visual Basic Icon */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="2" fill="#107C10" />
            <text x="16" y="20" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle">VB</text>
          </svg>
          <span style={{ fontSize: 10, marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>Visual<br />Basic</span>
        </button>

        {/* Right column: Macros, Record, etc. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Macros button */}
          <button
            onClick={handleMacros}
            title="Macros (Alt+F8)"
            style={{
              width: 100,
              height: 20,
              border: 'none',
              background: '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 6,
              gap: 4,
              fontSize: 11,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
            </svg>
            <span>Macros</span>
          </button>

          {/* Record Macro button */}
          <button
            onClick={handleRecordMacro}
            title={recording ? 'Stop Recording' : 'Record Macro'}
            style={{
              width: 100,
              height: 20,
              border: 'none',
              background: recording ? '#DC3545' : '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 6,
              gap: 4,
              fontSize: 11,
              fontFamily: 'Segoe UI, sans-serif',
              color: recording ? 'white' : '#333',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = recording ? '#C82333' : '#E0E0E0'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = recording ? '#DC3545' : '#F0F0F0'}
          >
            {recording ? (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="4" y="4" width="8" height="8" />
                </svg>
                <span>Stop</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" />
                </svg>
                <span>Record</span>
              </>
            )}
          </button>

          {/* Use Relative References toggle */}
          <button
            onClick={handleToggleRelativeRefs}
            title="Use Relative References"
            style={{
              width: 100,
              height: 20,
              border: `1px solid ${useRelativeRefs ? '#0078D4' : '#D9D9D9'}`,
              background: useRelativeRefs ? '#D3E3FD' : '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 6,
              gap: 4,
              fontSize: 10,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!useRelativeRefs) e.currentTarget.style.background = '#E0E0E0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!useRelativeRefs) e.currentTarget.style.background = '#F0F0F0';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <span>Relative Refs</span>
          </button>
        </div>
      </div>

      {/* Security button below */}
      <button
        onClick={handleMacroSecurity}
        title="Macro Security"
        style={{
          width: '100%',
          height: 20,
          border: 'none',
          background: '#F0F0F0',
          cursor: 'pointer',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontSize: 11,
          fontFamily: 'Segoe UI, sans-serif',
          color: '#333',
          marginTop: 2,
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1L3 3v4c0 3.5 2 6 5 7 3-1 5-3.5 5-7V3l-5-2z" />
        </svg>
        <span>Macro Security</span>
      </button>

      <div className="ribbon-tab-shell-title">Code</div>
    </div>
  );
};
