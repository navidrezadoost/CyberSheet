import React, { useMemo, useState } from 'react';
import type { ConditionalFormattingRule, CommandManager, Range, Worksheet } from '@cyber-sheet/core';
import { SetConditionalFormattingRulesCommand } from '@cyber-sheet/core';
import { ConditionalFormattingRuleManager } from '../../conditional-formatting/ConditionalFormattingRuleManager';
import { ConditionalFormattingRuleBuilder } from '../../conditional-formatting/ConditionalFormattingRuleBuilder';

export interface ConditionalFormattingManagerDialogProps {
  isOpen: boolean;
  worksheet: Worksheet;
  commandManager: CommandManager;
  selectedRange: Range | null;
  onClose: () => void;
  onRulesChanged: () => void;
  openBuilderOnMount?: boolean;
}

export const ConditionalFormattingManagerDialog: React.FC<ConditionalFormattingManagerDialogProps> = ({
  isOpen,
  worksheet,
  commandManager,
  selectedRange,
  onClose,
  onRulesChanged,
  openBuilderOnMount = false,
}) => {
  const [rules, setRules] = useState<ConditionalFormattingRule[]>([]);
  const [editingRule, setEditingRule] = useState<{ rule: ConditionalFormattingRule | null; index: number | null }>({
    rule: null,
    index: null,
  });
  const [showBuilder, setShowBuilder] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setRules(worksheet.getConditionalFormattingRules());
      setEditingRule({ rule: null, index: null });
      setShowBuilder(openBuilderOnMount);
    }
  }, [isOpen, worksheet, openBuilderOnMount]);

  const builderRange = useMemo(() => {
    if (selectedRange) return selectedRange;
    return rules[0]?.ranges?.[0] ?? null;
  }, [selectedRange, rules]);

  const persistRules = (nextRules: ConditionalFormattingRule[]) => {
    commandManager.execute(
      new SetConditionalFormattingRulesCommand(worksheet, nextRules, 'Manage Conditional Formatting Rules'),
    );
    setRules(nextRules);
    onRulesChanged();
  };

  if (!isOpen) return null;

  if (showBuilder) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.35)',
          zIndex: 10015,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onMouseDown={() => setShowBuilder(false)}
      >
        <div
          style={{
            width: 'min(720px, 95vw)',
            maxHeight: '90vh',
            overflow: 'auto',
            background: '#fff',
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
            padding: 16,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div style={{ fontWeight: 600, marginBottom: 12, fontFamily: 'Segoe UI, Arial, sans-serif' }}>
            {editingRule.rule ? 'Edit Formatting Rule' : 'New Formatting Rule'}
          </div>
          <ConditionalFormattingRuleBuilder
            rule={editingRule.rule}
            selectedRange={builderRange}
            onCancel={() => setShowBuilder(false)}
            onSave={(rule) => {
              const next = [...rules];
              if (editingRule.index != null) {
                next[editingRule.index] = {
                  ...rule,
                  ranges: rule.ranges ?? editingRule.rule?.ranges ?? (builderRange ? [builderRange] : []),
                };
              } else {
                next.push({
                  ...rule,
                  ranges: rule.ranges ?? (builderRange ? [builderRange] : []),
                });
              }
              persistRules(next);
              setShowBuilder(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.35)',
        zIndex: 10014,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: 'min(760px, 95vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: '#fff',
          border: '1px solid #d0d0d0',
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          fontFamily: 'Segoe UI, Arial, sans-serif',
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600, fontSize: 14 }}>
          Conditional Formatting Rules Manager
        </div>
        <div style={{ padding: 16 }}>
          <ConditionalFormattingRuleManager
            rules={rules}
            showRanges
            onReorder={persistRules}
            onEdit={(rule, index) => {
              setEditingRule({ rule, index });
              setShowBuilder(true);
            }}
            onDelete={(ruleId, index) => {
              persistRules(rules.filter((_, i) => i !== index));
            }}
            onDuplicate={(rule, index) => {
              const copy = {
                ...rule,
                id: `${rule.id ?? 'rule'}-copy-${Date.now()}`,
              };
              const next = [...rules];
              next.splice(index + 1, 0, copy);
              persistRules(next);
            }}
            onCreateNew={() => {
              setEditingRule({ rule: null, index: null });
              setShowBuilder(true);
            }}
          />
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 18px', border: '1px solid #d0d0d0', background: '#fff', borderRadius: 3, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
