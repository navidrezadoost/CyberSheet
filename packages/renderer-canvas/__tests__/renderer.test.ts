import { mockCanvas } from '@cyber-sheet/test-utils';
import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '../src/CanvasRenderer';

describe('CanvasRenderer', () => {
  beforeAll(() => {
    mockCanvas();
  });

  it('creates renderer instance without crashing', () => {
    const container = document.createElement('div');
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    expect(renderer).toBeTruthy();
  });
});
