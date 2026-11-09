import { Worksheet } from '../src/worksheet';
import type { RichTextValue } from '../src/types';

function makeRichText(text: string): RichTextValue {
  return {
    runs: [{ text, style: { bold: true, color: '#ff0000' } }],
  };
}

describe('P1-08AT Worksheet cell read safety', () => {
  it('isolates rich-text runs and nested formatting returned by ordinary reads', () => {
    const sheet = new Worksheet('OrdinaryRead');
    const suppliedValue = makeRichText('Ordinary');
    sheet.setCellValue({ row: 1, col: 1 }, suppliedValue);

    const read = sheet.getCell({ row: 1, col: 1 });
    expect(read).toEqual({
      value: suppliedValue,
      formula: undefined,
      style: undefined,
      comments: undefined,
      icon: undefined,
      customComponent: undefined,
      hyperlink: undefined,
      spillSource: undefined,
      spilledFrom: undefined,
    });
    expect(read).not.toBe(sheet.getCell({ row: 1, col: 1 }));
    expect(read?.value).not.toBe(suppliedValue);

    const readValue = read!.value as RichTextValue;
    expect(readValue.runs).not.toBe(suppliedValue.runs);
    expect(readValue.runs[0].style).not.toBe(suppliedValue.runs[0].style);
    expect(Object.isFrozen(readValue.runs)).toBe(true);
    expect(Object.isFrozen(readValue.runs[0])).toBe(true);
    expect(Object.isFrozen(readValue.runs[0].style)).toBe(true);

    expect(() => {
      readValue.runs[0].text = 'Changed through ordinary read';
    }).toThrow();
    expect(() => {
      readValue.runs[0].style!.bold = false;
    }).toThrow();

    const valueRead = sheet.getCellValue({ row: 1, col: 1 }) as RichTextValue;
    expect(valueRead).not.toBe(suppliedValue);
    expect(() => {
      valueRead.runs[0].text = 'Changed through getCellValue';
    }).toThrow();

    expect(sheet.getCellValue({ row: 1, col: 1 })).toEqual(makeRichText('Ordinary'));
    expect(suppliedValue.runs[0].text).toBe('Ordinary');
    expect(suppliedValue.runs[0].style?.bold).toBe(true);
  });

  it('isolates rich-text reads through merged members and preserves setter redirection', () => {
    const sheet = new Worksheet('MergedRead');
    const suppliedValue = makeRichText('Anchor');
    sheet.setCellValue({ row: 1, col: 1 }, suppliedValue);
    sheet.mergeCells({
      start: { row: 1, col: 1 },
      end: { row: 2, col: 2 },
    });

    const nonAnchor = sheet.getCell({ row: 2, col: 2 });
    const anchor = sheet.getCell({ row: 1, col: 1 });
    expect(nonAnchor).toEqual(anchor);
    expect(nonAnchor).not.toBe(anchor);
    expect(Object.isFrozen(nonAnchor)).toBe(true);
    expect(nonAnchor?.value).not.toBe(suppliedValue);

    const readValue = nonAnchor!.value as RichTextValue;
    expect(Object.isFrozen(readValue.runs[0].style)).toBe(true);
    expect(() => {
      readValue.runs[0].text = 'Changed through merged read';
    }).toThrow();
    expect(() => {
      readValue.runs[0].style!.color = '#00FF00';
    }).toThrow();

    const mergedValueRead = sheet.getCellValue({ row: 2, col: 2 }) as RichTextValue;
    expect(mergedValueRead).not.toBe(suppliedValue);
    expect(() => {
      mergedValueRead.runs[0].style!.bold = false;
    }).toThrow();

    expect((sheet.getCell({ row: 1, col: 1 })?.value as RichTextValue).runs[0].text).toBe('Anchor');
    expect(suppliedValue.runs[0].text).toBe('Anchor');

    sheet.setCellValue({ row: 2, col: 2 }, makeRichText('Written through merged member'));
    expect((sheet.getCell({ row: 1, col: 1 })?.value as RichTextValue).runs[0].text).toBe(
      'Written through merged member',
    );
    expect(readValue.runs[0].text).toBe('Anchor');
  });
});
