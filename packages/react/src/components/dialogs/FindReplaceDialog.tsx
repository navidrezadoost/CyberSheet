/**
 * FindReplaceDialog.tsx
 *
 * Find & Replace dialog component with tabs for Find and Replace operations.
 * Matches Excel's Find & Replace UI.
 *
 * Features:
 * - Find/Replace tabs
 * - Match case option
 * - Match entire cell option
 * - Wildcards support
 * - Search in values/formulas/comments
 * - Find Next/Previous navigation
 * - Replace/Replace All operations
 *
 * @module react/components/dialogs
 */

import * as React from 'react';
import { FindService, FindServiceOptions } from '@cyber-sheet/core/src/search/FindService';
import type { Address } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core/src/worksheet';

type FindReplaceTab = 'find' | 'replace';

export interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  worksheet: Worksheet;
  initialTab?: FindReplaceTab;
  onMatchSelected?: (address: Address) => void;
}

const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({
  isOpen,
  onClose,
  worksheet,
  initialTab = 'find',
  onMatchSelected,
}) => {
  const [activeTab, setActiveTab] = React.useState<FindReplaceTab>(initialTab);
  const [findQuery, setFindQuery] = React.useState('');
  const [replaceQuery, setReplaceQuery] = React.useState('');
  
  // Search options
  const [matchCase, setMatchCase] = React.useState(false);
  const [matchEntireCell, setMatchEntireCell] = React.useState(false);
  const [lookIn, setLookIn] = React.useState<'values' | 'formulas' | 'comments'>('values');
  const [searchBy, setSearchBy] = React.useState<'rows' | 'columns'>('rows');
  
  // Search state
  const [matchCount, setMatchCount] = React.useState(0);
  const [currentMatch, setCurrentMatch] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState('');
  
  const findServiceRef = React.useRef<FindService | null>(null);
  const findInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize FindService
  React.useEffect(() => {
    if (worksheet) {
      findServiceRef.current = new FindService(worksheet);
    }
  }, [worksheet]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusMessage('');
      // Focus the find input
      setTimeout(() => {
        if (activeTab === 'find' && findInputRef.current) {
          findInputRef.current.focus();
          findInputRef.current.select();
        } else if (activeTab === 'replace' && replaceInputRef.current) {
          replaceInputRef.current.focus();
          replaceInputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, initialTab, activeTab]);

  // Execute find operation
  const executeFind = React.useCallback(() => {
    if (!findServiceRef.current || !findQuery) {
      setStatusMessage('Please enter a search term');
      return;
    }

    const options: Partial<FindServiceOptions> = {
      lookIn,
      lookAt: matchEntireCell ? 'whole' : 'part',
      matchCase,
      searchOrder: searchBy,
    };

    const results = findServiceRef.current.findAll(findQuery, options);
    setMatchCount(results.length);
    
    if (results.length > 0) {
      setCurrentMatch(1);
      setStatusMessage(`Found ${results.length} match${results.length !== 1 ? 'es' : ''}`);
      
      // Select first match
      const firstMatch = results[0];
      if (onMatchSelected) {
        onMatchSelected(firstMatch.address);
      }
    } else {
      setCurrentMatch(0);
      setStatusMessage(`Cannot find "${findQuery}"`);
    }
  }, [findQuery, lookIn, matchEntireCell, matchCase, searchBy, onMatchSelected]);

  // Find next match
  const handleFindNext = React.useCallback(() => {
    if (!findServiceRef.current) return;

    const match = findServiceRef.current.findNext();
    if (match) {
      setCurrentMatch(findServiceRef.current.getCurrentIndex());
      if (onMatchSelected) {
        onMatchSelected(match.address);
      }
    }
  }, [onMatchSelected]);

  // Find previous match
  const handleFindPrevious = React.useCallback(() => {
    if (!findServiceRef.current) return;

    const match = findServiceRef.current.findPrevious();
    if (match) {
      setCurrentMatch(findServiceRef.current.getCurrentIndex());
      if (onMatchSelected) {
        onMatchSelected(match.address);
      }
    }
  }, [onMatchSelected]);

  // Replace current match
  const handleReplace = React.useCallback(() => {
    if (!findServiceRef.current || !replaceQuery === undefined) return;

    const success = findServiceRef.current.replaceCurrent(replaceQuery);
    if (success) {
      setMatchCount(findServiceRef.current.getMatchCount());
      setCurrentMatch(findServiceRef.current.getCurrentIndex());
      setStatusMessage('Replaced 1 occurrence');
      
      // Move to next match
      handleFindNext();
    }
  }, [replaceQuery, handleFindNext]);

  // Replace all matches
  const handleReplaceAll = React.useCallback(() => {
    if (!findServiceRef.current || !findQuery) return;

    const options: Partial<FindServiceOptions> = {
      lookIn,
      lookAt: matchEntireCell ? 'whole' : 'part',
      matchCase,
      searchOrder: searchBy,
    };

    const count = findServiceRef.current.replaceAllMatches(findQuery, replaceQuery, options);
    setMatchCount(0);
    setCurrentMatch(0);
    setStatusMessage(count > 0 ? `Replaced ${count} occurrence${count !== 1 ? 's' : ''}` : 'No matches found');
  }, [findQuery, replaceQuery, lookIn, matchEntireCell, matchCase, searchBy]);

  // Handle Enter key in find input
  const handleFindKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchCount === 0) {
        executeFind();
      } else {
        handleFindNext();
      }
    }
  };

  // Handle Enter key in replace input
  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleReplace();
    }
  };

  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="find-replace-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        zIndex: 10000,
      }}
    >
      <div
        className="find-replace-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '480px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Dialog Header with Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e0e0e0',
            padding: '0 16px',
          }}
        >
          <div style={{ display: 'flex', flex: 1 }}>
            <button
              onClick={() => setActiveTab('find')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === 'find' ? '2px solid #0078d4' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === 'find' ? 600 : 400,
                color: activeTab === 'find' ? '#0078d4' : '#333',
              }}
            >
              Find
            </button>
            <button
              onClick={() => setActiveTab('replace')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === 'replace' ? '2px solid #0078d4' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === 'replace' ? 600 : 400,
                color: activeTab === 'replace' ? '#0078d4' : '#333',
              }}
            >
              Replace
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#666',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px' }}>
          {/* Find Input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Find what:
            </label>
            <input
              ref={findInputRef}
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={handleFindKeyDown}
              placeholder="Enter search term"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Replace Input (only in Replace tab) */}
          {activeTab === 'replace' && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Replace with:
              </label>
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={handleReplaceKeyDown}
                placeholder="Enter replacement text"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
            </div>
          )}

          {/* Options */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Match case
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={matchEntireCell}
                  onChange={(e) => setMatchEntireCell(e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Match entire cell contents
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    color: '#666',
                  }}
                >
                  Search:
                </label>
                <select
                  value={lookIn}
                  onChange={(e) => setLookIn(e.target.value as 'values' | 'formulas' | 'comments')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="values">Values</option>
                  <option value="formulas">Formulas</option>
                  <option value="comments">Comments</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '12px',
                    color: '#666',
                  }}
                >
                  Search by:
                </label>
                <select
                  value={searchBy}
                  onChange={(e) => setSearchBy(e.target.value as 'rows' | 'columns')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="rows">By Rows</option>
                  <option value="columns">By Columns</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '8px 12px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#333',
              }}
            >
              {statusMessage}
              {matchCount > 0 && ` (${currentMatch} of ${matchCount})`}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {activeTab === 'find' ? (
              <>
                <button
                  onClick={handleFindPrevious}
                  disabled={matchCount === 0}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    backgroundColor: matchCount === 0 ? '#f5f5f5' : '#fff',
                    borderRadius: '4px',
                    cursor: matchCount === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: matchCount === 0 ? 0.5 : 1,
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={matchCount === 0 ? executeFind : handleFindNext}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: '#0078d4',
                    color: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {matchCount === 0 ? 'Find All' : 'Next →'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={executeFind}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Find All
                </button>
                <button
                  onClick={handleReplace}
                  disabled={matchCount === 0}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    backgroundColor: matchCount === 0 ? '#f5f5f5' : '#fff',
                    borderRadius: '4px',
                    cursor: matchCount === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: matchCount === 0 ? 0.5 : 1,
                  }}
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: '#0078d4',
                    color: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Replace All
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindReplaceDialog;
