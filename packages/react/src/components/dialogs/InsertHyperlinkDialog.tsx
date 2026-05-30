import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Address, CellHyperlink } from '@cyber-sheet/core';
import {
  buildHyperlinkFromDialog,
  parseHyperlinkForDialog,
  type HyperlinkDialogFields,
  type HyperlinkDialogKind,
} from '../../utils/hyperlinkNavigation';
import { getRecentHyperlinkEmails, getRecentHyperlinkUrls } from '../../utils/hyperlinkRecent';
import { registerHyperlinkPickedFile, resolveHyperlinkFileName } from '../../utils/hyperlinkFiles';

export interface InsertHyperlinkDialogResult {
  hyperlink: CellHyperlink;
  displayText: string;
  editNewDocumentNow?: boolean;
}

interface InsertHyperlinkDialogProps {
  isOpen: boolean;
  cellLabel: string;
  cellAddress: Address;
  initialDisplayText: string;
  existingHyperlink?: CellHyperlink | null;
  sheetNames: string[];
  definedNames?: string[];
  activeSheetName: string;
  onClose: () => void;
  onSave: (result: InsertHyperlinkDialogResult) => void;
  onRemove: () => void;
}

const FONT = 'Segoe UI, Arial, sans-serif';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.35)',
  zIndex: 10011,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 520,
  height: 360,
  maxWidth: '95vw',
  maxHeight: '90vh',
  background: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: 2,
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  fontFamily: FONT,
  fontSize: 11,
  color: '#222',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  borderBottom: '1px solid #e0e0e0',
  fontSize: 12,
  fontWeight: 600,
  flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '168px 1fr',
  gap: 12,
  padding: '12px 14px',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  marginBottom: 3,
  color: '#444',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '4px 6px',
  border: '1px solid #ababab',
  borderRadius: 0,
  fontSize: 11,
  fontFamily: FONT,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  padding: '10px 14px',
  borderTop: '1px solid #e0e0e0',
  flexShrink: 0,
};

const buttonPrimary: React.CSSProperties = {
  padding: '4px 20px',
  border: '1px solid #0078d4',
  background: '#0078d4',
  color: '#fff',
  borderRadius: 0,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: FONT,
  minWidth: 75,
};

const buttonSecondary: React.CSSProperties = {
  padding: '4px 20px',
  border: '1px solid #ababab',
  background: '#f3f3f3',
  borderRadius: 0,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: FONT,
  minWidth: 75,
};

const linkTypeButton = (active: boolean): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '6px 8px',
  marginBottom: 2,
  border: active ? '1px solid #0078d4' : '1px solid #e0e0e0',
  background: active ? '#deecf9' : '#fff',
  borderRadius: 0,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: FONT,
  lineHeight: 1.3,
});

