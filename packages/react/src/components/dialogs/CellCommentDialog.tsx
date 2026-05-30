import React, { useEffect, useMemo, useState } from 'react';
import type { CellComment } from '@cyber-sheet/core';

type CellCommentDialogProps = {
  isOpen: boolean;
  cellLabel: string;
  existingComments: CellComment[];
  onClose: () => void;
  onSave: (text: string) => void;
  onDelete: () => void;
};

export const CellCommentDialog: React.FC<CellCommentDialogProps> = ({
  isOpen,
  cellLabel,
  existingComments,
  onClose,
  onSave,
  onDelete,
}) => {
  const latestComment = useMemo(
    () => (existingComments.length > 0 ? existingComments[existingComments.length - 1] : null),
    [existingComments]
  );
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setText(latestComment?.text ?? '');
  }, [isOpen, latestComment]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.35)',
        zIndex: 10010,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: 420,
          maxWidth: '90vw',
          background: '#fff',
          border: '1px solid #d0d0d0',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          padding: 16,
          fontFamily: 'Segoe UI, Arial, sans-serif',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          {latestComment ? `Edit Comment (${cellLabel})` : `New Comment (${cellLabel})`}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          {latestComment
            ? `Last by ${latestComment.author}`
            : 'Add a note for this cell'}
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Type your comment..."
          style={{
            width: '100%',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: 13,
            border: '1px solid #c7c7c7',
            borderRadius: 6,
            padding: 8,
            boxSizing: 'border-box',
          }}
        />

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onDelete}
            disabled={!latestComment}
            style={{
              border: '1px solid #c7c7c7',
              background: latestComment ? '#fff' : '#f5f5f5',
              color: latestComment ? '#b00020' : '#999',
              borderRadius: 6,
              padding: '6px 10px',
              cursor: latestComment ? 'pointer' : 'not-allowed',
            }}
          >
            Delete
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid #c7c7c7',
                background: '#fff',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(text)}
              style={{
                border: '1px solid #0f6cbd',
                background: '#0f6cbd',
                color: '#fff',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
