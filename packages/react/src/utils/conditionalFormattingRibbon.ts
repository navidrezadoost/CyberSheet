import type {
  ConditionalFormattingRule,
  ConditionalStyle,
  CommandManager,
  ExcelIconSet,
  Range,
  Worksheet,
} from '@cyber-sheet/core';
import { CF_COLOR_SCALES, SetConditionalFormattingRulesCommand } from '@cyber-sheet/core';

export type QuickRuleKind =
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'equalTo'
  | 'textContains'
  | 'dateOccurring'
  | 'duplicateValues'
  | 'top10'
  | 'top10Percent'
  | 'bottom10'
  | 'bottom10Percent'
  | 'aboveAverage'
  | 'belowAverage';

export const CF_FORMAT_PRESETS: Record<string, { label: string; style: ConditionalStyle }> = {
  lightRedDarkRedText: { label: 'Light Red Fill with Dark Red Text', style: { fillColor: '#FFC7CE', fontColor: '#9C0006' } },
  yellowDarkYellowText: { label: 'Yellow Fill with Dark Yellow Text', style: { fillColor: '#FFEB9C', fontColor: '#9C6500' } },
  greenDarkGreenText: { label: 'Green Fill with Dark Green Text', style: { fillColor: '#C6EFCE', fontColor: '#006100' } },
  lightRedFill: { label: 'Light Red Fill', style: { fillColor: '#FFC7CE' } },
  redText: { label: 'Red Text', style: { fontColor: '#FF0000' } },
};

export const DEFAULT_CF_FORMAT_KEY = 'lightRedDarkRedText';

const DEFAULT_ICON_THRESHOLDS_3 = [
  { value: 67, type: 'percent' as const, operator: '>=' as const, icon: 'up' },
  { value: 33, type: 'percent' as const, operator: '>=' as const, icon: 'flat' },
  { value: 0, type: 'percent' as const, operator: '>=' as const, icon: 'down' },
];

const DEFAULT_ICON_THRESHOLDS_4 = [
  { value: 75, type: 'percent' as const, operator: '>=' as const, icon: '0' },
  { value: 50, type: 'percent' as const, operator: '>=' as const, icon: '1' },
  { value: 25, type: 'percent' as const, operator: '>=' as const, icon: '2' },
  { value: 0, type: 'percent' as const, operator: '>=' as const, icon: '3' },
];

const DEFAULT_ICON_THRESHOLDS_5 = [
  { value: 80, type: 'percent' as const, operator: '>=' as const, icon: '0' },
  { value: 60, type: 'percent' as const, operator: '>=' as const, icon: '1' },
  { value: 40, type: 'percent' as const, operator: '>=' as const, icon: '2' },
  { value: 20, type: 'percent' as const, operator: '>=' as const, icon: '3' },
  { value: 0, type: 'percent' as const, operator: '>=' as const, icon: '4' },
];

export const ICON_SET_MAP: Record<string, ExcelIconSet> = {
  threeArrows: '3-arrows',
  threeArrowsGray: '3-arrows-gray',
  threeTriangles: '3-triangles',
  threeFlags: '3-flags',
  threeTrafficLights: '3-traffic-lights',
  threeStars: '3-stars',
  fourArrows: '4-arrows',
  fiveArrows: '5-arrows',
};

export const COLOR_SCALE_MAP: Record<string, keyof typeof CF_COLOR_SCALES> = {
  greenYellowRed: 'green-yellow-red',
  redYellowGreen: 'red-yellow-green',
  greenWhiteRed: 'green-white-red',
  redWhiteGreen: 'red-white-green',
  blueWhiteRed: 'blue-white-red',
  redWhiteBlue: 'blue-white-red',
};

export function normalizeRange(range: Range): Range {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  };
}