const panelBox: React.CSSProperties = {
  border: '1px solid #d0d0d0',
  padding: 10,
  height: '100%',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const LINK_TYPES: { id: HyperlinkDialogKind; label: string }[] = [
  { id: 'url', label: 'Existing File or Web Page' },
  { id: 'document', label: 'Place in This Document' },
  { id: 'newDocument', label: 'Create New Document' },
  { id: 'email', label: 'E-mail Address' },
];

const defaultFields = (activeSheetName: string): HyperlinkDialogFields => ({
  kind: 'url',
  address: 'https://',
  sheetName: activeSheetName,
  emailSubject: '',
  newDocumentName: 'Document.xlsx',
  newDocumentPath: '',
  editNewDocumentNow: false,
  tooltip: '',
});

const ScreenTipDialog: React.FC<{
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}> = ({ value, onClose, onSave }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div style={{ ...overlayStyle, zIndex: 10012 }} onMouseDown={onClose}>
      <div
        style={{ ...dialogStyle, width: 360, height: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="ScreenTip"
      >
        <div style={headerStyle}>ScreenTip</div>
        <div style={{ padding: 14 }}>
          <label style={labelStyle}>ScreenTip text:</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </div>
        <div style={footerStyle}>
          <button type="button" style={buttonPrimary} onClick={() => onSave(text)}>OK</button>
          <button type="button" style={buttonSecondary} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export const InsertHyperlinkDialog: React.FC<InsertHyperlinkDialogProps> = ({
  isOpen,
  cellLabel,
  initialDisplayText,
  existingHyperlink,
  sheetNames,
  definedNames = [],
  activeSheetName,
  onClose,
  onSave,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const parsedExisting = useMemo(() => {
    if (!existingHyperlink?.target) {
      return { ...defaultFields(activeSheetName), tooltip: '' };
    }
    const parsed = parseHyperlinkForDialog(
      existingHyperlink.target,
      activeSheetName,
      existingHyperlink.kind
    );
    return { ...parsed, tooltip: existingHyperlink.tooltip ?? '' };
  }, [existingHyperlink, activeSheetName]);

  const [kind, setKind] = useState<HyperlinkDialogKind>('url');
  const [displayText, setDisplayText] = useState('');
  const [fields, setFields] = useState<HyperlinkDialogFields>(defaultFields(activeSheetName));
  const [screenTipOpen, setScreenTipOpen] = useState(false);
  const [documentTreeSelection, setDocumentTreeSelection] = useState<'cell' | 'names' | string>('cell');

  const recentUrls = useMemo(() => getRecentHyperlinkUrls(), [isOpen]);
  const recentEmails = useMemo(() => getRecentHyperlinkEmails(), [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setKind(parsedExisting.kind);
    setDisplayText(initialDisplayText || '');
    setFields(parsedExisting);
    setDocumentTreeSelection('cell');
    setScreenTipOpen(false);
  }, [isOpen, parsedExisting, initialDisplayText]);

  if (!isOpen) return null;

  const updateField = <K extends keyof HyperlinkDialogFields>(key: K, value: HyperlinkDialogFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const activeFields = { ...fields, kind };
    const built = buildHyperlinkFromDialog(kind, activeFields);
    if (!built.target.trim()) return;

    const resolvedDisplay = displayText.trim()
      || resolveHyperlinkFileName(built.target)
      || built.target;
    onSave({
      displayText: resolvedDisplay,
      hyperlink: {
        target: built.target,
        tooltip: built.tooltip,
        kind: built.kind,
        subAddress: built.subAddress,
        emailSubject: built.emailSubject,
        newDocumentName: built.newDocumentName,
        newDocumentPath: built.newDocumentPath,
      },
      editNewDocumentNow: kind === 'newDocument' ? fields.editNewDocumentNow : undefined,
    });
  };

  const renderUrlPanel = () => (
    <>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Address:</label>
        <input
          type="text"
          value={/^blob:/i.test(fields.address)
            ? (resolveHyperlinkFileName(fields.address) ?? fields.address)
            : fields.address}
          onChange={(e) => updateField('address', e.target.value)}
          style={inputStyle}
          title={/^blob:/i.test(fields.address) ? fields.address : undefined}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <button type="button" style={buttonSecondary} onClick={() => fileInputRef.current?.click()}>
          Browse…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const objectUrl = registerHyperlinkPickedFile(file);
              updateField('address', objectUrl);
              if (!displayText.trim()) setDisplayText(file.name);
            }
            e.target.value = '';
          }}
        />
      </div>
      {recentUrls.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ ...labelStyle, fontWeight: 600 }}>Recently Used:</div>
          <select
            style={{ ...inputStyle, height: 80 }}
            size={Math.min(4, recentUrls.length)}
            value=""
            onChange={(e) => {
              if (e.target.value) updateField('address', e.target.value);
            }}
          >
            <option value="" disabled>Select a recent link…</option>
            {recentUrls.map((url) => (
              <option key={url} value={url}>{url}</option>
            ))}
          </select>
        </div>
      )}
      {definedNames.length > 0 && (
        <div>
          <div style={{ ...labelStyle, fontWeight: 600 }}>Bookmark (Defined Name):</div>
          <select
            style={inputStyle}
            value=""
            onChange={(e) => {
              if (e.target.value) updateField('address', e.target.value);
            }}
          >
            <option value="" disabled>Select a defined name…</option>
            {definedNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  const renderDocumentPanel = () => (
    <>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Type the cell reference:</label>
        <input
          type="text"
          value={fields.address}
          onChange={(e) => updateField('address', e.target.value)}
          style={inputStyle}
          placeholder="A1"
        />
      </div>
      <div style={{ ...labelStyle, fontWeight: 600, marginBottom: 4 }}>Or select a place in this document:</div>
      <div style={{ border: '1px solid #ababab', height: 120, overflowY: 'auto', fontSize: 11 }}>
        <button
          type="button"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '4px 8px',
            border: 'none',
            background: documentTreeSelection === 'cell' ? '#deecf9' : 'transparent',
            cursor: 'pointer',
            fontFamily: FONT,
            fontSize: 11,
          }}
          onClick={() => setDocumentTreeSelection('cell')}
        >
          Cell Reference
        </button>
        {definedNames.length > 0 && (
          <>
            <div style={{ padding: '4px 8px', fontWeight: 600, color: '#666' }}>Defined Names</div>
            {definedNames.map((name) => (
              <button
                key={name}
                type="button"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '4px 8px 4px 20px',
                  border: 'none',
                  background: documentTreeSelection === name ? '#deecf9' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 11,
                }}
                onClick={() => {
                  setDocumentTreeSelection(name);
                  updateField('address', name);
                }}
              >
                {name}
              </button>
            ))}
          </>
        )}
        <div style={{ padding: '4px 8px', fontWeight: 600, color: '#666' }}>Sheet Names</div>
        {sheetNames.map((name) => (
          <button
            key={name}
            type="button"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '4px 8px 4px 20px',
              border: 'none',
              background: documentTreeSelection === name ? '#deecf9' : 'transparent',
              cursor: 'pointer',
              fontFamily: FONT,
              fontSize: 11,
            }}
            onClick={() => {
              setDocumentTreeSelection(name);
              updateField('sheetName', name);
              if (!/^[A-Z]+\d+$/i.test(fields.address)) {
                updateField('address', 'A1');
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </>
  );

  const renderNewDocumentPanel = () => (
    <>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Name of new document:</label>
        <input
          type="text"
          value={fields.newDocumentName}
          onChange={(e) => updateField('newDocumentName', e.target.value)}
          style={inputStyle}
          placeholder="Report.xlsx"
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Full path:</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={fields.newDocumentPath}
            onChange={(e) => updateField('newDocumentPath', e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="C:\\Documents"
          />
          <button type="button" style={buttonSecondary} onClick={() => folderInputRef.current?.click()}>
            Change…
          </button>
          <input
            ref={folderInputRef}
            type="file"
            style={{ display: 'none' }}
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
                const dir = path.includes('/') ? path.split('/').slice(0, -1).join('\\') : '';
                if (dir) updateField('newDocumentPath', dir);
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <fieldset style={{ border: '1px solid #d0d0d0', padding: '8px 10px', margin: 0 }}>
        <legend style={{ fontSize: 11, padding: '0 4px' }}>When to edit</legend>
        <label style={{ display: 'block', marginBottom: 6, cursor: 'pointer' }}>
          <input
            type="radio"
            name="editWhen"
            checked={!fields.editNewDocumentNow}
            onChange={() => updateField('editNewDocumentNow', false)}
            style={{ marginRight: 6 }}
          />
          Edit the new document later
        </label>
        <label style={{ display: 'block', cursor: 'pointer' }}>
          <input
            type="radio"
            name="editWhen"
            checked={fields.editNewDocumentNow}
            onChange={() => updateField('editNewDocumentNow', true)}
            style={{ marginRight: 6 }}
          />
          Edit the new document now
        </label>
      </fieldset>
    </>
  );

  const renderEmailPanel = () => (
    <>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>E-mail address:</label>
        <input
          type="text"
          value={fields.address}
          onChange={(e) => updateField('address', e.target.value)}
          style={inputStyle}
          placeholder="someone@example.com"
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Subject:</label>
        <input
          type="text"
          value={fields.emailSubject}
          onChange={(e) => updateField('emailSubject', e.target.value)}
          style={inputStyle}
        />
      </div>
      {recentEmails.length > 0 && (
        <div>
          <div style={{ ...labelStyle, fontWeight: 600 }}>Recently used e-mail addresses:</div>
          <select
            style={{ ...inputStyle, height: 72 }}
            size={Math.min(3, recentEmails.length)}
            value=""
            onChange={(e) => {
              if (e.target.value) updateField('address', e.target.value);
            }}
          >
            <option value="" disabled>Select…</option>
            {recentEmails.map((email) => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  const title = existingHyperlink?.target ? 'Edit Hyperlink' : 'Insert Hyperlink';

  return (
    <>
      <div style={overlayStyle} onMouseDown={onClose}>
        <div
          style={dialogStyle}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={headerStyle}>
            <span>{title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                style={{ ...buttonSecondary, minWidth: 'auto', padding: '3px 10px' }}
                onClick={() => setScreenTipOpen(true)}
              >
                ScreenTip…
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={bodyStyle}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Link to:</div>
              {LINK_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  style={linkTypeButton(kind === item.id)}
                  onClick={() => {
                    setKind(item.id);
                    updateField('kind', item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div style={panelBox}>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Text to display:</label>
                <input
                  type="text"
                  value={displayText}
                  onChange={(e) => setDisplayText(e.target.value)}
                  style={inputStyle}
                  placeholder={cellLabel}
                />
              </div>

              {kind === 'url' && renderUrlPanel()}
              {kind === 'document' && renderDocumentPanel()}
              {kind === 'newDocument' && renderNewDocumentPanel()}
              {kind === 'email' && renderEmailPanel()}
            </div>
          </div>

          <div style={{ ...footerStyle, justifyContent: 'space-between' }}>
            <div>
              {existingHyperlink?.target && (
                <button type="button" style={buttonSecondary} onClick={onRemove}>
                  Remove Link
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={buttonPrimary} onClick={handleSave}>OK</button>
              <button type="button" style={buttonSecondary} onClick={onClose}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {screenTipOpen && (
        <ScreenTipDialog
          value={fields.tooltip}
          onClose={() => setScreenTipOpen(false)}
          onSave={(value) => {
            updateField('tooltip', value);
            setScreenTipOpen(false);
          }}
        />
      )}
    </>
  );
};
