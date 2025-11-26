# Quick Start: Comments & Events

Get started with CyberSheet comments, icons, and cell events in 5 minutes.

## Installation

```bash
npm install @cyber-sheet/core @cyber-sheet/renderer-canvas @cyber-sheet/io-xlsx
```

## 1. Import Excel with Comments

```typescript
import { Workbook } from '@cyber-sheet/core';
import { LightweightXLSXParser } from '@cyber-sheet/io-xlsx';

async function loadExcel(file: File) {
  const buffer = await file.arrayBuffer();
  const parser = new LightweightXLSXParser();
  
  await parser.parseMetadata(buffer);
  const cells = await parser.parseSheet(0, {
    includeComments: true,  // ← Enable comment import
  });
  
  const workbook = new Workbook();
  const sheet = workbook.addSheet('Sheet1');
  
  // Import cells with comments
  for (const [ref, cell] of cells) {
    const addr = parseRef(ref);
    sheet.setCellValue(addr, cell.value);
    
    if (cell.comments) {
      cell.comments.forEach(c => sheet.addComment(addr, c));
    }
  }
  
  return { workbook, sheet };
}

function parseRef(ref: string) {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  const col = match[1].split('').reduce((a, c) => a * 26 + (c.charCodeAt(0) - 64), 0);
  const row = parseInt(match[2]);
  return { row, col };
}
```

## 2. Add Comments

```typescript
import { Workbook } from '@cyber-sheet/core';

const workbook = new Workbook();
const sheet = workbook.addSheet('MySheet');

// Add a simple comment
sheet.addComment({ row: 5, col: 3 }, {
  text: 'Please review this cell',
  author: 'John Doe',
});

// Add a threaded reply
const parent = sheet.addComment({ row: 5, col: 3 }, {
  text: 'Original comment',
  author: 'Alice',
});

sheet.addComment({ row: 5, col: 3 }, {
  text: 'Reply to Alice',
  author: 'Bob',
  parentId: parent.id,
});

// Get all comments for a cell
const comments = sheet.getComments({ row: 5, col: 3 });
console.log(`${comments.length} comments`);
```

## 3. Handle Cell Events

```typescript
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

const renderer = new CanvasRenderer(container, sheet);

// Listen to cell clicks
sheet.on((event) => {
  if (event.type === 'cell-click') {
    const { address, bounds } = event.event;
    console.log(`Clicked: Row ${address.row}, Col ${address.col}`);
    
    // Check for comments
    const comments = sheet.getComments(address);
    if (comments.length > 0) {
      alert(`This cell has ${comments.length} comment(s)`);
    }
  }
});

// Right-click to add comment
sheet.on((event) => {
  if (event.type === 'cell-right-click') {
    event.event.originalEvent.preventDefault();
    const text = prompt('Enter comment:');
    if (text) {
      sheet.addComment(event.event.address, {
        text,
        author: 'Current User',
      });
    }
  }
});

// Show tooltip on hover
sheet.on((event) => {
  if (event.type === 'cell-hover') {
    const comments = sheet.getComments(event.event.address);
    if (comments.length > 0) {
      showTooltip(event.event.bounds, comments[0].text);
    }
  }
});
```

## 4. Navigate Between Comments

```typescript
// Get all commented cells
const allComments = sheet.getAllComments();
console.log(`${allComments.length} cells have comments`);

// Navigate to next comment
const currentCell = { row: 5, col: 3 };
const nextComment = sheet.getNextCommentCell(currentCell, 'next');

if (nextComment) {
  // Scroll to the next commented cell
  renderer.scrollToCell(nextComment, 'center');
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'ArrowDown') {
    const next = sheet.getNextCommentCell(currentCell, 'next');
    if (next) renderer.scrollToCell(next, 'center');
  }
  
  if (e.ctrlKey && e.key === 'ArrowUp') {
    const prev = sheet.getNextCommentCell(currentCell, 'prev');
    if (prev) renderer.scrollToCell(prev, 'center');
  }
});
```

## 5. Add Icons to Cells

```typescript
// Add emoji icon
sheet.setIcon({ row: 5, col: 3 }, {
  type: 'emoji',
  source: '⚠️',
  position: 'top-right',
  size: 16,
});

// Add image icon
sheet.setIcon({ row: 10, col: 5 }, {
  type: 'url',
  source: 'https://example.com/icon.png',
  position: 'top-left',
  size: 20,
});

// Auto-add icon when comment added
sheet.on((event) => {
  if (event.type === 'comment-added') {
    sheet.setIcon(event.address, {
      type: 'emoji',
      source: '💬',
      position: 'top-right',
    });
  }
});
```

