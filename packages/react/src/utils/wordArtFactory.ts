import type { TextBoxObject, WordArtStyle } from '@cyber-sheet/core';
import type { TextBoxInsertTemplate } from './textBoxFactory';

export const DEFAULT_WORD_ART_SIZE = { width: 220, height: 72 };

export interface WordArtPreset {
  id: string;
  label: string;
  style: WordArtStyle;
  previewFontSize: number;
}

export const WORD_ART_PRESETS: WordArtPreset[] = [
  {
    id: 'fill-blue',
    label: 'Fill – Blue',
    previewFontSize: 22,
    style: {
      presetId: 'fill-blue',
      gradientFrom: '#0052B4',
      gradientTo: '#00A4EF',
    },
  },
  {
    id: 'fill-orange',
    label: 'Fill – Orange',
    previewFontSize: 22,
    style: {
      presetId: 'fill-orange',
      gradientFrom: '#ED7D31',
      gradientTo: '#FFC000',
    },
  },
  {
    id: 'fill-purple',
    label: 'Fill – Purple',
    previewFontSize: 22,
    style: {
      presetId: 'fill-purple',
      gradientFrom: '#7030A0',
      gradientTo: '#C0504D',
    },
  },
  {
    id: 'fill-green',
    label: 'Fill – Green',
    previewFontSize: 22,
    style: {
      presetId: 'fill-green',
      gradientFrom: '#548235',
      gradientTo: '#A9D18E',
    },
  },
  {
    id: 'outline-blue',
    label: 'Outline – Blue',
    previewFontSize: 22,
    style: {
      presetId: 'outline-blue',
      gradientFrom: '#0070C0',
      gradientTo: '#0070C0',
      outlineColor: '#0070C0',
      outlineWidth: 2,
    },
  },
  {
    id: 'shadow-dark',
    label: 'Shadow',
    previewFontSize: 22,
    style: {
      presetId: 'shadow-dark',
      gradientFrom: '#404040',
      gradientTo: '#404040',
      shadow: true,
    },
  },
];

export function getWordArtPreset(presetId: string): WordArtPreset {
  return WORD_ART_PRESETS.find((p) => p.id === presetId) ?? WORD_ART_PRESETS[0];
}

export function createWordArtTemplate(presetId: string): TextBoxInsertTemplate {
  const preset = getWordArtPreset(presetId);
  return {
    type: 'textBox',
    name: 'WordArt',
    text: 'Your text here',
    rotation: 0,
    locked: false,
    visible: true,
    altText: 'WordArt',
    wordArtStyle: { ...preset.style },
    textStyle: {
      fontFamily: 'Calibri, Segoe UI, sans-serif',
      fontSize: 28,
      color: preset.style.gradientFrom,
      bold: true,
      italic: false,
      underline: false,
      align: 'center',
      valign: 'middle',
    },
    fill: { type: 'none' },
    border: { color: '#000000', width: 0, style: 'none' },
  };
}

export function isWordArtObject(obj: TextBoxObject): boolean {
  return Boolean(obj.wordArtStyle);
}
