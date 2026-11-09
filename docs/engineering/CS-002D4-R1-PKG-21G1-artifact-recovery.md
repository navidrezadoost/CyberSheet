# CS-002D4-R1 PKG-21G1 — Candidate artifact recovery

**Recovery classification: ARTIFACT UNAVAILABLE.** No trustworthy complete PKG-19D source artifact was found in the bounded locations checked. No candidate was reconstructed and no archive was created.

## Bounded recovery checks

- Recorded candidate paths `/tmp/pkg19d-candidate` and `/tmp/pkg18b-candidate` are absent. `git worktree list --porcelain` lists `/tmp/pkg18b-candidate` as prunable, with its gitdir pointing to a missing location; it lists no PKG-19D worktree.
- The existing `Documents/Engineering-artifacts` location was checked for files matching the PKG-18B/PKG-19D candidate artifact names and candidate archive/patch extensions. No matching artifact was found. The two extant engineering worktrees listed there are unrelated to this candidate.
- The repository's retained PKG-18B and PKG-19D manifests/reports identify candidate source hashes and prior verification outputs, but are not a complete candidate source snapshot, test overlay, configuration/dependency bundle, or archive. Historical test output alone cannot reproduce candidate bytes.
- The current repository's reachable refs were checked for names containing `PKG-18`, `PKG-19`, or `candidate`; none matched. No candidate commit/reference was identified by this bounded check.
- Shared repository HEAD remains `88b09634f17f3b39d88a88c5428f76b426459a2b`. The shared worktree is dirty; it was not used as a candidate substitute.

## Identity requirements that remain unverified

PKG-19D reports the following final source identities. They are historical expected hashes only; absent candidate bytes could not be compared against them.

| Candidate source file | PKG-19D reported SHA-256 |
| --- | --- |
| `packages/core/src/workbook-access-types.ts` | `b25def7cada085fbd1fe412fa0f118803f062ebf06ee080da7d6918af77ae2f9` |
| `packages/core/src/index.ts` | `5f281437385d2ecd27394241e8cbb90e308ba2a6f6592390fdf93f66e53c87f7` |
| `packages/core/src/workbook.ts` | `5c0d08c0631699aff00f733571191bc1c1040e4013b961c22c2de9d36f678cdb` |
| `packages/core/src/worksheet.ts` | `0150d8e2367225864192dee64e0d4eeafd56f12f0fe66e038c0233772bda27fc` |
| `packages/core/src/dag/DependencyGraph.ts` | `a5918a4bd224071c7c7d2388e096e2af02fa1a0996570453067ea41d5b612c21` |
| `packages/core/src/events.ts` | `4bcc5b34f48b92e285eb31e1acb172540b58fe92eba5d3b72dccbe8ae2257225` |
| `packages/core/src/EventBus.ts` | `6e95d462949efbbc4de64cf7e0def3c2daa49e7fb9f168189bdbac133efc4b2d` |
| `packages/core/src/workbookMutationStrategy.ts` | `39c065bec11d7371ec72907ca7fca337f98530ac80b11e50aca7a4aff5949171` |
| `packages/core/src/workbookMutationTestHooks.ts` | `186a5894adf019f823d7ab990370c158e9ad6eb372f69d9e30a9a75777d25cd4` |

The PKG-19D report also records two focused test additions and refers to the PKG-18B test/configuration overlay. Those records do not supply a complete durable copy of every candidate file and dependency/configuration input required by PKG-21's identity criteria. The required Node 24.22.x/npm 11.19.x environment was not used; no candidate verification ran.

## Recovery action

Project leadership or the responsible artifact custodian must provide the immutable complete PKG-19D candidate archive and manifest, including all nine source files, PKG-19C corrections, required test additions/overlays, TypeScript-first Jest resolver/configuration, and dependency/environment records. Then verify every file against the retained hashes and create a content-addressed archive in an approved durable location. If that artifact no longer exists, a prospective reconstruction requires separate authorization, a new identity, new hashes, fresh review, and independent verification. It must not be called recovered PKG-19D.