## 6. Build a Comment Panel

```typescript
class SimpleCommentPanel {
  constructor(private sheet: Worksheet, private renderer: CanvasRenderer) {
    this.render();
    
    // Auto-refresh on changes
    sheet.on((event) => {
      if (event.type === 'comment-added' || event.type === 'comment-deleted') {
        this.render();
      }
    });
  }
  
  render() {
    const allComments = this.sheet.getAllComments();
    const html = allComments.map(({ address, comments }) => `
      <div onclick="scrollTo(${address.row}, ${address.col})">
        <strong>${formatAddress(address)}</strong>
        ${comments.map(c => `
          <p>${c.author}: ${c.text}</p>
        `).join('')}
      </div>
    `).join('');
    
    document.getElementById('comment-panel')!.innerHTML = html;
  }
}

function formatAddress(addr: Address): string {
  const col = String.fromCharCode(64 + addr.col);
  return `${col}${addr.row}`;
}
```

## 7. Custom User System

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

class CommentSystem {
  private users = new Map<string, User>();
  
  constructor(private sheet: Worksheet) {}
  
  registerUser(user: User) {
    this.users.set(user.id, user);
  }
  
  addComment(addr: Address, userId: string, text: string) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    this.sheet.addComment(addr, {
      text,
      author: user.name,
      metadata: {
        userId: user.id,
        userEmail: user.email,
      },
    });
  }
  
  getCommentsByUser(userId: string) {
    return this.sheet.getAllComments().filter(({ comments }) =>
      comments.some(c => c.metadata?.userId === userId)
    );
  }
}

// Usage
const system = new CommentSystem(sheet);
system.registerUser({ id: '1', name: 'John', email: 'john@example.com' });
system.addComment({ row: 5, col: 3 }, '1', 'My comment');
```

## Complete Example

```typescript
import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { LightweightXLSXParser } from '@cyber-sheet/io-xlsx';

async function initApp(container: HTMLElement, excelFile: File) {
  // 1. Import Excel with comments
  const buffer = await excelFile.arrayBuffer();
  const parser = new LightweightXLSXParser();
  await parser.parseMetadata(buffer);
  const cells = await parser.parseSheet(0, { includeComments: true });
  
  const workbook = new Workbook();
  const sheet = workbook.addSheet('Sheet1');
  
  for (const [ref, cell] of cells) {
    const addr = parseRef(ref);
    sheet.setCellValue(addr, cell.value);
    cell.comments?.forEach(c => sheet.addComment(addr, c));
  }
  
  // 2. Setup renderer
  const renderer = new CanvasRenderer(container, sheet);
  
  // 3. Add icons to commented cells
  sheet.getAllComments().forEach(({ address }) => {
    sheet.setIcon(address, {
      type: 'emoji',
      source: '💬',
      position: 'top-right',
    });
  });
  
  // 4. Handle cell clicks
  sheet.on((event) => {
    if (event.type === 'cell-click') {
      const comments = sheet.getComments(event.event.address);
      if (comments.length > 0) {
        showComments(comments);
      }
    }
  });
  
  // 5. Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'ArrowDown') {
      const next = sheet.getNextCommentCell({ row: 1, col: 1 }, 'next');
      if (next) renderer.scrollToCell(next, 'center');
    }
  });
  
  return { workbook, sheet, renderer };
}
```

## API Cheat Sheet

```typescript
// Comments
sheet.addComment(addr, { text, author })
sheet.getComments(addr)
sheet.updateComment(addr, commentId, { text })
sheet.deleteComment(addr, commentId)
sheet.getAllComments()
sheet.getNextCommentCell(fromAddr, 'next' | 'prev')

// Icons
sheet.setIcon(addr, { type, source, position })
sheet.getIcon(addr)
sheet.getAllIcons()

// Navigation
renderer.scrollToCell(addr, 'nearest' | 'center' | 'start' | 'end')
renderer.getCellBounds(addr)
renderer.getVisibleRange()

// Events
sheet.on((event) => {
  // event.type: 'cell-click' | 'cell-double-click' | 'cell-right-click'
  //             'cell-hover' | 'cell-hover-end'
  //             'comment-added' | 'comment-updated' | 'comment-deleted'
  //             'icon-changed'
})
```

## Next Steps

- Read the [full API documentation](./COMMENTS_API.md)
- Check the [complete example](../examples/comments-example.ts)
- Review the [implementation summary](./IMPLEMENTATION_SUMMARY.md)
- Build your custom commenting UI!

---

**Happy coding! 🚀**
