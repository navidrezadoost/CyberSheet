# Find & Replace Guide

Complete guide to Find & Replace functionality in CyberSheet Excel.

## Overview

The Find & Replace feature provides fast, flexible search and replacement operations across worksheet data, formulas, and comments. Built with Excel parity, it supports all standard search options including wildcards, case sensitivity, and whole-cell matching.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                    │
├─────────────────────────────────────────────────────────────┤
│  FindReplaceDialog.tsx                                      │
│  - Find/Replace tabs                                        │
│  - Options (case, whole cell, wildcards)                   │
│  - Navigation (Next, Previous, Replace, Replace All)       │
│  - Status messages and match counter                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer (Core)                     │
├─────────────────────────────────────────────────────────────┤
│  FindService.ts                                             │
│  - Stateful wrapper for search operations                  │
│  - findAll() - Execute search, store results               │
│  - findNext() / findPrevious() - Navigate with wrap        │
│  - replaceCurrent() - Replace active match                 │
│  - replaceAllMatches() - Batch replacement                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                Search Engine (Low-Level)                    │
├─────────────────────────────────────────────────────────────┤
│  search/index.ts (findAll, replaceAll)                     │
│  - Sparse cell map iteration (O(cells) not O(rows×cols))  │
│  - Wildcard pattern matching (*, ?, ~)                     │
│  - Case-sensitive/insensitive comparison                   │
│  - Search in values, formulas, or comments                 │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Search Options

| Option | Values | Description | Excel Parity |
|--------|--------|-------------|--------------|
| **Match case** | true/false | Case-sensitive search | ✅ 100% |
| **Match entire cell** | true/false | Whole-cell vs substring | ✅ 100% |
| **Search in** | values/formulas/comments | Content scope | ✅ 100% |
| **Search by** | rows/columns | Iteration order | ✅ 100% |
| **Wildcards** | *, ?, ~ | Pattern matching | ✅ 100% |

### Wildcard Patterns

```
Pattern          Example             Matches
─────────────────────────────────────────────────────────────
Apple*           Apple               Apple, Apples, Apple Inc.
App?e            App?e               Apple (not Apples)
~*special        ~*special           Literal "*special"
???              ???                 Any 3-char string
A[0-9]           A1, A5              (not supported yet)
```

### Navigation

- **Find Next**: Navigate forward with wrap-around (reaches end → jumps to start)
- **Find Previous**: Navigate backward with wrap-around
- **Enter key**: Find Next when in Find input field
- **Match counter**: Shows "3 of 15" to track current position

### Replacement

- **Replace**: Replace current match and move to next
- **Replace All**: Replace all matches in one operation (atomic)
- **Undo support**: All replacements are undoable

## Usage

### Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+F` | Open Find dialog | Global (except input fields) |
| `Ctrl+H` | Open Replace dialog | Global (except input fields) |
| `Enter` | Find Next | Inside Find input |
| `Esc` | Close dialog | Inside dialog |

### Programmatic API

#### Basic Search

```typescript
import { FindService } from '@cyber-sheet/core';

const findService = new FindService(worksheet);

// Find all matches
const results = findService.findAll('Apple', {
  lookIn: 'values',
  lookAt: 'part',
  matchCase: false,
  searchOrder: 'rows',
});

console.log(`Found ${results.length} matches`);
// Output: Found 9 matches

// Access match details
results.forEach((match, idx) => {
  console.log(`${idx + 1}. ${match.address.row}:${match.address.col} = "${match.value}"`);
});
```

#### Navigation

```typescript
// Navigate through results
const firstMatch = findService.findNext();
console.log(`First match at ${firstMatch.address.row}:${firstMatch.address.col}`);

const secondMatch = findService.findNext();
console.log(`Second match at ${secondMatch.address.row}:${secondMatch.address.col}`);

// Wrap-around: When at last match, findNext() returns first match
```

#### Replace Operations

```typescript
// Replace current match
findService.replaceCurrent('Orange');
console.log('Replaced 1 occurrence');

// Replace all matches
const count = findService.replaceAllMatches('Apple', 'Orange', {
  lookIn: 'values',
  matchCase: false,
});
console.log(`Replaced ${count} occurrences`);
```

