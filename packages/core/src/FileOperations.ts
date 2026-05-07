/**
 * FileOperations.ts
 * 
 * Kernel-level file operations and metadata management
 * Framework-agnostic: Can be used by React, Angular, Vue, or vanilla JS
 * 
 * Provides:
 * - Workbook metadata management
 * - Version history tracking
 * - File listing (recent, pinned, shared)
 * - Permission management
 * - Export operations
 * - Application settings
 * 
 * Phase 6: Backstage File Menu Infrastructure
 */

// ─── Type Definitions ──────────────────────────────────────

export interface WorkbookMetadata {
  id: string;
  name: string;
  path: string;
  location: 'onedrive' | 'local' | 'sharepoint';
  size: number; // bytes
  created: Date;
  lastModified: Date;
  lastModifiedBy: string;
  author: string;
  sheets: number;
  tags: string[];
  isProtected: boolean;
  isMarkedFinal: boolean;
}

export interface WorkbookSnapshot {
  id: string;
  versionId: string;
  timestamp: Date;
  author: string;
  authorAvatar?: string;
  message?: string;
  isAutoSave: boolean;
  metadata: WorkbookMetadata;
  cellData: SerializedCellData; // Full grid state
  sheets: SerializedSheet[];
  namedRanges: SerializedNamedRange[];
  conditionalFormats: SerializedConditionalFormat[];
}

export interface SerializedCellData {
  [address: string]: {
    value: any;
    formula?: string;
    displayValue: string;
    style: SerializedCellStyle;
  };
}

export interface SerializedSheet {
  id: string;
  name: string;
  index: number;
  rowCount: number;
  colCount: number;
  hiddenRows: number[];
  hiddenColumns: number[];
  mergedRanges: SerializedMergedRange[];
  frozenRows: number;
  frozenColumns: number;
}

export interface SerializedCellStyle {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean | 'double';
  strikethrough?: boolean;
  fontColor?: string;
  fillColor?: string;
  fillPattern?: string;
  fillPatternColor?: string;
  fillGradient?: GradientConfig;
  horizontalAlign?: string;
  verticalAlign?: string;
  textRotation?: number;
  wrapText?: boolean;
  indent?: number;
  numberFormat?: string;
  borders?: SerializedBorders;
  locked?: boolean;
  hidden?: boolean;
}

export interface SerializedBorders {
  top?: { style: string; color: string };
  bottom?: { style: string; color: string };
  left?: { style: string; color: string };
  right?: { style: string; color: string };
  diagonalUp?: { style: string; color: string };
  diagonalDown?: { style: string; color: string };
  horizontal?: { style: string; color: string };
  vertical?: { style: string; color: string };
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  direction?: string;
  stops: { position: number; color: string }[];
}

export interface SerializedMergedRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SerializedNamedRange {
  name: string;
  range: string;
  scope: 'workbook' | string; // Sheet name if scoped
}

export interface SerializedConditionalFormat {
  id: string;
  priority: number;
  range: string;
  type: string;
  rule: any; // Serialized rule definition
}

export interface Permission {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'owner' | 'edit' | 'view';
  type: 'user' | 'link';
}

export interface VersionSummary {
  id: string;
  timestamp: Date;
  author: string;
  authorAvatar?: string;
  message?: string;
  isAutoSave: boolean;
  changeCount?: number;
}

export interface VersionChange {
  type: 'cell_change' | 'sheet_added' | 'sheet_deleted' | 'sheet_renamed' |
        'format_change' | 'formula_change' | 'range_insert' | 'range_delete' |
        'merge_change' | 'conditional_format_change';
  description: string;
  address?: string;
  sheetName?: string;
  oldValue?: any;
  newValue?: any;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  description: string;
  isBuiltIn: boolean;
  source?: string;
}

export interface RecentFile {
  id: string;
  name: string;
  path: string;
  location: 'onedrive' | 'local' | 'sharepoint';
  lastModified: Date;
  isPinned: boolean;
  sharedBy?: string;
  thumbnail?: string;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  isExpanded: boolean;
  filesCount?: number;
}

