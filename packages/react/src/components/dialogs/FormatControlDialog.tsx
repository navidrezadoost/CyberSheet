import React, { useEffect, useState } from 'react';
import type { DrawingLayer, FormControlObject } from '@cyber-sheet/core';
import {
  draftFromFormControl,
  type FormControlDialogDraft,
  type FormControlPositioning,
  type FormControlValueState,
} from '../../utils/formatControlApply';
import { getOptionButtonGroup, getOptionButtonIndexInGroup } from '../../utils/optionButtonGroup';

export type FormatControlTab = 'control' | 'size' | 'protection' | 'properties' | 'altText';

export interface FormatControlDialogProps {
  isOpen: boolean;
  control: FormControlObject;
  drawingLayer: DrawingLayer;
  defaultSize: { width: number; height: number };
  pickedCellLink?: string | null;
  onClose: () => void;
  onApply: (draft: FormControlDialogDraft) => void;
  onPickCellLink: () => void;
}

const TAB_LABELS: Record<FormatControlTab, string> = {
  control: 'Control',
  size: 'Size',
  protection: 'Protection',
  properties: 'Properties',
  altText: 'Alt Text',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 12,
  color: '#444',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #ccc',
  borderRadius: 3,
  fontSize: 13,
  boxSizing: 'border-box',
};

const fieldRow: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: 12,
};

