import React, { useEffect, useRef } from 'react';

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10005,
};

const dialogStyles: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: '6px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  width: 'min(420px, calc(100vw - 32px))',
  fontFamily: 'Segoe UI, Calibri, Arial, sans-serif',
  fontSize: '13px',
  color: '#333',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e0e0e0',
  fontWeight: 600,
  fontSize: '14px',
};

const bodyStyles: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '12px 16px',
  borderTop: '1px solid #e0e0e0',
};

const primaryButtonStyles: React.CSSProperties = {
  padding: '6px 20px',
  border: '1px solid #0078d4',
  background: '#0078d4',
  color: '#fff',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '13px',
};

const destructiveButtonStyles: React.CSSProperties = {
  ...primaryButtonStyles,
  border: '1px solid #d32f2f',
  background: '#d32f2f',
};

const secondaryButtonStyles: React.CSSProperties = {
  padding: '6px 20px',
  border: '1px solid #d0d0d0',
  background: '#fff',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '13px',
};

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '13px',
  boxSizing: 'border-box',
};

const DEFAULT_TITLE = 'Cybersheet';

type AlertDialogProps = {
  variant: 'alert';
  title?: string;
  message: string;
  onClose: () => void;
};

type ConfirmDialogProps = {
  variant: 'confirm';
  title?: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

type PromptDialogProps = {
  variant: 'prompt';
  title?: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export type CybersheetDialogProps = AlertDialogProps | ConfirmDialogProps | PromptDialogProps;

export const CybersheetDialog: React.FC<CybersheetDialogProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [promptValue, setPromptValue] = React.useState(
    props.variant === 'prompt' ? props.value : '',
  );

  useEffect(() => {
    if (props.variant !== 'prompt') return;
    setPromptValue(props.value);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [props.variant, props.variant === 'prompt' ? props.value : undefined]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (props.variant === 'alert') props.onClose();
      else props.onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props]);

  const title = props.title ?? DEFAULT_TITLE;

  const handlePromptSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (props.variant !== 'prompt') return;
    props.onConfirm(promptValue.trim());
  };

  return (
    <div
      className="cybersheet-dialog-backdrop"
      style={overlayStyles}
      onClick={() => {
        if (props.variant === 'alert') props.onClose();
        else props.onCancel();
      }}
    >
      <div
        className="cybersheet-dialog"
        style={dialogStyles}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cybersheet-dialog-title"
      >
        <div style={headerStyles}>
          <span id="cybersheet-dialog-title">{title}</span>
          <button
            type="button"
            onClick={() => (props.variant === 'alert' ? props.onClose() : props.onCancel())}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#666' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={bodyStyles}>
          {props.variant === 'prompt' ? (
            <form onSubmit={handlePromptSubmit}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                {props.label}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={promptValue}
                maxLength={props.maxLength}
                placeholder={props.placeholder}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePromptSubmit();
                  }
                }}
                style={inputStyles}
              />
            </form>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{props.message}</p>
          )}
        </div>

        <div style={footerStyles}>
          {props.variant === 'alert' && (
            <button type="button" style={primaryButtonStyles} onClick={props.onClose}>
              OK
            </button>
          )}

          {props.variant === 'confirm' && (
            <>
              <button type="button" style={secondaryButtonStyles} onClick={props.onCancel}>
                Cancel
              </button>
              <button
                type="button"
                style={props.destructive ? destructiveButtonStyles : primaryButtonStyles}
                onClick={props.onConfirm}
              >
                {props.confirmLabel ?? 'OK'}
              </button>
            </>
          )}

          {props.variant === 'prompt' && (
            <>
              <button type="button" style={secondaryButtonStyles} onClick={props.onCancel}>
                Cancel
              </button>
              <button
                type="button"
                style={primaryButtonStyles}
                onClick={() => handlePromptSubmit()}
                disabled={!promptValue.trim()}
              >
                {props.confirmLabel ?? 'OK'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
