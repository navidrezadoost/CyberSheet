/**
 * Excel 365-like Ribbon UI Components
 * 
 * Production-level implementation matching Excel Online exactly:
 * - Fluent UI icons (@fluentui/react-icons)
 * - Exact color palette extracted from Excel
 * - Proper component abstractions (no maintenance chaos)
 * - Command Pattern integration with @cyber-sheet/core
 * - WCAG 2.1 AA accessibility compliance
 * 
 * Implementation Status:
 * ✅ Phase 1, Week 1: Undo/Redo + Font Formatting + Font Color Picker
 * 
 * Usage:
 * ```tsx
 * import { Ribbon } from '@cyber-sheet/react/components/ribbon';
 * 
 * <Ribbon 
 *   commandManager={workbook.commandManager} 
 *   selection={getCurrentSelection()} 
 * />
 * ```
 */

// Main components
export { Ribbon, type RibbonProps } from './Ribbon';
export { HomeTab, type HomeTabProps } from './HomeTab';

// Building blocks
export { RibbonButton, type RibbonButtonProps } from './RibbonButton';
export { RibbonGroup, type RibbonGroupProps } from './RibbonGroup';
export { RibbonSelect, type RibbonSelectProps } from './RibbonSelect';
export { RibbonRow, type RibbonRowProps } from './RibbonRow';
export { RibbonToggleGroup, type RibbonToggleGroupProps, HorizontalAlignGroup, VerticalAlignGroup } from './RibbonToggleGroup';

// Feature groups
export { AlignmentGroup, type AlignmentGroupProps } from './AlignmentGroup';

// Number format components
export { NumberFormatButton, type NumberFormatButtonProps } from './NumberFormatButton';
export { NumberFormatDropdown, type NumberFormatDropdownProps } from './NumberFormatDropdown';
export { DropdownList, DropdownListWithSeparator, type DropdownListProps, type DropdownListItem } from './DropdownList';

// Color picker components
export { FontColorButton, type FontColorButtonProps } from './FontColorButton';
export { FillColorButton, type FillColorButtonProps } from './FillColorButton';
export { BorderButton, type BorderButtonProps } from './BorderButton';
export { ColorGrid, type ColorGridProps } from './ColorGrid';
export { ColorDropdown, type ColorDropdownProps } from './ColorDropdown';
export { PatternGrid, type PatternGridProps } from './PatternGrid';
export { LineStyleGrid, type LineStyleGridProps } from './LineStyleGrid';
export { BorderPresetGrid, type BorderPresetGridProps } from './BorderPresetGrid';
export { BorderDropdown, type BorderDropdownProps } from './BorderDropdown';

// Hooks
export { useRecentColors } from './hooks/useRecentColors';
export { useRecentFills } from './hooks/useRecentFills';
export { useGridNavigation, useListNavigation, type UseGridNavigationOptions, type UseGridNavigationResult } from './hooks/useGridNavigation';
export { useKeyboardShortcuts, useContextDetector, useDisableShortcut, type UseKeyboardShortcutsOptions } from './hooks/useKeyboardShortcuts';

// Keyboard Shortcut System
export { ShortcutRegistry, shortcutRegistry, parseKeyboardEvent, shortcutToString, parseShortcutString, type ShortcutDebugConfig } from './keyboard/ShortcutRegistry';
export { ContextResolver, contextResolver } from './keyboard/ContextResolver';
export { registerStandardShortcuts, STANDARD_SHORTCUTS, BOLD_SHORTCUT, ITALIC_SHORTCUT, UNDERLINE_SHORTCUT, UNDO_SHORTCUT, REDO_SHORTCUT } from './keyboard/shortcuts';
export type { InteractionContext, ShortcutContext, ShortcutDefinition, ParsedShortcut, IShortcutRegistry, IContextResolver } from './keyboard/types';

// Behavioral Validation (Test Harness)
export { shortcutEventRecorder, ShortcutEventRecorder, type RecordedShortcutEvent, type EventSequence, type ReplayResult, type ReplayOptions, type SequenceAnalysis, type FailureType, type FailureSeverity, type ClassifiedFailure } from './keyboard/ShortcutEventRecorder';
export { KeyboardContextOverlay, KeyboardContextBadge, type KeyboardContextOverlayProps } from './keyboard/KeyboardContextOverlay';
export { diagnostics, printReplayResult, printSequenceAnalysis, exportDiagnosticReport } from './keyboard/DiagnosticReporter';

// Utilities
export { resolveColor, isValidHexColor, normalizeColor, isMixedState, getDisplayColor } from './colorUtils';
export { resolveFill, isMixedFill, getDisplayFill, fillEquals, serializeFill, deserializeFill, getPrimaryColor } from './fillUtils';
export { resolveBorder, borderEquals, serializeBorder, deserializeBorder, isMixedBorder, getDisplayBorder, getBorderColor, withBorderColor, withBorderStyle, getBorderOperationDescription } from './borderUtils';
export { resolveNumberFormat, isMixedNumberFormat, getDisplayNumberFormat, serializeNumberFormat, deserializeNumberFormat, validateNumberFormatValue, getNumberFormatDescription, isNumericFormat, isDateTimeFormat, inferFormatType } from './numberFormatUtils';
export { resolveStyleState, isMixedState as isMixedStyleState, getDisplayValue, hasDefinedValue, resolveAlignment, resolveBoolean, updateStyleState, mergeStyleStates } from './styleStateUtils';

// Shared components
export { DropdownSection, type DropdownSectionProps } from './DropdownSection';

// Constants
export { THEME_COLORS, STANDARD_COLORS, AUTOMATIC_COLOR, NO_FILL_COLOR } from './colors';
export { PATTERN_TYPES, GRADIENT_PRESETS, NO_FILL, solidFill, patternFill, gradientFill, isSolidFill, isPatternFill, isGradientFill } from './fillTypes';
export { LINE_STYLES, BORDER_PRESETS, borderValue, getDefaultBorder, getPresetById, resolvePreset, getLineStyleMetadata } from './borderTypes';
export { NUMBER_FORMAT_PRESETS, NUMBER_FORMAT_CATEGORIES, numberFormatValue, getDefaultNumberFormat, getPresetById as getNumberFormatPresetById, getPresetByFormatString, isStandardFormat, getDisplayLabel, validateFormatString, getCategoryForType, getCategoryForFormat, createCustomFormat, numberFormatEquals } from './numberFormatTypes';
export type { Fill, PatternType, GradientStop, GradientDirection, PatternMetadata } from './fillTypes';
export type { BorderStyle, BorderPosition, BorderPreset, BorderValue, BorderPayload, BorderPresetConfig } from './borderTypes';
export type { NumberFormatType, NumberFormatValue, NumberFormatPreset } from './numberFormatTypes';

// Types
export type {
  ColorValue,
  StyleState,
  FontColorCommand,
  FillColorCommand,
  BorderCommand,
  NumberFormatCommand,
  SelectionState,
  CommandManager,
} from './types';

// Command contracts (strict typing)
export type {
  Command,
  FontColorPayload,
  FillPayload,
  BorderOperation,
  BorderPayload,
  AlignmentPayload,
  AlignmentCommand,
  CommandExecutionContext,
} from './commandContract';
export { isCommand, validatePayload } from './commandContract';