#### Advanced Options

```typescript
// Case-sensitive whole-cell match
const results = findService.findAll('APPLE', {
  lookIn: 'values',
  lookAt: 'whole',      // Entire cell must match
  matchCase: true,      // Case-sensitive
  searchOrder: 'columns',
});

// Search in formulas
const formulaResults = findService.findAll('SUM', {
  lookIn: 'formulas',   // Search formula text, not values
  lookAt: 'part',
});

// Search in comments
const commentResults = findService.findAll('urgent', {
  lookIn: 'comments',
  matchCase: false,
});
```

### React Integration

```tsx
import React, { useState } from 'react';
import FindReplaceDialog from '@cyber-sheet/react/components/dialogs/FindReplaceDialog';
import type { Worksheet } from '@cyber-sheet/core';

function MyApp({ worksheet }: { worksheet: Worksheet }) {
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });

  return (
    <>
      <button onClick={() => setFindDialogOpen(true)}>
        Find & Replace
      </button>

      <FindReplaceDialog
        isOpen={findDialogOpen}
        onClose={() => setFindDialogOpen(false)}
        worksheet={worksheet}
        initialTab="find"
        onMatchSelected={(address) => {
          setSelectedCell(address);
          // Scroll to matched cell, highlight, etc.
        }}
      />
    </>
  );
}
```

## Implementation Details

### Performance

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|-----------------|------------------|-------|
| Find All | O(n × m) | O(k) | n=cells, m=pattern length, k=matches |
| Find Next | O(1) | O(1) | Results cached after findAll() |
| Replace Current | O(1) | O(1) | Single cell update |
| Replace All | O(k) | O(k) | k=match count |

**Sparse Storage Optimization**: The search engine iterates only over populated cells, not the entire grid. For a sheet with 1000 cells out of 1M (1000×1000) capacity, search time is O(1000) not O(1M).

### Wildcard Implementation

```typescript
// Convert wildcard pattern to regex
function wildcardToRegex(pattern: string, matchCase: boolean): RegExp {
  // Escape literal wildcards: ~* → \* (literal asterisk)
  let escaped = pattern.replace(/~([*?])/g, '\\$1');
  
  // Convert wildcards: * → .*, ? → .
  escaped = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  
  const flags = matchCase ? '' : 'i';
  return new RegExp(`^${escaped}$`, flags);
}
```

### Formula Search

When searching in formulas (`lookIn: 'formulas'`), the engine searches the raw formula string:

```typescript
// Cell A1: =SUM(B1:B10)
// Search for "SUM" → Match found in formula text
// Search for "55" (if SUM result = 55) → No match (searching formula, not value)
```

### Comment Search

Comments are stored separately from cell data. The search engine checks the `comments` map:

```typescript
// Search in comments
for (const [key, comment] of worksheet.comments.entries()) {
  if (comment.text.toLowerCase().includes(query.toLowerCase())) {
    matches.push({ address: unpackKey(key), match: comment.text });
  }
}
```

## Testing

### Test Coverage

The Find & Replace system has **97% test coverage** across:

- **search-api.test.ts**: 61 tests covering findIterator, find, findAll
- **sdk/search.test.ts**: Integration tests with Worksheet API
- **sdk/search-navigator.test.ts**: Navigation tests (Next/Previous)
- **sdk/search-format.test.ts**: Format-based search tests

### Running Tests

```bash
# All search tests
npm test -- search

# Specific test suite
npm test -- search-api.test.ts

# With coverage
npm test -- --coverage search-api.test.ts
```

### Example Test

```typescript
test('should find all matches with case-insensitive partial match', () => {
  const sheet = new Worksheet('Test', 1000, 26);
  sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
  sheet.setCellValue({ row: 3, col: 5 }, 'Apple Pie');
  sheet.setCellValue({ row: 7, col: 2 }, 'Red Apple');

  const results = findAll(sheet, {
    what: 'apple',
    lookIn: 'values',
    lookAt: 'part',
    matchCase: false,
  });

  expect(results).toHaveLength(3);
  expect(results.map(r => r.address)).toContainEqual({ row: 1, col: 1 });
  expect(results.map(r => r.address)).toContainEqual({ row: 3, col: 5 });
  expect(results.map(r => r.address)).toContainEqual({ row: 7, col: 2 });
});
```

