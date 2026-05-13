/**
 * FormulaAutocompletePanel.tsx
 * 
 * IntelliSense-style autocomplete panel for formula editing
 * Features:
 * - Function name completion with fuzzy matching
 * - Argument hints and syntax
 * - Detailed descriptions
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Category badges
 * - Scroll handling for large lists
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FormulaAutocomplete, AutocompleteSuggestion } from '@cyber-sheet/core';
import type { FunctionRegistry } from '@cyber-sheet/core';

export interface FormulaAutocompletePanelProps {
  /** Formula input value */
  input: string;
  /** Current cursor position */
  cursorPosition: number;
  /** Function registry for autocomplete */
  functionRegistry: FunctionRegistry;
  /** X position (relative to formula bar) */
  x?: number;
  /** Y position (below formula bar) */
  y?: number;
  /** Whether panel is visible */
  isVisible: boolean;
  /** Callback when function selected */
  onFunctionSelect: (functionName: string) => void;
  /** Callback to close panel */
  onClose: () => void;
  /** Maximum suggestions to show */
  maxSuggestions?: number;
}

/**
 * Extract current token being typed (for autocomplete context)
 */
function getCurrentToken(input: string, cursorPosition: number): string {
  let start = cursorPosition - 1;
  while (start >= 0 && /[A-Za-z0-9_.]/.test(input[start])) {
    start--;
  }
  start++;
  return input.substring(start, cursorPosition).toUpperCase();
}

/**
 * Get category color for visual badge
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    MATH: '#4285F4',
    STATISTICAL: '#34A853',
    LOGICAL: '#EA4335',
    DATE_TIME: '#9334E6',
    TEXT: '#F9AB00',
    LOOKUP: '#FF6D01',
    FINANCIAL: '#1E8E3E',
    INFORMATION: '#5F6368',
    ARRAY: '#C5221F',
    ENGINEERING: '#12B5CB',
  };
  return colors[category] || '#5F6368';
}

/**
 * Get category display name
 */
