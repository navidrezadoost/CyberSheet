import type { CyberSheetFontConfig } from './globalConfig';

export type CyberSheetTabId =
  | 'home'
  | 'insert'
  | 'pageLayout'
  | 'formulas'
  | 'data'
  | 'review'
  | 'view'
  | 'automate'
  | 'help';

export type CyberSheetHomeGroupId =
  | 'clipboard'
  | 'font'
  | 'alignment'
  | 'number'
  | 'styles'
  | 'cells'
  | 'editing';

export interface CyberSheetHomeGroupsConfig {
  clipboard: boolean;
  font: boolean;
  alignment: boolean;
  number: boolean;
  styles: boolean;
  cells: boolean;
  editing: boolean;
}

export interface CyberSheetAppConfig {
  allowOpen: boolean;
  allowSave: boolean;
  allowExport: boolean;
  defaultFormat: 'xlsx' | 'csv';
  showRibbon: boolean;
  showFormulaBar: boolean;
  showSheetTabs: boolean;
  showStatusBar: boolean;
  showContextMenu: boolean;
  enabledTabs: CyberSheetTabId[];
  enabledGroups: CyberSheetHomeGroupsConfig;
  allowEdit: boolean;
  allowFormatting: boolean;
  allowFormulaEdit: boolean;
  enableComments: boolean;
  showCommentPanel: boolean;
  enableCustomComponents: boolean;
  authorName: string;
  authorAvatar?: string;
  eventFilter?: (event: string) => boolean;
}

export type CyberSheetConfigInput = Partial<CyberSheetAppConfig> & {
  fonts?: CyberSheetFontConfig;
};

export const RIBBON_TAB_LABELS: Record<CyberSheetTabId, string> = {
  home: 'Home',
  insert: 'Insert',
  pageLayout: 'Page Layout',
  formulas: 'Formulas',
  data: 'Data',
  review: 'Review',
  view: 'View',
  automate: 'Automate',
  help: 'Help',
};

export const RIBBON_TAB_ID_BY_LABEL: Record<string, CyberSheetTabId> = Object.fromEntries(
  Object.entries(RIBBON_TAB_LABELS).map(([id, label]) => [label, id as CyberSheetTabId]),
) as Record<string, CyberSheetTabId>;

export const DEFAULT_ENABLED_TABS: CyberSheetTabId[] = [
  'home',
  'insert',
  'pageLayout',
  'formulas',
  'data',
  'review',
  'view',
  'automate',
  'help',
];

export const DEFAULT_HOME_GROUPS: CyberSheetHomeGroupsConfig = {
  clipboard: true,
  font: true,
  alignment: true,
  number: true,
  styles: true,
  cells: true,
  editing: true,
};

export const DEFAULT_APP_CONFIG: CyberSheetAppConfig = {
  allowOpen: true,
  allowSave: true,
  allowExport: true,
  defaultFormat: 'xlsx',
  showRibbon: true,
  showFormulaBar: true,
  showSheetTabs: true,
  showStatusBar: true,
  showContextMenu: true,
  enabledTabs: DEFAULT_ENABLED_TABS,
  enabledGroups: DEFAULT_HOME_GROUPS,
  allowEdit: true,
  allowFormatting: true,
  allowFormulaEdit: true,
  enableComments: true,
  showCommentPanel: false,
  enableCustomComponents: true,
  authorName: 'You',
};

export function normalizeAppConfig(input?: Partial<CyberSheetAppConfig>): CyberSheetAppConfig {
  return {
    ...DEFAULT_APP_CONFIG,
    ...input,
    enabledTabs: input?.enabledTabs ?? DEFAULT_APP_CONFIG.enabledTabs,
    enabledGroups: {
      ...DEFAULT_HOME_GROUPS,
      ...input?.enabledGroups,
    },
  };
}

export function isTabEnabled(config: CyberSheetAppConfig, tabLabel: string): boolean {
  const tabId = RIBBON_TAB_ID_BY_LABEL[tabLabel];
  if (!tabId) return true;
  return config.enabledTabs.includes(tabId);
}

export function isHomeGroupEnabled(config: CyberSheetAppConfig, group: CyberSheetHomeGroupId): boolean {
  return config.enabledGroups[group] !== false;
}

export function getVisibleRibbonTabLabels(config: CyberSheetAppConfig): string[] {
  return config.enabledTabs.map((id) => RIBBON_TAB_LABELS[id]);
}
