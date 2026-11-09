# P1-08AX Lane B — Chromium provisioning result

**Status: blocked; no browser assertions ran.** The exact executable required by
this checkout could not be provisioned or verified from the available sources.

## Pin and expected executable

The installed `@playwright/test` and `playwright-core` are both **1.64.1**.
Playwright maps its Chromium build to revision **1248**, Chrome for Testing
**156.0.8078.4**. From the repository root,
`npx playwright install --dry-run chromium` reports the expected executable at
`/home/navidrezadoost/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`
and the official archive URL
`https://cdn.playwright.dev/builds/cft/156.0.8078.4/linux64/chrome-linux64.zip`.
That executable is absent. The corresponding headless-shell revision 1248 is
also absent.

## Search and provisioning evidence

- Inspected the Playwright cache under `/home/navidrezadoost/.cache/ms-playwright`,
  plus `/tmp`, `/mnt`, `/opt`, and `/var/cache`, for revision-1248 archives,
  installed revision directories, or Chrome 156.0.8078.4 artifacts. No complete
  browser artifact or installed executable was found.
- Three temporary Playwright download ZIP fragments were present in
  `/tmp/playwright-download-*` (361,925; 3,031,040; and 124,458 bytes). `unzip -t`
  failed on each with a missing ZIP central directory. They are incomplete and
  cannot serve as trusted provisioning artifacts.
- `npm config get registry` returns `https://registry.npmjs.org/`; no configured
  alternate package registry or browser mirror was identified in repository
  setup. The repository's prior browser handoff
  (`P1-08AO-playwright-chromium-offline-handoff.md`) describes a trusted,
  hash-verified cache transfer from a same-version staging machine, but no such
  cache or transfer artifact is available in this environment.
- A HEAD request to the official Playwright CDN returned a redirect to the
  Chrome for Testing object in Google Cloud Storage. Following the official URL
  timed out before response headers arrived. Earlier recorded provisioning
  attempts in the reconciliation history likewise failed with timeouts,
  connection resets, and HTTP 502. No alternate or unofficial mirror was used.
- System Google Chrome 133 is not the required build and was not substituted.

## Reproduction and next step

From the repository root, these commands reproduce the pin and missing-cache
check:

```sh
node -e "console.log(require('@playwright/test/package.json').version, require('playwright-core/package.json').version)"
npx playwright install --dry-run chromium
test -x /home/navidrezadoost/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
```

The last command exits nonzero here. The gate can proceed once the complete
Playwright 1.64.1-installed revision-1248 cache is transferred through an
authenticated trusted artifact channel and its per-file hashes are verified,
as specified in the AO handoff. Until then, no browser version, executable hash,
or browser-test result can be recorded; all 12 Chromium tests remain unrun.
