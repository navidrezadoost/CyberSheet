// src/components/backstage/panels/OptionsPanel.tsx

import React, { useState, useCallback } from 'react';
import { SmilodonNativeSelect } from '../../SmilodonNativeSelect';
import {
  configureCyberSheet,
  registerCyberSheetFonts,
  useCyberSheetConfig,
  type CyberSheetFontDefinition,
} from '../../../config/globalConfig';
import type { FileOperations, ApplicationSettings, GeneralSettings, FormulaSettings, SaveSettings, AdvancedSettings } from '@cyber-sheet/core';

export interface OptionsPanelProps {
  fileOperations: FileOperations;
}

type SettingsTab =
  | 'general'
  | 'formulas'
  | 'data'
  | 'proofing'
  | 'save'
  | 'language'
  | 'advanced'
  | 'fonts'
  | 'customizeRibbon'
  | 'quickAccessToolbar'
  | 'trustCenter';

interface TabDef {
  id: SettingsTab;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'general', label: 'General' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'data', label: 'Data' },
  { id: 'proofing', label: 'Proofing' },
  { id: 'save', label: 'Save' },
  { id: 'language', label: 'Language' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'fonts', label: 'Fonts' },
  { id: 'customizeRibbon', label: 'Customize Ribbon' },
  { id: 'quickAccessToolbar', label: 'Quick Access Toolbar' },
  { id: 'trustCenter', label: 'Trust Center' },
];

