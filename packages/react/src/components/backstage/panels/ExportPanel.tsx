// src/components/backstage/panels/ExportPanel.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { FileOperations, ExportFormat, ExportOptions } from '@cyber-sheet/core';
import { exportXLSX } from '@cyber-sheet/io-xlsx';

export interface ExportPanelProps {
  fileOperations: FileOperations;
  workbookName: string;
  workbook?: any; // Workbook instance
  onExportComplete?: (blob: Blob, format: ExportFormat) => void;
}

interface FormatCard {
  id: ExportFormat;
  name: string;
  icon: string;
  description: string;
  isRecommended?: boolean;
  mimeType: string;
}

const FORMAT_CARDS: FormatCard[] = [
  {
    id: 'xlsx',
    name: 'Excel Workbook (.xlsx)',
    icon: '📊',
    description: 'Best for Microsoft Excel. Preserves all formatting, formulas, and sheets.',
    isRecommended: true,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'pdf',
    name: 'PDF (.pdf)',
    icon: '📄',
    description: 'Best for sharing and printing. Fixed layout that looks the same on any device.',
    isRecommended: false,
    mimeType: 'application/pdf',
  },
  {
    id: 'csv',
    name: 'CSV (.csv)',
    icon: '📋',
    description: 'Plain text format. Saves only the active sheet as comma-separated values.',
    isRecommended: false,
    mimeType: 'text/csv',
  },
  {
    id: 'ods',
    name: 'OpenDocument (.ods)',
    icon: '📝',
    description: 'Open format compatible with LibreOffice, OpenOffice, and Google Sheets.',
    isRecommended: false,
    mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
  },
  {
    id: 'txt',
    name: 'Plain Text (.txt)',
    icon: '📃',
    description: 'Tab-delimited text. Saves only the active sheet without formatting.',
    isRecommended: false,
    mimeType: 'text/plain',
  },
  {
    id: 'html',
    name: 'Web Page (.html)',
    icon: '🌐',
    description: 'HTML table format. Can be opened in any web browser.',
    isRecommended: false,
    mimeType: 'text/html',
  },
];