export interface ApplicationSettings {
  general: GeneralSettings;
  formulas: FormulaSettings;
  data: DataSettings;
  proofing: ProofingSettings;
  save: SaveSettings;
  language: LanguageSettings;
  advanced: AdvancedSettings;
  customizeRibbon: RibbonCustomization;
  quickAccessToolbar: QATCustomization;
  trustCenter: TrustCenterSettings;
}

// ─── Settings Sub-types ────────────────────────────────────

export interface GeneralSettings {
  showMiniToolbar: boolean;
  showQuickAnalysis: boolean;
  enableLivePreview: boolean;
  screenTipStyle: 'descriptions' | 'featuresOnly' | 'none';
  defaultFont: string;
  defaultFontSize: number;
  defaultSheets: number;
  userName: string;
  officeTheme: 'colorful' | 'darkGray' | 'black' | 'white';
  startScreen: 'showStart' | 'blankWorkbook' | 'openLast';
}

export interface FormulaSettings {
  calculationMode: 'automatic' | 'automaticExceptTables' | 'manual';
  enableIterativeCalculation: boolean;
  maxIterations: number;
  maxChange: number;
  r1c1Style: boolean;
  errorChecking: {
    enable: boolean;
    rules: {
      evaluateToError: boolean;
      textDateWithTwoDigitYear: boolean;
      numberStoredAsText: boolean;
      inconsistentFormula: boolean;
      formulaOmitsCells: boolean;
      unprotectedFormula: boolean;
    };
    errorIndicatorColor: string;
    resetIgnoredErrors: boolean;
  };
}

export interface DataSettings {
  detectDataTypes: boolean;
  autoRefreshConnections: boolean;
  connectionProperties: {
    enableBackgroundRefresh: boolean;
    refreshInterval: number;
  };
}

export interface ProofingSettings {
  autoCorrect: {
    correctTwoInitialCapitals: boolean;
    capitalizeFirstLetter: boolean;
    capitalizeNamesOfDays: boolean;
    correctAccidentalCapsLock: boolean;
    replaceTextAsYouType: boolean;
    replacements: { from: string; to: string }[];
  };
  spellCheck: {
    dictionaryLanguage: string;
    ignoreUppercase: boolean;
    ignoreNumbers: boolean;
    ignoreInternetAddresses: boolean;
  };
  grammarCheck: boolean;
}

export interface SaveSettings {
  autoSaveInterval: number; // 0 = disabled
  autoRecoverInterval: number;
  defaultFormat: 'xlsx' | 'ods' | 'csv';
  autoRecoverLocation: string;
  defaultLocalFileLocation: string;
  embedFontsInFile: boolean;
}

export interface LanguageSettings {
  displayLanguage: string;
  editingLanguages: string[];
  tooltipLanguage: 'matchDisplay' | string;
  screenTipLanguage: 'matchDisplay' | string;
}

export interface AdvancedSettings {
  editing: {
    afterPressEnterMoveDirection: 'down' | 'right' | 'up' | 'left';
    decimalPlaces: number;
    enableAutoComplete: boolean;
    enableAutoFill: boolean;
    allowCellDragAndDrop: boolean;
    alertBeforeOverwritingCells: boolean;
    extendDataRangeFormats: boolean;
    enableClickToAdd: boolean;
  };
  cutCopyPaste: {
    showPasteOptions: boolean;
    showInsertOptions: boolean;
    cutCopySortByOriginalPosition: boolean;
  };
  display: {
    showGridlines: boolean;
    gridlineColor: string;
    showRowColumnHeaders: boolean;
    showFormulaBar: boolean;
    showSheetTabs: boolean;
    showScrollBars: boolean;
    showPageBreaks: boolean;
    rulers: 'default' | 'inches' | 'cm' | 'mm';
    defaultColumnWidth: number;
    defaultRowHeight: number;
    forThisWorkbook: {
      showHorizontalScrollBar: boolean;
      showVerticalScrollBar: boolean;
    };
    forThisWorksheet: {
      showRowHeaders: boolean;
      showColumnHeaders: boolean;
      showGridlines: boolean;
      gridlineColor: string;
    };
  };
  formulas: {
    enableMultiThreadedCalculation: boolean;
    numberOfCalculationThreads: number;
    useAllProcessors: boolean;
    whenCalculating: 'automatic' | 'manual';
  };
  general: {
    provideFeedbackWithSound: boolean;
    provideFeedbackWithAnimation: boolean;
    confirmFileFormatConversion: boolean;
    updateAutomaticLinks: boolean;
    showAddInUserInterfaceErrors: boolean;
    webOptions: {
      allowPngAsOutput: boolean;
      loadPicturesFromWeb: boolean;
    };
  };
}

