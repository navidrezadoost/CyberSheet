import * as React from 'react';
import { CellStyle, FormattingChanges } from './FormatCellsDialog';

export interface NumberTabProps {
  currentFormatting: CellStyle;
  onChange: (changes: FormattingChanges['number']) => void;
}

type NumberCategory = 'General' | 'Number' | 'Currency' | 'Accounting' | 'Date' | 'Time' | 
                      'Percentage' | 'Fraction' | 'Scientific' | 'Text' | 'Special' | 'Custom';

type NegativeStyle = 'minus' | 'parens' | 'redMinus' | 'redParens';

const CATEGORIES: NumberCategory[] = [
  'General', 'Number', 'Currency', 'Accounting', 'Date', 'Time',
  'Percentage', 'Fraction', 'Scientific', 'Text', 'Special', 'Custom'
];

const CURRENCY_SYMBOLS = ['$', '€', '£', '¥', '₹', 'CHF', 'CAD', 'AUD'];

const DATE_FORMATS = [
  '3/14/2012',
  '03/14/2012',
  '14-Mar-12',
  '14-Mar',
  'Mar-12',
  'March 14, 2012',
  '3/14',
  '14-Mar-2012'
];

const TIME_FORMATS = [
  '1:30 PM',
  '13:30',
  '13:30:55',
  '1:30:55 PM',
  '30:55.2',
  '55.2'
];

const FRACTION_TYPES = [
  'Up to one digit (1/4)',
  'Up to two digits (21/25)',
  'Up to three digits (312/943)',
  'As halves (1/2)',
  'As quarters (2/4)',
  'As eighths (4/8)',
  'As sixteenths (8/16)',
  'As tenths (5/10)',
  'As hundredths (50/100)'
];

const SPECIAL_TYPES = [
  'Zip Code',
  'Zip Code + 4',
  'Phone Number',
  'Social Security Number'
];

