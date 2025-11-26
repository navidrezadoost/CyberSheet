# Development Process

- Branching: trunk-based with short-lived feature branches (feat/*, fix/*, docs/*)
- Reviews: at least 1 reviewer for code; 2 for public API changes
- RFCs: required for public API changes or major architecture decisions (docs/rfcs/<id>-<slug>.md)
- Commits: small, focused, conventional commits (feat:, fix:, docs:, refactor:, perf:, test:)
- Versioning: SemVer per package; publish from main after CI passes
- Stability: mark unstable APIs with @experimental JSDoc; avoid breaking changes in minor/patch
- Feature flags: expose via constructor options or sheet/renderer options; default off until stable

## CI/Quality gates
- Build and typecheck all workspaces
- Unit tests (core first), pixel tests (renderer) as they land
- Size check: enforce bundle size budgets for core and renderer
- Linting: tsc strict; eslint may be added later

## Release cadence
- 0.x series until API stabilizes; frequent patch/minor releases
- Changelog per release with breaking change notes and migration hints
