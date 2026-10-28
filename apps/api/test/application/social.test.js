import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { DAY_MS, MINUTE_MS } from '../../src/lib/clock.js';
import { createTestContainer, publish, signUp } from '../helpers/testContainer.js';

describe('comments', () => {
  let c;
  const containers = [];
  beforeEach(async () => {
    c = await createTestContainer();
    containers.push(c);
  });
  after(() => Promise.all(containers.map((container) => container.cleanup())));

  it('lists comments in chronological order and counts them', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);

    for (const content of ['first', 'second', 'third']) {
      c.clock.advance(MINUTE_MS);
      await c.useCases.addComment({ viewer: fan, postId: post.id, content });
    }

    const { items } = await c.useCases.listComments({ postId: post.id });
    assert.deepEqual(
      items.map((comment) => comment.content),
      ['first', 'second', 'third'],
    );
    assert.equal((await c.useCases.getPost({ postId: post.id })).post.commentsCount, 3);
  });

  it('accepts 500 characters and rejects 501', async () => {
    const { viewer } = await signUp(c);
    const post = await publish(c, viewer);
    await c.useCases.addComment({ viewer, postId: post.id, content: 'a'.repeat(500) });
    await assert.rejects(
      c.useCases.addComment({ viewer, postId: post.id, content: 'a'.repeat(501) }),
      (error) => error.status === 400 && 'content' in error.fields,
    );
  });

  it('notifies the author about comments from others, never about their own', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);

    await c.useCases.addComment({ viewer: author, postId: post.id, content: 'my own note' });
    await c.useCases.addComment({ viewer: fan, postId: post.id, content: 'Beautiful light' });

    const { items, unreadCount } = await c.useCases.listNotifications({ viewer: author });
    assert.equal(unreadCount, 1);
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'comment');
    assert.equal(items[0].actor.username, fan.username);
    assert.equal(items[0].commentSnippet, 'Beautiful light');
    assert.equal(items[0].post.imageUrl, post.imageUrl);
  });
});

describe('reactions', () => {
  let c;
  const containers = [];
  beforeEach(async () => {
    c = await createTestContainer();
    containers.push(c);
  });
  after(() => Promise.all(containers.map((container) => container.cleanup())));

  it('keeps one reaction per user per post', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);

    await c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'like' });
    const again = await c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'like' });

    assert.deepEqual(again.reactionsCount, { like: 1, inspire: 0, wow: 0 });
  });

  it('keeps one reaction even with concurrent requests', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);

    await Promise.all([
      c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'like' }),
      c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'like' }),
      c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'wow' }),
    ]);

    const { post: fresh } = await c.useCases.getPost({ postId: post.id });
    const total = Object.values(fresh.reactionsCount).reduce((sum, value) => sum + value, 0);
    assert.equal(total, 1);
    assert.equal((await c.useCases.getUnreadCount({ viewer: author })).unreadCount, 1);
  });

  it('changing the type moves the counter and does not notify again', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);

    await c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'like' });
    const changed = await c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'inspire' });

    assert.equal(changed.reaction.type, 'inspire');
    assert.deepEqual(changed.reactionsCount, { like: 0, inspire: 1, wow: 0 });

    const { items } = await c.useCases.listNotifications({ viewer: author });
    assert.equal(items.length, 1);
    assert.equal(items[0].reactionType, 'like');
  });

  it("does not notify authors about their own reaction and shows the viewer's reaction", async () => {
    const { viewer: author } = await signUp(c);
    const post = await publish(c, author);

    await c.useCases.setReaction({ viewer: author, postId: post.id, type: 'wow' });

    assert.equal((await c.useCases.getUnreadCount({ viewer: author })).unreadCount, 0);
    assert.equal(
      (await c.useCases.getPost({ postId: post.id, viewer: author })).post.viewerReaction,
      'wow',
    );
    assert.equal((await c.useCases.getPost({ postId: post.id })).post.viewerReaction, null);
    assert.equal((await c.useCases.listFeed({ viewer: author })).items[0].viewerReaction, 'wow');
  });

  it('rejects unknown reaction values', async () => {
    const { viewer } = await signUp(c);
    const post = await publish(c, viewer);
    await assert.rejects(
      c.useCases.setReaction({ viewer, postId: post.id, type: 'love' }),
      (error) => error.status === 400 && 'type' in error.fields,
    );
  });
});

describe('notifications', () => {
  let c;
  const containers = [];
  beforeEach(async () => {
    c = await createTestContainer();
    containers.push(c);
  });
  after(() => Promise.all(containers.map((container) => container.cleanup())));

  it('filters notifications older than 7 days at query time', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);

    await c.useCases.addComment({ viewer: fan, postId: post.id, content: 'old one' });
    c.clock.advance(6 * DAY_MS);
    await c.useCases.addComment({ viewer: fan, postId: post.id, content: 'recent one' });
    c.clock.advance(DAY_MS);

    const { items, unreadCount } = await c.useCases.listNotifications({ viewer: author });
    assert.deepEqual(
      items.map((item) => item.commentSnippet),
      ['recent one'],
    );
    assert.equal(unreadCount, 1);
  });

  it('marks all as read', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);
    await c.useCases.addComment({ viewer: fan, postId: post.id, content: 'one' });
    await c.useCases.setReaction({ viewer: fan, postId: post.id, type: 'wow' });

    assert.equal((await c.useCases.getUnreadCount({ viewer: author })).unreadCount, 2);
    await c.useCases.markAllRead({ viewer: author });
    assert.equal((await c.useCases.getUnreadCount({ viewer: author })).unreadCount, 0);
    const { items } = await c.useCases.listNotifications({ viewer: author });
    assert.ok(items.every((item) => item.read));
  });

  it('drops the thumbnail when the post was hidden later', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);
    await c.useCases.addComment({ viewer: fan, postId: post.id, content: 'nice' });
    await c.useCases.hidePost({ viewer: author, postId: post.id });

    const { items } = await c.useCases.listNotifications({ viewer: author });
    assert.equal(items[0].post.imageUrl, null);
  });

  it('paginates with a cursor', async () => {
    const { viewer: author } = await signUp(c);
    const { viewer: fan } = await signUp(c);
    const post = await publish(c, author);
    for (let index = 0; index < 25; index++) {
      c.clock.advance(1000);
      await c.useCases.addComment({ viewer: fan, postId: post.id, content: `comment ${index}` });
    }

    const first = await c.useCases.listNotifications({ viewer: author });
    const second = await c.useCases.listNotifications({ viewer: author, cursor: first.nextCursor });
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 5);
    assert.equal(first.items[0].commentSnippet, 'comment 24');
    assert.equal(first.unreadCount, 25);
  });
});
