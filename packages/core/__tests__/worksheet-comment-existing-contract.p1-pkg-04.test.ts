import { EventBus } from '../src/EventBus';
import { setupWorkbookLazyBridges } from '../src/eventBridge';
import { Worksheet } from '../src/worksheet';

describe('PKG-04 existing standalone comment behavior', () => {
  test('deletes a selected comment and all transitive replies while preserving unrelated order', () => {
    const sheet = new Worksheet('Comments', 3, 3);
    const address = { row: 1, col: 1 };
    const root = sheet.addComment(address, { text: 'root', author: 'A' });
    const child = sheet.addComment(address, { text: 'child', author: 'B', parentId: root.id });
    sheet.addComment(address, { text: 'sibling', author: 'C' });
    const grandchild = sheet.addComment(address, { text: 'grandchild', author: 'D', parentId: child.id });
    const events: unknown[] = [];
    sheet.on((event) => events.push(event));

    expect(sheet.deleteComment(address, root.id)).toBe(true);
    expect(sheet.getComments(address).map(({ text }) => text)).toEqual(['sibling']);
    expect(events).toEqual([{ type: 'comment-deleted', address, commentId: root.id }]);
    expect([root, child, grandchild].map(({ id }) => id)).not.toContain(sheet.getComments(address)[0].id);
  });

  test('missing comment and absent collection return false without publishing; deleting the last comment clears the collection', () => {
    const sheet = new Worksheet('Comments', 3, 3);
    const address = { row: 2, col: 2 };
    const events: unknown[] = [];
    sheet.on((event) => events.push(event));

    expect(sheet.deleteComment(address, 'missing')).toBe(false);
    const comment = sheet.addComment(address, { text: 'only', author: 'A' });
    events.length = 0;
    expect(sheet.deleteComment(address, 'missing')).toBe(false);
    expect(events).toEqual([]);

    expect(sheet.deleteComment(address, comment.id)).toBe(true);
    expect(sheet.getCell(address)?.comments).toBeUndefined();
    expect(events).toEqual([{ type: 'comment-deleted', address, commentId: comment.id }]);
  });

  test('existing lazy Workbook bridge maps standalone deletion to the comment-delete payload', () => {
    const sheet = new Worksheet('Comments', 3, 3);
    const bus = new EventBus();
    setupWorkbookLazyBridges(() => [sheet], bus);
    const payloads: unknown[] = [];
    const subscription = bus.on('comment-delete', (payload) => payloads.push(payload));
    const address = { row: 3, col: 1 };
    const comment = sheet.addComment(address, { text: 'remove', author: 'A' });

    expect(sheet.deleteComment(address, comment.id)).toBe(true);
    expect(payloads).toEqual([{ row: 3, col: 1, commentId: comment.id }]);

    subscription();
    const later = sheet.addComment(address, { text: 'after unsubscribe', author: 'A' });
    expect(sheet.deleteComment(address, later.id)).toBe(true);
    expect(payloads).toHaveLength(1);
  });
});
