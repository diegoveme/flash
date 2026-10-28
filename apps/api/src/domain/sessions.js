import { SESSION_TTL_HOURS } from '@flash/shared';
import { HOUR_MS } from '../lib/clock.js';

export const SESSION_TTL_MS = SESSION_TTL_HOURS * HOUR_MS;

/**
 * @param {{ tokenHash: string, user: { id: string, username: string }, now: Date }} params
 */
export function buildSession({ tokenHash, user, now }) {
  return {
    tokenHash,
    userId: user.id,
    username: user.username,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    revoked: false,
  };
}

/**
 * A session authorizes requests only while it is not revoked and not expired.
 * @param {{ revoked: boolean, expiresAt: string } | null | undefined} session
 * @param {Date} now
 */
export function isSessionActive(session, now) {
  return Boolean(session) && !session.revoked && new Date(session.expiresAt) > now;
}
