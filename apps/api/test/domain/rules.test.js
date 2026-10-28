import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MIN_SIGNUP_AGE } from '@flash/shared';
import { validateCommentContent } from '../../src/domain/comments.js';
import {
  buildNotification,
  commentSnippet,
  isNotificationActive,
  shouldNotify,
} from '../../src/domain/notifications.js';
import { validatePostDetails } from '../../src/domain/posts.js';
import { buildSession, isSessionActive } from '../../src/domain/sessions.js';
import {
  ageOn,
  parseCalendarDate,
  toPublicUser,
  validateRegistration,
} from '../../src/domain/users.js';
import { decodeCursor, encodeCursor } from '../../src/lib/cursor.js';
import { redact } from '../../src/lib/logger.js';

const NOW = new Date('2026-01-15T12:00:00.000Z');
const valid = {
  email: 'Ana@Example.com',
  username: 'Ana_Photo',
  birthDate: '1990-01-01',
  password: 'long enough pw',
};

describe('registration rules', () => {
  it('normalizes email and username', () => {
    const data = validateRegistration(valid, NOW);
    assert.equal(data.email, 'ana@example.com');
    assert.equal(data.username, 'ana_photo');
  });

  it(`requires the minimum age (${MIN_SIGNUP_AGE})`, () => {
    const exactly = `${2026 - MIN_SIGNUP_AGE}-01-15`;
    const oneDayShort = `${2026 - MIN_SIGNUP_AGE}-01-16`;
    assert.doesNotThrow(() => validateRegistration({ ...valid, birthDate: exactly }, NOW));
    assert.throws(
      () => validateRegistration({ ...valid, birthDate: oneDayShort }, NOW),
      (error) => 'birthDate' in error.fields,
    );
  });

  it('rejects impossible dates and bad input, reporting every field', () => {
    assert.equal(parseCalendarDate('2023-02-30'), null);
    assert.throws(
      () =>
        validateRegistration(
          { email: 'no', username: 'x', birthDate: 'soon', password: 'short' },
          NOW,
        ),
      (error) =>
        ['email', 'username', 'birthDate', 'password'].every((field) => field in error.fields),
    );
  });

  it('limits passwords to 72 bytes (bcrypt)', () => {
    assert.throws(
      () => validateRegistration({ ...valid, password: 'ñ'.repeat(40) }, NOW),
      (error) => 'password' in error.fields,
    );
  });

  it('computes full years', () => {
    assert.equal(ageOn({ year: 2000, month: 2, day: 29 }, new Date('2018-02-28T00:00:00Z')), 17);
    assert.equal(ageOn({ year: 2000, month: 2, day: 29 }, new Date('2018-03-01T00:00:00Z')), 18);
  });

  it('public users never include email, birth date or password hash', () => {
    const user = {
      id: '1',
      username: 'ana',
      email: 'a@b.co',
      birthDate: '1990-01-01',
      passwordHash: 'x',
      createdAt: 'now',
    };
    assert.deepEqual(Object.keys(toPublicUser(user)).sort(), ['createdAt', 'id', 'username']);
  });
});

describe('sessions', () => {
  it('last exactly 24 hours and stop working when revoked', () => {
    const session = buildSession({ tokenHash: 'h', user: { id: 'u', username: 'n' }, now: NOW });
    assert.equal(isSessionActive(session, new Date(NOW.getTime() + 24 * 3600 * 1000 - 1)), true);
    assert.equal(isSessionActive(session, new Date(NOW.getTime() + 24 * 3600 * 1000)), false);
    assert.equal(isSessionActive({ ...session, revoked: true }, NOW), false);
  });
});

describe('content rules', () => {
  it('comments are 1 to 500 characters, counted by code point', () => {
    assert.equal(validateCommentContent('  hi  '), 'hi');
    assert.equal(validateCommentContent('📷'.repeat(500)).length, 1000);
    assert.throws(
      () => validateCommentContent('a'.repeat(501)),
      (error) => 'content' in error.fields,
    );
    assert.throws(
      () => validateCommentContent('   '),
      (error) => 'content' in error.fields,
    );
  });

  it('description and tags are optional', () => {
    assert.deepEqual(validatePostDetails({}), { description: null, tags: [] });
    assert.deepEqual(validatePostDetails({ description: '  ', tags: '' }), {
      description: null,
      tags: [],
    });
    assert.deepEqual(validatePostDetails({ tags: ['Street', '#street'] }).tags, ['street']);
    assert.throws(
      () => validatePostDetails({ tags: ['bad tag'] }),
      (error) => 'tags' in error.fields,
    );
  });
});

describe('notification rules', () => {
  it('never notifies people about their own actions', () => {
    assert.equal(shouldNotify({ actorId: 'a', recipientId: 'a' }), false);
    assert.equal(shouldNotify({ actorId: 'a', recipientId: 'b' }), true);
  });

  it('expire after 7 days', () => {
    const notification = buildNotification({
      id: 'n',
      recipientId: 'b',
      actor: { id: 'a', username: 'ana' },
      postId: 'p',
      type: 'comment',
      commentContent: 'x',
      now: NOW,
    });
    assert.equal(
      isNotificationActive(notification, new Date(NOW.getTime() + 7 * 86400000 - 1)),
      true,
    );
    assert.equal(isNotificationActive(notification, new Date(NOW.getTime() + 7 * 86400000)), false);
  });

  it('keeps short comment snippets', () => {
    assert.equal(commentSnippet('short'), 'short');
    assert.equal([...commentSnippet('a'.repeat(300))].length, 123);
  });
});

describe('cursors', () => {
  it('round trip and reject tampering', () => {
    const cursor = encodeCursor({ pk: 'POST#1', sk: 'POST' });
    assert.deepEqual(decodeCursor(cursor, ['pk', 'sk']), { pk: 'POST#1', sk: 'POST' });
    assert.equal(decodeCursor(undefined, ['pk']), undefined);
    assert.throws(
      () => decodeCursor('not-base64-json', ['pk']),
      (error) => error.status === 400,
    );
    assert.throws(
      () => decodeCursor(encodeCursor({ pk: 'x', extra: 'y' }), ['pk']),
      (e) => e.status === 400,
    );
  });
});

describe('logger redaction', () => {
  it('hides sensitive keys and emails inside messages', () => {
    const entry = redact({
      password: 'secret',
      token: 'abc',
      birthDate: '1990-01-01',
      nested: { email: 'a@b.co' },
      error: new Error('Address not verified: someone@example.com'),
    });
    assert.equal(entry.password, '[REDACTED]');
    assert.equal(entry.token, '[REDACTED]');
    assert.equal(entry.birthDate, '[REDACTED]');
    assert.equal(entry.nested.email, '[REDACTED]');
    assert.ok(!JSON.stringify(entry).includes('someone@example.com'));
  });
});
