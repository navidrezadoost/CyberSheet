# 🧪 Quick Formula Test Script

## 🚀 Getting Started (2 minutes)

### 1. Start the Server
```bash
npm run dev
```
Then open: **http://localhost:5173/examples/react-index.html**

---

## ⚡ 5 Quick Tests (Copy & Paste)

### Test 1: Basic Math (10 seconds)
1. Click cell **C1**
2. Type: `=10+20`
3. Press **Enter**
4. ✅ Should show: **30**

### Test 2: Cell Reference (15 seconds)
1. Click **A1**, type `50`, press Enter
2. Click **A2**, type `30`, press Enter
3. Click **A3**, type `=A1+A2`
4. Press **Enter**
5. ✅ Should show: **80**

### Test 3: SUM with Autocomplete (20 seconds)
1. Click **B1**, type `10`, Enter
2. Click **B2**, type `20`, Enter
3. Click **B3**, type `30`, Enter
4. Click **B4**, type `=SU`
5. ⏰ **See autocomplete appear!**
6. Press **Enter** to select SUM
7. Complete: `=SUM(B1:B3)`
8. Press **Enter**
9. ✅ Should show: **60**

### Test 4: AVERAGE Function (15 seconds)
1. Click **C1**
2. Type: `=AVERAGE(B1:B3)`
3. Press **Enter**
4. ✅ Should show: **20**

### Test 5: IF Function (20 seconds)
1. Click **D1**, type `100`, Enter
2. Click **D2**, type `=IF(D1>50,1,0)`
3. Press **Enter**
4. ✅ Should show: **1**

---

## 🎯 10 Copy-Paste Formulas

Just click any empty cell and paste these:

```excel
=10+20                          # Result: 30
=5*6                            # Result: 30
=100/4                          # Result: 25
=2^8                            # Result: 256
=SUM(A1:A5)                     # Sum of A1 to A5
=AVERAGE(B1:B10)                # Average of B1 to B10
=MAX(C1:C20)                    # Maximum value
=MIN(C1:C20)                    # Minimum value
=COUNT(A1:A100)                 # Count numbers
=ROUND(A1/B1,2)                 # Divide and round to 2 decimals
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `=` | Start formula |
| `↓` `↑` | Navigate autocomplete |
| `Enter` | Select / Submit |
| `Esc` | Cancel |
| `Tab` | Accept suggestion |

---

## 🔍 What to Look For

### ✅ Working Correctly:
- Formula bar shows cell reference (e.g., "A1")
- Placeholder text shows examples
- Typing `=SU` shows autocomplete with "SUM"
- Arrow keys move through suggestions
- Enter selects suggestion and inserts function
- Formula result appears in cell
- Red error message for invalid formulas

### ❌ Not Working:
- No formula bar appears
- Autocomplete doesn't show
- Formula shows as text (didn't start with `=`)
- Browser console shows errors (Press F12)

---

## 🐛 Quick Fixes

### Problem: Nothing happens when I type a formula
**Fix:** Make sure you start with `=` sign

### Problem: Autocomplete not showing
**Fix:** Click in the **formula bar** (top input), not directly in the cell

### Problem: Formula shows as text
**Fix:** Formula must start with `=`

### Problem: #REF! error
**Fix:** Cell reference doesn't exist, check A1, B2 etc.

---

## 📊 Complete Test Dataset

Copy this data structure for comprehensive testing:

```
    A     B     C     D     E
1   100   10    5           
2   200   20    8           
3   300   30    12          
4   400   40    15          
5               
```

### Now add these formulas:

| Cell | Formula | Expected Result |
|------|---------|----------------|
| B5 | `=SUM(B1:B4)` | 100 |
| C5 | `=AVERAGE(C1:C4)` | 10 |
| D5 | `=MAX(A1:A4)` | 400 |
| E5 | `=MIN(B1:B4)` | 10 |
| A6 | `=SUM(A1:A4)` | 1000 |
| B6 | `=COUNT(B1:B4)` | 4 |
| C6 | `=B5+C5` | 110 |
| D6 | `=A6/4` | 250 |

---

## 🎓 Formula Categories

### 📐 Math
```excel
=A1+B1      # Add
=A1-B1      # Subtract
=A1*B1      # Multiply
=A1/B1      # Divide
=A1^2       # Power
=SQRT(A1)   # Square root
=ABS(A1)    # Absolute value
```

### 📊 Statistics
```excel
=SUM(A1:A10)
=AVERAGE(A1:A10)
=MAX(A1:A10)
=MIN(A1:A10)
=COUNT(A1:A10)
=COUNTA(A1:A10)
```

### 🧮 Logical
```excel
=IF(A1>50,1,0)
=AND(A1>10,B1<100)
=OR(A1>100,B1>100)
=NOT(A1=0)
```

### 📝 Text
```excel
=LEN(A1)
=UPPER(A1)
=LOWER(A1)
=CONCATENATE(A1," ",B1)
=LEFT(A1,3)
=RIGHT(A1,3)
```

---

## 🎬 Demo Script (1 Minute)

Perfect for showing someone:

1. **"Watch this..."** - Click any cell
2. **Type:** `=10+20` → Press Enter → Shows 30
3. **"Now with cells..."** - Type `=A1+A2` → Shows sum
4. **"Autocomplete!"** - Type `=SU` → Dropdown appears
5. **"Use arrows"** - Press ↓ ↑ to navigate
6. **"Select"** - Press Enter → Function inserted
7. **"Complete"** - Type `(A1:A10)` → Press Enter
8. **"Result!"** - Shows the sum

---

## 📱 Screenshot Checklist

For documentation, capture:
- ☐ Empty formula bar with placeholder
- ☐ Typing `=SU` with autocomplete dropdown
- ☐ Formula in formula bar, result in cell
- ☐ Error message for invalid formula
- ☐ Completed formula with correct result

---

## ✅ Success Checklist

Your system works if:
- ☐ Formula bar appears at top
- ☐ Placeholder shows examples
- ☐ Typing `=` in cell shows in formula bar
- ☐ Autocomplete appears with `=SU`
- ☐ Arrow keys navigate suggestions
- ☐ Enter selects suggestion
- ☐ Formula calculates correctly
- ☐ Error message shows for `=SUM(`
- ☐ Cell shows result, formula bar shows formula

---

## 🚨 Emergency Debug

If nothing works:
1. Open browser console (F12)
2. Check for red errors
3. Copy error message
4. Refresh page (Ctrl+R)
5. Try in Chrome/Firefox if using Safari

---

**Time to Complete All Tests:** ~5-10 minutes

**For detailed documentation, see:** `FORMULA_TESTING_GUIDE.md`
