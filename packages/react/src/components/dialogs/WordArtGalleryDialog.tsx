import React from 'react';
import { WORD_ART_PRESETS } from '../../utils/wordArtFactory';

type WordArtGalleryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
};

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
  width: 560,
  maxWidth: '92vw',
  background: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  padding: 16,
  fontFamily: 'Segoe UI, Arial, sans-serif',
};

function previewStyle(presetId: string): React.CSSProperties {
  const preset = WORD_ART_PRESETS.find((p) => p.id === presetId) ?? WORD_ART_PRESETS[0];
  const style = preset.style;
  const base: React.CSSProperties = {
    fontSize: preset.previewFontSize,
    fontWeight: 700,
    fontFamily: 'Calibri, Segoe UI, sans-serif',
    lineHeight: 1.1,
  };

  if (style.outlineColor && style.outlineWidth) {
    return {
      ...base,
      color: 'transparent',
      WebkitTextStroke: `${style.outlineWidth}px ${style.outlineColor}`,
    };
  }

  if (style.shadow) {
    return {
      ...base,
      color: style.gradientFrom,
      textShadow: '2px 2px 4px rgba(0,0,0,0.35)',
    };
  }

  return {
    ...base,
    background: `linear-gradient(180deg, ${style.gradientFrom}, ${style.gradientTo})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}

export const WordArtGalleryDialog: React.FC<WordArtGalleryDialogProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={dialogStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>WordArt Styles</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
          Choose a style, then click on the sheet to place WordArt.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {WORD_ART_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 72,
                padding: 10,
                border: '1px solid #d0d0d0',
                borderRadius: 6,
                background: '#fafafa',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0078d4';
                e.currentTarget.style.background = '#f0f7ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d0d0d0';
                e.currentTarget.style.background = '#fafafa';
              }}
            >
              <span style={previewStyle(preset.id)}>Aa</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
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
        </div>
      </div>
    </div>
  );
};