export interface RibbonCustomization {
  enabled: boolean;
  tabs: {
    id: string;
    label: string;
    groups: {
      id: string;
      label: string;
      commands: string[];
      visible: boolean;
    }[];
    visible: boolean;
  }[];
  customTabs: any[];
}

export interface QATCustomization {
  position: 'aboveRibbon' | 'belowRibbon';
  commands: string[];
  showLabels: boolean;
}

export interface TrustCenterSettings {
  macroSettings: {
    disableAllWithoutNotification: boolean;
    disableAllWithNotification: boolean;
    disableAllExceptDigitallySigned: boolean;
    enableAll: boolean;
    trustAccessToVbaProjectObjectModel: boolean;
  };
  activeXSettings: {
    disableAllWithoutNotification: boolean;
    promptBeforeEnabling: boolean;
    enableAll: boolean;
    safeMode: boolean;
  };
  trustedLocations: {
    path: string;
    subFolders: boolean;
    description: string;
  }[];
  trustedDocuments: boolean;
  privacyOptions: {
    checkFromMicrosoftUpdate: boolean;
    enableCustomerExperienceProgram: boolean;
    downloadContentFromOfficeCom: boolean;
  };
}

// ─── FileOperations Class ──────────────────────────────────

export class FileOperations {
  private currentWorkbook: WorkbookMetadata;
  private versionHistory: VersionSummary[] = [];
  private recentFiles: RecentFile[] = [];
  private pinnedFiles: RecentFile[] = [];
  private sharedFiles: RecentFile[] = [];
  private settings: ApplicationSettings;
  private permissions: Permission[] = [];
  private shareLink: string | null = null;

  constructor(initialMetadata: WorkbookMetadata) {
    this.currentWorkbook = initialMetadata;
    this.settings = this.getDefaultSettings();
  }

  // ─── Metadata ────────────────────────────────────────────

  getMetadata(): WorkbookMetadata {
    return { ...this.currentWorkbook };
  }

  updateMetadata(updates: Partial<WorkbookMetadata>): void {
    this.currentWorkbook = { ...this.currentWorkbook, ...updates };
  }

  // ─── Version Management ──────────────────────────────────

  getVersionHistory(): VersionSummary[] {
    return [...this.versionHistory];
  }

  getVersionSnapshot(versionId: string): WorkbookSnapshot | null {
    // In real implementation, fetch from storage
    return null;
  }

  getVersionChanges(versionId: string): VersionChange[] {
    // Compute diff between versionId and its predecessor
    return [];
  }

  restoreVersion(versionId: string): WorkbookSnapshot | null {
    const snapshot = this.getVersionSnapshot(versionId);
    if (snapshot) {
      // Apply snapshot to current workbook
      // Create a new version representing the restore action
    }
    return snapshot;
  }

  // ─── File Listing ────────────────────────────────────────

  getRecentFiles(): RecentFile[] {
    return [...this.recentFiles];
  }

  getPinnedFiles(): RecentFile[] {
    return [...this.pinnedFiles];
  }

  getSharedFiles(): RecentFile[] {
    return [...this.sharedFiles];
  }

  pinFile(fileId: string): void {
    const file = this.recentFiles.find(f => f.id === fileId);
    if (file) {
      file.isPinned = true;
      this.pinnedFiles.push(file);
    }
  }