const NumberTab: React.FC<NumberTabProps> = ({
  currentFormatting,
  onChange
}) => {
  const [category, setCategory] = React.useState<NumberCategory>('General');
  const [decimalPlaces, setDecimalPlaces] = React.useState(2);
  const [useSeparator, setUseSeparator] = React.useState(true);
  const [symbol, setSymbol] = React.useState('$');
  const [negativeStyle, setNegativeStyle] = React.useState<NegativeStyle>('minus');
  const [dateType, setDateType] = React.useState(DATE_FORMATS[0]);
  const [timeType, setTimeType] = React.useState(TIME_FORMATS[0]);
  const [fractionType, setFractionType] = React.useState(FRACTION_TYPES[0]);
  const [specialType, setSpecialType] = React.useState(SPECIAL_TYPES[0]);
  const [customFormatCode, setCustomFormatCode] = React.useState('');
  
  // Generate sample value based on category
  const getSampleValue = (): string => {
    const testValue = 1234.56;
    
    switch (category) {
      case 'General':
        return '1234.56';
      case 'Number':
        return formatNumber(testValue);
      case 'Currency':
      case 'Accounting':
        return formatCurrency(testValue);
      case 'Date':
        return dateType;
      case 'Time':
        return timeType;
      case 'Percentage':
        return formatPercentage(testValue);
      case 'Fraction':
        return '1234 14/25';
      case 'Scientific':
        return formatScientific(testValue);
      case 'Text':
        return '1234.56';
      case 'Special':
        return formatSpecial();
      case 'Custom':
        return customFormatCode ? 'Custom format' : '1234.56';
      default:
        return '1234.56';
    }
  };
  
  const formatNumber = (value: number): string => {
    const formatted = value.toFixed(decimalPlaces);
    if (useSeparator) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    return formatted;
  };
  
  const formatCurrency = (value: number): string => {
    const formatted = formatNumber(value);
    switch (negativeStyle) {
      case 'minus':
        return `${symbol}${formatted}`;
      case 'parens':
        return `(${symbol}${formatted})`;
      case 'redMinus':
        return `${symbol}${formatted}`;
      case 'redParens':
        return `(${symbol}${formatted})`;
      default:
        return `${symbol}${formatted}`;
    }
  };
  
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(decimalPlaces)}%`;
  };
  
  const formatScientific = (value: number): string => {
    return value.toExponential(decimalPlaces);
  };
  
  const formatSpecial = (): string => {
    switch (specialType) {
      case 'Zip Code':
        return '12345';
      case 'Zip Code + 4':
        return '12345-6789';
      case 'Phone Number':
        return '(123) 456-7890';
      case 'Social Security Number':
        return '123-45-6789';
      default:
        return '12345';
    }
  };
  
  // Notify parent of changes
  React.useEffect(() => {
    let formatCode = '';
    
    switch (category) {
      case 'General':
        formatCode = 'General';
        break;
      case 'Number':
        formatCode = useSeparator ? '#,##0' : '0';
        if (decimalPlaces > 0) {
          formatCode += '.' + '0'.repeat(decimalPlaces);
        }
        break;
      case 'Currency':
      case 'Accounting':
        formatCode = `${symbol}#,##0.${'0'.repeat(decimalPlaces)}`;
        break;
      case 'Date':
        formatCode = dateType;
        break;
      case 'Time':
        formatCode = timeType;
        break;
      case 'Percentage':
        formatCode = `0.${'0'.repeat(decimalPlaces)}%`;
        break;
      case 'Fraction':
        formatCode = '# ?/?';
        break;
      case 'Scientific':
        formatCode = `0.${'0'.repeat(decimalPlaces)}E+00`;
        break;
      case 'Text':
        formatCode = '@';
        break;
      case 'Custom':
        formatCode = customFormatCode;
        break;
    }
    
    onChange({
      numberFormat: category,
      decimalPlaces,
      useSeparator,
      symbol,
      negativeStyle,
      formatCode
    });
  }, [category, decimalPlaces, useSeparator, symbol, negativeStyle, dateType, timeType, fractionType, specialType, customFormatCode, onChange]);
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '20px' }}>
      {/* Left: Category list */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
          Category:
        </label>
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            maxHeight: '260px',
            overflowY: 'auto',
            backgroundColor: '#fff'
          }}
        >
          {CATEGORIES.map(cat => (
            <div
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: category === cat ? '#e3f2fd' : 'transparent',
                borderLeft: category === cat ? '3px solid #0078d4' : '3px solid transparent',
                fontSize: '13px'
              }}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>
      
      {/* Right: Category-specific options */}
      <div>
        {/* Sample preview */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
            Sample
          </label>
          <div
            style={{
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: negativeStyle.includes('red') ? '#d32f2f' : '#333'
            }}
          >
            {getSampleValue()}
          </div>
        </div>
        
        {/* Category-specific controls */}
        {(category === 'Number' || category === 'Currency' || category === 'Accounting') && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                Decimal places:
              </label>
              <input
                type="number"
                value={decimalPlaces}
                onChange={(e: any) => setDecimalPlaces(Number(e.target.value))}
                min="0"
                max="30"
                style={{
                  width: '100px',
                  padding: '6px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={useSeparator}
                  onChange={(e: any) => setUseSeparator(e.target.checked)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                Use 1000 Separator (,)
              </label>
            </div>
            
            {(category === 'Currency' || category === 'Accounting') && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                  Symbol:
                </label>
                <select
                  value={symbol}
                  onChange={(e: any) => setSymbol(e.target.value)}
                  style={{
                    width: '120px',
                    padding: '6px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  {CURRENCY_SYMBOLS.map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>
            )}
            
            {category !== 'Accounting' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
                  Negative numbers:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      checked={negativeStyle === 'minus'}
                      onChange={() => setNegativeStyle('minus')}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    -1234.10
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      checked={negativeStyle === 'parens'}
                      onChange={() => setNegativeStyle('parens')}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    (1234.10)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#d32f2f' }}>
                    <input
                      type="radio"
                      checked={negativeStyle === 'redMinus'}
                      onChange={() => setNegativeStyle('redMinus')}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    -1234.10
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#d32f2f' }}>
                    <input
                      type="radio"
                      checked={negativeStyle === 'redParens'}
                      onChange={() => setNegativeStyle('redParens')}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    (1234.10)
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
        
        {category === 'Date' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Type:
            </label>
            <select
              value={dateType}
              onChange={(e: any) => setDateType(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              {DATE_FORMATS.map(format => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>
        )}
        
        {category === 'Time' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Type:
            </label>
            <select
              value={timeType}
              onChange={(e: any) => setTimeType(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              {TIME_FORMATS.map(format => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>
        )}
        
        {category === 'Percentage' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Decimal places:
            </label>
            <input
              type="number"
              value={decimalPlaces}
              onChange={(e: any) => setDecimalPlaces(Number(e.target.value))}
              min="0"
              max="30"
              style={{
                width: '100px',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
        )}
        
        {category === 'Fraction' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Type:
            </label>
            <select
              value={fractionType}
              onChange={(e: any) => setFractionType(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              {FRACTION_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
        
        {category === 'Scientific' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Decimal places:
            </label>
            <input
              type="number"
              value={decimalPlaces}
              onChange={(e: any) => setDecimalPlaces(Number(e.target.value))}
              min="0"
              max="30"
              style={{
                width: '100px',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
        )}
        
        {category === 'Special' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Type:
            </label>
            <select
              value={specialType}
              onChange={(e: any) => setSpecialType(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              {SPECIAL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
        
        {category === 'Custom' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              Format code:
            </label>
            <input
              type="text"
              value={customFormatCode}
              onChange={(e: any) => setCustomFormatCode(e.target.value)}
              placeholder="Enter custom format code"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
              Example: #,##0.00;[Red]#,##0.00
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NumberTab;
