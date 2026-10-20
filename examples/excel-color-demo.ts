/**
 * Excel Color System - Complete Demo
 * 
 * This example demonstrates all Excel color features:
 * - Theme colors with tint/shade
 * - Indexed colors
 * - RGB colors
 * - Conditional formatting colors
 * - Color contrast validation
 * - Integration with plugins
 */

import { 
  Worksheet,
  ExcelThemeColor,
  ExcelIndexedColor,
  ExcelRgbColor,
  resolveExcelColor,
  applyExcelTint,
  getConditionalFormattingColor,
  hasGoodContrast,
  interpolateColor,
  EXCEL_THEME_COLORS
} from '@cyber-sheet/core';

import { 
  CanvasRenderer, 
  ColorGradingPlugin,
  AccessibilityPlugin,
  HeatmapPlugin 
} from '@cyber-sheet/renderer-canvas';

// Create worksheet
const sheet = new Worksheet('Excel Color Demo', 50, 10);

// ========================================
// 1. Theme Colors with Tint
// ========================================
console.log('=== Theme Colors ===');

// Header row with theme colors
const headerStyle = {
  fill: { theme: 4, tint: 0.6 } as ExcelThemeColor, // Light blue
  color: { theme: 1 } as ExcelThemeColor,            // Black text
  fontSize: 14,
  bold: true,
  align: 'center' as const,
  border: {
    bottom: { theme: 4 } as ExcelThemeColor
  }
};

for (let col = 1; col <= 6; col++) {
  sheet.setCellValue({ row: 1, col }, `Column ${col}`);
  sheet.setCellStyle({ row: 1, col }, headerStyle);
}

// ========================================
// 2. Tint Variations Demo
// ========================================
console.log('=== Tint Variations ===');

const tintLevels = [0.8, 0.6, 0.4, 0.2, 0, -0.2, -0.4, -0.6];
sheet.setCellValue({ row: 3, col: 1 }, 'Tint Variations (Blue):');

tintLevels.forEach((tint, idx) => {
  const col = idx + 2;
  sheet.setCellValue({ row: 3, col }, `${tint > 0 ? '+' : ''}${tint}`);
  sheet.setCellStyle({ row: 3, col }, {
    fill: { theme: 4, tint } as ExcelThemeColor,
    fontSize: 10,
    align: 'center'
  });
  
  // Show resolved color
  const resolved = resolveExcelColor({ theme: 4, tint });
  console.log(`Tint ${tint}: ${resolved}`);
});

// ========================================
// 3. All Theme Colors
// ========================================
console.log('=== All Theme Colors ===');

sheet.setCellValue({ row: 5, col: 1 }, 'Theme Palette:');

Object.entries(EXCEL_THEME_COLORS).forEach(([themeIdx, baseColor]) => {
  const row = 6 + parseInt(themeIdx);
  const themeNum = parseInt(themeIdx);
  
  sheet.setCellValue({ row, col: 1 }, `Theme ${themeNum}`);
  
  // Base color
  sheet.setCellStyle({ row, col: 2 }, {
    fill: { theme: themeNum } as ExcelThemeColor,
    color: hasGoodContrast('#FFFFFF', baseColor) ? '#FFFFFF' : '#000000'
  });
  
  // Lightened
  sheet.setCellStyle({ row, col: 3 }, {
    fill: { theme: themeNum, tint: 0.6 } as ExcelThemeColor
  });
  
  // Darkened
  sheet.setCellStyle({ row, col: 4 }, {
    fill: { theme: themeNum, tint: -0.4 } as ExcelThemeColor,
    color: '#FFFFFF'
  });
  
  console.log(`Theme ${themeNum}: ${baseColor}`);
});

// ========================================
// 4. Indexed Colors
// ========================================
console.log('=== Indexed Colors ===');

sheet.setCellValue({ row: 19, col: 1 }, 'Indexed Colors:');

const indexedSamples = [16, 17, 18, 19, 20, 21, 22, 23]; // Maroon to Gray
indexedSamples.forEach((idx, offset) => {
  const col = offset + 2;
  sheet.setCellValue({ row: 19, col }, `${idx}`);
  sheet.setCellStyle({ row: 19, col }, {
    fill: { indexed: idx } as ExcelIndexedColor,
    fontSize: 9,
    align: 'center'
  });
});

// ========================================
// 5. Conditional Formatting Colors
// ========================================
console.log('=== Conditional Formatting ===');

sheet.setCellValue({ row: 21, col: 1 }, 'CF Color Scales:');

// Generate sample data
const sampleData = [10, 25, 40, 55, 70, 85, 100];