  unpinFile(fileId: string): void {
    const file = this.recentFiles.find(f => f.id === fileId);
    if (file) {
      file.isPinned = false;
      this.pinnedFiles = this.pinnedFiles.filter(f => f.id !== fileId);
    }
  }

  // ─── Permissions ─────────────────────────────────────────

  getPermissions(): Permission[] {
    return [...this.permissions];
  }

  getShareLink(): string | null {
    return this.shareLink;
  }

  createShareLink(role: 'edit' | 'view'): string {
    this.shareLink = `https://1drv.ms/x/s!${this.currentWorkbook.id}?role=${role}`;
    return this.shareLink;
  }

  removeShareLink(): void {
    this.shareLink = null;
  }

  addPermission(email: string, role: 'edit' | 'view'): void {
    this.permissions.push({
      userId: `user_${Date.now()}`,
      userName: email,
      role,
      type: 'user',
    });
  }

  removePermission(userId: string): void {
    this.permissions = this.permissions.filter(p => p.userId !== userId);
  }

  // ─── Export ──────────────────────────────────────────────

  async exportWorkbook(format: ExportFormat, options?: ExportOptions): Promise<Blob> {
    // Integration with export library (ExcelJS, jsPDF, etc.)
    throw new Error('Export not yet connected to renderer');
  }

  // ─── Settings ────────────────────────────────────────────

  getSettings(): ApplicationSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  updateSettings(updates: Partial<ApplicationSettings>): void {
    this.settings = this.deepMerge(this.settings, updates);
  }

  resetSettingsToDefault(): void {
    this.settings = this.getDefaultSettings();
  }

