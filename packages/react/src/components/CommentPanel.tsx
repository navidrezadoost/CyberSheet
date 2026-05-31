import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Address, Workbook } from '@cyber-sheet/core';
import {
  collectCommentThreads,
  getAuthorInitials,
  type CommentThreadSummary,
} from '../utils/commentPanelUtils';

export interface CommentPanelProps {
  isOpen: boolean;
  workbook: Workbook;
  activeSheetName: string;
  defaultAuthor?: string;
  onClose: () => void;
  onNavigate: (sheetName: string, address: Address) => void;
  onNewComment: () => void;
}

function AuthorAvatar({
  author,
  avatarUrl,
  size = 32,
}: {
  author: string;
  avatarUrl?: string;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={author}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#0f6cbd',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.34,
        fontWeight: 600,
        flexShrink: 0,
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      {getAuthorInitials(author)}
    </div>
  );
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  isOpen,
  workbook,
  activeSheetName,
  defaultAuthor = 'You',
  onClose,
  onNavigate,
  onNewComment,
}) => {
  const [sheetFilter, setSheetFilter] = useState<string | 'all'>('all');
  const [revision, setRevision] = useState(0);
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const sheetNames = useMemo(() => workbook.getSheetNames(), [workbook, revision]);

  const threads = useMemo(
    () => collectCommentThreads(workbook, sheetFilter),
    [workbook, sheetFilter, revision],
  );

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (isOpen) {
      setSheetFilter(activeSheetName);
    }
  }, [isOpen, activeSheetName]);

  useEffect(() => {
    if (!isOpen) return;

    const eventBus = workbook.eventBus;
    const unsubs = [
      eventBus.on('comment-add', refresh),
      eventBus.on('comment-edit', refresh),
      eventBus.on('comment-delete', refresh),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [isOpen, workbook, refresh]);

  const handleReply = useCallback((thread: CommentThreadSummary) => {
    const text = (replyDrafts[thread.id] ?? '').trim();
    if (!text) return;

    const sheet = workbook.getSheet(thread.sheetName);
    if (!sheet) return;

    sheet.addComment(thread.address, {
      text,
      author: defaultAuthor,
      parentId: thread.root.id,
    });

    setReplyDrafts((drafts) => ({ ...drafts, [thread.id]: '' }));
    setExpandedThreadId(null);
    refresh();
  }, [workbook, defaultAuthor, replyDrafts, refresh]);

  const handleResolveThread = useCallback((thread: CommentThreadSummary, resolved: boolean) => {
    const sheet = workbook.getSheet(thread.sheetName);
    if (!sheet) return;
    sheet.updateComment(thread.address, thread.root.id, { resolved });
    refresh();
  }, [workbook, refresh]);

  const handleResolveAll = useCallback(() => {
    for (const thread of threads) {
      if (!thread.resolved) {
        const sheet = workbook.getSheet(thread.sheetName);
        sheet?.updateComment(thread.address, thread.root.id, { resolved: true });
      }
    }
    refresh();
  }, [workbook, threads, refresh]);

  if (!isOpen) return null;

  return (
    <aside
      style={{
        width: 360,
        minWidth: 360,
        borderLeft: '1px solid #d0d0d0',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600 }}>Comments</div>
        <button
          type="button"
          onClick={onClose}
          title="Close Comments"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            color: '#605e5c',
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee' }}>
        <label style={{ fontSize: 12, color: '#605e5c', display: 'block', marginBottom: 4 }}>
          Filter by sheet
        </label>
        <select
          value={sheetFilter}
          onChange={(event) => setSheetFilter(event.target.value as string | 'all')}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #c7c7c7',
            borderRadius: 4,
            fontSize: 13,
            background: '#fff',
          }}
        >
          <option value="all">All sheets</option>
          {sheetNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {threads.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 13 }}>
            No comments yet.
          </div>
        ) : (
          threads.map((thread) => {
            const isExpanded = expandedThreadId === thread.id;
            return (
              <div
                key={thread.id}
                style={{
                  border: '1px solid #e4e4e4',
                  borderRadius: 6,
                  marginBottom: 8,
                  background: thread.resolved ? '#f8f8f8' : '#fff',
                  opacity: thread.resolved ? 0.85 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => onNavigate(thread.sheetName, thread.address)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AuthorAvatar
                      author={thread.latestAuthor}
                      avatarUrl={thread.root.authorAvatar}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#323130' }}>
                          {thread.latestAuthor}
                        </span>
                        {thread.resolved && (
                          <span style={{ fontSize: 11, color: '#107c10' }}>Resolved</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#0f6cbd', marginTop: 2 }}>
                        {thread.locationLabel}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#323130',
                          marginTop: 6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {thread.latestText}
                      </div>
                      {thread.replyCount > 0 && (
                        <div style={{ fontSize: 11, color: '#605e5c', marginTop: 6 }}>
                          {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                <div
                  style={{
                    borderTop: '1px solid #eee',
                    padding: '8px 12px',
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedThreadId(isExpanded ? null : thread.id)}
                    style={actionButtonStyle}
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveThread(thread, !thread.resolved)}
                    style={actionButtonStyle}
                  >
                    {thread.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 12px 12px' }}>
                    {thread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginTop: 10,
                          paddingLeft: 8,
                          borderLeft: '2px solid #edebe9',
                        }}
                      >
                        <AuthorAvatar author={reply.author} avatarUrl={reply.authorAvatar} size={24} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{reply.author}</div>
                          <div style={{ fontSize: 12, color: '#323130', marginTop: 2 }}>{reply.text}</div>
                        </div>
                      </div>
                    ))}
                    <textarea
                      value={replyDrafts[thread.id] ?? ''}
                      onChange={(event) =>
                        setReplyDrafts((drafts) => ({ ...drafts, [thread.id]: event.target.value }))
                      }
                      rows={3}
                      placeholder="Write a reply..."
                      style={{
                        width: '100%',
                        marginTop: 10,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        border: '1px solid #c7c7c7',
                        borderRadius: 4,
                        padding: 8,
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button type="button" onClick={() => setExpandedThreadId(null)} style={actionButtonStyle}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReply(thread)}
                        style={{ ...actionButtonStyle, background: '#0f6cbd', color: '#fff', borderColor: '#0f6cbd' }}
                      >
                        Post Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: 8,
        }}
      >
        <button type="button" onClick={onNewComment} style={{ ...actionButtonStyle, flex: 1 }}>
          New Comment
        </button>
        <button
          type="button"
          onClick={handleResolveAll}
          disabled={threads.every((thread) => thread.resolved)}
          style={{
            ...actionButtonStyle,
            flex: 1,
            opacity: threads.every((thread) => thread.resolved) ? 0.5 : 1,
          }}
        >
          Resolve All
        </button>
      </div>
    </aside>
  );
};

const actionButtonStyle: React.CSSProperties = {
  border: '1px solid #c7c7c7',
  background: '#fff',
  borderRadius: 4,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Segoe UI, Arial, sans-serif',
};