// Red-Green scale
sheet.setCellValue({ row: 22, col: 1 }, 'Red-Green:');
sampleData.forEach((value, idx) => {
  const col = idx + 2;
  const normalized = value / 100;
  const cfColor = getConditionalFormattingColor(normalized, 'red-green');
  
  sheet.setCellValue({ row: 22, col }, value);
  sheet.setCellStyle({ row: 22, col }, {
    fill: cfColor,
    align: 'center'
  });
});

// 3-color scale (Red-Yellow-Green)
sheet.setCellValue({ row: 23, col: 1 }, 'Red-Yellow-Green:');
sampleData.forEach((value, idx) => {
  const col = idx + 2;
  const normalized = value / 100;
  const cfColor = getConditionalFormattingColor(normalized, 'red-yellow-green');
  
  sheet.setCellValue({ row: 23, col }, value);
  sheet.setCellStyle({ row: 23, col }, {
    fill: cfColor,
    align: 'center',
    bold: true
  });
});

// Blue-White-Red scale
sheet.setCellValue({ row: 24, col: 1 }, 'Blue-White-Red:');
sampleData.forEach((value, idx) => {
  const col = idx + 2;
  const normalized = value / 100;
  const cfColor = getConditionalFormattingColor(normalized, 'blue-white-red');
  
  sheet.setCellValue({ row: 24, col }, value);
  sheet.setCellStyle({ row: 24, col }, {
    fill: cfColor,
    align: 'center'
  });
});

// ========================================
// 6. Color Interpolation Gradient
// ========================================
console.log('=== Color Gradients ===');

sheet.setCellValue({ row: 26, col: 1 }, 'Gradient:');

const gradientSteps = 8;
for (let i = 0; i < gradientSteps; i++) {
  const col = i + 2;
  const t = i / (gradientSteps - 1);
  const color = interpolateColor('#FF6B6B', '#4ECDC4', t);
  
  sheet.setCellValue({ row: 26, col }, Math.round(t * 100) + '%');
  sheet.setCellStyle({ row: 26, col }, {
    fill: color,
    align: 'center'
  });
}

// ========================================
// 7. Accessibility Check
// ========================================
console.log('=== Accessibility Validation ===');

sheet.setCellValue({ row: 28, col: 1 }, 'Contrast Check:');

const textColors = ['#FFFFFF', '#000000', '#666666'];
const bgColors = [
  { theme: 4 } as ExcelThemeColor,  // Blue
  { theme: 5 } as ExcelThemeColor,  // Red
  { theme: 6 } as ExcelThemeColor   // Green
];

bgColors.forEach((bg, idx) => {
  const row = 29 + idx;
  const bgResolved = resolveExcelColor(bg);
  
  sheet.setCellValue({ row, col: 1 }, `BG: ${bgResolved}`);
  
  textColors.forEach((textColor, tIdx) => {
    const col = tIdx + 2;
    const isAA = hasGoodContrast(textColor, bgResolved, 'AA');
    const isAAA = hasGoodContrast(textColor, bgResolved, 'AAA');
    
    sheet.setCellValue({ row, col }, isAAA ? 'AAA' : isAA ? 'AA' : 'Fail');
    sheet.setCellStyle({ row, col }, {
      fill: bg,
      color: textColor,
      align: 'center',
      bold: isAAA
    });
    
    console.log(`${bgResolved} + ${textColor}: ${isAAA ? 'AAA' : isAA ? 'AA' : 'Fail'}`);
  });
});

// ========================================
// 8. Data Table with Excel Colors
// ========================================
console.log('=== Data Table ===');

const headers = ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'];
const data = [
  ['Widget A', 1200, 1450, 1380, 1620],
  ['Widget B', 890, 920, 1150, 1080],
  ['Widget C', 1560, 1780, 1690, 1920],
  ['Widget D', 740, 680, 820, 890]
];

// Table headers
const tableStartRow = 33;
headers.forEach((header, idx) => {
  const col = idx + 1;
  sheet.setCellValue({ row: tableStartRow, col }, header);
  sheet.setCellStyle({ row: tableStartRow, col }, {
    fill: { theme: 3, tint: 0.4 } as ExcelThemeColor,
    color: { theme: 0 } as ExcelThemeColor,
    bold: true,
    align: 'center',
    border: {
      bottom: { theme: 3 } as ExcelThemeColor
    }
  });
});

// Table data
data.forEach((rowData, rowIdx) => {
  const row = tableStartRow + 1 + rowIdx;
  
  // Product name
  sheet.setCellValue({ row, col: 1 }, rowData[0]);
  sheet.setCellStyle({ row, col: 1 }, {
    bold: true,
    border: {
      right: { indexed: 23 } as ExcelIndexedColor
    }
  });
  
  // Quarterly values
  let total = 0;
  rowData.slice(1).forEach((value, colIdx) => {
    const col = colIdx + 2;
    if (typeof value === 'number') total += value;
    
    sheet.setCellValue({ row, col }, value);
    sheet.setCellStyle({ row, col }, {
      numberFormat: '#,##0',
      align: 'right'
    });
  });
  
  // Total with conditional formatting
  sheet.setCellValue({ row, col: 6 }, total);
  const maxTotal = 7000;
  const normalized = total / maxTotal;
  const cfColor = getConditionalFormattingColor(normalized, 'green-white');
  
  sheet.setCellStyle({ row, col: 6 }, {
    fill: cfColor,
    numberFormat: '#,##0',
    align: 'right',
    bold: true,
    border: {
      left: { indexed: 23 } as ExcelIndexedColor
    }
  });
});

