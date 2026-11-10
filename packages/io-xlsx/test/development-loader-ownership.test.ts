import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TextReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js';
import { Workbook, Worksheet } from '@cyber-sheet/core';
import { loadXlsxFromArrayBuffer, loadXlsxFromUrl } from '../src/index';

declare global {
  // Vite may define this flag for development builds; it must not bypass the R6 gate.
  var __CYBER_SHEET_DEV__: boolean | undefined;
}

const R6_UNAVAILABLE = /XLSX import is unavailable until R6 staged restore is authorized/;

async function makeXlsx(): Promise<Uint8Array> {
  const output = new Uint8ArrayWriter();
  const writer = new ZipWriter(output, { useWebWorkers: false, useCompressionStream: false });
  await writer.add('xl/workbook.xml', new TextReader(
    '<workbook><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
  ));
  await writer.add('xl/_rels/workbook.xml.rels', new TextReader(
    '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  ));
  await writer.add('xl/worksheets/sheet1.xml', new TextReader(
    '<worksheet><dimension ref="A1"/><sheetData><row r="1"><c r="A1"><f>40+2</f><v>420042</v></c></row></sheetData></worksheet>',
  ));
  await writer.close();
  return output.getData();
}

describe('Workbook-producing XLSX loader R6 gate', () => {
  let previousDevFlag: PropertyDescriptor | undefined;
  let previousEnableEnv: string | undefined;

  const importEnvironment = () =>
    (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
      .process?.env;

  beforeEach(() => {
    previousDevFlag = Object.getOwnPropertyDescriptor(globalThis, '__CYBER_SHEET_DEV__');
    previousEnableEnv = importEnvironment()?.CYBER_SHEET_ENABLE_XLSX_IMPORT;
    if (importEnvironment()) delete importEnvironment()!.CYBER_SHEET_ENABLE_XLSX_IMPORT;
    Object.defineProperty(globalThis, '__CYBER_SHEET_DEV__', {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    if (previousDevFlag) {
      Object.defineProperty(globalThis, '__CYBER_SHEET_DEV__', previousDevFlag);
    } else {
      delete (globalThis as typeof globalThis & { __CYBER_SHEET_DEV__?: boolean }).__CYBER_SHEET_DEV__;
    }
    if (previousEnableEnv === undefined) {
      if (importEnvironment()) delete importEnvironment()!.CYBER_SHEET_ENABLE_XLSX_IMPORT;
    } else if (importEnvironment()) {
      importEnvironment()!.CYBER_SHEET_ENABLE_XLSX_IMPORT = previousEnableEnv;
    }
    jest.restoreAllMocks();
  });

  it('rejects a valid formula workbook before imported sheets attach in development', async () => {
    const attach = jest.spyOn(Workbook.prototype, 'attachDevImportSheet');
    const xlsx = await makeXlsx();

    expect(() => loadXlsxFromArrayBuffer(xlsx)).toThrow(R6_UNAVAILABLE);
    expect(attach).not.toHaveBeenCalled();
  });

  it('rejects independently of the development flag when it is disabled', () => {
    Object.defineProperty(globalThis, '__CYBER_SHEET_DEV__', {
      configurable: true,
      writable: true,
      value: false,
    });
    const attach = jest.spyOn(Workbook.prototype, 'attachDevImportSheet');

    expect(() => loadXlsxFromArrayBuffer(new Uint8Array(0))).toThrow(R6_UNAVAILABLE);
    expect(attach).not.toHaveBeenCalled();
  });

  it('rejects ZIP-like untrusted bytes before parsing entry metadata', () => {
    // Keep the fixture bounded. If the R6 gate is ever opened, ZIP parsing must
    // receive its own size-limited implementation before untrusted input reaches
    // any ZIP reader.
    const suspiciousZip = new Uint8Array(30);
    suspiciousZip.set([0x50, 0x4b, 0x03, 0x04]);

    expect(() => loadXlsxFromArrayBuffer(suspiciousZip)).toThrow(R6_UNAVAILABLE);
  });

  it('does not let the import environment override bypass the R6 gate', async () => {
    if (importEnvironment()) importEnvironment()!.CYBER_SHEET_ENABLE_XLSX_IMPORT = '1';
    const attach = jest.spyOn(Workbook.prototype, 'attachDevImportSheet');
    const xlsx = await makeXlsx();

    expect(() => loadXlsxFromArrayBuffer(xlsx)).toThrow(R6_UNAVAILABLE);
    expect(attach).not.toHaveBeenCalled();
  });

  it('rejects URL imports before fetching or publishing a Workbook', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        const xlsx = await makeXlsx();
        return xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength) as ArrayBuffer;
      },
    } as Response));
    const publish = jest.fn<(workbook: Workbook) => void>();
    const attach = jest.spyOn(Workbook.prototype, 'attachDevImportSheet');
    const loadAndPublish = async () => {
      const workbook = await loadXlsxFromUrl('/book.xlsx', fetchFn);
      publish(workbook);
    };

    await expect(loadAndPublish()).rejects.toThrow(R6_UNAVAILABLE);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(attach).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
