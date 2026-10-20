/**
 * CyberSheet Comments & Icons Feature Example
 * 
 * Demonstrates:
 * 1. Excel comment import/export
 * 2. Custom commenting system
 * 3. Cell event handling
 * 4. Programmatic navigation
 * 5. Icon overlays
 */

import { Worksheet } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

// ==================== Custom Comment UI ====================

class CommentPanel {
  private container: HTMLElement;
  private sheet: Worksheet;
  private currentUser: string;
  
  constructor(containerId: string, sheet: Worksheet, currentUser: string) {
    this.container = document.getElementById(containerId)!;
    this.sheet = sheet;
    this.currentUser = currentUser;
    
    this.setupUI();
  }
  
  private setupUI() {
    this.container.innerHTML = `
      <div class="comment-panel">
        <div class="comment-header">
          <h3>Comments</h3>
          <button id="prevComment">← Prev</button>
          <button id="nextComment">Next →</button>
        </div>
        <div id="commentList"></div>
      </div>
    `;
    
    document.getElementById('prevComment')!.addEventListener('click', () => {
      this.navigateComments('prev');
    });
    
    document.getElementById('nextComment')!.addEventListener('click', () => {
      this.navigateComments('next');
    });
    
    this.refreshCommentList();
  }
  
  private refreshCommentList() {
    const allComments = this.sheet.getAllComments();
    const listContainer = document.getElementById('commentList')!;
    
    if (allComments.length === 0) {
      listContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
      return;
    }
    
    listContainer.innerHTML = allComments
      .map(({ address, comments }) => {
        const cellRef = `${colToLetter(address.col)}${address.row}`;
        return `
          <div class="comment-item" data-row="${address.row}" data-col="${address.col}">
            <div class="comment-cell-ref">${cellRef}</div>
            ${comments.map(c => `
              <div class="comment-body">
                <div class="comment-meta">
                  <strong>${c.author}</strong>
                  <span class="comment-date">${formatDate(c.createdAt)}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
                ${c.editedAt ? `<small>Edited ${formatDate(c.editedAt)}</small>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      })
      .join('');
    
    // Add click handlers to jump to cells
    listContainer.querySelectorAll('.comment-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const row = parseInt((e.currentTarget as HTMLElement).dataset.row!);
        const col = parseInt((e.currentTarget as HTMLElement).dataset.col!);
        this.jumpToCell({ row, col });
      });
    });
  }
  
  private navigateComments(direction: 'next' | 'prev') {
    // Get current selection or start from A1
    const currentAddr = { row: 1, col: 1 }; // In real app, get from renderer selection
    
    const nextAddr = this.sheet.getNextCommentCell(currentAddr, direction);
    if (nextAddr) {
      this.jumpToCell(nextAddr);
    }
  }
  
  private jumpToCell(addr: { row: number; col: number }) {
    // Emit custom event for renderer to handle
    const event = new CustomEvent('jumpToCell', { detail: addr });
    this.container.dispatchEvent(event);
  }
  
  addCommentToCell(addr: { row: number; col: number }, text: string) {
    this.sheet.addComment(addr, {
      text,
      author: this.currentUser,
    });
    
    this.refreshCommentList();
  }
}

// ==================== Event-Driven Comment System ====================

function setupCommentSystem(
  renderer: CanvasRenderer,
  sheet: Worksheet,
  commentPanel: CommentPanel
) {
  // Listen to cell click events
  sheet.on((event) => {
    if (event.type === 'cell-click') {
      const { address, bounds } = event.event;
      
      // Check if cell has comments
      const comments = sheet.getComments(address);
      
      if (comments.length > 0) {
        // Show comment tooltip
        showCommentTooltip(bounds, comments);
      }
      
      // Allow custom comment UI
      highlightCellInCommentPanel(address);
    }
    
    if (event.type === 'cell-right-click') {
      const { address, bounds } = event.event;
      
      // Show context menu with "Add Comment" option
      showCommentContextMenu(bounds, address, (text: string) => {
        commentPanel.addCommentToCell(address, text);
      });
    }
    
    if (event.type === 'cell-hover') {
      const { address } = event.event;
      const comments = sheet.getComments(address);
      
      // Show comment indicator on hover
      if (comments.length > 0) {
        showCommentIndicator(address);
      }
    }
  });
  
  // Listen to jump-to-cell events from comment panel
  commentPanel['container'].addEventListener('jumpToCell', ((e: CustomEvent) => {
    const addr = e.detail;
    renderer.scrollToCell(addr, 'center');
    
    // Optionally set selection
    renderer.setSelection({ start: addr, end: addr });
  }) as EventListener);
}

// ==================== Icon API Usage ====================

function addIconToCell(sheet: Worksheet, addr: { row: number; col: number }) {
  // Add emoji icon
  sheet.setIcon(addr, {
    type: 'emoji',
    source: '⚠️',
    position: 'top-right',
    size: 16,
  });
  
  // Or add image icon
  sheet.setIcon(addr, {
    type: 'url',
    source: 'https://example.com/icon.png',
    position: 'top-left',
    size: 20,
    alt: 'Important',
  });
  
  // Or built-in icon
  sheet.setIcon(addr, {
    type: 'builtin',
    source: 'flag-red', // Built-in icon names
    position: 'bottom-right',
  });
}

// ==================== Programmatic Navigation ====================

function navigateToComments(renderer: CanvasRenderer, sheet: Worksheet) {
  const allComments = sheet.getAllComments();
  
  if (allComments.length === 0) {
    console.log('No comments to navigate');
    return;
  }
  
  let currentIndex = 0;
  
  // Navigate to first comment
  renderer.scrollToCell(allComments[0].address, 'center');
  
  // Setup keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && e.ctrlKey) {
      // Next comment
      currentIndex = (currentIndex + 1) % allComments.length;
      renderer.scrollToCell(allComments[currentIndex].address, 'center');
      e.preventDefault();
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
      // Previous comment
      currentIndex = (currentIndex - 1 + allComments.length) % allComments.length;
      renderer.scrollToCell(allComments[currentIndex].address, 'center');
      e.preventDefault();
    }
  });
}

// ==================== Custom User System Integration ====================

interface CustomUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

class CustomCommentSystem {
  private sheet: Worksheet;
  private userMap = new Map<string, CustomUser>();
  
  constructor(sheet: Worksheet) {
    this.sheet = sheet;
  }
  
  registerUser(user: CustomUser) {
    this.userMap.set(user.id, user);
  }
  
  addComment(
    addr: { row: number; col: number },
    text: string,
    userId: string,
    metadata?: Record<string, unknown>
  ) {
    const user = this.userMap.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    this.sheet.addComment(addr, {
      text,
      author: user.name,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userAvatar: user.avatar,
        ...metadata,
      },
    });
  }
  
  getCommentsByUser(userId: string) {
    const allComments = this.sheet.getAllComments();
    return allComments.filter(({ comments }) =>
      comments.some(c => c.metadata?.userId === userId)
    );
  }
  
  // Render custom comment UI with avatars
  renderCommentWithAvatar(comment: any) {
    const avatar = comment.metadata?.userAvatar || '/default-avatar.png';
    return `
      <div class="custom-comment">
        <img src="${avatar}" class="comment-avatar" />
        <div class="comment-content">
          <strong>${comment.author}</strong>
          <p>${escapeHtml(comment.text)}</p>
        </div>
      </div>
    `;
  }
}

// ==================== Helper Functions ====================

function colToLetter(col: number): string {
  let result = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    col = Math.floor((col - 1) / 26);
  }
  return result;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Stub implementations for UI functions
function showCommentTooltip(bounds: any, comments: any[]) {
  console.log('Show tooltip', bounds, comments);
}

function highlightCellInCommentPanel(address: any) {
  console.log('Highlight in panel', address);
}

function showCommentContextMenu(bounds: any, address: any, onAdd: (text: string) => void) {
  const text = prompt('Enter comment:');
  if (text) onAdd(text);
}

function showCommentIndicator(address: any) {
  console.log('Show indicator', address);
}

// ==================== Complete Example ====================

export async function initializeCommentingApp(
  excelFile: File,
  canvasContainer: HTMLElement,
  commentPanelId: string,
  currentUser: CustomUser
): Promise<never> {
  void excelFile;
  void canvasContainer;
  void commentPanelId;
  void currentUser;
  throw new Error('Comment-enabled workbook import and staged restore are unavailable until the R6 slice is authorized; no workbook was initialized.');
}
