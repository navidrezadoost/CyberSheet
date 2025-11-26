# CyberSheet Comments, Icons & Events API

Complete guide to the commenting, icon overlay, and cell event system in CyberSheet.

---

## Table of Contents

1. [Excel Comment Import/Export](#excel-comment-importexport)
2. [Worksheet Comment API](#worksheet-comment-api)
3. [Cell Icon API](#cell-icon-api)
4. [Renderer Event System](#renderer-event-system)
5. [Navigation API](#navigation-api)
6. [Custom User Integration](#custom-user-integration)
7. [Complete Examples](#complete-examples)

---

## Excel Comment Import/Export

### Import Comments from Excel

```typescript
import { LightweightXLSXParser } from '@cyber-sheet/io-xlsx';

const parser = new LightweightXLSXParser();
await parser.parseMetadata(buffer);

// Enable comment import
const cells = await parser.parseSheet(0, {
  includeComments: true,  // Load Excel comments
  includeStyles: true,
});

// Comments are automatically converted to CyberSheet format
for (const [ref, parsedCell] of cells) {
  if (parsedCell.comments) {
    // parsedCell.comments: CellComment[]
    console.log(parsedCell.comments);
  }
}
```

**Supports:**
- ✅ Legacy Excel comments (`xl/comments1.xml`)
- ✅ VML drawing positioning (`xl/drawings/vmlDrawing1.vml`)
- ✅ Threaded comments (Office 365+)
- ✅ Comment text, authors, threading, position

---

## Worksheet Comment API

### Add Comment

```typescript
const comment = sheet.addComment(
  { row: 5, col: 3 },  // Cell address
  {
    text: 'This needs review',
    author: 'John Doe',
    parentId: undefined,  // Optional: for threaded replies
    position: { x: 100, y: 50 },  // Optional: custom position
    metadata: {  // Optional: custom data
      priority: 'high',
      tags: ['important']
    }
  }
);

// Returns: CellComment with generated ID
console.log(comment.id);  // "comment_1234567890_abc123"
```

### Get Comments

```typescript
// Get all comments for a cell
const comments = sheet.getComments({ row: 5, col: 3 });
// Returns: CellComment[]

// Get all cells with comments
const allCommented = sheet.getAllComments();
// Returns: Array<{ address: Address; comments: CellComment[] }>

// Example: Find all comments by a user
const userComments = allCommented.filter(({ comments }) =>
  comments.some(c => c.author === 'John Doe')
);
```

### Update Comment

```typescript
const success = sheet.updateComment(
  { row: 5, col: 3 },
  'comment_1234567890_abc123',
  {
    text: 'Updated review notes',
    // editedAt is set automatically
  }
);
```

### Delete Comment

```typescript
// Delete single comment
sheet.deleteComment({ row: 5, col: 3 }, 'comment_id', false);

// Delete comment and all replies
sheet.deleteComment({ row: 5, col: 3 }, 'comment_id', true);
```

### Navigate Comments

```typescript
// Find next cell with comments
const nextAddr = sheet.getNextCommentCell(
  { row: 5, col: 3 },
  'next'  // or 'prev'
);

if (nextAddr) {
  console.log(`Next comment at ${nextAddr.row}, ${nextAddr.col}`);
}
```

### Comment Events

```typescript
sheet.on((event) => {
  if (event.type === 'comment-added') {
    console.log('New comment:', event.comment);
    console.log('At cell:', event.address);
  }
  
  if (event.type === 'comment-updated') {
    console.log('Updated:', event.commentId);
  }
  
  if (event.type === 'comment-deleted') {
    console.log('Deleted:', event.commentId);
  }
});
```

---

## Cell Icon API

### Set Icon

```typescript
// Emoji icon
sheet.setIcon({ row: 5, col: 3 }, {
  type: 'emoji',
  source: '⚠️',
  position: 'top-right',
  size: 16,
});

// Image URL icon
sheet.setIcon({ row: 5, col: 3 }, {
  type: 'url',
  source: 'https://example.com/warning.png',
  position: 'top-left',
  size: 20,
  alt: 'Warning icon',
});

// Built-in icon (renderer-specific)
sheet.setIcon({ row: 5, col: 3 }, {
  type: 'builtin',
  source: 'flag-red',
  position: 'bottom-right',
  metadata: { severity: 'high' },
});
```

### Get Icon

```typescript
const icon = sheet.getIcon({ row: 5, col: 3 });
if (icon) {
  console.log(icon.type, icon.source);
}
```

### Get All Icons

```typescript
const allIcons = sheet.getAllIcons();
// Returns: Array<{ address: Address; icon: CellIcon }>

// Example: Find all warning icons
const warnings = allIcons.filter(({ icon }) =>
  icon.source === '⚠️' || icon.source.includes('warning')
);
```

### Remove Icon

```typescript
sheet.setIcon({ row: 5, col: 3 }, undefined);
```

### Icon Events

```typescript
sheet.on((event) => {
  if (event.type === 'icon-changed') {
    console.log('Icon changed:', event.icon);
    console.log('At cell:', event.address);
  }
});
```

---

## Renderer Event System

### Cell Click Events

```typescript
sheet.on((event) => {
  if (event.type === 'cell-click') {
    const { address, bounds, originalEvent } = event.event;
    console.log(`Clicked: ${address.row}, ${address.col}`);
    console.log(`Bounds:`, bounds);  // { x, y, width, height }
    console.log(`Mouse:`, originalEvent.clientX, originalEvent.clientY);
  }
  
  if (event.type === 'cell-double-click') {
    const { address } = event.event;
    console.log(`Double-clicked: ${address.row}, ${address.col}`);
    // Example: Start editing
  }
});
```

### Right Click (Context Menu)

```typescript
sheet.on((event) => {
  if (event.type === 'cell-right-click') {
    event.event.originalEvent.preventDefault();
    const { address, bounds } = event.event;
    
    // Show custom context menu
    showContextMenu(bounds.x, bounds.y, [
      { label: 'Add Comment', action: () => addComment(address) },
      { label: 'Set Icon', action: () => setIcon(address) },
    ]);
  }
});
```

### Hover Events

```typescript
sheet.on((event) => {
  if (event.type === 'cell-hover') {
    const { address, bounds } = event.event;
    
    // Show tooltip for cells with comments
    const comments = sheet.getComments(address);
    if (comments.length > 0) {
      showTooltip(bounds, comments);
    }
  }
  
  if (event.type === 'cell-hover-end') {
    hideTooltip();
  }
});
```

### Event Types

```typescript
type CellEvent = {
  address: Address;
  bounds: { x: number; y: number; width: number; height: number };
  originalEvent: MouseEvent | PointerEvent | TouchEvent;
};

// Available event types:
- 'cell-click'
- 'cell-double-click'
- 'cell-right-click'
- 'cell-hover'
- 'cell-hover-end'
```

---

## Navigation API

### Scroll to Cell

```typescript
// Scroll to make cell visible
renderer.scrollToCell({ row: 100, col: 20 }, 'nearest');

// Alignment options:
renderer.scrollToCell(addr, 'start');    // Top-left of viewport
renderer.scrollToCell(addr, 'center');   // Center of viewport
renderer.scrollToCell(addr, 'end');      // Bottom-right of viewport
renderer.scrollToCell(addr, 'nearest');  // Only scroll if not visible
```

### Get Cell Bounds

```typescript
const bounds = renderer.getCellBounds({ row: 5, col: 3 });
if (bounds) {
  console.log(bounds);  // { x, y, width, height }
  // Coordinates are in viewport space
} else {
  console.log('Cell not currently visible');
}
```

### Get Visible Range

```typescript
const visible = renderer.getVisibleRange();
console.log(visible);
// { start: { row: 1, col: 1 }, end: { row: 50, col: 10 } }

// Example: Lazy load only visible cells
const { start, end } = visible;
for (let r = start.row; r <= end.row; r++) {
  for (let c = start.col; c <= end.col; c++) {
    loadCellData({ row: r, col: c });
  }
}
```

### Comment Navigation Example

```typescript
function setupCommentNavigation(renderer: CanvasRenderer, sheet: Worksheet) {
  let currentCommentIndex = 0;
  const allComments = sheet.getAllComments();
  
  document.addEventListener('keydown', (e) => {
    // Ctrl+↓: Next comment
    if (e.ctrlKey && e.key === 'ArrowDown') {
      currentCommentIndex = (currentCommentIndex + 1) % allComments.length;
      renderer.scrollToCell(allComments[currentCommentIndex].address, 'center');
      e.preventDefault();
    }
    
    // Ctrl+↑: Previous comment
    if (e.ctrlKey && e.key === 'ArrowUp') {
      currentCommentIndex = 
        (currentCommentIndex - 1 + allComments.length) % allComments.length;
      renderer.scrollToCell(allComments[currentCommentIndex].address, 'center');
      e.preventDefault();
    }
  });
}
```

---

## Custom User Integration

### User System Integration

```typescript
interface CustomUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

class CommentingSystem {
  private sheet: Worksheet;
  private users = new Map<string, CustomUser>();
  
  registerUser(user: CustomUser) {
    this.users.set(user.id, user);
  }
  
  addComment(
    addr: Address,
    userId: string,
    text: string,
    metadata?: Record<string, unknown>
  ) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    return this.sheet.addComment(addr, {
      text,
      author: user.name,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userAvatar: user.avatar,
        userRole: user.role,
        ...metadata,
      },
    });
  }
  
  getCommentsByUser(userId: string) {
    return this.sheet.getAllComments().filter(({ comments }) =>
      comments.some(c => c.metadata?.userId === userId)
    );
  }
  
  getMentions(userId: string) {
    return this.sheet.getAllComments().filter(({ comments }) =>
      comments.some(c => c.text.includes(`@${this.users.get(userId)?.name}`))
    );
  }
}
```

### Custom Comment Rendering

```typescript
function renderCustomComment(comment: CellComment, users: Map<string, CustomUser>) {
  const userId = comment.metadata?.userId as string;
  const user = users.get(userId);
  
  return `
    <div class="comment">
      ${user?.avatar ? `<img src="${user.avatar}" alt="${comment.author}" />` : ''}
      <div class="comment-header">
        <strong>${comment.author}</strong>
        ${user?.role ? `<span class="role">${user.role}</span>` : ''}
        <time>${formatDate(comment.createdAt)}</time>
      </div>
      <div class="comment-body">
        ${renderRichText(comment.text)}
      </div>
      ${comment.editedAt ? `<small>Edited ${formatDate(comment.editedAt)}</small>` : ''}
    </div>
  `;
}
```

---

## Complete Examples

### 1. Import Excel and Navigate Comments

```typescript
import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { LightweightXLSXParser } from '@cyber-sheet/io-xlsx';

async function loadAndNavigate(file: File, container: HTMLElement) {
  // Parse Excel
  const buffer = await file.arrayBuffer();
  const parser = new LightweightXLSXParser();
  await parser.parseMetadata(buffer);
  const cells = await parser.parseSheet(0, { includeComments: true });
  
  // Create workbook
  const workbook = new Workbook();
  const sheet = workbook.addSheet('Sheet1');
  
  // Load cells with comments
  for (const [ref, cell] of cells) {
    const addr = parseRef(ref);
    sheet.setCellValue(addr, cell.value);
    if (cell.comments) {
      cell.comments.forEach(c => sheet.addComment(addr, c));
    }
  }
  
  // Render
  const renderer = new CanvasRenderer(container, sheet);
  
  // Navigate to first comment
  const allComments = sheet.getAllComments();
  if (allComments.length > 0) {
    renderer.scrollToCell(allComments[0].address, 'center');
  }
}
```

### 2. Interactive Comment Panel

```typescript
class CommentPanel {
  constructor(private sheet: Worksheet, private renderer: CanvasRenderer) {
    this.render();
    this.setupEvents();
  }
  
  private render() {
    const allComments = this.sheet.getAllComments();
    const html = allComments.map(({ address, comments }) => `
      <div class="comment-item" data-row="${address.row}" data-col="${address.col}">
        <div class="cell-ref">${formatAddress(address)}</div>
        ${comments.map(c => this.renderComment(c)).join('')}
      </div>
    `).join('');
    
    document.getElementById('comment-panel')!.innerHTML = html;
  }
  
  private setupEvents() {
    // Click to navigate
    document.querySelectorAll('.comment-item').forEach(item => {
      item.addEventListener('click', () => {
        const row = parseInt(item.dataset.row!);
        const col = parseInt(item.dataset.col!);
        this.renderer.scrollToCell({ row, col }, 'center');
      });
    });
    
    // Auto-refresh on changes
    this.sheet.on((event) => {
      if (event.type === 'comment-added' || 
          event.type === 'comment-deleted' ||
          event.type === 'comment-updated') {
        this.render();
      }
    });
  }
  
  private renderComment(c: CellComment) {
    return `
      <div class="comment">
        <strong>${c.author}</strong>
        <p>${c.text}</p>
        <small>${formatDate(c.createdAt)}</small>
      </div>
    `;
  }
}
```

### 3. Custom Comment System with Icons

```typescript
function setupCommentSystem(sheet: Worksheet, renderer: CanvasRenderer) {
  // Add comment indicator icons
  sheet.on((event) => {
    if (event.type === 'comment-added') {
      sheet.setIcon(event.address, {
        type: 'emoji',
        source: '💬',
        position: 'top-right',
        size: 14,
      });
    }
    
    if (event.type === 'comment-deleted') {
      const comments = sheet.getComments(event.address);
      if (comments.length === 0) {
        sheet.setIcon(event.address, undefined);
      }
    }
  });
  
  // Click to show comments
  sheet.on((event) => {
    if (event.type === 'cell-click') {
      const comments = sheet.getComments(event.event.address);
      if (comments.length > 0) {
        showCommentDialog(event.event.address, comments);
      }
    }
  });
  
  // Right-click to add comment
  sheet.on((event) => {
    if (event.type === 'cell-right-click') {
      event.event.originalEvent.preventDefault();
      promptForComment((text) => {
        sheet.addComment(event.event.address, {
          text,
          author: getCurrentUser(),
        });
      });
    }
  });
}
```

---

## Type Definitions

```typescript
// Core types
type CellComment = {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
  editedAt?: Date;
  parentId?: string;  // For threading
  position?: { x: number; y: number };
  richText?: Array<{ text: string; style?: Partial<CellStyle> }>;
  metadata?: Record<string, unknown>;
};

type CellIcon = {
  type: 'url' | 'emoji' | 'builtin';
  source: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size?: number;
  alt?: string;
  metadata?: Record<string, unknown>;
};

type CellEvent = {
  address: Address;
  bounds: { x: number; y: number; width: number; height: number };
  originalEvent: MouseEvent | PointerEvent | TouchEvent;
};
```

---

## Best Practices

### 1. Performance

- **Lazy load comments**: Only load comments for visible cells
- **Debounce hover events**: Use debouncing to avoid excessive tooltip renders
- **Virtual scrolling**: For large comment lists, implement virtual scrolling

### 2. User Experience

- **Visual indicators**: Show comment count badge on cells with multiple comments
- **Keyboard shortcuts**: Implement Ctrl+↑/↓ for comment navigation
- **Accessibility**: Provide alt text for icons, ARIA labels for comments

### 3. Data Management

- **Sync with backend**: Persist comments to server in real-time
- **Conflict resolution**: Handle concurrent edits with timestamps
- **Permissions**: Implement user-based comment editing permissions

### 4. Excel Compatibility

- **Round-trip fidelity**: Preserve Excel comment positions on export
- **Legacy support**: Test with both old (.xls) and new (.xlsx) formats
- **Rich text**: Maintain formatting when importing/exporting

---

## Migration from Excel

If migrating from Excel VBA or Office.js:

| Excel VBA | CyberSheet |
|-----------|------------|
| `Range.AddComment(text)` | `sheet.addComment(addr, { text, author })` |
| `Range.Comment.Text()` | `sheet.getComments(addr)[0].text` |
| `Range.Comment.Delete()` | `sheet.deleteComment(addr, commentId)` |
| `Worksheet.Comments` | `sheet.getAllComments()` |

---

## Troubleshooting

**Comments not importing?**
- Ensure `includeComments: true` in parse options
- Check console for parsing errors
- Verify Excel file has comments (not notes)

**Events not firing?**
- Ensure event listener added before renderer initialization
- Check that sheet instance matches renderer's sheet
- Verify events aren't being prevented by other handlers

**Icons not rendering?**
- Icon rendering requires custom renderer layer (coming soon)
- Currently stores icon data, rendering TBD
- Use CSS overlays as workaround

---

## API Reference Summary

### Worksheet Methods
- `addComment(addr, comment)` → CellComment
- `getComments(addr)` → CellComment[]
- `updateComment(addr, id, updates)` → boolean
- `deleteComment(addr, id, deleteReplies)` → boolean
- `getAllComments()` → Array<{ address, comments }>
- `getNextCommentCell(fromAddr, direction)` → Address | null
- `setIcon(addr, icon)` → void
- `getIcon(addr)` → CellIcon | undefined
- `getAllIcons()` → Array<{ address, icon }>

### Renderer Methods
- `scrollToCell(addr, align)` → void
- `getCellBounds(addr)` → Bounds | null
- `getVisibleRange()` → Range

### Events
- comment-added, comment-updated, comment-deleted
- icon-changed
- cell-click, cell-double-click, cell-right-click
- cell-hover, cell-hover-end

---

**For more examples, see `/examples/comments-example.ts`**
