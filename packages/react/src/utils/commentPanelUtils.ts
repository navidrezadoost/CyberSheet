import type { Address, CellComment, Workbook } from '@cyber-sheet/core';

export interface CommentThreadSummary {
  id: string;
  sheetName: string;
  address: Address;
  root: CellComment;
  replies: CellComment[];
  replyCount: number;
  latestText: string;
  latestAuthor: string;
  latestAt: Date;
  locationLabel: string;
  resolved: boolean;
}

export function colToLetter(col: number): string {
  let letters = '';
  let value = Math.max(1, col);
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

export function formatCellAddress(addr: Address): string {
  return `${colToLetter(addr.col)}${Math.max(1, addr.row)}`;
}

export function formatCommentLocation(sheetName: string, address: Address): string {
  return `${sheetName}!${formatCellAddress(address)}`;
}

export function getAuthorInitials(author: string): string {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function commentTimestamp(comment: CellComment): Date {
  return comment.editedAt ?? comment.createdAt;
}

export function collectCommentThreads(
  workbook: Workbook,
  sheetFilter: string | 'all',
): CommentThreadSummary[] {
  const sheetNames = sheetFilter === 'all'
    ? workbook.getSheetNames()
    : [sheetFilter];

  const threads: CommentThreadSummary[] = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.getSheet(sheetName);
    if (!sheet) continue;

    for (const { address, comments } of sheet.getAllComments()) {
      const roots = comments.filter((comment) => !comment.parentId);
      const entries = roots.length > 0 ? roots : (comments.length > 0 ? [comments[0]!] : []);

      for (const root of entries) {
        const replies = comments.filter((comment) => comment.parentId === root.id);
        const latest = [...replies, root].sort(
          (a, b) => commentTimestamp(b).getTime() - commentTimestamp(a).getTime(),
        )[0]!;

        threads.push({
          id: `${sheetName}:${address.row},${address.col}:${root.id}`,
          sheetName,
          address,
          root,
          replies,
          replyCount: replies.length,
          latestText: latest.text,
          latestAuthor: latest.author,
          latestAt: commentTimestamp(latest),
          locationLabel: formatCommentLocation(sheetName, address),
          resolved: Boolean(root.resolved),
        });
      }
    }
  }

  return threads.sort((a, b) => {
    if (a.sheetName !== b.sheetName) return a.sheetName.localeCompare(b.sheetName);
    if (a.address.row !== b.address.row) return a.address.row - b.address.row;
    return a.address.col - b.address.col;
  });
}
