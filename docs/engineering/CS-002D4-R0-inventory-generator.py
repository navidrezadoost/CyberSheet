#!/usr/bin/env python3
"""Generate the documentation-only CS-002D4-R0 source call-site inventory.

Run from the repository root:
  python3 docs/engineering/CS-002D4-R0-inventory-generator.py
  python3 docs/engineering/CS-002D4-R0-inventory-generator.py --check

This is an audit helper, not production code or a test runner. Regex results are
discovery candidates, not proof of a receiver type or complete ownership flow.
Aliases, destructured methods, computed property access, callback capture, and
mutation through returned objects require the companion TypeScript-symbol and
source-context review. Review output after every inventory change.
"""

from collections import Counter
import argparse
from io import StringIO
from pathlib import Path
import csv
import re
import sys


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs/engineering/CS-002D4-R0-callsite-inventory.tsv"
SOURCE_ROOTS = ("packages/", "examples/", "scripts/", "test-projects/")
SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".html", ".vue", ".svelte"}

SCANS = {
    "workbook": re.compile(
        r"\.(getSheet|activeSheet|activeSheetName|addSheet|deleteSheet|renameSheet)\b"
    ),
    "mutator": re.compile(
        r"\.(setCellValue|setCellFormula|clearCellContent|clearCellFormula|setCellStyle|"
        r"setRowStyle|setColumnStyle|mergeCells|cancelMerge|setHyperlink|removeHyperlink|"
        r"deleteCell|setColumnFilter|clearColumnFilter|clearAllFilters|hideRow|showRow|"
        r"hideCol|showCol|insertRows|insertColumns|reorderRows|reorderColumns|sortRange|"
        r"setDataValidation|removeDataValidation|setIcon|setCellComponent|clearCellComponent|"
        r"addComment|updateComment|deleteComment|applySnapshot|setRowHeight|setRowHeights|"
        r"setColumnWidth|protectSheet|unprotectSheet|setFreezePanes|clearFreezePanes|"
        r"setHeaderFooter|addConditionalFormattingRule|clearConditionalFormatting|"
        r"setConditionalFormattingRules|setAutoFilterRange|clearAutoFilterRange|addSheet|"
        r"deleteSheet|renameSheet|setPivotAnchor|setSlicer|clearSlicer|createPivot|deletePivot|"
        r"registerPivotDependency|unregisterPivotDependency)\s*\("
    ),
    "read": re.compile(
        r"\.(getCell|getCellValue|getUsedRange|getContiguousRange|getCellStyle|"
        r"getDirectCellStyle|getEffectiveCellStyle|getRowStyle|getColumnStyle|"
        r"getMergedRangeForCell|getMergedRanges|getFreezePanes|getSheetProtection|"
        r"getHeaderFooter|getColumnFilter|getAllFilters|getAutoFilterRange|getComments|"
        r"getAllComments|getIcon|getCellComponent|getDrawingLayer|getImages|getHiddenRows|"
        r"getHiddenCols|getFormulaAddresses|getPrecedents|getDependents|getSpecialCells|"
        r"getValidationCells|getConditionalFormattingRules|getDistinctValues|"
        r"getVisibleRowIndices|getVisibleColumnIndices|isRowHidden|isColHidden|isCellHidden|"
        r"isSheetProtected|isProgressiveLoading|isRowLoaded|find|findAll|forEachNonEmptyCell)\s*\("
    ),
    "escape": re.compile(
        r"\.(getStyleCache|getPivotRegistry|getPivotSnapshotStore|getPivotDependencyIndex|"
        r"getPivotInvalidationEngine|getPivotRecomputeEngine|getDrawingLayer|getHiddenRows|"
        r"getHiddenCols|forEachNonEmptyCell)\s*\(|\beventBus\b"
    ),
    "raw_type": re.compile(r"\bWorksheet\b"),
}

TYPE_CONTEXT = re.compile(
    r"(import|\btype\b|\binterface\b|\bclass\b|:\s*Worksheet\b|<\s*Worksheet\b|"
    r"\bWorksheet\s*\[\]|\bnew\s+Worksheet\b|\bas\s+Worksheet\b|"
    r"Promise\s*<\s*Worksheet)"
)
TEST_PATH = re.compile(r"(^|/)(__tests__|test|tests)(/|\.)|\.(test|spec)\.")