  private getDefaultSettings(): ApplicationSettings {
    return {
      general: {
        showMiniToolbar: true,
        showQuickAnalysis: true,
        enableLivePreview: true,
        screenTipStyle: 'descriptions',
        defaultFont: 'Calibri',
        defaultFontSize: 11,
        defaultSheets: 1,
        userName: '',
        officeTheme: 'colorful',
        startScreen: 'showStart',
      },
      formulas: {
        calculationMode: 'automatic',
        enableIterativeCalculation: false,
        maxIterations: 100,
        maxChange: 0.001,
        r1c1Style: false,
        errorChecking: {
          enable: true,
          rules: {
            evaluateToError: true,
            textDateWithTwoDigitYear: true,
            numberStoredAsText: true,
            inconsistentFormula: true,
            formulaOmitsCells: true,
            unprotectedFormula: true,
          },
          errorIndicatorColor: '#007F00',
          resetIgnoredErrors: false,
        },
      },
      data: {
        detectDataTypes: true,
        autoRefreshConnections: false,
        connectionProperties: {
          enableBackgroundRefresh: true,
          refreshInterval: 60,
        },
      },
      proofing: {
        autoCorrect: {
          correctTwoInitialCapitals: true,
          capitalizeFirstLetter: true,
          capitalizeNamesOfDays: true,
          correctAccidentalCapsLock: true,
          replaceTextAsYouType: true,
          replacements: [],
        },
        spellCheck: {
          dictionaryLanguage: 'en-US',
          ignoreUppercase: true,
          ignoreNumbers: true,
          ignoreInternetAddresses: true,
        },
        grammarCheck: false,
      },
      save: {
        autoSaveInterval: 10,
        autoRecoverInterval: 10,
        defaultFormat: 'xlsx',
        autoRecoverLocation: '',
        defaultLocalFileLocation: '',
        embedFontsInFile: false,
      },
      language: {
        displayLanguage: 'en-US',
        editingLanguages: ['en-US'],
        tooltipLanguage: 'matchDisplay',
        screenTipLanguage: 'matchDisplay',
      },
      advanced: {
        editing: {
          afterPressEnterMoveDirection: 'down',
          decimalPlaces: 2,
          enableAutoComplete: true,
          enableAutoFill: true,
          allowCellDragAndDrop: true,
          alertBeforeOverwritingCells: true,
          extendDataRangeFormats: true,
          enableClickToAdd: false,
        },
        cutCopyPaste: {
          showPasteOptions: true,
          showInsertOptions: true,
          cutCopySortByOriginalPosition: false,
        },
        display: {
          showGridlines: true,
          gridlineColor: '#D9D9D9',
          showRowColumnHeaders: true,
          showFormulaBar: true,
          showSheetTabs: true,
          showScrollBars: true,
          showPageBreaks: false,
          rulers: 'default',
          defaultColumnWidth: 64, // pixels
          defaultRowHeight: 20, // pixels
          forThisWorkbook: {
            showHorizontalScrollBar: true,
            showVerticalScrollBar: true,
          },
          forThisWorksheet: {
            showRowHeaders: true,
            showColumnHeaders: true,
            showGridlines: true,
            gridlineColor: '#D9D9D9',
          },
        },
        formulas: {
          enableMultiThreadedCalculation: true,
          numberOfCalculationThreads: 4,
          useAllProcessors: true,
          whenCalculating: 'automatic',
        },
        general: {
          provideFeedbackWithSound: false,
          provideFeedbackWithAnimation: true,
          confirmFileFormatConversion: true,
          updateAutomaticLinks: true,
          showAddInUserInterfaceErrors: false,
          webOptions: {
            allowPngAsOutput: false,
            loadPicturesFromWeb: true,
          },
        },
      },
      customizeRibbon: {
        enabled: true,
        tabs: [
          {
            id: 'home',
            label: 'Home',
            groups: [
              { id: 'clipboard', label: 'Clipboard', commands: ['cut', 'copy', 'paste', 'formatPainter'], visible: true },
              { id: 'font', label: 'Font', commands: ['fontFace', 'fontSize', 'bold', 'italic', 'underline', 'fontColor', 'fillColor'], visible: true },
              { id: 'alignment', label: 'Alignment', commands: ['alignLeft', 'center', 'alignRight', 'top', 'middle', 'bottom', 'wrapText', 'mergeAndCenter'], visible: true },
              { id: 'number', label: 'Number', commands: ['numberFormat', 'currency', 'percent', 'commaStyle', 'increaseDecimal', 'decreaseDecimal'], visible: true },
              { id: 'styles', label: 'Styles', commands: ['conditionalFormatting', 'formatAsTable', 'cellStyles'], visible: true },
              { id: 'cells', label: 'Cells', commands: ['insert', 'delete', 'format'], visible: true },
              { id: 'editing', label: 'Editing', commands: ['autoSum', 'fill', 'clear', 'sortFilter', 'findSelect'], visible: true },
            ],
            visible: true,
          },
        ],
        customTabs: [],
      },
      quickAccessToolbar: {
        position: 'aboveRibbon',
        commands: ['save', 'undo', 'redo'],
        showLabels: false,
      },
      trustCenter: {
        macroSettings: {
          disableAllWithoutNotification: false,
          disableAllWithNotification: true,
          disableAllExceptDigitallySigned: false,
          enableAll: false,
          trustAccessToVbaProjectObjectModel: false,
        },
        activeXSettings: {
          disableAllWithoutNotification: false,
          promptBeforeEnabling: true,
          enableAll: false,
          safeMode: false,
        },
        trustedLocations: [],
        trustedDocuments: false,
        privacyOptions: {
          checkFromMicrosoftUpdate: false,
          enableCustomerExperienceProgram: false,
          downloadContentFromOfficeCom: true,
        },
      },
    };
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key of Object.keys(source) as (keyof T)[]) {
      if (source[key] !== undefined && source[key] !== null) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] as any, source[key] as any);
        } else {
          result[key] = source[key] as T[keyof T];
        }
      }
    }
    return result;
  }
}

export type ExportFormat = 'xlsx' | 'pdf' | 'csv' | 'ods' | 'txt' | 'html';

export interface ExportOptions {
  csv?: { delimiter: ',' | ';' | '\t'; includeHeaders: boolean };
  pdf?: { orientation: 'portrait' | 'landscape'; fitToPage: boolean; paperSize: string };
  html?: { includeGridlines: boolean };
}
