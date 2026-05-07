/**
 * TitleBar.tsx
 * 
 * Excel-style title bar with quick access toolbar and window controls
 */

import React, { useState } from 'react';

export interface TitleBarProps {
  fileName?: string;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  autoSave?: boolean;
  onAutoSaveToggle?: (enabled: boolean) => void;
}

/**
 * TitleBar - Excel application title bar
 * 
 * Features:
 * - Excel icon
 * - Quick Access Toolbar (Save, Undo, Redo)
 * - File name display
 * - Search button
 * - Share button
 * - User avatar
 * - Window controls
 */
export const TitleBar: React.FC<TitleBarProps> = ({
  fileName = 'Book1 - Excel',
  onSave,
  onUndo,
  onRedo,
  onMinimize,
  onMaximize,
  onClose,
  autoSave = false,
  onAutoSaveToggle,
}) => {
  const [isAutoSave, setIsAutoSave] = useState(autoSave);

  const handleAutoSaveToggle = () => {
    const newValue = !isAutoSave;
    setIsAutoSave(newValue);
    onAutoSaveToggle?.(newValue);
  };

  return (
    <header className="title-bar">
      <div className="title-bar-left">
        {/* Excel Icon */}
        <button className="title-btn" title="File">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" fill="#217346"/>
            <path d="M4 4L8 12L12 4" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>

        {/* Quick Access Toolbar */}
        <div className="quick-access-toolbar">
          {/* AutoSave Toggle */}
          <button 
            className="qat-btn" 
            title="AutoSave"
            onClick={handleAutoSaveToggle}
          >
            <span className={`toggle-switch ${isAutoSave ? 'active' : ''}`}></span>
            <span className="qat-label">AutoSave</span>
          </button>

          {/* Save */}
          <button className="qat-btn" title="Save" onClick={onSave}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M11 1H3C1.9 1 1 1.9 1 3V11C1 12.1 1.9 13 3 13H11C12.1 13 13 12.1 13 11V3C13 1.9 12.1 1 11 1ZM7 11C5.9 11 5 10.1 5 9C5 7.9 5.9 7 7 7C8.1 7 9 7.9 9 9C9 10.1 8.1 11 7 11ZM9 5H3V3H9V5Z"/>
            </svg>
          </button>

          {/* Undo */}
          <button className="qat-btn" title="Undo (Ctrl+Z)" onClick={onUndo}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M8 3H3.41L5.71 0.71L5 0L1 4L5 8L5.71 7.29L3.41 5H8C10.21 5 12 6.79 12 9C12 11.21 10.21 13 8 13H4V11H8C9.1 11 10 10.1 10 9C10 7.9 9.1 7 8 7H3.41L5.71 9.29L5 10L1 6"/>
            </svg>
          </button>

          {/* Redo */}
          <button className="qat-btn" title="Redo (Ctrl+Y)" onClick={onRedo}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M6 3H10.59L8.29 0.71L9 0L13 4L9 8L8.29 7.29L10.59 5H6C3.79 5 2 6.79 2 9C2 11.21 3.79 13 6 13H10V11H6C4.9 11 4 10.1 4 9C4 7.9 4.9 7 6 7H10.59L8.29 9.29L9 10L13 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* File Name */}
      <div className="title-bar-center">
        <span className="file-name">{fileName}</span>
      </div>

      {/* Right Side Controls */}
      <div className="title-bar-right">
        {/* Search */}
        <button className="title-btn search-btn">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 9L13 13" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span>Search</span>
        </button>

        {/* Share */}
        <button className="title-btn share-btn">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M10 9C9.4 9 8.9 9.2 8.5 9.6L5.9 8.1C5.97 7.75 5.97 7.25 5.9 6.9L8.5 5.4C8.9 5.8 9.4 6 10 6C11.1 6 12 5.1 12 4C12 2.9 11.1 2 10 2C8.9 2 8 2.9 8 4C8 4.18 8.03 4.35 8.07 4.5L5.5 6C5.1 5.6 4.6 5.4 4 5.4C2.9 5.4 2 6.3 2 7.4C2 8.5 2.9 9.4 4 9.4C4.6 9.4 5.1 9.2 5.5 8.8L8.1 10.3C8.03 10.5 8 10.7 8 10.9C8 12 8.9 12.9 10 12.9C11.1 12.9 12 12 12 10.9C12 9.8 11.1 9 10 9Z"/>
          </svg>
          <span>Share</span>
        </button>

        {/* User Avatar */}
        <div className="user-avatar" title="User Account">
          <span>U</span>
        </div>

        {/* Window Controls */}
        <button className="window-btn minimize" title="Minimize" onClick={onMinimize}>
          <span>─</span>
        </button>
        <button className="window-btn maximize" title="Maximize" onClick={onMaximize}>
          <span>□</span>
        </button>
        <button className="window-btn close" title="Close" onClick={onClose}>
          <span>×</span>
        </button>
      </div>
    </header>
  );
};
