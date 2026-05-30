# CyberSheet Global Settings

CyberSheet exposes a global configuration layer for values that should be shared across the app, such as available font families, custom font files, default workbook font, and default font size.

The settings can be controlled at three levels:

- Built-in defaults: CyberSheet ships with Excel-style defaults such as Calibri, Arial, Segoe UI, and common font sizes.
- Global runtime config: Call `configureCyberSheet()` or `registerCyberSheetFonts()` before or during app startup.
- Per-app config: Pass `config` directly to `ExcelApp`.

## Import

```ts
import {
  configureCyberSheet,
  registerCyberSheetFonts,
  getCyberSheetConfig,
} from '@cyber-sheet/react';
```

## Configure Fonts Globally

Use `configureCyberSheet()` when your application already knows the fonts it wants CyberSheet to expose.

```ts
configureCyberSheet({
  fonts: {
    defaultFamily: 'Vazirmatn',
    defaultSize: 11,
    families: ['Calibri', 'Arial', 'Vazirmatn'],
    sizes: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 36, 48, 72],
    customFonts: [
      {
        family: 'Vazirmatn',
        sources: [
          { url: '/fonts/Vazirmatn-Regular.woff2', format: 'woff2' },
        ],
        weight: 400,
        style: 'normal',
        display: 'swap',
      },
    ],
  },
});
```

## Register Fonts Later

Use `registerCyberSheetFonts()` when the user adds a font after the app has already loaded.

```ts
registerCyberSheetFonts([
  {
    family: 'Company Sans',
    sources: [
      '/assets/fonts/company-sans.woff2',
      { url: '/assets/fonts/company-sans.woff', format: 'woff' },
    ],
    weight: '400',
    style: 'normal',
    display: 'swap',
  },
]);
```

After registration, the font is available in CyberSheet font selectors such as the Home ribbon, mini toolbar, Format Cells dialog, and Options panel.

## Pass Settings To ExcelApp

Use the `config` prop when a single `ExcelApp` instance should initialize global settings.

```tsx
import { ExcelApp } from '@cyber-sheet/react';

<ExcelApp
  workbook={workbook}
  config={{
    fonts: {
      defaultFamily: 'Company Sans',
      customFonts: [
        {
          family: 'Company Sans',
          sources: ['/fonts/company-sans.woff2'],
        },
      ],
    },
  }}
/>;
```

## User-Provided Font Paths

Users can provide one or more font file paths through your own UI or through CyberSheet's Backstage Options panel.

Paths must be browser-loadable URLs served by the application, for example:

- `/fonts/MyFont-Regular.woff2`
- `/assets/fonts/MyFont-Regular.ttf`
- `https://cdn.example.com/fonts/MyFont.woff2`

Browser security does not allow arbitrary private local filesystem paths to be loaded directly. If a user chooses a local font file, your application should upload or serve that file first, then pass the resulting URL to CyberSheet.

## Inspect Current Settings

```ts
const config = getCyberSheetConfig();

console.log(config.fonts.families);
console.log(config.fonts.defaultFamily);
```

## Font Definition Reference

```ts
type CyberSheetFontDefinition = {
  family: string;
  sources: Array<
    | string
    | {
        url: string;
        format?: 'woff2' | 'woff' | 'ttf' | 'otf' | string;
      }
  >;
  weight?: string | number;
  style?: string;
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  unicodeRange?: string;
};
```

## Notes

- CyberSheet injects `@font-face` rules for registered custom fonts.
- If the browser supports the `FontFace` API, CyberSheet also attempts to preload registered fonts.
- Cell rendering uses the configured default font unless a cell has its own `fontFamily` style.
- Font loading failures usually indicate an incorrect URL, missing static asset, or CORS issue. Check the browser network panel for details.
