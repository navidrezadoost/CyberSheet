import React, { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_APP_CONFIG,
  normalizeAppConfig,
  type CyberSheetAppConfig,
  type CyberSheetConfigInput,
} from './appConfig';
import {
  normalizeConfig,
  type CyberSheetGlobalConfig,
  type CyberSheetFontConfig,
} from './globalConfig';

export type CyberSheetResolvedConfig = CyberSheetAppConfig & {
  fonts: CyberSheetGlobalConfig['fonts'];
};

const CyberSheetConfigContext = createContext<CyberSheetResolvedConfig | null>(null);

export function mergeCyberSheetConfig(
  appInput?: Partial<CyberSheetAppConfig>,
  fontInput?: CyberSheetFontConfig,
): CyberSheetResolvedConfig {
  const app = normalizeAppConfig(appInput);
  const global = normalizeConfig(fontInput ? { fonts: fontInput } : undefined);
  return {
    ...app,
    fonts: global.fonts,
  };
}

export interface CyberSheetConfigProviderProps {
  config?: CyberSheetConfigInput;
  children: React.ReactNode;
}

export function CyberSheetConfigProvider({ config, children }: CyberSheetConfigProviderProps) {
  const value = useMemo(
    () => mergeCyberSheetConfig(config, config?.fonts),
    [config],
  );

  return (
    <CyberSheetConfigContext.Provider value={value}>
      {children}
    </CyberSheetConfigContext.Provider>
  );
}

export function useCyberSheetAppConfig(): CyberSheetAppConfig {
  const context = useContext(CyberSheetConfigContext);
  return context ?? DEFAULT_APP_CONFIG;
}

export function useCyberSheetResolvedConfig(): CyberSheetResolvedConfig {
  const context = useContext(CyberSheetConfigContext);
  if (context) return context;
  return mergeCyberSheetConfig(undefined);
}

/** App + font config from context (or defaults outside a provider). */
export function useCyberSheetConfig(): CyberSheetResolvedConfig {
  return useCyberSheetResolvedConfig();
}
