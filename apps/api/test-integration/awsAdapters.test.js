import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createClient } from 'redis';
import { FEED_PAGE_SIZE } from '@flash/shared';
import { buildContainer } from '../src/bootstrap/container.js';
import { loadConfig } from '../src/config/env.js';
import { createFixedClock, DAY_MS } from '../src/lib/clock.js';
import { hashToken } from '../src/lib/ids.js';
import { ensureTable } from '../src/local/createTable.js';
import { publish, signUp } from '../test/helpers/testContainer.js';

/*
 * Runs the real DynamoDB and Redis adapters against DynamoDB Local and Valkey
 * (docker-compose.yml). Start them with `bun run docker:up`. Each run uses its
 * own table, so runs never interfere.
 */

async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

const available = await reachable(process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000');

describe(
  'AWS adapters (DynamoDB Local + Valkey)',
  { skip: !available && 'DynamoDB Local is not running' },
  () => {
    let c;
    let dataDir;

    before(async () => {
      dataDir = await mkdtemp(path.join(os.tmpdir(), 'flash-it-'));
      const config = loadConfig({
        ...process.env,
        DYNAMODB_TABLE: `flash-it-${randomUUID().slice(0, 8)}`,
        BCRYPT_COST: '4',
        LOCAL_DATA_DIR: dataDir,
      });
      await ensureTable(config);
      const sentEmails = [];
      c = {
        ...buildContainer(config, {
          clock: createFixedClock(new Date()),
          mailer: { send: async (message) => sentEmails.push(message) },
          logger: { info() {}, warn() {}, error() {} },
        }),
        sentEmails,
      };
    });

    after(() => rm(dataDir, { recursive: true, force: true }));

    it('enforces unique usernames and emails in one transaction', async () => {
      await signUp(c, { username: 'unique_one', email: 'unique@example.com' });
      await assert.rejects(
        c.useCases.register({
          username: 'unique_one',
          email: 'other@example.com',
          birthDate: '1990-01-01',
          password: 'long enough pw',
        }),
        (error) => error.status === 409 && 'username' in error.fields && !('email' in error.fields),
      );
      await assert.rejects(
        c.useCases.register({
          username: 'unique_two',
          email: 'unique@example.com',
          birthDate: '1990-01-01',
          password: 'long enough pw',
        }),
        (error) => error.status === 409 && 'email' in error.fields,
      );
    });

    it('revokes sessions immediately (strongly consistent read)', async () => {
      const { session, viewer } = await signUp(c);
      await c.useCases.logout({ viewer });
      assert.equal(await c.useCases.authenticate(session.token), null);
    });

    it('paginates the feed through the sparse GSI and drops hidden posts', async () => {
      const { viewer, input } = await signUp(c);
      const ids = [];
      for (let index = 0; index < FEED_PAGE_SIZE + 2; index++) {
        c.clock.advance(1000);
        ids.push((await publish(c, viewer)).id);
      }
      await c.useCases.hidePost({ viewer, postId: ids.at(-1) });

      const first = await c.useCases.listFeed({});
      assert.equal(first.items.length, FEED_PAGE_SIZE);
      assert.equal(first.items[0].id, ids.at(-2));
      const second = await c.useCases.listFeed({ cursor: first.nextCursor });
      const seen = [...first.items, ...second.items].map((post) => post.id);
      assert.ok(!seen.includes(ids.at(-1)));
      assert.equal(new Set(seen).size, ids.length - 1);

      const profile = await c.useCases.listUserPosts({ username: input.username });
      assert.ok(!profile.items.some((post) => post.id === ids.at(-1)));
      await assert.rejects(
        c.useCases.getPost({ postId: ids.at(-1) }),
        (error) => error.status === 404,
      );
    });

    it('keeps one reaction per user per post under concurrency, without duplicate notifications', async () => {
      const { viewer: author } = await signUp(c);
      const { viewer: fan } = await signUp(c);
      const post = await publish(c, author);

      // A request may lose every retry and answer 409; the invariants must hold anyway.
      await Promise.allSettled(
        ['like', 'like', 'wow', 'inspire'].map((type) =>
          c.useCases.setReaction({ viewer: fan, postId: post.id, type }),
        ),
      );
      const { post: fresh } = await c.useCases.getPost({ postId: post.id, viewer: fan });
      assert.equal(
        Object.values(fresh.reactionsCount).reduce((sum, value) => sum + value, 0),
        1,
      );
      assert.equal(fresh.reactionsCount[fresh.viewerReaction], 1);
      assert.equal((await c.useCases.getUnreadCount({ viewer: author })).unreadCount, 1);
    });

    it('stores comments with the counter and notification atomically, and filters expired notifications', async () => {
      const { viewer: author } = await signUp(c);
      const { viewer: fan } = await signUp(c);
      const post = await publish(c, author);

      await c.useCases.addComment({ viewer: fan, postId: post.id, content: 'first' });
      await c.useCases.addComment({ viewer: author, postId: post.id, content: 'thanks' });
      assert.equal((await c.useCases.getPost({ postId: post.id })).post.commentsCount, 2);
      assert.deepEqual(
        (await c.useCases.listComments({ postId: post.id })).items.map((item) => item.content),
        ['first', 'thanks'],
      );

      const list = await c.useCases.listNotifications({ viewer: author });
      assert.equal(list.items.length, 1);
      assert.equal(list.unreadCount, 1);
      await c.useCases.markAllRead({ viewer: author });
      assert.equal((await c.useCases.getUnreadCount({ viewer: author })).unreadCount, 0);

      c.clock.advance(7 * DAY_MS + 1);
      assert.equal((await c.useCases.listNotifications({ viewer: author })).items.length, 0);
    });

    it('stores recovery tokens in Redis with a 1 hour TTL and consumes them once', async () => {
      const { input } = await signUp(c);
      await c.useCases.requestPasswordRecovery({ email: input.email });
      const token = new URL(/https?:\/\/\S+/.exec(c.sentEmails.at(-1).text)[0]).searchParams.get(
        'token',
      );

      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      try {
        const ttl = await redis.ttl(`flash:pwreset:${hashToken(token)}`);
        assert.ok(ttl > 3590 && ttl <= 3600, `ttl was ${ttl}`);
      } finally {
        await redis.quit();
      }

      await c.useCases.resetPassword({ token, password: 'new password here' });
      await assert.rejects(
        c.useCases.resetPassword({ token, password: 'again password' }),
        (e) => 'token' in e.fields,
      );
    });
  },
);
