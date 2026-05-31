import { useEffect, useState } from 'react';

export type FontSourceFormat = 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot' | 'svg' | string;

export interface CyberSheetFontSource {
  url: string;
  format?: FontSourceFormat;
}

export interface CyberSheetFontDefinition {
  family: string;
  sources: Array<string | CyberSheetFontSource>;
  weight?: string | number;
  style?: string;
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  unicodeRange?: string;
}

export interface CyberSheetFontConfig {
  families?: string[];
  customFonts?: CyberSheetFontDefinition[];
  defaultFamily?: string;
  defaultSize?: number;
  sizes?: number[];
}

export interface CyberSheetGlobalConfig {
  fonts: Required<CyberSheetFontConfig>;
}

export type CyberSheetConfigInput = Partial<{
  fonts: CyberSheetFontConfig;
}>;

const DEFAULT_FONT_FAMILIES = [
  'Calibri',
  'Arial',
  'Segoe UI',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Comic Sans MS',
  'Helvetica',
  'Consolas',
];

const DEFAULT_FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

export const DEFAULT_CONFIG: CyberSheetGlobalConfig = {
  fonts: {
    families: DEFAULT_FONT_FAMILIES,
    customFonts: [],
    defaultFamily: 'Calibri',
    defaultSize: 11,
    sizes: DEFAULT_FONT_SIZES,
  },
};

export { DEFAULT_CONFIG as DEFAULT_FONT_CONFIG };

let currentConfig: CyberSheetGlobalConfig = DEFAULT_CONFIG;
const listeners = new Set<(config: CyberSheetGlobalConfig) => void>();
let fontStyleElement: HTMLStyleElement | null = null;

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function normalizeFontSource(source: string | CyberSheetFontSource): CyberSheetFontSource {
  return typeof source === 'string' ? { url: source } : source;
}

function serializeFontSource(source: string | CyberSheetFontSource): string {
  const normalized = normalizeFontSource(source);
  const format = normalized.format ? ` format("${normalized.format}")` : '';
  return `url("${normalized.url}")${format}`;
}

export function normalizeConfig(input?: CyberSheetConfigInput): CyberSheetGlobalConfig {
  const fontFamilies = uniqueValues([
    ...(input?.fonts?.families ?? DEFAULT_CONFIG.fonts.families),
    ...(input?.fonts?.customFonts ?? []).map((font) => font.family),
  ]);

  return {
    fonts: {
      families: fontFamilies,
      customFonts: input?.fonts?.customFonts ?? DEFAULT_CONFIG.fonts.customFonts,
      defaultFamily: input?.fonts?.defaultFamily ?? DEFAULT_CONFIG.fonts.defaultFamily,
      defaultSize: input?.fonts?.defaultSize ?? DEFAULT_CONFIG.fonts.defaultSize,
      sizes: uniqueValues(input?.fonts?.sizes ?? DEFAULT_CONFIG.fonts.sizes).sort((a, b) => a - b),
    },
  };
}

function buildFontFaceCss(fonts: CyberSheetFontDefinition[]): string {
  return fonts
    .filter((font) => font.family && font.sources.length > 0)
    .map((font) => {
      const declarations = [
        `font-family: "${font.family}"`,
        `src: ${font.sources.map(serializeFontSource).join(', ')}`,
        font.weight ? `font-weight: ${font.weight}` : '',
        font.style ? `font-style: ${font.style}` : '',
        font.display ? `font-display: ${font.display}` : 'font-display: swap',
        font.unicodeRange ? `unicode-range: ${font.unicodeRange}` : '',
      ].filter(Boolean);

      return `@font-face { ${declarations.join('; ')}; }`;
    })
    .join('\n');
}

function syncFontFaces(config: CyberSheetGlobalConfig) {
  if (typeof document === 'undefined') return;

  const css = buildFontFaceCss(config.fonts.customFonts);
  if (!css) {
    fontStyleElement?.remove();
    fontStyleElement = null;
    return;
  }

  if (!fontStyleElement) {
    fontStyleElement = document.createElement('style');
    fontStyleElement.setAttribute('data-cybersheet-fonts', 'true');
    document.head.appendChild(fontStyleElement);
  }

  fontStyleElement.textContent = css;

  if ('fonts' in document) {
    config.fonts.customFonts.forEach((font) => {
      font.sources.forEach((source) => {
        const normalized = normalizeFontSource(source);
        if (typeof FontFace === 'undefined') return;

        const face = new FontFace(font.family, `url(${normalized.url})`, {
          weight: font.weight ? String(font.weight) : 'normal',
          style: font.style ?? 'normal',
          display: font.display ?? 'swap',
        });

        face.load()
          .then((loaded) => document.fonts.add(loaded))
          .catch(() => {
            // The @font-face CSS remains as a fallback; callers can inspect network errors in devtools.
          });
      });
    });
  }
}

function notify() {
  syncFontFaces(currentConfig);
  listeners.forEach((listener) => listener(currentConfig));
}

export function configureCyberSheet(config: CyberSheetConfigInput) {
  currentConfig = normalizeConfig({
    fonts: {
      ...currentConfig.fonts,
      ...config.fonts,
      customFonts: config.fonts?.customFonts ?? currentConfig.fonts.customFonts,
      families: config.fonts?.families ?? currentConfig.fonts.families,
      sizes: config.fonts?.sizes ?? currentConfig.fonts.sizes,
    },
  });
  notify();
  return currentConfig;
}

export function resetCyberSheetConfig() {
  currentConfig = DEFAULT_CONFIG;
  notify();
  return currentConfig;
}

export function getCyberSheetConfig() {
  return currentConfig;
}

export function registerCyberSheetFonts(fonts: CyberSheetFontDefinition[]) {
  return configureCyberSheet({
    fonts: {
      customFonts: [...currentConfig.fonts.customFonts, ...fonts],
    },
  });
}

export function subscribeCyberSheetConfig(listener: (config: CyberSheetGlobalConfig) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @deprecated Use module-level font sync via configureCyberSheet; prefer CyberSheetConfigProvider for app flags. */
export function useCyberSheetFontConfig() {
  const [config, setConfig] = useState(currentConfig);

  useEffect(() => {
    syncFontFaces(currentConfig);
    return subscribeCyberSheetConfig(setConfig);
  }, []);

  return config.fonts;
}