def classify(family: str, symbol: str, path: str, line: str) -> tuple[str, str, str]:
    is_test = bool(TEST_PATH.search(path))
    if family == "workbook":
        if symbol in {"addSheet", "deleteSheet", "renameSheet"} or (
            symbol == "activeSheetName" and re.search(r"activeSheetName\s*=", line)
        ):
            return (
                "user/workbook lifecycle mutation",
                "TransactionWorkbook; staged import/restore for load path",
                "commit/abort directory and identity; ID high-water remains monotonic",
            )
        return (
            "mutable Worksheet handle acquisition / potential escape",
            "WorkbookSheetView for read; TransactionSheet for mutation",
            "retained view reads committed revision; tx handle sees staged revision",
        )
    if family == "mutator":
        internal = any(
            marker in path
            for marker in (
                "/FormulaEngine.", "/SpillEngine.", "/RecomputeScheduler.",
                "/worksheet.ts", "/DependencyGraph.", "/PivotEngine.", "/worker/",
            )
        ) and not is_test
        return (
            "internal calculation/load mutation" if internal else
            ("test mutation callsite" if is_test else "user mutation callsite"),
            "private engine capability / D4.4 stage / TransactionSheet; reject unsupported before write",
            "commit/abort complete state or deterministic rejection before first write",
        )
    if family == "read":
        return (
            "read query; audit returned object for mutability",
            "WorkbookSheetView immutable/detached query",
            "retained view resolves published state; nested data cannot mutate owner",
        )
    if family == "escape":
        return (
            "mutable service/object escape",
            "read-only facade, detached snapshot, or capability-guarded internal service",
            "external mutation of returned object cannot alter owner state",
        )
    return (
        "raw Worksheet type/API dependency",
        "standalone Worksheet or WorkbookSheetView/TransactionSheet/private engine type",
        "type migration plus runtime capability/retained-handle isolation",
    )


def render_inventory() -> tuple[str, list[list[object]]]:
    rows = []
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT).as_posix()
        if (
            not path.is_file()
            or path.suffix not in SOURCE_SUFFIXES
            or not relative.startswith(SOURCE_ROOTS)
            or any(part in {"node_modules", "dist", "coverage"} for part in path.parts)
        ):
            continue
        try:
            lines = path.read_text(errors="replace").splitlines()
        except OSError:
            continue
        for number, source in enumerate(lines, 1):
            if source.strip().startswith(("//", "/*", "*", "<!--", "///")):
                continue
            found = set()
            for family, pattern in SCANS.items():
                for match in pattern.finditer(source):
                    if family == "raw_type":
                        if not TYPE_CONTEXT.search(source):
                            continue
                        symbol = "Worksheet"
                    else:
                        symbol = match.group(1) if match.lastindex else "eventBus"
                    found.add((family, symbol))
            for family, symbol in sorted(found):
                classification, target, scenario = classify(
                    family, symbol, relative, source
                )
                rows.append(
                    [family, relative, number, symbol, classification, target, scenario, source.strip()]
                )

    stream = StringIO(newline="")
    writer = csv.writer(stream, delimiter="\t", lineterminator="\n")
    writer.writerow(
        ["family", "path", "line", "symbol", "classification",
         "migration_target", "verification_scenario", "source_line"]
    )
    writer.writerows(rows)
    return stream.getvalue(), rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="compare the deterministic inventory with the checked-in TSV without writing it",
    )
    args = parser.parse_args()

    contents, rows = render_inventory()
    if args.check:
        try:
            current = OUTPUT.read_text()
        except OSError as error:
            print(f"Inventory check failed: cannot read {OUTPUT}: {error}", file=sys.stderr)
            return 1
        if current != contents:
            print(
                f"Inventory is stale: regenerate {OUTPUT.relative_to(ROOT)} and review the diff",
                file=sys.stderr,
            )
            return 1
        print(f"Inventory is deterministic and current: {len(rows)} candidate rows")
    else:
        OUTPUT.write_text(contents, newline="")
        print(f"Wrote {len(rows)} call-site/type-reference rows to {OUTPUT.relative_to(ROOT)}")
    for family, count in sorted(Counter(row[0] for row in rows).items()):
        print(f"{family}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
