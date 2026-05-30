// src/components/backstage/panels/SharePanel.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { FileOperations, Permission } from '@cyber-sheet/core';
import { SmilodonNativeSelect } from '../../SmilodonNativeSelect';

export interface SharePanelProps {
  fileOperations: FileOperations;
  workbookName: string;
}

interface InviteEntry {
  email: string;
  role: 'edit' | 'view';
  isValid: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUGGESTED_CONTACTS = [
  { name: 'Alice Johnson', email: 'alice@company.com', avatar: '👩‍💼' },
  { name: 'Bob Smith', email: 'bob@company.com', avatar: '👨‍💻' },
  { name: 'Carol Davis', email: 'carol@company.com', avatar: '👩‍🔬' },
  { name: 'David Wilson', email: 'david@company.com', avatar: '👨‍🏫' },
];

export const SharePanel: React.FC<SharePanelProps> = ({
  fileOperations,
  workbookName,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'edit' | 'view'>('edit');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<InviteEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Share link state
  const [shareLink, setShareLink] = useState<string | null>(fileOperations.getShareLink());
  const [linkPermission, setLinkPermission] = useState<'edit' | 'view'>('edit');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showLinkOptions, setShowLinkOptions] = useState(false);
  
  // Permissions
  const [permissions, setPermissions] = useState<Permission[]>(fileOperations.getPermissions());
  
  const emailInputRef = useRef(null as HTMLInputElement | null);
  const copyTimerRef = useRef(null as NodeJS.Timeout | null);

  // Focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Validate email on change
  const handleEmailChange = useCallback((value: string) => {
    setInviteEmail(value);
    if (value.trim() && !EMAIL_REGEX.test(value.trim())) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  }, []);

  // Add person to pending invites
  const handleAddPerson = useCallback(() => {
    const email = inviteEmail.trim();
    if (!email) return;
    
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    
    // Check for duplicates
    if (pendingInvites.some(inv => inv.email === email)) {
      setEmailError('This person has already been added.');
      return;
    }
    
    setPendingInvites([...pendingInvites, { email, role: inviteRole, isValid: true }]);
    setInviteEmail('');
    setEmailError(null);
    setInviteMessage('');
    setShowMessageInput(false);
    emailInputRef.current?.focus();
  }, [inviteEmail, inviteRole, pendingInvites]);

  // Handle Enter key for adding
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inviteEmail.trim() && !emailError) {
      e.preventDefault();
      handleAddPerson();
    }
    if (e.key === 'Backspace' && !inviteEmail && pendingInvites.length > 0) {
      setPendingInvites(pendingInvites.slice(0, -1));
    }
  }, [inviteEmail, emailError, handleAddPerson, pendingInvites]);

  // Remove pending invite
  const handleRemovePending = useCallback((email: string) => {
    setPendingInvites(pendingInvites.filter((inv: InviteEntry) => inv.email !== email));
  }, [pendingInvites]);

  // Send invites
  const handleSendInvites = useCallback(async () => {
    if (pendingInvites.length === 0) return;
    
    setIsSending(true);
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    pendingInvites.forEach(inv => {
      fileOperations.addPermission(inv.email, inv.role);
    });
    
    setPermissions(fileOperations.getPermissions());
    setPendingInvites([]);
    setIsSending(false);
    setSendSuccess(true);
    
    setTimeout(() => setSendSuccess(false), 3000);
  }, [pendingInvites, fileOperations]);

  // Suggestion click
  const handleSuggestionClick = useCallback((email: string) => {
    setInviteEmail(email);
    setEmailError(null);
    emailInputRef.current?.focus();
  }, []);

  // Share link operations
  const handleCreateLink = useCallback(() => {
    const link = fileOperations.createShareLink(linkPermission);
    setShareLink(link);
  }, [linkPermission, fileOperations]);

  const handleRemoveLink = useCallback(() => {
    fileOperations.removeShareLink();
    setShareLink(null);
    setShowLinkOptions(false);
  }, [fileOperations]);

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      // Fallback: select text
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    
    setIsLinkCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setIsLinkCopied(false), 2500);
  }, [shareLink]);

  const handleChangePermission = useCallback((userId: string, newRole: 'edit' | 'view') => {
    fileOperations.addPermission(userId, newRole); // Update existing
    setPermissions(fileOperations.getPermissions());
  }, [fileOperations]);

  const handleRemovePerson = useCallback((userId: string) => {
    fileOperations.removePermission(userId);
    setPermissions(fileOperations.getPermissions());
  }, [fileOperations]);

  const handleRoleChangeForPending = useCallback((email: string, newRole: 'edit' | 'view') => {
    setPendingInvites(pendingInvites.map((inv: InviteEntry) => 
      inv.email === email ? { ...inv, role: newRole } : inv
    ));
  }, [pendingInvites]);

  // ─── Styles ──────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    padding: '32px 48px',
    maxWidth: 600,
    animation: 'fadeIn 200ms ease-out',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    color: '#1F1F1F',
    marginBottom: 8,
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#666666',
    marginBottom: 28,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#333333',
    marginBottom: 10,
  };

  // Invite input area
  const inviteInputContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    padding: '8px 10px',
    border: '1px solid #D1D1D1',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    minHeight: 42,
    alignItems: 'center',
    cursor: 'text',
    transition: 'border-color 150ms',
  };

  const pendingChipStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    fontSize: 13,
    color: '#0078D4',
    fontWeight: 500,
  };

  const removeChipStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    color: '#0078D4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };

  const emailInputStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    flex: 1,
    minWidth: 180,
    fontSize: 14,
    padding: '4px',
  };

  const roleSelectStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: 13,
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    marginLeft: 8,
  };

  const addPersonButtonStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#0078D4',
    backgroundColor: 'transparent',
    border: '1px solid #C7E0F4',
    borderRadius: 4,
    cursor: inviteEmail.trim() && !emailError ? 'pointer' : 'default',
    opacity: inviteEmail.trim() && !emailError ? 1 : 0.5,
    transition: 'all 150ms',
  };

  // Suggestions
  const suggestionsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap' as const,
  };

  const suggestionChipStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 12,
    color: '#555555',
    backgroundColor: '#F5F5F5',
    border: '1px solid #E0E0E0',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 150ms',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  };

  // Message input
  const messageInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    resize: 'none' as const,
    height: 60,
    marginTop: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  // Share button
  const shareButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: pendingInvites.length === 0 || isSending ? '#A0C4E8' : '#0078D4',
    border: 'none',
    borderRadius: 4,
    cursor: pendingInvites.length === 0 || isSending ? 'default' : 'pointer',
    transition: 'all 200ms',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const spinnerStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 600ms linear infinite',
  };

  // Link section
  const linkBoxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    border: '1px solid #E8E8E8',
  };

  const linkTextStyle: React.CSSProperties = {
    flex: 1,
    fontSize: 13,
    color: '#0078D4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    userSelect: 'all' as const,
  };

  const copyButtonStyle: React.CSSProperties = {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: isLinkCopied ? '#107C10' : '#0078D4',
    backgroundColor: 'transparent',
    border: `1px solid ${isLinkCopied ? '#A3D9A5' : '#C7E0F4'}`,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 200ms',
    whiteSpace: 'nowrap' as const,
  };

  // Permissions list
  const permissionRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 6,
    transition: 'background-color 100ms',
  };

  const avatarStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#E8E8E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  };

  const permissionNameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: '#1F1F1F',
    flex: 1,
  };

  const successToastStyle: React.CSSProperties = {
    padding: '10px 16px',
    backgroundColor: '#E8F5E9',
    color: '#107C10',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
    animation: 'slideDown 200ms ease-out',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Share</h1>
      <p style={subheadingStyle}>
        Share <strong>{workbookName}</strong> with others.
      </p>

      {/* Success toast */}
      {sendSuccess && (
        <div style={successToastStyle}>
          ✓ Invitations sent successfully!
        </div>
      )}

      {/* Invite section */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Invite People</div>
        
        <div 
          style={inviteInputContainerStyle}
          onClick={() => emailInputRef.current?.focus()}
        >
          {/* Pending chips */}
          {pendingInvites.map((inv: InviteEntry) => (
            <span key={inv.email} style={pendingChipStyle}>
              {inv.email}
              <button
                style={removeChipStyle}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleRemovePending(inv.email);
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(0,120,212,0.1)'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-label={`Remove ${inv.email}`}
              >
                ×
              </button>
            </span>
          ))}
          
          <input
            ref={emailInputRef}
            type="email"
            value={inviteEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEmailChange(e.target.value)}
            onKeyDown={handleKeyDown}
            style={emailInputStyle}
            placeholder={pendingInvites.length === 0 ? 'Enter names or email addresses...' : 'Add another...'}
            aria-label="Email address"
            autoComplete="email"
          />
          
          {inviteEmail.trim() && (
            <>
              <SmilodonNativeSelect
                value={inviteRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value as 'edit' | 'view')}
                style={roleSelectStyle}
                onClick={(e: React.MouseEvent<HTMLSelectElement>) => e.stopPropagation()}
              >
                <option value="edit">Can edit</option>
                <option value="view">Can view</option>
              </SmilodonNativeSelect>
              <button
                style={addPersonButtonStyle}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleAddPerson();
                }}
                disabled={!inviteEmail.trim() || !!emailError}
              >
                Add
              </button>
            </>
          )}
        </div>
        
        {emailError && (
          <div style={{ color: '#D13438', fontSize: 12, marginTop: 6 }}>
            {emailError}
          </div>
        )}

        {/* Message toggle */}
        {pendingInvites.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#0078D4',
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => setShowMessageInput(!showMessageInput)}
            >
              {showMessageInput ? '−' : '+'} Include a message
            </button>
            {showMessageInput && (
              <textarea
                style={messageInputStyle}
                value={inviteMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInviteMessage(e.target.value)}
                placeholder="Add a message to your invitation..."
              />
            )}
          </div>
        )}

        {/* Suggestions */}
        {!inviteEmail && pendingInvites.length === 0 && (
          <div style={suggestionsContainerStyle}>
            <span style={{ fontSize: 12, color: '#999999', padding: '6px 0' }}>
              Suggested:
            </span>
            {SUGGESTED_CONTACTS.map(contact => (
              <button
                key={contact.email}
                style={suggestionChipStyle}
                onClick={() => handleSuggestionClick(contact.email)}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#E8E8E8';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                }}
              >
                <span>{contact.avatar}</span>
                {contact.name}
              </button>
            ))}
          </div>
        )}

        {/* Share button */}
        {pendingInvites.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button
              style={shareButtonStyle}
              onClick={handleSendInvites}
              disabled={pendingInvites.length === 0 || isSending}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (pendingInvites.length > 0 && !isSending) {
                  e.currentTarget.style.backgroundColor = '#106EBE';
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (pendingInvites.length > 0 && !isSending) {
                  e.currentTarget.style.backgroundColor = '#0078D4';
                }
              }}
            >
              {isSending && <div style={spinnerStyle} />}
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>

      {/* Share Link section */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Share Link</div>
        
        {shareLink ? (
          <div>
            <div style={linkBoxStyle}>
              <span style={linkTextStyle}>{shareLink}</span>
              <button
                style={copyButtonStyle}
                onClick={handleCopyLink}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#F0F0F0';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isLinkCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#666666' }}>
                Anyone with this link can {linkPermission === 'edit' ? 'edit' : 'view'}.
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#D13438', fontSize: 12, cursor: 'pointer', padding: 0 }}
                onClick={handleRemoveLink}
              >
                Remove link
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              Create a shareable link to this workbook.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <SmilodonNativeSelect
                value={linkPermission}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLinkPermission(e.target.value as 'edit' | 'view')}
                style={roleSelectStyle}
              >
                <option value="edit">Anyone can edit</option>
                <option value="view">Anyone can view</option>
              </SmilodonNativeSelect>
              <button
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#0078D4',
                  backgroundColor: 'transparent',
                  border: '1px solid #0078D4',
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onClick={handleCreateLink}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#F0F7FF';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Create Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Current Permissions */}
      {permissions.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>
            Currently Sharing With ({permissions.length})
          </div>
          
          {permissions.map((perm: Permission) => (
            <div
              key={perm.userId}
              style={permissionRowStyle}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={avatarStyle}>
                {perm.userAvatar || perm.userName.charAt(0).toUpperCase()}
              </div>
              <div style={permissionNameStyle}>
                <div>{perm.userName}</div>
                {perm.type === 'link' && (
                  <div style={{ fontSize: 11, color: '#888888' }}>Link access</div>
                )}
              </div>
              {perm.role !== 'owner' ? (
                <>
                  <SmilodonNativeSelect
                    value={perm.role}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChangePermission(perm.userId, e.target.value as 'edit' | 'view')}
                    style={{ ...roleSelectStyle, fontSize: 12 }}
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">Can view</option>
                  </SmilodonNativeSelect>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D13438',
                      fontSize: 18,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                    onClick={() => handleRemovePerson(perm.userId)}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#FDECEA'}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
                    aria-label={`Remove ${perm.userName}`}
                  >
                    ×
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: '#888888', fontWeight: 600 }}>
                  Owner
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
