# CS-002D4-R1 PKG-09A — Resolver compatibility expansion

**Lane:** A — TypeScript-first Core resolver compatibility
**Scope:** Opt-in Core Jest resolver tests, test-only paired fixture, and this report.
**Jest:** Not run in this lane; coordinator owns serialized Jest execution.

## Resolver boundary reviewed

`packages/core/test/typescript-first-resolver.cjs` is unchanged. Its TypeScript-first behavior remains limited to extensionless relative or absolute requests whose resolved target is under `packages/core/src` and has a paired `.ts`/`.js` or `.tsx`/`.js` file (including paired index files). Explicit-extension requests, bare/package imports, and paths outside Core source are delegated to Jest's default resolver with the original options. `packages/core/jest.typescript-first.config.cjs` remains opt-in; the default Core Jest configuration was not changed.

The expanded `core-typescript-first-resolver.p1-pkg-08a.test.ts` coverage now includes:

| Compatibility case | Coverage |
| --- | --- |
| Relative extensionless Core source | Existing direct resolver assertion and Jest-loaded `DependencyGraph` check |
| Absolute extensionless Core source | Asserts `.ts` precedence and performs an absolute Jest `require` |
| Nested dependency resolution | Asserts the runtime dependency edge from `dag/DependencyGraph.ts` to paired `storage/CellStoreV1.ts` resolves TypeScript first |
| Explicit `.ts` and `.js` | Confirms both requests preserve their requested paths and default resolver options |
| Bare/package import | Confirms the bare `@cyber-sheet/core` request is delegated unchanged |
| `moduleNameMapper` | Confirms the opt-in config inherits the base mapper unchanged and uses the mapped Core source alias through Jest's actual resolver |
| Jest mock | Confirms an extensionless Core source request remains addressable through `jest.doMock` |
| Outside-source relative and absolute paths | New paired `test/fixtures/typescript-first-resolver/outside-source-paired.{js,ts}` proves default `.js` precedence is preserved outside `src` |
| JavaScript-only Core module and explicit CJS artifact | Existing coverage retained |

The mixed dependency case is bounded to the real TypeScript-to-paired-module edge in the source graph. No production fixture or source file was added to manufacture a larger mixed-language chain. The resolver changes no extension precedence for unrelated application/test paths.

## Checks and execution handoff

No Jest process was started. The standalone Node resolver smoke check passed six cases: relative Core source, absolute Core source, explicit `.ts`, bare package delegation, paired outside-source `.js` selection, and explicit `.js` preservation. `node --check` passed for the resolver, opt-in config, and new JavaScript fixture. `git diff --check` passed.

The Jest assertions—including mapper integration and mock behavior—remain unexecuted in Lane A and must be evaluated by the coordinator using the opt-in Core Jest config. This report does not claim Jest compatibility is verified until that serialized run completes. No Core protected sidecar was parked, restored, or changed in this lane; no before/after sidecar integrity claim is made.

## Change boundary

Added:

- `packages/core/test/fixtures/typescript-first-resolver/outside-source-paired.js`
- `packages/core/test/fixtures/typescript-first-resolver/outside-source-paired.ts`
- `docs/engineering/CS-002D4-R1-PKG-09A-resolver-compatibility.md`

Expanded:

- `packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts`

No default Jest configuration, production source, resolver implementation, generated sidecar, ledger disposition, frozen register, or historical manifest was changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
