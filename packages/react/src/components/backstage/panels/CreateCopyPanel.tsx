/**
 * CreateCopyPanel.tsx
 * 
 * Panel for creating a duplicate of the current workbook
 * 
 * Features:
 * - Default name with " (2)" suffix like Excel
 * - Real-time validation (invalid characters, empty name)
 * - Location picker (OneDrive, This PC, SharePoint)
 * - Progress state with spinner
 * - Success feedback with green checkmark
 * - Auto-close after successful copy
 * 
 * Phase 6: File Backstage Menu — Panel 2/10
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { FileOperations } from '@cyber-sheet/core';
import { exportXLSX } from '@cyber-sheet/io-xlsx';

export interface CreateCopyPanelProps {
  fileOperations: FileOperations;
  currentFileName: string;
  currentLocation: string;
  workbook?: any; // Workbook instance
  onClose: () => void;
}

const INVALID_CHARS = /[\\/:*?"<>|]/;
const INVALID_CHARS_MESSAGE = 'The file name contains invalid characters: \\ / : * ? " < > |';

export const CreateCopyPanel: React.FC<CreateCopyPanelProps> = ({
  fileOperations,
  currentFileName,
  currentLocation,
  workbook,
  onClose,
}) => {
  // Remove extension for editing
  const baseName = currentFileName.replace(/\.[^.]+$/, '');
  const extension = currentFileName.match(/\.[^.]+$/)?.[0] || '.xlsx';
  
  // Default: append " (2)" like Excel
  const defaultCopyName = `${baseName} (2)`;
  
  const [copyName, setCopyName] = useState(defaultCopyName);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Focus input on mount and select all text
  useEffect(() => {
    if (inputRef.current) {
      (inputRef.current as HTMLInputElement).focus();
      (inputRef.current as HTMLInputElement).select();
    }
  }, []);

  // Validate function
  const validate = useCallback((name: string): string | null => {
    if (!name.trim()) {
      return 'File name cannot be empty.';
    }
    if (INVALID_CHARS.test(name)) {
      return INVALID_CHARS_MESSAGE;
    }
    if (name.length > 255) {
      return 'File name is too long. Maximum 255 characters.';
    }
    return null;
  }, []);

  // Debounced validation as user types
  const handleNameChange = useCallback((e: any) => {
    const newName = e.target.value;
    setCopyName(newName);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      const validationError = validate(newName);
      setError(validationError);
      
      if (validationError) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }
    }, 300);
  }, [validate]);

  // Handle create copy
  const handleCreateCopy = useCallback(async () => {
    const validationError = validate(copyName);
    if (validationError) {
      setError(validationError);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      if (!workbook) {
        throw new Error('No workbook available to copy');
      }

      // Export workbook as XLSX
      const arrayBuffer = await exportXLSX(workbook);
      const blob = new Blob([arrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
        
      // Trigger download with new name
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = copyName + extension;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError('Failed to create copy. Please try again.');
      console.error('Copy error:', err);
    } finally {
      setIsCreating(false);
    }
  }, [copyName, extension, fileOperations, validate, onClose]);

  // Enter key
  const handleKeyDown = useCallback((e: any) => {
    if (e.key === 'Enter' && !isCreating && !isSuccess) {
      handleCreateCopy();
    }
  }, [handleCreateCopy, isCreating, isSuccess]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Locations
  const locations = [
    { value: 'onedrive', label: 'OneDrive' },
    { value: 'local', label: 'This PC' },
    { value: 'sharepoint', label: 'SharePoint' },
  ];

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '40px 48px',
    maxWidth: 520,
    animation: 'fadeIn 200ms ease-out',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    color: '#1F1F1F',
    marginBottom: 8,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#666666',
    marginBottom: 32,
    lineHeight: 1.5,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#333333',
    marginBottom: 6,
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    border: error ? '1.5px solid #D13438' : '1px solid #D1D1D1',
    borderRadius: 4,
    overflow: 'hidden',
    transition: 'border-color 150ms',
    boxShadow: error ? '0 0 0 1px #D13438' : 'none',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    backgroundColor: isSuccess ? '#F1F8E9' : '#FFFFFF',
    transition: 'background-color 300ms',
  };

  const extensionStyle: React.CSSProperties = {
    padding: '10px 12px',
    backgroundColor: '#F5F5F5',
    color: '#666666',
    fontSize: 14,
    borderLeft: '1px solid #D1D1D1',
    userSelect: 'none',
  };

  const errorMessageStyle: React.CSSProperties = {
    color: '#D13438',
    fontSize: 12,
    marginTop: 6,
    minHeight: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    animation: isShaking ? 'shake 300ms ease-in-out' : 'none',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    marginTop: 6,
  };

  const buttonContainerStyle: React.CSSProperties = {
    marginTop: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: isSuccess ? '#107C10' : isCreating ? '#106EBE' : '#0078D4',
    border: 'none',
    borderRadius: 4,
    cursor: isCreating || isSuccess ? 'default' : 'pointer',
    opacity: isCreating ? 0.7 : 1,
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const cancelButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    color: '#333333',
    backgroundColor: 'transparent',
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background-color 150ms',
  };

  const spinnerStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 600ms linear infinite',
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Create a Copy</h1>
      <p style={descriptionStyle}>
        This will create a duplicate of the current workbook.
        The copy will be saved as a new file.
      </p>

      {/* File name input */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle} htmlFor="copy-file-name">
          File name
        </label>
        <div style={inputContainerStyle}>
          <input
            ref={inputRef}
            id="copy-file-name"
            type="text"
            value={copyName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            style={inputStyle}
            disabled={isCreating || isSuccess}
            aria-invalid={!!error}
            aria-describedby={error ? 'copy-name-error' : undefined}
            maxLength={255}
            autoComplete="off"
            spellCheck={false}
          />
          <span style={extensionStyle}>{extension}</span>
        </div>
        <div
          id="copy-name-error"
          style={errorMessageStyle}
          role="alert"
          aria-live="polite"
        >
          {error && (
            <>
              <span style={{ fontSize: 16 }}>⚠</span>
              {error}
            </>
          )}
        </div>
      </div>

      {/* Location picker */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle} htmlFor="copy-location">
          Location
        </label>
        <select
          id="copy-location"
          value={selectedLocation}
          onChange={(e: any) => setSelectedLocation(e.target.value)}
          style={selectStyle}
          disabled={isCreating || isSuccess}
        >
          {locations.map(loc => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action buttons */}
      <div style={buttonContainerStyle}>
        <button
          style={primaryButtonStyle}
          onClick={handleCreateCopy}
          disabled={isCreating || isSuccess}
          onMouseEnter={(e: any) => {
            if (!isCreating && !isSuccess) {
              e.currentTarget.style.backgroundColor = '#106EBE';
            }
          }}
          onMouseLeave={(e: any) => {
            if (!isCreating && !isSuccess) {
              e.currentTarget.style.backgroundColor = '#0078D4';
            }
          }}
        >
          {isCreating && <div style={spinnerStyle} />}
          {isSuccess ? '✓ Copy Created!' : isCreating ? 'Creating Copy...' : 'Create Copy'}
        </button>
        
        {!isSuccess && (
          <button
            style={cancelButtonStyle}
            onClick={onClose}
            disabled={isCreating}
            onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
            onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
