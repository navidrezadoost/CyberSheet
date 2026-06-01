import React, { useEffect, useState } from 'react';
import type { HeaderFooterSection, HeaderFooterSettings } from '@cyber-sheet/core';
import {
  cloneHeaderFooterSettings,
  HEADER_FOOTER_INSERT_CODES,
} from '@cyber-sheet/core';

type HeaderFooterDialogProps = {
  isOpen: boolean;
  settings: HeaderFooterSettings;
  onClose: () => void;
  onSave: (settings: HeaderFooterSettings) => void;
};

type ActiveBand = 'header' | 'footer';
type ActiveSection = keyof HeaderFooterSection;

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.35)',
  zIndex: 10010,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 520,
  maxWidth: '92vw',
  background: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  padding: 16,
  fontFamily: 'Segoe UI, Arial, sans-serif',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  border: '1px solid #c7c7c7',
  borderBottom: active ? '1px solid #fff' : '1px solid #c7c7c7',
  background: active ? '#fff' : '#f3f3f3',
  cursor: 'pointer',
  fontSize: 13,
  marginRight: 4,
  borderRadius: '4px 4px 0 0',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 13,
  border: '1px solid #c7c7c7',
  borderRadius: 4,
  padding: '6px 8px',
  boxSizing: 'border-box',
};

export const HeaderFooterDialog: React.FC<HeaderFooterDialogProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<HeaderFooterSettings>(() =>
    cloneHeaderFooterSettings(settings),
  );
  const [activeBand, setActiveBand] = useState<ActiveBand>('header');
  const [activeSection, setActiveSection] = useState<ActiveSection>('center');

  useEffect(() => {
    if (!isOpen) return;
    setDraft(cloneHeaderFooterSettings(settings));
    setActiveBand('header');
    setActiveSection('center');
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const updateSection = (band: ActiveBand, section: ActiveSection, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [band]: {
        ...prev[band],
        [section]: value,
      },
    }));
  };

  const insertCode = (code: string) => {
    const current = draft[activeBand][activeSection];
    updateSection(activeBand, activeSection, current + code);
  };

  const band = draft[activeBand];

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={dialogStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Header &amp; Footer
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
          Edit header and footer text for the active sheet. Use codes for page numbers and dates.
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #c7c7c7', marginBottom: 12 }}>
          <button type="button" style={tabStyle(activeBand === 'header')} onClick={() => setActiveBand('header')}>
            Header
          </button>
          <button type="button" style={tabStyle(activeBand === 'footer')} onClick={() => setActiveBand('footer')}>
            Footer
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {(['left', 'center', 'right'] as const).map((section) => (
            <label key={section} style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                {section}
              </span>
              <input
                style={{
                  ...inputStyle,
                  borderColor: activeSection === section ? '#0078d4' : '#c7c7c7',
                }}
                value={band[section]}
                onFocus={() => setActiveSection(section)}
                onChange={(e) => updateSection(activeBand, section, e.target.value)}
                placeholder={`${activeBand === 'header' ? 'Header' : 'Footer'} ${section}`}
              />
            </label>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Insert</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {HEADER_FOOTER_INSERT_CODES.map(({ label, code }) => (
              <button
                key={code}
                type="button"
                onClick={() => insertCode(code)}
                style={{
                  border: '1px solid #c7c7c7',
                  background: '#fafafa',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #c7c7c7',
              background: '#fff',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(cloneHeaderFooterSettings(draft))}
            style={{
              border: '1px solid #0078d4',
              background: '#0078d4',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
