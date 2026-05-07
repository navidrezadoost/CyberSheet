import * as React from 'react';
import { Address } from '@cyber-sheet/core';

// Tab components (will be implemented separately)
import NumberTab from './NumberTab';
import AlignmentTab from './AlignmentTab';
import FontTab from './FontTab';
import BorderTab from './BorderTab';
import FillTab from './FillTab';
import ProtectionTab from './ProtectionTab';

// Types
export type FormatCellsTab = 'number' | 'alignment' | 'font' | 'border' | 'fill' | 'protection';

export interface CellStyle {
  // Number format
  numberFormat?: string | null;
  decimalPlaces?: number | null;
  
  // Alignment
  horizontalAlign?: string | null;
  verticalAlign?: string | null;
  wrapText?: boolean | null;
  shrinkToFit?: boolean | null;
  mergeCells?: boolean | null;
  textRotation?: number | null;
  indent?: number | null;
  textDirection?: string | null;
  
  // Font
  fontFamily?: string | null;
  fontSize?: number | null;
  bold?: boolean | null;
  italic?: boolean | null;
  underline?: string | null;
  strikethrough?: boolean | null;
  superscript?: boolean | null;
  subscript?: boolean | null;
  fontColor?: string | null;
  
  // Border
  borderTop?: { style: string; color: string } | null;
  borderBottom?: { style: string; color: string } | null;
  borderLeft?: { style: string; color: string } | null;
  borderRight?: { style: string; color: string } | null;
  borderDiagonalUp?: { style: string; color: string } | null;
  borderDiagonalDown?: { style: string; color: string } | null;
  
  // Fill
  backgroundColor?: string | null;
  patternColor?: string | null;
  patternStyle?: string | null;
  fillEffects?: any | null;
  
  // Protection
  locked?: boolean | null;
  hidden?: boolean | null;
}

export interface FormattingChanges {
  number?: {
    numberFormat?: string;
    decimalPlaces?: number;
    useSeparator?: boolean;
    symbol?: string;
    negativeStyle?: string;
    formatCode?: string;
  };
  alignment?: {
    horizontal?: string;
    vertical?: string;
    wrapText?: boolean;
    shrinkToFit?: boolean;
    mergeCells?: boolean;
    rotation?: number;
    indent?: number;
    textDirection?: string;
  };
  font?: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: string;
    strikethrough?: boolean;
    superscript?: boolean;
    subscript?: boolean;
    color?: string;
  };
  border?: {
    top?: { style: string; color: string } | null;
    bottom?: { style: string; color: string } | null;
    left?: { style: string; color: string } | null;
    right?: { style: string; color: string } | null;
    diagonalUp?: { style: string; color: string } | null;
    diagonalDown?: { style: string; color: string } | null;
  };
  fill?: {
    backgroundColor?: string;
    patternColor?: string;
    patternStyle?: string;
    fillEffects?: any;
  };
  protection?: {
    locked?: boolean;
    hidden?: boolean;
  };
}

export interface FormatCellsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (changes: FormattingChanges) => void;
  
  selectedCells: Address[];
  currentFormatting: CellStyle;
  
  initialTab?: FormatCellsTab;
}

const TAB_LABELS: Record<FormatCellsTab, string> = {
  number: 'Number',
  alignment: 'Alignment',
  font: 'Font',
  border: 'Border',
  fill: 'Fill',
  protection: 'Protection'
};

const FormatCellsDialog: React.FC<FormatCellsDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedCells,
  currentFormatting,
  initialTab = 'number'
}) => {
  const [activeTab, setActiveTab] = React.useState<FormatCellsTab>(initialTab);
  const [localChanges, setLocalChanges] = React.useState<FormattingChanges>({});
  const [isDirty, setIsDirty] = React.useState(false);
  
  const dialogRef = React.useRef(null);
  
  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setLocalChanges({});
      setIsDirty(false);
    }
  }, [isOpen, initialTab]);
  
  // Handle tab change
  const handleTabChange = (tab: FormatCellsTab) => {
    setActiveTab(tab);
  };
  
  // Handle changes from individual tabs
  const handleNumberChange = (changes: FormattingChanges['number']) => {
    const updated = { ...localChanges, number: changes };
    setLocalChanges(updated);
    setIsDirty(true);
  };
  
  const handleAlignmentChange = (changes: FormattingChanges['alignment']) => {
    const updated = { ...localChanges, alignment: changes };
    setLocalChanges(updated);
    setIsDirty(true);
  };
  
  const handleFontChange = (changes: FormattingChanges['font']) => {
    const updated = { ...localChanges, font: changes };
    setLocalChanges(updated);
    setIsDirty(true);
  };
  
  const handleBorderChange = (changes: FormattingChanges['border']) => {
    const updated = { ...localChanges, border: changes };
    setLocalChanges(updated);
    setIsDirty(true);
  };
  
  const handleFillChange = (changes: FormattingChanges['fill']) => {
    const updated = { ...localChanges, fill: changes };
    setLocalChanges(updated);
    setIsDirty(true);
  };
  
  const handleProtectionChange = (changes: FormattingChanges['protection']) => {
    const updated = { ...localChanges, protection: changes };
    setLocalChanges(updated);
    setIsDirty(true);
  };
  
  // Handle OK button
  const handleOk = () => {
    if (isDirty) {
      onApply(localChanges);
    }
    onClose();
  };
  
  // Handle Cancel button
  const handleCancel = () => {
    onClose();
  };
  
  // Handle backdrop click
  const handleBackdropClick = (e: any) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };
  
  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div
      className="format-cells-dialog-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 300ms ease-out'
      }}
    >
      <div
        ref={dialogRef}
        className="format-cells-dialog"
        onClick={(e: any) => e.stopPropagation()}
        style={{
          width: '560px',
          minHeight: '420px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 300ms ease-out'
        }}
      >
        {/* Dialog Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Format Cells
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#666',
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f8f8'
          }}
        >
          {(Object.keys(TAB_LABELS) as FormatCellsTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === tab ? '#fff' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid #0078d4' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? '#0078d4' : '#333',
                transition: 'all 150ms ease'
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        
        {/* Tab Content Area */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            minHeight: '280px'
          }}
        >
          {activeTab === 'number' && (
            <NumberTab
              currentFormatting={currentFormatting}
              onChange={handleNumberChange}
            />
          )}
          
          {activeTab === 'alignment' && (
            <AlignmentTab
              currentFormatting={currentFormatting}
              onChange={handleAlignmentChange}
            />
          )}
          
          {activeTab === 'font' && (
            <FontTab
              currentFormatting={currentFormatting}
              onChange={handleFontChange}
            />
          )}
          
          {activeTab === 'border' && (
            <BorderTab
              currentFormatting={currentFormatting}
              onChange={handleBorderChange}
            />
          )}
          
          {activeTab === 'fill' && (
            <FillTab
              currentFormatting={currentFormatting}
              onChange={handleFillChange}
            />
          )}
          
          {activeTab === 'protection' && (
            <ProtectionTab
              currentFormatting={currentFormatting}
              onChange={handleProtectionChange}
            />
          )}
        </div>
        
        {/* Dialog Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 24px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            style={{
              padding: '8px 24px',
              border: 'none',
              backgroundColor: '#0078d4',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            OK
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .format-cells-dialog button:hover {
          opacity: 0.9;
        }
        
        .format-cells-dialog button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default FormatCellsDialog;
