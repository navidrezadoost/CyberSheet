import { Worksheet } from '../src';

describe('PKG-07A standalone comment deletion orphan-cascade characterization', () => {
  test('an absent requested ID can delete an orphan reply and emit comment-deleted', () => {
    const sheet = new Worksheet('OrphanCascade', 2, 2);
    const address = { row: 1, col: 1 };
    const missingParentId = 'missing-parent';
    const orphan = sheet.addComment(address, {
      text: 'orphan reply',
      author: 'A',
      parentId: missingParentId,
    });
    const events: unknown[] = [];
    sheet.on((event) => events.push(event));

    const deleted = sheet.deleteComment(address, missingParentId);

    expect(deleted).toBe(true);
    expect(sheet.getComments(address)).toEqual([]);
    expect(events).toEqual([{
      type: 'comment-deleted',
      address,
      commentId: missingParentId,
    }]);
    expect(orphan.id).not.toBe(missingParentId);
  });
});