const THEMES = [
  { value: 'colorful', label: 'Colorful' },
  { value: 'darkGray', label: 'Dark Gray' },
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
];
const SCREEN_TIP_STYLES = [
  { value: 'descriptions', label: 'Show feature descriptions in ScreenTips' },
  { value: 'featuresOnly', label: "Don't show feature descriptions in ScreenTips" },
  { value: 'none', label: "Don't show ScreenTips" },
];

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  fileOperations,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<ApplicationSettings>(fileOperations.getSettings());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const cyberSheetConfig = useCyberSheetConfig();
  const [fontFamilyName, setFontFamilyName] = useState('');
  const [fontSourcePaths, setFontSourcePaths] = useState('');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontStyle, setFontStyle] = useState('normal');
  const [fontMessage, setFontMessage] = useState<string | null>(null);

  const updateSettings = useCallback(
    <K extends keyof ApplicationSettings>(section: K, updates: Partial<ApplicationSettings[K]>) => {
      setSettings({
        ...settings,
        [section]: { ...settings[section], ...updates },
      });
      setSaveMessage(null);
    },
    [settings]
  );

  const handleSave = useCallback(() => {
    fileOperations.updateSettings(settings);
    setSaveMessage('Settings saved');
    setTimeout(() => setSaveMessage(null), 2000);
  }, [settings, fileOperations]);

  const handleReset = useCallback(() => {
    fileOperations.resetSettingsToDefault?.();
    setSettings(fileOperations.getSettings());
    setSaveMessage('Settings reset to defaults');
    setTimeout(() => setSaveMessage(null), 2000);
  }, [fileOperations]);

  const handleAddFont = useCallback(() => {
    const family = fontFamilyName.trim();
    const paths = fontSourcePaths
      .split(/\n|,/)
      .map((path) => path.trim())
      .filter(Boolean);

    if (!family || paths.length === 0) {
      setFontMessage('Enter a font family name and at least one font path.');
      return;
    }

    const font: CyberSheetFontDefinition = {
      family,
      sources: paths,
      weight: fontWeight || 'normal',
      style: fontStyle || 'normal',
      display: 'swap',
    };

    registerCyberSheetFonts([font]);
    setFontFamilyName('');
    setFontSourcePaths('');
    setFontMessage(`Registered ${family}`);
    setTimeout(() => setFontMessage(null), 2500);
  }, [fontFamilyName, fontSourcePaths, fontWeight, fontStyle]);

  const handleFontDefaultsChange = useCallback((updates: { defaultFamily?: string; defaultSize?: number }) => {
    configureCyberSheet({
      fonts: {
        defaultFamily: updates.defaultFamily ?? cyberSheetConfig.fonts.defaultFamily,
        defaultSize: updates.defaultSize ?? cyberSheetConfig.fonts.defaultSize,
      },
    });
  }, [cyberSheetConfig]);

  // ─── Reusable Sub-Components ─────────────────────────────

  const Section: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ marginBottom: 24 }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333333', marginBottom: 10 }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );

  const CheckboxSetting: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    indent?: number;
  }> = ({ label, checked, onChange, indent = 0 }) => (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      color: '#333333',
      cursor: 'pointer',
      padding: '4px 0',
      marginLeft: indent * 20,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
        style={{ margin: 0, cursor: 'pointer' }}
      />
      {label}
    </label>
  );

  const SelectSetting: React.FC<{
    label: string;
    value: string | number;
    options: { value: string | number; label: string }[];
    onChange: (value: string) => void;
    width?: number;
  }> = ({ label, value, options, onChange, width = 200 }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#333333', padding: '4px 0' }}>
      <span style={{ minWidth: 180 }}>{label}</span>
      <SmilodonNativeSelect
        value={String(value)}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        style={{
          width,
          padding: '6px 8px',
          fontSize: 13,
          border: '1px solid #D1D1D1',
          borderRadius: 4,
          backgroundColor: '#FFFFFF',
          cursor: 'pointer',
        }}
      >
        {options.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </SmilodonNativeSelect>
    </label>
  );

  const SpinnerSetting: React.FC<{
    label: string;
    value: number;
    min?: number;
    max?: number;
    onChange: (value: number) => void;
  }> = ({ label, value, min = 0, max = 999, onChange }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#333333', padding: '4px 0' }}>
      <span style={{ minWidth: 280 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        style={{
          width: 60,
          padding: '6px 8px',
          fontSize: 13,
          border: '1px solid #D1D1D1',
          borderRadius: 4,
          textAlign: 'center',
        }}
      />
    </label>
  );

  // ─── Tab Content Renderers ───────────────────────────────

  const renderGeneralTab = () => {
    const g = settings.general;
    return (
      <>
        <Section label="User Interface options">
          <CheckboxSetting
            label="Show Mini Toolbar on selection"
            checked={g.showMiniToolbar}
            onChange={(v) => updateSettings('general', { showMiniToolbar: v })}
          />
          <CheckboxSetting
            label="Show Quick Analysis options on selection"
            checked={g.showQuickAnalysis}
            onChange={(v) => updateSettings('general', { showQuickAnalysis: v })}
          />
          <CheckboxSetting
            label="Enable Live Preview"
            checked={g.enableLivePreview}
            onChange={(v) => updateSettings('general', { enableLivePreview: v })}
          />
          <SelectSetting
            label="ScreenTip style:"
            value={g.screenTipStyle}
            options={SCREEN_TIP_STYLES}
            onChange={(v) => updateSettings('general', { screenTipStyle: v as GeneralSettings['screenTipStyle'] })}
          />
        </Section>

        <Section label="When creating new workbooks">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0' }}>
            <span style={{ fontSize: 13, color: '#333333' }}>Use this as the default font:</span>
            <SmilodonNativeSelect
              value={g.defaultFont}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSettings('general', { defaultFont: e.target.value })}
              style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4, width: 160 }}
            >
              {cyberSheetConfig.fonts.families.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </SmilodonNativeSelect>
            <SmilodonNativeSelect
              value={String(g.defaultFontSize)}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSettings('general', { defaultFontSize: parseInt(e.target.value) })}
              style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4, width: 60 }}
            >
              {cyberSheetConfig.fonts.sizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SmilodonNativeSelect>
          </div>
          <SpinnerSetting
            label="Include this many sheets:"
            value={g.defaultSheets}
            min={1}
            max={255}
            onChange={(v) => updateSettings('general', { defaultSheets: v })}
          />
        </Section>

        <Section label="Personalize your copy of Microsoft Office">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#333333', padding: '4px 0' }}>
            <span style={{ minWidth: 180 }}>User name:</span>
            <input
              type="text"
              value={g.userName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings('general', { userName: e.target.value })}
              style={{ width: 200, padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4 }}
            />
          </label>
          <SelectSetting
            label="Office Theme:"
            value={g.officeTheme}
            options={THEMES}
            onChange={(v) => updateSettings('general', { officeTheme: v as GeneralSettings['officeTheme'] })}
          />
        </Section>
      </>
    );
  };

  const renderFormulasTab = () => {
    const f = settings.formulas;
    return (
      <>
        <Section label="Calculation options">
          <SelectSetting
            label="Workbook Calculation:"
            value={f.calculationMode}
            options={[
              { value: 'automatic', label: 'Automatic' },
              { value: 'automaticExceptTables', label: 'Automatic except for data tables' },
              { value: 'manual', label: 'Manual' },
            ]}
            onChange={(v) => updateSettings('formulas', { calculationMode: v as FormulaSettings['calculationMode'] })}
          />
          <CheckboxSetting
            label="Enable iterative calculation"
            checked={f.enableIterativeCalculation}
            onChange={(v) => updateSettings('formulas', { enableIterativeCalculation: v })}
          />
          {f.enableIterativeCalculation && (
            <>
              <SpinnerSetting
                label="Maximum Iterations:"
                value={f.maxIterations}
                min={1}
                max={32767}
                onChange={(v) => updateSettings('formulas', { maxIterations: v })}
              />
              <SpinnerSetting
                label="Maximum Change:"
                value={f.maxChange}
                min={0.001}
                max={999999}
                onChange={(v) => updateSettings('formulas', { maxChange: v })}
              />
            </>
          )}
        </Section>

        <Section label="Working with formulas">
          <CheckboxSetting
            label="R1C1 reference style"
            checked={f.r1c1Style}
            onChange={(v) => updateSettings('formulas', { r1c1Style: v })}
          />
        </Section>

        <Section label="Error Checking">
          <CheckboxSetting
            label="Enable background error checking"
            checked={f.errorChecking.enable}
            onChange={(v) => updateSettings('formulas', { errorChecking: { ...f.errorChecking, enable: v } })}
          />
          {f.errorChecking.enable && Object.entries(f.errorChecking.rules).map(([key, val]) => (
            <div key={key}>
              <CheckboxSetting
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                checked={val as boolean}
                onChange={(v) => updateSettings('formulas', {
                  errorChecking: { ...f.errorChecking, rules: { ...f.errorChecking.rules, [key]: v } }
                })}
                indent={1}
              />
            </div>
          ))}
        </Section>
      </>
    );
  };

  const renderSaveTab = () => {
    const s = settings.save;
    return (
      <>
        <Section label="Save workbooks">
          <SelectSetting
            label="Save files in this format:"
            value={s.defaultFormat}
            options={[
              { value: 'xlsx', label: 'Excel Workbook (*.xlsx)' },
              { value: 'ods', label: 'OpenDocument Spreadsheet (*.ods)' },
              { value: 'csv', label: 'CSV (Comma delimited) (*.csv)' },
            ]}
            onChange={(v) => updateSettings('save', { defaultFormat: v as SaveSettings['defaultFormat'] })}
          />
          <SpinnerSetting
            label="Save AutoRecover information every:"
            value={s.autoRecoverInterval}
            min={1}
            max={120}
            onChange={(v) => updateSettings('save', { autoRecoverInterval: v })}
          />
        </Section>

        <Section label="AutoSave">
          <CheckboxSetting
            label="AutoSave files stored in the Cloud by default"
            checked={s.autoSaveInterval > 0}
            onChange={(v) => updateSettings('save', { autoSaveInterval: v ? 10 : 0 })}
          />
        </Section>
      </>
    );
  };

  const renderAdvancedTab = () => {
    const a = settings.advanced;
    return (
      <>
        <Section label="Editing options">
          <SelectSetting
            label="After pressing Enter, move selection:"
            value={a.editing.afterPressEnterMoveDirection}
            options={[
              { value: 'down', label: 'Down' },
              { value: 'right', label: 'Right' },
              { value: 'up', label: 'Up' },
              { value: 'left', label: 'Left' },
            ]}
            onChange={(v) => updateSettings('advanced', {
              editing: { ...a.editing, afterPressEnterMoveDirection: v as AdvancedSettings['editing']['afterPressEnterMoveDirection'] }
            })}
          />
          <SpinnerSetting
            label="Decimal places:"
            value={a.editing.decimalPlaces}
            min={0}
            max={30}
            onChange={(v) => updateSettings('advanced', { editing: { ...a.editing, decimalPlaces: v } })}
          />
          <CheckboxSetting
            label="Enable AutoComplete for cell values"
            checked={a.editing.enableAutoComplete}
            onChange={(v) => updateSettings('advanced', { editing: { ...a.editing, enableAutoComplete: v } })}
          />
          <CheckboxSetting
            label="Enable fill handle and cell drag-and-drop"
            checked={a.editing.allowCellDragAndDrop}
            onChange={(v) => updateSettings('advanced', { editing: { ...a.editing, allowCellDragAndDrop: v } })}
          />
          <CheckboxSetting
            label="Alert before overwriting cells"
            checked={a.editing.alertBeforeOverwritingCells}
            onChange={(v) => updateSettings('advanced', { editing: { ...a.editing, alertBeforeOverwritingCells: v } })}
          />
        </Section>

        <Section label="Display">
          <CheckboxSetting
            label="Show gridlines"
            checked={a.display.showGridlines}
            onChange={(v) => updateSettings('advanced', { display: { ...a.display, showGridlines: v } })}
          />
          <CheckboxSetting
            label="Show row and column headers"
            checked={a.display.showRowColumnHeaders}
            onChange={(v) => updateSettings('advanced', { display: { ...a.display, showRowColumnHeaders: v } })}
          />
          <CheckboxSetting
            label="Show formula bar"
            checked={a.display.showFormulaBar}
            onChange={(v) => updateSettings('advanced', { display: { ...a.display, showFormulaBar: v } })}
          />
          <CheckboxSetting
            label="Show sheet tabs"
            checked={a.display.showSheetTabs}
            onChange={(v) => updateSettings('advanced', { display: { ...a.display, showSheetTabs: v } })}
          />
        </Section>
      </>
    );
  };

  const renderFontsTab = () => (
    <>
      <Section label="Global font defaults">
        <SelectSetting
          label="Default workbook font:"
          value={cyberSheetConfig.fonts.defaultFamily}
          options={cyberSheetConfig.fonts.families.map((family) => ({ value: family, label: family }))}
          onChange={(value) => handleFontDefaultsChange({ defaultFamily: value })}
        />
        <SelectSetting
          label="Default workbook font size:"
          value={cyberSheetConfig.fonts.defaultSize}
          options={cyberSheetConfig.fonts.sizes.map((size) => ({ value: size, label: String(size) }))}
          onChange={(value) => handleFontDefaultsChange({ defaultSize: parseInt(value, 10) })}
          width={80}
        />
      </Section>

      <Section label="Add a user font from path">
        <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#333333' }}>
            Font family name
            <input
              type="text"
              value={fontFamilyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFontFamilyName(e.target.value)}
              placeholder="Example: Vazirmatn"
              style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#333333' }}>
            Font file path or paths
            <textarea
              value={fontSourcePaths}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFontSourcePaths(e.target.value)}
              placeholder="/fonts/Vazirmatn-Regular.woff2&#10;/fonts/Vazirmatn-Bold.woff2"
              rows={4}
              style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4, resize: 'vertical' }}
            />
            <span style={{ fontSize: 12, color: '#666666' }}>
              Use public URLs, app-relative paths, or any path served by your application. Separate multiple paths with commas or new lines.
            </span>
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#333333' }}>
              Weight
              <input
                type="text"
                value={fontWeight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFontWeight(e.target.value)}
                style={{ width: 100, padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#333333' }}>
              Style
              <input
                type="text"
                value={fontStyle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFontStyle(e.target.value)}
                style={{ width: 100, padding: '6px 8px', fontSize: 13, border: '1px solid #D1D1D1', borderRadius: 4 }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={handleAddFont}
              style={{ padding: '7px 14px', border: '1px solid #0078D4', background: '#0078D4', color: '#FFFFFF', borderRadius: 4, cursor: 'pointer' }}
            >
              Register font
            </button>
            {fontMessage && <span style={{ fontSize: 13, color: '#107C10' }}>{fontMessage}</span>}
          </div>
        </div>
      </Section>

      <Section label="Registered fonts">
        <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#333333' }}>
          {cyberSheetConfig.fonts.families.map((family) => (
            <div key={family} style={{ fontFamily: family, padding: '4px 0' }}>
              {family}
            </div>
          ))}
        </div>
      </Section>
    </>
  );

  const renderPlaceholderTab = (tabName: string) => (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999999' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#555555', marginBottom: 4 }}>
        {tabName} Settings
      </div>
      <div style={{ fontSize: 13 }}>
        Detailed {tabName.toLowerCase()} configuration options will be available in a future update.
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'formulas': return renderFormulasTab();
      case 'save': return renderSaveTab();
      case 'advanced': return renderAdvancedTab();
      case 'fonts': return renderFontsTab();
      case 'data': return renderPlaceholderTab('Data');
      case 'proofing': return renderPlaceholderTab('Proofing');
      case 'language': return renderPlaceholderTab('Language');
      case 'customizeRibbon': return renderPlaceholderTab('Customize Ribbon');
      case 'quickAccessToolbar': return renderPlaceholderTab('Quick Access Toolbar');
      case 'trustCenter': return renderPlaceholderTab('Trust Center');
      default: return null;
    }
  };

  // ─── Styles ──────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    height: 'calc(100vh - 48px)',
    animation: 'fadeIn 200ms ease-out',
  };

  const tabSidebarStyle: React.CSSProperties = {
    width: 200,
    borderRight: '1px solid #E8E8E8',
    backgroundColor: '#FAFAFA',
    overflowY: 'auto',
    flexShrink: 0,
    padding: '8px 0',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#0078D4' : '#333333',
    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
    border: 'none',
    borderLeft: isActive ? '3px solid #0078D4' : '3px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 120ms ease',
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '32px 40px',
    backgroundColor: '#FFFFFF',
  };

  const footerStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    padding: '16px 40px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E8E8E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const okButtonStyle: React.CSSProperties = {
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: '#0078D4',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background-color 150ms',
  };

  const cancelButtonStyle: React.CSSProperties = {
    padding: '10px 28px',
    fontSize: 14,
    color: '#555555',
    backgroundColor: 'transparent',
    border: '1px solid #D1D1D1',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background-color 150ms',
  };

  const saveMessageStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#107C10',
    fontWeight: 500,
    animation: 'fadeIn 200ms',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  return (
    <div style={containerStyle}>
      {/* Tab Sidebar */}
      <div style={tabSidebarStyle} role="tablist" aria-label="Settings categories">
        {TABS.map(tab => (
          <button
            key={tab.id}
            style={tabStyle(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = '#F0F0F0';
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={contentStyle}>
        {renderActiveTab()}
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <div>
          {saveMessage && (
            <span style={saveMessageStyle}>
              ✓ {saveMessage}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={cancelButtonStyle}
            onClick={handleReset}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = '#F0F0F0'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Reset to Default
          </button>
          <button
            style={okButtonStyle}
            onClick={handleSave}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = '#106EBE'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = '#0078D4'; }}
          >
            OK
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
