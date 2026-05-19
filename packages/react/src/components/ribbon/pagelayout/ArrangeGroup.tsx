/**
 * ArrangeGroup.tsx
 *
 * Arrange Group for Page Layout Tab
 * Provides tools for arranging shapes, pictures, and other objects
 * Groups: Bring Forward/Send Backward, Selection Pane, Align, Group, Rotate
 */

import React, { useState } from 'react';

export interface ArrangeGroupProps {
  onBringForward?: (step: 'front' | 'forward') => void;
  onSendBackward?: (step: 'back' | 'backward') => void;
  onSelectionPane?: () => void;
  onAlign?: (alignment: string) => void;
  onGroup?: (action: 'group' | 'ungroup' | 'regroup') => void;
  onRotate?: (rotation: string) => void;
}

export const ArrangeGroup: React.FC<ArrangeGroupProps> = ({
  onBringForward,
  onSendBackward,
  onSelectionPane,
  onAlign,
  onGroup,
  onRotate,
}) => {
  const [showBringForwardMenu, setShowBringForwardMenu] = useState(false);
  const [showSendBackwardMenu, setShowSendBackwardMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showRotateMenu, setShowRotateMenu] = useState(false);

  return (
    <div className="ribbon-tab-shell">
      <div style={{ display: 'flex', gap: 4 }}>
        {/* Bring Forward/Send Backward */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowBringForwardMenu(!showBringForwardMenu)}
              title="Bring Forward"
              style={{
                width: 80,
                height: 20,
                border: 'none',
                background: '#F0F0F0',
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
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 10h12v4H2v-4zM4 2h8v6H4V2z" opacity="0.6" />
                <path d="M4 2h8v6H4V2z" />
              </svg>
              <span>Bring Forward</span>
            </button>

            {showBringForwardMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 2,
                background: '#FFFFFF',
                border: '1px solid #D9D9D9',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: 150,
              }}>
                <button
                  onClick={() => {
                    onBringForward?.('front');
                    setShowBringForwardMenu(false);
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
                  Bring to Front
                </button>
                <button
                  onClick={() => {
                    onBringForward?.('forward');
                    setShowBringForwardMenu(false);
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
                  Bring Forward
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSendBackwardMenu(!showSendBackwardMenu)}
              title="Send Backward"
              style={{
                width: 80,
                height: 20,
                border: 'none',
                background: '#F0F0F0',
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
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2h8v6H4V2z" opacity="0.6" />
                <path d="M2 10h12v4H2v-4z" />
              </svg>
              <span>Send Backward</span>
            </button>

            {showSendBackwardMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 2,
                background: '#FFFFFF',
                border: '1px solid #D9D9D9',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: 150,
              }}>
                <button
                  onClick={() => {
                    onSendBackward?.('back');
                    setShowSendBackwardMenu(false);
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
                  Send to Back
                </button>
                <button
                  onClick={() => {
                    onSendBackward?.('backward');
                    setShowSendBackwardMenu(false);
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
                  Send Backward
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selection Pane, Align, Group, Rotate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Row 1: Selection Pane, Align */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => onSelectionPane?.()}
              title="Selection Pane"
              style={{
                width: 52,
                height: 20,
                border: 'none',
                background: '#F0F0F0',
                cursor: 'pointer',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontFamily: 'Segoe UI, sans-serif',
                color: '#333',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
            >
              Selection
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAlignMenu(!showAlignMenu)}
                title="Align"
                style={{
                  width: 40,
                  height: 20,
                  border: 'none',
                  background: '#F0F0F0',
                  cursor: 'pointer',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontFamily: 'Segoe UI, sans-serif',
                  color: '#333',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
              >
                Align
              </button>

              {showAlignMenu && (
                <div style={{
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
                }}>
                  {['Align Left', 'Align Center', 'Align Right', 'Align Top', 'Align Middle', 'Align Bottom', 'Distribute Horizontally', 'Distribute Vertically'].map((align) => (
                    <button
                      key={align}
                      onClick={() => {
                        onAlign?.(align);
                        setShowAlignMenu(false);
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
                      {align}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Group, Rotate */}
          <div style={{ display: 'flex', gap: 2 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                title="Group"
                style={{
                  width: 52,
                  height: 20,
                  border: 'none',
                  background: '#F0F0F0',
                  cursor: 'pointer',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontFamily: 'Segoe UI, sans-serif',
                  color: '#333',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
              >
                Group
              </button>

              {showGroupMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 2,
                  background: '#FFFFFF',
                  border: '1px solid #D9D9D9',
                  borderRadius: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: 120,
                }}>
                  {['Group', 'Ungroup', 'Regroup'].map((action) => (
                    <button
                      key={action}
                      onClick={() => {
                        onGroup?.(action.toLowerCase() as 'group' | 'ungroup' | 'regroup');
                        setShowGroupMenu(false);
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
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowRotateMenu(!showRotateMenu)}
                title="Rotate"
                style={{
                  width: 40,
                  height: 20,
                  border: 'none',
                  background: '#F0F0F0',
                  cursor: 'pointer',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontFamily: 'Segoe UI, sans-serif',
                  color: '#333',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
              >
                Rotate
              </button>

              {showRotateMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 2,
                  background: '#FFFFFF',
                  border: '1px solid #D9D9D9',
                  borderRadius: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: 140,
                }}>
                  {['Rotate Right 90°', 'Rotate Left 90°', 'Flip Vertical', 'Flip Horizontal'].map((rotation) => (
                    <button
                      key={rotation}
                      onClick={() => {
                        onRotate?.(rotation);
                        setShowRotateMenu(false);
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
                      {rotation}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ribbon-tab-shell-title">Arrange</div>
    </div>
  );
};
