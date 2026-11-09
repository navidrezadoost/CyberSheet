# P1-08AO — Playwright Chromium 1248 offline handoff

The repository pins `@playwright/test` and `playwright-core` at **1.64.1** in
the lockfile. Its matching browser is **Chromium revision 1248 / Chrome for
Testing 156.0.8078.4**. The locally installed Google Chrome 133 is not a valid
substitute for the six Chromium browser cases.

## Trusted provisioning

Prefer a CI or pre-provisioned worker image whose Playwright package version is
1.64.1 and whose browser cache was installed by that same package version. If
the worker must be provisioned offline:

1. On a connected, trusted staging machine, check out the same commit and run
   `npm ci` with the repository lockfile and Node 24.22.0.
2. Confirm `npm ls @playwright/test playwright-core` reports 1.64.1, then run
   `npx playwright install --dry-run chromium` and retain the output with the
   artifact record.
3. Run `npx playwright install chromium`. This is the supported Playwright
   installer and selects Chromium revision 1248 for the locked package. Do not
   download an arbitrary Chrome archive or copy a system Chrome executable.
4. Record SHA-256 hashes for every file in the resulting Playwright browser
   cache, package versions, the installer output, OS/architecture, and the
   source commit. Transfer the complete cache and its hash manifest through
   the organization's authenticated artifact store. Verify every hash after
   transfer before making the cache available to CI.
5. Point `PLAYWRIGHT_BROWSERS_PATH` at the verified cache. Confirm
   `node -p "require('playwright').chromium.executablePath()"` resolves to an
   executable within that cache and that the installed binary identifies as
   Chrome for Testing 156.0.8078.4. Do not use `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`
   to bypass the availability check.

## Execution

From the repository root, with Node 24.22.0 and the verified cache:

```sh
npx playwright test --project=chromium --list
npx playwright test --project=chromium --workers=1
```

The first command records the discovered test identities; compare it with the
six Chromium cases in the AN/AO verification manifests. The second command
runs them against the pinned browser. Retain the Playwright list/JSON output,
browser version, executable path, Node/npm versions, and the cache hash-manifest
digest. A launch failure means no browser assertion ran; it must not be
reported as an application test failure or pass.

**Current AO status:** no trusted complete revision-1248 browser cache was
available in this checkout, and the known system Chrome 133 remains excluded.
This is a reproducible handoff, not a claim that AO ran browser assertions.
