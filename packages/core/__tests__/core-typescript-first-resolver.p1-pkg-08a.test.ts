import fs from 'node:fs';
import path from 'node:path';
import { DependencyGraph } from '../src/dag/DependencyGraph';

const coreResolver = require('../test/typescript-first-resolver.cjs') as (
  request: string,
  options: Record<string, unknown> & {
    basedir: string;
    defaultResolver: (request: string, options: Record<string, unknown>) => string;
    extensions: string[];
  },
) => string;

describe('PKG-08A Core source resolver', () => {
  const basedir = __dirname;
  const extensions = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.node'];

  function resolveUsingDefault(
    request: string,
    incomingExtensions = extensions,
    requestBase = basedir,
  ) {
    const defaultResolver = jest.fn((specifier: string, options: Record<string, unknown>) => {
      const moduleExtensions = options.extensions as string[];
      if (path.extname(specifier)) return path.resolve(requestBase, specifier);
      const target = path.resolve(requestBase, specifier);
      for (const extension of moduleExtensions) {
        if (fs.existsSync(`${target}${extension}`)) return `${target}${extension}`;
      }
      throw new Error(`Cannot resolve ${specifier}`);
    });

    const resolved = coreResolver(request, {
      basedir: requestBase,
      defaultResolver,
      extensions: incomingExtensions,
    });
    return { resolved, defaultResolver };
  }

  test('extensionless imports select TypeScript when a generated JavaScript sibling exists', () => {
    const { resolved, defaultResolver } = resolveUsingDefault('../src/dag/DependencyGraph');

    expect(resolved).toBe(path.resolve(basedir, '../src/dag/DependencyGraph.ts'));
    expect(defaultResolver).toHaveBeenCalledWith(
      '../src/dag/DependencyGraph',
      expect.objectContaining({ extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.json', '.node'] }),
    );
  });

  test('Jest loads the current DependencyGraph TypeScript implementation', () => {
    expect(typeof new DependencyGraph().beginMutationJournal).toBe('function');
    expect(typeof new DependencyGraph().setMutationFailureInjector).toBe('function');
  });

  test('an absolute extensionless Core source import still selects TypeScript', () => {
    const absoluteRequest = path.resolve(basedir, '../src/dag/DependencyGraph');
    const { resolved, defaultResolver } = resolveUsingDefault(absoluteRequest);

    expect(resolved).toBe(path.resolve(basedir, '../src/dag/DependencyGraph.ts'));
    expect(defaultResolver).toHaveBeenCalledWith(
      absoluteRequest,
      expect.objectContaining({ extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.json', '.node'] }),
    );
    const loaded = require(absoluteRequest) as { DependencyGraph: typeof DependencyGraph };
    expect(typeof new loaded.DependencyGraph().beginMutationJournal).toBe('function');
  });

  test('a nested TS-to-paired-module dependency resolves its TypeScript source', () => {
    const nestedBasedir = path.resolve(basedir, '../src/dag');
    const { resolved, defaultResolver } = resolveUsingDefault(
      '../storage/CellStoreV1',
      extensions,
      nestedBasedir,
    );

    expect(resolved).toBe(path.resolve(basedir, '../src/storage/CellStoreV1.ts'));
    expect(defaultResolver).toHaveBeenCalledWith(
      '../storage/CellStoreV1',
      expect.objectContaining({
        basedir: nestedBasedir,
        extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.json', '.node'],
      }),
    );
  });

  test('explicit JavaScript imports preserve the default resolver options and requested path', () => {
    const { resolved, defaultResolver } = resolveUsingDefault('../src/dag/DependencyGraph.js');

    expect(resolved).toBe(path.resolve(basedir, '../src/dag/DependencyGraph.js'));
    expect(defaultResolver).toHaveBeenCalledWith(
      '../src/dag/DependencyGraph.js',
      { basedir, defaultResolver: expect.any(Function), extensions },
    );
  });

  test('explicit TypeScript imports preserve the default resolver options and requested path', () => {
    const request = '../src/dag/DependencyGraph.ts';
    const { resolved, defaultResolver } = resolveUsingDefault(request);

    expect(resolved).toBe(path.resolve(basedir, request));
    expect(defaultResolver).toHaveBeenCalledWith(
      request,
      { basedir, defaultResolver: expect.any(Function), extensions },
    );
  });

  test('bare package requests are delegated without changing the default options', () => {
    const request = '@cyber-sheet/core';
    const defaultResolver = jest.fn(() => '/resolved/package-entry');

    const resolved = coreResolver(request, { basedir, defaultResolver, extensions });

    expect(resolved).toBe('/resolved/package-entry');
    expect(defaultResolver).toHaveBeenCalledWith(request, {
      basedir,
      defaultResolver,
      extensions,
    });
  });

  test('the inherited moduleNameMapper remains intact and maps a Core alias to current source', () => {
    const baseConfig = require('../jest.config.cjs') as { moduleNameMapper: unknown };
    const optInConfig = require('../jest.typescript-first.config.cjs') as { moduleNameMapper: unknown };
    expect(optInConfig.moduleNameMapper).toEqual(baseConfig.moduleNameMapper);

    const loaded = jest.requireActual('@cyber-sheet/core/dag/DependencyGraph') as {
      DependencyGraph: typeof DependencyGraph;
    };
    expect(typeof new loaded.DependencyGraph().beginMutationJournal).toBe('function');
  });

  test('Jest module mocks remain addressable for extensionless Core source requests', () => {
    const request = '../src/dag/DependencyGraph';
    jest.doMock(request, () => ({ mockedResolverTarget: true }));
    try {
      const loaded = require(request) as { mockedResolverTarget?: boolean };
      expect(loaded).toEqual({ mockedResolverTarget: true });
    } finally {
      jest.dontMock(request);
    }
  });

  test('paired JavaScript and TypeScript files outside Core source keep default precedence', () => {
    const request = '../test/fixtures/typescript-first-resolver/outside-source-paired';
    const { resolved, defaultResolver } = resolveUsingDefault(request);

    expect(resolved).toBe(path.resolve(basedir, `${request}.js`));
    expect(defaultResolver).toHaveBeenCalledWith(
      request,
      { basedir, defaultResolver: expect.any(Function), extensions },
    );

    const absoluteRequest = path.resolve(basedir, request);
    const absolute = resolveUsingDefault(absoluteRequest);
    expect(absolute.resolved).toBe(`${absoluteRequest}.js`);
    expect(absolute.defaultResolver).toHaveBeenCalledWith(absoluteRequest, {
      basedir,
      defaultResolver: expect.any(Function),
      extensions,
    });
  });

  test('JavaScript-only modules are not forced to a TypeScript candidate', () => {
    const { resolved, defaultResolver } = resolveUsingDefault('../src/vanilla/ChartBuilder');

    expect(resolved).toBe(path.resolve(basedir, '../src/vanilla/ChartBuilder.js'));
    expect(defaultResolver).toHaveBeenCalledWith(
      '../src/vanilla/ChartBuilder',
      { basedir, defaultResolver: expect.any(Function), extensions },
    );
  });

  test('an explicit CommonJS runtime artifact remains loadable', () => {
    expect(require('../test/fixtures/typescript-first-resolver/runtime-artifact.cjs')).toEqual({
      runtimeArtifact: true,
    });
  });
});
