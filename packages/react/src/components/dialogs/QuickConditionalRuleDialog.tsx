import React, { useEffect, useState } from 'react';
import type { ConditionalFormattingRule } from '@cyber-sheet/core';
import {
  CF_FORMAT_PRESETS,
  DEFAULT_CF_FORMAT_KEY,
  buildQuickRule,
  type QuickRuleKind,
  quickRuleNeedsRankInput,
  quickRuleNeedsValueInput,
} from '../../utils/conditionalFormattingRibbon';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.35)',
  zIndex: 10014,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 420,
  maxWidth: '95vw',
  background: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: 13,
  color: '#222',
};

const DATE_PERIODS = [
  'today',
  'yesterday',
  'tomorrow',
  'last-7-days',
  'last-week',
  'this-week',
  'next-week',
  'last-month',
  'this-month',
  'next-month',
] as const;

const DATE_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  'last-7-days': 'In the last 7 days',
  'last-week': 'Last week',
  'this-week': 'This week',
  'next-week': 'Next week',
  'last-month': 'Last month',
  'this-month': 'This month',
  'next-month': 'Next month',
};

export interface QuickConditionalRuleDialogProps {
  isOpen: boolean;
  kind: QuickRuleKind;
  onClose: () => void;
  onApply: (rule: ConditionalFormattingRule) => void;
}

export const QuickConditionalRuleDialog: React.FC<QuickConditionalRuleDialogProps> = ({
  isOpen,
  kind,
  onClose,
  onApply,
}) => {
  const [value, setValue] = useState('10');
  const [value2, setValue2] = useState('20');
  const [formatKey, setFormatKey] = useState(DEFAULT_CF_FORMAT_KEY);
  const [datePeriod, setDatePeriod] = useState<string>('today');
  const [duplicateMode, setDuplicateMode] = useState<'duplicate' | 'unique'>('duplicate');
  const [rank, setRank] = useState('10');
  const [rankIsPercent, setRankIsPercent] = useState(kind.includes('Percent'));

  useEffect(() => {
    if (!isOpen) return;
    setValue('10');
    setValue2('20');
    setFormatKey(DEFAULT_CF_FORMAT_KEY);
    setDatePeriod('today');
    setDuplicateMode('duplicate');
    setRank('10');
    setRankIsPercent(kind.includes('Percent'));
  }, [isOpen, kind]);

  if (!isOpen) return null;

  const titleMap: Partial<Record<QuickRuleKind, string>> = {
    greaterThan: 'Greater Than',
    lessThan: 'Less Than',
    between: 'Between',
    equalTo: 'Equal To',
    textContains: 'Text that Contains',
    dateOccurring: 'A Date Occurring',
    duplicateValues: 'Duplicate Values',
    top10: 'Top 10 Items',
    top10Percent: 'Top 10%',
    bottom10: 'Bottom 10 Items',
    bottom10Percent: 'Bottom 10%',
    aboveAverage: 'Above Average',
    belowAverage: 'Below Average',
  };

  const handleOk = () => {
    const rule = buildQuickRule(kind, {
      value,
      value2,
      formatKey,
      datePeriod,
      duplicateMode,
      rank: Number(rank),
      rankIsPercent,
    });
    onApply(rule);
    onClose();
  };

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={dialogStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>
          {titleMap[kind] ?? 'Conditional Formatting'}
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {quickRuleNeedsValueInput(kind) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ minWidth: 70 }}>{kind === 'between' ? 'Min' : 'Value'}</label>
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
              />
              {kind === 'between' && (
                <>
                  <span>and</span>
                  <input
                    value={value2}
                    onChange={(event) => setValue2(event.target.value)}
                    style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
                  />
                </>
              )}
            </div>
          )}

          {kind === 'dateOccurring' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ minWidth: 70 }}>Date</label>
              <select
                value={datePeriod}
                onChange={(event) => setDatePeriod(event.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
              >
                {DATE_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {DATE_LABELS[period]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === 'duplicateValues' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ minWidth: 70 }}>Format</label>
              <select
                value={duplicateMode}
                onChange={(event) => setDuplicateMode(event.target.value as 'duplicate' | 'unique')}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
              >
                <option value="duplicate">Duplicate</option>
                <option value="unique">Unique</option>
              </select>
            </div>
          )}

          {quickRuleNeedsRankInput(kind) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ minWidth: 70 }}>Rank</label>
              <input
                type="number"
                min={1}
                value={rank}
                onChange={(event) => setRank(event.target.value)}
                style={{ width: 80, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
              />
              <select
                value={rankIsPercent ? 'percent' : 'items'}
                onChange={(event) => setRankIsPercent(event.target.value === 'percent')}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
              >
                <option value="items">Items</option>
                <option value="percent">%</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 70 }}>With</label>
            <select
              value={formatKey}
              onChange={(event) => setFormatKey(event.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 3 }}
            >
              {Object.entries(CF_FORMAT_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 18px', border: '1px solid #d0d0d0', background: '#fff', borderRadius: 3, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={handleOk} style={{ padding: '6px 18px', border: '1px solid #0078d4', background: '#0078d4', color: '#fff', borderRadius: 3, cursor: 'pointer' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