export const FormatControlDialog: React.FC<FormatControlDialogProps> = ({
  isOpen,
  control,
  drawingLayer,
  defaultSize,
  pickedCellLink,
  onClose,
  onApply,
  onPickCellLink,
}) => {
  const [activeTab, setActiveTab] = useState<FormatControlTab>('control');
  const [draft, setDraft] = useState<FormControlDialogDraft>(() =>
    draftFromFormControl(control, defaultSize),
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab('control');
      const next = draftFromFormControl(control, defaultSize);
      if (control.controlType === 'optionButton' && control.controlProperties.checked) {
        next.optionIndex = getOptionButtonIndexInGroup(control, drawingLayer);
        next.value = 'checked';
      }
      setDraft(next);
    }
  }, [isOpen, control, defaultSize, drawingLayer]);

  useEffect(() => {
    if (pickedCellLink != null) {
      setDraft((prev) => ({ ...prev, cellLink: pickedCellLink }));
    }
  }, [pickedCellLink]);

  if (!isOpen) return null;

  const isCheckbox = control.controlType === 'checkbox';
  const isOptionButton = control.controlType === 'optionButton';
  const optionGroup = isOptionButton ? getOptionButtonGroup(control, drawingLayer) : [];
  const canUseMixed = isCheckbox && !draft.cellLink.trim();

  const patch = (updates: Partial<FormControlDialogDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleResetSize = () => {
    patch({ width: defaultSize.width, height: defaultSize.height });
  };

  const handleOk = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10020,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480,
          minHeight: 400,
          backgroundColor: '#fff',
          borderRadius: 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: 13,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="format-control-title"
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 id="format-control-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            Format Control
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#666' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f8f8' }}>
          {(Object.keys(TAB_LABELS) as FormatControlTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: activeTab === tab ? '#fff' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid #0078d4' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? '#0078d4' : '#333',
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: 16, overflowY: 'auto', minHeight: 240 }}>
          {activeTab === 'control' && (
            <div>
              {(isCheckbox || isOptionButton) && (
                <fieldset style={{ border: '1px solid #ddd', borderRadius: 4, padding: 12, margin: '0 0 12px' }}>
                  <legend style={{ padding: '0 6px', fontSize: 12 }}>Value</legend>
                  {isCheckbox && (
                    <>
                      {(['unchecked', 'checked', 'mixed'] as FormControlValueState[]).map((state) => (
                        <label key={state} style={{ display: 'block', marginBottom: 6 }}>
                          <input
                            type="radio"
                            name="fc-value"
                            checked={draft.value === state}
                            disabled={state === 'mixed' && !canUseMixed}
                            onChange={() => patch({ value: state })}
                            style={{ marginRight: 8 }}
                          />
                          {state === 'unchecked' ? 'Unchecked' : state === 'checked' ? 'Checked' : 'Mixed'}
                        </label>
                      ))}
                    </>
                  )}
                  {isOptionButton && (
                    <>
                      {optionGroup.map((btn, idx) => (
                        <label key={btn.id} style={{ display: 'block', marginBottom: 6 }}>
                          <input
                            type="radio"
                            name="fc-option"
                            checked={draft.optionIndex === idx + 1}
                            onChange={() => patch({ value: 'checked', optionIndex: idx + 1 })}
                            style={{ marginRight: 8 }}
                          />
                          {btn.controlProperties.label ?? `Option ${idx + 1}`}
                        </label>
                      ))}
                      {optionGroup.length === 0 && (
                        <label style={{ display: 'block', marginBottom: 6 }}>
                          <input
                            type="radio"
                            name="fc-option"
                            checked={draft.value === 'checked'}
                            onChange={() => patch({ value: 'checked', optionIndex: 1 })}
                            style={{ marginRight: 8 }}
                          />
                          Checked
                        </label>
                      )}
                    </>
                  )}
                </fieldset>
              )}

              <div style={fieldRow}>
                <label style={labelStyle}>Cell link:</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={draft.cellLink}
                    onChange={(e) => patch({ cellLink: e.target.value })}
                    placeholder="$A$1"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={onPickCellLink}
                    title="Select cell on sheet"
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ccc',
                      background: '#f5f5f5',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                  >
                    📎
                  </button>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.threeDShading}
                  onChange={(e) => patch({ threeDShading: e.target.checked })}
                />
                3-D shading
              </label>
            </div>
          )}

          {activeTab === 'size' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldRow}>
                  <label style={labelStyle}>Height</label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(draft.height)}
                    onChange={(e) => {
                      const height = Math.max(1, Number(e.target.value) || 1);
                      if (draft.lockAspectRatio && defaultSize.height > 0) {
                        const ratio = defaultSize.width / defaultSize.height;
                        patch({ height, width: Math.round(height * ratio) });
                      } else {
                        patch({ height });
                      }
                    }}
                    style={inputStyle}
                  />
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>Width</label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(draft.width)}
                    onChange={(e) => {
                      const width = Math.max(1, Number(e.target.value) || 1);
                      if (draft.lockAspectRatio && defaultSize.width > 0) {
                        const ratio = defaultSize.height / defaultSize.width;
                        patch({ width, height: Math.round(width * ratio) });
                      } else {
                        patch({ width });
                      }
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={draft.lockAspectRatio}
                  onChange={(e) => patch({ lockAspectRatio: e.target.checked })}
                />
                Lock aspect ratio
              </label>
              <button
                type="button"
                onClick={handleResetSize}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          )}

          {activeTab === 'protection' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={draft.locked}
                  onChange={(e) => patch({ locked: e.target.checked })}
                />
                Locked
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.lockText}
                  onChange={(e) => patch({ lockText: e.target.checked })}
                />
                Lock text
              </label>
            </div>
          )}

          {activeTab === 'properties' && (
            <div>
              <div style={{ marginBottom: 12 }}>
                {(
                  [
                    ['moveAndSize', 'Move and size with cells'],
                    ['moveNoSize', 'Move but don\'t size with cells'],
                    ['none', 'Don\'t move or size with cells'],
                  ] as [FormControlPositioning, string][]
                ).map(([value, label]) => (
                  <label key={value} style={{ display: 'block', marginBottom: 8 }}>
                    <input
                      type="radio"
                      name="fc-positioning"
                      checked={draft.positioning === value}
                      onChange={() => patch({ positioning: value })}
                      style={{ marginRight: 8 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={draft.printObject}
                  onChange={(e) => patch({ printObject: e.target.checked })}
                />
                Print object
              </label>
            </div>
          )}

          {activeTab === 'altText' && (
            <div>
              <div style={fieldRow}>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={draft.altTitle}
                  onChange={(e) => patch({ altTitle: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={draft.altDescription}
                  onChange={(e) => patch({ altDescription: e.target.value })}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 20px',
              border: '1px solid #ccc',
              background: '#fff',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOk}
            style={{
              padding: '6px 20px',
              border: '1px solid #0078d4',
              background: '#0078d4',
              color: '#fff',
              borderRadius: 3,
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
