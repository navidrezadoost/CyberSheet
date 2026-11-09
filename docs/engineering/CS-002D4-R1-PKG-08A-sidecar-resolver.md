# CS-002D4-R1 PKG-08A — Protected sidecar resolver lane

**Scope:** Core Jest test-resolution tooling only. This lane did not modify production source, protected generated sidecars, Lane B tests, or Lane C evidence.

## Finding

The installed Jest 30 default `moduleFileExtensions` order is `js, mjs, cjs, jsx, ts, mts, cts, tsx, json, node` (`node_modules/jest-config/build/index.js`). With extensionless imports, an existing same-stem `.js` file is therefore eligible ahead of its `.ts` source. The Core tree contains protected generated `.js` sidecars next to current TypeScript. PKG-03C records a reproduced example: tests resolved a stale `DependencyGraph.js` that lacked current `beginMutationJournal` and `setMutationFailureInjector` methods; parking sidecars made the same selection pass. That history identifies a resolver hazard, not a production regression.

## Bounded resolver configuration

Added an opt-in `packages/core/jest.typescript-first.config.cjs`, which inherits the existing Core Jest config and installs `packages/core/test/typescript-first-resolver.cjs`. The resolver changes extension precedence only when all of these are true:

- The request is extensionless and relative or absolute.
- Its resolved candidate is inside `packages/core/src`.
- A same-stem `.ts` or `.tsx` source and `.js` generated sibling both exist (including paired `index` files).

For that case, it asks Jest's supplied default resolver with `.ts` and `.tsx` first. Explicit extensions, bare/package imports, paths outside Core source, and JavaScript-only Core modules go through the unmodified default resolver. In particular, explicit `.js` imports keep their requested runtime artifact.

The configuration is opt-in; existing Jest commands retain their current behavior unless run with the new config. No permanent deletion or restoration of generated files is needed by the resolver itself.

## Resolver cases prepared for verification

`packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts` contains five checks:

1. Current `DependencyGraph.ts` is selected for its extensionless source import despite the generated `.js` sibling.
2. The actual Jest-loaded class exposes the two current methods missing from the stale-sidecar incident.
3. An explicit `.js` request is passed through with unchanged extension options.
4. An extensionless JavaScript-only Core module remains resolvable as `.js`.
5. An explicit `.cjs` runtime artifact remains loadable.

The direct wrapper checks use a small default-resolver double to assert exactly which options are passed. The `DependencyGraph` import and `.cjs` fixture are integration assertions that require execution under the opt-in Jest config.

## Commands and results

This lane did not run Jest, consistent with the coordinator's serialization instruction. The root coordinator must run the focused resolver test and relevant suites with:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts
```

A Node-only resolver-double smoke check was run without invoking Jest:

```sh
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const resolver = require('./packages/core/test/typescript-first-resolver.cjs');
const basedir = path.resolve('packages/core/__tests__');
const extensions = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.node'];
for (const request of ['../src/dag/DependencyGraph', '../src/dag/DependencyGraph.js', '../src/vanilla/ChartBuilder']) {
  const defaultResolver = (specifier, options) => {
    if (path.extname(specifier)) return path.resolve(basedir, specifier);
    const target = path.resolve(basedir, specifier);
    for (const extension of options.extensions) {
      if (fs.existsSync(`${target}${extension}`)) return `${target}${extension}`;
    }
    throw new Error(`Cannot resolve ${specifier}`);
  };
  const resolved = resolver(request, { basedir, defaultResolver, extensions });
  process.stdout.write(`${request} -> ${path.relative(process.cwd(), resolved)}\n`);
}
NODE
```

Observed output:

```text
../src/dag/DependencyGraph -> packages/core/src/dag/DependencyGraph.ts
../src/dag/DependencyGraph.js -> packages/core/src/dag/DependencyGraph.js
../src/vanilla/ChartBuilder -> packages/core/src/vanilla/ChartBuilder.js
```

This validates the wrapper's path and extension policy, not Jest integration. The authored Jest integration test remains unexecuted until the serialized coordinator run.

## Integrity boundary and handoff

The resolver and configuration do not move, delete, or rewrite generated source files. No Jest process or sidecar isolation procedure ran in this lane, so this report makes no before/after claim for the protected 237-entry manifest. The integrated gate must verify those hashes around its serialized test window.

Files added by Lane A:

- `packages/core/jest.typescript-first.config.cjs`
- `packages/core/test/typescript-first-resolver.cjs`
- `packages/core/test/fixtures/typescript-first-resolver/runtime-artifact.cjs`
- `packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts`
- `docs/engineering/CS-002D4-R1-PKG-08A-sidecar-resolver.md`

**Status:** Resolver implementation prepared; integration verification pending coordinator Jest run. No production behavior or mutation contract changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
