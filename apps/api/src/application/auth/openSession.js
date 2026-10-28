import { buildSession } from '../../domain/sessions.js';
import { toPublicUser } from '../../domain/users.js';
import { hashToken, newToken } from '../../lib/ids.js';

/**
 * Creates a 24 hour session. Only the token hash is stored; the raw token is
 * returned once, to its owner.
 * @param {{ sessions: import('../ports.js').SessionsRepository, clock: import('../../lib/clock.js').Clock }} deps
 * @param {{ id: string, username: string, createdAt: string }} user
 */
export async function openSession({ sessions, clock }, user) {
  const token = newToken();
  const session = buildSession({ tokenHash: hashToken(token), user, now: clock.now() });
  await sessions.create(session);
  return { token, expiresAt: session.expiresAt, user: toPublicUser(user) };
}
