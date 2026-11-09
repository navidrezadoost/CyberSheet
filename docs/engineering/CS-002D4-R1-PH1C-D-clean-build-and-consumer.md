# CS-002D4-R1 PH1C Lane D — Clean build and consumer reproducibility

**Candidate-02 archive:** `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-02.tar.gz`
**Expected/observed SHA-256:** `5f9370222130e721b9a4da015d72c165d36ec471a1d43fd0670502f9d3666839`.

## Archive and environment

The archive was checked before use. It contains 26 tar members, no symlinks, no absolute paths, and no path traversal entries. It was extracted into a fresh PH1C location; all 11 payload hashes passed. Those 11 overlay files were byte-compared with the clean base worktree plus archived overlay and matched. Base revision is `88b09634f17f3b39d88a88c5428f76b426459a2b`.

Node 24.22.0 and npm 11.19.1 were selected using `/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin/{node,npm}`. `nvm` was not available as a shell function, so the installed binaries were invoked directly.

## Dependency/build status

In the fresh isolated Lane D worktree, `npm ci --ignore-scripts` was attempted with the archived lockfile and configured registry. It emitted deprecation warnings and then made no progress until the 120-second timeout returned exit 124. This is an infrastructure/connectivity blocker; no registry switch or lockfile change was made. The partial install was not treated as clean evidence.

Core typecheck, package build, emitted declaration validation, and supported external-consumer type/runtime imports could not be run from a clean install. Candidate-02's earlier focused/typecheck results used existing shared dependencies and are provisional. No consumer runtime import or package build is claimed.

## Reused-dependency follow-up against Candidate-03

After the clean install timeout, a non-clean probe was run against the isolated Candidate-03 Core package using the existing repository dependency tree through a temporary `node_modules` symlink. The symlink, generated `dist`, declaration output, and consumer probe were removed afterward.

- The actual `npm run build --workspace @cyber-sheet/core` package script passed end to end (tsup 8.5.1 and TypeScript 6.0.3 declaration emit), using the shared dependency tree through a temporary symlink.
- A runtime package self-import succeeded and exposed `Workbook`.
- An external consumer TypeScript probe passed with `moduleResolution: Bundler`.
- The same consumer probe failed with `moduleResolution: NodeNext`: the emitted declarations use extensionless relative imports, producing TS2834 diagnostics and causing `Workbook` not to resolve from the package root. This is a reproducible declaration-consumer compatibility limitation in the current package output. It was not corrected under PH1C, which prohibits unrelated package/public-surface edits.

These are reused-dependency results, not clean reproducibility. `npm ci --ignore-scripts` still timed out after 120 seconds; no clean dependency tree was established. Temporary dependency symlink, generated `dist`, declaration output, and consumer fixture were removed after verification. No lockfile or registry changes were made.

**Disposition:** clean install remains blocked by environment/connectivity. The actual package build, runtime import, and Bundler consumer typing passed with reused dependencies; NodeNext consumer typing failed on emitted declaration import paths. Candidate-wide package-consumer qualification remains open.