export function colToLetter(col: number): string {
  let letters = '';
  let value = col;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

export function formatRangeA1(range: Range): string {
  const start = `${colToLetter(range.start.col)}${range.start.row}`;
  const end = `${colToLetter(range.end.col)}${range.end.row}`;
  return start === end ? start : `${start}:${end}`;
}

export function resolveTableDataRange(worksheet: Worksheet, selection: Range | null): Range | null {
  if (selection) {
    const normalized = normalizeRange(selection);
    const multiCell =
      normalized.end.row > normalized.start.row ||
      normalized.end.col > normalized.start.col;
    if (multiCell) return normalized;
  }

  const used = worksheet.getUsedRange();
  if (!used) return null;

  const contiguous = worksheet.getContiguousRange(used.start);
  return contiguous ? normalizeRange(contiguous) : normalizeRange(used);
}

export function inferHasHeaders(worksheet: Worksheet, range: Range): boolean {
  let textCount = 0;
  let total = 0;
  for (let col = range.start.col; col <= range.end.col; col++) {
    const value = worksheet.getCellValue({ row: range.start.row, col });
    total += 1;
    if (value == null || value === '') continue;
    if (typeof value === 'string') textCount += 1;
    if (typeof value !== 'number') textCount += 1;
  }
  return total > 0 && textCount >= total / 2;
}

function nextRuleId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function iconThresholdsForSet(iconSet: ExcelIconSet) {
  if (iconSet.startsWith('5-')) return DEFAULT_ICON_THRESHOLDS_5;
  if (iconSet.startsWith('4-')) return DEFAULT_ICON_THRESHOLDS_4;
  return DEFAULT_ICON_THRESHOLDS_3;
}

export function buildGalleryRule(
  category: 'dataBars' | 'colorScales' | 'iconSets',
  ruleId: string,
): ConditionalFormattingRule | null {
  switch (category) {
    case 'dataBars': {
      const colors: Record<string, string> = {
        blueDataBar: '#4472C4',
        greenDataBar: '#70AD47',
        redDataBar: '#FF0000',
        orangeDataBar: '#ED7D31',
        lightBlueDataBar: '#5B9BD5',
        purpleDataBar: '#7030A0',
      };
      const color = colors[ruleId];
      if (!color) return null;
      const gradient = !ruleId.endsWith('Solid');
      return {
        id: nextRuleId('data-bar'),
        type: 'data-bar',
        color,
        gradient,
        showValue: true,
        priority: 10,
      };
    }
    case 'colorScales': {
      const preset = COLOR_SCALE_MAP[ruleId];
      if (!preset) return null;
      const scale = CF_COLOR_SCALES[preset];
      return {
        id: nextRuleId('color-scale'),
        type: 'color-scale',
        preset,
        minColor: scale.min,
        midColor: 'mid' in scale ? scale.mid : undefined,
        maxColor: scale.max,
        priority: 10,
      };
    }
    case 'iconSets': {
      const iconSet = ICON_SET_MAP[ruleId];
      if (!iconSet) return null;
      return {
        id: nextRuleId('icon-set'),
        type: 'icon-set',
        iconSet,
        thresholds: iconThresholdsForSet(iconSet),
        priority: 10,
      };
    }
    default:
      return null;
  }
}

export function buildQuickRule(
  kind: QuickRuleKind,
  options: {
    value?: string;
    value2?: string;
    formatKey?: string;
    datePeriod?: string;
    duplicateMode?: 'duplicate' | 'unique';
    rank?: number;
    rankIsPercent?: boolean;
  },
): ConditionalFormattingRule {
  const style = CF_FORMAT_PRESETS[options.formatKey ?? DEFAULT_CF_FORMAT_KEY]?.style ?? CF_FORMAT_PRESETS.lightRedDarkRedText.style;
  const id = nextRuleId('cf');

  switch (kind) {
    case 'greaterThan':
      return { id, type: 'value', operator: '>', value: Number(options.value ?? 0), style, priority: 20 };
    case 'lessThan':
      return { id, type: 'value', operator: '<', value: Number(options.value ?? 0), style, priority: 20 };
    case 'between':
      return {
        id,
        type: 'value',
        operator: 'between',
        value: Number(options.value ?? 0),
        value2: Number(options.value2 ?? 0),
        style,
        priority: 20,
      };
    case 'equalTo':
      return { id, type: 'value', operator: '=', value: options.value ?? '', style, priority: 20 };
    case 'textContains':
      return { id, type: 'text', mode: 'contains', text: options.value ?? '', style, priority: 20 };
    case 'dateOccurring':
      return {
        id,
        type: 'date-occurring',
        timePeriod: (options.datePeriod ?? 'today') as any,
        style,
        priority: 20,
      };
    case 'duplicateValues':
      return {
        id,
        type: 'duplicate-unique',
        mode: options.duplicateMode ?? 'duplicate',
        style,
        priority: 20,
      };
    case 'top10':
      return { id, type: 'top-bottom', mode: 'top', rankType: 'number', rank: options.rank ?? 10, style, priority: 20 };
    case 'top10Percent':
      return {
        id,
        type: 'top-bottom',
        mode: 'top',
        rankType: options.rankIsPercent === false ? 'number' : 'percent',
        rank: options.rank ?? 10,
        style,
        priority: 20,
      };
    case 'bottom10':
      return { id, type: 'top-bottom', mode: 'bottom', rankType: 'number', rank: options.rank ?? 10, style, priority: 20 };
    case 'bottom10Percent':
      return {
        id,
        type: 'top-bottom',
        mode: 'bottom',
        rankType: options.rankIsPercent === false ? 'number' : 'percent',
        rank: options.rank ?? 10,
        style,
        priority: 20,
      };
    case 'aboveAverage':
      return { id, type: 'above-average', mode: 'above', style, priority: 20 };
    case 'belowAverage':
      return { id, type: 'above-average', mode: 'below', style, priority: 20 };
    default:
      return { id, type: 'value', operator: '>', value: 0, style, priority: 20 };
  }
}

function rangeOverlaps(ruleRange: Range | undefined, target: Range): boolean {
  if (!ruleRange) return false;
  return !(
    ruleRange.end.row < target.start.row ||
    ruleRange.start.row > target.end.row ||
    ruleRange.end.col < target.start.col ||
    ruleRange.start.col > target.end.col
  );
}

function rulesOutsideRange(worksheet: Worksheet, range: Range): ConditionalFormattingRule[] {
  const normalized = normalizeRange(range);
  return worksheet.getConditionalFormattingRules().filter((rule) => {
    const ruleRange = rule.ranges?.[0];
    if (!ruleRange) return true;
    return !rangeOverlaps(ruleRange, normalized);
  });
}

export function executeConditionalFormattingRules(
  worksheet: Worksheet,
  commandManager: CommandManager,
  nextRules: ConditionalFormattingRule[],
  description = 'Conditional Formatting',
): void {
  commandManager.execute(new SetConditionalFormattingRulesCommand(worksheet, nextRules, description));
}

export function addConditionalRule(
  worksheet: Worksheet,
  commandManager: CommandManager,
  range: Range,
  rule: ConditionalFormattingRule,
): void {
  const normalized = normalizeRange(range);
  const withRange: ConditionalFormattingRule = {
    ...rule,
    ranges: [normalized],
  };
  const current = worksheet.getConditionalFormattingRules();
  executeConditionalFormattingRules(
    worksheet,
    commandManager,
    [...current, withRange],
    'Add Conditional Formatting Rule',
  );
}

export function applyPreviewRules(
  worksheet: Worksheet,
  range: Range,
  rules: ConditionalFormattingRule[],
): ConditionalFormattingRule[] {
  const previous = worksheet.getConditionalFormattingRules();
  const normalized = normalizeRange(range);
  const withoutOverlap = previous.filter((rule) => {
    const ruleRange = rule.ranges?.[0];
    if (!ruleRange) return true;
    const overlaps = !(
      ruleRange.end.row < normalized.start.row ||
      ruleRange.start.row > normalized.end.row ||
      ruleRange.end.col < normalized.start.col ||
      ruleRange.start.col > normalized.end.col
    );
    return !overlaps;
  });
  const previewRules = [
    ...withoutOverlap,
    ...rules.map((rule) => ({ ...rule, ranges: [normalized] })),
  ];
  worksheet.setConditionalFormattingRules(previewRules);
  return previous;
}

export function restoreConditionalRules(worksheet: Worksheet, rules: ConditionalFormattingRule[]): void {
  worksheet.setConditionalFormattingRules(rules);
}

export function clearRulesFromRange(
  worksheet: Worksheet,
  commandManager: CommandManager,
  range: Range,
): void {
  executeConditionalFormattingRules(
    worksheet,
    commandManager,
    rulesOutsideRange(worksheet, range),
    'Clear Conditional Formatting Rules',
  );
}

export function clearAllConditionalRules(
  worksheet: Worksheet,
  commandManager: CommandManager,
): void {
  executeConditionalFormattingRules(worksheet, commandManager, [], 'Clear Conditional Formatting Rules');
}

export function needsQuickRuleDialog(category: string): boolean {
  return category === 'highlight' || category === 'topBottom';
}

export function toQuickRuleKind(category: string, ruleId: string): QuickRuleKind | null {
  if (category === 'highlight') {
    if (ruleId === 'uniqueValues') return 'duplicateValues';
    return ruleId as QuickRuleKind;
  }
  if (category === 'topBottom') {
    return ruleId as QuickRuleKind;
  }
  return null;
}

export function quickRuleNeedsValueInput(kind: QuickRuleKind): boolean {
  return ['greaterThan', 'lessThan', 'between', 'equalTo', 'textContains'].includes(kind);
}

export function quickRuleNeedsRankInput(kind: QuickRuleKind): boolean {
  return ['top10', 'top10Percent', 'bottom10', 'bottom10Percent'].includes(kind);
}