// ========================================
// 9. Setup Renderer with Plugins
// ========================================
console.log('=== Renderer Setup ===');

const container = document.getElementById('app')!;
const renderer = new CanvasRenderer(container, sheet, {
  headerHeight: 30,
  headerWidth: 50,
  locale: 'en-US'
});

// Add color grading plugin
const colorGrading = new ColorGradingPlugin();
renderer.addPlugin(colorGrading);

// Add accessibility plugin (disabled by default)
const accessibility = new AccessibilityPlugin();
// renderer.addPlugin(accessibility); // Uncomment to enable

// Render
renderer.redraw();

console.log('Excel color demo ready!');

// ========================================
// 10. Runtime Color Adjustments
// ========================================

// Add UI controls
const controls = document.createElement('div');
controls.style.cssText = 'position: fixed; top: 10px; right: 10px; background: white; padding: 15px; border: 1px solid #ccc; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';

controls.innerHTML = `
  <div style="margin-bottom: 10px;">
    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Color Grading</label>
    <label style="display: block; font-size: 12px;">Hue Shift:</label>
    <input type="range" id="hue" min="-180" max="180" value="0" style="width: 200px;">
    <span id="hue-val">0°</span>
  </div>
  <div style="margin-bottom: 10px;">
    <label style="display: block; font-size: 12px;">Saturation:</label>
    <input type="range" id="sat" min="0" max="200" value="100" style="width: 200px;">
    <span id="sat-val">100%</span>
  </div>
  <div style="margin-bottom: 10px;">
    <label style="display: block; font-size: 12px;">Lightness:</label>
    <input type="range" id="light" min="50" max="150" value="100" style="width: 200px;">
    <span id="light-val">100%</span>
  </div>
  <div>
    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Accessibility</label>
    <select id="access-mode" style="width: 100%; padding: 5px;">
      <option value="normal">Normal</option>
      <option value="high-contrast">High Contrast</option>
      <option value="deuteranopia">Deuteranopia</option>
      <option value="protanopia">Protanopia</option>
      <option value="tritanopia">Tritanopia</option>
    </select>
  </div>
`;

document.body.appendChild(controls);

// Wire up controls
const hueSlider = document.getElementById('hue') as HTMLInputElement;
const satSlider = document.getElementById('sat') as HTMLInputElement;
const lightSlider = document.getElementById('light') as HTMLInputElement;
const accessMode = document.getElementById('access-mode') as HTMLSelectElement;

const hueVal = document.getElementById('hue-val')!;
const satVal = document.getElementById('sat-val')!;
const lightVal = document.getElementById('light-val')!;
let hueShift = 0;
let saturationAdjustment = 0;
let lightnessAdjustment = 0;

function updateColorGrading(): void {
  colorGrading.setHSL(hueShift, saturationAdjustment, lightnessAdjustment);
  renderer.redraw();
}

hueSlider.addEventListener('input', () => {
  hueShift = parseInt(hueSlider.value, 10);
  hueVal.textContent = `${hueShift}°`;
  updateColorGrading();
});

satSlider.addEventListener('input', () => {
  const value = parseInt(satSlider.value, 10);
  saturationAdjustment = value - 100;
  satVal.textContent = `${value}%`;
  updateColorGrading();
});

lightSlider.addEventListener('input', () => {
  const value = parseInt(lightSlider.value, 10);
  lightnessAdjustment = value - 100;
  lightVal.textContent = `${value}%`;
  updateColorGrading();
});

accessMode.addEventListener('change', () => {
  const mode = accessMode.value;
  renderer.removePlugin('accessibility');
  
  if (isAccessibilityMode(mode) && mode !== 'none') {
    const newPlugin = new AccessibilityPlugin(mode);
    renderer.addPlugin(newPlugin);
  }
  
  renderer.redraw();
});

console.log('✅ Excel Color System Demo Complete!');
console.log('Use the controls on the right to adjust colors in real-time.');

function isAccessibilityMode(value: string): value is import('../packages/renderer-canvas/src/plugins').AccessibilityMode {
  return value === 'none' || value === 'high-contrast' || value === 'deuteranopia' || value === 'protanopia' || value === 'tritanopia';
}

export { sheet, renderer };
