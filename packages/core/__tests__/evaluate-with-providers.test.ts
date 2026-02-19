import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { MockBatchResolver } from '../src/providers/ProviderResolution';
import { StockProvider, GeographyProvider } from '../src/providers';

describe('FormulaEngine.evaluateWithProviders (orchestrator) — PR #2', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);

    // Register providers so engine will recognize entity types
    engine.providers.register(new StockProvider());
    engine.providers.register(new GeographyProvider());
  });

  const createStockEntity = (symbol: string) => ({
    kind: 'entity',
    type: 'stock',
    display: symbol,
    fields: {},
    symbol
  } as any);

  const createGeoEntity = (code: string, display: string) => ({
    kind: 'entity',
    type: 'geography',
    display,
    fields: {},
    id: code
  } as any);

  const setA1 = (v: any) => sheet.setCellValue({ row: 1, col: 1 }, v);
  const setA2 = (v: any) => sheet.setCellValue({ row: 2, col: 1 }, v);

  test('happy path: resolves providers, seeds cache, evaluates synchronously', async () => {
    const stock = createStockEntity('AAPL');
    const geo = createGeoEntity('USA', 'USA');

    setA1(stock);
    setA2(geo);

    const backing = {
      'stock|AAPL|Price': 178.5,
      'geography|USA|Population': 331000000
    } as any;

    const resolver = new MockBatchResolver(backing);

    const result = await engine.evaluateWithProviders('=(A1.Price * 100) / (A2.Population / 1000000)', {
      worksheet: sheet,
      currentCell: { row: 2, col: 0 }
    }, resolver as any);

    expect(typeof result).toBe('number');
    expect((result as number)).toBeCloseTo(53.92, 1);
  });

  test('short-circuits on provider NOT_FOUND → #REF!', async () => {
    const stock = createStockEntity('AAPL');
    const geo = createGeoEntity('USA', 'USA');

    setA1(stock);
    setA2(geo);

    const backing = {
      'stock|AAPL|Price': 178.5,
      'geography|USA|Population': { kind: 'NOT_FOUND', message: 'nope' }
    } as any;

    const resolver = new MockBatchResolver(backing);

    const result = await engine.evaluateWithProviders('=(A1.Price * 100) / (A2.Population / 1000000)', {
      worksheet: sheet,
      currentCell: { row: 2, col: 0 }
    }, resolver as any);

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('deduplicates provider refs before resolving', async () => {
    const stock = createStockEntity('AAPL');
    setA1(stock);

    const backing = { 'stock|AAPL|Price': 178.5 } as any;
    const resolver = new MockBatchResolver(backing);

    const result = await engine.evaluateWithProviders('=A1.Price + A1.Price', { worksheet: sheet, currentCell: { row: 1, col: 2 } }, resolver as any);

    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(357.0, 2);
    // resolver should have been asked only once for the unique ref
    expect(resolver.requestedKeys.length).toBe(1);
  });
});