function getCategoryDisplayName(category: string): string {
  return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

export const FormulaAutocompletePanel: React.FC<FormulaAutocompletePanelProps> = ({
  input,
  cursorPosition,
  functionRegistry,
  x = 0,
  y = 0,
  isVisible,
  onFunctionSelect,
  onClose,
  maxSuggestions = 10,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const autocompleteEngine = useMemo(
    () => new FormulaAutocomplete(functionRegistry),
    [functionRegistry]
  );
  const panelRef = useRef(null as HTMLDivElement | null);
  const selectedItemRef = useRef(null as HTMLDivElement | null);

  // Extract current token and get suggestions
  useEffect(() => {
    if (!isVisible) {
      setSuggestions([]);
      return;
    }

    const token = getCurrentToken(input, cursorPosition);
    
    if (!token || token.length === 0) {
      setSuggestions([]);
      return;
    }

    const results = autocompleteEngine.getSuggestions(token, {
      maxSuggestions,
      caseSensitive: false,
    });

    setSuggestions(results);
    setSelectedIndex(0);
  }, [input, cursorPosition, isVisible, maxSuggestions, autocompleteEngine]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && panelRef.current) {
      const itemRect = selectedItemRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();

      if (itemRect.bottom > panelRect.bottom) {
        selectedItemRef.current.scrollIntoView({ block: 'nearest' });
      } else if (itemRect.top < panelRect.top) {
        selectedItemRef.current.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, suggestions.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          onFunctionSelect(suggestions[selectedIndex].name);
        }
        break;

      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isVisible, suggestions, selectedIndex, onFunctionSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const selectedSuggestion = suggestions[selectedIndex];

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: '520px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D0D0D0',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'row',
        zIndex: 10003,
        fontFamily: 'Segoe UI, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Left: Function List */}
      <div
        style={{
          width: '280px',
          maxHeight: '360px',
          overflowY: 'auto',
          borderRight: '1px solid #E1E1E1',
        }}
      >
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.name}
            ref={index === selectedIndex ? selectedItemRef : null}
            onClick={() => onFunctionSelect(suggestion.name)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: index === selectedIndex ? '#E8F0FE' : 'transparent',
              borderBottom: '1px solid #F5F5F5',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {/* Category Badge */}
            <div
              style={{
                width: '6px',
                height: '32px',
                borderRadius: '3px',
                backgroundColor: getCategoryColor(String(suggestion.category)),
                flexShrink: 0,
              }}
            />
            
            {/* Function Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#202124',
                  fontFamily: 'Consolas, Monaco, monospace',
                }}
              >
                {suggestion.name}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#5F6368',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getCategoryDisplayName(String(suggestion.category))}
              </div>
            </div>

            {/* Match Score Indicator (subtle) */}
            {suggestion.matchType === 'fuzzy' && (
              <div
                style={{
                  fontSize: '10px',
                  color: '#9AA0A6',
                  flexShrink: 0,
                }}
                title={`Match score: ${Math.round(suggestion.matchScore)}`}
              >
                ~
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right: Function Details */}
      {selectedSuggestion && (
        <div
          style={{
            flex: 1,
            padding: '12px',
            maxHeight: '360px',
            overflowY: 'auto',
            backgroundColor: '#F8F9FA',
          }}
        >
          {/* Function Name & Category */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#202124',
                fontFamily: 'Consolas, Monaco, monospace',
                marginBottom: '4px',
              }}
            >
              {selectedSuggestion.name}
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: getCategoryColor(String(selectedSuggestion.category)) + '20',
                color: getCategoryColor(String(selectedSuggestion.category)),
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {getCategoryDisplayName(String(selectedSuggestion.category))}
            </div>
          </div>

          {/* Syntax */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#5F6368',
                textTransform: 'uppercase',
                marginBottom: '6px',
                letterSpacing: '0.5px',
              }}
            >
              Syntax
            </div>
            <div
              style={{
                padding: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E1E1E1',
                borderRadius: '4px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '12px',
                color: '#1967D2',
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}
            >
              {selectedSuggestion.syntax}
            </div>
          </div>

          {/* Description */}
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#5F6368',
                textTransform: 'uppercase',
                marginBottom: '6px',
                letterSpacing: '0.5px',
              }}
            >
              Description
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#3C4043',
                lineHeight: '1.6',
              }}
            >
              {selectedSuggestion.description}
            </div>
          </div>

          {/* Arguments Info */}
          {(selectedSuggestion.minArgs !== undefined || selectedSuggestion.maxArgs !== undefined) && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E1E1E1' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: '#5F6368',
                }}
              >
                <strong>Arguments:</strong>{' '}
                {selectedSuggestion.minArgs === selectedSuggestion.maxArgs
                  ? `${selectedSuggestion.minArgs}`
                  : selectedSuggestion.maxArgs === undefined
                  ? `${selectedSuggestion.minArgs}+`
                  : `${selectedSuggestion.minArgs}-${selectedSuggestion.maxArgs}`}
              </div>
            </div>
          )}

          {/* Keyboard Hints */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #E1E1E1',
              fontSize: '10px',
              color: '#80868B',
            }}
          >
            <div style={{ marginBottom: '4px' }}>
              <kbd style={{ 
                padding: '2px 5px', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #D0D0D0',
                borderRadius: '3px',
                fontFamily: 'monospace',
                marginRight: '4px',
              }}>↑↓</kbd> Navigate
            </div>
            <div style={{ marginBottom: '4px' }}>
              <kbd style={{ 
                padding: '2px 5px', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #D0D0D0',
                borderRadius: '3px',
                fontFamily: 'monospace',
                marginRight: '4px',
              }}>Enter</kbd> Insert
            </div>
            <div>
              <kbd style={{ 
                padding: '2px 5px', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #D0D0D0',
                borderRadius: '3px',
                fontFamily: 'monospace',
                marginRight: '4px',
              }}>Esc</kbd> Close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
