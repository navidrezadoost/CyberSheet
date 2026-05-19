/**
 * BackstageContainer.tsx
 * 
 * Main backstage file menu container
 * Full-screen overlay with sidebar navigation and panel content area
 * 
 * Features:
 * - Panel routing and state management
 * - Fade in/out animations
 * - Keyboard navigation (Esc to close)
 * - Crossfade between panels
 * 
 * Phase 6: File Backstage Menu
 */

import React, { useState, useCallback, useEffect } from 'react';
import { BackstageSidebar } from './BackstageSidebar';
import { RenamePanel } from './panels/RenamePanel';
import { CreateCopyPanel } from './panels/CreateCopyPanel';
import { ExportPanel } from './panels/ExportPanel';
import { OpenPanel } from './panels/OpenPanel';
import { NewPanel } from './panels/NewPanel';
import { SharePanel } from './panels/SharePanel';
import { MoveFilePanel } from './panels/MoveFilePanel';
import { InfoPanel } from './panels/InfoPanel';
import { VersionHistoryPanel } from './panels/VersionHistoryPanel';
import { OptionsPanel } from './panels/OptionsPanel';
import type { FileOperations, WorkbookMetadata } from '@cyber-sheet/core';

export type BackstagePanel = 
  | 'new'
  | 'open'
  | 'share'
  | 'createCopy'
  | 'export'
  | 'rename'
  | 'moveFile'
  | 'versionHistory'
  | 'info'
  | 'options';

export interface BackstageContainerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPanel?: BackstagePanel;
  
  // File operations instance
  fileOperations: FileOperations;
  workbookMetadata: WorkbookMetadata;
  workbook?: any; // Workbook instance for file I/O operations
  
  // Callbacks for actions that affect the main app
  onWorkbookLoaded?: (workbook: any) => void;
  onCreateBlankWorkbook?: () => void;
  onCreateFromTemplate?: (templateId: string) => void;
  onOpenFile?: (fileId: string) => void;
  onExportComplete?: (blob: Blob) => void;
  onVersionRestored?: () => void;
}

export const BackstageContainer: React.FC<BackstageContainerProps> = ({
  isOpen,
  onClose,
  initialPanel = 'new',
  fileOperations,
  workbookMetadata,
  workbook,
  onWorkbookLoaded,
  onCreateBlankWorkbook,
  onCreateFromTemplate,
  onOpenFile,
  onExportComplete,
  onVersionRestored,
}) => {
  const [activePanel, setActivePanel] = useState<BackstagePanel>(initialPanel);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset to initial panel when backstage opens
  useEffect(() => {
    if (isOpen) {
      setActivePanel(initialPanel);
      setIsAnimating(true);
      // Allow animation to complete
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialPanel]);

  const handlePanelChange = useCallback((panel: BackstagePanel) => {
    setIsAnimating(true);
    setActivePanel(panel);
    setTimeout(() => setIsAnimating(false), 200);
  }, []);

  const handleClose = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
    }, 200);
  }, [onClose]);

  // Keyboard handler: Esc to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen && !isAnimating) return null;

  const renderPanel = () => {
    switch (activePanel) {
      case 'rename':
        return (
          <RenamePanel
            fileOperations={fileOperations}
            currentName={workbookMetadata.name}
            onClose={onClose}
          />
        );
      
      case 'createCopy':
        return (
          <CreateCopyPanel
            fileOperations={fileOperations}
            currentFileName={workbookMetadata.name}
            currentLocation={workbookMetadata.location}
            workbook={workbook}
            onClose={onClose}
          />
        );
      
      case 'export':
        return (
          <ExportPanel
            fileOperations={fileOperations}
            workbookName={workbookMetadata.name}
            workbook={workbook}
            onExportComplete={(blob, format) => {
              onExportComplete?.(blob);
              // Log or track export
              console.log(`Exported as ${format}, size: ${(blob.size / 1024).toFixed(1)} KB`);
            }}
          />
        );
      
      // TODO: Implement remaining panels
      case 'new':
        return (
          <NewPanel
            fileOperations={fileOperations}
            onWorkbookLoaded={onWorkbookLoaded}
            onCreateBlank={() => {
              onCreateBlankWorkbook?.();
              onClose();
            }}
            onCreateFromTemplate={(templateId) => {
              onCreateFromTemplate?.(templateId);
              onClose();
            }}
          />
        );
      case 'open':
        return (
          <OpenPanel
            fileOperations={fileOperations}
            onWorkbookLoaded={onWorkbookLoaded}
            onOpenFile={(fileId) => {
              onOpenFile?.(fileId);
              onClose();
            }}
          />
        );
      case 'share':
        return (
          <SharePanel
            fileOperations={fileOperations}
            workbookName={workbookMetadata.name}
          />
        );
      case 'moveFile':
        return (
          <MoveFilePanel
            fileOperations={fileOperations}
            currentPath={workbookMetadata.path}
          />
        );
      case 'versionHistory':
        return (
          <VersionHistoryPanel
            fileOperations={fileOperations}
            onVersionRestored={() => {
              // Refresh workbook state after restore
              console.log('Version restored');
            }}
          />
        );
      case 'info':
        return (
          <InfoPanel
            fileOperations={fileOperations}
            metadata={workbookMetadata}
          />
        );
      case 'options':
        return (
          <OptionsPanel
            fileOperations={fileOperations}
          />
        );
      default:
        return null;
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    opacity: isOpen ? 1 : 0,
    transition: 'opacity 200ms ease-out',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  };

  const headerStyle: React.CSSProperties = {
    height: 48,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    backgroundColor: '#0078D4',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 600,
    gap: 12,
  };

  const backButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background-color 150ms',
  };

  const bodyStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  };

  const panelContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#FFFFFF',
    opacity: isAnimating ? 0 : 1,
    transition: 'opacity 200ms ease-in-out',
  };

  return (
    <div
      style={containerStyle}
      role="dialog"
      aria-label="File menu"
      aria-modal="true"
    >
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onClick={handleClose}
          onMouseEnter={(e: any) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e: any) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Back to workbook"
        >
          ← Back
        </button>
        <span>{workbookMetadata.name} — Excel</span>
      </div>

      {/* Body: Sidebar + Panel */}
      <div style={bodyStyle}>
        <BackstageSidebar
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
        />
        <div style={panelContainerStyle} key={activePanel}>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
};