export const ExportPanel: React.FC<ExportPanelProps> = ({
  fileOperations,
  workbookName,
  workbook,
  onExportComplete,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [showCsvOptions, setShowCsvOptions] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  
  // CSV options
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';' | '\t'>(',');
  const [csvIncludeHeaders, setCsvIncludeHeaders] = useState(true);
  
  // PDF options
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfFitToPage, setPdfFitToPage] = useState(true);
  
  const progressIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    setExportComplete(false);
    setExportProgress(0);
    setShowCsvOptions(format === 'csv');
    setShowPdfOptions(format === 'pdf');
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedFormat) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    // Build export options
    const options: ExportOptions = {};
    if (selectedFormat === 'csv') {
      options.csv = { delimiter: csvDelimiter, includeHeaders: csvIncludeHeaders };
    }
    if (selectedFormat === 'pdf') {
      options.pdf = { orientation: pdfOrientation, fitToPage: pdfFitToPage, paperSize: 'A4' };
    }
    
    // Simulate progress (real implementation would track actual export)
    const startTime = Date.now();
    const estimatedDuration = 1500; // 1.5 seconds
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
      setExportProgress(progress);
      
      if (elapsed >= estimatedDuration) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    }, 50);
    
    try {
      let blob: Blob;

      if (!workbook) {
        throw new Error('No workbook available for export');
      }
      
      if (selectedFormat === 'xlsx') {
        // Use actual exportXLSX from io-xlsx
        const arrayBuffer = await exportXLSX(workbook);
        blob = new Blob([arrayBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
      } else if (selectedFormat === 'csv') {
        // Basic CSV export: export active sheet as CSV
        const sheet = workbook.activeSheet;
        if (!sheet) throw new Error('No active sheet to export');
        
        const rows: string[][] = [];
        const maxRow = 100; // Limit to reasonable size for demo
        const maxCol = 26; // A-Z
        
        for (let r = 0; r < maxRow; r++) {
          const row: string[] = [];
          for (let c = 0; c < maxCol; c++) {
            const value = sheet.getCellValue({ row: r, col: c }) ?? '';
            // Basic CSV escaping
            const strValue = String(value);
            if (strValue.includes(',') || strValue.includes('\"') || strValue.includes('\\n')) {
              row.push(`\"${strValue.replace(/\"/g, '\"\"')}\"`);
            } else {
              row.push(strValue);
            }
          }
          // Skip completely empty rows at the end
          if (row.some(cell => cell !== '')) {
            rows.push(row);
          }
        }
        
        const csvContent = rows.map(row => row.join(',')).join('\\n');
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      } else if (selectedFormat === 'pdf') {
        // PDF: Use browser print dialog as fallback
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        setExportProgress(0);
        setIsExporting(false);
        alert('PDF export: Please use your browser\'s Print function (Ctrl+P) and select "Save as PDF".');
        return; // Don't download, just show message
      } else if (selectedFormat === 'ods') {
        throw new Error('ODS export coming soon');
      } else if (selectedFormat === 'txt' || selectedFormat === 'html') {
        // TXT/HTML: Fallback to FileOperations stub (will throw)
        blob = await fileOperations.exportWorkbook(selectedFormat, options);
      } else {
        // Unknown format
        blob = await fileOperations.exportWorkbook(selectedFormat, options);
      }
      
      // Complete
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setExportProgress(100);
      
      // Brief delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = workbookName.replace(/\.[^.]+$/, '');
      link.download = `${baseName}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportComplete(true);
      
      if (onExportComplete) {
        onExportComplete(blob, selectedFormat);
      }
    } catch (error) {
      // Handle error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setExportProgress(0);
      setIsExporting(false);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, csvDelimiter, csvIncludeHeaders, pdfOrientation, pdfFitToPage, fileOperations, workbookName, onExportComplete]);

  const handleReset = useCallback(() => {
    setSelectedFormat(null);
    setExportComplete(false);
    setExportProgress(0);
    setShowCsvOptions(false);
    setShowPdfOptions(false);
  }, []);

  // ─── Styles ──────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    padding: '40px 48px',
    maxWidth: 640,
    animation: 'fadeInUp 250ms ease-out',
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
    marginBottom: 32,
  };

  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 24,
  };

  const cardStyle = (isSelected: boolean, isRecommended: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    border: isSelected ? '2px solid #0078D4' : '1px solid #E0E0E0',
    borderRadius: 8,
    cursor: 'pointer',
    backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
    transition: 'all 150ms ease',
    position: 'relative' as const,
    boxShadow: isSelected ? '0 0 0 3px rgba(0,120,212,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
  });

  const cardIconStyle: React.CSSProperties = {
    fontSize: 28,
    flexShrink: 0,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  };

  const cardContentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const cardNameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#1F1F1F',
    marginBottom: 4,
  };

  const cardDescStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#888888',
    lineHeight: 1.4,
  };

  const recommendedBadgeStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#0078D4',
    backgroundColor: '#E8F4FD',
    padding: '2px 8px',
    borderRadius: 10,
    display: 'inline-block',
    marginBottom: 6,
  };

  const checkmarkStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#0078D4',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  };

  // Options panel
  const optionsPanelStyle: React.CSSProperties = {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    border: '1px solid #E8E8E8',
    animation: 'slideDown 200ms ease-out',
  };

  const optionsLabelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#333333',
    marginBottom: 8,
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#333333',
    cursor: 'pointer',
  };

  // Progress
  const progressContainerStyle: React.CSSProperties = {
    marginBottom: 16,
  };

  const progressBarBgStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: exportComplete ? '#107C10' : '#0078D4',
    borderRadius: 3,
    transition: 'width 100ms ease-out',
    width: `${exportProgress}%`,
  };

  const progressTextStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    display: 'flex',
    justifyContent: 'space-between',
  };

  // Buttons
  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const exportButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: exportComplete ? '#107C10' : isExporting ? '#106EBE' : '#0078D4',
    border: 'none',
    borderRadius: 4,
    cursor: (!selectedFormat || isExporting || exportComplete) ? 'default' : 'pointer',
    opacity: !selectedFormat || isExporting ? 0.6 : 1,
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const resetButtonStyle: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    color: '#333333',
    backgroundColor: 'transparent',
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    cursor: 'pointer',
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
      <h1 style={headingStyle}>Export</h1>
      <p style={subheadingStyle}>
        Choose a format to download a copy of <strong>{workbookName}</strong>.
      </p>

      {/* Format cards */}
      <div style={cardGridStyle}>
        {FORMAT_CARDS.map((format) => {
          const isSelected = selectedFormat === format.id;
          
          return (
            <div
              key={format.id}
              style={cardStyle(isSelected, format.isRecommended ?? false)}
              onClick={() => !isExporting && handleFormatSelect(format.id)}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                if (!isSelected && !isExporting) {
                  e.currentTarget.style.borderColor = '#CCCCCC';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFormatSelect(format.id);
                }
              }}
            >
              <div style={cardIconStyle}>{format.icon}</div>
              <div style={cardContentStyle}>
                {format.isRecommended && (
                  <span style={recommendedBadgeStyle}>Recommended</span>
                )}
                <div style={cardNameStyle}>{format.name}</div>
                <div style={cardDescStyle}>{format.description}</div>
              </div>
              {isSelected && (
                <div style={checkmarkStyle}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* CSV Options */}
      {showCsvOptions && selectedFormat === 'csv' && (
        <div style={optionsPanelStyle}>
          <div style={optionsLabelStyle}>CSV Options</div>
          <label style={{ ...checkboxLabelStyle, marginBottom: 12 }}>
            Delimiter:
            <select
              value={csvDelimiter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCsvDelimiter(e.target.value as ',' | ';' | '\t')}
              style={{ ...selectStyle, width: 'auto', marginBottom: 0 }}
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="\t">Tab</option>
            </select>
          </label>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={csvIncludeHeaders}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvIncludeHeaders(e.target.checked)}
              style={{ margin: 0 }}
            />
            Include column headers
          </label>
        </div>
      )}

      {/* PDF Options */}
      {showPdfOptions && selectedFormat === 'pdf' && (
        <div style={optionsPanelStyle}>
          <div style={optionsLabelStyle}>PDF Options</div>
          <label style={{ ...checkboxLabelStyle, marginBottom: 12 }}>
            Orientation:
            <select
              value={pdfOrientation}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPdfOrientation(e.target.value as 'portrait' | 'landscape')}
              style={{ ...selectStyle, width: 'auto', marginBottom: 0 }}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={pdfFitToPage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfFitToPage(e.target.checked)}
              style={{ margin: 0 }}
            />
            Fit to page width
          </label>
        </div>
      )}

      {/* Progress bar */}
      {(isExporting || exportComplete) && (
        <div style={progressContainerStyle}>
          <div style={progressBarBgStyle}>
            <div style={progressBarFillStyle} />
          </div>
          <div style={progressTextStyle}>
            <span>
              {exportComplete ? '✓ Download complete' : 'Exporting...'}
            </span>
            <span>{Math.round(exportProgress)}%</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={buttonContainerStyle}>
        <button
          style={exportButtonStyle}
          onClick={handleExport}
          disabled={!selectedFormat || isExporting || exportComplete}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (selectedFormat && !isExporting && !exportComplete) {
              e.currentTarget.style.backgroundColor = '#106EBE';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (selectedFormat && !isExporting && !exportComplete) {
              e.currentTarget.style.backgroundColor = '#0078D4';
            }
          }}
        >
          {isExporting && <div style={spinnerStyle} />}
          {exportComplete ? '✓ Downloaded' : 'Download'}
        </button>
        
        {exportComplete && (
          <button
            style={resetButtonStyle}
            onClick={handleReset}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Export Another Format
          </button>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 300px; }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
