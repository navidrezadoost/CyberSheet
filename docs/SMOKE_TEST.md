# Integration Testing - Quick Smoke Test

Run this simple smoke test to verify file I/O functionality:

```bash
cd examples
npx vite --host
# Open http://localhost:5173/excel-app-demo.html
```

## Manual Test Checklist

### ✅ Test 1: Export → Import Cycle

1. Open the app
2. Enter data: A1=10, A2=20, A3=`=A1+A2`
3. File → Export → XLSX → Export
4. File → Open → Browse → Select the exported file
5. **Expected**: A3 shows 30, formula preserved

### ✅ Test 2: New Blank Workbook

1. File → New → Blank Workbook
2. **Expected**: Fresh workbook with Sheet1, previous data cleared

### ✅ Test 3: CSV Export

1. Enter: A1="Test,Data", A2="With quotes"  
2. File → Export → CSV → Export
3. Open CSV in text editor
4. **Expected**: `"Test,Data"` with proper escaping

### ✅ Test 4: Keyboard Shortcuts

- **Ctrl+F**: Find dialog opens
- **Ctrl+H**: Replace dialog opens
- **F2** (on cell): Enters edit mode
- **Ctrl+1** (on cell): Format Cells dialog opens

### ✅ Test 5: Create Copy

1. Add some data
2. File → Create a Copy
3. Enter name: "Test Copy"
4. **Expected**: Downloads `Test Copy.xlsx`

## Results

| Test | Status | Notes |
|------|--------|-------|
| Export/Import | ⏳ | |
| New Workbook | ⏳ | |
| CSV Export | ⏳ | |
| Keyboard Shortcuts | ⏳ | |
| Create Copy | ⏳ | |

**Overall**: ⏳ Pending manual testing
