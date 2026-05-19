import { GetTransformDataGroupIcon5, GetTransformDataGroupIcon4, GetTransformDataGroupIcon3, GetTransformDataGroupIcon2, GetTransformDataGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useCallback } from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface GetTransformDataGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

export const GetTransformDataGroup: React.FC<GetTransformDataGroupProps> = ({ workbook, onCommand }) => {
  const [showGetDataDropdown, setShowGetDataDropdown] = useState(false);
  const [showRefreshDropdown, setShowRefreshDropdown] = useState(false);

  const handleGetDataFrom = useCallback((source: string) => {
    console.log('Get Data From:', source);
    setShowGetDataDropdown(false);
    // Placeholder for file picker / import dialogs
  }, []);

  const handleRefreshAll = useCallback(() => {
    const command = {
      type: 'refreshAllConnections',
      // workbookId: workbook.id, // TODO: Add id property to Workbook
    };
    onCommand?.(command);
    console.log('Refresh All Connections');
  }, [workbook, onCommand]);

  const handleQueriesConnections = useCallback(() => {
    console.log('Open Queries & Connections pane');
    // Opens sidebar
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
        {/* Get Data Dropdown Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowGetDataDropdown(!showGetDataDropdown)}
            title="Get Data"
            style={{
              width: 56,
              height: 32,
              border: 'none',
              background: '#F0F0F0',
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#333',
              position: 'relative',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
          >
            <GetTransformDataGroupIcon1 />
            <span style={{ fontSize: 9, marginTop: 2 }}>Get Data</span>
            <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
              <GetTransformDataGroupIcon2 />
            </div>
          </button>

          {/* Get Data Dropdown */}
          {showGetDataDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 2,
                background: '#FFFFFF',
                border: '1px solid #D9D9D9',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: 200,
              }}
            >
              <button
                onClick={() => handleGetDataFrom('file')}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                From File ▶
              </button>
              <button
                onClick={() => handleGetDataFrom('database')}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                From Database ▶
              </button>
              <button
                onClick={() => handleGetDataFrom('online')}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                From Online Services ▶
              </button>
              <button
                onClick={() => handleGetDataFrom('other')}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                From Other Sources ▶
              </button>
              <div style={{ height: 1, background: '#E0E0E0', margin: '4px 0' }} />
              <button
                onClick={() => handleGetDataFrom('powerQuery')}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                Launch Power Query Editor...
              </button>
            </div>
          )}
        </div>

        {/* Refresh All Split Button */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', width: 56, height: 32 }}>
            <button
              onClick={handleRefreshAll}
              title="Refresh All"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#F0F0F0',
                cursor: 'pointer',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontFamily: 'Segoe UI, sans-serif',
                color: '#333',
                position: 'relative',
                paddingRight: 12,
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
            >
              <GetTransformDataGroupIcon3 />
              <span style={{ fontSize: 9, marginTop: 2 }}>Refresh All</span>
            </button>

            <button
              type="button"
              aria-label="Refresh All options"
              onClick={() => setShowRefreshDropdown(!showRefreshDropdown)}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 16,
                height: 12,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomRightRadius: 2,
              }}
            >
              <GetTransformDataGroupIcon4 />
            </button>
          </div>

          {/* Refresh Dropdown */}
          {showRefreshDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 2,
                background: '#FFFFFF',
                border: '1px solid #D9D9D9',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: 180,
              }}
            >
              <button
                onClick={() => {
                  handleRefreshAll();
                  setShowRefreshDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                Refresh All
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                Refresh
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                Cancel Refresh
              </button>
              <div style={{ height: 1, background: '#E0E0E0', margin: '4px 0' }} />
              <button
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Segoe UI, sans-serif',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'transparent'}
              >
                Connection Properties...
              </button>
            </div>
          )}
        </div>

        {/* Queries & Connections Button */}
        <button
          onClick={handleQueriesConnections}
          title="Queries & Connections"
          style={{
            width: 56,
            height: 32,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            fontFamily: 'Segoe UI, sans-serif',
            color: '#333',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <GetTransformDataGroupIcon5 />
          <span style={{ fontSize: 8, marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>Queries &<br/>Connections</span>
        </button>
      </div>

      {/* Group Label */}
      <div style={{ fontSize: 10, color: '#666', marginTop: 2, fontFamily: 'Segoe UI, sans-serif' }}>
        Get & Transform Data
      </div>
    </div>
  );
};
