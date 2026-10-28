import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { RECOVERY_MESSAGE } from '../../src/application/auth/requestPasswordRecovery.js';
import { HOUR_MS, MINUTE_MS } from '../../src/lib/clock.js';
import { createTestContainer, signUp } from '../helpers/testContainer.js';

describe('auth', () => {
  let c;
  const containers = [];
  beforeEach(async () => {
    c = await createTestContainer();
    containers.push(c);
  });
  after(() => Promise.all(containers.map((container) => container.cleanup())));

  it('registers a user and opens a 24 hour session', async () => {
    const { session, viewer } = await signUp(c, { username: 'ana' });
    assert.equal(session.user.username, 'ana');
    assert.equal(new Date(session.expiresAt) - c.clock.now(), 24 * HOUR_MS);
    assert.equal(viewer.username, 'ana');
  });

  it('never returns email or birth date', async () => {
    const { session, viewer, input } = await signUp(c);
    const me = await c.useCases.getCurrentUser({ viewer });
    for (const body of [session, me]) {
      const text = JSON.stringify(body);
      assert.ok(!text.includes(input.email));
      assert.ok(!text.includes(input.birthDate));
      assert.ok(!text.includes('passwordHash'));
    }
  });

  it('rejects a taken username or email with field errors', async () => {
    await signUp(c, { username: 'ana', email: 'ana@example.com' });
    await assert.rejects(
      c.useCases.register({
        username: 'ANA',
        email: 'Ana@Example.com',
        birthDate: '1990-01-01',
        password: 'long enough pw',
      }),
      (error) => error.status === 409 && 'username' in error.fields && 'email' in error.fields,
    );
  });

  it('logs in with username or email and rejects wrong credentials uniformly', async () => {
    const { input } = await signUp(c);
    assert.ok(
      (await c.useCases.login({ identifier: input.username, password: input.password })).token,
    );
    assert.ok(
      (await c.useCases.login({ identifier: input.email.toUpperCase(), password: input.password }))
        .token,
    );

    const wrongPassword = await c.useCases
      .login({ identifier: input.username, password: 'nope nope' })
      .catch((e) => e);
    const unknownUser = await c.useCases
      .login({ identifier: 'ghost', password: 'nope nope' })
      .catch((e) => e);
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal(wrongPassword.message, unknownUser.message);
  });

  it('rejects the session right after logout', async () => {
    const { session, viewer } = await signUp(c);
    await c.useCases.logout({ viewer });
    assert.equal(await c.useCases.authenticate(session.token), null);
  });

  it('expires sessions after 24 hours', async () => {
    const { session } = await signUp(c);
    c.clock.advance(24 * HOUR_MS - 1);
    assert.ok(await c.useCases.authenticate(session.token));
    c.clock.advance(1);
    assert.equal(await c.useCases.authenticate(session.token), null);
  });

  it('ignores malformed tokens', async () => {
    assert.equal(await c.useCases.authenticate(undefined), null);
    assert.equal(await c.useCases.authenticate('short'), null);
    assert.equal(await c.useCases.authenticate('x'.repeat(43)), null);
  });
});

describe('password recovery', () => {
  let c;
  const containers = [];
  beforeEach(async () => {
    c = await createTestContainer();
    containers.push(c);
  });
  after(() => Promise.all(containers.map((container) => container.cleanup())));

  const tokenFromEmail = (email) =>
    new URL(/https?:\/\/\S+/.exec(email.text)[0]).searchParams.get('token');

  it('answers the same whether or not the email exists', async () => {
    const { input } = await signUp(c);
    const known = await c.useCases.requestPasswordRecovery({ email: input.email });
    const unknown = await c.useCases.requestPasswordRecovery({ email: 'nobody@example.com' });
    assert.deepEqual(known, unknown);
    assert.equal(known.message, RECOVERY_MESSAGE);
    assert.equal(c.sentEmails.length, 1);
    assert.equal(c.sentEmails[0].to, input.email);
  });

  it('resets the password with a single-use token', async () => {
    const { input } = await signUp(c);
    await c.useCases.requestPasswordRecovery({ email: input.email });
    const token = tokenFromEmail(c.sentEmails[0]);

    await c.useCases.resetPassword({ token, password: 'brand new password' });
    await assert.rejects(
      c.useCases.resetPassword({ token, password: 'another password' }),
      (e) => 'token' in e.fields,
    );

    assert.ok(
      await c.useCases.login({ identifier: input.username, password: 'brand new password' }),
    );
    await assert.rejects(
      c.useCases.login({ identifier: input.username, password: input.password }),
      (e) => e.status === 401,
    );
  });

  it('expires the token after 1 hour', async () => {
    const { input } = await signUp(c);
    await c.useCases.requestPasswordRecovery({ email: input.email });
    c.clock.advance(60 * MINUTE_MS);
    await assert.rejects(
      c.useCases.resetPassword({
        token: tokenFromEmail(c.sentEmails[0]),
        password: 'brand new password',
      }),
      (error) => 'token' in error.fields,
    );
  });

  it('invalidates the previous token when a new one is requested', async () => {
    const { input } = await signUp(c);
    await c.useCases.requestPasswordRecovery({ email: input.email });
    await c.useCases.requestPasswordRecovery({ email: input.email });
    const [first, second] = c.sentEmails.map(tokenFromEmail);

    await assert.rejects(
      c.useCases.resetPassword({ token: first, password: 'brand new password' }),
    );
    await c.useCases.resetPassword({ token: second, password: 'brand new password' });
  });

  it('does not burn the token when the new password is too weak', async () => {
    const { input } = await signUp(c);
    await c.useCases.requestPasswordRecovery({ email: input.email });
    const token = tokenFromEmail(c.sentEmails[0]);

    await assert.rejects(
      c.useCases.resetPassword({ token, password: 'short' }),
      (e) => 'password' in e.fields,
    );
    await c.useCases.resetPassword({ token, password: 'long enough now' });
  });
});
