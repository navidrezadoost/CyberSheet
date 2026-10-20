# Reproducible build and test baseline

## Supported toolchain

- Node.js: `24.22.0` (`.nvmrc`; `package.json` allows the patch line `24.22.x`).
- npm: `11.19.1` (`packageManager` field; `package.json` allows `11.19.x`).
- TypeScript: the repository lockfile's workspace dependency (`^6.0.3`).
- Jest: the repository lockfile's workspace dependency (`^30.3.0`).

Use the checked-in npm lockfile as the installation source:

```sh
nvm install
nvm use
npm ci
npm run typecheck
npm run build
npm test -- --ci --runInBand --coverage=false
```

Focused core checks can be run without the other Jest projects:

```sh
npm run typecheck --workspace @cyber-sheet/core
npm test --workspace @cyber-sheet/core -- --runInBand --coverage=false \
  __tests__/execution-kernel-regression.test.ts \
  __tests__/spreadsheet-engine.test.ts \
  __tests__/patch-engine.test.ts \
  __tests__/transaction-engine.test.ts
```

The CI workflow also runs the renderer-canvas and io-xlsx Jest configurations
separately. The root Jest config is a three-project config and enables coverage;
the core package command points at it, so `--coverage=false` is useful for
focused diagnosis and lower memory overhead.

## Configuration notes

`tsconfig.base.json` intentionally sets `types: []` so browser-facing core
source does not acquire ambient Node globals. Node-only code must use an
explicit runtime boundary or a local type declaration. Core production
typechecking uses `packages/core/tsconfig.json`; test typechecking uses
`packages/core/tsconfig.spec.json`, which adds Jest and Node types and maps the
renderer package to source.

The repository contained `package-lock.json` and `yarn.lock`, but both were
ignored by Git despite CI using `npm ci`. The generated npm lockfile is now
eligible for version control as the canonical installation lock; `yarn.lock`
remains legacy and is not used by the workflow. The npm lockfile was
regenerated with the pinned npm version to match the root manifest, and a
clean `npm ci` completed successfully. The pre-existing `node_modules`
directory is not evidence of reproducibility.

## CS-000B diagnostic classification

The previous 14 core diagnostics were resolved with strict mode still enabled:

- **2 production source errors:** `src/ChartBuilderController.ts` accepted the
  renderer's full `ChartManager` type, which resolved through stale built
  declarations and conflicted on the duplicated `ChartObject` export. Core now
  depends on the narrow `ChartManagerAdapter` (`create` only).
- **12 environment/module errors:** 10 Node `process` references in
  `CommandManager.ts`, `storage/CellStoreV1.ts`, and `storage-benchmark.ts`
  conflicted with the intentional `types: []` browser-safe base config. These
  now use typed runtime helpers; no Node dependency or broad cast was added.
  Two CommonJS `require` references in `FormulaEngine.ts` and
  `functions/exotic/exotic-functions.ts` were replaced by existing ESM
  imports. The latter's target only imports type declarations from the
  importing module's dependency graph, so it does not add a runtime cycle.

Verified command and result: `./node_modules/.bin/tsc -p
packages/core/tsconfig.json --noEmit --pretty false` using Node `24.22.0` and
TypeScript `6.0.3` — exit `0`.

## Verification commands

```sh
npm run typecheck --workspace @cyber-sheet/core
npm test -- --config packages/core/jest.config.cjs --runInBand --coverage=false
npm test -- --config packages/renderer-canvas/jest.config.cjs --runInBand --coverage=false
npm test -- --config packages/io-xlsx/jest.config.cjs --runInBand --coverage=false
```

Run the full Jest command in controlled groups while the memory baseline is
being established. Record each command, exit code, suite result, and process
heap/RSS; do not interpret a terminated full run as a passing baseline.
