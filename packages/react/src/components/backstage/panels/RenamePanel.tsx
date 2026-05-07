/**
 * RenamePanel.tsx
 * 
 * Simple panel for renaming the current workbook
 * 
 * Features:
 * - File extension is separated and not editable
 * - Real-time validation (invalid characters: \ / ? * [ ] :)
 * - Disabled state until valid name entered
 * - Success feedback with green flash
 * 
 * Phase 6: File Backstage Menu — Panel 1/10
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { FileOperations } from '@cyber-sheet/core';

const INVALID_CHARS = /[\\/:*?"<>|]/;
const INVALID_CHAR_LIST = '\\ / : * ? " < > |';

export interface RenamePanelProps {
  fileOperations: FileOperations;
  currentName: string;
  onClose: () => void;
}

export const RenamePanel: React.FC<RenamePanelProps> = ({
  fileOperations,
  currentName,
  onClose,
}) => {
  // Split name and extension
  const lastDotIndex = currentName.lastIndexOf('.');
  const initialBaseName = lastDotIndex > 0 ? currentName.substring(0, lastDotIndex) : currentName;
  const extension = lastDotIndex > 0 ? currentName.substring(lastDotIndex) : '';

  const [baseName, setBaseName] = useState(initialBaseName);
  const [error, setError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Validate on every change (debounced 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!baseName.trim()) {
        setError('File name cannot be empty');
      } else if (INVALID_CHARS.test(baseName)) {
        setError(`File name cannot contain: ${INVALID_CHAR_LIST}`);
      } else if (baseName.length > 255) {
        setError('File name is too long (max 255 characters)');
      } else {
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [baseName]);

  const handleRename = useCallback(async () => {
    if (error || !baseName.trim()) return;

    setIsRenaming(true);
    
    try {
      const newName = `${baseName}${extension}`;
      
      // Update metadata
      fileOperations.updateMetadata({ name: newName });
      
      // Show success feedback
      setShowSuccess(true);
      
      // Close after brief delay to show success state
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError('Failed to rename file. Please try again.');
      setIsRenaming(false);
    }
  }, [baseName, extension, error, fileOperations, onClose]);

  const handleKeyDown = useCallback((e: any) => {
    if (e.key === 'Enter' && !error && baseName.trim()) {
      handleRename();
    }
  }, [error, baseName, handleRename]);

  const panelStyle: React.CSSProperties = {
    padding: 40,
    maxWidth: 600,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    color: '#333',
    marginBottom: 24,
  };

  const currentNameBoxStyle: React.CSSProperties = {
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 24,
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
    display: 'block',
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    fontSize: 14,
    border: error ? '2px solid #D32F2F' : '2px solid #D0D0D0',
    borderRadius: 4,
    outline: 'none',
    transition: 'border-color 200ms',
    backgroundColor: showSuccess ? '#E8F5E9' : '#FFFFFF',
  };

  const extensionStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#666',
    fontWeight: 600,
  };

  const errorStyle: React.CSSProperties = {
    color: '#D32F2F',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    animation: error ? 'shake 300ms' : 'none',
  };

  const buttonStyle = (isPrimary: boolean, isDisabled: boolean): React.CSSProperties => ({
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 4,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    backgroundColor: isPrimary ? '#0078D4' : '#F0F0F0',
    color: isPrimary ? '#FFFFFF' : '#333',
    transition: 'all 150ms',
  });

  return (
    <div style={panelStyle}>
      <h1 style={titleStyle}>Rename</h1>

      <div style={currentNameBoxStyle}>
        <strong>Current name:</strong> {currentName}
      </div>

      <label style={labelStyle} htmlFor="rename-input">
        New name:
      </label>
      
      <div style={inputContainerStyle}>
        <input
          id="rename-input"
          type="text"
          value={baseName}
          onChange={(e: any) => setBaseName(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          disabled={isRenaming}
          autoFocus
          onFocus={(e: any) => e.target.select()}
        />
        <span style={extensionStyle}>{extension}</span>
      </div>

      {error && (
        <div style={errorStyle}>
          ⚠️ {error}
        </div>
      )}

      {showSuccess && !error && (
        <div style={{ color: '#2E7D32', fontSize: 13, marginBottom: 16 }}>
          ✓ File renamed successfully!
        </div>
      )}

      <button
        style={buttonStyle(true, !!error || !baseName.trim() || isRenaming)}
        onClick={handleRename}
        disabled={!!error || !baseName.trim() || isRenaming}
      >
        {isRenaming ? 'Renaming...' : 'Rename'}
      </button>

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
        `}
      </style>
    </div>
  );
};