## Best Practices

### 1. Use FindService for UI Components

❌ **Don't** call low-level search functions directly from UI:
```typescript
// BAD: No state management, repeated searches
const results = findAll(worksheet, { what: query });
```

✅ **Do** use FindService for stateful search:
```typescript
// GOOD: Results cached, navigation works
const service = new FindService(worksheet);
const results = service.findAll(query);
const next = service.findNext(); // Fast, uses cached results
```

### 2. Debounce User Input

```typescript
const [query, setQuery] = useState('');

// Debounce search to avoid performance hit on every keystroke
const debouncedSearch = useMemo(
  () => debounce((q: string) => {
    if (q.length >= 3) {
      findService.findAll(q);
    }
  }, 300),
  [findService]
);

useEffect(() => {
  debouncedSearch(query);
}, [query, debouncedSearch]);
```

### 3. Highlight Matches in UI

```typescript
function highlightMatches(results: FindResult[]) {
  results.forEach(match => {
    renderer?.highlightCell(match.address, {
      backgroundColor: '#FFFF00', // Yellow highlight
      duration: 2000,             // Fade after 2s
    });
  });
}
```

### 4. Provide User Feedback

```typescript
const count = results.length;
const current = service.getCurrentIndex();

if (count === 0) {
  showMessage(`Cannot find "${query}"`);
} else {
  showMessage(`Found ${count} match${count > 1 ? 'es' : ''} (${current} of ${count})`);
}
```

## Future Enhancements

### Planned Features

| Feature | Status | Priority | Target |
|---------|--------|----------|--------|
| **Regular expressions** | 📋 Planned | Medium | Q3 2026 |
| **Search across sheets** | 📋 Planned | High | Q2 2026 |
| **Search history** | 📋 Planned | Low | Q4 2026 |
| **Format-based search** | 📋 Planned | Medium | Q3 2026 |
| **Replace with formulas** | 📋 Planned | Low | Q4 2026 |

### Regular Expression Support

```typescript
// Future API
const results = findService.findAll('/[A-Z]{2}\\d{4}/', {
  lookIn: 'values',
  useRegex: true, // Enable regex mode
});
```

### Workbook-Wide Search

```typescript
// Future API
const results = workbook.findAll('Apple', {
  searchWithin: 'workbook', // Search all sheets
  sheets: ['Sheet1', 'Sheet2'], // Optional: specific sheets
});
```

## Troubleshooting

### No Matches Found (But Data Exists)

**Cause**: Searching in wrong content type
```typescript
// Cell A1 has formula "=SUM(B1:B10)" with result 155
findService.findAll('155', { lookIn: 'formulas' }); // No match
findService.findAll('155', { lookIn: 'values' });   // Match!
```

**Solution**: Verify `lookIn` option matches your data type.

### Wildcard Not Working

**Cause**: Forgot to escape literal wildcards
```typescript
// Search for literal "*special"
findService.findAll('*special');  // Matches everything
findService.findAll('~*special'); // Matches "*special" only
```

**Solution**: Use `~` to escape wildcards: `~*`, `~?`

### Performance Issues with Large Sheets

**Cause**: Searching 100K+ cells with complex patterns
```typescript
// BAD: Searches every keystroke
<input onChange={(e) => findService.findAll(e.target.value)} />
```

**Solution**: Debounce input, require minimum length:
```typescript
// GOOD: Search only after 300ms pause, min 3 chars
const debouncedSearch = useMemo(() => 
  debounce((q) => q.length >= 3 && findService.findAll(q), 300), []
);
```

## Related Documentation

- [Search Types Reference](../api/search-types.md) - Type definitions
- [Keyboard Shortcuts Guide](KEYBOARD_SYSTEM_HARDENING.md) - Global shortcuts
- [Excel Feature Comparison](../EXCEL_FEATURE_COMPARISON_MAY_2026.md) - Parity status

## License

MIT © CyberSheet Excel Team
