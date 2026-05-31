import React, {useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';
import { loadXlsxFromUrl } from '../packages/io-xlsx/src';
import { ExcelApp } from '../packages/react/src/components/ExcelApp';

const DEFAULT_URL = '/011-02-1404_3e5401bdea354b0784b4968da3caed23.xlsx';

const ExcelAppDemo = () => {
  const [workbook, setWorkbook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set page title
    document.title = 'CyberSheet ExcelApp Demo';
    
    console.log('Loading workbook from:', DEFAULT_URL);
    loadXlsxFromUrl(DEFAULT_URL)
      .then((wb) => {
        console.log('Workbook loaded successfully:', wb);
        setWorkbook(wb);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading workbook:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading workbook...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  if (!workbook) {
    return <div style={{ padding: '20px' }}>No workbook loaded</div>;
  }

  console.log('Rendering ExcelApp with workbook:', workbook);

  return (
    <ExcelApp
      workbook={workbook}
      fileName="Book1.xlsx"
      onSave={() => console.log('Save clicked')}
      onWorkbookLoaded={setWorkbook}
    />
  );
};

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ExcelAppDemo />);
}
