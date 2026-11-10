# CyberSheet deepmerge security fork

This private workspace package is forked from the unmodified npm `deepmerge@4.3.1` tarball.

- npm tarball: `deepmerge-4.3.1.tgz`
- npm integrity: `sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==`
- npm shasum: `44b5f2147cd3b00d4b56137685966f26fd25dd4a`
- license: MIT, preserved in `license.txt`
- local fork version: `4.3.2+cybersheet.0` (not an upstream release; `cybersheet.0` is build metadata identifying the internal patched fork)

The only runtime behavior change is to omit own `__proto__` keys when enumerating source and target object keys. This prevents assignment to the destination's legacy `__proto__` setter. The same change is applied to the published CJS and UMD artifacts. Other merge behavior is covered by the adjacent regression suite.

The upstream advisory is GHSA-gcqx-w48m-w2h4 / CVE-2026-93753. No upstream fixed release was available when this fork was prepared. This fork does not suppress or relabel the advisory; its security status depends on independent review and successful scanning of the exact tree.
