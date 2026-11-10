import { describe, expect, jest, test } from '@jest/globals';
import { LightweightXLSXParser } from '../src/LightweightParser';
import { importXLSX, previewXLSX, streamXLSX } from '../src/import';
import { XlsxImportUnavailableError } from '../src/XlsxImportUnavailableError';
import { loadXlsxFromArrayBuffer, loadXlsxFromUrl } from '../src/index';
import { loadXlsxProgressivelyFromArrayBuffer } from '../src/progressive';

const smallInput = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe('ZIP/XLSX decompression containment', () => {
  test('the lightweight reader rejects before reading archive metadata', async () => {
    const parser = new LightweightXLSXParser();
    await expect(parser.parseMetadata(smallInput.buffer)).rejects.toMatchObject({
      name: 'XlsxImportUnavailableError',
      code: 'XLSX_IMPORT_UNAVAILABLE',
    });
  });

  test('preview and streaming entry points fail closed before decompression', async () => {
    await expect(previewXLSX(smallInput.buffer)).rejects.toMatchObject({ code: 'XLSX_IMPORT_UNAVAILABLE' });
    await expect(streamXLSX(smallInput.buffer).next()).rejects.toMatchObject({ code: 'XLSX_IMPORT_UNAVAILABLE' });
  });

  test('restore entry points retain a typed failure and do not parse input', async () => {
    expect(() => loadXlsxFromArrayBuffer(smallInput)).toThrow(XlsxImportUnavailableError);
    let fetchWasCalled = false;
    const fetchFile = async (_input: RequestInfo): Promise<Response> => {
      fetchWasCalled = true;
      return new Response();
    };
    await expect(loadXlsxFromUrl('/untrusted.xlsx', fetchFile)).rejects.toBeInstanceOf(XlsxImportUnavailableError);
    expect(fetchWasCalled).toBe(false);
    await expect(importXLSX(smallInput.buffer)).rejects.toBeInstanceOf(XlsxImportUnavailableError);
    await expect(loadXlsxProgressivelyFromArrayBuffer(smallInput)).rejects.toBeInstanceOf(XlsxImportUnavailableError);
  });

  test('the progressive worker reports the typed fail-closed error before parsing', async () => {
    const originalAddEventListener = globalThis.addEventListener;
    const originalPostMessage = globalThis.postMessage;
    const listeners: Array<(event: MessageEvent) => void> = [];
    const postMessage = jest.fn();
    globalThis.addEventListener = ((...args: Parameters<typeof globalThis.addEventListener>) => {
      listeners.push(args[1] as (event: MessageEvent) => void);
    }) as typeof globalThis.addEventListener;
    globalThis.postMessage = postMessage as typeof globalThis.postMessage;

    try {
      await import('../src/worker/progressive-xlsx-worker');
      const onMessage = listeners[listeners.length - 1];
      expect(onMessage).toBeDefined();
      await onMessage!({ data: { type: 'start', buffer: smallInput.buffer } } as MessageEvent);
      expect(postMessage).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining('bounded ZIP decompression'),
        name: 'XlsxImportUnavailableError',
        code: 'XLSX_IMPORT_UNAVAILABLE',
      }, { transfer: [] });
    } finally {
      globalThis.addEventListener = originalAddEventListener;
      globalThis.postMessage = originalPostMessage;
    }
  });
});
