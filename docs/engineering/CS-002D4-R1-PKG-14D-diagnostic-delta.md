# CS-002D4-R1 PKG-14D — Diagnostic delta from PKG-13

| Measure | PKG-13 | PKG-14D | Change |
| --- | ---: | ---: | ---: |
| Discovered suites | 302 | 305 | +3 |
| Passed suites | 290 | 293 | +3 |
| Failed suites | 7 | 7 | 0 |
| Skipped suites | 5 | 5 | 0 |
| Total tests | 7,485 | 7,521 | +36 |
| Passed tests | 7,285 | 7,321 | +36 |
| Failed tests | 18 | 18 | 0 |
| Skipped tests | 173 | 173 | 0 |
| Todo tests | 9 | 9 | 0 |

The three added suites and 36 passing tests correspond to the three PKG-14 focused lane suites. The same seven Pivot-related suites failed, with the same shape: one setup-failing suite containing 18 failures and six compile-blocked suites containing zero executed tests. No resolver failures or executed assertion failures were reported.

This demonstrates that PKG-14's new focused coverage is green in the expanded current worktree and the observed Core failure count did not increase. It is not proof of a historical clean-tree cause, global Core correctness, or release acceptance. PKG-13's full Core raw output remains unchanged. PKG-14D's full output is `CS-002D4-R1-PKG-14D-full-core-jest-output.txt`, SHA-256 `b87d9bc5ab96a4d9da514e08adabbb6ab7e825170e519771dc8637b032f6e390`.

**Disposition:** Supported Core reliability evidence improved; known Workbook Pivot fixture reachability blockers remain. Do not hide the seven suites, change Workbook API guards, promote owner-dependent behavior, or recapture the acceptance baseline. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
